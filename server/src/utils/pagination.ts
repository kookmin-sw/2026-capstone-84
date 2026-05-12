/**
 * 커서 기반 페이지네이션 유틸리티
 *
 * UUID id를 커서로 사용하며, createdAt 기준 내림차순 정렬을 기본으로 한다.
 * Prisma 쿼리에 적용할 수 있는 헬퍼 함수를 제공한다.
 */

export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PaginationParams {
  cursor?: string | null;
  limit?: number;
}

const DEFAULT_LIMIT = 20;

/**
 * 커서 기반 페이지네이션 헬퍼 함수
 *
 * Prisma의 findMany에 전달할 cursor/skip/take 옵션을 생성하고,
 * 결과를 CursorPaginatedResult 형태로 반환한다.
 *
 * @param queryFn - Prisma findMany를 실행하는 함수. take와 cursor 관련 옵션이 인자로 전달된다.
 * @param params - 페이지네이션 파라미터 (cursor, limit)
 * @returns CursorPaginatedResult<T>
 */
export async function paginateWithCursor<T extends { id: string }>(
  queryFn: (args: {
    take: number;
    skip?: number;
    cursor?: { id: string };
  }) => Promise<T[]>,
  params: PaginationParams = {}
): Promise<CursorPaginatedResult<T>> {
  const limit = params.limit && params.limit > 0 ? params.limit : DEFAULT_LIMIT;

  // 1개 더 가져와서 다음 페이지 존재 여부를 판단한다
  const take = limit + 1;

  const queryArgs: { take: number; skip?: number; cursor?: { id: string } } = {
    take,
  };

  if (params.cursor) {
    queryArgs.cursor = { id: params.cursor };
    queryArgs.skip = 1; // 커서 자체는 이전 페이지의 마지막 항목이므로 건너뛴다
  }

  const items = await queryFn(queryArgs);

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return {
    data,
    nextCursor,
    hasMore,
  };
}
