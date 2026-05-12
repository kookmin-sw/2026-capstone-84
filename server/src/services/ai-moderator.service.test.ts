import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { aiModeratorService } from './ai-moderator.service';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

vi.mock('../lib/prisma', () => ({
  writerPrisma: {
    user: {
      findFirst: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
  readerPrisma: {},
}));

import { writerPrisma } from '../lib/prisma';
const mockedWriterPrisma = vi.mocked(writerPrisma);

describe('aiModeratorService', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  describe('checkContent', () => {
    it('should return safe default when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;

      const result = await aiModeratorService.checkContent('some content');

      expect(result).toEqual({ isSuspicious: false, confidence: 0 });
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should detect suspicious content', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"isSuspicious": true, "reason": "스팸성 광고 콘텐츠", "confidence": 0.95}',
              },
            },
          ],
        },
      });

      const result = await aiModeratorService.checkContent('무료 상품 받아가세요! 링크 클릭!');

      expect(result).toEqual({
        isSuspicious: true,
        reason: '스팸성 광고 콘텐츠',
        confidence: 0.95,
      });
    });

    it('should return safe result for normal content', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"isSuspicious": false, "reason": "", "confidence": 0.98}',
              },
            },
          ],
        },
      });

      const result = await aiModeratorService.checkContent('이 책 정말 재미있게 읽었습니다.');

      expect(result).toEqual({
        isSuspicious: false,
        confidence: 0.98,
      });
      expect(result.reason).toBeUndefined();
    });

    it('should return safe default on API failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await aiModeratorService.checkContent('some content');

      expect(result).toEqual({ isSuspicious: false, confidence: 0 });
    });

    it('should return safe default on invalid JSON response', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: 'This is not valid JSON',
              },
            },
          ],
        },
      });

      const result = await aiModeratorService.checkContent('some content');

      expect(result).toEqual({ isSuspicious: false, confidence: 0 });
    });

    it('should clamp confidence between 0 and 1', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"isSuspicious": true, "reason": "test", "confidence": 1.5}',
              },
            },
          ],
        },
      });

      const result = await aiModeratorService.checkContent('test content');

      expect(result.confidence).toBe(1);
    });

    it('should call OpenAI API with correct parameters', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"isSuspicious": false, "reason": "", "confidence": 0.9}',
              },
            },
          ],
        },
      });

      await aiModeratorService.checkContent('test content');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' }),
          ]),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
          timeout: 10000,
        }),
      );
    });
  });

  describe('moderatePost', () => {
    it('should create admin notification when content is suspicious', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"isSuspicious": true, "reason": "혐오 발언 포함", "confidence": 0.9}',
              },
            },
          ],
        },
      });

      (mockedWriterPrisma.user.findFirst as any).mockResolvedValueOnce({ id: 'admin-user-id' });
      (mockedWriterPrisma.notification.create as any).mockResolvedValueOnce({});

      await aiModeratorService.moderatePost('post-123', '부적절한 내용');

      expect(mockedWriterPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          recipientId: 'admin-user-id',
          type: 'moderation_alert',
          title: 'AI 모더레이션 알림',
          linkUrl: '/community/post-123',
          isRead: false,
        }),
      });
    });

    it('should not create notification when content is safe', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"isSuspicious": false, "reason": "", "confidence": 0.95}',
              },
            },
          ],
        },
      });

      await aiModeratorService.moderatePost('post-123', '정상적인 내용');

      expect(mockedWriterPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should not throw on API failure (fire-and-forget safe)', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API down'));

      await expect(
        aiModeratorService.moderatePost('post-123', 'some content'),
      ).resolves.not.toThrow();
    });

    it('should not throw when no admin user found', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"isSuspicious": true, "reason": "spam", "confidence": 0.8}',
              },
            },
          ],
        },
      });

      (mockedWriterPrisma.user.findFirst as any).mockResolvedValueOnce(null);

      await expect(
        aiModeratorService.moderatePost('post-123', 'spam content'),
      ).resolves.not.toThrow();

      expect(mockedWriterPrisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
