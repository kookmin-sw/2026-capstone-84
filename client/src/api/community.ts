import apiClient from './client';
import type {
  CommunityPost,
  CommunityComment,
  CursorPaginatedResult,
} from '../types';

export interface CreatePostRequest {
  bookId: string;
  content: string;
  pageNumber?: number;
  category?: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface ReportRequest {
  reason: string;
}

export interface PostListParams {
  cursor?: string;
  limit?: number;
  category?: string;
  spoilerFilter?: string;
}

export interface SearchParams {
  q: string;
  cursor?: string;
  limit?: number;
}

export const communityApi = {
  // ===== 게시글 CRUD =====

  /** 게시글 목록 조회 (커서 기반 페이지네이션) */
  listPosts: (params?: PostListParams) =>
    apiClient.get<CursorPaginatedResult<CommunityPost>>('/community/posts', { params }),

  /** 게시글 상세 조회 */
  getPost: (id: string) =>
    apiClient.get<CommunityPost>(`/community/posts/${id}`),

  /** 게시글 작성 */
  createPost: (data: CreatePostRequest) =>
    apiClient.post<CommunityPost>('/community/posts', data),

  /** 게시글 삭제 */
  deletePost: (id: string) =>
    apiClient.delete(`/community/posts/${id}`),

  // ===== 댓글/대댓글 =====

  /** 게시글 댓글 목록 조회 */
  getComments: (postId: string) =>
    apiClient.get<CommunityComment[]>(`/community/posts/${postId}/comments`),

  /** 댓글 작성 */
  createComment: (postId: string, data: CreateCommentRequest) =>
    apiClient.post<CommunityComment>(`/community/posts/${postId}/comments`, data),

  /** 대댓글 작성 */
  createReply: (commentId: string, data: CreateCommentRequest) =>
    apiClient.post<CommunityComment>(`/community/comments/${commentId}/replies`, data),

  /** 댓글 삭제 */
  deleteComment: (commentId: string) =>
    apiClient.delete(`/community/comments/${commentId}`),

  // ===== 좋아요 =====

  /** 좋아요 토글 */
  toggleLike: (postId: string) =>
    apiClient.post<{ liked: boolean; likeCount: number }>(`/community/posts/${postId}/like`),

  /** 좋아요 상태 확인 */
  getLikeStatus: (postId: string) =>
    apiClient.get<{ liked: boolean }>(`/community/posts/${postId}/like`),

  // ===== 검색 =====

  /** 게시글 검색 */
  search: (params: SearchParams) =>
    apiClient.get<CursorPaginatedResult<CommunityPost>>('/community/search', { params }),

  // ===== 신고 =====

  /** 게시글 신고 */
  reportPost: (postId: string, data: ReportRequest) =>
    apiClient.post(`/community/posts/${postId}/report`, data),
};
