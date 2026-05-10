import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spoilerService, CommunityPostForFilter } from './spoiler.service';

// Mock prisma
vi.mock('../lib/prisma', () => ({
  writerPrisma: {
    userSpoilerSetting: {
      upsert: vi.fn(),
    },
  },
  readerPrisma: {
    userSpoilerSetting: {
      findUnique: vi.fn(),
    },
    readingStatus: {
      findMany: vi.fn(),
    },
  },
}));

import { writerPrisma, readerPrisma } from '../lib/prisma';

const mockReaderPrisma = readerPrisma as any;
const mockWriterPrisma = writerPrisma as any;

describe('spoilerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserSetting', () => {
    it('should return "off" when no setting record exists', async () => {
      mockReaderPrisma.userSpoilerSetting.findUnique.mockResolvedValue(null);

      const result = await spoilerService.getUserSetting('user-1');

      expect(result).toBe('off');
      expect(mockReaderPrisma.userSpoilerSetting.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should return the stored mode when setting exists', async () => {
      mockReaderPrisma.userSpoilerSetting.findUnique.mockResolvedValue({
        id: 'setting-1',
        userId: 'user-1',
        mode: 'hide_completely',
      });

      const result = await spoilerService.getUserSetting('user-1');

      expect(result).toBe('hide_completely');
    });

    it('should return "hide_content" when that mode is stored', async () => {
      mockReaderPrisma.userSpoilerSetting.findUnique.mockResolvedValue({
        id: 'setting-1',
        userId: 'user-1',
        mode: 'hide_content',
      });

      const result = await spoilerService.getUserSetting('user-1');

      expect(result).toBe('hide_content');
    });
  });

  describe('updateSetting', () => {
    it('should upsert the spoiler setting', async () => {
      mockWriterPrisma.userSpoilerSetting.upsert.mockResolvedValue({});

      await spoilerService.updateSetting('user-1', 'hide_completely');

      expect(mockWriterPrisma.userSpoilerSetting.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', mode: 'hide_completely' },
        update: { mode: 'hide_completely' },
      });
    });

    it('should throw error for invalid mode', async () => {
      await expect(
        spoilerService.updateSetting('user-1', 'invalid_mode' as any),
      ).rejects.toThrow('유효하지 않은 스포일러 필터 모드입니다');
    });
  });

  describe('getUserReadBookIds', () => {
    it('should return book IDs with reading or completed status', async () => {
      mockReaderPrisma.readingStatus.findMany.mockResolvedValue([
        { bookId: 'book-1' },
        { bookId: 'book-2' },
        { bookId: 'book-3' },
      ]);

      const result = await spoilerService.getUserReadBookIds('user-1');

      expect(result).toEqual(['book-1', 'book-2', 'book-3']);
      expect(mockReaderPrisma.readingStatus.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: { in: ['reading', 'completed'] },
        },
        select: { bookId: true },
      });
    });

    it('should return empty array when user has no reading statuses', async () => {
      mockReaderPrisma.readingStatus.findMany.mockResolvedValue([]);

      const result = await spoilerService.getUserReadBookIds('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('filterPosts', () => {
    const samplePosts: CommunityPostForFilter[] = [
      { id: 'post-1', bookId: 'book-1', content: '읽은 책에 대한 감상' },
      { id: 'post-2', bookId: 'book-2', content: '읽고 있는 책에 대한 감상' },
      { id: 'post-3', bookId: 'book-3', content: '안 읽은 책에 대한 스포일러' },
      { id: 'post-4', bookId: 'book-4', content: '또 다른 안 읽은 책 감상' },
    ];

    beforeEach(() => {
      // user has read book-1 (completed) and book-2 (reading)
      mockReaderPrisma.readingStatus.findMany.mockResolvedValue([
        { bookId: 'book-1' },
        { bookId: 'book-2' },
      ]);
    });

    it('should return all posts unchanged when mode is "off"', async () => {
      const result = await spoilerService.filterPosts(samplePosts, 'user-1', 'off');

      expect(result).toHaveLength(4);
      expect(result.every((p) => p.isSpoilerMasked === false)).toBe(true);
      expect(result[0].content).toBe('읽은 책에 대한 감상');
      expect(result[2].content).toBe('안 읽은 책에 대한 스포일러');
    });

    it('should exclude unread book posts when mode is "hide_completely"', async () => {
      const result = await spoilerService.filterPosts(samplePosts, 'user-1', 'hide_completely');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('post-1');
      expect(result[1].id).toBe('post-2');
      expect(result.every((p) => p.isSpoilerMasked === false)).toBe(true);
    });

    it('should mask content of unread book posts when mode is "hide_content"', async () => {
      const result = await spoilerService.filterPosts(samplePosts, 'user-1', 'hide_content');

      expect(result).toHaveLength(4);

      // Read books - content visible
      expect(result[0].content).toBe('읽은 책에 대한 감상');
      expect(result[0].isSpoilerMasked).toBe(false);
      expect(result[1].content).toBe('읽고 있는 책에 대한 감상');
      expect(result[1].isSpoilerMasked).toBe(false);

      // Unread books - content masked
      expect(result[2].content).toBe('스포일러 방지를 위해 내용이 숨겨져 있습니다');
      expect(result[2].isSpoilerMasked).toBe(true);
      expect(result[3].content).toBe('스포일러 방지를 위해 내용이 숨겨져 있습니다');
      expect(result[3].isSpoilerMasked).toBe(true);
    });

    it('should not call readingStatus when mode is "off"', async () => {
      await spoilerService.filterPosts(samplePosts, 'user-1', 'off');

      expect(mockReaderPrisma.readingStatus.findMany).not.toHaveBeenCalled();
    });

    it('should handle empty posts array', async () => {
      const result = await spoilerService.filterPosts([], 'user-1', 'hide_completely');

      expect(result).toEqual([]);
    });

    it('should exclude all posts when user has no reading statuses (hide_completely)', async () => {
      mockReaderPrisma.readingStatus.findMany.mockResolvedValue([]);

      const result = await spoilerService.filterPosts(samplePosts, 'user-1', 'hide_completely');

      expect(result).toHaveLength(0);
    });

    it('should mask all posts when user has no reading statuses (hide_content)', async () => {
      mockReaderPrisma.readingStatus.findMany.mockResolvedValue([]);

      const result = await spoilerService.filterPosts(samplePosts, 'user-1', 'hide_content');

      expect(result).toHaveLength(4);
      expect(result.every((p) => p.isSpoilerMasked === true)).toBe(true);
      expect(result.every((p) => p.content === '스포일러 방지를 위해 내용이 숨겨져 있습니다')).toBe(true);
    });
  });
});
