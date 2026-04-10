import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ReissuePage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('이메일을 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reissue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `재발급 실패: ${res.status}`);
      }
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '재발급에 실패했습니다';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f5f5f5' }}>
      <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: '320px', textAlign: 'center' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>자격증명 재발급</h2>

        {success ? (
          <>
            <p style={{ backgroundColor: '#d4edda', color: '#155724', padding: '12px', borderRadius: '4px', fontSize: '0.9rem', marginBottom: '16px' }}>
              입력하신 이메일로 새 자격증명을 발송했습니다
            </p>
            <Link to="/" style={{ color: '#4a90d9', textDecoration: 'none', fontSize: '0.85rem' }}>
              로그인으로 돌아가기
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#333' }}>이메일</label>
              <input id="email" type="email" placeholder="가입 시 입력한 이메일" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoFocus style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem', boxSizing: 'border-box' }} />
            </div>
            {error && <p role="alert" style={{ color: '#d9534f', margin: '0 0 12px 0', fontSize: '0.85rem' }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#4a90d9', color: '#fff', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '12px' }}>
              {loading ? '발송 중...' : '재발급 요청'}
            </button>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              <Link to="/" style={{ color: '#4a90d9', textDecoration: 'none' }}>로그인으로 돌아가기</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
