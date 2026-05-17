import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { mypageApi } from '../api/mypage';
import { aiApi } from '../api/ai';
import { notificationsApi } from '../api/notifications';
import { rankingApi } from '../api/ranking';
import { InsightCard } from '../components/InsightCard';
import { useAuthStore } from '../stores/authStore';
import type { GroupCard, Memo, Discussion, User } from '../types';

function MyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const logout = useAuthStore((s) => s.logout);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!accessToken) navigate('/login');
  }, [accessToken]);

  const [profile, setProfile] = useState<User | null>(null);
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [recommendedGroups, setRecommendedGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuests, setShowQuests] = useState(searchParams.get('showQuests') === 'true');
  const [questData, setQuestData] = useState<any>(null);
  const [insightGroupId, setInsightGroupId] = useState<string | null>(null);
  const [insight, setInsight] = useState<any>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [generatedGroups, setGeneratedGroups] = useState<Set<string>>(new Set());
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [groupTab, setGroupTab] = useState<'all' | 'joined' | 'owned'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'before' | 'reading' | 'ended'>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'recent'>('deadline');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pRes, gRes, mRes, dRes, recRes, insightsRes, unreadRes] = await Promise.all([
          mypageApi.getProfile().catch(() => ({ data: null })),
          mypageApi.getGroups().catch(() => ({ data: [] })),
          mypageApi.getMemos().catch(() => ({ data: [] })),
          mypageApi.getDiscussions().catch(() => ({ data: [] })),
          mypageApi.getRecommendedGroups().catch(() => ({ data: [] })),
          aiApi.getMyInsights().catch(() => ({ data: [] })),
          notificationsApi.getUnreadCount().catch(() => ({ data: { count: 0 } })),
        ]);
        setProfile(pRes.data);
        if (pRes.data) setUser(pRes.data);
        setGroups(gRes.data);
        setMemos(mRes.data);
        setDiscussions(dRes.data);
        setRecommendedGroups(recRes.data);
        // 이미 인사이트가 생성된 모임 ID 추적
        const existingIds = new Set<string>((insightsRes.data || []).map((i: any) => i.groupId));
        setGeneratedGroups(existingIds);
        setUnreadNotifications(unreadRes.data.count);

        // 내 랭킹 조회
        if (pRes.data) {
          rankingApi.getAll(50).then(res => {
            const me = res.data.find((r: any) => r.id === pRes.data!.id);
            if (me) setMyRank(me.rank);
          }).catch(() => {});
        }
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

  useEffect(() => {
    if (showQuests && !questData) {
      mypageApi.getDailyQuests().then(res => setQuestData(res.data)).catch(() => {});
    }
  }, [showQuests]);

  const handleGenerateInsight = async (groupId: string) => {
    setInsightGroupId(groupId);
    setInsight(null);
    setInsightLoading(true);
    try {
      const res = await aiApi.generateAndSaveInsight(groupId);
      setInsight(res.data);
      setGeneratedGroups(prev => new Set(prev).add(groupId));
    } catch {
      alert('AI 요청이 많아 일시적으로 처리할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setInsightGroupId(null);
    } finally { setInsightLoading(false); }
  };

  const handleToggleInsight = async (groupId: string) => {
    // 이미 열려있으면 접기
    if (insightGroupId === groupId && insight) {
      setInsightGroupId(null);
      setInsight(null);
      return;
    }
    // 저장된 인사이트 열기
    setInsightGroupId(groupId);
    setInsight(null);
    setInsightLoading(true);
    try {
      const existing = await aiApi.getSavedInsight(groupId);
      if (existing.data) {
        setInsight(existing.data);
      }
    } catch { /* ignore */ }
    finally { setInsightLoading(false); }
  };

  const formatDate = (d: string) => d?.slice(0, 10) || '';

  const getReadingStatus = (g: any) => {
    const now = new Date();
    const start = new Date(g.readingStartDate);
    const end = new Date(g.readingEndDate);
    if (now < start) return { label: '시작 전', color: '#a0aec0', bg: '#f7fafc' };
    if (now <= end) return { label: '독서 중', color: '#38a169', bg: '#f0fff4' };
    return { label: '완료', color: '#718096', bg: '#f7fafc' };
  };

  if (loading) return <div style={s.loading}>불러오는 중...</div>;

  return (
    <div style={s.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="site-title" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', color: '#3D2E1E' }}><img src="/favicon.svg" alt="" style={{ width: 24, height: 24, verticalAlign: 'middle', marginRight: 6 }} />버지페이지</span>
        </Link>
        <button type="button" onClick={() => navigate('/notifications')} style={s.notificationBtn}>
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E342E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>알림 보기</span>
          {unreadNotifications > 0 && <span style={s.notificationCount}>읽지 않음 {unreadNotifications}</span>}
        </button>
      </div>

      {/* 프로필 섹션 */}
      {profile && (
        <div style={s.profileCard}>
          <div style={s.profileTop}>
            <div style={{ position: 'relative' as const, flexShrink: 0 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', backgroundColor: '#E8DFD3', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${myRank === 1 ? '#FFD700' : myRank === 2 ? '#C0C0C0' : myRank === 3 ? '#CD7F32' : '#E8DFD3'}` }}>
                {(profile as any).profileImageUrl ? (
                  <img src={(profile as any).profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 22, color: '#a0aec0', fontWeight: 700 }}>{profile.nickname.charAt(0).toUpperCase()}</span>
              )}
              </div>
              {myRank && myRank <= 3 && (
                <span style={{ position: 'absolute', bottom: -2, right: -2, fontSize: 16 }}>
                  {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : '🥉'}
                </span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={s.nickname}>{profile.nickname}</div>
                {(profile as any).grade && (
                  <span style={{ fontSize: 14 }} title={`${(profile as any).grade.name} (${(profile as any).activityScore}점)`}>
                    {(profile as any).grade.emoji}
                  </span>
                )}
              </div>
              <div style={s.email}>{profile.email}</div>
            </div>
            <button onClick={() => setShowQuests(!showQuests)} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: showQuests ? '#C8962E' : '#FFF8E7', border: '2px solid #E8DFD3', cursor: 'pointer', transition: 'all 0.2s' }} title="일일 퀘스트">🎯</button>
            <button style={s.logoutBtn} onClick={handleLogout}>로그아웃</button>
            <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: 4 }} title="설정">⚙️</button>
          </div>
          <div style={s.statRow}>
            <div style={{ ...s.statItem, cursor: 'pointer', borderBottom: groupTab === 'joined' ? '2px solid #C8962E' : '2px solid transparent' }} onClick={() => setGroupTab(groupTab === 'joined' ? 'all' : 'joined')}><div style={s.statNum}>{groups.length}</div><div style={s.statLabel}>참여 모임</div></div>
            <div style={{ ...s.statItem, cursor: 'pointer', borderBottom: groupTab === 'owned' ? '2px solid #C8962E' : '2px solid transparent' }} onClick={() => setGroupTab(groupTab === 'owned' ? 'all' : 'owned')}><div style={s.statNum}>{groups.filter((g: any) => g.role === 'owner').length}</div><div style={s.statLabel}>주관 모임</div></div>
          </div>
        </div>
      )}

      {/* 일일 퀘스트 패널 */}
      {showQuests && questData && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #E8DFD3', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#4E342E' }}>🎯 일일 퀘스트</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#C8962E' }}>
              {questData.grade?.emoji} {questData.grade?.name} · {questData.score}점
              {questData.nextGrade && <span style={{ color: '#a0aec0', marginLeft: 4 }}>→ {questData.nextGrade.emoji} {questData.nextGrade.name}까지 {questData.nextGrade.pointsNeeded}점 남음</span>}
              <span style={{ position: 'relative', display: 'inline-block', cursor: 'help' }}
                onMouseEnter={e => { const tip = e.currentTarget.querySelector('[data-tip]') as HTMLElement; if (tip) tip.style.display = 'block'; }}
                onMouseLeave={e => { const tip = e.currentTarget.querySelector('[data-tip]') as HTMLElement; if (tip) tip.style.display = 'none'; }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', backgroundColor: '#E8DFD3', color: '#5C4A32', fontSize: 11, fontWeight: 700 }}>!</span>
                <span data-tip="" style={{ display: 'none', position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#3D2E1E', color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 12, lineHeight: 1.6, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10 }}>
                  🌱 새싹 (0~19점): 발언권 10개<br/>📖 독서가 (20~49점): 발언권 13개<br/>💬 전문가 (50~99점): 발언권 16개<br/>⭐ 마스터 (100점+): 발언권 20개
                </span>
              </span>
            </div>
          </div>
          {questData.quests?.map((q: any) => (
            <div key={q.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #FDF8F0' }}>
              <span style={{ fontSize: 14, color: q.done ? '#38a169' : '#5C4A32' }}>
                {q.done ? '✅' : '⬜'} {q.label}
              </span>
              <span style={{ fontSize: 12, color: q.done ? '#38a169' : '#a0aec0' }}>
                {q.done ? '+1' : '0'}/1
              </span>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 12, color: '#a0aec0', textAlign: 'center' as const }}>
            오늘 획득: {questData.quests?.filter((q: any) => q.done).length || 0}/5점 · 매일 00:00 초기화
          </div>
        </div>
      )}

      {!profile && (
        <div style={s.profileCard}>
          <div style={s.profileTop}>
            <div style={{ flex: 1 }}>
              <div style={s.nickname}>로그인 정보를 확인할 수 없습니다</div>
              <div style={s.email}>다시 로그인해주세요.</div>
            </div>
            <button style={s.logoutBtn} onClick={handleLogout}>로그아웃</button>
          </div>
        </div>
      )}

      {/* 내 독서 클럽 */}
      <div>
        {/* 상태 필터 탭 */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E8DFD3', marginBottom: 12, alignItems: 'center' }}>
          {([['all', '전체'], ['reading', '진행중'], ['before', '시작 전'], ['ended', '종료']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: statusFilter === key ? 600 : 400, cursor: 'pointer', border: 'none', background: 'none', color: statusFilter === key ? '#C8962E' : '#718096', borderBottom: statusFilter === key ? '2px solid #C8962E' : '2px solid transparent', marginBottom: -2 }}
            >{label}</button>
          ))}
        </div>

        {/* 정렬 + 모임생성 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'deadline' | 'recent')}
            style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4 }}
          >
            <option value="deadline">마감기한 순</option>
            <option value="recent">최근 가입순</option>
          </select>
          <button onClick={() => navigate('/groups/new')} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, backgroundColor: '#4E342E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>+ 모임생성</button>
        </div>

        {(() => {
          let filtered = [...groups] as any[];
          // 탭 필터
          if (groupTab === 'owned') filtered = filtered.filter((g: any) => g.role === 'owner');
          if (groupTab === 'joined') filtered = filtered.filter((g: any) => g.role !== 'owner');
          // 상태 필터
          if (statusFilter !== 'all') {
            filtered = filtered.filter((g: any) => {
              const now = new Date();
              const start = new Date(g.readingStartDate);
              const end = new Date(g.readingEndDate);
              if (statusFilter === 'before') return now < start;
              if (statusFilter === 'reading') return now >= start && now <= end;
              if (statusFilter === 'ended') return now > end;
              return true;
            });
          }
          // 정렬
          filtered.sort((a: any, b: any) => {
            if (sortBy === 'deadline') return new Date(a.readingEndDate).getTime() - new Date(b.readingEndDate).getTime();
            return new Date(b.joinedAt || b.createdAt).getTime() - new Date(a.joinedAt || a.createdAt).getTime();
          });

          if (filtered.length === 0) {
            return (
              <div style={s.emptyState}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
                <div>{statusFilter === 'all' && groupTab === 'all' ? '참여 중인 모임이 없습니다' : '해당하는 모임이 없습니다'}</div>
                <Link to="/" style={{ color: '#C8962E', marginTop: 8, display: 'inline-block' }}>모임 둘러보기 →</Link>
              </div>
            );
          }

          return (
            <div style={s.clubGrid}>
              {filtered.map((g: any) => {
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
                        <div style={{ display: 'flex', gap: 4 }}>
                          {generatedGroups.has(g.id) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleInsight(g.id); }}
                              style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', backgroundColor: insightGroupId === g.id ? '#E8DFD3' : '#f7fafc', color: '#5C4A32', border: '1px solid #E8DFD3', borderRadius: 6 }}
                            >{insightGroupId === g.id ? '접기' : '열기'}</button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleGenerateInsight(g.id); }}
                            style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', backgroundColor: '#90bce0', color: '#fff', border: 'none', borderRadius: 6 }}
                          >{generatedGroups.has(g.id) ? '🔄 재생성' : '🤖 회고'}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {insightGroupId === g.id && (
                    <div style={{ padding: '12px 16px', backgroundColor: '#FFF8E7', borderRadius: 6, marginBottom: 8 }}>
                      {insightLoading ? (
                        <div style={{ fontSize: 14, color: '#C8962E' }}>🤖 인사이트 생성 중...</div>
                      ) : insight ? (
                        <div>
                          <InsightCard insight={insight} />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button
                              onClick={() => { setInsightGroupId(null); setInsight(null); }}
                              style={{ fontSize: 12, color: '#718096', background: 'none', border: '1px solid #E8DFD3', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}
                            >
                              접기
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                  {/* 종료된 모임 회고 안내 */}
                  {new Date(g.readingEndDate) < new Date() && !generatedGroups.has(g.id) && insightGroupId !== g.id && (
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: '#d4eaff',
                      border: '1px solid #90bce0',
                      borderRadius: 8,
                      marginBottom: 8,
                    }}>
                      <div style={{ fontSize: 13, color: '#4E342E' }}>
                        📝 모임이 종료되었어요! 회고를 생성해보세요.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
        })()}
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
                    {g.score > 0 ? (() => {
                      const label = g.score >= 5 ? '높음' : g.score >= 2 ? '보통' : '낮음';
                      const color = g.score >= 5 ? '#276749' : g.score >= 2 ? '#C8962E' : '#718096';
                      const bg = g.score >= 5 ? '#f0fff4' : g.score >= 2 ? '#FFF8E7' : '#f7fafc';
                      return <span style={{ display: 'inline-block', backgroundColor: bg, color, padding: '1px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, marginLeft: 8 }}>유사도 {label}</span>;
                    })() : (
                      <span style={{ display: 'inline-block', backgroundColor: '#f0fff4', color: '#38a169', padding: '1px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, marginLeft: 8 }}>새로운 분야</span>
                    )}
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
                {(m as any).bookTitle && <span style={{ color: '#C8962E', marginRight: 6 }}>{(m as any).bookTitle}</span>}
                p.{m.pageStart}~{m.pageEnd}: {m.content.slice(0, 60)}{m.content.length > 60 ? '...' : ''}
              </div>
              <div style={s.listItemMeta}>{m.isPublic ? '공개' : '비공개'} · {new Date(m.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* 참여 스레드 */}
      {discussions.length > 0 && (
        <div style={{ ...s.section, marginTop: 16 }}>
          <div style={s.sectionTitle}>💬 참여 스레드 ({discussions.length})</div>
          {discussions.map((d) => (
            <div key={d.id} style={s.listItem} onClick={() => navigate(`/discussions/${d.id}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/discussions/${d.id}`)}>
              <div style={s.listItemTitle}>
                {(d as any).bookTitle && <span style={{ color: '#C8962E', marginRight: 6 }}>{(d as any).bookTitle}</span>}
                {d.title}
              </div>
              <div style={s.listItemMeta}>{d.authorNickname} · {new Date(d.createdAt).toLocaleDateString()}{d.isRecommended && ' · ✨ 추천'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 800, margin: '0 auto', padding: '24px 16px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 },
  backLink: { display: 'inline-block', fontSize: 14, color: '#C8962E', fontWeight: 500, textDecoration: 'none' },
  loading: { textAlign: 'center', padding: '60px 20px', color: '#a0aec0' },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: 20, border: '1px solid #E8DFD3' },
  profileTop: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatar: { width: 56, height: 56, borderRadius: '50%', background: '#4E342E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 700, flexShrink: 0 },
  nickname: { fontSize: 20, fontWeight: 800, color: '#3D2E1E', letterSpacing: '-0.3px' },
  email: { fontSize: 13, color: '#718096', marginTop: 2 },
  logoutBtn: { padding: '8px 16px', background: 'none', color: '#e53e3e', border: '1px solid #fed7d7', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  notificationBtn: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 12px', backgroundColor: '#f7fbff', color: '#C8962E', border: '1px solid #E8DFD3', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  notificationCount: { display: 'inline-block', backgroundColor: '#e53e3e', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 700 },
  statRow: { display: 'flex', gap: 0, borderTop: '1px solid #E8DFD3', paddingTop: 16 },
  statItem: { flex: 1, textAlign: 'center' as const },
  statNum: { fontSize: 18, fontWeight: 700, color: '#3D2E1E' },
  statLabel: { fontSize: 12, color: '#a0aec0', marginTop: 2 },
  clubGrid: { display: 'flex', flexDirection: 'column' as const, gap: 12 },
  clubCard: { display: 'flex', gap: 14, backgroundColor: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.05)', border: '1px solid #E8DFD3', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' },
  clubCover: { width: 64, height: 90, borderRadius: 6, overflow: 'hidden', flexShrink: 0, backgroundColor: '#FDF8F0' },
  clubCoverImg: { width: '100%', height: '100%', objectFit: 'contain' as const },
  clubCoverPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 },
  clubInfo: { flex: 1, minWidth: 0 },
  clubBookTitle: { fontSize: 15, fontWeight: 700, color: '#3D2E1E', marginBottom: 2, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  clubName: { fontSize: 13, color: '#C8962E', fontWeight: 600, marginBottom: 8 },
  statusBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, marginBottom: 8 },
  progressRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#edf2f7', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#4E342E', borderRadius: 3, transition: 'width 0.3s' },
  progressText: { fontSize: 11, color: '#a0aec0', whiteSpace: 'nowrap' as const },
  clubMeta: { fontSize: 12, color: '#a0aec0' },
  ownerBadge: { display: 'inline-block', backgroundColor: '#fefcbf', color: '#975a16', padding: '1px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, marginLeft: 8 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #E8DFD3' },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#3D2E1E' },
  listItem: { padding: '12px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: 14, color: '#5C4A32' },
  listItemTitle: { fontWeight: 600, color: '#3D2E1E', marginBottom: 3 },
  listItemMeta: { fontSize: 12, color: '#a0aec0' },
  emptyState: { textAlign: 'center' as const, padding: '40px 20px', color: '#a0aec0', fontSize: 14, backgroundColor: '#fff', borderRadius: 12, border: '1px solid #E8DFD3' },
};

export default MyPage;
