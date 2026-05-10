import type { CSSProperties } from 'react';

export interface CategoryOption {
  key: string;
  label: string;
}

export const CATEGORIES: CategoryOption[] = [
  { key: 'all', label: '전체' },
  { key: 'korean_novel', label: '한국 소설' },
  { key: 'western_novel', label: '영미 소설' },
  { key: 'japanese_novel', label: '일본 소설' },
  { key: 'essay', label: '에세이' },
  { key: 'self_help', label: '자기계발' },
  { key: 'humanities', label: '인문학' },
  { key: 'science', label: '과학' },
  { key: 'history', label: '역사' },
  { key: 'poetry', label: '시/시집' },
  { key: 'other', label: '기타' },
];

interface CategoryTabsProps {
  selected: string;
  onSelect: (category: string) => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  tab: {
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#4a5568',
    transition: 'all 0.2s',
  },
  tabActive: {
    padding: '8px 16px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid #667eea',
    backgroundColor: '#667eea',
    color: '#fff',
    transition: 'all 0.2s',
  },
};

function CategoryTabs({ selected, onSelect }: CategoryTabsProps) {
  return (
    <div style={styles.container} role="tablist" aria-label="카테고리 필터">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          style={selected === cat.key ? styles.tabActive : styles.tab}
          onClick={() => onSelect(cat.key)}
          role="tab"
          aria-selected={selected === cat.key}
          aria-label={cat.label}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

export default CategoryTabs;
