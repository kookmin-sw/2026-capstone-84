import type { CSSProperties } from 'react';
import { useSpoilerStore } from '../../stores/spoilerStore';
import { useAuthStore } from '../../stores/authStore';

type SpoilerFilterMode = 'off' | 'hide_completely' | 'hide_content';

interface SpoilerFilterProps {
  onFilterChange?: () => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
    marginRight: 8,
  },
  select: {
    padding: '6px 12px',
    fontSize: 13,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    backgroundColor: '#fff',
    color: '#4a5568',
    cursor: 'pointer',
    outline: 'none',
  },
};

const filterOptions: { value: SpoilerFilterMode; label: string }[] = [
  { value: 'off', label: '끄기' },
  { value: 'hide_completely', label: '완전 숨김' },
  { value: 'hide_content', label: '내용만 숨김' },
];

function SpoilerFilter({ onFilterChange }: SpoilerFilterProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { mode, updateSetting } = useSpoilerStore();

  // 비회원에게 미표시
  if (!accessToken) {
    return null;
  }

  const handleChange = async (newMode: SpoilerFilterMode) => {
    await updateSetting(newMode);
    onFilterChange?.();
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>🔒 스포일러 필터:</span>
      <select
        style={styles.select}
        value={mode}
        onChange={(e) => handleChange(e.target.value as SpoilerFilterMode)}
        aria-label="스포일러 필터 설정"
      >
        {filterOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SpoilerFilter;
