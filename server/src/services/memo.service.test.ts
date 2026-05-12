import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  memo: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  groupMember: {
    findUnique: vi.fn(),
  },
  group: {
    findUnique: vi.fn(),
  },
}));

vi.mock('../lib/prisma', () => ({
  writerPrisma: mockPrisma,
  readerPrisma: mockPrisma,
}));

import { memoService } from './memo.service';
import { AppError } from './auth.service';

describe('MemoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for group lookup used in search indexing (fire-and-forget)
    mockPrisma.group.findUnique.mockResolvedValue({
      id: 'group-1',
      book: { title: 'Test Book' },
    });
  });

  describe('create', () => {
    it('should create a memo with default isPublic=false', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1',
        groupId: 'group-1',
        userId: 'user-1',
        readingProgress: 100,
      });
      mockPrisma.memo.create.mockResolvedValue({
        id: 'memo-1',
        groupId: 'group-1',
        userId: 'user-1',
        pageStart: 1,
        pageEnd: 50,
        content: '좋은 내용이다',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', nickname: 'tester' },
      });

      const memo = await memoService.create('group-1', 'user-1', {
        pageStart: 1,
        pageEnd: 50,
        content: '좋은 내용이다',
        isPublic: false,
      });

      expect(memo.isPublic).toBe(false);
      expect(memo.content).toBe('좋은 내용이다');
      expect(mockPrisma.memo.create).toHaveBeenCalledWith({
        data: {
          groupId: 'group-1',
          userId: 'user-1',
          pageStart: 1,
          pageEnd: 50,
          content: '좋은 내용이다',
          isPublic: false,
          visibility: 'private',
        },
        include: { user: { select: { id: true, nickname: true } } },
      });
    });

    it('should throw FORBIDDEN if user is not a group member', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      try {
        await memoService.create('group-1', 'user-1', {
          pageStart: 1,
          pageEnd: 50,
          content: 'test',
          isPublic: false,
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('FORBIDDEN');
        expect((err as AppError).statusCode).toBe(403);
      }
    });
  });

  describe('update', () => {
    it('should update memo content', async () => {
      mockPrisma.memo.findUnique.mockResolvedValue({
        id: 'memo-1',
        userId: 'user-1',
      });
      mockPrisma.memo.update.mockResolvedValue({
        id: 'memo-1',
        content: '수정된 내용',
        userId: 'user-1',
        user: { id: 'user-1', nickname: 'tester' },
      });

      const memo = await memoService.update('memo-1', 'user-1', { content: '수정된 내용' });
      expect(memo.content).toBe('수정된 내용');
    });

    it('should throw NOT_FOUND for non-existent memo', async () => {
      mockPrisma.memo.findUnique.mockResolvedValue(null);

      try {
        await memoService.update('nonexistent', 'user-1', { content: 'test' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('NOT_FOUND');
      }
    });

    it('should throw FORBIDDEN when updating another user\'s memo', async () => {
      mockPrisma.memo.findUnique.mockResolvedValue({
        id: 'memo-1',
        userId: 'user-2',
      });

      try {
        await memoService.update('memo-1', 'user-1', { content: 'test' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('FORBIDDEN');
        expect((err as AppError).statusCode).toBe(403);
      }
    });
  });

  describe('delete', () => {
    it('should delete own memo', async () => {
      mockPrisma.memo.findUnique.mockResolvedValue({
        id: 'memo-1',
        userId: 'user-1',
      });
      mockPrisma.memo.delete.mockResolvedValue({});

      await memoService.delete('memo-1', 'user-1');
      expect(mockPrisma.memo.delete).toHaveBeenCalledWith({ where: { id: 'memo-1' } });
    });

    it('should throw FORBIDDEN when deleting another user\'s memo', async () => {
      mockPrisma.memo.findUnique.mockResolvedValue({
        id: 'memo-1',
        userId: 'user-2',
      });

      try {
        await memoService.delete('memo-1', 'user-1');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });
  });

  describe('updateVisibility', () => {
    it('should update memo visibility', async () => {
      mockPrisma.memo.findUnique.mockResolvedValue({
        id: 'memo-1',
        userId: 'user-1',
        groupId: 'group-1',
        isPublic: false,
        visibility: 'private',
        pageEnd: 50,
      });
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1',
        groupId: 'group-1',
        userId: 'user-1',
        readingProgress: 100,
      });
      mockPrisma.memo.update.mockResolvedValue({
        id: 'memo-1',
        userId: 'user-1',
        isPublic: true,
        visibility: 'public',
        user: { id: 'user-1', nickname: 'tester' },
      });

      const memo = await memoService.updateVisibility('memo-1', 'user-1', 'public');
      expect(memo.isPublic).toBe(true);
    });

    it('should throw FORBIDDEN when changing visibility of another user\'s memo', async () => {
      mockPrisma.memo.findUnique.mockResolvedValue({
        id: 'memo-1',
        userId: 'user-2',
      });

      try {
        await memoService.updateVisibility('memo-1', 'user-1', 'public');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });
  });

  describe('listByGroup', () => {
    it('should return own memos and others public memos only', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1',
        groupId: 'group-1',
        userId: 'user-1',
        readingProgress: 100,
      });
      mockPrisma.memo.findMany.mockResolvedValue([
        {
          id: 'memo-1',
          groupId: 'group-1',
          userId: 'user-1',
          pageStart: 1,
          pageEnd: 50,
          content: '내 비공개 메모',
          isPublic: false,
          visibility: 'private',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'user-1', nickname: 'me' },
        },
        {
          id: 'memo-2',
          groupId: 'group-1',
          userId: 'user-2',
          pageStart: 1,
          pageEnd: 30,
          content: '타인 공개 메모',
          isPublic: true,
          visibility: 'public',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'user-2', nickname: 'other' },
        },
      ]);

      const result = await memoService.listByGroup('group-1', 'user-1');

      expect(result).toHaveLength(2);
      // Own memo: always visible
      expect(result[0].isOwn).toBe(true);
      expect(result[0].content).toBe('내 비공개 메모');
      // Other's public memo: visible because readingProgress(100) >= pageEnd(30)
      expect(result[1].isOwn).toBe(false);
      expect(result[1].content).toBe('타인 공개 메모');
      expect(result[1].canView).toBe(true);
    });

    it('should hide content when reading progress is less than page_end', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1',
        groupId: 'group-1',
        userId: 'user-1',
        readingProgress: 20,
      });
      mockPrisma.memo.findMany.mockResolvedValue([
        {
          id: 'memo-1',
          groupId: 'group-1',
          userId: 'user-2',
          pageStart: 30,
          pageEnd: 50,
          content: '스포일러 포함 메모',
          isPublic: false,
          visibility: 'spoiler',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { id: 'user-2', nickname: 'other' },
        },
      ]);

      const result = await memoService.listByGroup('group-1', 'user-1');

      expect(result[0].canView).toBe(false);
      expect(result[0].content).toBeNull();
    });

    it('should throw FORBIDDEN if user is not a group member', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      try {
        await memoService.listByGroup('group-1', 'user-1');
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });
  });
});
