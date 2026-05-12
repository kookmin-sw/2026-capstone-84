import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { aiClassifierService } from './ai-classifier.service';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('aiClassifierService', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  describe('classifyCategory', () => {
    it('should return null when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;

      const result = await aiClassifierService.classifyCategory(
        '82년생 김지영',
        '조남주',
        '이 책은 한국 사회의 여성 문제를 다룬 소설입니다.',
      );

      expect(result).toBeNull();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should classify a Korean novel correctly', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"category": "korean_novel", "confidence": 0.92}',
              },
            },
          ],
        },
      });

      const result = await aiClassifierService.classifyCategory(
        '82년생 김지영',
        '조남주',
        '이 책은 한국 사회의 여성 문제를 다룬 소설입니다.',
      );

      expect(result).toEqual({ category: 'korean_novel', confidence: 0.92 });
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
        }),
      );
    });

    it('should return null when API call fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await aiClassifierService.classifyCategory(
        'Test Book',
        'Test Author',
        'Some content',
      );

      expect(result).toBeNull();
    });

    it('should return null when API returns invalid JSON', async () => {
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

      const result = await aiClassifierService.classifyCategory(
        'Test Book',
        'Test Author',
        'Some content',
      );

      expect(result).toBeNull();
    });

    it('should default to "other" for unknown categories', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"category": "unknown_category", "confidence": 0.8}',
              },
            },
          ],
        },
      });

      const result = await aiClassifierService.classifyCategory(
        'Test Book',
        'Test Author',
        'Some content',
      );

      expect(result).toEqual({ category: 'other', confidence: 0.8 });
    });

    it('should clamp confidence between 0 and 1', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '{"category": "science", "confidence": 1.5}',
              },
            },
          ],
        },
      });

      const result = await aiClassifierService.classifyCategory(
        'Cosmos',
        'Carl Sagan',
        'A journey through the universe',
      );

      expect(result).toEqual({ category: 'science', confidence: 1 });
    });

    it('should return null when API returns empty choices', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { choices: [] },
      });

      const result = await aiClassifierService.classifyCategory(
        'Test Book',
        'Test Author',
        'Some content',
      );

      expect(result).toBeNull();
    });
  });
});
