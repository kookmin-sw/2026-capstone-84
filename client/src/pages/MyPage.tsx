import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mypageApi } from '../api/mypage';
import { aiApi } from '../api/ai';
import { Markdown } from '../components/Markdown';
import { useAuthStore } from '../stores/authStore';
import ReadingStatusTabs from '../components/mypage/ReadingStatusTabs';
import GroupActivitySection from '../components/mypage/GroupActivitySection';
import type { GroupCard, Memo, Discussion, User } from '../types';

function MyPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) navigate('/login');
  }, [accessToken]);

  const [profile, setProfile] = useState<User | null>(null);
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [recommendedGroups, setRecommendedGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [insightGroupId, setInsightGroupId] = useState<string | null>(null);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  // 닉네임 수정 상태
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pRes, gRes, mRes, dRes, recRes] = await Promise.all([
          mypageApi.getProfile().catch(() => ({ data: null })),
          mypageApi.getGroups().catch(() => ({ data: [] })),
          mypageApi.getMemos().catch(() => ({ data: [] })),
          mypageApi.getDiscussions().catch(() => ({ data: [] })),
          mypageApi.getRecommendedGroups().catch(() => ({ data: [] })),
        ]);
        setProfile(pRes.data);
        setGroups(gRes.data);
        setMemos(mRes.data);
        setDiscussions(dRes.data);
        setRecommendedGroups(recRes.data);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCheckNickname = async () => {
    if (!newNickname.trim()) { setNicknameError('닉네임을 입력해주세요'); return; }
    if (newNickname === profile?.nickname) { setNicknameError('현재 닉네임과 동일합니다'); return; }
    setNicknameChecking(true);
    setNicknameError('');
    setNicknameAvailable(null);
    try {
      const res = await mypageApi.checkNickname(newNickname);
      setNicknameAvailable(res.data.available);
      if (!res.data.available) setNicknameError('이미 사용 중인 닉네임입니다');
    } catch { setNicknameError('중복 확인 중 오류가 발생했습니다'); }
    finally { setNicknameChecking(false); }
  };

  const handleSaveNickname = async () => {
    if (!nicknameAvailable) return;
    setNicknameSaving(true);
    try {
      const res = await mypageApi.updateNickname(newNickname);
      setProfile(res.data);
      setEditingNickname(false);
      setNicknameAvailable(null);
      setNewNickname('');
    } catch { setNicknameError('닉네임 변경 중 오류가 발생했습니다'); }
    finally { setNicknameSaving(false); }
  };

  const handleStartEdit = () => {
    setEditingNickname(true);
    setNewNickname(profile?.nickname || '');
    setNicknameAvailable(null);
    setNicknameError('');
  };

  const handleCancelEdit = () => {
    setEditingNickname(false);
    setNewNickname('');
    setNicknameAvailable(null);
    setNicknameError('');
  };

  const handleGenerateInsight = async (groupId: string) => {
    setInsightGroupId(groupId);
    setInsight('');
    setInsightLoading(true);
    try {
      const res = await aiApi.generateInsight(groupId);
      setInsight(res.data.insight);
    } catch {
      alert('AI 요청이 많아 일시적으로 처리할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setInsightGroupId(null);
    } finally { setInsightLoading(false); }
  };

  const formatDate = (d: string) => d?.slice(0, 10) || '';

  const getReadingStatus = (g: any) => {
    const now = new Date();
    const start = new Date(g.readingStartDate);
    const end = new Date(g.readingEndDate);
    const disc = new Date(g.discussionDate);
    if (now < start) return { label: '시작 전', color: '#a0aec0', bg: '#f7fafc' };
    if (now <= end) return { label: '독서 중', color: '#38a169', bg: '#f0fff4' };
    if (now <= disc) return { label: '토론 준비', color: '#d69e2e', bg: '#fffff0' };
    return { label: '완료', color: '#718096', bg: '#f7fafc' };
  };

  if (loading) return <div style={s.loading}>불러오는 중...</div>;

  return (
    <div style={s.container}>
      <Link to="/" style={s.backLink}>← 홈으로</Link>

      {/* 프로필 섹션 */}
      {profile && (
        <div style={s.profileCard}>
          <div style={s.profileTop}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#f0f0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '3px solid #e2e8f0' }}>
              {(profile as any).profileImageUrl ? (
                <img src={(profile as any).profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 22, color: '#a0aec0', fontWeight: 700 }}>{profile.nickname.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={s.nickname}>{profile.nickname}</div>
              <div style={s.email}>{profile.email}</div>
            </div>
            <button style={s.logoutBtn} onClick={handleLogout}>로그아웃</button>
            <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: 4 }} title="설정">⚙️</button>
          </div>
          <div style={s.statRow}>
            <div style={s.statItem}><div style={s.statNum}>{groups.length}</div><div style={s.statLabel}>참여 모임</div></div>
            <div style={s.statItem}><div style={s.statNum}>{groups.filter((g: any) => g.role === 'owner').length}</div><div style={s.statLabel}>주관 모임</div></div>
            <div style={s.statItem}><div style={s.statNum}>{formatDate(profile.createdAt || '')}</div><div style={s.statLabel}>가입일</div></div>
          </div>
        </div>
      )}

      {/* 내 독서 클럽 */}
      <div>
        {groups.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
            <div>참여 중인 모임이 없습니다</div>
            <Link to="/" style={{ color: '#667eea', marginTop: 8, display: 'inline-block' }}>모임 둘러보기 →</Link>
          </div>
        ) : (
          <div style={s.clubGrid}>
            {groups.map((g: any) => {
              const status = getReadingStatus(g);
              return (
                <div key={g.id}>
                  <div
                    style={s.clubCard}
                    onClick={() => navigate(`/groups/${g.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/groups/${g.id}`)}
                  >
                    <div style={s.clubCover}>
                      {g.book?.coverImageUrl ? (
                        <img src={g.book.coverImageUrl} alt="" style={s.clubCoverImg} />
                      ) : (
                        <div style={s.clubCoverPlaceholder}>📖</div>
                      )}
                    </div>
                    <div style={s.clubInfo}>
                      <div style={s.clubBookTitle}>{g.book?.title || '제목 없음'}</div>
                      <div style={s.clubName}>{g.name}</div>
                      <div style={{ ...s.statusBadge, color: status.color, backgroundColor: status.bg }}>{status.label}</div>
                      <div style={s.progressRow}>
                        <div style={s.progressBar}>
                          <div style={{ ...s.progressFill, width: `${Math.min(g.readingProgress || 0, 100)}%` }} />
                        </div>
                        <span style={s.progressText}>p.{g.readingProgress || 0}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <div style={s.clubMeta}>
                          👥 {g.memberCount || g.currentMembers || 0}/{g.maxMembers}명
                          {g.role === 'owner' && <span style={s.ownerBadge}>방장</span>}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleGenerateInsight(g.id); }}
                          style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', backgroundColor: '#805ad5', color: '#fff', border: 'none', borderRadius: 6 }}
                        >🤖 회고</button>
                      </div>
                    </div>
                  </div>
                  {insightGroupId === g.id && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#faf5ff', borderRadius: 6, marginBottom: 8 }}>
                      {insightLoading ? <div style={{ fontSize: 14, color: '#805ad5' }}>🤖 인사이트 생성 중...</div> : <Markdown content={insight} />}
                      {!insightLoading && insight && (
                        <button onClick={() => { setInsightGroupId(null); setInsight(''); }} style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#805ad5', background: 'none', border: 'none', cursor: 'pointer' }}>닫기</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 추천 모임 */}
      {recommendedGroups.length > 0 && (
        <div style={{ ...s.section, marginTop: 20 }}>
          <div style={s.sectionTitle}>✨ 추천 모임</div>
          <div style={{ fontSize: 13, color: '#718096', marginBottom: 12 }}>참여한 모임의 책 정보를 기반으로 비슷한 모임을 추천합니다.</div>
          {recommendedGroups.map((g) => (
            <div key={g.id} style={s.listItem} onClick={() => navigate(`/groups/${g.id}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/groups/${g.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {g.book.coverImageUrl && <img src={g.book.coverImageUrl} alt="" style={{ width: 36, height: 52, objectFit: 'contain', borderRadius: 2, flexShrink: 0 }} />}
                <div>
                  <div style={s.listItemTitle}>
                    {g.book.title} — {g.name}
                    {g.score > 0 && (() => {
                      const label = g.score >= 5 ? '높음' : g.score >= 2 ? '보통' : '낮음';
                      const color = g.score >= 5 ? '#276749' : g.score >= 2 ? '#2b6cb0' : '#718096';
                      const bg = g.score >= 5 ? '#f0fff4' : g.score >= 2 ? '#ebf8ff' : '#f7fafc';
                      return <span style={{ display: 'inline-block', backgroundColor: bg, color, padding: '1px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, marginLeft: 8 }}>유사도 {label}</span>;
                    })()}
                  </div>
                  <div style={s.listItemMeta}>{g.book.author && `${g.book.author} · `}👥 {g.currentMembers}/{g.maxMembers}명 · 📅 {formatDate(g.readingStartDate)} ~ {formatDate(g.readingEndDate)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 작성 메모 */}
      {memos.length > 0 && (
        <div style={{ ...s.section, marginTop: 16 }}>
          <div style={s.sectionTitle}>📝 작성 메모 ({memos.length})</div>
          {memos.map((m) => (
            <div key={m.id} style={s.listItem} onClick={() => navigate(`/groups/${m.groupId}/memos`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/groups/${m.groupId}/memos`)}>
              <div style={s.listItemTitle}>
                {(m as any).bookTitle && <span style={{ color: '#667eea', marginRight: 6 }}>{(m as any).bookTitle}</span>}
                p.{m.pageStart}~{m.pageEnd}: {m.content.slice(0, 60)}{m.content.length > 60 ? '...' : ''}
              </div>
              <div style={s.listItemMeta}>{m.isPublic ? '공개' : '비공개'} · {new Date(m.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* 참여 토론 */}
      {discussions.length > 0 && (
        <div style={{ ...s.section, marginTop: 16 }}>
          <div style={s.sectionTitle}>💬 참여 토론 ({discussions.length})</div>
          {discussions.map((d) => (
            <div key={d.id} style={s.listItem} onClick={() => navigate(`/discussions/${d.id}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/discussions/${d.id}`)}>
              <div style={s.listItemTitle}>
                {(d as any).bookTitle && <span style={{ color: '#667eea', marginRight: 6 }}>{(d as any).bookTitle}</span>}
                {d.title}
              </div>
              <div style={s.listItemMeta}>{d.authorNickname} · {new Date(d.createdAt).toLocaleDateString()}{d.isRecommended && ' · ✨ 추천'}</div>
            </div>
          ))}
        </div>
      )}

      {/* 독서 상태 관리 */}
      <ReadingStatusTabs />

      {/* 독서토론 그룹 활동 */}
      <GroupActivitySection groups={groups} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 800, margin: '0 auto', padding: '24px 16px' },
  backLink: { display: 'inline-block', marginBottom: 16, fontSize: 14, color: '#667eea', fontWeight: 500, textDecoration: 'none' },
  loading: { textAlign: 'center', padding: '60px 20px', color: '#a0aec0' },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: 20, border: '1px solid #f0f0f5' },
  profileTop: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatar: { width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 700, flexShrink: 0 },
  nickname: { fontSize: 20, fontWeight: 800, color: '#1a202c', letterSpacing: '-0.3px' },
  email: { fontSize: 13, color: '#718096', marginTop: 2 },
  logoutBtn: { padding: '8px 16px', background: 'none', color: '#e53e3e', border: '1px solid #fed7d7', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  statRow: { display: 'flex', gap: 0, borderTop: '1px solid #f0f0f5', paddingTop: 16 },
  statItem: { flex: 1, textAlign: 'center' as const },
  statNum: { fontSize: 18, fontWeight: 700, color: '#2d3748' },
  statLabel: { fontSize: 12, color: '#a0aec0', marginTop: 2 },
  clubGrid: { display: 'flex', flexDirection: 'column' as const, gap: 12 },
  clubCard: { display: 'flex', gap: 14, backgroundColor: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.05)', border: '1px solid #f0f0f5', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' },
  clubCover: { width: 64, height: 90, borderRadius: 6, overflow: 'hidden', flexShrink: 0, backgroundColor: '#f7f8fc' },
  clubCoverImg: { width: '100%', height: '100%', objectFit: 'contain' as const },
  clubCoverPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 },
  clubInfo: { flex: 1, minWidth: 0 },
  clubBookTitle: { fontSize: 15, fontWeight: 700, color: '#1a202c', marginBottom: 2, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  clubName: { fontSize: 13, color: '#667eea', fontWeight: 600, marginBottom: 8 },
  statusBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, marginBottom: 8 },
  progressRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#edf2f7', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #667eea, #764ba2)', borderRadius: 3, transition: 'width 0.3s' },
  progressText: { fontSize: 11, color: '#a0aec0', whiteSpace: 'nowrap' as const },
  clubMeta: { fontSize: 12, color: '#a0aec0' },
  ownerBadge: { display: 'inline-block', backgroundColor: '#fefcbf', color: '#975a16', padding: '1px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, marginLeft: 8 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f5' },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#2d3748' },
  listItem: { padding: '12px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: 14, color: '#4a5568' },
  listItemTitle: { fontWeight: 600, color: '#1a202c', marginBottom: 3 },
  listItemMeta: { fontSize: 12, color: '#a0aec0' },
  emptyState: { textAlign: 'center' as const, padding: '40px 20px', color: '#a0aec0', fontSize: 14, backgroundColor: '#fff', borderRadius: 12, border: '1px solid #f0f0f5' },
};

export default MyPage;
