import { useState, type CSSProperties, type FormEvent } from 'react';
import { booksApi } from '../../api/books';
import type { BookSearchResult, ReadingStatusType } from '../../types';

interface BookSearchModalProps {
  onSelect: (book: BookSearchResult, status: ReadingStatusType) => void;
  onClose: () => void;
  defaultStatus?: ReadingStatusType;
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a202c',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    color: '#a0aec0',
    padding: 4,
  },
  searchForm: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  searchButton: {
    padding: '10px 18px',
    backgroundColor: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  resultList: {
    flex: 1,
    overflowY: 'auto' as const,
    minHeight: 0,
  },
  resultItem: {
    display: 'flex',
    gap: 12,
    padding: '12px',
    borderRadius: 8,
    cursor: 'pointer',
    border: '1px solid #f0f0f5',
    marginBottom: 8,
    transition: 'background-color 0.15s',
  },
  bookCover: {
    width: 48,
    height: 68,
    objectFit: 'cover' as const,
    borderRadius: 4,
    flexShrink: 0,
    backgroundColor: '#f7fafc',
  },
  bookInfo: {
    flex: 1,
    minWidth: 0,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1a202c',
    marginBottom: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#718096',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px 16px',
    color: '#a0aec0',
    fontSize: 14,
  },
  loading: {
    textAlign: 'center' as const,
    padding: '32px 16px',
    color: '#a0aec0',
    fontSize: 14,
  },
};

function BookSearchModal({ onSelect, onClose, defaultStatus = 'reading' }: BookSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatusType>(defaultStatus);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await booksApi.search(trimmed);
      setResults(res.data || []);
    } catch (err) {
      console.error('Book search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (book: BookSearchResult) => {
    onSelect(book, selectedStatus);
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="책 검색">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>📚 책 검색</h2>
          <button style={styles.closeButton} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <form style={styles.searchForm} onSubmit={handleSearch}>
          <input
            style={styles.searchInput}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="책 제목을 입력하세요"
            autoFocus
          />
          <button style={styles.searchButton} type="submit">
            검색
          </button>
        </form>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#4a5568', marginRight: 8 }}>추가할 상태:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ReadingStatusType)}
            style={{ padding: '6px 10px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none' }}
          >
            <option value="reading">읽는 책</option>
            <option value="completed">읽은 책</option>
            <option value="want_to_read">읽을 책</option>
          </select>
        </div>

        <div style={styles.resultList}>
          {loading ? (
            <div style={styles.loading}>검색 중...</div>
          ) : results.length === 0 && searched ? (
            <div style={styles.emptyState}>검색 결과가 없습니다</div>
          ) : (
            results.map((book, idx) => (
              <div
                key={`${book.isbn}-${idx}`}
                style={styles.resultItem}
                onClick={() => handleSelect(book)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(book)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f7fafc';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
                }}
              >
                {book.coverImageUrl && (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    style={styles.bookCover}
                  />
                )}
                <div style={styles.bookInfo}>
                  <div style={styles.bookTitle}>{book.title}</div>
                  <div style={styles.bookAuthor}>{book.author}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default BookSearchModal;
