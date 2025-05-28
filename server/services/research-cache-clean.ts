/**
 * Research Cache Service - Clean Implementation
 * Armazenamento eficiente com chaves compostas conforme arquitetura limpa
 */

import { db } from '../db';
import { researchCache } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export class ResearchCacheService {
  private readonly CACHE_TTL_HOURS = 24; // 24 horas conforme especificado

  async get(cacheKey: string): Promise<any | null> {
    try {
      const results = await db
        .select()
        .from(researchCache)
        .where(eq(researchCache.queryHash, cacheKey))
        .orderBy(desc(researchCache.createdAt))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const cached = results[0];
      const ageInHours = (Date.now() - new Date(cached.createdAt || Date.now()).getTime()) / (1000 * 60 * 60);

      // Return cached data if within 24 hour TTL
      if (ageInHours <= this.CACHE_TTL_HOURS) {
        // Increment usage count
        await db
          .update(researchCache)
          .set({ 
            usageCount: (cached.usageCount || 0) + 1,
            lastUsedAt: new Date()
          })
          .where(eq(researchCache.id, cached.id));

        return {
          id: cached.id,
          content: cached.researchContent,
          sources: cached.sources,
          qualityScore: cached.qualityScore || 0,
          expertId: cached.expertId || 0,
          createdAt: cached.createdAt || new Date(),
          metadata: cached.metadata || {}
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get cached research:', error);
      return null;
    }
  }

  async store(cacheKey: string, researchResult: any): Promise<void> {
    try {
      await db.insert(researchCache).values({
        queryHash: cacheKey,
        searchQuery: researchResult.searchQuery || 'research_query',
        expertId: researchResult.expertId,
        primaryExpertise: researchResult.primaryExpertise || 'expertise',
        expertiseKeywords: researchResult.expertiseKeywords || [],
        researchContent: researchResult.content,
        sources: researchResult.sources,
        recencyFilter: researchResult.recencyFilter || 'week',
        qualityScore: researchResult.qualityScore,
        usageCount: 1,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
        metadata: researchResult.metadata
      });
      
      console.log(`✅ Research stored in cache: ${cacheKey}`);
    } catch (error) {
      console.error('Failed to store research in cache:', error);
      throw error;
    }
  }
}

export const researchCacheService = new ResearchCacheService();