import { ChatRoom, ChatRoomSummary, Message, Participant } from './models';

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
