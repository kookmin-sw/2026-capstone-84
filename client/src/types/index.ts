// ===== User =====
export interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
}

// ===== Auth =====
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  nickname: string;
}

export interface SignupRequest {
  nickname: string;
}

// ===== Book =====
export interface Book {
  id: string;
  title: string;
  author?: string;
  coverImageUrl?: string;
  summary?: string;
  isbn?: string;
}

export interface BookSearchResult {
  title: string;
  author: string;
  coverImageUrl: string;
  summary: string;
  isbn: string;
}

// ===== Group =====
export interface GroupCard {
  id: string;
  name: string;
  description?: string;
  book: Pick<Book, 'title' | 'author' | 'coverImageUrl' | 'summary'>;
  maxMembers: number;
  currentMembers: number;
  readingStartDate: string;
  readingEndDate: string;
  discussionDate: string;
  isPrivate?: boolean;
  ownerId?: string;
  ownerNickname?: string | null;
  isMember?: boolean;
  tags?: string[];
}

export interface GroupDetail extends GroupCard {
  ownerId: string;
  memberCount?: number;
  members: GroupMember[];
  recentMemos: Memo[];
  recentDiscussions: Discussion[];
}

export interface CreateGroupRequest {
  bookTitle: string;
  bookAuthor?: string;
  bookCoverUrl?: string;
  bookSummary?: string;
  name: string;
  description?: string;
  maxMembers: number;
  readingStartDate: string;
  readingEndDate: string;
  isPrivate?: boolean;
  password?: string;
  tags?: string[];
}

export interface GroupMember {
  id: string;
  userId: string;
  nickname: string;
  readingProgress: number;
  role: 'owner' | 'member';
  joinedAt: string;
}

// ===== Memo =====
export type MemoVisibility = 'private' | 'public' | 'spoiler';

export interface Memo {
  id: string;
  groupId: string;
  userId: string;
  authorNickname: string;
  pageStart: number;
  pageEnd: number;
  content: string;
  imageUrl?: string;
  isPublic: boolean;
  visibility: MemoVisibility;
  createdAt: string;
  updatedAt: string;
  isContentHidden?: boolean;
}

export interface CreateMemoRequest {
  pageStart: number;
  pageEnd: number;
  content: string;
  image?: File;
  isPublic?: boolean;
  visibility?: MemoVisibility;
}

// ===== Discussion =====
export interface Discussion {
  id: string;
  groupId: string;
  authorId: string;
  authorNickname: string;
  memoId?: string;
  title: string;
  content?: string;
  imageUrl?: string;
  isRecommended: boolean;
  isPinned?: boolean;
  status?: string;
  endDate?: string;
  createdAt: string;
}

export interface CreateDiscussionRequest {
  title: string;
  content?: string;
  memoId?: string;
  endDate?: string;
  image?: File;
}

export interface Comment {
  id: string;
  discussionId: string;
  authorId: string;
  authorNickname: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  replies: Reply[];
}

export interface Reply {
  id: string;
  commentId: string;
  authorId: string;
  authorNickname: string;
  content: string;
  createdAt: string;
}

export interface RecommendedTopic {
  title: string;
  content: string;
}

// ===== Notification =====
export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  linkUrl: string;
  isRead: boolean;
  createdAt: string;
  groupId: string;
  groupName: string;
  discussionId?: string;
  announcementId?: string;
}

// ===== API =====
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
