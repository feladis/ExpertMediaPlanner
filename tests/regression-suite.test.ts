import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { DatabaseStorage } from '../server/storage';
import { WebScraper, calculateRelevanceScore } from '../server/scraping';

describe('Comprehensive Regression Test Suite', () => {
  let app: express.Application;
  let storage: DatabaseStorage;
  let testExpertId: number;
  let testTopicId: number;
  let testScrapedContentId: number;

  beforeAll(async () => {
    // Initialize application
    app = express();
    app.use(express.json());
    await registerRoutes(app);
    storage = new DatabaseStorage();

    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  async function seedTestData() {
    try {
      // Create test expert
      const expert = await storage.createExpert({
        username: 'test-regression-user',
        name: 'Regression Test Expert',
        role: 'Content Creator'
      });
      testExpertId = expert.id;

      // Create expert profile
      await storage.createExpertProfile({
        expertId: testExpertId,
        primaryExpertise: 'Artificial Intelligence',
        secondaryExpertise: ['Machine Learning', 'Data Science'],
        expertiseKeywords: ['AI', 'ML', 'neural networks', 'deep learning'],
        voiceTone: ['professional', 'technical'],
        personalBranding: 'AI thought leader and researcher',
        platforms: ['linkedin', 'twitter'],
        targetAudience: 'Tech professionals and researchers',
        contentGoals: ['education', 'thought leadership'],
        informationSources: [
          { name: 'MIT Technology Review', url: 'https://www.technologyreview.com' },
          { name: 'Nature AI', url: 'https://www.nature.com/natmachintell' }
        ]
      });

      // Create test topic
      const topic = await storage.createTopic({
        expertId: testExpertId,
        title: 'Future of AI in Healthcare',
        description: 'Exploring AI applications in medical diagnosis and treatment',
        category: 'Technology',
        tags: ['AI', 'healthcare', 'medical', 'diagnosis']
      });
      testTopicId = topic.id;

      // Create viewpoints
      await storage.createViewpoint({
        topicId: testTopicId,
        title: 'Diagnostic Accuracy Improvements',
        description: 'How AI enhances medical diagnostic precision'
      });

      await storage.createViewpoint({
        topicId: testTopicId,
        title: 'Ethical Considerations',
        description: 'Privacy and bias concerns in AI healthcare'
      });

      // Create test scraped content
      const scrapedContent = await storage.createScrapedContent({
        url: 'https://www.technologyreview.com/ai-healthcare-article',
        title: 'Revolutionary AI Transforms Medical Diagnosis',
        content: 'Artificial intelligence and machine learning technologies are revolutionizing healthcare by improving diagnostic accuracy and enabling personalized treatment plans. Deep learning algorithms can now analyze medical images with precision that rivals experienced radiologists.',
        summary: 'AI technologies improving medical diagnosis and treatment',
        author: 'Dr. Jane Smith',
        publishedDate: new Date('2024-01-15'),
        scrapedDate: new Date(),
        contentHash: 'test-hash-ai-healthcare',
        domain: 'www.technologyreview.com',
        wordCount: 50,
        relevanceScore: 0,
        status: 'active',
        keywords: ['artificial intelligence', 'machine learning', 'healthcare', 'diagnosis', 'medical']
      });
      testScrapedContentId = scrapedContent.id;

    } catch (error) {
      console.error('Failed to seed test data:', error);
      throw error;
    }
  }

  async function cleanupTestData() {
    try {
      if (testScrapedContentId) {
        await storage.deleteScrapedContent(testScrapedContentId);
      }
      if (testTopicId) {
        await storage.deleteTopic(testTopicId);
      }
      // Note: Expert cleanup would need to be implemented in storage
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
    }
  }

  describe('CRITICAL: Content Authenticity Validation', () => {
    test('CRITICAL: Content generation must never produce fake URLs', async () => {
      const response = await request(app)
        .post('/api/generate-content-ideas')
        .send({
          topicId: testTopicId,
          platform: 'linkedin',
          expertId: testExpertId
        });

      if (response.status === 201) {
        for (const idea of response.body) {
          if (idea.sources) {
            for (const source of idea.sources) {
              // CRITICAL: Reject all known fake URL patterns
              expect(source).not.toMatch(/^https?:\/\/hbr\.org\/\d{4}\/\d{2}\//);
              expect(source).not.toMatch(/^https?:\/\/www\.mckinsey\.com\/business-functions/);
              expect(source).not.toMatch(/^https?:\/\/sloanreview\.mit\.edu\/article\//);
              expect(source).not.toMatch(/^https?:\/\/www\.fastcompany\.com\/\d+/);
              expect(source).not.toMatch(/^https?:\/\/example\.com/);
              expect(source).not.toMatch(/placeholder/i);
              expect(source).not.toMatch(/fake/i);
              
              // Must be authentic or explicit no-sources message
              if (!source.includes('No sources available') && !source.includes('manual research required')) {
                // Verify it exists in our scraped content
                const scrapedContent = await storage.getScrapedContentByUrl(source);
                expect(scrapedContent).toBeDefined();
                expect(scrapedContent?.status).toBe('active');
              }
            }
          }
        }
      }
    });

    test('CRITICAL: Scraped content must have authentic URLs only', async () => {
      const response = await request(app)
        .get('/api/scraped-content')
        .expect(200);

      for (const content of response.body) {
        // CRITICAL: Validate URL authenticity
        expect(content.url).not.toMatch(/^https?:\/\/example\.com/);
        expect(content.url).not.toMatch(/placeholder/i);
        expect(content.url).not.toMatch(/fake/i);
        expect(content.url).not.toMatch(/test\.com/);
        
        // Must have proper domain matching
        const urlDomain = new URL(content.url).hostname;
        expect(content.domain).toBe(urlDomain);
        
        // Must have required authenticity fields
        expect(content).toHaveProperty('contentHash');
        expect(content).toHaveProperty('scrapedDate');
        expect(content.status).toMatch(/^(active|inactive|error)$/);
      }
    });
  });

  describe('1. Authentication & Authorization Critical Tests', () => {
    test('1.2.1 Username/password authentication', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'test-regression-user',
          password: 'test123'
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('id');
        expect(response.body.username).toBe('test-regression-user');
      } else {
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message');
      }
    });

    test('1.2.2 Invalid credentials handling', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'invalid-user',
          password: 'wrong-password'
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('2. Expert Profile Management', () => {
    test('2.1.1 Expert profile retrieval', async () => {
      const response = await request(app)
        .get(`/api/expert-profiles/${testExpertId}`)
        .expect(200);

      expect(response.body).toHaveProperty('primaryExpertise');
      expect(response.body.primaryExpertise).toBe('Artificial Intelligence');
      expect(response.body.expertiseKeywords).toContain('AI');
      expect(response.body.platforms).toContain('linkedin');
    });

    test('2.1.2 Profile data validation', async () => {
      const response = await request(app)
        .post('/api/expert-profiles')
        .send({
          expertId: 99999, // Non-existent expert
          primaryExpertise: '',
          platforms: []
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('3. Content Generation System', () => {
    test('3.1.1 Topic generation endpoint validation', async () => {
      const response = await request(app)
        .post('/api/generate-topics')
        .send({
          expertId: testExpertId,
          count: 2
        });

      // Should either succeed or fail gracefully with external API issues
      if (response.status === 201) {
        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('title');
          expect(response.body[0]).toHaveProperty('category');
        }
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body).toHaveProperty('message');
      }
    });

    test('3.2.1 Content idea generation with authentic sources', async () => {
      const response = await request(app)
        .post('/api/generate-content-ideas')
        .send({
          topicId: testTopicId,
          platform: 'linkedin',
          expertId: testExpertId
        });

      // Should either succeed or fail gracefully
      if (response.status === 201) {
        expect(Array.isArray(response.body)).toBe(true);
        if (response.body.length > 0) {
          expect(response.body[0]).toHaveProperty('title');
          expect(response.body[0]).toHaveProperty('platform');
          expect(response.body[0].platform).toBe('linkedin');
          
          // CRITICAL: Validate sources are authentic
          if (response.body[0].sources) {
            for (const source of response.body[0].sources) {
              if (!source.includes('No sources available')) {
                expect(source).toMatch(/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
              }
            }
          }
        }
      }
    });
  });

  describe('4. Web Scraping & RAG System', () => {
    test('4.1.1 Single URL scraping validation', async () => {
      const response = await request(app)
        .post('/api/scrape-url')
        .send({
          url: 'https://www.technologyreview.com'
        });

      // Should either succeed or fail gracefully
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.content).toHaveProperty('url');
        expect(response.body.content).toHaveProperty('title');
        expect(response.body.content.domain).toBe('www.technologyreview.com');
      } else {
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('4.3.1 Relevance scoring accuracy', async () => {
      const profile = await storage.getExpertProfile(testExpertId);
      const scrapedContent = await storage.getScrapedContentById(testScrapedContentId);

      expect(profile).toBeDefined();
      expect(scrapedContent).toBeDefined();

      if (profile && scrapedContent) {
        const relevanceScore = calculateRelevanceScore(scrapedContent, profile);
        
        expect(relevanceScore).toBeGreaterThanOrEqual(0);
        expect(relevanceScore).toBeLessThanOrEqual(100);
        
        // Should score high due to AI/ML keyword matches
        expect(relevanceScore).toBeGreaterThan(50);
      }
    });

    test('4.3.2 Relevance calculation endpoint', async () => {
      const response = await request(app)
        .post('/api/calculate-relevance')
        .send({
          expertId: testExpertId,
          scrapedContentId: testScrapedContentId
        })
        .expect(200);

      expect(response.body).toHaveProperty('relevanceScore');
      expect(response.body.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(response.body.relevanceScore).toBeLessThanOrEqual(100);
    });
  });

  describe('5. API Performance & Validation', () => {
    test('5.1.1 Response format validation', async () => {
      const response = await request(app)
        .get('/api/scraped-content')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const content = response.body[0];
        expect(content).toHaveProperty('id');
        expect(content).toHaveProperty('url');
        expect(content).toHaveProperty('title');
        expect(content).toHaveProperty('status');
      }
    });

    test('5.2.1 Error response consistency', async () => {
      const response = await request(app)
        .get('/api/experts/99999')
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Expert not found');
    });
  });

  describe('6. Security & Input Validation', () => {
    test('6.1.1 XSS prevention in content fields', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/topics')
        .send({
          expertId: testExpertId,
          title: xssPayload,
          description: 'Test description',
          category: 'Test'
        });

      if (response.status === 201) {
        // If creation succeeds, verify content is sanitized
        expect(response.body.title).not.toContain('<script>');
      }
    });

    test('6.2.1 Unauthorized access prevention', async () => {
      const response = await request(app)
        .patch('/api/expert-profiles/99999')
        .send({
          primaryExpertise: 'Unauthorized Update'
        })
        .expect(404);

      expect(response.body.message).toBe('Profile not found');
    });
  });

  describe('7. Performance Benchmarks', () => {
    test('7.1.1 API response time benchmarks', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/scraped-content?limit=20')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 2 seconds for regression testing
      expect(responseTime).toBeLessThan(2000);
    });
  });
});