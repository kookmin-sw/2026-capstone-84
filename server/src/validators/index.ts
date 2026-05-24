import { z } from 'zod';

const TagsSchema = z.array(
  z.string()
    .transform(tag => tag.trim())
    .pipe(z.string().max(15, '태그는 15자 이하로 입력해주세요')),
).max(3, '태그는 최대 3개까지 입력할 수 있습니다')
  .optional()
  .transform(tags => tags?.filter(Boolean));

// 회원가입
export const SignupSchema = z.object({
  nickname: z.string().trim().min(1, '닉네임을 입력해주세요').max(50, '닉네임은 50자 이하여야 합니다'),
});

// 로그인
export const LoginSchema = z.object({
  nickname: z.string().trim().min(1, '닉네임을 입력해주세요').max(50, '닉네임은 50자 이하여야 합니다'),
});

// 모임 생성
export const CreateGroupSchema = z.object({
  bookId: z.string().uuid().optional(),
  bookTitle: z.string().min(1, '책 제목을 입력해주세요'),
  bookAuthor: z.string().optional(),
  bookCoverUrl: z.string().url().optional(),
  bookSummary: z.string().optional(),
  name: z.string().min(1, '모임명을 입력해주세요'),
  description: z.string().optional(),
  maxMembers: z.number().int().positive('모집 인원은 1명 이상이어야 합니다'),
  readingStartDate: z.string().date(),
  readingEndDate: z.string().date(),
  isPrivate: z.boolean().default(false),
  password: z.string().regex(/^\d{6}$/, '비밀번호는 숫자 6자리여야 합니다').optional(),
  tags: TagsSchema,
}).refine(data => {
  if (data.isPrivate && !data.password) return false;
  return true;
}, { message: '비공개 모임은 비밀번호를 설정해야 합니다' });

// 메모 공개 타입
export const VisibilityEnum = z.enum(['private', 'public', 'spoiler']);

// 메모 작성
export const CreateMemoSchema = z.object({
  pageStart: z.number().int().nonnegative(),
  pageEnd: z.number().int().nonnegative(),
  content: z.string().min(1, '메모 내용을 입력해주세요'),
  isPublic: z.boolean().default(false),
  visibility: VisibilityEnum.default('private'),
}).refine(data => data.pageEnd >= data.pageStart, {
  message: '끝 페이지는 시작 페이지 이상이어야 합니다',
});


// 메모 수정
export const UpdateMemoSchema = z.object({
  pageStart: z.number().int().nonnegative().optional(),
  pageEnd: z.number().int().nonnegative().optional(),
  content: z.string().min(1, '메모 내용을 입력해주세요').optional(),
  isPublic: z.boolean().optional(),
  visibility: VisibilityEnum.optional(),
}).refine(data => {
  if (data.pageStart !== undefined && data.pageEnd !== undefined) {
    return data.pageEnd >= data.pageStart;
  }
  return true;
}, {
  message: '끝 페이지는 시작 페이지 이상이어야 합니다',
});

// 토론 주제 생성
export const CreateDiscussionSchema = z.object({
  title: z.string().min(1, '토론 주제를 입력해주세요'),
  content: z.string().optional(),
  memoId: z.string().uuid().optional(),
  endDate: z.string().optional(),
});

// 의견 작성
export const CreateCommentSchema = z.object({
  content: z.string().min(1, '의견 내용을 입력해주세요'),
});

// 모임 수정
export const UpdateGroupSchema = z.object({
  name: z.string().min(1, '모임명을 입력해주세요').optional(),
  description: z.string().optional(),
  maxMembers: z.number().int().positive('모집 인원은 1명 이상이어야 합니다').optional(),
  readingStartDate: z.string().date().optional(),
  readingEndDate: z.string().date().optional(),
  isPrivate: z.boolean().optional(),
  password: z.string().regex(/^\d{6}$/, '비밀번호는 숫자 6자리여야 합니다').optional().nullable(),
  tags: TagsSchema,
});

// 닉네임 변경
export const UpdateNicknameSchema = z.object({
  nickname: z.string().min(1, '닉네임을 입력해주세요').max(50, '닉네임은 50자 이하여야 합니다'),
});

// 타입 추출
export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;
export type CreateMemoInput = z.infer<typeof CreateMemoSchema>;
export type UpdateMemoInput = z.infer<typeof UpdateMemoSchema>;
export type CreateDiscussionInput = z.infer<typeof CreateDiscussionSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateNicknameInput = z.infer<typeof UpdateNicknameSchema>;
