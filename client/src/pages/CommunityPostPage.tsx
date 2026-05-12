import { useState, useEffect, type CSSProperties } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { communityApi } from '../api/community';
import { useAuthStore } from '../stores/authStore';
import { timeAgo } from '../utils/timeAgo';
import type { CommunityPost } from '../types';
import LikeButton from '../components/community/LikeButton';
import CommentSection from '../components/community/CommentSection';
import ReportModal from '../components/community/ReportModal';
import { CATEGORIES } from '../components/community/CategoryTabs';

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px',
    backgroundColor: '#f7fafc',
    color: '#4a5568',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: 20,
  },
  bookSection: {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f7fafc',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    marginBottom: 20,
  },
  bookCover: {
    width: 56,
    height: 78,
    objectFit: 'cover' as const,
    borderRadius: 4,
    flexShrink: 0,
  },
  bookInfo: {
    flex: 1,
    minWidth: 0,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a202c',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 13,
    color: '#718096',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#2d3748',
  },
  date: {
    fontSize: 13,
    color: '#a0aec0',
  },
  category: {
    display: 'inline-block',
    padding: '3px 10px',
    backgroundColor: '#ebf4ff',
    color: '#5a67d8',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  pageRange: {
    fontSize: 12,
    color: '#718096',
    backgroundColor: '#f0f0f5',
    padding: '3px 8px',
    borderRadius: 4,
  },
  content: {
    fontSize: 15,
    color: '#2d3748',
    lineHeight: 1.8,
    marginBottom: 24,
    whiteSpace: 'pre-wrap' as const,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTop: '1px solid #f0f0f5',
    marginBottom: 8,
  },
  reportButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    backgroundColor: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    color: '#718096',
    fontWeight: 500,
  },
  deleteButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px',
    border: '1px solid #fed7d7',
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    fontSize: 13,
    cursor: 'pointer',
    color: '#e53e3e',
    fontWeight: 500,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#a0aec0',
    fontSize: 15,
  },
  errorState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#e53e3e',
    fontSize: 15,
  },
};

function CommunityPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 수정 모드 상태
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editPageStart, setEditPageStart] = useState('');
  const [editPageEnd, setEditPageEnd] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    communityApi.getPost(postId)
      .then((res) => setPost(res.data))
      .catch((err) => {
        console.error('Failed to fetch post:', err);
        setError('게시글을 불러올 수 없습니다.');
      })
      .finally(() => setLoading(false));
  }, [postId]);

  // ?edit=true 쿼리 파라미터가 있으면 자동으로 수정 모드 진입
  useEffect(() => {
    if (post && user && user.id === post.authorId && searchParams.get('edit') === 'true') {
      handleStartEdit();
    }
  }, [post, user, searchParams]);

  const handleDelete = async () => {
    if (!postId || deleting) return;
    if (!confirm('게시글을 삭제하시겠습니까?')) return;

    setDeleting(true);
    try {
      await communityApi.deletePost(postId);
      navigate('/community');
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('게시글 삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleStartEdit = () => {
    if (!post) return;
    setEditContent(post.content);
    setEditPageStart(post.pageStart != null ? String(post.pageStart) : '');
    setEditPageEnd(post.pageEnd != null ? String(post.pageEnd) : '');
    setEditCategory(post.category || '');
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!postId || saving) return;
    if (!editContent.trim()) {
      alert('글 내용을 입력해주세요.');
      return;
    }
    if (editPageStart && editPageEnd && parseInt(editPageEnd) < parseInt(editPageStart)) {
      alert('끝 페이지는 시작 페이지 이상이어야 합니다.');
      return;
    }

    setSaving(true);
    try {
      const res = await communityApi.updatePost(postId, {
        content: editContent.trim(),
        pageStart: editPageStart ? parseInt(editPageStart, 10) : null,
        pageEnd: editPageEnd ? parseInt(editPageEnd, 10) : null,
        category: editCategory || null,
      });
      setPost(res.data);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update post:', err);
      alert('게시글 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const isAuthor = user && post && user.id === post.authorId;

  if (loading) {
    return <div style={styles.loading}>불러오는 중...</div>;
  }

  if (error || !post) {
    return (
      <div style={styles.container}>
        <div style={styles.errorState}>{error || '게시글을 찾을 수 없습니다.'}</div>
        <button style={styles.backButton} onClick={() => navigate('/community')}>
          ← 목록으로
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back Button */}
      <button style={styles.backButton} onClick={() => navigate('/community')}>
        ← 목록으로
      </button>

      {/* Book Info */}
      {(post.book || post.bookTitle) && (
        <div style={styles.bookSection}>
          {(post.book?.coverImageUrl || post.bookCoverImageUrl) && (
            <img
              src={post.book?.coverImageUrl || post.bookCoverImageUrl}
              alt={post.book?.title || post.bookTitle}
              style={styles.bookCover}
            />
          )}
          <div style={styles.bookInfo}>
            <div style={styles.bookTitle}>{post.book?.title || post.bookTitle}</div>
            {(post.book?.author || post.bookAuthor) && (
              <div style={styles.bookAuthor}>{post.book?.author || post.bookAuthor}</div>
            )}
          </div>
        </div>
      )}

      {/* Meta */}
      <div style={styles.meta}>
        <span style={styles.authorName}>{post.author?.nickname || post.authorNickname}</span>
        <span style={styles.date}>{timeAgo(post.createdAt)}</span>
        {post.category && <span style={styles.category}>{post.category}</span>}
        {post.pageStart != null && (
          <span style={styles.pageRange}>
            p.{post.pageStart}{post.pageEnd != null && post.pageEnd !== post.pageStart ? ` ~ p.${post.pageEnd}` : ''}
          </span>
        )}
      </div>

      {/* Content */}
      {editing ? (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>내용</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: 180,
                padding: '12px 16px',
                fontSize: 14,
                border: '2px solid #e2e8f0',
                borderRadius: 8,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                lineHeight: 1.6,
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>시작 페이지</label>
              <input
                type="number"
                value={editPageStart}
                onChange={(e) => setEditPageStart(e.target.value)}
                placeholder="시작"
                min={0}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 14,
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>끝 페이지</label>
              <input
                type="number"
                value={editPageEnd}
                onChange={(e) => setEditPageEnd(e.target.value)}
                placeholder="끝"
                min={0}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: 14,
                  border: '2px solid #e2e8f0',
                  borderRadius: 8,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>카테고리</label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 14,
                border: '2px solid #e2e8f0',
                borderRadius: 8,
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: '#fff',
              }}
            >
              <option value="">카테고리 없음</option>
              {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                <option key={cat.key} value={cat.key}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={handleCancelEdit}
              style={{
                padding: '10px 20px',
                backgroundColor: '#edf2f7',
                color: '#4a5568',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.content}>{post.content}</div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <LikeButton postId={post.id} initialLikeCount={post.likeCount} />

        {accessToken && !isAuthor && (
          <button
            style={styles.reportButton}
            onClick={() => setShowReportModal(true)}
          >
            🚨 신고
          </button>
        )}

        {isAuthor && !editing && (
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: 20,
              backgroundColor: '#fff',
              fontSize: 13,
              cursor: 'pointer',
              color: '#4a5568',
              fontWeight: 500,
            }}
            onClick={handleStartEdit}
          >
            ✏️ 수정
          </button>
        )}

        {isAuthor && (
          <button
            style={styles.deleteButton}
            onClick={handleDelete}
            disabled={deleting}
          >
            🗑️ {deleting ? '삭제 중...' : '삭제'}
          </button>
        )}
      </div>

      {/* Comment Section */}
      <CommentSection postId={post.id} />

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          postId={post.id}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

export default CommunityPostPage;
