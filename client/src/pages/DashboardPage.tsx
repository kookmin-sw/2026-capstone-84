import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dashboardApi, type Announcement, type DiscussionSchedule } from '../api/dashboard';
import { groupsApi } from '../api/groups';
import { proposalsApi, type TopicProposal } from '../api/proposals';
import { useAuthStore } from '../stores/authStore';
import type { GroupDetail } from '../types';

const tabs = [
  { id: 'calendar', label: '📅 토론 일정' },
  { id: 'invite', label: '🔗 초대 링크' },
  { id: 'announcements', label: '📢 공지사항' },
  { id: 'members', label: '👥 멤버 관리' },
  { id: 'topics', label: '💬 토론 생성' },
] as const;

type TabId = typeof tabs[number]['id'];

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
  backLink: { display: 'inline-block', marginBottom: 16, fontSize: 14, color: '#3182ce' },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 16 },
  tabBar: { display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 20 },
  tab: { padding: '10px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', color: '#718096', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActive: { color: '#3182ce', borderBottomColor: '#3182ce', fontWeight: 600 },
  section: { backgroundColor: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#2d3748' },
  btn: { padding: '8px 16px', fontSize: 13, border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 },
  btnPrimary: { backgroundColor: '#3182ce', color: '#fff' },
  btnDanger: { backgroundColor: '#e53e3e', color: '#fff' },
  btnSecondary: { backgroundColor: '#edf2f7', color: '#333' },
  input: { width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' as const, marginBottom: 8 },
  textarea: { width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' as const, minHeight: 80, fontFamily: 'inherit', marginBottom: 8 },
  memberItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 },
  annItem: { padding: '12px 0', borderBottom: '1px solid #f0f0f0' },
  inviteBox: { backgroundColor: '#f7fafc', padding: '12px 16px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12 },
  calGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center' as const },
  calCell: { padding: '8px 4px', fontSize: 12, borderRadius: 4, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' },
};

function DashboardPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [activeTab, setActiveTab] = useState<TabId>('calendar');

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schedules, setSchedules] = useState<DiscussionSchedule[]>([]);
  const [proposals, setProposals] = useState<TopicProposal[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newSchedTitle, setNewSchedTitle] = useState('');
  const [newSchedStart, setNewSchedStart] = useState('');
  const [newSchedEnd, setNewSchedEnd] = useState('');
  const [calMonth, setCalMonth] = useState(new Date());
  const [copied, setCopied] = useState(false);

  let currentUserId = user?.id || '';
  if (!currentUserId && accessToken) {
    try { currentUserId = JSON.parse(atob(accessToken.split('.')[1] || '')).userId || ''; } catch {}
  }

  const fetchAll = async () => {
    if (!groupId) return;
    try {
      const [gRes, invRes, annRes, schedRes, propRes] = await Promise.all([
        groupsApi.getDetail(groupId),
        dashboardApi.getInviteCode(groupId).catch(() => ({ data: { inviteCode: null, expiresAt: null } })),
        dashboardApi.listAnnouncements(groupId).catch(() => ({ data: [] })),
        dashboardApi.listSchedules(groupId).catch(() => ({ data: [] })),
        proposalsApi.list(groupId).catch(() => ({ data: [] })),
      ]);
      setGroup(gRes.data);
      setInviteCode(invRes.data.inviteCode);
      setInviteExpiresAt(invRes.data.expiresAt || null);
      setAnnouncements(annRes.data);
      setSchedules(schedRes.data);
      setProposals(propRes.data);
    } catch {}
  };

  useEffect(() => { fetchAll(); }, [groupId]);

  const handleGenerateInvite = async () => {
    if (!groupId) return;
    const { data } = await dashboardApi.generateInviteCode(groupId);
    setInviteCode(data.inviteCode);
    setInviteExpiresAt(data.expiresAt || null);
    setCopied(false);
  };

  const copyInviteLink = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async (userId: string, nickname: string) => {
    if (!groupId || !confirm(`${nickname}님을 모임에서 삭제하시겠습니까?`)) return;
    await dashboardApi.removeMember(groupId, userId);
    fetchAll();
  };

  const handleCreateAnnouncement = async () => {
    if (!groupId || !newAnnTitle.trim() || !newAnnContent.trim()) return;
    await dashboardApi.createAnnouncement(groupId, { title: newAnnTitle.trim(), content: newAnnContent.trim() });
    setNewAnnTitle(''); setNewAnnContent(''); fetchAll();
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!groupId || !confirm('공지사항을 삭제하시겠습니까?')) return;
    await dashboardApi.deleteAnnouncement(groupId, annId); fetchAll();
  };

  const handleOpenDiscussion = async (proposalId: string) => {
    if (!confirm('이 주제로 토론을 개최하시겠습니까?')) return;
    try {
      await proposalsApi.openDiscussion(proposalId);
      alert('토론이 개최되었습니다'); fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || '토론 개최에 실패했습니다');
    }
  };

  const handleCreateSchedule = async () => {
    if (!groupId || !newSchedTitle.trim() || !newSchedStart || !newSchedEnd) return;
    await dashboardApi.createSchedule(groupId, { title: newSchedTitle.trim(), startDate: newSchedStart, endDate: newSchedEnd });
    setNewSchedTitle(''); setNewSchedStart(''); setNewSchedEnd(''); fetchAll();
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!groupId || !confirm('이 일정을 삭제하시겠습니까?')) return;
    await dashboardApi.deleteSchedule(groupId, scheduleId); fetchAll();
  };

  // Calendar helpers
  const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const renderCalendar = () => {
    const days = daysInMonth(calMonth);
    const startDay = firstDayOfMonth(calMonth);
    const cells = [];
    const discussionDate = group?.discussionDate ? new Date(group.discussionDate) : null;
    const readStart = group?.readingStartDate ? new Date(group.readingStartDate) : null;
    const readEnd = group?.readingEndDate ? new Date(group.readingEndDate) : null;

    for (let i = 0; i < startDay; i++) cells.push(<div key={`e${i}`} style={styles.calCell} />);
    for (let d = 1; d <= days; d++) {
      const date = new Date(calMonth.getFullYear(), calMonth.getMonth(), d);
      let bg = 'transparent';
      let color = '#333';
      const hasSchedule = schedules.some(s => {
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        return date >= start && date <= end;
      });
      if (discussionDate && isSameDay(date, discussionDate)) { bg = '#3182ce'; color = '#fff'; }
      else if (hasSchedule) { bg = '#c6f6d5'; }
      else if (readStart && readEnd && date >= readStart && date <= readEnd) { bg = '#ebf8ff'; }
      cells.push(<div key={d} style={{ ...styles.calCell, backgroundColor: bg, color, fontWeight: discussionDate && isSameDay(date, discussionDate) ? 700 : 400 }}>{d}</div>);
    }
    return cells;
  };

  if (!group) return <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>불러오는 중...</div>;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'calendar':
        return (
          <div style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={styles.sectionTitle}>📅 토론 일정</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))}>◀</button>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{calMonth.getFullYear()}년 {calMonth.getMonth() + 1}월</span>
                <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))}>▶</button>
              </div>
            </div>
            <div style={styles.calGrid}>
              {['일','월','화','수','목','금','토'].map(d => <div key={d} style={{ ...styles.calCell, fontWeight: 600, fontSize: 11, color: '#718096' }}>{d}</div>)}
              {renderCalendar()}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#718096' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#ebf8ff', borderRadius: 2, marginRight: 4, verticalAlign: 'middle' }} /> 독서 기간
              <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#c6f6d5', borderRadius: 2, marginLeft: 12, marginRight: 4, verticalAlign: 'middle' }} /> 토론 일정
              <span style={{ display: 'inline-block', width: 12, height: 12, backgroundColor: '#3182ce', borderRadius: 2, marginLeft: 12, marginRight: 4, verticalAlign: 'middle' }} /> 토론일
            </div>
            <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>일정 추가</div>
              <input style={styles.input} placeholder="일정 제목" value={newSchedTitle} onChange={e => setNewSchedTitle(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="date" style={styles.input} value={newSchedStart} onChange={e => setNewSchedStart(e.target.value)} />
                <input type="date" style={styles.input} value={newSchedEnd} onChange={e => setNewSchedEnd(e.target.value)} />
              </div>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleCreateSchedule}>일정 추가</button>
            </div>
            {schedules.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>등록된 일정</div>
                {schedules.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 }}>
                    <span><strong>{s.title}</strong> ({new Date(s.startDate).toLocaleDateString()} ~ {new Date(s.endDate).toLocaleDateString()})</span>
                    <button style={{ ...styles.btn, ...styles.btnDanger, padding: '2px 8px', fontSize: 11 }} onClick={() => handleDeleteSchedule(s.id)}>삭제</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'invite':
        return (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🔗 초대 링크</div>
            {inviteCode ? (
              <div>
                <div style={styles.inviteBox}>
                  <code style={{ flex: 1, fontSize: 13, wordBreak: 'break-all' }}>{window.location.origin}/invite/{inviteCode}</code>
                  <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={copyInviteLink}>{copied ? '복사됨!' : '복사'}</button>
                  <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={handleGenerateInvite}>재생성</button>
                </div>
                {inviteExpiresAt && (
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
                    ⏰ 만료: {new Date(inviteExpiresAt).toLocaleString()} (생성 후 30분)
                  </div>
                )}
              </div>
            ) : (
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleGenerateInvite}>초대 링크 생성</button>
            )}
          </div>
        );

      case 'announcements':
        return (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📢 공지사항</div>
            <input style={styles.input} placeholder="제목" value={newAnnTitle} onChange={e => setNewAnnTitle(e.target.value)} />
            <textarea style={styles.textarea} placeholder="내용" value={newAnnContent} onChange={e => setNewAnnContent(e.target.value)} />
            <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleCreateAnnouncement}>공지 작성</button>
            <div style={{ marginTop: 16 }}>
              {announcements.length === 0 ? <div style={{ color: '#a0aec0', fontSize: 13 }}>공지사항이 없습니다</div> : announcements.map(ann => (
                <div key={ann.id} style={styles.annItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 14 }}>{ann.title}</strong>
                    <button style={{ ...styles.btn, ...styles.btnDanger, padding: '4px 10px', fontSize: 11 }} onClick={() => handleDeleteAnnouncement(ann.id)}>삭제</button>
                  </div>
                  <div style={{ fontSize: 13, color: '#4a5568', marginTop: 4 }}>{ann.content}</div>
                  <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>{new Date(ann.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'members':
        return (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>👥 멤버 관리</div>
            {group.members.filter(m => m.role !== 'owner').map(m => (
              <div key={m.id} style={styles.memberItem}>
                <span>{m.nickname}</span>
                <button style={{ ...styles.btn, ...styles.btnDanger, padding: '4px 10px', fontSize: 11 }} onClick={() => handleRemoveMember(m.userId, m.nickname)}>삭제</button>
              </div>
            ))}
            {group.members.filter(m => m.role !== 'owner').length === 0 && <div style={{ color: '#a0aec0', fontSize: 13 }}>멤버가 없습니다</div>}
          </div>
        );

      case 'topics':
        return (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>💬 토론 생성</div>
            <div style={{ fontSize: 13, color: '#718096', marginBottom: 16 }}>참여자들이 제안한 주제 중 선택하여 토론을 개최합니다.</div>

            {proposals.filter(p => p.status === 'proposed').length === 0 ? (
              <div style={{ color: '#a0aec0', fontSize: 13 }}>아직 제안된 토론 주제가 없습니다</div>
            ) : proposals.filter(p => p.status === 'proposed').map(p => (
              <div key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#2d3748' }}>{p.title}</div>
                  {p.content && <div style={{ fontSize: 13, color: '#4a5568', marginTop: 4 }}>{p.content.slice(0, 100)}{p.content.length > 100 ? '...' : ''}</div>}
                  <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 4 }}>{p.author.nickname} · {new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
                <button style={{ ...styles.btn, ...styles.btnPrimary, padding: '6px 14px', fontSize: 12 }} onClick={() => handleOpenDiscussion(p.id)}>토론 개최</button>
              </div>
            ))}

            {proposals.filter(p => p.status === 'opened').length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#48bb78' }}>✅ 개최된 토론</div>
                {proposals.filter(p => p.status === 'opened').map(p => (
                  <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13, color: '#718096' }}>
                    {p.title} — {p.author.nickname}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      <Link to={`/groups/${groupId}`} style={styles.backLink}>← 모임으로</Link>
      <h1 style={styles.title}>🛠️ 모임장 대시보드</h1>

      {/* 탭 바 */}
      <div style={styles.tabBar}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {renderTabContent()}
    </div>
  );
}

export default DashboardPage;
