import { useState } from 'react';
import { Link } from 'react-router-dom';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onGuestClick: () => void;
}

export default function LoginPage({ onLogin, onGuestClick }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('아이디를 입력해주세요');
      return;
    }
    if (!password) {
      setError('비밀번호를 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '로그인에 실패했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
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
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>로그인</h2>

        <div style={{ textAlign: 'left', marginBottom: '12px' }}>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#333' }}>
            아이디
          </label>
          <input
            id="username"
            type="text"
            placeholder="아이디 입력"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
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
            }}
          />
        </div>

        <div style={{ textAlign: 'left', marginBottom: '16px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#333' }}>
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <p role="alert" style={{ color: '#d9534f', margin: '0 0 12px 0', fontSize: '0.85rem' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#4a90d9',
            color: '#fff',
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginBottom: '12px',
          }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem' }}>
          계정이 없으신가요?{' '}
          <Link to="/register" style={{ color: '#4a90d9', textDecoration: 'none' }}>
            회원가입
          </Link>
        </p>

        <button
          type="button"
          onClick={onGuestClick}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: '#fff',
            color: '#333',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          게스트로 이용하기
        </button>
      </form>
    </div>
  );
}
