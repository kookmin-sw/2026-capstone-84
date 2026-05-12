import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { proposalsApi, type TopicProposal } from '../api/proposals';
import { useAuthStore } from '../stores/authStore';
import { timeAgo } from '../utils/timeAgo';

interface Comment {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { id: string; nickname: string };
  replies: Reply[];
}

interface Reply {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: { id: string; nickname: string };
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 800, margin: '0 auto', padding: '24px 16px' },
  backLink: { display: 'inline-block', marginBottom: 16, fontSize: 14, color: '#3182ce' },
  topicSection: { backgroundColor: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 },
  topicTitle: { fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#2d3748' },
  topicContent: { fontSize: 14, color: '#4a5568', lineHeight: 1.6, marginBottom: 12 },
  topicMeta: { fontSize: 12, color: '#a0aec0' },
  section: { backgroundColor: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#2d3748' },
  commentCard: { padding: '12px 0', borderBottom: '1px solid #f0f0f0' },
  commentAuthor: { fontSize: 14, fontWeight: 600, color: '#2d3748', marginBottom: 4 },
  commentContent: { fontSize: 14, color: '#4a5568', lineHeight: 1.6, marginBottom: 4 },
  commentMeta: { fontSize: 12, color: '#a0aec0', marginBottom: 8 },
  replySection: { marginLeft: 24, paddingLeft: 12, borderLeft: '2px solid #e2e8f0' },
  replyCard: { padding: '8px 0' },
  replyAuthor: { fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 2 },
  replyContent: { fontSize: 13, color: '#4a5568', lineHeight: 1.5 },
  replyMeta: { fontSize: 11, color: '#a0aec0', marginTop: 2 },
  formRow: { display: 'flex', gap: 8, marginTop: 8 },
  input: { flex: 1, padding: '8px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' as const },
  submitBtn: { padding: '8px 16px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  replyToggle: { fontSize: 12, color: '#3182ce', cursor: 'pointer', background: 'none', border: 'none', padding: 0 },
  emptyState: { textAlign: 'center' as const, padding: '30px 20px', color: '#a0aec0', fontSize: 14 },
  loading: { textAlign: 'center' as const, padding: '60px 20px', color: '#a0aec0' },
};

function ProposalThreadPage() {
  const { id: proposalId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [proposal, setProposal] = useState<TopicProposal | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  let currentUserId = user?.id || '';
  if (!currentUserId && accessToken) {
    try { currentUserId = JSON.parse(atob(accessToken.split('.')[1] || '')).userId || ''; } catch {}
  }

  const fetchData = async () => {
    if (!proposalId) return;
    setLoading(true);
    try {
      const [propRes, commentsRes] = await Promise.all([
        proposalsApi.getById(proposalId),
        proposalsApi.getComments(proposalId),
      ]);
      setProposal(propRes.data);
      setComments(commentsRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [proposalId]);

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !proposalId) return;
    setSubmittingComment(true);
    try {
      await proposalsApi.addComment(proposalId, newComment.trim());
      setNewComment('');
      fetchData();
    } catch {}
    finally { setSubmittingComment(false); }
  };

  const handleAddReply = async (commentId: string) => {
    if (!replyContent.trim()) return;
    setSubmittingReply(true);
    try {
      await proposalsApi.addReply(commentId, replyContent.trim());
      setReplyContent('');
      setReplyingTo(null);
      fetchData();
    } catch {}
    finally { setSubmittingReply(false); }
  };

  if (loading) return <div style={styles.loading}>불러오는 중...</div>;

  return (
    <div style={styles.container}>
      <Link to={`/groups/${proposal?.groupId}/discussions`} style={styles.backLink}>← 토론 페이지로</Link>

      {/* 주제 헤더 */}
      <div style={styles.topicSection}>
        <div style={styles.topicTitle}>{proposal?.title || '토론 주제'}</div>
        {proposal?.content && <div style={styles.topicContent}>{proposal.content}</div>}
        <div style={styles.topicMeta}>
          {proposal?.author?.nickname || ''} · {proposal?.createdAt ? timeAgo(proposal.createdAt) : ''}
          {proposal?.status === 'opened' && <span style={{ marginLeft: 8, backgroundColor: '#c6f6d5', color: '#276749', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>개최됨</span>}
        </div>
      </div>

      {/* 의견 목록 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>의견 목록</div>
        {comments.length === 0 ? (
          <div style={styles.emptyState}>아직 의견이 없습니다. 첫 의견을 남겨보세요!</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} style={styles.commentCard}>
              <div style={styles.commentAuthor}>{comment.author.nickname}</div>
              <div style={styles.commentContent}>{comment.content}</div>
              <div style={styles.commentMeta}>
                {timeAgo(comment.createdAt)}
                {' · '}
                <button
                  style={styles.replyToggle}
                  onClick={() => {
                    setReplyingTo(replyingTo === comment.id ? null : comment.id);
                    setReplyContent('');
                  }}
                >
                  {replyingTo === comment.id ? '취소' : '댓글 달기'}
                </button>
              </div>

              {/* 답글 작성 */}
              {replyingTo === comment.id && (
                <div style={{ ...styles.formRow, marginLeft: 24 }}>
                  <input
                    type="text"
                    style={styles.input}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="댓글을 작성해주세요"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddReply(comment.id))}
                  />
                  <button
                    style={styles.submitBtn}
                    onClick={() => handleAddReply(comment.id)}
                    disabled={submittingReply}
                  >
                    {submittingReply ? '...' : '댓글'}
                  </button>
                </div>
              )}

              {/* 답글 목록 */}
              {comment.replies && comment.replies.length > 0 && (
                <div style={styles.replySection}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} style={styles.replyCard}>
                      <div style={styles.replyAuthor}>{reply.author.nickname}</div>
                      <div style={styles.replyContent}>{reply.content}</div>
                      <div style={styles.replyMeta}>{timeAgo(reply.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 의견 작성 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>의견 작성</div>
        <form onSubmit={handleAddComment}>
          <div style={styles.formRow}>
            <input
              type="text"
              style={styles.input}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="의견을 작성해주세요"
            />
            <button type="submit" style={styles.submitBtn} disabled={submittingComment}>
              {submittingComment ? '작성 중...' : '의견 작성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProposalThreadPage;
