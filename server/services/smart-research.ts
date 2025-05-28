import { researchCacheService, type ResearchQuery } from './research-cache';
import { perplexityService } from './perplexity';
import { sourceValidator } from './source-validator';

export interface MultiAngleResearch {
  trends: string;
  challenges: string;
  opportunities: string;
  synthesis: string;
  sources: string[];
  qualityScore: number;
}

export interface SmartResearchParams {
  expertId: number;
  primaryExpertise: string;
  expertiseKeywords: string[];
  targetAudience: string;
  platforms: string[];
  recencyFilter?: 'week' | 'month';
}

export class SmartResearchService {
  
  /**
   * Generate comprehensive market intelligence using multi-angle searches
   */
  async generateComprehensiveResearch(params: SmartResearchParams): Promise<MultiAngleResearch> {
    const recency = params.recencyFilter || 'week';
    
    console.log(`🧠 Generating multi-angle research for ${params.primaryExpertise}`);
    
    // Define search angles for comprehensive intelligence
    const searchAngles = [
      {
        type: 'trends',
        query: `latest trends innovations ${params.primaryExpertise} ${params.expertiseKeywords.slice(0, 2).join(' ')} 2025`,
        weight: 0.4 // 40% weight for trends
      },
      {
        type: 'challenges',
        query: `current challenges problems ${params.primaryExpertise} industry ${params.expertiseKeywords.slice(0, 2).join(' ')}`,
        weight: 0.3 // 30% weight for challenges
      },
      {
        type: 'opportunities',
        query: `emerging opportunities market gaps ${params.primaryExpertise} ${params.targetAudience}`,
        weight: 0.3 // 30% weight for opportunities
      }
    ];

    // Execute parallel searches for each angle
    const searchResults = await Promise.allSettled(
      searchAngles.map(angle => this.executeAngleSearch(angle, params, recency))
    );

    // Process results and handle failures gracefully
    const processedResults: { [key: string]: { content: string; sources: string[] } } = {};
    let allSources: string[] = [];
    let totalQuality = 0;
    let successfulSearches = 0;

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      const angle = searchAngles[i];
      
      if (result.status === 'fulfilled' && result.value) {
        processedResults[angle.type] = result.value;
        allSources = [...allSources, ...result.value.sources];
        totalQuality += result.value.qualityScore * angle.weight;
        successfulSearches++;
        console.log(`✅ ${angle.type} research completed (Quality: ${result.value.qualityScore.toFixed(1)}%)`);
      } else {
        console.warn(`⚠️ ${angle.type} research failed:`, result.status === 'rejected' ? result.reason : 'Unknown error');
        // Create fallback content to maintain structure
        processedResults[angle.type] = {
          content: `${angle.type} research unavailable`,
          sources: []
        };
      }
    }

    if (successfulSearches === 0) {
      throw new Error('Unable to gather market intelligence. Please verify your research API configuration.');
    }

    // Synthesize findings into comprehensive intelligence
    const synthesis = this.synthesizeFindings(processedResults, params);

    // Remove duplicate sources and validate
    const uniqueSources = [...new Set(allSources)];
    const validatedSources = await this.validateAndRankSources(uniqueSources);

    const finalQuality = totalQuality / successfulSearches;

    console.log(`🎯 Multi-angle research complete: ${successfulSearches}/3 angles, Quality: ${finalQuality.toFixed(1)}%`);

