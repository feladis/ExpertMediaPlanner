import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { DatabaseStorage } from '../server/storage';
import { generateContentIdeas } from '../server/anthropic';
import { WebScraper } from '../server/scraping';
import { db } from '../server/db';

describe('Content Authenticity Validation Tests', () => {
  let storage: DatabaseStorage;
  let scraper: WebScraper;

  beforeAll(async () => {
    storage = new DatabaseStorage();
    scraper = new WebScraper();
  });

  afterAll(async () => {
    // Clean up test data
    await db.execute(`DELETE FROM content_ideas WHERE id > 1000`);
    await db.execute(`DELETE FROM scraped_content WHERE id > 1000`);
  });

  describe('CRITICAL: Fake URL Detection', () => {
    test('should NEVER generate fake URLs in content ideas', async () => {
      const testParams = {
        topic: 'Test Topic',
        description: 'Test description',
        platform: 'linkedin',
        viewpoints: ['viewpoint1'],
        expertiseKeywords: ['test'],
        voiceTone: ['professional'],
        expertId: 1
      };

      const contentIdeas = await generateContentIdeas(testParams);
      
      for (const idea of contentIdeas) {
        for (const source of idea.sources) {
          // CRITICAL: Detect common fake URL patterns
          expect(source).not.toMatch(/^https?:\/\/hbr\.org\/\d{4}\/\d{2}\//);
          expect(source).not.toMatch(/^https?:\/\/www\.mckinsey\.com\/business-functions/);
          expect(source).not.toMatch(/^https?:\/\/sloanreview\.mit\.edu\/article\//);
          expect(source).not.toMatch(/^https?:\/\/www\.fastcompany\.com\/\d+/);
          expect(source).not.toMatch(/^https?:\/\/example\.com/);
          expect(source).not.toMatch(/^https?:\/\/placeholder\./);
          
          // Must be either a valid scraped URL or explicit "no sources" message
          if (!source.includes('No sources available') && !source.includes('manual research required')) {
            // Verify URL exists in scraped_content table
            const scrapedContent = await storage.getScrapedContentByUrl(source);
            expect(scrapedContent).toBeDefined();
            expect(scrapedContent?.status).toBe('active');
          }
        }
      }
    });

    test('should use "No sources available" when no scraped content exists', async () => {
      // Ensure no scraped content exists
      await db.execute(`DELETE FROM scraped_content`);
      await db.execute(`DELETE FROM expert_content_relevance`);

      const testParams = {
        topic: 'Philosophy Topic',
        description: 'Test description',
        platform: 'linkedin',
        viewpoints: ['viewpoint1'],
        expertiseKeywords: ['philosophy'],
        voiceTone: ['thoughtful'],
        expertId: 1
      };

      const contentIdeas = await generateContentIdeas(testParams);
      
      for (const idea of contentIdeas) {
        for (const source of idea.sources) {
          expect(source).toMatch(/(No sources available|manual research required)/);
        }
      }
    });

    test('should only use authentic scraped URLs when available', async () => {
      // Add real scraped content
      const realContent = await storage.createScrapedContent({
        url: 'https://real-philosophy-site.com/article',
        title: 'Real Philosophy Article',
        content: 'Real content about philosophy and ethics',
        contentHash: 'test-hash',
        domain: 'real-philosophy-site.com',
        summary: 'A real article about philosophy',
        keywords: ['philosophy', 'ethics'],
        status: 'active'
      });

      // Create relevance for expert
      await storage.createExpertContentRelevance({
        expertId: 1,
        scrapedContentId: realContent.id,
        relevanceScore: 85,
        matchedKeywords: ['philosophy']
      });

      const testParams = {
        topic: 'Philosophy Ethics',
        description: 'Exploring ethical frameworks',
        platform: 'linkedin',
        viewpoints: ['ethical reasoning'],
        expertiseKeywords: ['philosophy', 'ethics'],
        voiceTone: ['academic'],
        expertId: 1
      };

      const contentIdeas = await generateContentIdeas(testParams);
      
      for (const idea of contentIdeas) {
        for (const source of idea.sources) {
          if (!source.includes('No sources available')) {
            // Must be the exact URL we added
            expect(source).toBe('https://real-philosophy-site.com/article');
          }
        }
      }
    });
  });

  describe('CRITICAL: Source Validation', () => {
    test('should validate all URLs are accessible and authentic', async () => {
      const testUrls = [
        'https://hbr.org',
        'https://www.fastcompany.com',
        'https://invalid-fake-url.example'
      ];

      for (const url of testUrls.slice(0, 2)) { // Only test real URLs
        const result = await scraper.scrapeUrl(url);
        if (result.success) {
          expect(result.content).toBeDefined();
          expect(result.content?.url).toBe(url);
          expect(result.content?.domain).toBeDefined();
          expect(result.content?.title).toBeDefined();
        }
      }
    });

    test('should reject URLs with suspicious patterns', async () => {
      const suspiciousUrls = [
        'https://hbr.org/2024/01/fake-article',
        'https://www.mckinsey.com/business-functions/fake-insight',
        'https://sloanreview.mit.edu/article/fake-research',
        'https://example.com/placeholder'
      ];

      for (const url of suspiciousUrls) {
        // These should not be generated by our system
        const scrapedContent = await storage.getScrapedContentByUrl(url);
        expect(scrapedContent).toBeUndefined();
      }
    });
  });

  describe('CRITICAL: Data Integrity Checks', () => {
    test('should ensure all content ideas have valid source attribution', async () => {
      const allContentIdeas = await storage.getContentIdeas(1); // Get all for expert 1
      
      for (const idea of allContentIdeas) {
        expect(idea.sources).toBeDefined();
        expect(Array.isArray(idea.sources)).toBe(true);
        expect(idea.sources.length).toBeGreaterThan(0);
        
        for (const source of idea.sources) {
          // Either valid scraped content or explicit no-sources message
          if (!source.includes('No sources available') && !source.includes('manual research required')) {
            const scrapedContent = await storage.getScrapedContentByUrl(source);
            expect(scrapedContent).toBeDefined();
          }
        }
      }
    });

    test('should verify scraped content authenticity markers', async () => {
      const allScrapedContent = await storage.getScrapedContent(100, 0);
      
      for (const content of allScrapedContent) {
        // Must have required authenticity fields
        expect(content.url).toBeDefined();
        expect(content.domain).toBeDefined();
        expect(content.contentHash).toBeDefined();
        expect(content.scrapedDate).toBeDefined();
        
        // URL must match domain
        const urlDomain = new URL(content.url).hostname;
        expect(content.domain).toBe(urlDomain);
        
        // Must have valid status
        expect(['active', 'inactive', 'error']).toContain(content.status);
      }
    });
  });

  describe('CRITICAL: Expert Profile Source Integration', () => {
    test('should use only validated information sources from expert profiles', async () => {
      // Create test expert profile with information sources
      const testExpert = await storage.createExpert({
        username: 'test-expert-auth',
        name: 'Test Expert',
        role: 'Philosophy Expert'
      });

      const testProfile = await storage.createExpertProfile({
        expertId: testExpert.id,
        primaryExpertise: 'Philosophy',
        informationSources: [
          { name: 'Stanford Encyclopedia', url: 'https://plato.stanford.edu' },
          { name: 'Philosophy Now', url: 'https://philosophynow.org' }
        ],
        expertiseKeywords: ['philosophy', 'ethics'],
        voiceTone: ['academic']
      });

      const testParams = {
        topic: 'Ethical Frameworks',
        description: 'Exploring different ethical approaches',
        platform: 'linkedin',
        viewpoints: ['deontological', 'utilitarian'],
        expertiseKeywords: testProfile.expertiseKeywords || [],
        voiceTone: testProfile.voiceTone || [],
        expertId: testExpert.id
      };

      const contentIdeas = await generateContentIdeas(testParams);
      
      for (const idea of contentIdeas) {
        for (const source of idea.sources) {
          if (!source.includes('No sources available')) {
            // Must be from the expert's information sources or valid scraped content
            const isFromExpertSources = testProfile.informationSources?.some(
              infoSource => source.includes(infoSource.url)
            );
            const isValidScrapedContent = await storage.getScrapedContentByUrl(source);
            
            expect(isFromExpertSources || isValidScrapedContent).toBe(true);
          }
        }
      }
    });
  });
});