import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { mypageApi } from '../api/mypage';
import { useAuthStore } from '../stores/authStore';
import type { ApiError } from '../types';
import { AxiosError } from 'axios';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#FDF8F0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 36,
    width: 400,
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    border: '1px solid #E8DFD3',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    textAlign: 'center' as const,
    marginBottom: 8,
    letterSpacing: '-0.5px',
    color: '#3D2E1E',
  },
  description: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
    fontSize: 13,
    color: '#718096',
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
  helpIcon: {
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: '#FFF8E7',
    color: '#C8962E',
    border: '1px solid #E8DFD3',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'help',
    flexShrink: 0,
  },
  tooltip: {
    display: 'none',
    position: 'absolute' as const,
    top: '140%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 220,
    padding: '9px 12px',
    backgroundColor: '#3D2E1E',
    color: '#fff',
    borderRadius: 8,
    fontSize: 12,
    lineHeight: 1.5,
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 10,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#5C4A32',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 14,
    border: '2px solid #E8DFD3',
    borderRadius: 10,
    boxSizing: 'border-box' as const,
    outline: 'none',
    transition: 'border-color 0.2s',
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
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  button: {
    width: '100%',
    padding: '13px 0',
    background: '#4E342E',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 10,
    boxShadow: '0 4px 14px rgba(102,126,234,0.3)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    letterSpacing: '0.3px',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  link: {
    display: 'block',
    textAlign: 'center' as const,
    marginTop: 18,
    fontSize: 14,
    color: '#C8962E',
    fontWeight: 500,
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

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const redirectPath = searchParams.get('redirect') || '/';
  const [nickname, setNickname] = useState('');

  // 카카오 콜백 처리
  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      mypageApi.getProfile()
        .then((res) => setUser(res.data))
        .finally(() => navigate(redirectPath));
    } else if (error) {
      setServerError('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
    }
  }, [searchParams]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    const formErrors = validateForm(nickname);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setLoading(true);
    try {
      const { data } = await authApi.login({ nickname });
      setTokens(data.accessToken, data.refreshToken);
      const profile = await mypageApi.getProfile();
      setUser(profile.data);
      navigate(redirectPath);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr.response?.data?.error?.message || '등록되지 않은 닉네임입니다';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>닉네임 로그인</h1>
        <div style={styles.description}>
          <span>
            엑스포 기간에는 닉네임만으로
            <br />
            간편하게 로그인할 수 있습니다.
          </span>
          <span
            style={styles.helpIcon}
            onMouseEnter={(e) => {
              const tooltip = e.currentTarget.querySelector('[data-tooltip]') as HTMLElement | null;
              if (tooltip) tooltip.style.display = 'block';
            }}
            onMouseLeave={(e) => {
              const tooltip = e.currentTarget.querySelector('[data-tooltip]') as HTMLElement | null;
              if (tooltip) tooltip.style.display = 'none';
            }}
            aria-label="로그인 안내"
          >
            ?
            <span data-tooltip="" style={styles.tooltip}>
              실제 서비스에서는
              <br />
              이메일, 카카오톡으로
              <br />
              로그인이 진행됩니다.
            </span>
          </span>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          {serverError && <div style={styles.serverError}>{serverError}</div>}

          <div style={styles.field}>
            <label style={styles.label} htmlFor="nickname">닉네임</label>
            <input
              id="nickname"
              type="text"
              style={{ ...styles.input, ...(errors.nickname ? styles.inputError : {}) }}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임"
            />
            {errors.nickname && <div style={styles.errorText}>{errors.nickname}</div>}
          </div>

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <Link to="/signup" style={styles.link}>
          닉네임이 없으신가요? 회원가입
        </Link>
      </div>
    </div>
  );
}

export default LoginPage;
