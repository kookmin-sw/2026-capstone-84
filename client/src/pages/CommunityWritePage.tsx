import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityApi } from '../api/community';
import { useAuthStore } from '../stores/authStore';
import { CATEGORIES } from '../components/community/CategoryTabs';
import BookSearchModal from '../components/mypage/BookSearchModal';
import type { BookSearchResult } from '../types';

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a202c',
    marginBottom: 24,
    letterSpacing: '-0.3px',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
    color: '#4a5568',
    marginBottom: 8,
  },
  required: {
    color: '#e53e3e',
    marginLeft: 4,
  },
  bookSelectButton: {
    width: '100%',
    padding: '12px 16px',
    fontSize: 14,
    border: '2px solid #e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    color: '#a0aec0',
    cursor: 'pointer',
    textAlign: 'left' as const,
    boxSizing: 'border-box' as const,
  },
  bookSelected: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    border: '2px solid #667eea',
    borderRadius: 8,
    backgroundColor: '#f7fafc',
    cursor: 'pointer',
  },
  bookCover: {
    width: 40,
    height: 56,
    objectFit: 'cover' as const,
    borderRadius: 4,
    flexShrink: 0,
  },
  bookInfo: {
    flex: 1,
    minWidth: 0,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1a202c',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  textarea: {
    width: '100%',
    minHeight: 200,
    padding: '12px 16px',
    fontSize: 14,
    border: '2px solid #e2e8f0',
    borderRadius: 8,
    resize: 'vertical' as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
    lineHeight: 1.6,
    fontFamily: 'inherit',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '2px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '2px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  errorText: {
    fontSize: 12,
    color: '#e53e3e',
    marginTop: 6,
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    marginTop: 24,
  },
  submitButton: {
    flex: 1,
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(102,126,234,0.25)',
  },
  submitButtonDisabled: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#e2e8f0',
    color: '#a0aec0',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

function CommunityWritePage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
  const [content, setContent] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [category, setCategory] = useState('');
  const [showBookModal, setShowBookModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<{ book?: string; content?: string }>({});

  // Redirect if not logged in
  if (!accessToken) {
    navigate('/login');
    return null;
  }

  const validate = (): boolean => {
    const newErrors: { book?: string; content?: string } = {};
    if (!selectedBook) {
      newErrors.book = '책을 선택해주세요';
    }
    if (!content.trim()) {
      newErrors.content = '글 내용을 입력해주세요';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (submitting) return;

    setSubmitting(true);
    try {
      await communityApi.createPost({
        bookId: selectedBook!.isbn,
        content: content.trim(),
        pageNumber: pageNumber ? parseInt(pageNumber, 10) : undefined,
        category: category || undefined,
      });
      navigate('/community');
    } catch (err) {
      console.error('Failed to create post:', err);
      alert('게시글 작성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookSelect = (book: BookSearchResult) => {
    setSelectedBook(book);
    setErrors((prev) => ({ ...prev, book: undefined }));
  };

  // Filter out 'all' from categories for the dropdown
  const categoryOptions = CATEGORIES.filter((c) => c.key !== 'all');

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>✏️ 글 작성</h1>

      <form onSubmit={handleSubmit}>
        {/* Book Selection */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            책 선택<span style={styles.required}>*</span>
          </label>
          {selectedBook ? (
            <div
              style={styles.bookSelected}
              onClick={() => setShowBookModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setShowBookModal(true)}
            >
              {selectedBook.coverImageUrl && (
                <img
                  src={selectedBook.coverImageUrl}
                  alt={selectedBook.title}
                  style={styles.bookCover}
                />
              )}
              <div style={styles.bookInfo}>
                <div style={styles.bookTitle}>{selectedBook.title}</div>
                <div style={styles.bookAuthor}>{selectedBook.author}</div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              style={styles.bookSelectButton}
              onClick={() => setShowBookModal(true)}
            >
              📚 책을 검색하여 선택하세요
            </button>
          )}
          {errors.book && <div style={styles.errorText}>{errors.book}</div>}
        </div>

        {/* Content */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            내용<span style={styles.required}>*</span>
          </label>
          <textarea
            style={styles.textarea}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target.value.trim()) {
                setErrors((prev) => ({ ...prev, content: undefined }));
              }
            }}
            placeholder="책에 대한 감상이나 의견을 자유롭게 작성해주세요"
          />
          {errors.content && <div style={styles.errorText}>{errors.content}</div>}
        </div>

        {/* Page Number */}
        <div style={styles.formGroup}>
          <label style={styles.label}>페이지 번호 (선택)</label>
          <input
            type="number"
            style={styles.input}
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            placeholder="해당 페이지 번호를 입력하세요"
            min={1}
          />
        </div>

        {/* Category */}
        <div style={styles.formGroup}>
          <label style={styles.label}>카테고리 (선택)</label>
          <select
            style={styles.select}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">카테고리를 선택하세요 (미선택 시 AI가 자동 분류)</option>
            {categoryOptions.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div style={styles.buttonRow}>
          <button
            type="button"
            style={styles.cancelButton}
            onClick={() => navigate('/community')}
          >
            취소
          </button>
          <button
            type="submit"
            style={submitting ? styles.submitButtonDisabled : styles.submitButton}
            disabled={submitting}
          >
            {submitting ? '작성 중...' : '게시글 작성'}
          </button>
        </div>
      </form>

      {/* Book Search Modal */}
      {showBookModal && (
        <BookSearchModal
          onSelect={handleBookSelect}
          onClose={() => setShowBookModal(false)}
        />
      )}
    </div>
  );
}

export default CommunityWritePage;
