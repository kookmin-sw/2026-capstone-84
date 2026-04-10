import { useState, useCallback } from 'react';
import type { AuthResponse, AuthPayload } from '@shared/types';

const AUTH_TOKEN_KEY = 'auth_token';
const GUEST_USER_ID_KEY = 'chat_userId';
const GUEST_USER_NAME_KEY = 'chat_userName';

function decodeJwtPayload(token: string): AuthPayload {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(base64);
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

  const register = useCallback(async (username: string, password: string, displayName: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, confirmPassword: password, displayName }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Registration failed: ${res.status}`);
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

  return {
    isAuthenticated: state.isAuthenticated,
    isGuest: state.isGuest,
    userId: state.userId,
    userName: state.userName,
    role: state.role,
    token: state.token,
    login,
    register,
    loginAsGuest,
    logout,
  };
}
