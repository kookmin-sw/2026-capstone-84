import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendScheduleNotifications } from './discussion-schedule-notifier.service';

// Mock prisma
vi.mock('../lib/prisma', () => ({
  readerPrisma: {
    group: {
      findMany: vi.fn(),
    },
  },
  writerPrisma: {
    notification: {
      create: vi.fn(),
    },
  },
}));

// Mock notification service
vi.mock('./notification.service', () => ({
  notificationService: {
    create: vi.fn(),
  },
}));

import { readerPrisma } from '../lib/prisma';
import { notificationService } from './notification.service';

const mockedGroupFindMany = vi.mocked(readerPrisma.group.findMany);
const mockedNotificationCreate = vi.mocked(notificationService.create);

describe('discussionScheduleNotifierService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendScheduleNotifications', () => {
    it('should send notifications to all members of groups with discussion tomorrow', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockedGroupFindMany.mockResolvedValueOnce([
        {
          id: 'group-1',
          name: '독서모임A',
          discussionDate: tomorrow,
          book: { title: '데미안' },
          members: [
            { userId: 'user-1' },
            { userId: 'user-2' },
          ],
        },
      ] as any);

      mockedNotificationCreate.mockResolvedValue(undefined);

      const result = await sendScheduleNotifications();

      expect(result.groupsProcessed).toBe(1);
      expect(result.notificationsSent).toBe(2);
      expect(mockedNotificationCreate).toHaveBeenCalledTimes(2);

      // Verify notification content for first member
      expect(mockedNotificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-1',
          type: 'discussion_schedule',
          title: '토론 일정 알림',
          message: expect.stringContaining('독서모임A'),
          linkUrl: '/groups/group-1',
        }),
      );

      // Verify notification content for second member
      expect(mockedNotificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'user-2',
          type: 'discussion_schedule',
          title: '토론 일정 알림',
          message: expect.stringContaining('데미안'),
          linkUrl: '/groups/group-1',
        }),
      );
    });

    it('should return zero counts when no groups have discussion tomorrow', async () => {
      mockedGroupFindMany.mockResolvedValueOnce([]);

      const result = await sendScheduleNotifications();

      expect(result.groupsProcessed).toBe(0);
      expect(result.notificationsSent).toBe(0);
      expect(mockedNotificationCreate).not.toHaveBeenCalled();
    });

    it('should handle multiple groups with discussions tomorrow', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockedGroupFindMany.mockResolvedValueOnce([
        {
          id: 'group-1',
          name: '모임A',
          discussionDate: tomorrow,
          book: { title: '책1' },
          members: [{ userId: 'user-1' }],
        },
        {
          id: 'group-2',
          name: '모임B',
          discussionDate: tomorrow,
          book: { title: '책2' },
          members: [{ userId: 'user-2' }, { userId: 'user-3' }],
        },
      ] as any);

      mockedNotificationCreate.mockResolvedValue(undefined);

      const result = await sendScheduleNotifications();

      expect(result.groupsProcessed).toBe(2);
      expect(result.notificationsSent).toBe(3);
      expect(mockedNotificationCreate).toHaveBeenCalledTimes(3);
    });

    it('should include correct date format in notification message', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expectedDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      mockedGroupFindMany.mockResolvedValueOnce([
        {
          id: 'group-1',
          name: '테스트모임',
          discussionDate: tomorrow,
          book: { title: '테스트책' },
          members: [{ userId: 'user-1' }],
        },
      ] as any);

      mockedNotificationCreate.mockResolvedValue(undefined);

      await sendScheduleNotifications();

      expect(mockedNotificationCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `테스트모임 - 테스트책 토론이 내일(${expectedDate})에 예정되어 있습니다`,
        }),
      );
    });

    it('should query groups with discussionDate in tomorrow range', async () => {
      mockedGroupFindMany.mockResolvedValueOnce([]);

      await sendScheduleNotifications();

      expect(mockedGroupFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            discussionDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        }),
      );
    });
  });
});
