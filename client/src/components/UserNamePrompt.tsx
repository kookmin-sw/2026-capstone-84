import { useState } from 'react';

interface UserNamePromptProps {
  onSubmit: (name: string) => void;
}

export default function UserNamePrompt({ onSubmit }: UserNamePromptProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('이름을 입력해주세요.');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: '#fff',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minWidth: '320px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>대화방에 오신 것을 환영합니다</h2>
        <p style={{ color: '#666', marginBottom: '20px', fontSize: '0.9rem' }}>
          사용할 이름을 입력해주세요.
        </p>
        <input
          type="text"
          placeholder="이름 입력"
          aria-label="사용자 이름"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError('');
          }}
          autoFocus
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '1rem',
            boxSizing: 'border-box',
            marginBottom: '12px',
          }}
        />
        {error && (
          <p role="alert" style={{ color: '#d9534f', margin: '0 0 12px 0', fontSize: '0.85rem' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#4a90d9',
            color: '#fff',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          시작하기
        </button>
      </form>
    </div>
  );
}
