import { Message } from './models';

/** Client → Server 이벤트 페이로드 */
export interface RoomJoinPayload {
  roomId: string;
  userId: string;
  userName: string;
}

export interface RoomLeavePayload {
  roomId: string;
  userId: string;
}

export interface MessageSendPayload {
  roomId: string;
  userId: string;
  userName: string;
  content: string;
}

/** Server → Client 이벤트 페이로드 */
export interface UserJoinedPayload {
  userId: string;
  userName: string;
  participantCount: number;
}

export interface UserLeftPayload {
  userId: string;
  userName: string;
  participantCount: number;
}

/** Socket.IO Client → Server 이벤트 맵 */
export interface ClientToServerEvents {
  'room:join': (payload: RoomJoinPayload) => void;
  'room:leave': (payload: RoomLeavePayload) => void;
  'message:send': (payload: MessageSendPayload) => void;
}

/** Socket.IO Server → Client 이벤트 맵 */
export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'room:user-joined': (payload: UserJoinedPayload) => void;
  'room:user-left': (payload: UserLeftPayload) => void;
}
