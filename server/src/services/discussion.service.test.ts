import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(async (callback: any) => callback(mockPrisma)),
  discussion: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
  },
  discussionToken: {
    deleteMany: vi.fn(),
  },
  comment: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  reply: {
    create: vi.fn(),
  },
  memo: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  groupMember: {
    findUnique: vi.fn(),
  },
}));

vi.mock('./token.service', () => ({
  tokenService: {
    consume: vi.fn(),
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

import { discussionService } from './discussion.service';
import { AppError } from './auth.service';

const openGroup = {
  readingStartDate: new Date('2000-01-01T00:00:00.000Z'),
  readingEndDate: new Date('2999-12-31T00:00:00.000Z'),
};

describe('DiscussionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.discussion.count.mockResolvedValue(0);
  });

  describe('createTopic', () => {
    it('should create a discussion topic', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1', groupId: 'group-1', userId: 'user-1',
        group: openGroup,
      });
      mockPrisma.discussion.create.mockResolvedValue({
        id: 'disc-1',
        groupId: 'group-1',
        authorId: 'user-1',
        memoId: null,
        title: '첫 번째 토론',
        content: '토론 내용',
        isRecommended: false,
        createdAt: new Date(),
        author: { id: 'user-1', nickname: 'tester' },
        memo: null,
      });

      const result = await discussionService.createTopic('group-1', 'user-1', {
        title: '첫 번째 토론',
        content: '토론 내용',
      });

      expect(result.title).toBe('첫 번째 토론');
      expect(result.isRecommended).toBe(false);
      expect(mockPrisma.discussion.create).toHaveBeenCalledWith({
        data: {
          groupId: 'group-1',
          authorId: 'user-1',
          memoId: null,
          title: '첫 번째 토론',
          content: '토론 내용',
          imageUrl: null,
          isRecommended: false,
          status: 'active',
          endDate: null,
        },
        include: {
          author: { select: { id: true, nickname: true } },
          memo: true,
        },
      });
    });

    it('should create a topic with memo reference', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1', groupId: 'group-1', userId: 'user-1',
        group: openGroup,
      });
      mockPrisma.memo.findUnique.mockResolvedValue({
        id: 'memo-1', groupId: 'group-1', userId: 'user-1',
      });
      mockPrisma.discussion.create.mockResolvedValue({
        id: 'disc-1',
        groupId: 'group-1',
        authorId: 'user-1',
        memoId: 'memo-1',
        title: '메모 기반 토론',
        content: null,
        isRecommended: false,
        createdAt: new Date(),
        author: { id: 'user-1', nickname: 'tester' },
        memo: { id: 'memo-1' },
      });

      const result = await discussionService.createTopic('group-1', 'user-1', {
        title: '메모 기반 토론',
        memoId: 'memo-1',
      });

      expect(result.memoId).toBe('memo-1');
    });

    it('should throw FORBIDDEN if user is not a group member', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(
        discussionService.createTopic('group-1', 'user-1', { title: '토론' }),
      ).rejects.toThrow(AppError);

      try {
        await discussionService.createTopic('group-1', 'user-1', { title: '토론' });
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
        expect((err as AppError).statusCode).toBe(403);
      }
    });

    it('should throw NOT_FOUND if referenced memo does not exist', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1', groupId: 'group-1', userId: 'user-1',
        group: openGroup,
      });
      mockPrisma.memo.findUnique.mockResolvedValue(null);

      await expect(
        discussionService.createTopic('group-1', 'user-1', {
          title: '토론',
          memoId: 'nonexistent',
        }),
      ).rejects.toThrow(AppError);
    });

    it('should throw VALIDATION_ERROR if memo belongs to different group', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1', groupId: 'group-1', userId: 'user-1',
        group: openGroup,
      });
      mockPrisma.memo.findUnique.mockResolvedValue({
        id: 'memo-1', groupId: 'group-2', userId: 'user-1',
      });

      try {
        await discussionService.createTopic('group-1', 'user-1', {
          title: '토론',
          memoId: 'memo-1',
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as AppError).code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('listTopics', () => {
    it('should list all topics for a group', async () => {
      mockPrisma.discussion.findMany.mockResolvedValueOnce([]);
      mockPrisma.discussion.findMany.mockResolvedValueOnce([
        {
          id: 'disc-1',
          groupId: 'group-1',
          authorId: 'user-1',
          memoId: null,
          title: '토론 1',
          content: '내용',
          isRecommended: false,
          createdAt: new Date(),
          author: { id: 'user-1', nickname: 'tester' },
          memo: null,
          _count: { comments: 3 },
        },
      ]);

      const result = await discussionService.listTopics('group-1');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('토론 1');
      expect(result[0].commentCount).toBe(3);
    });

    it('should filter topics by authorId', async () => {
      mockPrisma.discussion.findMany.mockResolvedValueOnce([]);
      mockPrisma.discussion.findMany.mockResolvedValueOnce([]);

      await discussionService.listTopics('group-1', { authorId: 'user-1' });

      expect(mockPrisma.discussion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { groupId: 'group-1', authorId: 'user-1' },
        }),
      );
    });
  });

  describe('deleteTopic', () => {
    it('should delete discussion tokens before deleting an empty discussion', async () => {
      mockPrisma.discussion.findUnique.mockResolvedValue({
        id: 'disc-1',
        authorId: 'user-1',
        group: openGroup,
        _count: { comments: 0 },
      });
      mockPrisma.discussionToken.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.discussion.delete.mockResolvedValue({ id: 'disc-1' });

      await discussionService.deleteTopic('disc-1', 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.discussionToken.deleteMany).toHaveBeenCalledWith({
        where: { discussionId: 'disc-1' },
      });
      expect(mockPrisma.discussion.delete).toHaveBeenCalledWith({
        where: { id: 'disc-1' },
      });
    });

    it('should not delete a discussion that has comments', async () => {
      mockPrisma.discussion.findUnique.mockResolvedValue({
        id: 'disc-1',
        authorId: 'user-1',
        group: openGroup,
        _count: { comments: 1 },
      });

      await expect(discussionService.deleteTopic('disc-1', 'user-1')).rejects.toThrow(AppError);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.discussionToken.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.discussion.delete).not.toHaveBeenCalled();
    });
  });

  describe('addComment', () => {
    it('should add a comment to a discussion', async () => {
      mockPrisma.discussion.findUnique.mockResolvedValue({
        id: 'disc-1', groupId: 'group-1',
        group: openGroup,
      });
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1', groupId: 'group-1', userId: 'user-1',
      });
      mockPrisma.comment.create.mockResolvedValue({
        id: 'comment-1',
        discussionId: 'disc-1',
        authorId: 'user-1',
        content: '좋은 의견입니다',
        createdAt: new Date(),
        author: { id: 'user-1', nickname: 'tester' },
      });

      const result = await discussionService.addComment('disc-1', 'user-1', '좋은 의견입니다');

      expect(result.content).toBe('좋은 의견입니다');
      expect(result.discussionId).toBe('disc-1');
    });

    it('should throw NOT_FOUND if discussion does not exist', async () => {
      mockPrisma.discussion.findUnique.mockResolvedValue(null);

      await expect(
        discussionService.addComment('nonexistent', 'user-1', '의견'),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN if user is not a group member', async () => {
      mockPrisma.discussion.findUnique.mockResolvedValue({
        id: 'disc-1', groupId: 'group-1',
        group: openGroup,
      });
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      try {
        await discussionService.addComment('disc-1', 'user-1', '의견');
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });
  });

  describe('addReply', () => {
    it('should add a reply to a comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        discussion: { id: 'disc-1', groupId: 'group-1', group: openGroup },
      });
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1', groupId: 'group-1', userId: 'user-1',
      });
      mockPrisma.reply.create.mockResolvedValue({
        id: 'reply-1',
        commentId: 'comment-1',
        authorId: 'user-1',
        content: '동의합니다',
        createdAt: new Date(),
        author: { id: 'user-1', nickname: 'tester' },
      });

      const result = await discussionService.addReply('comment-1', 'user-1', '동의합니다');

      expect(result.content).toBe('동의합니다');
      expect(result.commentId).toBe('comment-1');
    });

    it('should throw NOT_FOUND if comment does not exist', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        discussionService.addReply('nonexistent', 'user-1', '댓글'),
      ).rejects.toThrow(AppError);
    });

    it('should throw FORBIDDEN if user is not a group member', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        discussion: { id: 'disc-1', groupId: 'group-1', group: openGroup },
      });
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      try {
        await discussionService.addReply('comment-1', 'user-1', '댓글');
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });
  });

  describe('getComments', () => {
    it('should return comments with replies for a discussion', async () => {
      mockPrisma.discussion.findUnique.mockResolvedValue({ id: 'disc-1' });
      mockPrisma.comment.findMany.mockResolvedValue([
        {
          id: 'comment-1',
          discussionId: 'disc-1',
          authorId: 'user-1',
          content: '의견 1',
          createdAt: new Date(),
          author: { id: 'user-1', nickname: 'tester' },
          replies: [
            {
              id: 'reply-1',
              commentId: 'comment-1',
              authorId: 'user-2',
              content: '댓글 1',
              createdAt: new Date(),
              author: { id: 'user-2', nickname: 'other' },
            },
          ],
        },
      ]);

      const result = await discussionService.getComments('disc-1');

      expect(result).toHaveLength(1);
      expect(result[0].replies).toHaveLength(1);
    });

    it('should throw NOT_FOUND if discussion does not exist', async () => {
      mockPrisma.discussion.findUnique.mockResolvedValue(null);

      await expect(
        discussionService.getComments('nonexistent'),
      ).rejects.toThrow(AppError);
    });
  });

  describe('getRecommendations', () => {
    it('should return empty array when less than 2 public memos', async () => {
      mockPrisma.memo.findMany.mockResolvedValue([
        { id: 'memo-1', content: '메모 하나' },
      ]);

      const result = await discussionService.getRecommendations('group-1');

      expect(result).toHaveLength(0);
    });

    it('should return recommendations when 2+ public memos exist with shared keywords', async () => {
      mockPrisma.memo.findMany.mockResolvedValue([
        { id: 'memo-1', content: '인간의 자유의지에 대한 고찰' },
        { id: 'memo-2', content: '자유의지와 결정론의 관계' },
      ]);

      const result = await discussionService.getRecommendations('group-1');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].title).toBeDefined();
      expect(result[0].memoIds.length).toBeGreaterThanOrEqual(1);
    });

    it('should return fallback recommendation when no shared keywords', async () => {
      mockPrisma.memo.findMany.mockResolvedValue([
        { id: 'memo-1', content: 'ab' },
        { id: 'memo-2', content: 'cd' },
      ]);

      const result = await discussionService.getRecommendations('group-1');

      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('createFromRecommendation', () => {
    it('should create a discussion with isRecommended=true', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue({
        id: 'member-1', groupId: 'group-1', userId: 'user-1',
        group: openGroup,
      });
      mockPrisma.discussion.create.mockResolvedValue({
        id: 'disc-1',
        groupId: 'group-1',
        authorId: 'user-1',
        memoId: 'memo-1',
        title: '추천 토론 주제',
        content: '추천 내용',
        isRecommended: true,
        createdAt: new Date(),
        author: { id: 'user-1', nickname: 'tester' },
        memo: { id: 'memo-1' },
      });

      const result = await discussionService.createFromRecommendation('group-1', 'user-1', {
        title: '추천 토론 주제',
        content: '추천 내용',
        keywords: ['자유의지'],
        memoIds: ['memo-1'],
      });

      expect(result.isRecommended).toBe(true);
      expect(mockPrisma.discussion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isRecommended: true,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw FORBIDDEN if user is not a group member', async () => {
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      try {
        await discussionService.createFromRecommendation('group-1', 'user-1', {
          title: '추천',
          content: '',
          keywords: [],
          memoIds: [],
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect((err as AppError).code).toBe('FORBIDDEN');
      }
    });
  });
});
