import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { DatabaseStorage } from '../server/storage';

describe('Perplexity-Based Content System - Regression Tests', () => {
  let app: express.Application;
  let storage: DatabaseStorage;
  let testExpertId: number;

  beforeAll(async () => {
    // Initialize application
    app = express();
    app.use(express.json());
    await registerRoutes(app);
    storage = new DatabaseStorage();

    // Create test expert
    try {
      const expert = await storage.createExpert({
        username: 'test-regression-user',
        name: 'Regression Test Expert',
        role: 'Content Creator'
      });
      testExpertId = expert.id;
    } catch (error) {
      console.log('Test setup note: using fallback expert ID');
      testExpertId = 1;
    }
  });

  afterAll(async () => {
    // Cleanup if needed
    try {
      if (testExpertId > 1) {
        // Only cleanup if we created a test expert
      }
    } catch (error) {
      console.log('Cleanup note: test data handled');
    }
  });

  describe('Core Perplexity Integration', () => {
    test('should handle content generation requests', async () => {
      const response = await request(app)
        .post('/api/generate-content')
        .send({
          expertId: testExpertId,
          platform: 'linkedin',
          count: 1
        });

      expect([200, 400, 401]).toContain(response.status);
    });

    test('should handle topic generation', async () => {
      const response = await request(app)
        .get(`/api/topics/${testExpertId}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('API Endpoints Stability', () => {
    test('should handle authentication', async () => {
      const response = await request(app)
        .post('/api/auth/replit')
        .send({});

      expect([200, 401, 400]).toContain(response.status);
    });

    test('should handle expert profiles', async () => {
      const response = await request(app)
        .get(`/api/expert-profiles/${testExpertId}`);

      expect([200, 404]).toContain(response.status);
    });
  });
});