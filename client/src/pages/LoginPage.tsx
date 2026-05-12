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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #e8e0ff 100%)',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 36,
    width: 400,
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    border: '1px solid #f0f0f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    textAlign: 'center' as const,
    marginBottom: 28,
    letterSpacing: '-0.5px',
    color: '#1a202c',
  },
  field: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#4a5568',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 14,
    border: '2px solid #e2e8f0',
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
    color: '#667eea',
    fontWeight: 500,
  },
};

interface FormErrors {
  email?: string;
  password?: string;
}

function validateForm(email: string, password: string): FormErrors {
  const errors: FormErrors = {};

  if (!email.trim()) {
    errors.email = '이메일을 입력해주세요';
  }

  if (!password) {
    errors.password = '비밀번호를 입력해주세요';
  }

  return errors;
}

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const redirectPath = searchParams.get('redirect') || '/';
  const [email, setEmail] = useState('');

  // 카카오 콜백 처리
  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      // 카카오 로그인 후 프로필 가져오기
      mypageApi.getProfile().then((res) => setUser(res.data)).catch(() => {});
      navigate(redirectPath);
    } else if (error) {
      setServerError('카카오 로그인에 실패했습니다. 다시 시도해주세요.');
    }
  }, [searchParams]);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    const formErrors = validateForm(email, password);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      setTokens(data.accessToken, data.refreshToken);
      // 로그인 후 사용자 프로필 가져오기
      try {
        const profileRes = await mypageApi.getProfile();
        setUser(profileRes.data);
      } catch {
        // 프로필 조회 실패해도 로그인은 유지
      }
      navigate(redirectPath);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const msg = axiosErr.response?.data?.error?.message || '이메일 또는 비밀번호가 올바르지 않습니다';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>로그인</h1>
        <form onSubmit={handleSubmit} noValidate>
          {serverError && <div style={styles.serverError}>{serverError}</div>}

          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              style={{ ...styles.input, ...(errors.email ? styles.inputError : {}) }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
            {errors.email && <div style={styles.errorText}>{errors.email}</div>}
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              style={{ ...styles.input, ...(errors.password ? styles.inputError : {}) }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
            />
            {errors.password && <div style={styles.errorText}>{errors.password}</div>}
          </div>

          <button
            type="submit"
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={{ margin: '16px 0', textAlign: 'center' as const, color: '#a0aec0', fontSize: 13 }}>또는</div>

        <a
          href="/api/auth/kakao"
          style={{
            display: 'block',
            width: '100%',
            padding: '13px 0',
            backgroundColor: '#FEE500',
            color: '#191919',
            border: 'none',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            textAlign: 'center' as const,
            textDecoration: 'none',
            boxSizing: 'border-box' as const,
          }}
        >
          카카오로 시작하기
        </a>

        <Link to="/signup" style={styles.link}>
          계정이 없으신가요? 회원가입
        </Link>
      </div>
    </div>
  );
}

export default LoginPage;
