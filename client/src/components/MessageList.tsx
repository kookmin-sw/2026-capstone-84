import { useEffect, useRef } from 'react';
import type { Message } from '@shared/types';
import MessageItem from './MessageItem';

interface SystemNotification {
  id: string;
  text: string;
}

interface MessageListProps {
  messages: Message[];
  notifications: SystemNotification[];
  currentUserId: string;
}

type ListEntry =
  | { type: 'message'; data: Message }
  | { type: 'notification'; data: SystemNotification };

export default function MessageList({ messages, notifications, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, notifications]);

  // Merge messages and notifications in order of appearance.
  // Notifications are appended at the end since they arrive in real-time.
  const entries: ListEntry[] = [
    ...messages.map((m): ListEntry => ({ type: 'message', data: m })),
    ...notifications.map((n): ListEntry => ({ type: 'notification', data: n })),
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {entries.length === 0 && (
        <p style={{ textAlign: 'center', color: '#aaa', marginTop: '24px' }}>
          아직 메시지가 없습니다.
        </p>
      )}
      {entries.map((entry) => {
        if (entry.type === 'notification') {
          return (
            <div
              key={`notif-${entry.data.id}`}
              style={{
                textAlign: 'center',
                color: '#888',
                fontSize: '0.8rem',
                margin: '8px 0',
              }}
            >
              {entry.data.text}
            </div>
          );
        }
        return (
          <MessageItem
            key={entry.data.id}
            message={entry.data}
            isOwnMessage={entry.data.userId === currentUserId}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
