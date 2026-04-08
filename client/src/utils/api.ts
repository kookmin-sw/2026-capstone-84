import type { ChatRoom, ChatRoomSummary, Message } from '@shared/types';

const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
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
