import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import { useAuthStore } from '../stores/authStore';
import type { GroupCard, ApiError } from '../types';
import { AxiosError } from 'axios';
import GroupJoinModal from '../components/GroupJoinModal';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 16,
    color: '#1a202c',
    letterSpacing: '-0.3px',
  },
  section: {
    marginBottom: 32,
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  placeholderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #f0f0f5',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    color: '#a0aec0',
    fontSize: 14,
  },
  searchBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 28,
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    fontSize: 14,
    border: '2px solid #e2e8f0',
    borderRadius: 10,
    boxSizing: 'border-box' as const,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  searchButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(102,126,234,0.25)',
    transition: 'transform 0.15s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #f0f0f5',
  },
  bookTitle: {
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 4,
    color: '#1a202c',
    letterSpacing: '-0.3px',
  },
  groupName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#667eea',
    marginBottom: 8,
  },
  summary: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 12,
    lineHeight: 1.6,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical' as any,
    overflow: 'hidden',
  },
  meta: {
    fontSize: 12,
    color: '#a0aec0',
    lineHeight: 1.9,
  },
  members: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #ebf4ff 0%, #e8e0ff 100%)',
    color: '#5a67d8',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#a0aec0',
    fontSize: 15,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#a0aec0',
    fontSize: 15,
  },
};

