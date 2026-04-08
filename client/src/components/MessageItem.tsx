import type { Message } from '@shared/types';

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
        marginBottom: '8px',
      }}
    >
      <span style={{ fontSize: '0.75rem', color: '#888', marginBottom: '2px' }}>
        {message.userName}
      </span>
      <div
        style={{
          backgroundColor: isOwnMessage ? '#4a90d9' : '#e9ecef',
          color: isOwnMessage ? '#fff' : '#333',
          padding: '8px 12px',
          borderRadius: '12px',
          maxWidth: '70%',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
      </div>
      <span style={{ fontSize: '0.65rem', color: '#aaa', marginTop: '2px' }}>
        {formatTime(message.sentAt)}
      </span>
    </div>
  );
}
