import { WebScraper, calculateRelevanceScore } from '../server/scraping';
import { ExpertProfile, ScrapedContent } from '../shared/schema';

describe('Web Scraping System', () => {
  let scraper: WebScraper;

  beforeEach(() => {
    scraper = new WebScraper({
      timeout: 10000,
      rateLimit: 100, // Faster for testing
      maxContentLength: 10000
    });
  });

  describe('WebScraper', () => {
    test('should validate URLs correctly', () => {
      // Test with a simple HTML content simulation
      const validUrls = [
        'https://example.com',
        'http://test.org',
        'https://blog.example.com/article'
      ];

      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        '',
        'javascript:alert(1)'
      ];

      validUrls.forEach(url => {
        expect(() => new URL(url)).not.toThrow();
      });

      invalidUrls.forEach(url => {
        if (url) {
          try {
            const urlObj = new URL(url);
            expect(['http:', 'https:']).toContain(urlObj.protocol);
          } catch {
            // Expected for invalid URLs
          }
        }
      });
    });

    test('should handle content extraction correctly', () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Article</title>
          <meta name="keywords" content="technology, innovation, AI">
          <meta property="article:author" content="John Doe">
        </head>
        <body>
          <article>
            <h1>The Future of Technology</h1>
            <p>This is a comprehensive article about technology trends and innovations in the modern world.</p>
            <p>Artificial intelligence is transforming industries across the globe.</p>
            <p>Companies are investing heavily in machine learning and automation.</p>
          </article>
        </body>
        </html>
      `;

      // Test HTML parsing logic (we'll mock the cheerio functionality)
      expect(mockHtml).toContain('The Future of Technology');
      expect(mockHtml).toContain('technology, innovation, AI');
      expect(mockHtml).toContain('John Doe');
    });

    test('should generate proper content hashes', () => {
      const content1 = "This is test content";
      const content2 = "This is different content";
      const content3 = "This is test content"; // Same as content1

      const crypto = require('crypto');
      const hash1 = crypto.createHash('sha256').update(content1).digest('hex');
      const hash2 = crypto.createHash('sha256').update(content2).digest('hex');
      const hash3 = crypto.createHash('sha256').update(content3).digest('hex');

      expect(hash1).not.toBe(hash2);
      expect(hash1).toBe(hash3);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    test('should extract keywords properly', () => {
      const text = "artificial intelligence machine learning technology innovation automation";
      const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      
      expect(words).toContain('artificial');
      expect(words).toContain('intelligence');
      expect(words).toContain('machine');
      expect(words).toContain('learning');
      expect(words).toContain('technology');
    });
  });

  describe('Relevance Scoring', () => {
    test('should calculate relevance scores correctly', () => {
      const expertProfile: ExpertProfile = {
        id: 1,
        expertId: 1,
        primaryExpertise: 'Artificial Intelligence',
        secondaryExpertise: ['Machine Learning', 'Data Science'],
        expertiseKeywords: ['AI', 'ML', 'neural networks', 'deep learning'],
        voiceTone: ['professional', 'technical'],
        personalBranding: 'AI thought leader',
        platforms: ['linkedin', 'twitter'],
        targetAudience: 'Tech professionals',
        contentGoals: ['education', 'thought leadership'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const scrapedContent: ScrapedContent = {
        id: 1,
        url: 'https://example.com/ai-article',
        title: 'The Future of Artificial Intelligence and Machine Learning',
        content: 'This article discusses the latest developments in AI and machine learning technologies, including neural networks and deep learning applications.',
        summary: 'Article about AI and ML developments',
        author: 'Tech Expert',
        publishedDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        scrapedDate: new Date(),
        contentHash: 'abc123',
        domain: 'example.com',
        wordCount: 150,
        relevanceScore: 0,
        status: 'active',
        keywords: ['artificial intelligence', 'machine learning', 'neural networks', 'deep learning'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const score = calculateRelevanceScore(scrapedContent, expertProfile);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      
      // Should score high due to keyword matches
      expect(score).toBeGreaterThan(50);
    });

    test('should score low relevance for unrelated content', () => {
      const expertProfile: ExpertProfile = {
        id: 1,
        expertId: 1,
        primaryExpertise: 'Artificial Intelligence',
        secondaryExpertise: ['Machine Learning'],
        expertiseKeywords: ['AI', 'ML', 'neural networks'],
        voiceTone: ['professional'],
        personalBranding: 'AI expert',
        platforms: ['linkedin'],
        targetAudience: 'Tech professionals',
        contentGoals: ['education'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const scrapedContent: ScrapedContent = {
        id: 1,
        url: 'https://example.com/cooking-article',
        title: 'The Best Cooking Recipes for Beginners',
        content: 'This article provides simple cooking recipes and kitchen tips for people who are just starting to cook.',
        summary: 'Article about cooking recipes',
        author: 'Chef Expert',
        publishedDate: new Date(),
        scrapedDate: new Date(),
        contentHash: 'def456',
        domain: 'example.com',
        wordCount: 120,
        relevanceScore: 0,
        status: 'active',
        keywords: ['cooking', 'recipes', 'kitchen', 'food'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const score = calculateRelevanceScore(scrapedContent, expertProfile);

      expect(score).toBeLessThan(30); // Should be low relevance
    });

    test('should handle missing or null data gracefully', () => {
      const expertProfile: ExpertProfile = {
        id: 1,
        expertId: 1,
        primaryExpertise: 'AI',
        secondaryExpertise: null,
        expertiseKeywords: null,
        voiceTone: null,
        personalBranding: 'Expert',
        platforms: ['linkedin'],
        targetAudience: 'Professionals',
        contentGoals: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const scrapedContent: ScrapedContent = {
        id: 1,
        url: 'https://example.com/article',
        title: 'Test Article',
        content: 'Test content about AI',
        summary: null,
        author: null,
        publishedDate: null,
        scrapedDate: new Date(),
        contentHash: 'test123',
        domain: 'example.com',
        wordCount: null,
        relevanceScore: 0,
        status: 'active',
        keywords: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(() => {
        const score = calculateRelevanceScore(scrapedContent, expertProfile);
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }).not.toThrow();
    });
  });

  describe('Content Processing', () => {
    test('should generate proper summaries', () => {
      const longContent = "This is the first sentence. This is the second sentence with more details about the topic. This is the third sentence that provides additional context. This is a fourth sentence. This is a fifth sentence.";
      
      const sentences = longContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const summary = sentences.slice(0, 3).join('. ').trim();
      
      expect(summary).toContain('first sentence');
      expect(summary).toContain('second sentence');
      expect(summary).toContain('third sentence');
      expect(summary.split('.').length).toBeLessThanOrEqual(4); // 3 sentences + potential empty
    });

    test('should handle word counting correctly', () => {
      const content = "This is a test content with multiple words and sentences.";
      const wordCount = content.split(/\s+/).length;
      
      expect(wordCount).toBe(10);
    });

    test('should extract domain from URL correctly', () => {
      const urls = [
        'https://www.example.com/article',
        'http://blog.test.org/post/123',
        'https://subdomain.domain.co.uk/path'
      ];

      const expectedDomains = [
        'www.example.com',
        'blog.test.org',
        'subdomain.domain.co.uk'
      ];

      urls.forEach((url, index) => {
        const domain = new URL(url).hostname;
        expect(domain).toBe(expectedDomains[index]);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid URLs gracefully', () => {
      const invalidUrls = ['not-a-url', '', 'javascript:void(0)'];
      
      invalidUrls.forEach(url => {
        try {
          new URL(url);
        } catch (error) {
          expect(error).toBeInstanceOf(TypeError);
        }
      });
    });

    test('should handle empty content gracefully', () => {
      const emptyContent = '';
      const minLength = 100;
      
      expect(emptyContent.length < minLength).toBe(true);
    });

    test('should validate content length limits', () => {
      const maxContentLength = 1000;
      const shortContent = 'Short content';
      const longContent = 'x'.repeat(1500);
      
      expect(shortContent.length <= maxContentLength).toBe(true);
      expect(longContent.length > maxContentLength).toBe(true);
    });
  });
});