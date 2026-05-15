import { useState } from 'react';

interface CredentialDisplayProps {
  username: string;
  password: string;
  onConfirm: () => void;
}

export default function CredentialDisplay({ username, password, onConfirm }: CredentialDisplayProps) {
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  const handleCopy = async (text: string, field: 'username' | 'password') => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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
      <div
        style={{
          backgroundColor: '#fff',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minWidth: '320px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '24px' }}>발급된 자격증명</h2>

        <p
          style={{
            backgroundColor: '#fff3cd',
            color: '#856404',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '0.85rem',
            marginBottom: '24px',
          }}
        >
          이 정보는 다시 표시되지 않습니다. 안전한 곳에 보관해주세요.
        </p>

        <div style={{ textAlign: 'left', marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#333' }}>
            아이디
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={username}
              readOnly
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '1rem',
                boxSizing: 'border-box',
                backgroundColor: '#f9f9f9',
              }}
            />
            <button
              type="button"
              onClick={() => handleCopy(username, 'username')}
              style={{
                padding: '10px 14px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                color: '#333',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {copiedField === 'username' ? '복사됨' : '복사'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: '#333' }}>
            비밀번호
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={password}
              readOnly
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '1rem',
                boxSizing: 'border-box',
                backgroundColor: '#f9f9f9',
              }}
            />
            <button
              type="button"
              onClick={() => handleCopy(password, 'password')}
              style={{
                padding: '10px 14px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                color: '#333',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {copiedField === 'password' ? '복사됨' : '복사'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onConfirm}
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
          확인했습니다
        </button>
      </div>
    </div>
  );
}
