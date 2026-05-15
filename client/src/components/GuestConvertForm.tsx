import { useState } from 'react';
import CredentialDisplay from './CredentialDisplay';

interface GuestConvertFormProps {
  currentDisplayName: string;
  onConvert: (displayName: string, email: string) => Promise<{ generatedUsername: string; generatedPassword: string }>;
  onClose: () => void;
}

export default function GuestConvertForm({ currentDisplayName, onConvert, onClose }: GuestConvertFormProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ generatedUsername: string; generatedPassword: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!displayName.trim()) { setError('표시 이름을 입력해주세요'); return; }
    if (!email.trim()) { setError('이메일을 입력해주세요'); return; }

    setLoading(true);
    try {
      const result = await onConvert(displayName.trim(), email.trim());
      setCredentials(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '회원전환에 실패했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (credentials) {
    return (
      <CredentialDisplay
        username={credentials.generatedUsername}
        password={credentials.generatedPassword}
        onConfirm={onClose}
      />
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', minWidth: '320px', textAlign: 'center' }}>
        <h2 style={{ marginTop: 0, marginBottom: '8px' }}>회원전환</h2>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '24px' }}>회원이 되면 다른 브라우저에서도 같은 계정으로 접속할 수 있습니다.</p>

        <div style={{ textAlign: 'left', marginBottom: '12px' }}>
          <label htmlFor="convertDisplayName" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#333' }}>표시 이름</label>
          <input id="convertDisplayName" type="text" placeholder="표시 이름 입력" value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }} />
        </div>

        <div style={{ textAlign: 'left', marginBottom: '16px' }}>
          <label htmlFor="convertEmail" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#333' }}>이메일</label>
          <input id="convertEmail" type="email" placeholder="이메일 입력" value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }} />
        </div>

        {error && <p role="alert" style={{ color: '#d9534f', margin: '0 0 12px 0', fontSize: '0.85rem' }}>{error}</p>}

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#4a90d9', color: '#fff', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '8px' }}>
          {loading ? '전환 중...' : '회원전환'}
        </button>
        <button type="button" onClick={onClose}
          style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', color: '#333', fontSize: '1rem', cursor: 'pointer' }}>
          취소
        </button>
      </form>
    </div>
  );
}
