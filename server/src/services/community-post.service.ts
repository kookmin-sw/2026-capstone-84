import { writerPrisma, readerPrisma } from '../lib/prisma';
import { AppError } from './auth.service';
import { paginateWithCursor, PaginationParams } from '../utils/pagination';
import { CategoryKey, CATEGORY_KEYS } from '../types/community';
import { aiClassifierService } from './ai-classifier.service';
import { aiModeratorService } from './ai-moderator.service';
import { communitySearchService } from './community-search.service';

// ===== 입력 타입 =====

export interface CreatePostInput {
  bookId?: string | null;
  bookTitle?: string;
  bookAuthor?: string;
  bookCoverImageUrl?: string;
  bookIsbn?: string;
  content: string;
  pageStart?: number | null;
  pageEnd?: number | null;
  category?: CategoryKey | null;
}

export interface ListPostsParams extends PaginationParams {
  category?: string | null;
}

// ===== 서비스 =====

export const communityPostService = {
  /**
   * 게시글 작성
   * - 책(필수), 내용(필수), 페이지 번호(선택), 카테고리(선택)
   */
  async createPost(authorId: string, input: CreatePostInput) {
    const { bookId, bookTitle, bookAuthor, bookCoverImageUrl, bookIsbn, content, pageStart, pageEnd, category } = input;

    // 필수 필드 검증
    if (!content || !content.trim()) {
      throw new AppError(400, 'VALIDATION_ERROR', '글 내용을 입력해주세요');
    }

    // 카테고리 유효성 검증 (제공된 경우)
    if (category && !CATEGORY_KEYS.includes(category)) {
      throw new AppError(400, 'VALIDATION_ERROR', '유효하지 않은 카테고리입니다');
    }

    // 책 처리: 선택 사항
    let resolvedBookId: string | null = null;
    let book: any = null;

    if (bookId) {
      // UUID로 먼저 시도
      book = await readerPrisma.book.findUnique({ where: { id: bookId } });

      if (!book && bookIsbn) {
        // ISBN으로 기존 책 검색
        book = await readerPrisma.book.findFirst({ where: { isbn: bookIsbn } });
      }

      if (!book) {
        // 책이 DB에 없으면 새로 생성
        if (!bookTitle) {
          throw new AppError(404, 'NOT_FOUND', '선택한 책을 찾을 수 없습니다');
        }
        book = await writerPrisma.book.create({
          data: {
            title: bookTitle,
            author: bookAuthor || null,
            coverImageUrl: bookCoverImageUrl || null,
            isbn: bookIsbn || bookId,
          },
        });
      }

      resolvedBookId = book.id;
    } else if (bookIsbn || bookTitle) {
      // bookId 없이 ISBN이나 제목으로 책 정보가 온 경우
      if (bookIsbn) {
        book = await readerPrisma.book.findFirst({ where: { isbn: bookIsbn } });
      }
      if (!book && bookTitle) {
        book = await writerPrisma.book.create({
          data: {
            title: bookTitle,
            author: bookAuthor || null,
            coverImageUrl: bookCoverImageUrl || null,
            isbn: bookIsbn || null,
          },
        });
      }
      if (book) resolvedBookId = book.id;
    }

    // 카테고리 유효성 검증 (제공된 경우)
    if (category && !CATEGORY_KEYS.includes(category)) {
      throw new AppError(400, 'VALIDATION_ERROR', '유효하지 않은 카테고리입니다');
    }

    const post = await writerPrisma.communityPost.create({
      data: {
        authorId,
        bookId: resolvedBookId,
        content: content.trim(),
        pageStart: pageStart ?? null,
        pageEnd: pageEnd ?? null,
        category: category ?? null,
      },
      include: {
        author: { select: { id: true, nickname: true, profileImageUrl: true } },
        book: { select: { id: true, title: true, author: true, coverImageUrl: true } },
      },
    });

    // AI 카테고리 자동 분류 (카테고리 미지정 시)
    if (!category && book) {
      try {
        const classificationResult = await aiClassifierService.classifyCategory(
          book.title,
          book.author ?? '',
          content,
        );
        if (classificationResult) {
          await writerPrisma.communityPost.update({
            where: { id: post.id },
            data: { category: classificationResult.category },
          });
          (post as any).category = classificationResult.category;
        }
      } catch (error) {
        // AI 분류 실패 시 게시글 작성을 차단하지 않음
        console.error('[AI Classifier] 카테고리 분류 실패:', error);
      }
    }

    // AI 모더레이션 비동기 실행 (fire-and-forget)
    aiModeratorService.moderatePost(post.id, content).catch(console.error);

    // OpenSearch 인덱싱 (비동기, fire-and-forget - 실패해도 게시글 작성 차단하지 않음)
    communitySearchService.indexPost({
      id: post.id,
      content: post.content,
      category: (post as any).category ?? null,
      authorNickname: post.author.nickname ?? '',
      bookTitle: post.book?.title ?? '',
      bookAuthor: post.book?.author ?? null,
      bookId: post.bookId ?? '',
      isHidden: false,
      createdAt: post.createdAt.toISOString(),
    }).catch(console.error);

    return post;
  },

  /**
   * 게시글 목록 조회
   * - 커서 기반 페이지네이션 (20개 단위)
   * - 카테고리 필터링 (선택)
   * - isHidden=true인 게시글 제외
   * - createdAt DESC 정렬
   */
  async listPosts(params: ListPostsParams = {}) {
    const { category, ...paginationParams } = params;

    const where: any = {
      isHidden: false,
    };

    if (category) {
      where.category = category;
    }

    const result = await paginateWithCursor(
      (args) =>
        readerPrisma.communityPost.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: args.take,
          skip: args.skip,
          cursor: args.cursor,
          include: {
            author: { select: { id: true, nickname: true, profileImageUrl: true } },
            book: { select: { id: true, title: true, author: true, coverImageUrl: true } },
          },
        }),
      paginationParams,
    );

    return result;
  },

  /**
   * 게시글 상세 조회
   * - 작성자 정보 (nickname, profileImageUrl)
   * - 책 정보 (title, author, coverImageUrl)
   * - 댓글 수, 좋아요 수 포함
   */
  async getPostById(postId: string) {
    const post = await readerPrisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, nickname: true, profileImageUrl: true } },
        book: { select: { id: true, title: true, author: true, coverImageUrl: true } },
      },
    });

    if (!post) {
      throw new AppError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다');
    }

    return post;
  },

  /**
   * 게시글 수정
   * - 작성자 본인만 수정 가능
   */
  async updatePost(postId: string, userId: string, input: { content?: string; pageStart?: number | null; pageEnd?: number | null; category?: CategoryKey | null }) {
    const post = await readerPrisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      throw new AppError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다');
    }

    if (post.authorId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인이 작성한 게시글만 수정할 수 있습니다');
    }

    const data: any = {};
    if (input.content !== undefined) data.content = input.content.trim();
    if (input.pageStart !== undefined) data.pageStart = input.pageStart;
    if (input.pageEnd !== undefined) data.pageEnd = input.pageEnd;
    if (input.category !== undefined) data.category = input.category;

    const updated = await writerPrisma.communityPost.update({
      where: { id: postId },
      data,
      include: {
        author: { select: { id: true, nickname: true, profileImageUrl: true } },
        book: { select: { id: true, title: true, author: true, coverImageUrl: true } },
      },
    });

    return updated;
  },

  /**
   * 게시글 삭제
   * - 작성자 본인만 삭제 가능
   */
  async deletePost(postId: string, userId: string) {
    const post = await readerPrisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      throw new AppError(404, 'NOT_FOUND', '게시글을 찾을 수 없습니다');
    }

    if (post.authorId !== userId) {
      throw new AppError(403, 'FORBIDDEN', '본인이 작성한 게시글만 삭제할 수 있습니다');
    }

    await writerPrisma.communityPost.delete({
      where: { id: postId },
    });

    // OpenSearch에서 게시글 삭제 (비동기, fire-and-forget)
    communitySearchService.deletePost(postId).catch(console.error);

    return { success: true };
  },
};
