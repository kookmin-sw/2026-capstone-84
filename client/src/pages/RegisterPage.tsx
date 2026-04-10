import { useState } from 'react';
import { Link } from 'react-router-dom';

interface RegisterPageProps {
  onRegister: (username: string, password: string, displayName: string) => Promise<void>;
}

export default function RegisterPage({ onRegister }: RegisterPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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
    if (!displayName.trim()) {
      setError('표시 이름을 입력해주세요');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    setLoading(true);
    try {
      await onRegister(username.trim(), password, displayName.trim());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '회원가입에 실패했습니다';
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
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>회원가입</h2>

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

        <div style={{ textAlign: 'left', marginBottom: '12px' }}>
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

        <div style={{ textAlign: 'left', marginBottom: '12px' }}>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#333' }}>
            비밀번호 확인
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="비밀번호 다시 입력"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
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

        <div style={{ textAlign: 'left', marginBottom: '16px' }}>
          <label htmlFor="displayName" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#333' }}>
            표시 이름
          </label>
          <input
            id="displayName"
            type="text"
            placeholder="표시 이름 입력"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
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
          {loading ? '가입 중...' : '회원가입'}
        </button>

        <p style={{ margin: 0, fontSize: '0.85rem' }}>
          이미 계정이 있으신가요?{' '}
          <Link to="/" style={{ color: '#4a90d9', textDecoration: 'none' }}>
            로그인으로 돌아가기
          </Link>
        </p>
      </form>
    </div>
  );
}
