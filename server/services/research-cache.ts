import { db } from '../db';
import { researchCache, researchUsage } from '@shared/schema';
import { eq, and, gt, desc, lt, sql } from 'drizzle-orm';
import { createHash } from 'crypto';

export interface CachedResearch {
  id: number;
  content: string;
  sources: string[];
  qualityScore: number;
  isExpired: boolean;
  usageCount: number;
}

export interface ResearchQuery {
  searchQuery: string;
  expertId: number;
  primaryExpertise: string;
  expertiseKeywords: string[];
  recencyFilter: 'week' | 'month';
}

export class ResearchCacheService {
  private generateQueryHash(query: ResearchQuery): string {
    const hashString = `${query.searchQuery}|${query.expertId}|${query.primaryExpertise}|${query.expertiseKeywords.sort().join(',')}|${query.recencyFilter}`;
    return createHash('md5').update(hashString).digest('hex');
  }

  private calculateExpiry(recencyFilter: 'week' | 'month'): Date {
    const now = new Date();
    // Smart expiry: Research about "last week" expires in 6 hours, "last month" expires in 24 hours
    const hoursToAdd = recencyFilter === 'week' ? 6 : 24;
    return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  /**
   * Check if we have valid cached research for this query
   */
  async getCachedResearch(query: ResearchQuery): Promise<CachedResearch | null> {
    const queryHash = this.generateQueryHash(query);
    const now = new Date();

    const [cached] = await db
      .select()
      .from(researchCache)
      .where(
        and(
          eq(researchCache.queryHash, queryHash),
          eq(researchCache.isValid, true),
          gt(researchCache.expiresAt, now)
        )
      )
      .orderBy(desc(researchCache.createdAt))
      .limit(1);

    if (!cached) return null;

    // Update usage tracking
    await this.updateUsageCount(cached.id);

    return {
      id: cached.id,
      content: cached.researchContent,
      sources: cached.sources || [],
      qualityScore: cached.qualityScore || 0,
      isExpired: false,
      usageCount: cached.usageCount || 0
    };
  }

  /**
   * Store new research in cache
   */
  async storeResearch(
    query: ResearchQuery,
    content: string,
    sources: string[],
    qualityScore: number = 0,
    metadata?: {
      searchDuration: number;
      tokenUsage?: { prompt: number; completion: number };
      sourceValidation?: { total: number; valid: number };
    }
  ): Promise<number> {
    const queryHash = this.generateQueryHash(query);
    const expiresAt = this.calculateExpiry(query.recencyFilter);

    // Invalidate any existing cache for this query
    await db
      .update(researchCache)
      .set({ isValid: false })
      .where(eq(researchCache.queryHash, queryHash));

    // Insert new research
    const [inserted] = await db
      .insert(researchCache)
      .values({
        queryHash,
        searchQuery: query.searchQuery,
        expertId: query.expertId,
        primaryExpertise: query.primaryExpertise,
        expertiseKeywords: query.expertiseKeywords,
        researchContent: content,
        sources,
        recencyFilter: query.recencyFilter,
        qualityScore,
        expiresAt,
        metadata: metadata || { searchDuration: 0 }
      })
      .returning({ id: researchCache.id });

    return inserted.id;
  }

  /**
   * Track research usage for analytics
   */
  async trackUsage(
    researchCacheId: number,
    expertId: number,
    usageType: 'topic_generation' | 'content_ideas' | 'manual_review',
    topicsGenerated: number = 0,
    contentGenerated: number = 0
  ): Promise<void> {
    await db.insert(researchUsage).values({
      researchCacheId,
      expertId,
      usageType,
      topicsGenerated,
      contentGenerated
    });
  }

  /**
   * Get research history for an expert
   */
  async getResearchHistory(expertId: number, limit: number = 10): Promise<CachedResearch[]> {
    const results = await db
      .select({
        id: researchCache.id,
        content: researchCache.researchContent,
        sources: researchCache.sources,
        qualityScore: researchCache.qualityScore,
        usageCount: researchCache.usageCount,
        expiresAt: researchCache.expiresAt,
        createdAt: researchCache.createdAt
      })
      .from(researchCache)
      .where(
        and(
          eq(researchCache.expertId, expertId),
          eq(researchCache.isValid, true)
        )
      )
      .orderBy(desc(researchCache.createdAt))
      .limit(limit);

    const now = new Date();
    return results.map(r => ({
      id: r.id,
      content: r.content,
      sources: r.sources || [],
      qualityScore: r.qualityScore || 0,
      isExpired: r.expiresAt < now,
      usageCount: r.usageCount
    }));
  }

  /**
   * Clean up expired research entries
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    const result = await db
      .update(researchCache)
      .set({ isValid: false })
      .where(
        and(
          eq(researchCache.isValid, true),
          lt(researchCache.expiresAt, now)
        )
      );

    return result.rowCount || 0;
  }

  private async updateUsageCount(researchId: number): Promise<void> {
    await db
      .update(researchCache)
      .set({ 
        usageCount: db.$count(researchCache.usageCount) + 1,
        lastUsedAt: new Date()
      })
      .where(eq(researchCache.id, researchId));
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(expertId?: number): Promise<{
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    averageQuality: number;
    hitRate: number;
  }> {
    // Implementation would include complex queries for analytics
    // For now, return basic structure
    return {
      totalEntries: 0,
      validEntries: 0,
      expiredEntries: 0,
      averageQuality: 0,
      hitRate: 0
    };
  }
}

export const researchCacheService = new ResearchCacheService();