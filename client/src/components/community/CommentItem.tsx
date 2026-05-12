import { useState, type CSSProperties, type FormEvent } from 'react';
import type { CommunityComment } from '../../types';
import { communityApi } from '../../api/community';
import { useAuthStore } from '../../stores/authStore';
import { timeAgo } from '../../utils/timeAgo';
import ReplyItem from './ReplyItem';

interface CommentItemProps {
  comment: CommunityComment;
  onReplyAdded: () => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '14px 0',
    borderBottom: '1px solid #f0f0f5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  author: {
    fontSize: 14,
    fontWeight: 600,
    color: '#2d3748',
  },
  date: {
    fontSize: 12,
    color: '#a0aec0',
  },
  content: {
    fontSize: 14,
    color: '#2d3748',
    lineHeight: 1.6,
    marginBottom: 8,
  },
  replyToggle: {
    background: 'none',
    border: 'none',
    fontSize: 12,
    color: '#667eea',
    cursor: 'pointer',
    fontWeight: 500,
    padding: 0,
  },
  replyForm: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
    marginLeft: 32,
  },
  replyInput: {
    flex: 1,
    padding: '8px 12px',
    fontSize: 13,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  replyButton: {
    padding: '8px 14px',
    backgroundColor: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  replyButtonDisabled: {
    padding: '8px 14px',
    backgroundColor: '#e2e8f0',
    color: '#a0aec0',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'not-allowed',
    whiteSpace: 'nowrap' as const,
  },
  loginPrompt: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 10,
    marginLeft: 32,
  },
  errorText: {
    fontSize: 11,
    color: '#e53e3e',
    marginTop: 4,
    marginLeft: 32,
  },
};

function CommentItem({ comment, onReplyAdded }: CommentItemProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      setError('답글 내용을 입력해주세요');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await communityApi.createReply(comment.id, { content: replyContent.trim() });
      setReplyContent('');
      setShowReplyForm(false);
      onReplyAdded();
    } catch (err) {
      console.error('Failed to create reply:', err);
      setError('답글 작성에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.author}>{comment.authorNickname}</span>
        <span style={styles.date}>{timeAgo(comment.createdAt)}</span>
      </div>
      <div style={styles.content}>{comment.content}</div>

      {accessToken ? (
        <button
          style={styles.replyToggle}
          onClick={() => setShowReplyForm(!showReplyForm)}
        >
          {showReplyForm ? '취소' : '답글 달기'}
        </button>
      ) : null}

      {showReplyForm && accessToken && (
        <form style={styles.replyForm} onSubmit={handleReplySubmit}>
          <input
            style={styles.replyInput}
            value={replyContent}
            onChange={(e) => {
              setReplyContent(e.target.value);
              if (e.target.value.trim()) setError('');
            }}
            placeholder="답글을 입력하세요"
          />
          <button
            type="submit"
            style={submitting ? styles.replyButtonDisabled : styles.replyButton}
            disabled={submitting}
          >
            등록
          </button>
        </form>
      )}
      {error && <div style={styles.errorText}>{error}</div>}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {comment.replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CommentItem;
