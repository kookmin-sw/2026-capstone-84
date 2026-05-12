import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  groupMember: {
    findMany: vi.fn(),
  },
  memo: {
    findMany: vi.fn(),
  },
  discussion: {
    findMany: vi.fn(),
  },
}));

vi.mock('../lib/prisma', () => ({
  writerPrisma: mockPrisma,
  readerPrisma: mockPrisma,
}));

import { mypageService } from './mypage.service';

describe('MypageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyGroups', () => {
    it('should return groups the user has joined', async () => {
      mockPrisma.groupMember.findMany.mockResolvedValue([
        {
          id: 'member-1',
          groupId: 'group-1',
          userId: 'user-1',
          role: 'owner',
          readingProgress: 50,
          joinedAt: new Date('2024-01-01'),
          group: {
            id: 'group-1',
            name: '독서 모임 A',
            description: '설명',
            maxMembers: 10,
            readingStartDate: new Date('2024-01-01'),
            readingEndDate: new Date('2024-02-01'),
            discussionDate: new Date('2024-02-15'),
            createdAt: new Date('2024-01-01'),
            book: {
              id: 'book-1',
              title: '테스트 책',
              author: '저자',
              coverImageUrl: null,
              summary: '요약',
            },
            _count: { members: 3 },
          },
        },
      ]);

      const result = await mypageService.getMyGroups('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('group-1');
      expect(result[0].name).toBe('독서 모임 A');
      expect(result[0].role).toBe('owner');
      expect(result[0].readingProgress).toBe(50);
      expect(result[0].memberCount).toBe(3);
      expect(result[0].book.title).toBe('테스트 책');
    });

    it('should return empty array when user has no groups', async () => {
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const result = await mypageService.getMyGroups('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getMyMemos', () => {
    it('should return memos written by the user', async () => {
      mockPrisma.memo.findMany.mockResolvedValue([
        {
          id: 'memo-1',
          groupId: 'group-1',
          userId: 'user-1',
          pageStart: 1,
          pageEnd: 50,
          content: '메모 내용',
          isPublic: false,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
          group: {
            name: '독서 모임 A',
            book: { id: 'book-1', title: '테스트 책' },
          },
        },
      ]);

      const result = await mypageService.getMyMemos('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('memo-1');
      expect(result[0].groupName).toBe('독서 모임 A');
      expect(result[0].bookTitle).toBe('테스트 책');
      expect(result[0].content).toBe('메모 내용');
    });

    it('should return empty array when user has no memos', async () => {
      mockPrisma.memo.findMany.mockResolvedValue([]);

      const result = await mypageService.getMyMemos('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getMyDiscussions', () => {
    it('should return discussions authored by the user', async () => {
      mockPrisma.discussion.findMany.mockResolvedValue([
        {
          id: 'disc-1',
          groupId: 'group-1',
          authorId: 'user-1',
          title: '토론 주제',
          content: '토론 내용',
          isRecommended: false,
          createdAt: new Date('2024-01-15'),
          group: {
            name: '독서 모임 A',
            book: { id: 'book-1', title: '테스트 책' },
          },
          _count: { comments: 5 },
        },
      ]);

      const result = await mypageService.getMyDiscussions('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('disc-1');
      expect(result[0].groupName).toBe('독서 모임 A');
      expect(result[0].bookTitle).toBe('테스트 책');
      expect(result[0].title).toBe('토론 주제');
      expect(result[0].commentCount).toBe(5);
    });

    it('should return empty array when user has no discussions', async () => {
      mockPrisma.discussion.findMany.mockResolvedValue([]);

      const result = await mypageService.getMyDiscussions('user-1');

      expect(result).toHaveLength(0);
    });
  });
});
