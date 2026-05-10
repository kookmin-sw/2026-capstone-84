import { useState, useEffect, type CSSProperties } from 'react';
import { readingStatusApi } from '../../api/readingStatus';
import type { ReadingStatus, ReadingStatusType, BookSearchResult } from '../../types';
import ReadingBookCard from './ReadingBookCard';
import BookSearchModal from './BookSearchModal';

type TabKey = ReadingStatusType;

interface TabInfo {
  key: TabKey;
  label: string;
}

const tabs: TabInfo[] = [
  { key: 'reading', label: '읽고 있는 책' },
  { key: 'completed', label: '읽은 책' },
  { key: 'want_to_read', label: '읽고 싶은 책' },
];

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid #f0f0f5',
    marginTop: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: '#2d3748',
  },
  addButton: {
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  tabRow: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid #e2e8f0',
    marginBottom: 16,
  },
  tab: {
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#718096',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: '#667eea',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    borderBottom: '2px solid #667eea',
  },
  count: {
    fontSize: 11,
    color: '#a0aec0',
    marginLeft: 4,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px 16px',
    color: '#a0aec0',
    fontSize: 14,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '24px 16px',
    color: '#a0aec0',
    fontSize: 14,
  },
};

function ReadingStatusTabs() {
  const [activeTab, setActiveTab] = useState<TabKey>('reading');
  const [items, setItems] = useState<ReadingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await readingStatusApi.list();
      setItems(res.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = items.filter((item) => item.status === activeTab);

  const getCount = (status: TabKey) => items.filter((item) => item.status === status).length;

  const handleStatusChange = async (id: string, newStatus: ReadingStatusType) => {
    try {
      await readingStatusApi.updateStatus(id, { status: newStatus });
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
    } catch {
      // 실패 시 무시
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await readingStatusApi.removeBook(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // 실패 시 무시
    }
  };

  const handleBookSelect = async (book: BookSearchResult) => {
    try {
      // Use isbn as bookId since that's how books are identified
      const res = await readingStatusApi.addBook({
        bookId: book.isbn,
        status: activeTab,
      });
      setItems((prev) => [...prev, res.data]);
    } catch {
      // 실패 시 무시 (중복 등)
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>📚 독서 상태</div>
        <button style={styles.addButton} onClick={() => setShowModal(true)}>
          + 책 추가
        </button>
      </div>

      <div style={styles.tabRow}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            style={activeTab === tab.key ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span style={styles.count}>({getCount(tab.key)})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}>불러오는 중...</div>
      ) : filteredItems.length === 0 ? (
        <div style={styles.emptyState}>
          이 카테고리에 등록된 책이 없습니다.
        </div>
      ) : (
        filteredItems.map((item) => (
          <ReadingBookCard
            key={item.id}
            item={item}
            onStatusChange={handleStatusChange}
            onRemove={handleRemove}
          />
        ))
      )}

      {showModal && (
        <BookSearchModal
          onSelect={handleBookSelect}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default ReadingStatusTabs;
