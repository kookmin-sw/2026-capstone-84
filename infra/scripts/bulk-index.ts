/**
 * OpenSearch 벌크 인덱싱 스크립트
 *
 * 기존 Discussion, Memo 데이터를 OpenSearch에 벌크 인덱싱한다.
 * 실행: npx tsx infra/scripts/bulk-index.ts (server 디렉토리에서)
 *
 * 필수 환경 변수:
 * - DATABASE_URL: MySQL/Aurora 연결 문자열
 * - OPENSEARCH_URL: OpenSearch 엔드포인트
 *
 * Requirements: 4.1, 4.4
 */

import { PrismaClient } from '@prisma/client';
import { Client } from '@opensearch-project/opensearch';

// ============================================================
// 설정
// ============================================================

const BATCH_SIZE = 100;
const INDEX_PREFIX = 'bookclub';

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

// ============================================================
// 유틸리티
// ============================================================

function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function logError(message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error || '');
}

// ============================================================
// OpenSearch 인덱스 관리
// ============================================================

async function ensureIndex(client: Client, indexName: string): Promise<void> {
  const fullIndexName = `${INDEX_PREFIX}-${indexName}`;

  try {
    const { body: exists } = await client.indices.exists({ index: fullIndexName });

    if (!exists) {
      await client.indices.create({
        index: fullIndexName,
        body: INDEX_SETTINGS,
      });
      log(`인덱스 생성 완료: ${fullIndexName}`);
    } else {
      log(`인덱스 이미 존재: ${fullIndexName}`);
    }
  } catch (err) {
    logError(`인덱스 생성 실패 (${fullIndexName})`, err);
    throw err;
  }
}

// ============================================================
// Discussion 인덱싱
// ============================================================

