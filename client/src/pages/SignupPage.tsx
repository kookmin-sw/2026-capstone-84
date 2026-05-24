import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import type { ApiError } from '../types';
import { AxiosError } from 'axios';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    width: 400,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    marginBottom: 4,
    fontSize: 14,
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 4,
    boxSizing: 'border-box' as const,
  },
  inputError: {
    borderColor: '#e53e3e',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 12,
    marginTop: 4,
  },
  serverError: {
    backgroundColor: '#fff5f5',
    color: '#e53e3e',
    padding: '10px 12px',
    borderRadius: 4,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  button: {
    width: '100%',
    padding: '12px 0',
    backgroundColor: '#4E342E',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  link: {
    display: 'block',
    textAlign: 'center' as const,
    marginTop: 16,
    fontSize: 14,
    color: '#C8962E',
  },
};

interface FormErrors {
  nickname?: string;
}

function validateForm(nickname: string): FormErrors {
  const errors: FormErrors = {};

  if (!nickname.trim()) {
    errors.nickname = '닉네임을 입력해주세요';
  }

  return errors;
}

function SignupPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [nicknameChecking, setNicknameChecking] = useState(false);

  const handleCheckNickname = async () => {
    if (!nickname.trim()) {
      setErrors((prev) => ({ ...prev, nickname: '닉네임을 입력해주세요' }));
      return;
    }
    setNicknameChecking(true);
    setNicknameAvailable(null);
    setErrors((prev) => ({ ...prev, nickname: undefined }));
    try {
      const res = await authApi.checkNickname(nickname);
      setNicknameAvailable(res.data.available);
      if (!res.data.available) {
        setErrors((prev) => ({ ...prev, nickname: '이미 사용 중인 닉네임입니다' }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, nickname: '중복 확인 중 오류가 발생했습니다' }));
    } finally {
      setNicknameChecking(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    const formErrors = validateForm(nickname);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setLoading(true);
    try {
      await authApi.signup({ nickname });
      navigate('/login');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr.response?.data?.error?.message || '회원가입에 실패했습니다';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>닉네임 만들기</h1>
        <form onSubmit={handleSubmit} noValidate>
          {serverError && <div style={styles.serverError}>{serverError}</div>}

          <div style={styles.field}>
            <label style={styles.label} htmlFor="nickname">닉네임</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="nickname"
                type="text"
                style={{ ...styles.input, flex: 1, ...(errors.nickname ? styles.inputError : {}) }}
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setNicknameAvailable(null);
                  setErrors((prev) => ({ ...prev, nickname: undefined }));
                }}
                placeholder="닉네임"
              />
              <button
                type="button"
                onClick={handleCheckNickname}
                disabled={nicknameChecking}
                style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: nicknameChecking ? '#a0aec0' : '#C8962E',
                  border: 'none',
                  borderRadius: 4,
                  cursor: nicknameChecking ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {nicknameChecking ? '확인 중...' : '중복확인'}
              </button>
            </div>
            {errors.nickname && <div style={styles.errorText}>{errors.nickname}</div>}
            {nicknameAvailable && <div style={{ color: '#38a169', fontSize: 12, marginTop: 4 }}>사용 가능한 닉네임입니다</div>}
          </div>

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? '생성 중...' : '닉네임 생성'}
          </button>
        </form>

        <Link to="/login" style={styles.link}>
          이미 닉네임이 있으신가요? 로그인
        </Link>
      </div>
    </div>
  );
}

export default SignupPage;
