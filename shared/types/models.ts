/** 대화방 엔티티 */
export interface ChatRoom {
  id: string;
  title: string;
  topic: string;
  creatorId: string;
  creatorName: string;
  createdAt: Date;
}

/** 대화방 목록 조회용 요약 정보 */
export interface ChatRoomSummary {
  id: string;
  title: string;
  topic: string;
  creatorName: string;
  participantCount: number;
  createdAt: Date;
}

/** 메시지 엔티티 */
export interface Message {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  content: string;
  sentAt: Date;
}

/** 참여자 엔티티 */
export interface Participant {
  roomId: string;
  userId: string;
  userName: string;
  joinedAt: Date;
}
