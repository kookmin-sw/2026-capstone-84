import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { readingStatusApi } from '../api/readingStatus';
import { useAuthStore } from '../stores/authStore';
import type { ReadingStatus, ReadingMemo, ProgressLog } from '../types';

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 700, margin: '0 auto', padding: '24px 16px' },
  backLink: { display: 'inline-block', marginBottom: 16, fontSize: 14, color: '#667eea', fontWeight: 500, textDecoration: 'none' },
  bookHeader: {
    display: 'flex', gap: 16, backgroundColor: '#fff', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f5', marginBottom: 20,
  },
  cover: { width: 80, height: 112, borderRadius: 6, objectFit: 'cover' as const, backgroundColor: '#f7fafc', flexShrink: 0 },
  coverPlaceholder: { width: 80, height: 112, borderRadius: 6, backgroundColor: '#f7fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 },
  bookTitle: { fontSize: 18, fontWeight: 700, color: '#1a202c', marginBottom: 4 },
  bookAuthor: { fontSize: 13, color: '#718096', marginBottom: 12 },
  section: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f0f0f5', marginBottom: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#2d3748', marginBottom: 12 },
  tabRow: { display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', marginBottom: 16 },
  tab: { padding: '10px 20px', fontSize: 14, fontWeight: 500, color: '#718096', cursor: 'pointer', border: 'none', background: 'none', borderBottom: '2px solid transparent' },
  tabActive: { padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#667eea', cursor: 'pointer', border: 'none', background: 'none', borderBottom: '2px solid #667eea' },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' as const, outline: 'none' },
  textarea: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, boxSizing: 'border-box' as const, outline: 'none', minHeight: 80, resize: 'vertical' as const, fontFamily: 'inherit' },
  submitBtn: { padding: '8px 18px', fontSize: 13, fontWeight: 600, backgroundColor: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  memoItem: { padding: '14px 0', borderBottom: '1px solid #f0f0f0' },
  memoContent: { fontSize: 14, color: '#2d3748', lineHeight: 1.6, marginBottom: 6 },
  memoMeta: { fontSize: 12, color: '#a0aec0', display: 'flex', alignItems: 'center', gap: 8 },
  deleteBtn: { background: 'none', border: 'none', color: '#e53e3e', fontSize: 12, cursor: 'pointer', fontWeight: 500 },
  logItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13, color: '#4a5568' },
  emptyState: { textAlign: 'center' as const, padding: '32px 16px', color: '#a0aec0', fontSize: 14 },
  loading: { textAlign: 'center' as const, padding: '60px 20px', color: '#a0aec0' },
};

function ReadingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [tab, setTab] = useState<'progress' | 'memo'>('progress');
  const [status, setStatus] = useState<ReadingStatus | null>(null);
  const [memos, setMemos] = useState<ReadingMemo[]>([]);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [loading, setLoading] = useState(true);

  // 진행도 상태
  const [pageInput, setPageInput] = useState('');
  const [pageSaving, setPageSaving] = useState(false);

  // 메모 상태
  const [newMemo, setNewMemo] = useState('');
  const [memoPage, setMemoPage] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) { navigate('/login'); return; }
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const listRes = await readingStatusApi.list();
      const found = (listRes.data || []).find((item) => item.id === id);
      if (!found) { navigate('/mypage'); return; }
      setStatus(found);
      setPageInput(String(found.currentPage || 0));

      const [memosRes, logsRes] = await Promise.all([
        readingStatusApi.getMemos(id),
        readingStatusApi.getProgressLogs(id),
      ]);
      setMemos(memosRes.data || []);
      setProgressLogs(logsRes.data || []);
    } catch {
      navigate('/mypage');
    } finally {
      setLoading(false);
    }
  };

  const handlePageSave = async () => {
    if (!id) return;
    const page = parseInt(pageInput);
    if (isNaN(page) || page < 0) return;
    setPageSaving(true);
    try {
      await readingStatusApi.updatePage(id, page);
      setStatus((prev) => prev ? { ...prev, currentPage: page } : prev);
      // 이력에 추가
      setProgressLogs((prev) => [
        { id: Date.now().toString(), readingStatusId: id, userId: '', page, createdAt: new Date().toISOString() },
        ...prev,
      ]);
    } catch { /* ignore */ }
    finally { setPageSaving(false); }
  };

  const handleMemoSubmit = async () => {
    if (!id || !newMemo.trim()) return;
    setMemoSaving(true);
    try {
      const res = await readingStatusApi.createMemo(id, {
        content: newMemo.trim(),
        pageNumber: memoPage ? parseInt(memoPage) : undefined,
      });
      setMemos((prev) => [res.data, ...prev]);
      setNewMemo('');
      setMemoPage('');
    } catch { /* ignore */ }
    finally { setMemoSaving(false); }
  };

  const handleMemoDelete = async (memoId: string) => {
    if (!id) return;
    try {
      await readingStatusApi.deleteMemo(id, memoId);
      setMemos((prev) => prev.filter((m) => m.id !== memoId));
    } catch { /* ignore */ }
  };

  if (loading) return <div style={styles.loading}>불러오는 중...</div>;
  if (!status) return null;

  return (
    <div style={styles.container}>
      <Link to="/mypage" style={styles.backLink}>← 마이페이지</Link>

      {/* 책 정보 헤더 */}
      <div style={styles.bookHeader}>
        {status.book?.coverImageUrl ? (
          <img src={status.book.coverImageUrl} alt={status.book.title} style={styles.cover} />
        ) : (
          <div style={styles.coverPlaceholder}>📖</div>
        )}
        <div>
          <div style={styles.bookTitle}>{status.book?.title || '제목 없음'}</div>
          <div style={styles.bookAuthor}>{status.book?.author || '저자 미상'}</div>
          <div style={{ fontSize: 13, color: '#667eea', fontWeight: 600 }}>
            현재 p.{status.currentPage || 0}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div style={styles.tabRow}>
        <button style={tab === 'progress' ? styles.tabActive : styles.tab} onClick={() => setTab('progress')}>
          📊 진행도
        </button>
        <button style={tab === 'memo' ? styles.tabActive : styles.tab} onClick={() => setTab('memo')}>
          📝 메모 ({memos.length})
        </button>
      </div>

      {/* 진행도 탭 */}
      {tab === 'progress' && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>읽은 페이지 업데이트</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
            <input
              type="number"
              min="0"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              style={{ ...styles.input, width: 120 }}
              placeholder="페이지 번호"
            />
            <button style={styles.submitBtn} onClick={handlePageSave} disabled={pageSaving}>
              {pageSaving ? '저장 중...' : '저장'}
            </button>
          </div>

          {/* 진행도 이력 */}
          <div style={styles.sectionTitle}>진행 이력</div>
          {progressLogs.length === 0 ? (
            <div style={styles.emptyState}>아직 기록이 없습니다</div>
          ) : (
            progressLogs.map((log) => (
              <div key={log.id} style={styles.logItem}>
                <span>p.{log.page}</span>
                <span style={{ color: '#a0aec0' }}>
                  {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* 메모 탭 */}
      {tab === 'memo' && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>독서 메모</div>

          {/* 메모 작성 */}
          <div style={{ marginBottom: 20 }}>
            <textarea
              style={styles.textarea}
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="메모를 입력하세요..."
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <input
                type="number"
                min="0"
                value={memoPage}
                onChange={(e) => setMemoPage(e.target.value)}
                style={{ ...styles.input, width: 100 }}
                placeholder="p. (선택)"
              />
              <button
                style={styles.submitBtn}
                onClick={handleMemoSubmit}
                disabled={memoSaving || !newMemo.trim()}
              >
                {memoSaving ? '저장 중...' : '메모 추가'}
              </button>
            </div>
          </div>

          {/* 메모 목록 */}
          {memos.length === 0 ? (
            <div style={styles.emptyState}>작성한 메모가 없습니다</div>
          ) : (
            memos.map((memo) => (
              <div key={memo.id} style={styles.memoItem}>
                <div style={styles.memoContent}>{memo.content}</div>
                <div style={styles.memoMeta}>
                  {memo.pageNumber != null && <span>p.{memo.pageNumber}</span>}
                  <span>{new Date(memo.createdAt).toLocaleDateString()}</span>
                  <button style={styles.deleteBtn} onClick={() => handleMemoDelete(memo.id)}>
                    삭제
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ReadingDetailPage;
