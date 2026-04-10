import { AuthPayload, AuthUser, ChatRoom, ChatRoomSummary, Message, Participant } from './models';

/** 대화방 서비스 인터페이스 */
export interface RoomService {
  createRoom(
    title: string,
    topic: string,
    creatorId: string,
    creatorName: string
  ): Promise<ChatRoom>;
  getRooms(): Promise<ChatRoomSummary[]>;
  getRoomById(roomId: string): Promise<ChatRoom | null>;
  deleteRoom(roomId: string): Promise<void>;
}

/** 메시지 서비스 인터페이스 */
export interface MessageService {
  sendMessage(
    roomId: string,
    userId: string,
    userName: string,
    content: string
  ): Promise<Message>;
  getMessagesByRoom(roomId: string): Promise<Message[]>;
}

/** 참여자 서비스 인터페이스 */
export interface ParticipantService {
  joinRoom(
    roomId: string,
    userId: string,
    userName: string
  ): Promise<{ participantCount: number }>;
  leaveRoom(
    roomId: string,
    userId: string
  ): Promise<{ participantCount: number }>;
  getParticipants(roomId: string): Promise<Participant[]>;
  getParticipantCount(roomId: string): Promise<number>;
}

/** 인증 서비스 인터페이스 */
export interface AuthService {
  register(username: string, password: string, displayName: string): Promise<{ token: string; user: AuthUser }>;
  login(username: string, password: string): Promise<{ token: string; user: AuthUser }>;
  verifyToken(token: string): AuthPayload;
  ensureAdminExists(): void;
}

/** 비활성 게스트 정리 서비스 인터페이스 */
export interface GuestCleanupService {
  cleanupInactiveGuests(): void;
}
