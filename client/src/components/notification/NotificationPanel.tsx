import { useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../stores/notificationStore';
import NotificationItem from './NotificationItem';
import type { Notification } from '../../types';

interface NotificationPanelProps {
  onClose: () => void;
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 199,
  },
  panel: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 360,
    maxHeight: 480,
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    border: '1px solid #e2e8f0',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1a202c',
  },
  markAllButton: {
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: '#667eea',
    backgroundColor: '#ebf4ff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    minHeight: 0,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 16px',
    color: '#a0aec0',
    fontSize: 14,
  },
  loadMore: {
    padding: '10px 16px',
    textAlign: 'center' as const,
    fontSize: 13,
    color: '#667eea',
    cursor: 'pointer',
    borderTop: '1px solid #f0f0f5',
    fontWeight: 500,
  },
};

function NotificationPanel({ onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    hasMore,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    onClose();
    if (notification.linkUrl) {
      navigate(notification.linkUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(false);
    }
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.panel} ref={panelRef}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>알림</span>
          <button style={styles.markAllButton} onClick={handleMarkAllAsRead}>
            모두 읽음
          </button>
        </div>
        <div style={styles.list}>
          {notifications.length === 0 && !loading ? (
            <div style={styles.emptyState}>알림이 없습니다</div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={handleNotificationClick}
              />
            ))
          )}
          {hasMore && (
            <div style={styles.loadMore} onClick={handleLoadMore} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleLoadMore()}>
              {loading ? '불러오는 중...' : '더 보기'}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default NotificationPanel;
