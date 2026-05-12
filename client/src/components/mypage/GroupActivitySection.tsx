import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GroupCard } from '../../types';

interface GroupActivitySectionProps {
  groups: GroupCard[];
}

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid #f0f0f5',
    marginTop: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: '#2d3748',
    marginBottom: 16,
  },
  groupItem: {
    display: 'flex',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
    alignItems: 'center',
  },
  cover: {
    width: 40,
    height: 56,
    borderRadius: 4,
    objectFit: 'cover' as const,
    backgroundColor: '#f7fafc',
    flexShrink: 0,
  },
  coverPlaceholder: {
    width: 40,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#f7fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  groupName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1a202c',
    marginBottom: 2,
  },
  bookTitle: {
    fontSize: 12,
    color: '#667eea',
    marginBottom: 6,
  },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 5,
    backgroundColor: '#edf2f7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    borderRadius: 3,
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: 11,
    color: '#a0aec0',
    whiteSpace: 'nowrap' as const,
  },
  links: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  linkButton: {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    color: '#667eea',
    backgroundColor: '#ebf4ff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '24px 16px',
    color: '#a0aec0',
    fontSize: 14,
  },
};

function GroupActivitySection({ groups }: GroupActivitySectionProps) {
  const navigate = useNavigate();

  if (groups.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>💬 독서토론 그룹 활동</div>
        <div style={styles.emptyState}>참여 중인 독서토론 그룹이 없습니다.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>💬 독서토론 그룹 활동</div>
      {groups.map((g: any) => (
        <div key={g.id} style={styles.groupItem}>
          {g.book?.coverImageUrl ? (
            <img src={g.book.coverImageUrl} alt="" style={styles.cover} />
          ) : (
            <div style={styles.coverPlaceholder}>📖</div>
          )}
          <div style={styles.info}>
            <div style={styles.groupName}>{g.name}</div>
            <div style={styles.bookTitle}>{g.book?.title || '제목 없음'}</div>
            <div style={styles.progressRow}>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${Math.min(g.readingProgress || 0, 100)}%`,
                  }}
                />
              </div>
              <span style={styles.progressText}>p.{g.readingProgress || 0}</span>
            </div>
          </div>
          <div style={styles.links}>
            <button
              style={styles.linkButton}
              onClick={() => navigate(`/groups/${g.id}`)}
            >
              그룹
            </button>
            <button
              style={styles.linkButton}
              onClick={() => navigate(`/groups/${g.id}/memos`)}
            >
              메모
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default GroupActivitySection;
