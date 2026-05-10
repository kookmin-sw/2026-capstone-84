import { useState, useEffect, type CSSProperties, type FormEvent } from 'react';
import { communityApi } from '../../api/community';
import { useAuthStore } from '../../stores/authStore';
import type { CommunityComment } from '../../types';
import CommentItem from './CommentItem';

interface CommentSectionProps {
  postId: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    marginTop: 32,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a202c',
    marginBottom: 16,
  },
  form: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  submitButton: {
    padding: '10px 18px',
    backgroundColor: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  submitButtonDisabled: {
    padding: '10px 18px',
    backgroundColor: '#e2e8f0',
    color: '#a0aec0',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'not-allowed',
    whiteSpace: 'nowrap' as const,
  },
  loginPrompt: {
    fontSize: 13,
    color: '#a0aec0',
    marginBottom: 16,
    padding: '12px 14px',
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '24px',
    color: '#a0aec0',
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#e53e3e',
    marginTop: -12,
    marginBottom: 12,
  },
};

function CommentSection({ postId }: CommentSectionProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = async () => {
    try {
      const res = await communityApi.getComments(postId);
      setComments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('댓글 내용을 입력해주세요');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await communityApi.createComment(postId, { content: content.trim() });
      setContent('');
      await fetchComments();
    } catch (err) {
      console.error('Failed to create comment:', err);
      setError('댓글 작성에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>💬 댓글 {comments.length > 0 && `(${comments.length})`}</h3>

      {/* Comment Form */}
      {accessToken ? (
        <>
          <form style={styles.form} onSubmit={handleSubmit}>
            <input
              style={styles.input}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (e.target.value.trim()) setError('');
              }}
              placeholder="댓글을 입력하세요"
            />
            <button
              type="submit"
              style={submitting ? styles.submitButtonDisabled : styles.submitButton}
              disabled={submitting}
            >
              등록
            </button>
          </form>
          {error && <div style={styles.errorText}>{error}</div>}
        </>
      ) : (
        <div style={styles.loginPrompt}>
          로그인 후 댓글을 작성할 수 있습니다.
        </div>
      )}

      {/* Comment List */}
      {loading ? (
        <div style={styles.emptyState}>불러오는 중...</div>
      ) : comments.length === 0 ? (
        <div style={styles.emptyState}>아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</div>
      ) : (
        comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReplyAdded={fetchComments}
          />
        ))
      )}
    </div>
  );
}

export default CommentSection;
