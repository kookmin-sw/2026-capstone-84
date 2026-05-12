import { Client } from '@opensearch-project/opensearch';

// ===== 타입 정의 =====

export interface SearchablePost {
  id: string;
  content: string;
  category: string | null;
  authorNickname: string;
  bookTitle: string;
  bookAuthor: string | null;
  bookId: string;
  isHidden: boolean;
  createdAt: string; // ISO date string
}

export interface SearchResult {
  data: SearchHit[];
  nextCursor: number | null;
  hasMore: boolean;
  total: number;
}

export interface SearchHit {
  id: string;
  score: number;
  content: string;
  category: string | null;
  authorNickname: string;
  bookTitle: string;
  bookAuthor: string | null;
  bookId: string;
  createdAt: string;
}

// ===== 상수 =====

const INDEX_NAME = 'community_posts';
const DEFAULT_LIMIT = 20;

// ===== OpenSearch 인덱스 매핑 =====

const INDEX_SETTINGS = {
  settings: {
    analysis: {
      analyzer: {
        korean: {
          type: 'custom',
          tokenizer: 'nori_tokenizer',
          filter: ['nori_readingform', 'lowercase'],
        },
      },
    },
  },
  mappings: {
    properties: {
      content: { type: 'text', analyzer: 'korean' },
      category: { type: 'keyword' },
      authorNickname: {
        type: 'text',
        analyzer: 'korean',
        fields: { keyword: { type: 'keyword' } },
      },
      bookTitle: { type: 'text', analyzer: 'korean' },
      bookAuthor: { type: 'text', analyzer: 'korean' },
      bookId: { type: 'keyword' },
      isHidden: { type: 'boolean' },
      createdAt: { type: 'date' },
    },
  },
};

// ===== 클라이언트 초기화 =====

function createClient(): Client | null {
  const endpoint = process.env.OPENSEARCH_URL || process.env.OPENSEARCH_ENDPOINT;
  if (!endpoint) {
    console.log('[CommunitySearch] OPENSEARCH_URL 미설정 - 커뮤니티 검색 비활성화 (로컬 개발 모드)');
    return null;
  }

  try {
    const client = new Client({
      node: endpoint,
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
    console.log('[CommunitySearch] OpenSearch 클라이언트 초기화 완료');
    return client;
  } catch (error) {
    console.error('[CommunitySearch] OpenSearch 클라이언트 생성 실패:', error);
    return null;
  }
}

let client: Client | null = createClient();

// ===== 서비스 =====

export const communitySearchService = {
  /**
   * OpenSearch 인덱스 초기화
   * - 인덱스가 존재하지 않으면 생성
   * - 한국어 형태소 분석기(nori_tokenizer) 설정 포함
   */
  async ensureIndex(): Promise<void> {
    if (!client) return;

    try {
      const { body: exists } = await client.indices.exists({ index: INDEX_NAME });
      if (!exists) {
        await client.indices.create({
          index: INDEX_NAME,
          body: INDEX_SETTINGS,
        });
        console.log(`[CommunitySearch] 인덱스 '${INDEX_NAME}' 생성 완료`);
      }
    } catch (error) {
      console.error('[CommunitySearch] 인덱스 초기화 실패:', error);
    }
  },

  /**
   * 게시글 인덱싱
   * - 게시글 작성 시 호출
   * - OpenSearch에 게시글 문서를 인덱싱한다
   */
  async indexPost(post: SearchablePost): Promise<void> {
    if (!client) return;

    try {
      await client.index({
        index: INDEX_NAME,
        id: post.id,
        body: {
          content: post.content,
          category: post.category,
          authorNickname: post.authorNickname,
          bookTitle: post.bookTitle,
          bookAuthor: post.bookAuthor,
          bookId: post.bookId,
          isHidden: post.isHidden,
          createdAt: post.createdAt,
        },
        refresh: 'wait_for',
      });
    } catch (error) {
      console.error('[CommunitySearch] 게시글 인덱싱 실패:', error);
    }
  },

  /**
   * 게시글 삭제
   * - 게시글 삭제 시 호출
   * - OpenSearch에서 해당 문서를 제거한다
   */
  async deletePost(postId: string): Promise<void> {
    if (!client) return;

    try {
      await client.delete({
        index: INDEX_NAME,
        id: postId,
        refresh: 'wait_for',
      });
    } catch (error: any) {
      // 문서가 존재하지 않는 경우 무시
      if (error?.statusCode === 404) {
        return;
      }
      console.error('[CommunitySearch] 게시글 삭제 실패:', error);
    }
  },

  /**
   * 게시글 검색
   * - 책 제목, 작성자 닉네임, 게시글 내용에서 매칭
   * - 관련도 점수 기준 정렬
   * - isHidden=true인 게시글 제외
   * - 커서(from) 기반 페이지네이션
   *
   * @param query - 검색어
   * @param cursor - 페이지네이션 오프셋 (from 값)
   * @param limit - 한 페이지당 결과 수 (기본 20)
   */
  async search(query: string, cursor?: number | null, limit?: number): Promise<SearchResult> {
    if (!client) {
      return { data: [], nextCursor: null, hasMore: false, total: 0 };
    }

    const size = limit && limit > 0 ? limit : DEFAULT_LIMIT;
    const from = cursor && cursor > 0 ? cursor : 0;

    try {
      const { body } = await client.search({
        index: INDEX_NAME,
        body: {
          from,
          size,
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query,
                    fields: ['bookTitle^3', 'authorNickname^2', 'content', 'bookAuthor'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                  },
                },
              ],
              filter: [
                {
                  term: { isHidden: false },
                },
              ],
            },
          },
          sort: [
            { _score: { order: 'desc' } },
            { createdAt: { order: 'desc' } },
          ],
        },
      });

      const total = typeof body.hits.total === 'number'
        ? body.hits.total
        : body.hits.total?.value ?? 0;

      const hits: SearchHit[] = (body.hits.hits || []).map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        content: hit._source.content,
        category: hit._source.category,
        authorNickname: hit._source.authorNickname,
        bookTitle: hit._source.bookTitle,
        bookAuthor: hit._source.bookAuthor,
        bookId: hit._source.bookId,
        createdAt: hit._source.createdAt,
      }));

      const nextFrom = from + hits.length;
      const hasMore = nextFrom < total;

      return {
        data: hits,
        nextCursor: hasMore ? nextFrom : null,
        hasMore,
        total,
      };
    } catch (error) {
      console.error('[CommunitySearch] 검색 실패:', error);
      return { data: [], nextCursor: null, hasMore: false, total: 0 };
    }
  },

  /**
   * 클라이언트 사용 가능 여부 확인
   */
  isAvailable(): boolean {
    return client !== null;
  },
};
