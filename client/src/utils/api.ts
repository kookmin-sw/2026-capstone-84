import type { ChatRoom, ChatRoomSummary, Message } from '@shared/types';

const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed: ${res.status}`, res.status);
  }
  return res.json();
}

export function fetchRooms(): Promise<ChatRoomSummary[]> {
  return request<ChatRoomSummary[]>('/rooms');
}

export function fetchRoom(roomId: string): Promise<ChatRoom> {
  return request<ChatRoom>(`/rooms/${roomId}`);
}

export function fetchMessages(roomId: string): Promise<Message[]> {
  return request<Message[]>(`/rooms/${roomId}/messages`);
}

export function createRoom(
  title: string,
  topic: string,
  creatorId: string,
  creatorName: string
): Promise<ChatRoom> {
  return request<ChatRoom>('/rooms', {
    method: 'POST',
    body: JSON.stringify({ title, topic, creatorId, creatorName }),
  });
}

export function deleteRoom(roomId: string): Promise<void> {
  return request<void>(`/rooms/${roomId}`, { method: 'DELETE' });
}

export function fetchMyRooms(userId: string): Promise<ChatRoomSummary[]> {
  return request<ChatRoomSummary[]>(`/rooms/my?userId=${encodeURIComponent(userId)}`);
}
