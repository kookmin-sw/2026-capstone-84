import { writerPrisma, readerPrisma } from '../lib/prisma';
import { paginateWithCursor, CursorPaginatedResult } from '../utils/pagination';
import { NotificationType } from '../types/community';
import { AppError } from './auth.service';

// ===== 파라미터 타입 =====

export interface CreateNotificationParams {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string;
  actorId?: string;
}

// ===== 응답 타입 =====

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string;
  isRead: boolean;
  createdAt: Date;
  actor: {
    id: string;
    nickname: string;
    profileImageUrl: string | null;
  } | null;
}

// ===== 서비스 =====

export const notificationService = {
  /**
   * 알림 생성
   * - actorId === recipientId인 경우 자기 자신에게 알림을 보내지 않는다
   */
  async create(params: CreateNotificationParams): Promise<void> {
    const { recipientId, type, title, message, linkUrl, actorId } = params;

    // 자기 자신에게는 알림을 보내지 않는다
    if (actorId && actorId === recipientId) {
      return;
    }

    await writerPrisma.notification.create({
      data: {
        recipientId,
        type,
        title,
        message,
        linkUrl,
        actorId: actorId || null,
      },
    });
  },

  /**
   * 사용자별 알림 목록 조회 (커서 기반 페이지네이션)
   * - createdAt 내림차순 정렬
   * - actor 정보 포함
   */
  async getByUser(
    userId: string,
    cursor?: string,
    limit?: number
  ): Promise<CursorPaginatedResult<NotificationItem>> {
    return paginateWithCursor<NotificationItem>(
      async (args) => {
        const notifications = await readerPrisma.notification.findMany({
          where: { recipientId: userId },
          orderBy: { createdAt: 'desc' },
          take: args.take,
          skip: args.skip,
          cursor: args.cursor,
          select: {
            id: true,
            type: true,
            title: true,
            message: true,
            linkUrl: true,
            isRead: true,
            createdAt: true,
            actor: {
              select: {
                id: true,
                nickname: true,
                profileImageUrl: true,
              },
            },
          },
        });

        return notifications;
      },
      { cursor, limit }
    );
  },

  /**
   * 읽지 않은 알림 수 조회
   */
  async getUnreadCount(userId: string): Promise<number> {
    return readerPrisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });
  },

  /**
   * 개별 알림 읽음 처리
   * - 본인의 알림만 읽음 처리 가능 (소유권 확인)
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await readerPrisma.notification.findUnique({
      where: { id: notificationId },
      select: { recipientId: true },
    });

    if (!notification) {
      throw new AppError(404, 'NOT_FOUND', '알림을 찾을 수 없습니다');
    }

    if (notification.recipientId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인의 알림만 읽음 처리할 수 있습니다');
    }

    await writerPrisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  },

  /**
   * 전체 알림 읽음 처리
   * - 해당 사용자의 읽지 않은 알림을 모두 읽음 처리
   */
  async markAllAsRead(userId: string): Promise<void> {
    await writerPrisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  },
};
