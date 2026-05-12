import { describe, it, expect } from 'vitest';
import { paginateWithCursor, CursorPaginatedResult } from './pagination';

interface MockItem {
  id: string;
  createdAt: Date;
  title: string;
}

function createMockItems(count: number): MockItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${String(i + 1).padStart(3, '0')}`,
    createdAt: new Date(2024, 0, count - i),
    title: `Item ${i + 1}`,
  }));
}

describe('paginateWithCursor', () => {
  it('should return first page with default limit of 20', async () => {
    const allItems = createMockItems(25);

    const queryFn = async (args: { take: number; skip?: number; cursor?: { id: string } }) => {
      return allItems.slice(0, args.take);
    };

    const result: CursorPaginatedResult<MockItem> = await paginateWithCursor(queryFn, {});

    expect(result.data).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('id-020');
  });

  it('should return last page when fewer items than limit', async () => {
    const allItems = createMockItems(5);

    const queryFn = async (args: { take: number; skip?: number; cursor?: { id: string } }) => {
      return allItems.slice(0, Math.min(args.take, allItems.length));
    };

    const result = await paginateWithCursor(queryFn, {});

    expect(result.data).toHaveLength(5);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('should use custom limit when provided', async () => {
    const allItems = createMockItems(15);

    const queryFn = async (args: { take: number; skip?: number; cursor?: { id: string } }) => {
      return allItems.slice(0, args.take);
    };

    const result = await paginateWithCursor(queryFn, { limit: 10 });

    expect(result.data).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe('id-010');
  });

  it('should pass cursor and skip=1 to queryFn when cursor is provided', async () => {
    const allItems = createMockItems(10);
    let receivedArgs: any = null;

    const queryFn = async (args: { take: number; skip?: number; cursor?: { id: string } }) => {
      receivedArgs = args;
      // Simulate returning items after the cursor
      return allItems.slice(3, 3 + args.take);
    };

    await paginateWithCursor(queryFn, { cursor: 'id-003', limit: 5 });

    expect(receivedArgs.cursor).toEqual({ id: 'id-003' });
    expect(receivedArgs.skip).toBe(1);
    expect(receivedArgs.take).toBe(6); // limit + 1
  });

  it('should not set cursor or skip when cursor is null', async () => {
    const allItems = createMockItems(5);
    let receivedArgs: any = null;

    const queryFn = async (args: { take: number; skip?: number; cursor?: { id: string } }) => {
      receivedArgs = args;
      return allItems;
    };

    await paginateWithCursor(queryFn, { cursor: null });

    expect(receivedArgs.cursor).toBeUndefined();
    expect(receivedArgs.skip).toBeUndefined();
  });

  it('should handle empty result set', async () => {
    const queryFn = async () => [] as MockItem[];

    const result = await paginateWithCursor(queryFn, {});

    expect(result.data).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('should handle exact limit count (no extra item)', async () => {
    const allItems = createMockItems(20);

    const queryFn = async (args: { take: number; skip?: number; cursor?: { id: string } }) => {
      // Return exactly 20 items when asked for 21 (limit+1)
      return allItems.slice(0, Math.min(args.take, 20));
    };

    const result = await paginateWithCursor(queryFn, { limit: 20 });

    expect(result.data).toHaveLength(20);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('should default to 20 when limit is 0 or negative', async () => {
    const allItems = createMockItems(25);

    const queryFn = async (args: { take: number; skip?: number; cursor?: { id: string } }) => {
      return allItems.slice(0, args.take);
    };

    const result = await paginateWithCursor(queryFn, { limit: 0 });
    expect(result.data).toHaveLength(20);

    const result2 = await paginateWithCursor(queryFn, { limit: -5 });
    expect(result2.data).toHaveLength(20);
  });
});
