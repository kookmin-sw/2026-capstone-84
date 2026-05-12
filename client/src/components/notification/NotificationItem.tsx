import type { CSSProperties } from 'react';
import type { Notification } from '../../types';
import { timeAgo } from '../../utils/timeAgo';

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
}

const styles: Record<string, CSSProperties> = {
  item: {
    display: 'flex',
    gap: 10,
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f5',
    transition: 'background-color 0.15s',
  },
  itemUnread: {
    display: 'flex',
    gap: 10,
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f5',
    backgroundColor: '#f7faff',
    transition: 'background-color 0.15s',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#667eea',
    flexShrink: 0,
    marginTop: 6,
  },
  dotRead: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: 'transparent',
    flexShrink: 0,
    marginTop: 6,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1a202c',
    marginBottom: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  message: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  time: {
    fontSize: 11,
    color: '#a0aec0',
  },
};

const typeIcons: Record<string, string> = {
  comment: '💬',
  reply: '↩️',
  like: '❤️',
  report_hidden: '⚠️',
  discussion_schedule: '📅',
  moderation_alert: '🛡️',
};

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const icon = typeIcons[notification.type] || '🔔';

  return (
    <div
      style={notification.isRead ? styles.item : styles.itemUnread}
      onClick={() => onClick(notification)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(notification)}
    >
      <div style={notification.isRead ? styles.dotRead : styles.dot} />
      <div style={styles.content}>
        <div style={styles.title}>{icon} {notification.title}</div>
        <div style={styles.message}>{notification.message}</div>
        <div style={styles.time}>{timeAgo(notification.createdAt)}</div>
      </div>
    </div>
  );
}

export default NotificationItem;
