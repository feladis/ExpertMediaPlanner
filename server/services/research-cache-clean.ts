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
        .where(eq(researchCache.cacheKey, cacheKey))
        .orderBy(desc(researchCache.createdAt))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const cached = results[0];
      const ageInHours = (Date.now() - new Date(cached.createdAt).getTime()) / (1000 * 60 * 60);

      // Return cached data if within 24 hour TTL
      if (ageInHours <= this.CACHE_TTL_HOURS) {
        // Increment usage count
        await db
          .update(researchCache)
          .set({ 
            usageCount: (cached.usageCount || 0) + 1,
            lastAccessed: new Date()
          })
          .where(eq(researchCache.id, cached.id));

        return {
          id: cached.id,
          content: cached.content,
          sources: cached.sources,
          qualityScore: cached.qualityScore,
          expertId: cached.expertId,
          createdAt: cached.createdAt,
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
        cacheKey,
        content: researchResult.content,
        sources: researchResult.sources,
        qualityScore: researchResult.qualityScore,
        expertId: researchResult.expertId,
        metadata: researchResult.metadata,
        createdAt: new Date(),
        lastAccessed: new Date(),
        usageCount: 1
      });
      
      console.log(`✅ Research stored in cache: ${cacheKey}`);
    } catch (error) {
      console.error('Failed to store research in cache:', error);
      throw error;
    }
  }
}

export const researchCacheService = new ResearchCacheService();