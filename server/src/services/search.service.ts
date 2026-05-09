import { Client } from '@opensearch-project/opensearch';

// ============================================================
// OpenSearch 검색 서비스 모듈
// - 전문 검색 (Nori 한국어 분석기)
// - 문서 인덱싱/업데이트/삭제
// - 멀티필드 검색 (관련도 정렬, 페이지네이션)
// - 벌크 인덱싱 (마이그레이션용)
// - 환경 변수 미설정 시 검색 비활성화 (로컬 개발 지원)
// ============================================================

const INDEX_PREFIX = 'bookclub';

export interface SearchableDocument {
  id: string;
  type: 'discussion' | 'memo' | 'book';
  title: string;
  content?: string;
  authorNickname?: string;
  bookTitle?: string;
  groupId?: string;
  createdAt: string;
}

export interface SearchOptions {
  type?: 'discussion' | 'memo' | 'book';
  groupId?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  hits: SearchableDocument[];
  total: number;
  took: number; // ms
}

// Nori 분석기를 사용하는 인덱스 설정
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
      title: { type: 'text', analyzer: 'korean' },
      content: { type: 'text', analyzer: 'korean' },
      authorNickname: { type: 'keyword' },
      bookTitle: { type: 'text', analyzer: 'korean' },
      type: { type: 'keyword' },
      groupId: { type: 'keyword' },
      createdAt: { type: 'date' },
    },
  },
};

interface SearchServiceInterface {
  isEnabled(): boolean;
  ensureIndex(indexName: string): Promise<void>;
  indexDocument(index: string, id: string, document: Omit<SearchableDocument, 'id'>): Promise<void>;
  updateDocument(index: string, id: string, partialDoc: Partial<SearchableDocument>): Promise<void>;
  deleteDocument(index: string, id: string): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  bulkIndex(index: string, documents: SearchableDocument[]): Promise<void>;
  disconnect(): Promise<void>;
}

class SearchService implements SearchServiceInterface {
  private client: Client | null = null;
  private enabled: boolean = false;
  private initializedIndices: Set<string> = new Set();

