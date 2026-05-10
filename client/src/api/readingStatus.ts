import apiClient from './client';
import type { ReadingStatus, ReadingStatusType } from '../types';

export interface ReadingStatusListParams {
  status?: ReadingStatusType;
}

export interface AddReadingStatusRequest {
  bookId: string;
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

  /** 스포일러 설정 조회 */
  getSpoilerSetting: () =>
    apiClient.get<SpoilerSetting>('/me/spoiler-setting'),

  /** 스포일러 설정 변경 */
  updateSpoilerSetting: (data: UpdateSpoilerSettingRequest) =>
    apiClient.patch<SpoilerSetting>('/me/spoiler-setting', data),
};
