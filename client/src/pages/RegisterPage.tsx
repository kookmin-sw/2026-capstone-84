import { useState } from 'react';
import { Link } from 'react-router-dom';
import CredentialDisplay from '../components/CredentialDisplay';

interface RegisterPageProps {
  onRegister: (displayName: string, email: string) => Promise<{ generatedUsername: string; generatedPassword: string }>;
  onConfirmCredentials: () => void;
}

export default function RegisterPage({ onRegister, onConfirmCredentials }: RegisterPageProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'credentials'>('form');
  const [credentials, setCredentials] = useState<{ generatedUsername: string; generatedPassword: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('표시 이름을 입력해주세요');
      return;
    }
    if (!email.trim()) {
      setError('이메일을 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const result = await onRegister(displayName.trim(), email.trim());
      setCredentials(result);
      setStep('credentials');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '회원가입에 실패했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'credentials' && credentials) {
    return (
      <CredentialDisplay
        username={credentials.generatedUsername}
        password={credentials.generatedPassword}
        onConfirm={onConfirmCredentials}
      />
    );
  }

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
          <label htmlFor="email" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#333' }}>
            이메일
          </label>
          <input
            id="email"
            type="email"
            placeholder="이메일 입력"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
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
