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

/** 사용자 계정 엔티티 */
export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

/** JWT 페이로드 */
export interface AuthPayload {
  userId: string;
  username: string;
  displayName: string;
  role: 'user' | 'admin';
}

/** 클라이언트에 반환되는 사용자 정보 (비밀번호 제외) */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: 'user' | 'admin';
}

/** 로그인/회원가입 응답 */
export interface AuthResponse {
  token: string;
  user: AuthUser;
}
