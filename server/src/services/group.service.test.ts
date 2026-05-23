import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(async (callback: any) => callback(mockPrisma)),
  notification: {
    deleteMany: vi.fn(),
  },
  reply: {
    deleteMany: vi.fn(),
  },
  comment: {
    deleteMany: vi.fn(),
  },
  discussionToken: {
    deleteMany: vi.fn(),
  },
  discussion: {
    deleteMany: vi.fn(),
  },
  memo: {
    deleteMany: vi.fn(),
  },
  announcement: {
    deleteMany: vi.fn(),
  },
  discussionSchedule: {
    deleteMany: vi.fn(),
  },
  discussionInsight: {
    deleteMany: vi.fn(),
  },
  groupBan: {
    deleteMany: vi.fn(),
  },
  groupTag: {
    deleteMany: vi.fn(),
  },
  groupMember: {
    deleteMany: vi.fn(),
  },
  group: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

import { groupService } from './group.service';

describe('GroupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('delete', () => {
    it('deletes all group-owned relations before deleting the group', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        id: 'group-1',
        ownerId: 'owner-1',
        _count: { members: 1 },
      });

      await groupService.delete('group-1', 'owner-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
      expect(mockPrisma.reply.deleteMany).toHaveBeenCalledWith({
        where: { comment: { discussion: { groupId: 'group-1' } } },
      });
      expect(mockPrisma.comment.deleteMany).toHaveBeenCalledWith({
        where: { discussion: { groupId: 'group-1' } },
      });
      expect(mockPrisma.discussionToken.deleteMany).toHaveBeenCalledWith({
        where: { discussion: { groupId: 'group-1' } },
      });
      expect(mockPrisma.discussion.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
      expect(mockPrisma.memo.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
      expect(mockPrisma.announcement.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
      expect(mockPrisma.discussionSchedule.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
      expect(mockPrisma.discussionInsight.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
      expect(mockPrisma.groupBan.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
      expect(mockPrisma.groupTag.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
      expect(mockPrisma.groupMember.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'group-1' } });
      expect(mockPrisma.group.delete).toHaveBeenCalledWith({ where: { id: 'group-1' } });
    });
  });
});
