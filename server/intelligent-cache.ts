// PHASE 3: Intelligent Caching System with Context-Aware Invalidation
import { createHash } from 'crypto';
import { ExpertProfile } from '@shared/schema';

export interface CacheEntry<T> {
  data: T;
  metadata: {
    createdAt: Date;
    accessCount: number;
    lastAccessed: Date;
    expertProfile: string; // hashed profile for context
    contentType: string;
    reliability: number;
    sources: string[];
  };
  expiry: Date;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  averageAge: number;
  topContentTypes: string[];
  storageSize: number;
}

export class IntelligentCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessLog = new Map<string, number>();
  private totalRequests = 0;
  private cacheHits = 0;

  // PHASE 3: Intelligent cache TTL based on content type and expertise
  private baseTTL = new Map([
    ['trending_topics', 2 * 60 * 60 * 1000],      // 2 hours for trending
    ['content_ideas', 6 * 60 * 60 * 1000],        // 6 hours for content ideas
    ['research', 24 * 60 * 60 * 1000],            // 24 hours for research
    ['analysis', 12 * 60 * 60 * 1000],            // 12 hours for analysis
    ['general', 8 * 60 * 60 * 1000]               // 8 hours general
  ]);

  // PHASE 3: Fast-moving fields need shorter cache times
  private fastMovingFields = new Set([
    'technology',
    'artificial intelligence', 
    'cryptocurrency',
    'digital marketing',
    'breaking news'
  ]);

  constructor(private maxSize = 1000) {
    // Cleanup expired entries every hour
    setInterval(() => this.cleanupExpired(), 60 * 60 * 1000);
  }

  async get(
    key: string, 
    expertProfile: ExpertProfile, 
    contentType: string
  ): Promise<T | null> {
    this.totalRequests++;
    const contextualKey = this.createContextualKey(key, expertProfile, contentType);
    
    const entry = this.cache.get(contextualKey);
    
    if (!entry) {
      console.log(`[CACHE] Miss for ${contentType} (${this.getDomain(key)})`);
      return null;
    }

    // PHASE 3: Check if expired or needs smart invalidation
    if (this.shouldInvalidate(entry, expertProfile, contentType)) {
      console.log(`[CACHE] Smart invalidation for ${contentType} (${this.getDomain(key)})`);
      this.cache.delete(contextualKey);
      return null;
    }

    // Update access metadata
    entry.metadata.accessCount++;
    entry.metadata.lastAccessed = new Date();
    this.cacheHits++;
    
    console.log(`[CACHE] Hit for ${contentType} (age: ${this.getEntryAge(entry)}min, score: ${entry.metadata.reliability})`);
    return entry.data;
  }

  async set(
    key: string,
    data: T,
    expertProfile: ExpertProfile,
    contentType: string,
    sources: string[] = [],
    reliability = 80
  ): Promise<void> {
    const contextualKey = this.createContextualKey(key, expertProfile, contentType);
    const ttl = this.calculateTTL(contentType, expertProfile, reliability);
    
    const entry: CacheEntry<T> = {
      data,
      metadata: {
        createdAt: new Date(),
        accessCount: 1,
        lastAccessed: new Date(),
        expertProfile: this.hashProfile(expertProfile),
        contentType,
        reliability,
        sources
      },
      expiry: new Date(Date.now() + ttl)
    };

    // PHASE 3: Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(contextualKey, entry);
    
    console.log(`[CACHE] Stored ${contentType} (TTL: ${Math.round(ttl/1000/60)}min, reliability: ${reliability})`);
  }

  // PHASE 3: Context-aware cache key generation
  private createContextualKey(
    baseKey: string, 
    expertProfile: ExpertProfile, 
    contentType: string
  ): string {
    const contextualFactors = [
      baseKey,
      expertProfile.primaryExpertise || 'general',
      contentType,
      (expertProfile.platforms || []).sort().join(','),
      expertProfile.targetAudience || 'general'
    ].join('|');

    return createHash('sha256').update(contextualFactors).digest('hex');
  }

  // PHASE 3: Intelligent TTL calculation
  private calculateTTL(
    contentType: string, 
    expertProfile: ExpertProfile, 
    reliability: number
  ): number {
    let baseTTL = this.baseTTL.get(contentType) || this.baseTTL.get('general')!;
    
    // Adjust for expertise velocity
    const expertise = expertProfile.primaryExpertise?.toLowerCase() || '';
    if (this.fastMovingFields.has(expertise)) {
      baseTTL = baseTTL * 0.5; // Halve cache time for fast-moving fields
    }

    // Adjust for reliability - higher reliability content can be cached longer
    const reliabilityMultiplier = reliability >= 90 ? 1.5 : 
                                 reliability >= 70 ? 1.0 : 0.7;
    
    baseTTL = baseTTL * reliabilityMultiplier;

    // Trending content expires faster
    if (contentType === 'trending_topics') {
      baseTTL = baseTTL * 0.8;
    }

    return Math.max(30 * 60 * 1000, baseTTL); // Minimum 30 minutes
  }

  // PHASE 3: Smart invalidation logic
  private shouldInvalidate(
    entry: CacheEntry<T>, 
    expertProfile: ExpertProfile, 
    contentType: string
  ): boolean {
    const now = new Date();
    
    // Basic expiry check
    if (now > entry.expiry) {
      return true;
    }

    // Smart invalidation for trending content
    if (contentType === 'trending_topics') {
      const age = now.getTime() - entry.metadata.createdAt.getTime();
      const hoursSinceCreation = age / (1000 * 60 * 60);
      
      // Trending content older than 3 hours in fast-moving fields
      const expertise = expertProfile.primaryExpertise?.toLowerCase() || '';
      if (this.fastMovingFields.has(expertise) && hoursSinceCreation > 3) {
        return true;
      }
    }

    // Invalidate low-reliability content sooner
    if (entry.metadata.reliability < 60) {
      const age = now.getTime() - entry.metadata.createdAt.getTime();
      if (age > 2 * 60 * 60 * 1000) { // 2 hours for low reliability
        return true;
      }
    }

    return false;
  }

  // PHASE 3: LRU eviction strategy
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestAccess = new Date();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.lastAccessed < oldestAccess) {
        oldestAccess = entry.metadata.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const evicted = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      console.log(`[CACHE] Evicted LRU entry: ${evicted?.metadata.contentType} (age: ${this.getEntryAge(evicted!)}min)`);
    }
  }

  // PHASE 3: Cleanup expired entries
  private cleanupExpired(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[CACHE] Cleaned ${cleanedCount} expired entries`);
    }
  }

  // PHASE 3: Invalidate by pattern (for expert profile changes)
  invalidateByExpert(expertProfile: ExpertProfile): number {
    const profileHash = this.hashProfile(expertProfile);
    let invalidatedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.expertProfile === profileHash) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    console.log(`[CACHE] Invalidated ${invalidatedCount} entries for expert profile change`);
    return invalidatedCount;
  }

  // PHASE 3: Invalidate by content type
  invalidateByContentType(contentType: string): number {
    let invalidatedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.contentType === contentType) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    console.log(`[CACHE] Invalidated ${invalidatedCount} entries for content type: ${contentType}`);
    return invalidatedCount;
  }

  // PHASE 3: Get cache statistics
  getStats(): CacheStats {
    const now = new Date();
    let totalAge = 0;
    const contentTypeCounts = new Map<string, number>();

    for (const entry of this.cache.values()) {
      totalAge += now.getTime() - entry.metadata.createdAt.getTime();
      
      const type = entry.metadata.contentType;
      contentTypeCounts.set(type, (contentTypeCounts.get(type) || 0) + 1);
    }

    const averageAge = this.cache.size > 0 ? totalAge / this.cache.size / (1000 * 60) : 0;
    const hitRate = this.totalRequests > 0 ? (this.cacheHits / this.totalRequests) * 100 : 0;

    const topContentTypes = Array.from(contentTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);

    return {
      totalEntries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round((100 - hitRate) * 100) / 100,
      averageAge: Math.round(averageAge),
      topContentTypes,
      storageSize: this.estimateStorageSize()
    };
  }

  // PHASE 3: Helper methods
  private hashProfile(expertProfile: ExpertProfile): string {
    const profileString = JSON.stringify({
      primaryExpertise: expertProfile.primaryExpertise,
      platforms: expertProfile.platforms?.sort(),
      targetAudience: expertProfile.targetAudience
    });
    return createHash('md5').update(profileString).digest('hex');
  }

  private getEntryAge(entry: CacheEntry<T>): number {
    return Math.round((Date.now() - entry.metadata.createdAt.getTime()) / (1000 * 60));
  }

  private getDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  private estimateStorageSize(): number {
    // Rough estimation in KB
    return Math.round(this.cache.size * 2); // Approximate 2KB per entry
  }

  // PHASE 3: Clear cache
  clear(): void {
    this.cache.clear();
    this.accessLog.clear();
    this.totalRequests = 0;
    this.cacheHits = 0;
    console.log('[CACHE] All cache data cleared');
  }
}

// Global cache instances for different content types
export const perplexityCache = new IntelligentCache<any>(500);
export const sourceValidationCache = new IntelligentCache<any>(200);