    return {
      trends: processedResults.trends?.content || 'Trend analysis unavailable',
      challenges: processedResults.challenges?.content || 'Challenge analysis unavailable', 
      opportunities: processedResults.opportunities?.content || 'Opportunity analysis unavailable',
      synthesis,
      sources: validatedSources.slice(0, 8), // Top 8 sources
      qualityScore: finalQuality
    };
  }

  /**
   * Execute search for a specific angle with caching
   */
  private async executeAngleSearch(
    angle: { type: string; query: string; weight: number },
    params: SmartResearchParams,
    recency: 'week' | 'month'
  ): Promise<{ content: string; sources: string[]; qualityScore: number }> {
    
    // Check cache first
    const researchQuery: ResearchQuery = {
      searchQuery: angle.query,
      expertId: params.expertId,
      primaryExpertise: params.primaryExpertise,
      expertiseKeywords: params.expertiseKeywords,
      recencyFilter: recency
    };

    const cached = await researchCacheService.getCachedResearch(researchQuery);
    if (cached) {
      console.log(`📋 Using cached ${angle.type} research (ID: ${cached.id})`);
      return {
        content: cached.content,
        sources: cached.sources,
        qualityScore: cached.qualityScore
      };
    }

    // Execute fresh search
    console.log(`🔍 Searching ${angle.type}: ${angle.query}`);
    const result = await perplexityService.search(angle.query, {
      recency,
      maxResults: 4
    });

    // Validate sources
    const validatedSources = result.sources 
      ? await sourceValidator.validateBatch(result.sources)
      : [];
    
    const validSources = validatedSources
      .filter(v => v.isValid)
      .map(v => v.url)
      .slice(0, 4);

    const qualityScore = result.sources 
      ? (validSources.length / result.sources.length) * 100 
      : 0;

    // Store in cache
    await researchCacheService.storeResearch(
      researchQuery,
      result.content,
      validSources,
      qualityScore,
      {
        searchDuration: 0,
        tokenUsage: result.usage,
        sourceValidation: {
          total: result.sources?.length || 0,
          valid: validSources.length
        }
      }
    );

    return {
      content: result.content,
      sources: validSources,
      qualityScore
    };
  }

  /**
   * Synthesize multi-angle findings into actionable intelligence
   */
  private synthesizeFindings(
    results: { [key: string]: { content: string; sources: string[] } },
    params: SmartResearchParams
  ): string {
    const { trends, challenges, opportunities } = results;
    
    return `
STRATEGIC MARKET INTELLIGENCE SYNTHESIS:

🔥 CURRENT TRENDS (What's Hot):
${trends?.content || 'Trend data unavailable'}

⚠️ KEY CHALLENGES (Market Pain Points):
${challenges?.content || 'Challenge data unavailable'}

💡 EMERGING OPPORTUNITIES (Strategic Openings):
${opportunities?.content || 'Opportunity data unavailable'}

🎯 STRATEGIC IMPLICATIONS FOR ${params.primaryExpertise.toUpperCase()}:
This intelligence reveals current market dynamics that create content opportunities for experts targeting ${params.targetAudience} across ${params.platforms.join(', ')} platforms. The intersection of these trends, challenges, and opportunities provides fertile ground for thought leadership positioning.
    `.trim();
  }

  /**
   * Validate and rank sources by authority and relevance
   */
  private async validateAndRankSources(sources: string[]): Promise<string[]> {
    if (sources.length === 0) return [];

    try {
      const validated = await sourceValidator.validateBatch(sources);
      
      // Sort by validation score and authority
      return validated
        .filter(v => v.isValid)
        .sort((a, b) => {
          const scoreA = this.calculateSourceAuthority(a.url);
          const scoreB = this.calculateSourceAuthority(b.url);
          return scoreB - scoreA;
        })
        .map(v => v.url);
    } catch (error) {
      console.warn('Source validation failed, returning unvalidated sources:', error);
      return sources.slice(0, 5);
    }
  }

  /**
   * Calculate source authority score based on domain reputation
   */
  private calculateSourceAuthority(url: string): number {
    const domain = new URL(url).hostname.toLowerCase();
    
    // Tier 1 sources (90-100 points)
    const tier1 = ['harvard.edu', 'mit.edu', 'stanford.edu', 'hbr.org', 'mckinsey.com', 'bcg.com'];
    if (tier1.some(d => domain.includes(d))) return 95;

    // Tier 2 sources (80-89 points)  
    const tier2 = ['reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'economist.com'];
    if (tier2.some(d => domain.includes(d))) return 85;

    // Tier 3 sources (70-79 points)
    const tier3 = ['forbes.com', 'inc.com', 'techcrunch.com', 'wired.com', 'nature.com'];
    if (tier3.some(d => domain.includes(d))) return 75;

    // Default score for other sources
    return 60;
  }

  /**
   * Get research performance analytics
   */
  async getResearchAnalytics(expertId: number): Promise<{
    totalSearches: number;
    cacheHitRate: number;
    averageQuality: number;
    topSources: string[];
  }> {
    // This would query the research cache and usage tables for analytics
    // For now, return placeholder structure
    return {
      totalSearches: 0,
      cacheHitRate: 0,
      averageQuality: 0,
      topSources: []
    };
  }
}

export const smartResearchService = new SmartResearchService();