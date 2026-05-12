import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CommunityPost } from '../../types';
import { timeAgo } from '../../utils/timeAgo';
import { useAuthStore } from '../../stores/authStore';

interface PostCardProps {
  post: CommunityPost;
  spoilerMasked?: boolean;
}

const styles: Record<string, CSSProperties> = {
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #f0f0f5',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    marginBottom: 12,
    position: 'relative',
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#1a202c',
    marginBottom: 4,
    letterSpacing: '-0.3px',
  },
  content: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 1.6,
    marginBottom: 12,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as any,
    overflow: 'hidden',
  },
  spoilerMask: {
    fontSize: 14,
    color: '#a0aec0',
    fontStyle: 'italic',
    marginBottom: 12,
    padding: '12px 16px',
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    border: '1px dashed #e2e8f0',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 12,
    color: '#a0aec0',
  },
  author: {
    fontWeight: 600,
    color: '#667eea',
  },
  stats: {
    display: 'flex',
    gap: 10,
    marginLeft: 'auto',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
  },
  editButton: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: '#667eea',
    backgroundColor: '#ebf4ff',
    border: '1px solid #c3dafe',
    borderRadius: 6,
    cursor: 'pointer',
  },
};

function PostCard({ post, spoilerMasked = false }: PostCardProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const bookTitle = post.book?.title ?? post.bookTitle ?? '';
  const bookAuthor = post.book?.author ?? post.bookAuthor ?? '';
  const bookCoverUrl = post.book?.coverImageUrl ?? post.bookCoverImageUrl ?? '';
  const authorNickname = post.author?.nickname ?? post.authorNickname ?? '';
  const isAuthor = user && (user.id === post.authorId || user.id === post.author?.id);

  const handleClick = () => {
    navigate(`/community/${post.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/community/${post.id}?edit=true`);
  };

  return (
    <div
      style={styles.card}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="article"
      tabIndex={0}
      aria-label={`${bookTitle} - ${authorNickname}`}
    >
      {isAuthor && (
        <button style={styles.editButton} onClick={handleEdit}>
          ✏️ 수정
        </button>
      )}

      <div style={{ display: 'flex', gap: 14 }}>
        {bookCoverUrl && (
          <img
            src={bookCoverUrl}
            alt={bookTitle}
            style={{ width: 48, height: 68, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {bookTitle && (
            <div style={styles.bookTitle}>
              {!bookCoverUrl && '📖 '}{bookTitle}
              {bookAuthor && (
                <span style={{ fontWeight: 400, fontSize: 13, color: '#718096', marginLeft: 6 }}>
                  ({bookAuthor})
                </span>
              )}
            </div>
          )}

          {spoilerMasked ? (
            <div style={styles.spoilerMask}>
              🔒 스포일러 방지: 이 게시글의 내용이 숨겨져 있습니다.
            </div>
          ) : (
            <div style={styles.content}>{post.content}</div>
          )}
        </div>
      </div>

      <div style={styles.meta}>
        <span style={styles.author}>{authorNickname}</span>
        <span>{timeAgo(post.createdAt)}</span>
        <div style={styles.stats}>
          <span style={styles.stat}>❤️ {post.likeCount}</span>
          <span style={styles.stat}>💬 {post.commentCount}</span>
        </div>
      </div>
    </div>
  );
}

export default PostCard;
