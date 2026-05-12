import apiClient from './client';
import type { Notification, CursorPaginatedResult } from '../types';

export interface NotificationListParams {
  cursor?: string;
  limit?: number;
}

export const notificationsApi = {
  /** 알림 목록 조회 (커서 기반 페이지네이션) */
  list: (params?: NotificationListParams) =>
    apiClient.get<CursorPaginatedResult<Notification>>('/notifications', { params }),

  /** 읽지 않은 알림 수 조회 */
  getUnreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count'),

  /** 알림 읽음 처리 */
  markAsRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`),

  /** 전체 알림 읽음 처리 */
  markAllAsRead: () =>
    apiClient.patch('/notifications/read-all'),
};
