import { useState, useEffect, type CSSProperties } from 'react';
import { communityApi } from '../../api/community';
import { useAuthStore } from '../../stores/authStore';

interface LikeButtonProps {
  postId: string;
  initialLikeCount: number;
}

const styles: Record<string, CSSProperties> = {
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    backgroundColor: '#fff',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#718096',
    fontWeight: 500,
  },
  buttonActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    border: '1px solid #fc8181',
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    fontSize: 14,
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#e53e3e',
    fontWeight: 600,
  },
  count: {
    fontSize: 14,
  },
};

function LikeButton({ postId, initialLikeCount }: LikeButtonProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    communityApi.getLikeStatus(postId)
      .then((res) => setLiked(res.data.liked))
      .catch(() => {});
  }, [postId, accessToken]);

  const handleClick = async () => {
    if (!accessToken) {
      alert('로그인 후 좋아요를 누를 수 있습니다.');
      return;
    }
    if (loading) return;

    setLoading(true);
    try {
      const res = await communityApi.toggleLike(postId);
      setLiked(res.data.liked);
      setLikeCount(res.data.likeCount);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      style={liked ? styles.buttonActive : styles.button}
      onClick={handleClick}
      aria-label={liked ? '좋아요 취소' : '좋아요'}
      aria-pressed={liked}
    >
      <span>{liked ? '❤️' : '🤍'}</span>
      <span style={styles.count}>{likeCount}</span>
    </button>
  );
}

export default LikeButton;
