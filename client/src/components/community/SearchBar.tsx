import { useState, type CSSProperties, type FormEvent } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear: () => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: 14,
    border: '2px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  clearButton: {
    padding: '10px 16px',
    backgroundColor: '#edf2f7',
    color: '#4a5568',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
};

function SearchBar({ onSearch, onClear }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <form onSubmit={handleSubmit} style={styles.container} role="search" aria-label="게시글 검색">
      <input
        type="text"
        style={styles.input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="책 제목, 작성자, 내용으로 검색..."
        aria-label="검색어 입력"
      />
      <button type="submit" style={styles.button}>
        검색
      </button>
      {query && (
        <button type="button" style={styles.clearButton} onClick={handleClear}>
          초기화
        </button>
      )}
    </form>
  );
}

export default SearchBar;
