import { create } from 'zustand';
import type { Notification } from '../types';
import { notificationsApi } from '../api/notifications';

interface NotificationState {
  unreadCount: number;
  notifications: Notification[];
  hasMore: boolean;
  nextCursor: string | null;
  loading: boolean;
  pollingInterval: ReturnType<typeof setInterval> | null;

  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  notifications: [],
  hasMore: false,
  nextCursor: null,
  loading: false,
  pollingInterval: null,

  fetchUnreadCount: async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      set({ unreadCount: res.data.count });
    } catch {
      // 실패 시 무시 (폴링 중 네트워크 오류 등)
    }
  },

  fetchNotifications: async (reset = false) => {
    const { loading, nextCursor } = get();
    if (loading) return;

    set({ loading: true });
    try {
      const cursor = reset ? undefined : nextCursor ?? undefined;
      const res = await notificationsApi.list({ cursor, limit: 20 });
      const { data, nextCursor: newCursor, hasMore } = res.data;

      set((state) => ({
        notifications: reset ? data : [...state.notifications, ...data],
        nextCursor: newCursor,
        hasMore,
        loading: false,
      }));
    } catch {
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // 실패 시 무시
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {
      // 실패 시 무시
    }
  },

  startPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) return; // 이미 폴링 중

    // 즉시 한 번 실행
    get().fetchUnreadCount();

    const interval = setInterval(() => {
      get().fetchUnreadCount();
    }, 30000); // 30초마다 갱신

    set({ pollingInterval: interval });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },
}));
