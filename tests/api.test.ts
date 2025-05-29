import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';

describe('Perplexity-based Content Generation API', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  describe('Core API Endpoints', () => {
    test('POST /api/generate-content should require expertId', async () => {
      const response = await request(app)
        .post('/api/generate-content')
        .send({})
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    test('GET /api/topics should return topics for expert', async () => {
      const response = await request(app)
        .get('/api/topics/1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('GET /api/expert-profiles should handle valid expert ID', async () => {
      const response = await request(app)
        .get('/api/expert-profiles/1');

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/replit should handle authentication', async () => {
      const response = await request(app)
        .post('/api/auth/replit')
        .send({});

      expect([200, 401]).toContain(response.status);
    });
  });
});