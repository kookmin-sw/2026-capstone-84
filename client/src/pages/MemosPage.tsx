import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { memosApi } from '../api/memos';
import { groupsApi } from '../api/groups';
import { showToast } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import type { Memo, ApiError, GroupDetail, MemoVisibility, GroupMember } from '../types';
import { AxiosError } from 'axios';
import { getReadingPeriodWriteBlockMessage, isOutsideReadingPeriod } from '../utils/readingPeriod';
import PageHeader from '../components/PageHeader';

const MAX_MEMO_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MEMO_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MEMO_IMAGE_HELP_TEXT = '제한 용량: 5MB 지원 형식: JPG, PNG, GIF, WEBP';

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 800, margin: '0 auto', padding: '24px 16px' },
  backLink: { display: 'inline-block', marginBottom: 16, fontSize: 14, color: '#C8962E' },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24 },
  // 버튼 그리드
  buttonGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 },
  menuCard: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    padding: '28px 16px', borderRadius: 12, cursor: 'pointer', border: '1px solid #E8DFD3',
    backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'transform 0.15s, box-shadow 0.15s',
  },
  menuIcon: { fontSize: 32, marginBottom: 8 },
  menuLabel: { fontSize: 15, fontWeight: 600, color: '#3D2E1E' },
  menuCount: { fontSize: 12, color: '#a0aec0', marginTop: 4 },
  // 모달
  overlay: {
    position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 600,
    maxHeight: '80vh', overflowY: 'auto' as const, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#3D2E1E' },
  closeBtn: {
    padding: '6px 12px', fontSize: 20, background: 'none', border: 'none', cursor: 'pointer',
    color: '#718096', lineHeight: 1,
  },
  // 폼/메모 공통
  field: { marginBottom: 14 },
  label: { display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' as const },
  inputError: { borderColor: '#e53e3e' },
  errorText: { color: '#e53e3e', fontSize: 12, marginTop: 4 },
  helpText: { color: '#718096', fontSize: 12, marginTop: 6 },
  textarea: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 4, boxSizing: 'border-box' as const, minHeight: 100, resize: 'vertical' as const, fontFamily: 'inherit' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  button: { width: '100%', padding: '10px 0', backgroundColor: '#4E342E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  buttonDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  memoCard: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 12, border: '1px solid #E8DFD3' },
  memoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  memoRange: { fontSize: 13, fontWeight: 600, color: '#C8962E' },
  memoContent: { fontSize: 14, color: '#5C4A32', lineHeight: 1.6, marginBottom: 8 },
  memoMeta: { fontSize: 12, color: '#a0aec0' },
  actionBtn: { padding: '4px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4, backgroundColor: '#fff', cursor: 'pointer', marginLeft: 4 },
  deleteBtn: { padding: '4px 10px', fontSize: 12, border: '1px solid #e53e3e', borderRadius: 4, backgroundColor: '#fff', color: '#e53e3e', cursor: 'pointer', marginLeft: 4 },
  hiddenMsg: { backgroundColor: '#fefcbf', color: '#975a16', padding: '12px 16px', borderRadius: 6, fontSize: 13, textAlign: 'center' as const },
  serverError: { backgroundColor: '#fff5f5', color: '#e53e3e', padding: '10px 12px', borderRadius: 4, fontSize: 14, marginBottom: 16, textAlign: 'center' as const },
  emptyState: { textAlign: 'center' as const, padding: '30px 20px', color: '#a0aec0', fontSize: 14 },
  visSelect: { padding: '6px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4, backgroundColor: '#fff', cursor: 'pointer', marginLeft: 4 },
  fileButton: { display: 'inline-block', padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#C8962E', backgroundColor: '#FFF8E7', border: '1px solid #E8DFD3', borderRadius: 6, cursor: 'pointer' },
  imagePreview: { width: 120, height: 80, objectFit: 'cover' as const, borderRadius: 6, border: '1px solid #E8DFD3' },
  memoImage: { display: 'block', maxWidth: '100%', maxHeight: 280, objectFit: 'contain' as const, borderRadius: 8, border: '1px solid #E8DFD3', marginBottom: 8 },
};

type ModalType = 'create' | 'my' | 'public' | 'spoiler' | null;

const visibilityLabel = (v: MemoVisibility) => {
  switch (v) {
    case 'public': return '🔓 공개';
    case 'spoiler': return '⚠️ 스포일러';
    case 'private': default: return '🔒 비공개';
  }
};

const visibilityColor = (v: MemoVisibility) => {
  switch (v) {
    case 'public': return { bg: '#f0fff4', color: '#276749' };
    case 'spoiler': return { bg: '#fffbeb', color: '#92400e' };
    case 'private': default: return { bg: '#f7fafc', color: '#718096' };
  }
};

function MemosPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [myMemos, setMyMemos] = useState<Memo[]>([]);
  const [publicMemos, setPublicMemos] = useState<Memo[]>([]);
  const [spoilerMemos, setSpoilerMemos] = useState<Memo[]>([]);
  const [groupInfo, setGroupInfo] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // 작성 폼 상태
  const [pageStart, setPageStart] = useState('');
  const [pageEnd, setPageEnd] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<MemoVisibility>('private');
  const [memoImage, setMemoImage] = useState<File | null>(null);
  const [memoImagePreview, setMemoImagePreview] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 읽은 페이지 업데이트 상태
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [newProgress, setNewProgress] = useState('');
  const [progressSaving, setProgressSaving] = useState(false);

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editPageStart, setEditPageStart] = useState('');
  const [editPageEnd, setEditPageEnd] = useState('');

  // 자세히 보기 상태
  const [detailMemo, setDetailMemo] = useState<Memo | null>(null);

  // 내 메모 정렬 상태
  type SortOption = 'newest' | 'oldest' | 'pageDesc' | 'pageAsc';
  const [memoSort, setMemoSort] = useState<SortOption>('newest');
  const [publicSort, setPublicSort] = useState<SortOption>('newest');
  const [spoilerSort, setSpoilerSort] = useState<SortOption>('newest');

  // 내 메모 필터 상태
  type FilterOption = 'all' | 'private' | 'public' | 'spoiler';
  const [memoFilter, setMemoFilter] = useState<FilterOption>('all');

  const sortMemos = (memos: Memo[], sort: SortOption) => [...memos].sort((a, b) => {
    switch (sort) {
      case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'pageDesc': return b.pageStart - a.pageStart || a.pageEnd - b.pageEnd;
      case 'pageAsc': return a.pageStart - b.pageStart || a.pageEnd - b.pageEnd;
      default: return 0;
    }
  });

  const sortedMyMemos = sortMemos(
    myMemos.filter((m) => {
      if (memoFilter === 'all') return true;
      const vis = m.visibility || (m.isPublic ? 'public' : 'private');
      return vis === memoFilter;
    }),
    memoSort
  );

  const sortedPublicMemos = sortMemos(publicMemos, publicSort);
  const sortedSpoilerMemos = sortMemos(spoilerMemos, spoilerSort);
  const isReadOnly = isOutsideReadingPeriod(groupInfo?.readingStartDate, groupInfo?.readingEndDate);
  const readOnlyMessage = getReadingPeriodWriteBlockMessage(groupInfo?.readingStartDate, groupInfo?.readingEndDate);
  let currentUserId = user?.id || '';
  if (!currentUserId && accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1] || ''));
      currentUserId = payload.userId || '';
    } catch { /* ignore */ }
  }

  const fetchMemos = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const [memoRes, groupRes] = await Promise.all([
        memosApi.listByGroup(groupId),
        groupsApi.getDetail(groupId).catch(() => ({ data: null })),
      ]);
      setMyMemos(memoRes.data.myMemos || []);
      setPublicMemos(memoRes.data.publicMemos || []);
      setSpoilerMemos(memoRes.data.spoilerMemos || []);
      // 시작 페이지 기본값: 마지막 메모의 끝 페이지
      const myMemoList = memoRes.data.myMemos || [];
      if (myMemoList.length > 0 && !pageStart) {
        setPageStart(String(myMemoList[0].pageEnd));
      }
      if (groupRes.data) {
        setGroupInfo(groupRes.data);
        // 현재 사용자의 읽은 페이지 가져오기
        const me = groupRes.data.members?.find((m: GroupMember) => m.userId === currentUserId);
        if (me) {
          setCurrentProgress(me.readingProgress);
          setNewProgress(String(me.readingProgress));
        }
      }
    } catch {
      setMyMemos([]);
      setPublicMemos([]);
      setSpoilerMemos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMemos(); }, [groupId]);

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!pageStart || parseInt(pageStart) < 0) errs.pageStart = '이 생각이 시작된 페이지를 입력해주세요';
    if (!pageEnd || parseInt(pageEnd) < 0) errs.pageEnd = '이 생각이 끝난 페이지를 입력해주세요';
    if (pageStart && pageEnd && parseInt(pageEnd) < parseInt(pageStart)) errs.pageEnd = '끝 페이지는 시작 페이지 이상이어야 합니다';
    if (!content.trim()) errs.content = '메모 내용을 입력해주세요';
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      setServerError(readOnlyMessage || '독서기간 중에만 메모를 작성할 수 있습니다');
      return;
    }
    setServerError('');
    const errs = validateForm();
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!groupId) return;

    setSubmitting(true);
    try {
      await memosApi.create(groupId, {
        pageStart: parseInt(pageStart),
        pageEnd: parseInt(pageEnd),
        content: content.trim(),
        visibility,
        image: memoImage || undefined,
      });
      setPageStart(pageEnd);
      setPageEnd('');
      setContent('');
      setVisibility('private');
      setMemoImage(null);
      setMemoImagePreview('');
      setActiveModal(null);
      fetchMemos();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      setServerError(axiosErr.response?.data?.error?.message || '메모 작성에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (memoId: string) => {
    if (isReadOnly) {
      showToast(readOnlyMessage || '독서기간 중에만 삭제할 수 있습니다');
      return;
    }
    if (!confirm('메모를 삭제하시겠습니까?')) return;
    try { await memosApi.delete(memoId); fetchMemos(); } catch { /* ignore */ }
  };

  const handleUpdateProgress = async () => {
    if (!groupId) return;
    const page = parseInt(newProgress);
    if (isNaN(page) || page < 0) return;
    setProgressSaving(true);
    try {
      await groupsApi.updateProgress(groupId, page);
      setCurrentProgress(page);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      alert(axiosErr.response?.data?.error?.message || '읽은 페이지 업데이트에 실패했습니다');
    } finally {
      setProgressSaving(false);
    }
  };

  const handleChangeVisibility = async (memo: Memo, newVis: MemoVisibility) => {
    if (isReadOnly) {
      showToast(readOnlyMessage || '독서기간 중에만 수정할 수 있습니다');
      return;
    }
    try {
      await memosApi.updateVisibility(memo.id, newVis);
      fetchMemos();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr.response?.data?.error?.message;
      if (msg) alert(msg);
    }
  };

  const startEdit = (memo: Memo) => {
    if (isReadOnly) {
      showToast(readOnlyMessage || '독서기간 중에만 수정할 수 있습니다');
      return;
    }
    setEditingId(memo.id);
    setEditContent(memo.content);
    setEditPageStart(String(memo.pageStart));
    setEditPageEnd(String(memo.pageEnd));
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (isReadOnly) {
      showToast(readOnlyMessage || '독서기간 중에만 수정할 수 있습니다');
      setEditingId(null);
      return;
    }
    try {
      await memosApi.update(editingId, {
        pageStart: parseInt(editPageStart),
        pageEnd: parseInt(editPageEnd),
        content: editContent.trim(),
      });
      setEditingId(null);
      fetchMemos();
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr?.response?.data?.error?.message;
      if (msg) showToast(msg);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingId(null);
  };

  const handleMemoImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_MEMO_IMAGE_TYPES.includes(file.type)) {
      showToast('JPG, PNG, GIF, WEBP 형식의 이미지만 사용할 수 있습니다');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_MEMO_IMAGE_SIZE) {
      showToast('메모 이미지는 5MB 이하의 파일만 사용할 수 있습니다');
      e.target.value = '';
      return;
    }
    setMemoImage(file);
    setMemoImagePreview(URL.createObjectURL(file));
  };

  const clearMemoImage = () => {
    setMemoImage(null);
    setMemoImagePreview('');
  };

  // 모달 외부 클릭 핸들러
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && activeModal !== 'create') closeModal();
  };

  const renderMyMemo = (memo: Memo) => (
    <div key={memo.id} style={styles.memoCard}>
      {editingId === memo.id ? (
        <>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3D2E1E', marginBottom: 4, display: 'block' }}>💭 이 생각이 나온 페이지</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="number" style={{ ...styles.input, width: 100, textAlign: 'center' as const }} value={editPageStart} onChange={(e) => setEditPageStart(e.target.value)} placeholder="시작 페이지" />
              <span style={{ fontSize: 16, color: '#a0aec0', fontWeight: 500 }}>~</span>
              <input type="number" style={{ ...styles.input, width: 100, textAlign: 'center' as const }} value={editPageEnd} onChange={(e) => setEditPageEnd(e.target.value)} placeholder="끝 페이지" />
            </div>
          </div>
          <textarea style={{ ...styles.textarea, marginTop: 8 }} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button style={styles.actionBtn} onClick={handleUpdate}>저장</button>
            <button style={styles.actionBtn} onClick={() => setEditingId(null)}>취소</button>
          </div>
        </>
      ) : (
        <>
          <div style={styles.memoHeader}>
            <span style={styles.memoRange}>p.{memo.pageStart} ~ p.{memo.pageEnd}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {!isReadOnly && (
                <select
                  style={styles.visSelect}
                  value={memo.visibility || (memo.isPublic ? 'public' : 'private')}
                  onChange={(e) => handleChangeVisibility(memo, e.target.value as MemoVisibility)}
                >
                  <option value="private">🔒 비공개</option>
                  <option value="public">🔓 공개</option>
                  <option value="spoiler">⚠️ 스포일러</option>
                </select>
              )}
              <button style={styles.actionBtn} onClick={() => setDetailMemo(memo)}>자세히</button>
              {!isReadOnly && (
                <>
                  <button style={styles.actionBtn} onClick={() => startEdit(memo)}>수정</button>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(memo.id)}>삭제</button>
                </>
              )}
            </div>
          </div>
          <div style={{ ...styles.memoContent, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, whiteSpace: 'pre-wrap' }}>
            {memo.content}
          </div>
          {memo.imageUrl && <img src={memo.imageUrl} alt="" style={styles.memoImage} />}
          <div style={styles.memoMeta}>{new Date(memo.createdAt).toLocaleDateString()}</div>
        </>
      )}
    </div>
  );

  const renderOtherMemo = (memo: Memo) => {
    const vc = visibilityColor(memo.visibility || 'public');
    const isOwn = memo.userId === currentUserId;
    return (
      <div key={memo.id} style={styles.memoCard}>
        <div style={styles.memoHeader}>
          <span style={styles.memoRange}>p.{memo.pageStart} ~ p.{memo.pageEnd}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500, backgroundColor: vc.bg, color: vc.color }}>
              {visibilityLabel(memo.visibility || 'public')}
            </span>
            <span style={{ fontSize: 13, color: isOwn ? '#C8962E' : '#718096', fontWeight: isOwn ? 600 : 400 }}>
              {memo.authorNickname}{isOwn && ' (나)'}
            </span>
          </div>
        </div>
        {memo.isContentHidden ? (
          <div style={styles.hiddenMsg}>
            ⚠️ p.{memo.pageEnd}까지 읽은 후 열람할 수 있습니다
          </div>
        ) : (
          <>
            <div style={{ ...styles.memoContent, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, whiteSpace: 'pre-wrap' }}>
              {memo.content}
            </div>
            {memo.imageUrl && <img src={memo.imageUrl} alt="" style={styles.memoImage} />}
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={styles.memoMeta}>{new Date(memo.createdAt).toLocaleDateString()}</div>
          {!memo.isContentHidden && memo.content.length > 80 && (
            <button
              onClick={() => setDetailMemo(memo)}
              style={{ ...styles.actionBtn, fontSize: 11, color: '#C8962E', borderColor: '#E8DFD3' }}
            >
              자세히
            </button>
          )}
        </div>
      </div>
    );
  };

  // 모달 내용 렌더링
  const renderModalContent = () => {
    switch (activeModal) {
      case 'create':
        return (
          <>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>✏️ 메모 작성</div>
              <button style={styles.closeBtn} onClick={closeModal} aria-label="닫기">×</button>
            </div>
            <form onSubmit={handleSubmit} noValidate>
              {serverError && <div style={styles.serverError}>{serverError}</div>}
              <div style={styles.field}>
                <label style={{ ...styles.label, fontSize: 14, fontWeight: 600, color: '#3D2E1E', marginBottom: 8 }}>💭 이 생각이 나온 페이지</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" min="0" style={{ ...styles.input, width: 120, textAlign: 'center' as const, ...(formErrors.pageStart ? styles.inputError : {}) }} value={pageStart} onChange={(e) => setPageStart(e.target.value)} placeholder="시작 페이지" />
                  <span style={{ fontSize: 16, color: '#a0aec0', fontWeight: 500 }}>~</span>
                  <input type="number" min="0" style={{ ...styles.input, width: 120, textAlign: 'center' as const, ...(formErrors.pageEnd ? styles.inputError : {}) }} value={pageEnd} onChange={(e) => setPageEnd(e.target.value)} placeholder="끝 페이지" />
                </div>
                {formErrors.pageStart && <div style={styles.errorText}>{formErrors.pageStart}</div>}
                {formErrors.pageEnd && <div style={styles.errorText}>{formErrors.pageEnd}</div>}
              </div>
              <div style={styles.field}>
                <label style={styles.label}>내용</label>
                <textarea style={{ ...styles.textarea, ...(formErrors.content ? styles.inputError : {}) }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="메모 내용을 입력해주세요" />
                {formErrors.content && <div style={styles.errorText}>{formErrors.content}</div>}
              </div>
              <div style={styles.field}>
                <label style={styles.label}>이미지 첨부 (선택)</label>
                <label style={styles.fileButton}>
                  {memoImage ? '다른 이미지 선택' : '이미지 선택'}
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleMemoImageChange} style={{ display: 'none' }} />
                </label>
                <div style={styles.helpText}>{MEMO_IMAGE_HELP_TEXT}</div>
                {memoImage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    {memoImagePreview && <img src={memoImagePreview} alt="" style={styles.imagePreview} />}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#5C4A32', wordBreak: 'break-all' }}>{memoImage.name}</div>
                      <button type="button" onClick={clearMemoImage} style={{ ...styles.actionBtn, color: '#e53e3e', marginTop: 4 }}>삭제</button>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ ...styles.field, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 500 }}>공개 설정:</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as MemoVisibility)}
                    style={{ padding: '6px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 4 }}
                  >
                    <option value="private">🔒 비공개 (나만 보기)</option>
                    <option value="public">🔓 공개 (모두 열람)</option>
                    <option value="spoiler">⚠️ 스포일러 (해당 페이지 읽은 사람만)</option>
                  </select>
                </div>
                <button type="submit" style={{ ...styles.button, width: 'auto', padding: '10px 24px', ...(submitting ? styles.buttonDisabled : {}) }} disabled={submitting}>
                  {submitting ? '저장 중...' : '메모 저장'}
                </button>
              </div>
            </form>
          </>
        );

      case 'my':
        return (
          <>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>📒 내 메모 ({myMemos.length})</div>
              <button style={styles.closeBtn} onClick={closeModal} aria-label="닫기">×</button>
            </div>
            {myMemos.length > 0 && (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#5C4A32' }}>정렬:</label>
                <select
                  value={memoSort}
                  onChange={(e) => setMemoSort(e.target.value as SortOption)}
                  style={{ padding: '5px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="pageAsc">앞 페이지</option>
                  <option value="pageDesc">뒷 페이지</option>
                </select>
                <span style={{ width: 1, height: 20, backgroundColor: '#E8DFD3', margin: '0 4px' }} />
                {([['all', '전체'], ['private', '🔒 비공개'], ['public', '🔓 공개'], ['spoiler', '⚠️ 스포일러']] as [FilterOption, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMemoFilter(value)}
                    style={{
                      padding: '4px 10px', fontSize: 12, fontWeight: 500, borderRadius: 14, cursor: 'pointer',
                      border: memoFilter === value ? '1px solid #C8962E' : '1px solid #E8DFD3',
                      backgroundColor: memoFilter === value ? '#ebf4ff' : '#fff',
                      color: memoFilter === value ? '#C8962E' : '#718096',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {myMemos.length === 0
              ? <div style={styles.emptyState}>작성한 메모가 없습니다</div>
              : sortedMyMemos.map(renderMyMemo)}
          </>
        );

      case 'public':
        return (
          <>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>🔓 공개 메모 ({publicMemos.length})</div>
              <button style={styles.closeBtn} onClick={closeModal} aria-label="닫기">×</button>
            </div>
            {publicMemos.length > 0 && (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#5C4A32' }}>정렬:</label>
                <select
                  value={publicSort}
                  onChange={(e) => setPublicSort(e.target.value as SortOption)}
                  style={{ padding: '5px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="pageAsc">앞 페이지</option>
                  <option value="pageDesc">뒷 페이지</option>
                </select>
              </div>
            )}
            {publicMemos.length === 0
              ? <div style={styles.emptyState}>공개된 메모가 없습니다</div>
              : sortedPublicMemos.map(renderOtherMemo)}
          </>
        );

      case 'spoiler':
        return (
          <>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>⚠️ 스포일러 메모 ({spoilerMemos.length})</div>
              <button style={styles.closeBtn} onClick={closeModal} aria-label="닫기">×</button>
            </div>
            <div style={{ fontSize: 12, color: '#92400e', backgroundColor: '#fffbeb', padding: '8px 12px', borderRadius: 4, marginBottom: 12 }}>
              해당 페이지까지 읽어야 내용을 볼 수 있습니다
            </div>
            {spoilerMemos.length > 0 && (
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#5C4A32' }}>정렬:</label>
                <select
                  value={spoilerSort}
                  onChange={(e) => setSpoilerSort(e.target.value as SortOption)}
                  style={{ padding: '5px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="pageAsc">앞 페이지</option>
                  <option value="pageDesc">뒷 페이지</option>
                </select>
              </div>
            )}
            {spoilerMemos.length === 0
              ? <div style={styles.emptyState}>스포일러 메모가 없습니다</div>
              : sortedSpoilerMemos.map(renderOtherMemo)}
          </>
        );

      default:
        return null;
    }
  };

  if (loading) return <div style={styles.emptyState}>불러오는 중...</div>;

  return (
    <div style={styles.container}>
      <PageHeader />
      <Link to={`/groups/${groupId}`} style={styles.backLink}>← 모임으로</Link>
      <h1 style={styles.title}>📝 메모</h1>

      {groupInfo && (
        <div style={{ backgroundColor: '#FDF8F0', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          {groupInfo.book?.coverImageUrl && (
            <img src={groupInfo.book.coverImageUrl} alt="" style={{ width: 40, height: 56, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#3D2E1E' }}>{groupInfo.book?.title}</div>
            <div style={{ fontSize: 13, color: '#718096' }}>{groupInfo.name}</div>
          </div>
        </div>
      )}

      {/* 4개 메뉴 버튼 */}
      <div style={styles.buttonGrid}>
        <div
          style={{ ...styles.menuCard, borderColor: isReadOnly ? '#E8DFD3' : '#C8962E', ...(isReadOnly ? styles.buttonDisabled : {}) }}
          onClick={() => {
            if (isReadOnly) {
              showToast(readOnlyMessage || '독서기간 중에만 메모를 작성할 수 있습니다');
              return;
            }
            setActiveModal('create');
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            if (isReadOnly) {
              showToast(readOnlyMessage || '독서기간 중에만 메모를 작성할 수 있습니다');
              return;
            }
            setActiveModal('create');
          }}
        >
          <div style={styles.menuIcon}>✏️</div>
          <div style={styles.menuLabel}>메모 작성</div>
        </div>

        <div
          style={styles.menuCard}
          onClick={() => setActiveModal('my')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveModal('my')}
        >
          <div style={styles.menuIcon}>📒</div>
          <div style={styles.menuLabel}>내 메모</div>
          <div style={styles.menuCount}>{myMemos.length}개</div>
        </div>

        <div
          style={styles.menuCard}
          onClick={() => setActiveModal('public')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveModal('public')}
        >
          <div style={styles.menuIcon}>🔓</div>
          <div style={styles.menuLabel}>공개 메모</div>
          <div style={styles.menuCount}>{publicMemos.length}개</div>
        </div>

        <div
          style={styles.menuCard}
          onClick={() => setActiveModal('spoiler')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveModal('spoiler')}
        >
          <div style={styles.menuIcon}>⚠️</div>
          <div style={styles.menuLabel}>스포일러</div>
          <div style={styles.menuCount}>{spoilerMemos.length}개</div>
        </div>
      </div>

      {/* 모달 */}
      {activeModal && (
        <div style={styles.overlay} onClick={handleOverlayClick}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            {renderModalContent()}
          </div>
        </div>
      )}

      {/* 자세히 보기 모달 */}
      {detailMemo && (
        <div style={styles.overlay} onClick={() => setDetailMemo(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>📒 메모 상세</div>
              <button style={styles.closeBtn} onClick={() => setDetailMemo(null)} aria-label="닫기">×</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ ...styles.memoRange, fontSize: 15 }}>p.{detailMemo.pageStart} ~ p.{detailMemo.pageEnd}</span>
              <span style={{ marginLeft: 12, fontSize: 12, color: '#a0aec0' }}>
                {visibilityLabel(detailMemo.visibility || 'private')}
              </span>
            </div>
            <div style={{ fontSize: 14, color: '#5C4A32', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {detailMemo.content}
            </div>
            {detailMemo.imageUrl && <img src={detailMemo.imageUrl} alt="" style={{ ...styles.memoImage, marginTop: 12 }} />}
            <div style={{ ...styles.memoMeta, marginTop: 16 }}>
              {new Date(detailMemo.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemosPage;
