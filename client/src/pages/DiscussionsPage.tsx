import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { discussionsApi } from '../api/discussions';
import { memosApi } from '../api/memos';
import { groupsApi } from '../api/groups';
import { aiApi, type AiTopic } from '../api/ai';
import { showToast } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { Discussion, Memo, ApiError, GroupDetail } from '../types';
import { AxiosError } from 'axios';
import { getReadingPeriodWriteBlockMessage, isOutsideReadingPeriod } from '../utils/readingPeriod';
import PageHeader from '../components/PageHeader';

const MAX_THREAD_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_THREAD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const THREAD_IMAGE_HELP_TEXT = '제한 용량: 5MB 지원 형식: JPG, PNG, GIF, WEBP';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '24px 16px',
  },
  backLink: {
    display: 'inline-block',
    marginBottom: 16,
    fontSize: 14,
    color: '#C8962E',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 12,
    color: '#3D2E1E',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    display: 'block',
    marginBottom: 4,
    fontSize: 14,
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 4,
    boxSizing: 'border-box' as const,
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 12,
    marginTop: 4,
  },
  helpText: {
    color: '#718096',
    fontSize: 12,
    marginTop: 6,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 4,
    boxSizing: 'border-box' as const,
    minHeight: 80,
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 4,
    boxSizing: 'border-box' as const,
    backgroundColor: '#fff',
  },
  button: {
    padding: '10px 24px',
    backgroundColor: '#4E342E',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  discussionItem: {
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
  },
  discussionTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#3D2E1E',
    marginBottom: 4,
  },
  discussionMeta: {
    fontSize: 12,
    color: '#a0aec0',
  },
  recommendedBadge: {
    display: 'inline-block',
    backgroundColor: '#fefcbf',
    color: '#975a16',
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 500,
    marginLeft: 8,
  },
  recCard: {
    padding: '12px 16px',
    border: '1px dashed #C8962E',
    borderRadius: 6,
    marginBottom: 8,
    cursor: 'pointer',
    backgroundColor: '#FFF8E7',
  },
  recTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#C8962E',
    marginBottom: 4,
  },
  recContent: {
    fontSize: 13,
    color: '#5C4A32',
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    padding: '6px 14px',
    fontSize: 13,
    border: '1px solid #ddd',
    borderRadius: 20,
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  filterBtnActive: {
    backgroundColor: '#4E342E',
    color: '#fff',
    borderColor: '#C8962E',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '30px 20px',
    color: '#a0aec0',
    fontSize: 14,
  },
  serverError: {
    backgroundColor: '#fff5f5',
    color: '#e53e3e',
    padding: '10px 12px',
    borderRadius: 4,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 640,
    maxHeight: '85vh',
    overflowY: 'auto' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#3D2E1E',
  },
  closeBtn: {
    padding: '6px 12px',
    fontSize: 20,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#718096',
    lineHeight: 1,
  },
  createBtn: {
    padding: '10px 20px',
    backgroundColor: '#4E342E',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileButton: {
    display: 'inline-block',
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: '#C8962E',
    backgroundColor: '#FFF8E7',
    border: '1px solid #E8DFD3',
    borderRadius: 6,
    cursor: 'pointer',
  },
  imagePreview: {
    width: 120,
    height: 80,
    objectFit: 'cover' as const,
    borderRadius: 6,
    border: '1px solid #E8DFD3',
  },
};

function DiscussionsPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [aiTopics, setAiTopics] = useState<AiTopic[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [myMemos, setMyMemos] = useState<Memo[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'authored' | 'participated'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [threadTab, setThreadTab] = useState<'active' | 'closed'>('active');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [closedSortBy, setClosedSortBy] = useState<'newest' | 'oldest' | 'popular'>('popular');
  const [activePage, setActivePage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const PAGE_SIZE = 5;

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formMemoId, setFormMemoId] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 유사 스레드
  const [similarThreads, setSimilarThreads] = useState<any[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarSearched, setSimilarSearched] = useState(false);

  // 일일 생성 횟수
  const [remainingCount, setRemainingCount] = useState<{ used: number; remaining: number; limit: number } | null>(null);

  // 수정 상태
  const [editingDiscussion, setEditingDiscussion] = useState<Discussion | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const isReadOnly = isOutsideReadingPeriod(groupInfo?.readingStartDate, groupInfo?.readingEndDate);
  const readOnlyMessage = getReadingPeriodWriteBlockMessage(groupInfo?.readingStartDate, groupInfo?.readingEndDate);

  let currentUserId = user?.id || '';
  if (!currentUserId && accessToken) {
    try {
      const token = accessToken;
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1] || ''));
      currentUserId = payload.userId || '';
    } catch { /* ignore */ }
  }

  const fetchData = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (filterMode === 'authored' && currentUserId) params.authorId = currentUserId;
      if (filterMode === 'participated' && currentUserId) params.participantId = currentUserId;
      const [discRes, memoRes, groupRes] = await Promise.all([
        discussionsApi.listByGroup(groupId!, params),
        memosApi.listByGroup(groupId!).catch(() => ({ data: { myMemos: [] as Memo[], publicMemos: [] as Memo[] } })),
        groupsApi.getDetail(groupId!).catch(() => ({ data: null })),
      ]);
      setDiscussions(discRes.data);
      setMyMemos(memoRes.data.myMemos || []);
      setGroupInfo(groupRes.data);

      if (currentUserId) {
        // 남은 생성 횟수 조회
        const remRes = await discussionsApi.getRemainingCount(groupId!).catch(() => ({ data: null }));
        if (remRes.data) setRemainingCount(remRes.data);
      }
    } catch {
      setDiscussions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId, filterMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCreateModal) {
        setShowCreateModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  const handleFindSimilar = async () => {
    if (!groupId || !formTitle.trim()) return;
    setSimilarLoading(true);
    setSimilarThreads([]);
    setSimilarSearched(false);
    try {
      const res = await discussionsApi.findSimilar(groupId, formTitle.trim(), formContent.trim());
      setSimilarThreads(res.data || []);
    } catch {
      setSimilarThreads([]);
    } finally {
      setSimilarLoading(false);
      setSimilarSearched(true);
    }
  };

  // 수정 모달 열릴 때 값 세팅
  useEffect(() => {
    if (editingDiscussion) {
      setEditTitle(editingDiscussion.title);
      setEditContent((editingDiscussion as any).content || '');
      setEditEndDate((editingDiscussion as any).endDate ? (new Date((editingDiscussion as any).endDate).toISOString().split('T')[0] ?? '') : '');
    }
  }, [editingDiscussion]);

  const handleEditSubmit = async () => {
    if (!editingDiscussion || !editTitle.trim()) return;
    if (isReadOnly) {
      showToast(readOnlyMessage || '독서기간 중에만 수정할 수 있습니다');
      setEditingDiscussion(null);
      return;
    }
    setEditSaving(true);
    try {
      await discussionsApi.updateTopic(editingDiscussion.id, {
        title: editTitle.trim(),
        content: editContent.trim() || undefined,
        endDate: editEndDate || undefined,
      });
      setEditingDiscussion(null);
      fetchData();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      showToast(axiosErr.response?.data?.error?.message || '수정에 실패했습니다');
    } finally { setEditSaving(false); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (isReadOnly) {
      setServerError(readOnlyMessage || '독서기간 중에만 스레드를 만들 수 있습니다');
      return;
    }
    const errs: Record<string, string> = {};
    if (!formTitle.trim()) errs.title = '제목을 입력해주세요';
    if (!formContent.trim()) errs.content = '내용을 입력해주세요';
    if (!formEndDate) errs.endDate = '종료일을 입력해주세요';
    if (formEndDate && groupInfo?.readingEndDate) {
      const endDate = new Date(formEndDate);
      const readingEnd = new Date(groupInfo.readingEndDate);
      if (endDate > readingEnd) errs.endDate = '종료일은 독서기간 종료일을 초과할 수 없습니다';
    }
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!groupId) return;

    setSubmitting(true);
    try {
      await discussionsApi.create(groupId!, {
        title: formTitle.trim(),
        content: formContent.trim(),
        memoId: formMemoId || undefined,
        endDate: formEndDate || undefined,
        image: formImage || undefined,
      });
      setFormTitle('');
      setFormContent('');
      setFormMemoId('');
      setFormEndDate('');
      setSimilarThreads([]);
      setSimilarSearched(false);
      setFormImage(null);
      setFormImagePreview('');
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setServerError(axiosErr.response?.data?.error?.message || '스레드 생성에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiSuggest = async () => {
    if (!groupId) return;
    if (isReadOnly) {
      showToast(readOnlyMessage || '독서기간 중에만 스레드를 만들 수 있습니다');
      return;
    }
    setAiLoading(true);
    try {
      const res = await aiApi.suggestTopics(groupId);
      setAiTopics(res.data.topics || []);
    } catch {
      alert('AI 요청이 많아 일시적으로 처리할 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectAiTopic = async (topic: AiTopic) => {
    if (!groupId) return;
    if (isReadOnly) {
      showToast(readOnlyMessage || '독서기간 중에만 스레드를 만들 수 있습니다');
      return;
    }
    try {
      await discussionsApi.create(groupId, {
        title: topic.title,
        content: topic.content,
      });
      setAiTopics([]);
      setShowCreateModal(false);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowCreateModal(false);
    }
  };

  const handleThreadImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_THREAD_IMAGE_TYPES.includes(file.type)) {
      showToast('JPG, PNG, GIF, WEBP 형식의 이미지만 사용할 수 있습니다');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_THREAD_IMAGE_SIZE) {
      showToast('스레드 이미지는 5MB 이하의 파일만 사용할 수 있습니다');
      e.target.value = '';
      return;
    }
    setFormImage(file);
    setFormImagePreview(URL.createObjectURL(file));
  };

  const clearThreadImage = () => {
    setFormImage(null);
    setFormImagePreview('');
  };

  return (
    <div style={styles.container}>
      <PageHeader />
      <Link to={`/groups/${groupId}`} style={styles.backLink}>← 모임으로</Link>
      <h1 style={styles.title}>💬 스레드</h1>

      {/* 헤더: 스레드 만들기 버튼 */}
      <div style={styles.headerRow}>
        <div style={styles.filterRow}>
          <button
            style={{ ...styles.filterBtn, ...(filterMode === 'all' ? styles.filterBtnActive : {}) }}
            onClick={() => setFilterMode('all')}
          >
            전체
          </button>
          <button
            style={{ ...styles.filterBtn, ...(filterMode === 'authored' ? styles.filterBtnActive : {}) }}
            onClick={() => setFilterMode('authored')}
          >
            내 작성
          </button>
          <button
            style={{ ...styles.filterBtn, ...(filterMode === 'participated' ? styles.filterBtnActive : {}) }}
            onClick={() => setFilterMode('participated')}
          >
            내 참여
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={{ ...styles.createBtn, ...(isReadOnly ? styles.buttonDisabled : {}) }}
            disabled={isReadOnly}
            onClick={() => {
              if (isReadOnly) {
                showToast(readOnlyMessage || '독서기간 중에만 스레드를 만들 수 있습니다');
                return;
              }
              if (remainingCount && remainingCount.remaining <= 0) {
                showToast('오늘 생성 가능한 횟수를 초과했습니다. 내일 다시 시도해 주세요.');
                return;
              }
              setShowCreateModal(true);
            }}
          >
            + 스레드 만들기
          </button>
        </div>
      </div>

      {/* 📌 대표 스레드 (고정) — 전체 필터에서만 표시 */}
      {filterMode === 'all' && !loading && discussions.filter((d: any) => d.isPinned).length > 0 && (
        <div style={{ ...styles.section, borderLeft: '4px solid #C8962E' }}>
          <div style={styles.sectionTitle}>📌 대표 스레드</div>
          {discussions.filter((d: any) => d.isPinned).map((d) => (
            <div
              key={d.id}
              style={styles.discussionItem}
              onClick={() => navigate(`/discussions/${d.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/discussions/${d.id}`)}
            >
              <div style={styles.discussionTitle}>
                {d.title}
                {(d as any).status === 'closed' && <span style={{ fontSize: 11, backgroundColor: '#fed7d7', color: '#c53030', padding: '2px 8px', borderRadius: 12, marginLeft: 8 }}>종료</span>}
              </div>
              {d.content && (
                <div style={{ fontSize: 13, color: '#5C4A32', marginTop: 4, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {d.content}
                </div>
              )}
              <div style={styles.discussionMeta}>
                {d.authorNickname} · {(d as any).endDate && `~${new Date((d as any).endDate).toLocaleDateString()}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 스레드 탭 (진행중 / 종료) */}
      <div style={styles.section}>
        {filterMode !== 'all' && (
          <div style={{ fontSize: 12, color: '#718096', marginBottom: 12 }}>
            {filterMode === 'authored' ? '📝 내가 작성한 스레드만 표시됩니다' : '💬 내가 의견이나 댓글을 남긴 스레드가 표시됩니다'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E8DFD3', marginBottom: 16 }}>
          <button
            style={{ padding: '8px 16px', fontSize: 14, fontWeight: threadTab === 'active' ? 600 : 400, cursor: 'pointer', border: 'none', background: 'none', color: threadTab === 'active' ? '#C8962E' : '#718096', borderBottom: threadTab === 'active' ? '2px solid #C8962E' : '2px solid transparent', marginBottom: -2 }}
            onClick={() => { setThreadTab('active'); setActivePage(1); }}
          >🟢 진행중</button>
          <button
            style={{ padding: '8px 16px', fontSize: 14, fontWeight: threadTab === 'closed' ? 600 : 400, cursor: 'pointer', border: 'none', background: 'none', color: threadTab === 'closed' ? '#e53e3e' : '#718096', borderBottom: threadTab === 'closed' ? '2px solid #e53e3e' : '2px solid transparent', marginBottom: -2 }}
            onClick={() => { setThreadTab('closed'); setClosedPage(1); }}
          >🔴 종료</button>
        </div>

        {/* 정렬 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <select
            style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4 }}
            value={threadTab === 'active' ? sortBy : closedSortBy}
            onChange={e => {
              const v = e.target.value as 'newest' | 'oldest' | 'popular';
              if (threadTab === 'active') { setSortBy(v); setActivePage(1); }
              else { setClosedSortBy(v); setClosedPage(1); }
            }}
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="popular">답글 많은순</option>
          </select>
        </div>

        {(() => {
          const isActive = threadTab === 'active';
          const filtered = discussions.filter((d: any) => isActive ? d.status !== 'closed' : d.status === 'closed');
          const currentSort = isActive ? sortBy : closedSortBy;
          const sorted = [...filtered].sort((a: any, b: any) => {
            if (currentSort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (currentSort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            return (b.commentCount || 0) - (a.commentCount || 0);
          });
          const currentPage = isActive ? activePage : closedPage;
          const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
          const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

          if (loading) return <div style={styles.emptyState}>불러오는 중...</div>;
          if (sorted.length === 0) return <div style={styles.emptyState}>{isActive ? '진행중인 스레드가 없습니다' : '종료된 스레드가 없습니다'}</div>;

          return (
            <>
              {paged.map((d: any) => (
                <div
                  key={d.id}
                  style={{ ...styles.discussionItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...(threadTab === 'closed' ? { opacity: 0.7 } : {}) }}
                >
                  <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => navigate(`/discussions/${d.id}`)}>
                    <div style={styles.discussionTitle}>
                      {d.title}
                      {d.endDate && <span style={{ fontSize: 11, color: '#718096', marginLeft: 8 }}>~{new Date(d.endDate).toLocaleDateString()}</span>}
                      {d.status === 'closed' && <span style={{ fontSize: 11, backgroundColor: '#fed7d7', color: '#c53030', padding: '2px 8px', borderRadius: 12, marginLeft: 8 }}>종료</span>}
                      {d.commentCount > 0 && <span style={{ fontSize: 11, color: '#a0aec0', marginLeft: 8 }}>💬 {d.commentCount}</span>}
                    </div>
                    <div style={styles.discussionMeta}>
                      {d.authorNickname} · {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {isActive && d.authorId === currentUserId && !isReadOnly && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingDiscussion(d); }}
                        style={{ padding: '3px 10px', fontSize: 11, color: '#C8962E', background: 'none', border: '1px solid #E8DFD3', borderRadius: 4, cursor: 'pointer' }}
                      ><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 3 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>수정</button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('이 스레드를 삭제하시겠습니까?')) return;
                          try {
                            await discussionsApi.deleteTopic(d.id);
                            fetchData();
                          } catch (err) {
                            const axiosErr = err as AxiosError<ApiError>;
                            showToast(axiosErr.response?.data?.error?.message || '삭제에 실패했습니다');
                          }
                        }}
                        style={{ padding: '3px 10px', fontSize: 11, color: '#e53e3e', background: 'none', border: '1px solid #fed7d7', borderRadius: 4, cursor: 'pointer' }}
                      ><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 3 }}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>삭제</button>
                    </div>
                  )}
                </div>
              ))}

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4, backgroundColor: p === currentPage ? '#C8962E' : '#fff', color: p === currentPage ? '#fff' : '#333', cursor: 'pointer' }}
                      onClick={() => isActive ? setActivePage(p) : setClosedPage(p)}
                    >{p}</button>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* 스레드 만들기 모달 */}
      {showCreateModal && (
        <div style={styles.overlay} onClick={handleOverlayClick}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>💬 스레드 만들기</div>
              <button style={styles.closeBtn} onClick={() => setShowCreateModal(false)} aria-label="닫기">×</button>
            </div>

            {/* 직접 작성 폼 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ ...styles.sectionTitle, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4E342E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>직접 작성</div>
              {remainingCount && (
                <div style={{ fontSize: 13, marginBottom: 12, padding: '8px 12px', borderRadius: 6, backgroundColor: remainingCount.remaining > 0 ? '#f0fff4' : '#fff5f5', color: remainingCount.remaining > 0 ? '#38a169' : '#e53e3e' }}>
                  오늘 남은 생성 횟수: {remainingCount.remaining}/{remainingCount.limit}회
                </div>
              )}
              <form onSubmit={handleSubmit} noValidate>

                <div style={styles.field}>
                  <label style={styles.label}>제목 *</label>
                  <input
                    type="text"
                    style={{ ...styles.input, ...(formErrors.title ? styles.inputError : {}) }}
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="제목을 입력해주세요"
                  />
                  {formErrors.title && <div style={styles.errorText}>{formErrors.title}</div>}
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>내용 *</label>
                  <textarea
                    style={styles.textarea}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="내용을 입력해주세요"
                  />
                  {formErrors.content && <div style={styles.errorText}>{formErrors.content}</div>}
                </div>

                {/* 유사 스레드 확인 */}
                <div style={{ marginBottom: 14 }}>
                  <button
                    type="button"
                    onClick={handleFindSimilar}
                    disabled={similarLoading || !formTitle.trim()}
                    style={{ padding: '8px 14px', backgroundColor: '#edf2f7', color: '#5C4A32', border: '1px solid #E8DFD3', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                  >
                    {similarLoading ? '검색 중...' : '🔍 유사한 스레드 확인하기'}
                  </button>

                  {similarThreads.length > 0 && (
                    <div style={{ marginTop: 10, border: '1px solid #E8DFD3', borderRadius: 8, padding: 12, backgroundColor: '#f7fafc' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#5C4A32', marginBottom: 8 }}>
                        🔍 유사한 스레드가 {similarThreads.length}개 있습니다
                      </div>
                      {similarThreads.map((t: any) => (
                        <div
                          key={t.id}
                          style={{ padding: '8px 0', borderBottom: '1px solid #E8DFD3', cursor: 'pointer' }}
                          onClick={() => navigate(`/discussions/${t.id}`)}
                        >
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#3D2E1E' }}>
                            {t.title}
                            <span style={{ marginLeft: 6, fontSize: 11, color: t.status === 'active' ? '#38a169' : '#718096' }}>
                              {t.status === 'active' ? '진행 중' : '종료'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>
                            {t.authorNickname} · 의견 {t.commentCount}개
                          </div>
                        </div>
                      ))}
                      <div style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
                        유사한 스레드에 참여하거나, 그래도 새로 만들 수 있습니다.
                      </div>
                    </div>
                  )}
                  {similarSearched && similarThreads.length === 0 && !similarLoading && (
                    <div style={{ marginTop: 10, fontSize: 13, color: '#38a169' }}>
                      ✅ 유사한 스레드가 없습니다. 새로 만들어도 좋아요!
                    </div>
                  )}
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>이미지 첨부 (선택)</label>
                  <label style={styles.fileButton}>
                    {formImage ? '다른 이미지 선택' : '이미지 선택'}
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleThreadImageChange} style={{ display: 'none' }} />
                  </label>
                  <div style={styles.helpText}>{THREAD_IMAGE_HELP_TEXT}</div>
                  {formImage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                      {formImagePreview && <img src={formImagePreview} alt="" style={styles.imagePreview} />}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#5C4A32', wordBreak: 'break-all' }}>{formImage.name}</div>
                        <button type="button" onClick={clearThreadImage} style={{ ...styles.closeBtn, padding: '4px 0', fontSize: 12, color: '#e53e3e' }}>삭제</button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>메모 연결 (선택)</label>
                  <select
                    style={styles.select}
                    value={formMemoId}
                    onChange={(e) => setFormMemoId(e.target.value)}
                  >
                    <option value="">메모를 선택하세요 (선택)</option>
                    {myMemos.map((m) => (
                      <option key={m.id} value={m.id}>
                        p.{m.pageStart}~{m.pageEnd}: {m.content.slice(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>종료일 *</label>
                  <input
                    type="date"
                    min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                    max={groupInfo?.readingEndDate ? new Date(groupInfo.readingEndDate).toISOString().split('T')[0] : undefined}
                    style={{ ...styles.input, ...(formErrors.endDate ? styles.inputError : {}) }}
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                  {groupInfo?.readingEndDate && (
                    <div style={styles.helpText}>독서기간 종료일({new Date(groupInfo.readingEndDate).toLocaleDateString()})까지 설정 가능</div>
                  )}
                  {formErrors.endDate && <div style={styles.errorText}>{formErrors.endDate}</div>}
                </div>

                <button
                  type="submit"
                  style={{ ...styles.button, ...(submitting ? styles.buttonDisabled : {}) }}
                  disabled={submitting}
                >
                  {submitting ? '생성 중...' : '스레드 만들기'}
                </button>
                {serverError && (
                  <div style={{ marginTop: 10, padding: '10px 14px', backgroundColor: '#fff5f5', color: '#e53e3e', borderRadius: 6, fontSize: 13 }}>
                    {serverError}
                  </div>
                )}
              </form>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #E8DFD3', margin: '20px 0' }} />

            {/* AI 스레드 주제 제안 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={styles.sectionTitle}>🤖 AI 스레드 주제 제안</div>
                <button
                  onClick={handleAiSuggest}
                  disabled={aiLoading}
                  style={{ ...styles.button, padding: '8px 16px', fontSize: 13, backgroundColor: '#90bce0', color: '#fff', ...(aiLoading ? styles.buttonDisabled : {}) }}
                >
                  {aiLoading ? '생성 중...' : '🤖 AI 주제 생성'}
                </button>
              </div>
              {aiTopics.length > 0 && aiTopics.map((topic, i) => (
                <div
                  key={i}
                  style={{ ...styles.recCard, borderColor: '#C8962E', backgroundColor: '#FFF8E7' }}
                  onClick={() => handleSelectAiTopic(topic)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectAiTopic(topic)}
                >
                  <div style={{ ...styles.recTitle, color: '#4E342E' }}>🤖 {topic.title}</div>
                  <div style={styles.recContent}>{topic.content}</div>
                </div>
              ))}
              {aiTopics.length === 0 && !aiLoading && (
                <div style={styles.emptyState}>
                  버튼을 눌러 AI가 책과 메모 기반으로 스레드 주제를 제안합니다. 원하는 주제를 클릭하면 바로 스레드로 등록됩니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editingDiscussion && (
        <div style={styles.overlay} onClick={() => setEditingDiscussion(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ ...styles.modalTitle, display: 'flex', alignItems: 'center', gap: 6 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4E342E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>스레드 수정</div>
              <button style={styles.closeBtn} onClick={() => setEditingDiscussion(null)} aria-label="닫기">×</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>제목</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={styles.input} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>내용</label>
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} style={{ ...styles.input, minHeight: 80, resize: 'vertical' as const, fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>종료일</label>
                <input type="date" min={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()} max={groupInfo?.readingEndDate ? new Date(groupInfo.readingEndDate).toISOString().split('T')[0] : undefined} value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} style={styles.input} />
                {groupInfo?.readingEndDate && (
                  <div style={styles.helpText}>독서기간 종료일({new Date(groupInfo.readingEndDate).toLocaleDateString()})까지 설정 가능</div>
                )}
              </div>
              <button onClick={handleEditSubmit} disabled={editSaving} style={styles.button}>
                {editSaving ? '저장 중...' : '수정 완료'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscussionsPage;
