import { useState, useCallback, useRef } from 'react';
import type { AuthResponse, AuthPayload, RegisterResponse, ConvertResponse } from '@shared/types';

const AUTH_TOKEN_KEY = 'auth_token';
const GUEST_USER_ID_KEY = 'chat_userId';
const GUEST_USER_NAME_KEY = 'chat_userName';

function decodeJwtPayload(token: string): AuthPayload {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json) as AuthPayload;
}

function getInitialState(): {
  isAuthenticated: boolean;
  isGuest: boolean;
  userId: string;
  userName: string;
  role: 'admin' | 'user' | 'guest';
  token: string | null;
} {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    try {
      const payload = decodeJwtPayload(token);
      return {
        isAuthenticated: true,
        isGuest: false,
        userId: payload.userId,
        userName: payload.displayName,
        role: payload.role,
        token,
      };
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  const guestId = localStorage.getItem(GUEST_USER_ID_KEY);
  const guestName = localStorage.getItem(GUEST_USER_NAME_KEY);
  if (guestId && guestName) {
    return {
      isAuthenticated: false,
      isGuest: true,
      userId: guestId,
      userName: guestName,
      role: 'guest',
      token: null,
    };
  }

  return {
    isAuthenticated: false,
    isGuest: false,
    userId: '',
    userName: '',
    role: 'guest',
    token: null,
  };
}

export function useAuth() {
  const [state, setState] = useState(getInitialState);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Login failed: ${res.status}`);
    }
    const data: AuthResponse = await res.json();
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    // Clear any guest data
    localStorage.removeItem(GUEST_USER_ID_KEY);
    localStorage.removeItem(GUEST_USER_NAME_KEY);
    const payload = decodeJwtPayload(data.token);
    setState({
      isAuthenticated: true,
      isGuest: false,
      userId: payload.userId,
      userName: payload.displayName,
      role: payload.role,
      token: data.token,
    });
  }, []);

  // 자격증명 확인 전까지 토큰을 메모리에 임시 보관
  const pendingTokenRef = useRef<string | null>(null);

  const register = useCallback(async (displayName: string, email: string): Promise<{ generatedUsername: string; generatedPassword: string }> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, email }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Registration failed: ${res.status}`);
    }
    const data: RegisterResponse = await res.json();
    // 토큰을 메모리에만 보관 (localStorage에 저장하지 않음 → 리다이렉트 방지)
    pendingTokenRef.current = data.token;
    localStorage.removeItem(GUEST_USER_ID_KEY);
    localStorage.removeItem(GUEST_USER_NAME_KEY);
    return { generatedUsername: data.generatedUsername, generatedPassword: data.generatedPassword };
  }, []);

  const loginAsGuest = useCallback((nickname: string) => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    let guestId = localStorage.getItem(GUEST_USER_ID_KEY);
    if (!guestId) {
      guestId = crypto.randomUUID();
      localStorage.setItem(GUEST_USER_ID_KEY, guestId);
    }
    localStorage.setItem(GUEST_USER_NAME_KEY, trimmed);
    // Clear any auth token
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setState({
      isAuthenticated: false,
      isGuest: true,
      userId: guestId,
      userName: trimmed,
      role: 'guest',
      token: null,
    });
  }, []);

  const convertGuest = useCallback(async (displayName: string, email: string): Promise<{ generatedUsername: string; generatedPassword: string }> => {
    const guestUserId = localStorage.getItem(GUEST_USER_ID_KEY);
    if (!guestUserId) {
      throw new Error('No guest user ID found');
    }
    const res = await fetch('/api/auth/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestUserId, displayName, email }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Conversion failed: ${res.status}`);
    }
    const data: ConvertResponse = await res.json();
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    // Clear guest data
    localStorage.removeItem(GUEST_USER_ID_KEY);
    localStorage.removeItem(GUEST_USER_NAME_KEY);
    const payload = decodeJwtPayload(data.token);
    setState({
      isAuthenticated: true,
      isGuest: false,
      userId: payload.userId,
      userName: payload.displayName,
      role: payload.role,
      token: data.token,
    });
    return { generatedUsername: data.generatedUsername, generatedPassword: data.generatedPassword };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(GUEST_USER_ID_KEY);
    localStorage.removeItem(GUEST_USER_NAME_KEY);
    setState({
      isAuthenticated: false,
      isGuest: false,
      userId: '',
      userName: '',
      role: 'guest',
      token: null,
    });
  }, []);

  // localStorage에 저장된 토큰으로 인증 상태를 활성화 (자격증명 확인 후 호출)
  const activateSession = useCallback(() => {
    const token = pendingTokenRef.current || localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;
    try {
      const payload = decodeJwtPayload(token);
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      pendingTokenRef.current = null;
      setState({
        isAuthenticated: true,
        isGuest: false,
        userId: payload.userId,
        userName: payload.displayName,
        role: payload.role,
        token,
      });
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      pendingTokenRef.current = null;
    }
  }, []);

  return {
    isAuthenticated: state.isAuthenticated,
    isGuest: state.isGuest,
    userId: state.userId,
    userName: state.userName,
    role: state.role,
    token: state.token,
    login,
    register,
    activateSession,
    convertGuest,
    loginAsGuest,
    logout,
  };
}
