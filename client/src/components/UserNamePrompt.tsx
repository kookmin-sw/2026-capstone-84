import { useState } from 'react';

interface UserNamePromptProps {
  onSubmit: (name: string) => void;
  onBack?: () => void;
}

export default function UserNamePrompt({ onSubmit, onBack }: UserNamePromptProps) {
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
        <div
          role="alert"
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            padding: '12px',
            fontSize: '0.85rem',
            color: '#856404',
            marginBottom: '16px',
            textAlign: 'left',
          }}
        >
          게스트 계정은 현재 사용 중인 브라우저에서만 유지됩니다. 브라우저의 인터넷 사용 기록을 삭제하면 이전에 참여했던 대화방을 다시 찾을 수 없습니다. 대화 기록을 안전하게 보관하려면 회원가입을 권장합니다.
        </div>
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
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              color: '#333',
              fontSize: '1rem',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            로그인으로 돌아가기
          </button>
        )}
      </form>
    </div>
  );
}
