import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SourceValidator } from '../server/services/source-validator';

// Mock fetch
global.fetch = jest.fn();

describe('SourceValidator', () => {
  let validator: SourceValidator;

  beforeEach(() => {
    validator = new SourceValidator();
    (fetch as jest.MockedFunction<typeof fetch>).mockReset();
  });

  describe('validate()', () => {
    test('should validate accessible URL correctly', async () => {
      const mockResponse = {
        ok: true,
        status: 200
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const result = await validator.validate('https://example.com/article');

      expect(result).toEqual({
        url: 'https://example.com/article',
        isValid: true,
        isAccessible: true
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/article',
        expect.objectContaining({
          method: 'HEAD',
          headers: {
            'User-Agent': 'ExpertPlanner/1.0'
          }
        })
      );
    });

    test('should reject blacklisted domains', async () => {
      const result = await validator.validate('https://example.com/test');

      expect(result).toEqual({
        url: 'https://example.com/test',
        isValid: false,
        isAccessible: false,
        reason: 'Domain is blacklisted'
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    test('should reject invalid protocols', async () => {
      const result = await validator.validate('ftp://example.org/file');

      expect(result).toEqual({
        url: 'ftp://example.org/file',
        isValid: false,
        isAccessible: false,
        reason: 'Invalid protocol'
      });
    });

    test('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const result = await validator.validate('https://validsite.com/missing');

      expect(result).toEqual({
        url: 'https://validsite.com/missing',
        isValid: false,
        isAccessible: false,
        reason: 'HTTP 404'
      });
    });

    test('should handle network timeouts', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network timeout'));

      const result = await validator.validate('https://slowsite.com/page');

      expect(result).toEqual({
        url: 'https://slowsite.com/page',
        isValid: false,
        isAccessible: false,
        reason: 'Not accessible'
      });
    });

    test('should handle malformed URLs', async () => {
      const result = await validator.validate('not-a-valid-url');

      expect(result).toEqual({
        url: 'not-a-valid-url',
        isValid: false,
        isAccessible: false,
        reason: 'Invalid URL format'
      });
    });
  });

  describe('validateBatch()', () => {
    test('should validate multiple URLs in batches', async () => {
      const urls = [
        'https://validsite1.com',
        'https://validsite2.com',
        'https://example.com', // blacklisted
        'https://validsite3.com'
      ];

      // Mock responses for valid URLs
      const mockResponse = { ok: true, status: 200 };
      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(mockResponse as any)
        .mockResolvedValueOnce(mockResponse as any)
        .mockResolvedValueOnce(mockResponse as any);

      const results = await validator.validateBatch(urls);

      expect(results).toHaveLength(4);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
      expect(results[2].isValid).toBe(false); // blacklisted
      expect(results[2].reason).toBe('Domain is blacklisted');
      expect(results[3].isValid).toBe(true);

      // Should only call fetch for non-blacklisted URLs
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    test('should process large batches correctly', async () => {
      const urls = Array.from({ length: 12 }, (_, i) => `https://site${i}.com`);
      
      // Mock all responses as successful
      const mockResponse = { ok: true, status: 200 };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

      const results = await validator.validateBatch(urls);

      expect(results).toHaveLength(12);
      expect(results.every(r => r.isValid)).toBe(true);
      
      // Should process in batches of 5
      expect(fetch).toHaveBeenCalledTimes(12);
    });

    test('should handle mixed success/failure results', async () => {
      const urls = [
        'https://validsite.com',
        'https://brokensite.com',
        'https://anothervalid.com'
      ];

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({ ok: true, status: 200 } as any)
        .mockResolvedValueOnce({ ok: false, status: 500 } as any)
        .mockResolvedValueOnce({ ok: true, status: 200 } as any);

      const results = await validator.validateBatch(urls);

      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[1].reason).toBe('HTTP 500');
      expect(results[2].isValid).toBe(true);
    });
  });
});