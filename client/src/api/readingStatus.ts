import apiClient from './client';
import type { ReadingStatus, ReadingStatusType, ReadingMemo, ProgressLog } from '../types';

export interface ReadingStatusListParams {
  status?: ReadingStatusType;
}

export interface AddReadingStatusRequest {
  bookId: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookCoverImageUrl?: string;
  bookIsbn?: string;
  status: ReadingStatusType;
}

export interface UpdateReadingStatusRequest {
  status: ReadingStatusType;
}

export interface UpdateSpoilerSettingRequest {
  mode: 'off' | 'hide_completely' | 'hide_content';
}

export interface SpoilerSetting {
  mode: 'off' | 'hide_completely' | 'hide_content';
}

export const readingStatusApi = {
  /** 독서 상태 목록 조회 */
  list: (params?: ReadingStatusListParams) =>
    apiClient.get<ReadingStatus[]>('/me/reading-status', { params }),

  /** 책 추가 (독서 상태 등록) */
  addBook: (data: AddReadingStatusRequest) =>
    apiClient.post<ReadingStatus>('/me/reading-status', data),

  /** 독서 상태 변경 */
  updateStatus: (id: string, data: UpdateReadingStatusRequest) =>
    apiClient.patch<ReadingStatus>(`/me/reading-status/${id}`, data),

  /** 책 제거 (독서 상태 삭제) */
  removeBook: (id: string) =>
    apiClient.delete(`/me/reading-status/${id}`),

  /** 현재 페이지 기록 업데이트 */
  updatePage: (id: string, currentPage: number) =>
    apiClient.patch(`/me/reading-status/${id}/page`, { currentPage }),

  /** 진행도 이력 조회 */
  getProgressLogs: (readingStatusId: string) =>
    apiClient.get<ProgressLog[]>(`/me/reading-status/${readingStatusId}/progress-logs`),

  /** 독서 메모 목록 조회 */
  getMemos: (readingStatusId: string) =>
    apiClient.get<ReadingMemo[]>(`/me/reading-status/${readingStatusId}/memos`),

  /** 독서 메모 생성 */
  createMemo: (readingStatusId: string, data: { content: string; pageNumber?: number }) =>
    apiClient.post<ReadingMemo>(`/me/reading-status/${readingStatusId}/memos`, data),

  /** 독서 메모 수정 */
  updateMemo: (readingStatusId: string, memoId: string, data: { content: string; pageNumber?: number }) =>
    apiClient.patch<ReadingMemo>(`/me/reading-status/${readingStatusId}/memos/${memoId}`, data),

  /** 독서 메모 삭제 */
  deleteMemo: (readingStatusId: string, memoId: string) =>
    apiClient.delete(`/me/reading-status/${readingStatusId}/memos/${memoId}`),

  /** 스포일러 설정 조회 */
  getSpoilerSetting: () =>
    apiClient.get<SpoilerSetting>('/me/spoiler-setting'),

  /** 스포일러 설정 변경 */
  updateSpoilerSetting: (data: UpdateSpoilerSettingRequest) =>
    apiClient.patch<SpoilerSetting>('/me/spoiler-setting', data),
};
