import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PerplexityService } from '../server/services/perplexity';

// Mock environment variables
const mockEnv = {
  PERPLEXITY_API_KEY: 'test-api-key',
  PERPLEXITY_ENABLED: 'true'
};

// Mock fetch
global.fetch = jest.fn();

describe('PerplexityService', () => {
  let service: PerplexityService;
  let originalEnv: any;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };
    
    // Set test environment
    Object.assign(process.env, mockEnv);
    
    // Create fresh service instance
    service = new PerplexityService();
    
    // Reset fetch mock
    (fetch as jest.MockedFunction<typeof fetch>).mockReset();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('isEnabled()', () => {
    test('should return true when API key and enabled flag are set', () => {
      expect(service.isEnabled()).toBe(true);
    });

    test('should return false when API key is missing', () => {
      delete process.env.PERPLEXITY_API_KEY;
      const newService = new PerplexityService();
      expect(newService.isEnabled()).toBe(false);
    });

    test('should return false when enabled flag is false', () => {
      process.env.PERPLEXITY_ENABLED = 'false';
      const newService = new PerplexityService();
      expect(newService.isEnabled()).toBe(false);
    });
  });

  describe('search()', () => {
    test('should throw error when service is disabled', async () => {
      process.env.PERPLEXITY_ENABLED = 'false';
      const disabledService = new PerplexityService();
      
      await expect(disabledService.search('test query')).rejects.toThrow('Perplexity service is not enabled');
    });

    test('should make successful API call with correct parameters', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Test response content'
            }
          }],
          citations: ['https://example.com'],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20
          }
        })
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      const result = await service.search('test query', {
        domains: ['example.com'],
        recency: 'week',
        maxResults: 5
      });

      expect(fetch).toHaveBeenCalledWith(
        'https://api.perplexity.ai/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('test query')
        })
      );

      expect(result).toEqual({
        content: 'Test response content',
        sources: ['https://example.com'],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20
        }
      });
    });

    test('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      await expect(service.search('test query')).rejects.toThrow('Perplexity API error: 429 - Rate limit exceeded');
    });

    test('should handle network errors', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.search('test query')).rejects.toThrow('Network error');
    });

    test('should build search query with options', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'test' } }],
          citations: [],
          usage: {}
        })
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      await service.search('AI trends', {
        recency: 'month',
        maxResults: 3
      });

      const callBody = JSON.parse((fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as string);
      
      expect(callBody.messages[0].content).toContain('AI trends');
      expect(callBody.messages[0].content).toContain('last month');
      expect(callBody.messages[0].content).toContain('3 most relevant results');
    });

    test('should use correct model and parameters', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'test' } }],
          citations: [],
          usage: {}
        })
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      await service.search('test query');

      const callBody = JSON.parse((fetch as jest.MockedFunction<typeof fetch>).mock.calls[0][1]?.body as string);
      
      expect(callBody.model).toBe('llama-3.1-sonar-small-128k-online');
      expect(callBody.return_citations).toBe(true);
      expect(callBody.max_tokens).toBe(1000);
      expect(callBody.temperature).toBe(0.1);
    });
  });
});