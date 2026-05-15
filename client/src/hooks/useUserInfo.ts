import { useState, useCallback } from 'react';

const USER_ID_KEY = 'chat_userId';
const USER_NAME_KEY = 'chat_userName';

function getStoredUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

function getStoredUserName(): string | null {
  return localStorage.getItem(USER_NAME_KEY);
}

export function useUserInfo() {
  const [userId] = useState<string>(getStoredUserId);
  const [userName, setUserNameState] = useState<string | null>(getStoredUserName);

  const setUserName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(USER_NAME_KEY, trimmed);
    setUserNameState(trimmed);
  }, []);

  return { userId, userName, setUserName };
}
