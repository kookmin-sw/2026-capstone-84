import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReadingStatus, ReadingStatusType } from '../../types';

interface ReadingBookCardProps {
  item: ReadingStatus;
  onStatusChange: (id: string, status: ReadingStatusType) => void;
  onRemove: (id: string) => void;
}

const statusLabels: Record<ReadingStatusType, string> = {
  reading: '읽는 책',
  completed: '읽은 책',
  want_to_read: '읽을 책',
};

const styles: Record<string, CSSProperties> = {
  card: {
    display: 'flex',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    border: '1px solid #f0f0f5',
    marginBottom: 8,
    alignItems: 'center',
  },
  cover: {
    width: 48,
    height: 68,
    borderRadius: 4,
    objectFit: 'cover' as const,
    backgroundColor: '#f7fafc',
    flexShrink: 0,
  },
  coverPlaceholder: {
    width: 48,
    height: 68,
    borderRadius: 4,
    backgroundColor: '#f7fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1a202c',
    marginBottom: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  author: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 6,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    backgroundColor: '#fff',
    cursor: 'pointer',
    color: '#4a5568',
  },
  select: {
    padding: '4px 8px',
    fontSize: 12,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    backgroundColor: '#fff',
    color: '#4a5568',
    cursor: 'pointer',
    outline: 'none',
  },
  removeButton: {
    padding: '4px 8px',
    fontSize: 12,
    color: '#e53e3e',
    backgroundColor: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 500,
  },
};

function ReadingBookCard({ item, onStatusChange, onRemove }: ReadingBookCardProps) {
  const navigate = useNavigate();

  return (
    <div style={styles.card}>
      {item.book?.coverImageUrl ? (
        <img src={item.book.coverImageUrl} alt={item.book.title} style={styles.cover} />
      ) : (
        <div style={styles.coverPlaceholder}>📖</div>
      )}
      <div style={styles.info}>
        <div style={styles.title}>{item.book?.title || '제목 없음'}</div>
        <div style={styles.author}>{item.book?.author || '저자 미상'}</div>
        <div style={styles.actions}>
          <button style={styles.actionBtn} onClick={() => navigate(`/reading/${item.id}`)}>
            📝 독서 기록
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <select
          style={styles.select}
          value={item.status}
          onChange={(e) => onStatusChange(item.id, e.target.value as ReadingStatusType)}
          aria-label="독서 상태 변경"
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button
          style={styles.removeButton}
          onClick={() => onRemove(item.id)}
          aria-label="책 제거"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

export default ReadingBookCard;
