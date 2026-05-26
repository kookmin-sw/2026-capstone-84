import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import { useAuthStore } from '../stores/authStore';
import type { GroupCard, ApiError } from '../types';
import { AxiosError } from 'axios';
import GroupJoinModal from '../components/GroupJoinModal';
import GroupTags from '../components/GroupTags';
import NotificationBell from '../components/NotificationBell';
import RankingBanner from '../components/RankingBanner';

type SearchType = 'bookTitle' | 'groupName' | 'owner' | 'tag' | 'bookAuthor';
type SortOption = 'createdDesc' | 'createdAsc' | 'startDesc' | 'startAsc' | 'endDesc' | 'endAsc';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: '-0.5px',
  },
  nav: {
    display: 'flex',
    gap: 10,
  },
  navLink: {
    padding: '9px 20px',
    backgroundColor: '#4E342E',
    color: '#fff',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(78,52,46,0.3)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  navLinkSecondary: {
    padding: '9px 12px',
    backgroundColor: '#FDF8F0',
    color: '#4E342E',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    border: '1px solid #E8DFD3',
    transition: 'background-color 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    height: 40,
    boxSizing: 'border-box' as const,
  },
  searchBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 28,
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    border: '2px solid #E8DFD3',
    borderRadius: 10,
    boxSizing: 'border-box' as const,
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  searchSelect: {
    width: 120,
    padding: '12px 14px',
    fontSize: 14,
    border: '2px solid #E8DFD3',
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#3D2E1E',
    boxSizing: 'border-box' as const,
    outline: 'none',
    cursor: 'pointer',
    height: 46,
  },
  searchButton: {
    padding: '12px 24px',
    backgroundColor: '#4E342E',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(78,52,46,0.25)',
    transition: 'transform 0.15s',
  },
  sortBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: -16,
    marginBottom: 24,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: '#8B7355',
  },
  sortSelect: {
    width: 176,
    padding: '12px 12px',
    fontSize: 13,
    border: '2px solid #E8DFD3',
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#3D2E1E',
    boxSizing: 'border-box' as const,
    outline: 'none',
    cursor: 'pointer',
    height: 46,
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
    border: '1px solid #E8DFD3',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  bookTitle: {
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 4,
    color: '#3D2E1E',
    letterSpacing: '-0.3px',
  },
  groupName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#C8962E',
    marginBottom: 8,
  },
  summary: {
    fontSize: 13,
    color: '#8B7355',
    marginBottom: 12,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as any,
    overflow: 'hidden',
  },
  meta: {
    fontSize: 12,
    color: '#8B7355',
    lineHeight: 1.6,
  },
  members: {
    display: 'inline-block',
    backgroundColor: '#FFF8E7',
    color: '#C8962E',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#8B7355',
    fontSize: 15,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#8B7355',
    fontSize: 15,
  },
};