  constructor() {
    const endpoint = process.env.OPENSEARCH_URL || process.env.OPENSEARCH_ENDPOINT;

    if (!endpoint) {
      console.log('[OpenSearch] OPENSEARCH_URL 미설정 - 검색 비활성화 (로컬 개발 모드)');
      this.enabled = false;
      return;
    }

    try {
      this.client = new Client({
        node: endpoint,
        ssl: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      });

      this.enabled = true;
      console.log('[OpenSearch] 클라이언트 초기화 완료');
    } catch (err) {
      console.error('[OpenSearch] 클라이언트 초기화 실패:', err);
      this.enabled = false;
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  // ============================================================
  // 인덱스 관리
  // ============================================================

  async ensureIndex(indexName: string): Promise<void> {
    if (!this.isEnabled() || !this.client) return;

    const fullIndexName = `${INDEX_PREFIX}-${indexName}`;

    if (this.initializedIndices.has(fullIndexName)) return;

    try {
      const { body: exists } = await this.client.indices.exists({ index: fullIndexName });

      if (!exists) {
        await this.client.indices.create({
          index: fullIndexName,
          body: INDEX_SETTINGS,
        });
        console.log(`[OpenSearch] 인덱스 생성 완료: ${fullIndexName}`);
      }

      this.initializedIndices.add(fullIndexName);
    } catch (err) {
      console.error(`[OpenSearch] 인덱스 확인/생성 실패 (${fullIndexName}):`, err);
    }
  }

  // ============================================================
  // 문서 인덱싱
  // ============================================================

  async indexDocument(index: string, id: string, document: Omit<SearchableDocument, 'id'>): Promise<void> {
    if (!this.isEnabled() || !this.client) return;

    const fullIndexName = `${INDEX_PREFIX}-${index}`;

    try {
      await this.ensureIndex(index);
      await this.client.index({
        index: fullIndexName,
        id,
        body: document,
        refresh: true,
      });
    } catch (err) {
      console.error(`[OpenSearch] 문서 인덱싱 실패 (${fullIndexName}/${id}):`, err);
    }
  }

  async updateDocument(index: string, id: string, partialDoc: Partial<SearchableDocument>): Promise<void> {
    if (!this.isEnabled() || !this.client) return;

    const fullIndexName = `${INDEX_PREFIX}-${index}`;

    try {
      await this.client.update({
        index: fullIndexName,
        id,
        body: {
          doc: partialDoc,
        },
        refresh: true,
      });
    } catch (err) {
      console.error(`[OpenSearch] 문서 업데이트 실패 (${fullIndexName}/${id}):`, err);
    }
  }

  async deleteDocument(index: string, id: string): Promise<void> {
    if (!this.isEnabled() || !this.client) return;

    const fullIndexName = `${INDEX_PREFIX}-${index}`;

    try {
      await this.client.delete({
        index: fullIndexName,
        id,
        refresh: true,
      });
    } catch (err) {
      console.error(`[OpenSearch] 문서 삭제 실패 (${fullIndexName}/${id}):`, err);
    }
  }

  // ============================================================
  // 검색
  // ============================================================

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const emptyResult: SearchResult = { hits: [], total: 0, took: 0 };

    if (!this.isEnabled() || !this.client) return emptyResult;

    const { type, groupId, page = 1, pageSize = 20 } = options;
    const from = (page - 1) * pageSize;

    // 검색 대상 인덱스 결정
    let indices: string;
    if (type) {
      indices = `${INDEX_PREFIX}-${type}s`;
    } else {
      indices = `${INDEX_PREFIX}-*`;
    }

    // 검색 쿼리 구성
    const must: unknown[] = [
      {
        multi_match: {
          query,
          fields: ['title^3', 'content', 'authorNickname^2', 'bookTitle^2'],
          type: 'best_fields',
          analyzer: 'korean',
        },
      },
    ];

    // 필터 조건 추가
    const filter: unknown[] = [];
    if (type) {
      filter.push({ term: { type } });
    }
    if (groupId) {
      filter.push({ term: { groupId } });
    }

    try {
      const { body } = await this.client.search({
        index: indices,
        body: {
          from,
          size: pageSize,
          query: {
            bool: {
              must,
              ...(filter.length > 0 ? { filter } : {}),
            },
          },
          sort: [
            { _score: { order: 'desc' } },
            { createdAt: { order: 'desc' } },
          ],
        },
      });

      const hits: SearchableDocument[] = body.hits.hits.map((hit: { _id: string; _source: Record<string, unknown> }) => ({
        id: hit._id,
        ...hit._source,
      })) as SearchableDocument[];

      const total = typeof body.hits.total === 'number'
        ? body.hits.total
        : body.hits.total.value;

      return {
        hits,
        total,
        took: body.took,
      };
    } catch (err) {
      console.error('[OpenSearch] 검색 실패:', err);
      return emptyResult;
    }
  }

  // ============================================================
  // 벌크 인덱싱 (마이그레이션용)
  // ============================================================

  async bulkIndex(index: string, documents: SearchableDocument[]): Promise<void> {
    if (!this.isEnabled() || !this.client) return;
    if (documents.length === 0) return;

    const fullIndexName = `${INDEX_PREFIX}-${index}`;

    try {
      await this.ensureIndex(index);

      // 벌크 요청 본문 구성
      const body: Record<string, unknown>[] = [];
      for (const doc of documents) {
        body.push({ index: { _index: fullIndexName, _id: doc.id } });
        const { id, ...docBody } = doc;
        body.push(docBody);
      }

      const { body: result } = await this.client.bulk({
        body,
        refresh: true,
      });

      if (result.errors) {
        const errorItems = result.items.filter(
          (item: { index?: { error?: unknown } }) => item.index?.error
        );
        console.error(
          `[OpenSearch] 벌크 인덱싱 일부 실패 (${errorItems.length}/${documents.length}건):`,
          errorItems.slice(0, 3)
        );
      } else {
        console.log(`[OpenSearch] 벌크 인덱싱 완료: ${documents.length}건 → ${fullIndexName}`);
      }
    } catch (err) {
      console.error(`[OpenSearch] 벌크 인덱싱 실패 (${fullIndexName}):`, err);
    }
  }

  // ============================================================
  // 연결 종료
  // ============================================================

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.enabled = false;
      console.log('[OpenSearch] 연결 종료');
    }
  }
}

// 싱글톤 인스턴스 export
export const searchService = new SearchService();
