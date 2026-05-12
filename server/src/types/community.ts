/**
 * 커뮤니티 플랫폼 공통 타입 및 상수 정의
 */

// ===== 카테고리 =====

export interface CategoryInfo {
  key: string;
  label: string;
}

export const COMMUNITY_CATEGORIES = [
  { key: 'korean_novel', label: '한국 소설' },
  { key: 'western_novel', label: '영미 소설' },
  { key: 'japanese_novel', label: '일본 소설' },
  { key: 'essay', label: '에세이' },
  { key: 'self_help', label: '자기계발' },
  { key: 'humanities', label: '인문학' },
  { key: 'science', label: '과학' },
  { key: 'history', label: '역사' },
  { key: 'poetry', label: '시/시집' },
  { key: 'other', label: '기타' },
] as const satisfies readonly CategoryInfo[];

export type CategoryKey = (typeof COMMUNITY_CATEGORIES)[number]['key'];

export const CATEGORY_KEYS: CategoryKey[] = COMMUNITY_CATEGORIES.map((c) => c.key);

// ===== 알림 타입 =====

export type NotificationType =
  | 'comment'
  | 'reply'
  | 'like'
  | 'report_hidden'
  | 'discussion_schedule'
  | 'moderation_alert';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'comment',
  'reply',
  'like',
  'report_hidden',
  'discussion_schedule',
  'moderation_alert',
];

// ===== 스포일러 필터 모드 =====

export type SpoilerFilterMode = 'off' | 'hide_completely' | 'hide_content';

export const SPOILER_FILTER_MODES: SpoilerFilterMode[] = [
  'off',
  'hide_completely',
  'hide_content',
];

// ===== 독서 상태 =====

export type ReadingStatusType = 'reading' | 'completed' | 'want_to_read';

export const READING_STATUS_TYPES: ReadingStatusType[] = [
  'reading',
  'completed',
  'want_to_read',
];

// ===== 신고 임계값 =====

export const REPORT_THRESHOLD = 5;