function HomePage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!accessToken;

  // 현재 사용자 ID 추출
  let currentUserId = user?.id || '';
  if (!currentUserId && accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1] || ''));
      currentUserId = payload.userId || '';
    } catch { /* ignore */ }
  }
  // 초기값을 반드시 빈 배열 []로 설정하여 map 에러 방지
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [search, setSearch] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('bookTitle');
  const [sort, setSort] = useState<SortOption>('createdDesc');
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [, setBeeFirstLoad] = useState(true);
  const [typedText, setTypedText] = useState('');
  const fullText = '"기억하는 것 자체가 저항이다"';

  // Modal state
  const [selectedGroup, setSelectedGroup] = useState<GroupCard | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');

  const fetchGroups = async (
    query?: string,
    type: SearchType = searchType,
    sortOption: SortOption = sort,
  ) => {
    setLoading(true);
    try {
      const params = {
        ...(query ? { search: query, searchType: type } : {}),
        sort: sortOption,
        limit: 30,
      };
      const response = await groupsApi.list(params);
      // API 응답 구조에 따라 데이터가 없을 경우 빈 배열을 기본값으로 사용
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

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % 2);
      setBeeFirstLoad(false);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setTypedText('');
    if (bannerIndex !== 1) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [bannerIndex]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearched(!!search.trim());
    fetchGroups(search.trim() || undefined, searchType, sort);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (!value.trim() && searched) {
      setSearched(false);
      fetchGroups(undefined, searchType, sort);
    }
  };

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    if (searched && search.trim()) {
      fetchGroups(search.trim(), type, sort);
    }
  };

  const handleSortChange = (value: SortOption) => {
    setSort(value);
    fetchGroups(search.trim() || undefined, searchType, value);
  };

  const handleCardClick = (group: GroupCard) => {
    // 이미 참여 중이거나 본인이 생성한 모임이면 바로 상세 페이지로 이동
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
      // 참여 성공 시 잠시 후 상세 페이지로 이동
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
  const visibleGroups = isLoggedIn && !searched
    ? groups.filter(g => !(g.isMember || g.ownerId === currentUserId) && g.currentMembers < g.maxMembers)
    : groups;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => { setSearch(''); setSearchType('bookTitle'); setSort('createdDesc'); setSearched(false); fetchGroups(undefined, 'bookTitle', 'createdDesc'); }}>
          <h1 className="site-title" style={styles.title}><img src="/favicon.svg" alt="" style={{ width: 28, height: 28, verticalAlign: 'middle', marginRight: 6 }} />버지페이지</h1>
        </Link>
        <div style={styles.nav}>
          {isLoggedIn ? (
            <>
              <NotificationBell />
              <Link to="/mypage" style={styles.navLinkSecondary}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E342E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>마이페이지</Link>
            </>
          ) : (
            <Link to="/login" style={styles.navLink}>로그인</Link>
          )}
        </div>
      </div>

      {/* Hero Banner Slider */}
      <div style={{ borderRadius: 12, marginBottom: 24, overflow: 'hidden', position: 'relative' as const }}>
            <div style={{ display: 'flex', transition: 'transform 0.6s ease', transform: `translateX(-${bannerIndex * 100}%)` }}>
              {/* 배너 1: 메인 */}
              <div style={{
                minWidth: '100%',
                backgroundColor: '#2C2016',
                padding: '32px 70px 32px 50px',
                color: '#fff',
                position: 'relative' as const,
                boxSizing: 'border-box' as const,
              }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <svg width="42" height="12" viewBox="0 0 42 12"><polygon points="6,0 12,3 12,9 6,12 0,9 0,3" fill="#C8962E"/><polygon points="20,0 26,3 26,9 20,12 14,9 14,3" fill="#C8962E"/><polygon points="34,0 40,3 40,9 34,12 28,9 28,3" fill="#C8962E"/></svg>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>독서 모임 플랫폼</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>같은 책,</div>
                  <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 12, lineHeight: 1.3 }}><span style={{ color: '#C8962E' }}>다른 생각</span>을 나누다</div>
                  <div style={{ fontSize: 14, opacity: 0.6, lineHeight: 1.6, maxWidth: 480 }}>메모하고, 모임을 만들고,<br />독서가 더 깊어지는 경험.</div>
                  <Link to="/groups/new" className="hero-btn" style={{ display: 'inline-block', marginTop: 20, padding: '10px 24px', backgroundColor: 'transparent', color: '#fff', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid #FDF8F0' }}>모임 시작하기 →</Link>
                </div>
                <div style={{ position: 'absolute' as const, right: 30, top: '50%', transform: 'translateY(-50%)', opacity: 0.8 }}>
                  <svg key={`hex-anim-${bannerIndex}`} width="182" height="150" viewBox="0 0 182 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* pointy-top hexagons, side=30, w=52, h=60. 변 맞닿음 */}
                    {/* 행1: 2개 */}
                    <polygon className="hex-top" points="52,0 78,15 78,45 52,60 26,45 26,15" fill="rgba(200,150,46,0.15)" stroke="rgba(200,150,46,0.5)" strokeWidth="1.5"/>
                    <polygon className="hex-right" points="104,0 130,15 130,45 104,60 78,45 78,15" fill="rgba(200,150,46,0.15)" stroke="rgba(200,150,46,0.5)" strokeWidth="1.5"/>
                    {/* 행2: 3개 */}
                    <polygon className="hex-left" points="26,45 52,60 52,90 26,105 0,90 0,60" fill="rgba(200,150,46,0.15)" stroke="rgba(200,150,46,0.5)" strokeWidth="1.5"/>
                    <polygon className="hex-center" points="78,45 104,60 104,90 78,105 52,90 52,60" fill="rgba(200,150,46,0.15)" stroke="rgba(200,150,46,0.5)" strokeWidth="1.5"/>
                    <polygon className="hex-right" points="130,45 156,60 156,90 130,105 104,90 104,60" fill="rgba(200,150,46,0.15)" stroke="rgba(200,150,46,0.5)" strokeWidth="1.5"/>
                    {/* 행3: 2개 */}
                    <polygon className="hex-bottom" points="52,90 78,105 78,135 52,150 26,135 26,105" fill="rgba(200,150,46,0.15)" stroke="rgba(200,150,46,0.5)" strokeWidth="1.5"/>
                    <polygon className="hex-bottom" points="104,90 130,105 130,135 104,150 78,135 78,105" fill="rgba(200,150,46,0.15)" stroke="rgba(200,150,46,0.5)" strokeWidth="1.5"/>
                  </svg>
                  <img key={`bee-${bannerIndex}`} className="hex-bee-first" src="/favicon.svg" alt="" style={{ position: 'absolute', width: 48, height: 48, top: '50%', left: '50%', marginTop: -24, marginLeft: -24 }} />
                </div>
              </div>

              {/* 배너 2: AI 회고 광고 */}
              <div style={{
                minWidth: '100%',
                backgroundColor: '#1a1a2e',
                padding: '32px 50px',
                color: '#fff',
                position: 'relative' as const,
                boxSizing: 'border-box' as const,
                display: 'flex',
                gap: 40,
                alignItems: 'center',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>● AI 회고 기능</div>
                  <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.4, marginBottom: 8 }}>나눈 대화,<br /><span style={{ color: '#ffd54f' }}>사라지지 않게</span> 정리해드려요</div>
                  <div style={{ fontSize: 14, opacity: 0.5, lineHeight: 1.6 }}>모임이 끝나도 괜찮아요.<br />AI가 대화를 읽고 핵심만 꼭 붙잡아 둘게요.</div>
                </div>
                <div style={{ width: 260, background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', borderRadius: 16, padding: '20px 18px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(102,126,234,0.15)' }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 2, opacity: 0.5, marginBottom: 6 }}>READING INSIGHT</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>소년이 온다</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, padding: '8px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: 8, borderLeft: '3px solid #C8962E', marginBottom: 12, width: '100%', boxSizing: 'border-box' as const, minHeight: 36 }}>
                      {typedText}<span className="typing-caret" />
                    </div>
                    <div key={`pop-${bannerIndex}`} className="summary-pop" style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 10 }}>
                      폭력 앞의 침묵과 저항에 대해 깊이 논의함
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 10 }}>
                      {['침묵', '저항', '기억', '생존'].map(kw => (
                        <span key={kw} style={{ padding: '2px 8px', background: 'rgba(102,126,234,0.25)', borderRadius: 12, fontSize: 10, fontWeight: 500 }}>#{kw}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, opacity: 0.5, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <span>📝 5개</span>
                      <span>💬 3개</span>
                      <span>🗨️ 12개</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 슬라이드 화살표 */}
            <button onClick={() => setBannerIndex(prev => (prev - 1 + 2) % 2)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }} aria-label="이전">‹</button>
            <button onClick={() => setBannerIndex(prev => (prev + 1) % 2)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }} aria-label="다음">›</button>

            {/* 슬라이드 인디케이터 */}
            <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: bannerIndex === 0 ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'background-color 0.3s' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: bannerIndex === 1 ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'background-color 0.3s' }} />
            </div>
      </div>
      <RankingBanner />

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
        <select
          value={searchType}
          onChange={(e) => handleSearchTypeChange(e.target.value as SearchType)}
          style={styles.searchSelect}
          aria-label="검색 기준"
        >
          <option value="bookTitle">책 제목</option>
          <option value="groupName">모임명</option>
          <option value="tag">태그</option>
          <option value="owner">모임장</option>
          <option value="bookAuthor">글쓴이</option>
        </select>
        <div style={{ flex: 1, position: 'relative' as const }}>
          <input
            type="text"
            style={{ ...styles.searchInput, paddingRight: 36 }}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="검색어를 입력하세요..."
          />
          <button type="submit" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="검색">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
        <select
          value={sort}
          onChange={(e) => handleSortChange(e.target.value as SortOption)}
          style={styles.sortSelect}
          aria-label="모임 정렬"
        >
          <option value="createdDesc">새로 만든 순</option>
          <option value="createdAsc">먼저 만든 순</option>
          <option value="startAsc">시작일 빠른순</option>
          <option value="startDesc">시작일 늦은순</option>
          <option value="endAsc">마감일 빠른순</option>
          <option value="endDesc">마감일 늦은순</option>
        </select>
      </form>

      {/* 내 모임 — 가로 스크롤 */}
      {isLoggedIn && !searched && groups.filter(g => g.isMember || g.ownerId === currentUserId).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3D2E1E', marginBottom: 12 }}>📖 내 모임</div>
          <div style={{
            display: 'flex',
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 8,
            scrollbarWidth: 'thin' as any,
          }}>
            {groups.filter(g => g.isMember || g.ownerId === currentUserId).map(g => (
              <div
                key={g.id}
                style={{
                  minWidth: 220,
                  maxWidth: 220,
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  border: '2px solid #C8962E',
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}
                onClick={() => navigate(`/groups/${g.id}`)}
              >
                {g.book?.coverImageUrl && (
                  <img src={g.book.coverImageUrl} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                )}
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#3D2E1E', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {g.book?.title || '제목 없음'}
                  </div>
                  <div style={{ fontSize: 12, color: '#C8962E', fontWeight: 600, marginBottom: 4 }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: '#8B7355' }}>
                    👥 {g.currentMembers}/{g.maxMembers}명
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체 모임 */}
      {!searched && isLoggedIn && visibleGroups.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#3D2E1E' }}>🌐 전체 모임</span>
          <button onClick={() => navigate('/groups/new')} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, backgroundColor: '#4E342E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ 모임생성</button>
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>불러오는 중...</div>
      ) : !groups || groups.length === 0 ? (
        <div style={styles.emptyState}>
          {searched ? '검색 결과가 없습니다' : '아직 모임이 없습니다. 첫 모임을 만들어보세요!'}
        </div>
      ) : (
        <div style={styles.grid}>
          {/* 옵셔널 체이닝 ?. 을 추가하여 안전하게 렌더링 */}
          {visibleGroups?.map((g) => (
            <div
              key={g.id}
              className="group-card"
              style={styles.card}
              onClick={() => handleCardClick(g)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleCardClick(g)}
            >
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
                {g.book?.coverImageUrl && (
                  <img
                    src={g.book.coverImageUrl}
                    alt={g.book.title}
                    style={{ width: 80, minHeight: 110, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' as const }}>
                  <div style={{ ...styles.bookTitle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{g.book?.title || '제목 없음'}</div>
                  <div style={{ ...styles.groupName, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, marginBottom: 2 }}>{g.name}</div>
                  <div style={{ height: 20, overflow: 'hidden', marginBottom: 2 }}>
                    {g.tags && g.tags.length > 0 && <GroupTags tags={g.tags} compact />}
                  </div>
                  <div style={{ height: 34, overflow: 'hidden', marginBottom: 4, fontSize: 13, color: '#8B7355', lineHeight: '17px' }}>
                    {g.description || '\u00A0'}
                  </div>
                  <div>
                  <div style={styles.meta}>
                    <div style={{ marginBottom: 6 }}>📅 독서 기간: {formatDate(g.readingStartDate)} ~ {formatDate(g.readingEndDate)}</div>
                    <div>
                    {g.ownerNickname && <span style={{ display: 'inline-block', background: '#FFF8E7', color: '#C8962E', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, marginRight: 6 }}>👤 {g.ownerNickname}</span>}
                    <span style={styles.members}>👥 {g.currentMembers}/{g.maxMembers}명</span>
                    {(g as any).isPrivate && <span style={{ display: 'inline-block', background: '#fefcbf', color: '#975a16', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, marginLeft: 6 }}>🔒 비공개</span>}
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