async function indexDiscussions(prisma: PrismaClient, client: Client): Promise<number> {
  const indexName = `${INDEX_PREFIX}-discussions`;
  let totalIndexed = 0;

  const totalCount = await prisma.discussion.count();
  log(`Discussion 총 ${totalCount}건 인덱싱 시작...`);

  if (totalCount === 0) {
    log('인덱싱할 Discussion이 없습니다.');
    return 0;
  }

  let skip = 0;

  while (skip < totalCount) {
    try {
      const discussions = await prisma.discussion.findMany({
        skip,
        take: BATCH_SIZE,
        include: {
          author: { select: { nickname: true } },
          group: {
            select: {
              id: true,
              book: { select: { title: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (discussions.length === 0) break;

      // 벌크 요청 본문 구성
      const body: Record<string, unknown>[] = [];
      for (const discussion of discussions) {
        body.push({ index: { _index: indexName, _id: discussion.id } });
        body.push({
          type: 'discussion',
          title: discussion.title,
          content: discussion.content || '',
          authorNickname: discussion.author.nickname,
          bookTitle: discussion.group.book.title,
          groupId: discussion.group.id,
          createdAt: discussion.createdAt.toISOString(),
        });
      }

      const { body: result } = await client.bulk({ body, refresh: false });

      if (result.errors) {
        const errorItems = result.items.filter(
          (item: { index?: { error?: unknown } }) => item.index?.error
        );
        logError(
          `Discussion 벌크 인덱싱 일부 실패 (${errorItems.length}/${discussions.length}건)`,
          errorItems.slice(0, 3)
        );
        totalIndexed += discussions.length - errorItems.length;
      } else {
        totalIndexed += discussions.length;
      }

      skip += BATCH_SIZE;
      log(`Discussion 진행률: ${Math.min(skip, totalCount)}/${totalCount} (${Math.round((Math.min(skip, totalCount) / totalCount) * 100)}%)`);
    } catch (err) {
      logError(`Discussion 배치 처리 실패 (skip=${skip})`, err);
      skip += BATCH_SIZE; // 에러 발생해도 다음 배치로 진행
    }
  }

  return totalIndexed;
}

// ============================================================
// Memo 인덱싱
// ============================================================

async function indexMemos(prisma: PrismaClient, client: Client): Promise<number> {
  const indexName = `${INDEX_PREFIX}-memos`;
  let totalIndexed = 0;

  const totalCount = await prisma.memo.count();
  log(`Memo 총 ${totalCount}건 인덱싱 시작...`);

  if (totalCount === 0) {
    log('인덱싱할 Memo가 없습니다.');
    return 0;
  }

  let skip = 0;

  while (skip < totalCount) {
    try {
      const memos = await prisma.memo.findMany({
        skip,
        take: BATCH_SIZE,
        include: {
          user: { select: { nickname: true } },
          group: {
            select: {
              id: true,
              book: { select: { title: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (memos.length === 0) break;

      // 벌크 요청 본문 구성
      const body: Record<string, unknown>[] = [];
      for (const memo of memos) {
        // 메모 제목: content의 첫 번째 줄 사용
        const firstLine = memo.content.split('\n')[0].trim();
        const title = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;

        body.push({ index: { _index: indexName, _id: memo.id } });
        body.push({
          type: 'memo',
          title,
          content: memo.content,
          authorNickname: memo.user.nickname,
          bookTitle: memo.group.book.title,
          groupId: memo.group.id,
          createdAt: memo.createdAt.toISOString(),
        });
      }

      const { body: result } = await client.bulk({ body, refresh: false });

      if (result.errors) {
        const errorItems = result.items.filter(
          (item: { index?: { error?: unknown } }) => item.index?.error
        );
        logError(
          `Memo 벌크 인덱싱 일부 실패 (${errorItems.length}/${memos.length}건)`,
          errorItems.slice(0, 3)
        );
        totalIndexed += memos.length - errorItems.length;
      } else {
        totalIndexed += memos.length;
      }

      skip += BATCH_SIZE;
      log(`Memo 진행률: ${Math.min(skip, totalCount)}/${totalCount} (${Math.round((Math.min(skip, totalCount) / totalCount) * 100)}%)`);
    } catch (err) {
      logError(`Memo 배치 처리 실패 (skip=${skip})`, err);
      skip += BATCH_SIZE; // 에러 발생해도 다음 배치로 진행
    }
  }

  return totalIndexed;
}

// ============================================================
// 메인 실행
// ============================================================

async function main(): Promise<void> {
  const startTime = Date.now();

  log('=== OpenSearch 벌크 인덱싱 시작 ===');

  // 환경 변수 확인
  const opensearchUrl = process.env.OPENSEARCH_URL || process.env.OPENSEARCH_ENDPOINT;
  const databaseUrl = process.env.DATABASE_URL;

  if (!opensearchUrl) {
    logError('OPENSEARCH_URL 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  if (!databaseUrl) {
    logError('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  log(`OpenSearch 엔드포인트: ${opensearchUrl}`);
  log(`Database URL: ${databaseUrl.replace(/\/\/.*@/, '//***@')}`); // 비밀번호 마스킹

  // OpenSearch 클라이언트 초기화
  const osClient = new Client({
    node: opensearchUrl,
    ssl: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  // OpenSearch 연결 확인
  try {
    const { body } = await osClient.info();
    log(`OpenSearch 연결 성공 (버전: ${body.version?.number || 'unknown'})`);
  } catch (err) {
    logError('OpenSearch 연결 실패. 엔드포인트를 확인하세요.', err);
    process.exit(1);
  }

  // Prisma 클라이언트 초기화
  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  try {
    // DB 연결 확인
    await prisma.$connect();
    log('데이터베이스 연결 성공');

    // 인덱스 생성/확인
    log('인덱스 생성 확인 중...');
    await ensureIndex(osClient, 'discussions');
    await ensureIndex(osClient, 'memos');

    // Discussion 인덱싱
    const discussionCount = await indexDiscussions(prisma, osClient);

    // Memo 인덱싱
    const memoCount = await indexMemos(prisma, osClient);

    // 인덱스 리프레시 (검색 가능하도록)
    try {
      await osClient.indices.refresh({ index: `${INDEX_PREFIX}-discussions` });
      await osClient.indices.refresh({ index: `${INDEX_PREFIX}-memos` });
      log('인덱스 리프레시 완료');
    } catch (err) {
      logError('인덱스 리프레시 실패', err);
    }

    // 결과 요약
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    log('=== 벌크 인덱싱 완료 ===');
    log(`Discussion: ${discussionCount}건 인덱싱`);
    log(`Memo: ${memoCount}건 인덱싱`);
    log(`총 소요 시간: ${elapsed}초`);
  } catch (err) {
    logError('벌크 인덱싱 중 치명적 오류 발생', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await osClient.close();
    log('연결 종료');
  }
}

main();
