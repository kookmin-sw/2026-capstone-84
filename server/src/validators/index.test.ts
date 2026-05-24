import { describe, it, expect } from 'vitest';
import {
  SignupSchema,
  LoginSchema,
  CreateGroupSchema,
  CreateMemoSchema,
  UpdateMemoSchema,
  CreateDiscussionSchema,
  CreateCommentSchema,
} from './index';

describe('SignupSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = SignupSchema.safeParse({
      nickname: '테스터',
    });
    expect(result.success).toBe(true);
  });

  it('빈 닉네임을 거부한다', () => {
    const result = SignupSchema.safeParse({
      nickname: '',
    });
    expect(result.success).toBe(false);
  });

  it('50자를 초과하는 닉네임을 거부한다', () => {
    const result = SignupSchema.safeParse({
      nickname: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });
});


describe('LoginSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = LoginSchema.safeParse({
      nickname: '테스터',
    });
    expect(result.success).toBe(true);
  });

  it('빈 닉네임을 거부한다', () => {
    const result = LoginSchema.safeParse({
      nickname: '',
    });
    expect(result.success).toBe(false);
  });

  it('50자를 초과하는 닉네임을 거부한다', () => {
    const result = LoginSchema.safeParse({
      nickname: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateGroupSchema', () => {
  const validGroup = {
    bookTitle: '클린 코드',
    name: '클린 코드 읽기 모임',
    maxMembers: 10,
    readingStartDate: '2025-01-01',
    readingEndDate: '2025-02-01',
    discussionDate: '2025-02-15',
  };

  it('유효한 입력을 통과시킨다', () => {
    const result = CreateGroupSchema.safeParse(validGroup);
    expect(result.success).toBe(true);
  });

  it('선택 필드 포함 시에도 통과시킨다', () => {
    const result = CreateGroupSchema.safeParse({
      ...validGroup,
      bookId: '550e8400-e29b-41d4-a716-446655440000',
      bookAuthor: '로버트 마틴',
      bookCoverUrl: 'https://example.com/cover.jpg',
      bookSummary: '좋은 코드를 작성하는 방법',
      description: '함께 클린 코드를 읽어요',
    });
    expect(result.success).toBe(true);
  });

  it('책 제목 누락 시 거부한다', () => {
    const { bookTitle, ...missing } = validGroup;
    const result = CreateGroupSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });

  it('모임명 누락 시 거부한다', () => {
    const { name, ...missing } = validGroup;
    const result = CreateGroupSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });

  it('모집 인원이 0 이하이면 거부한다', () => {
    const result = CreateGroupSchema.safeParse({ ...validGroup, maxMembers: 0 });
    expect(result.success).toBe(false);
  });

  it('잘못된 날짜 형식을 거부한다', () => {
    const result = CreateGroupSchema.safeParse({
      ...validGroup,
      readingStartDate: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateMemoSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = CreateMemoSchema.safeParse({
      pageStart: 1,
      pageEnd: 50,
      content: '인상 깊은 구절이다',
    });
    expect(result.success).toBe(true);
  });

  it('isPublic 기본값이 false이다', () => {
    const result = CreateMemoSchema.safeParse({
      pageStart: 1,
      pageEnd: 50,
      content: '메모 내용',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublic).toBe(false);
    }
  });

  it('빈 메모 내용을 거부한다', () => {
    const result = CreateMemoSchema.safeParse({
      pageStart: 1,
      pageEnd: 50,
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('pageEnd < pageStart이면 거부한다', () => {
    const result = CreateMemoSchema.safeParse({
      pageStart: 50,
      pageEnd: 10,
      content: '메모 내용',
    });
    expect(result.success).toBe(false);
  });

  it('음수 페이지를 거부한다', () => {
    const result = CreateMemoSchema.safeParse({
      pageStart: -1,
      pageEnd: 10,
      content: '메모 내용',
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateMemoSchema', () => {
  it('부분 업데이트를 통과시킨다', () => {
    const result = UpdateMemoSchema.safeParse({ content: '수정된 내용' });
    expect(result.success).toBe(true);
  });

  it('공개 여부만 변경을 통과시킨다', () => {
    const result = UpdateMemoSchema.safeParse({ isPublic: true });
    expect(result.success).toBe(true);
  });

  it('pageEnd < pageStart이면 거부한다', () => {
    const result = UpdateMemoSchema.safeParse({
      pageStart: 50,
      pageEnd: 10,
    });
    expect(result.success).toBe(false);
  });

  it('빈 content를 거부한다', () => {
    const result = UpdateMemoSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });
});

describe('CreateDiscussionSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = CreateDiscussionSchema.safeParse({
      title: '이 부분에 대해 어떻게 생각하시나요?',
    });
    expect(result.success).toBe(true);
  });

  it('메모 연결 포함 시에도 통과시킨다', () => {
    const result = CreateDiscussionSchema.safeParse({
      title: '토론 주제',
      content: '상세 내용',
      memoId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('빈 제목을 거부한다', () => {
    const result = CreateDiscussionSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('잘못된 UUID 형식의 memoId를 거부한다', () => {
    const result = CreateDiscussionSchema.safeParse({
      title: '토론 주제',
      memoId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateCommentSchema', () => {
  it('유효한 입력을 통과시킨다', () => {
    const result = CreateCommentSchema.safeParse({
      content: '좋은 의견이네요!',
    });
    expect(result.success).toBe(true);
  });

  it('빈 내용을 거부한다', () => {
    const result = CreateCommentSchema.safeParse({ content: '' });
    expect(result.success).toBe(false);
  });
});
