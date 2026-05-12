import { useState, useEffect, type CSSProperties } from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import NotificationPanel from '../notification/NotificationPanel';

const styles: Record<string, CSSProperties> = {
  wrapper: {
    position: 'relative' as const,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: 18,
    background: 'none',
    border: 'none',
    padding: 0,
    position: 'relative' as const,
  },
  badge: {
    position: 'absolute' as const,
    top: -2,
    right: -2,
    backgroundColor: '#e53e3e',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
  },
};

function NotificationBadge() {
  const [showPanel, setShowPanel] = useState(false);
  const { unreadCount, startPolling, stopPolling } = useNotificationStore();

  useEffect(() => {
    startPolling();
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  return (
    <div style={styles.wrapper}>
      <button
        style={styles.button}
        onClick={() => setShowPanel((prev) => !prev)}
        title="알림"
        aria-label={`알림 ${unreadCount > 0 ? `(${unreadCount}개 읽지 않음)` : ''}`}
      >
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {showPanel && <NotificationPanel onClose={() => setShowPanel(false)} />}
    </div>
  );
}

export default NotificationBadge;
