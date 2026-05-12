import type { CSSProperties } from 'react';
import type { CommunityComment } from '../../types';
import { timeAgo } from '../../utils/timeAgo';

interface ReplyItemProps {
  reply: CommunityComment;
}

const styles: Record<string, CSSProperties> = {
  container: {
    marginLeft: 32,
    padding: '12px 14px',
    borderLeft: '2px solid #e2e8f0',
    marginBottom: 8,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  author: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
  },
  date: {
    fontSize: 12,
    color: '#a0aec0',
  },
  content: {
    fontSize: 14,
    color: '#2d3748',
    lineHeight: 1.6,
  },
};

function ReplyItem({ reply }: ReplyItemProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.author}>{reply.authorNickname}</span>
        <span style={styles.date}>{timeAgo(reply.createdAt)}</span>
      </div>
      <div style={styles.content}>{reply.content}</div>
    </div>
  );
}

export default ReplyItem;
