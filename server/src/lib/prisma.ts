import { PrismaClient } from '@prisma/client';

/**
 * Prisma 읽기/쓰기 분리 모듈
 *
 * - writerPrisma: INSERT, UPDATE, DELETE 쿼리용 (Aurora Writer 엔드포인트)
 * - readerPrisma: SELECT 쿼리용 (Aurora Reader 엔드포인트)
 *
 * 환경 변수 미설정 시 기존 DATABASE_URL로 폴백하여
 * 로컬 개발 환경에서도 정상 동작한다.
 */

const databaseUrl = process.env.DATABASE_URL;
const writerUrl = process.env.DATABASE_WRITER_URL || databaseUrl;
const readerUrl = process.env.DATABASE_READER_URL || databaseUrl;

const isSplitMode = !!(process.env.DATABASE_WRITER_URL && process.env.DATABASE_READER_URL);

if (isSplitMode) {
  console.log('[Prisma] 읽기/쓰기 분리 모드 활성화 (Writer/Reader 엔드포인트 분리)');
} else {
  console.log('[Prisma] 단일 데이터베이스 모드 (DATABASE_URL 사용)');
}

// Writer 인스턴스 (INSERT, UPDATE, DELETE)
const writerPrisma = new PrismaClient({
  datasources: {
    db: { url: writerUrl },
  },
});

// Reader 인스턴스 (SELECT)
const readerPrisma = new PrismaClient({
  datasources: {
    db: { url: readerUrl },
  },
});

export { writerPrisma, readerPrisma };