function HomePage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  // 현재 사용자 ID 추출
  let currentUserId = user?.id || '';
  if (!currentUserId && accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1] || ''));
      currentUserId = payload.userId || '';
    } catch { /* ignore */ }
  }

  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);

  // Modal state
  const [selectedGroup, setSelectedGroup] = useState<GroupCard | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');

  const fetchGroups = async (query?: string) => {
    setLoading(true);
    try {
      const params = query ? { search: query } : undefined;
      const response = await groupsApi.list(params);
      setGroups(response.data?.data || []);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearched(!!search.trim());
    fetchGroups(search.trim() || undefined);
  };

  const handleCardClick = (group: GroupCard) => {
    if (group.isMember || group.ownerId === currentUserId) {
      navigate(`/groups/${group.id}`);
      return;
    }
    setSelectedGroup(group);
    setJoinMsg('');
    setJoining(false);
  };

  const handleModalClose = () => {
    setSelectedGroup(null);
    setJoinMsg('');
  };

  const handleJoin = async (password?: string) => {
    if (!selectedGroup) return;
    if (!accessToken) {
      setSelectedGroup(null);
      navigate('/login');
      return;
    }
    setJoining(true);
    setJoinMsg('');
    try {
      await groupsApi.join(selectedGroup.id, password);
      setJoinMsg('모임에 참여했습니다!');
      setTimeout(() => {
        setSelectedGroup(null);
        navigate(`/groups/${selectedGroup.id}`);
      }, 800);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const code = axiosErr.response?.data?.error?.code;
      if (code === 'ALREADY_JOINED') {
        setJoinMsg('이미 참여 중인 모임입니다');
        setTimeout(() => {
          setSelectedGroup(null);
          navigate(`/groups/${selectedGroup.id}`);
        }, 800);
      } else if (code === 'GROUP_FULL') {
        setJoinMsg('모집 인원이 마감되었습니다');
      } else if (code === 'INVALID_PASSWORD') {
        setJoinMsg('비밀번호가 올바르지 않습니다');
      } else {
        setJoinMsg(axiosErr.response?.data?.error?.message || '참여에 실패했습니다');
      }
    } finally {
      setJoining(false);
    }
  };

  const formatDate = (d: string) => d?.slice(0, 10) || '';

  return (
    <div style={styles.container}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 12,
        padding: '32px 28px',
        marginBottom: 28,
        color: '#fff',
        position: 'relative' as const,
        overflow: 'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            함께 읽고, 함께 나누는 책 커뮤니티
          </div>
          <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6, maxWidth: 480 }}>
            책을 읽으며 메모를 남기고, 다른 독서가들과 생각을 나눠보세요.
            기록이 토론으로 이어지는 새로운 독서 경험을 시작하세요.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Link to="/community" style={{
              display: 'inline-block',
              padding: '10px 24px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}>
              커뮤니티 둘러보기 →
            </Link>
            <Link to="/groups/new" style={{
              display: 'inline-block',
              padding: '10px 24px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              토론 모임 시작하기
            </Link>
          </div>
        </div>
        <div style={{
          position: 'absolute' as const,
          right: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 80,
          opacity: 0.15,
        }}>
          📖
        </div>
      </div>

      {/* 인기 게시글 미리보기 섹션 */}
      <section style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={styles.sectionTitle}>🔥 인기 게시글</h2>
          <Link to="/community" style={{ fontSize: 13, color: '#667eea', fontWeight: 600, textDecoration: 'none' }}>
            더보기 →
          </Link>
        </div>
        <div style={styles.previewGrid}>
          {/* Placeholder cards - actual data will be connected later */}
          <div style={styles.placeholderCard}>인기 게시글이 여기에 표시됩니다</div>
          <div style={styles.placeholderCard}>인기 게시글이 여기에 표시됩니다</div>
          <div style={styles.placeholderCard}>인기 게시글이 여기에 표시됩니다</div>
        </div>
      </section>

      {/* 인기 책 미리보기 섹션 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>📚 인기 책</h2>
        <div style={styles.previewGrid}>
          {/* Placeholder cards - actual data will be connected later */}
          <div style={styles.placeholderCard}>인기 책이 여기에 표시됩니다</div>
          <div style={styles.placeholderCard}>인기 책이 여기에 표시됩니다</div>
          <div style={styles.placeholderCard}>인기 책이 여기에 표시됩니다</div>
        </div>
</section>

{/* 독서 토론 모임 섹션 (기존 기능 유지) */}
<section style={styles.section}>
  <h2 style={styles.sectionTitle}>💬 독서 토론 모임</h2>

  <form onSubmit={handleSearch} style={styles.searchBar}>
    <input
      type="text"
      style={styles.searchInput}
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="책 제목으로 검색..."
    />
    <button type="submit" style={styles.searchButton}>검색</button>
  </form>

  {loading ? (
    <div style={styles.loading}>불러오는 중...</div>
  ) : !groups || groups.length === 0 ? (
    <div style={styles.emptyState}>
      {searched ? '검색 결과가 없습니다' : '아직 모임이 없습니다. 첫 모임을 만들어보세요!'}
    </div>
  ) : (
    <div style={styles.grid}>
      {groups?.map((g) => (
        <div
          key={g.id}
          style={styles.card}
          onClick={() => handleCardClick(g)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick(g)}
        >
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {g.book?.coverImageUrl && (
              <img
                src={g.book.coverImageUrl}
                alt={g.book.title}
                style={{ width: 80, minHeight: 110, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.bookTitle}>{g.book?.title || '제목 없음'}</div>
              <div style={styles.groupName}>{g.name}</div>
              {g.book?.summary && <div style={styles.summary}>{g.book.summary}</div>}
              {g.description && <div style={{ ...styles.summary, marginBottom: 8 }}>{g.description}</div>}
              <div style={styles.meta}>
                📅 독서 기간: {formatDate(g.readingStartDate)} ~ {formatDate(g.readingEndDate)}<br />
                💬 토론 날짜: {formatDate(g.discussionDate)}<br />
                <span style={styles.members}>👥 {g.currentMembers}/{g.maxMembers}명</span>
                {(g as any).isPrivate && <span style={{ display: 'inline-block', background: '#fefcbf', color: '#975a16', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, marginLeft: 6 }}>🔒 비공개</span>}
              </div>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Group Join Modal */}
      {selectedGroup && (
        <GroupJoinModal
          group={selectedGroup}
          onClose={handleModalClose}
          onJoin={handleJoin}
          joining={joining}
          joinMsg={joinMsg}
        />
      )}
    </div>
  );
}

export default HomePage;
