/**
 * Smart Research Strategy - Phase 3 Implementation
 * Multi-angle research with expert-specific optimization
 */

import { perplexityService } from './perplexity';
import { sourceValidator } from './source-validator';

export interface SmartResearchParams {
  expertId: number;
  primaryExpertise: string;
  expertiseKeywords: string[];
  targetAudience: string;
  platforms: string[];
  contentGoals: string[];
  recencyFilter: 'day' | 'week' | 'month';
}

export interface ResearchStream {
  type: 'trends' | 'challenges' | 'opportunities' | 'competitive';
  query: string;
  weight: number; // 0.1 to 1.0 - importance in final synthesis
  results?: {
    content: string;
    sources: string[];
    qualityScore: number;
  };
}

export interface ComprehensiveResearch {
  synthesis: string;
  sources: string[];
  qualityScore: number;
  streams: ResearchStream[];
  freshness: Date;
  expertAlignment: number; // 0-100
  metadata: {
    totalSources: number;
    authorityLevel: 'high' | 'medium' | 'low';
    conflictingViews: boolean;
    processingTime: number;
  };
}

export class SmartResearchService {
  
  /**
   * Generate comprehensive multi-angle research
   */
  async generateComprehensiveResearch(params: SmartResearchParams): Promise<ComprehensiveResearch> {
    const startTime = Date.now();
    
    console.log(`🔍 Starting smart research for ${params.primaryExpertise} expert`);
    
    // Phase 3.1: Create expert-optimized research streams
    const streams = this.createResearchStreams(params);
    
    // Phase 3.2: Execute parallel searches
    const streamResults = await this.executeParallelSearches(streams);
    
    // Phase 3.3: Synthesize findings
    const synthesis = await this.synthesizeResearch(streamResults, params);
    
    // Phase 3.4: Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(streamResults);
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Smart research complete in ${processingTime}ms - Quality: ${qualityMetrics.qualityScore}%`);
    
    return {
      synthesis: synthesis.content,
      sources: synthesis.sources,
      qualityScore: qualityMetrics.qualityScore,
      streams: streamResults,
      freshness: new Date(),
      expertAlignment: qualityMetrics.expertAlignment,
      metadata: {
        totalSources: synthesis.sources.length,
        authorityLevel: qualityMetrics.authorityLevel,
        conflictingViews: qualityMetrics.conflictingViews,
        processingTime
      }
    };
  }
  
  /**
   * Phase 3.1: Create targeted research streams based on expert profile
   */
  private createResearchStreams(params: SmartResearchParams): ResearchStream[] {
    const { primaryExpertise, expertiseKeywords, targetAudience, platforms } = params;
    
    // Expert-specific keywords for more targeted searches
    const expertKeywords = expertiseKeywords.slice(0, 3).join(' ');
    const platformContext = platforms.includes('LinkedIn') ? 'professional' : 'social media';
    
    return [
      {
        type: 'trends',
        query: `latest trends ${primaryExpertise} ${expertKeywords} 2025 ${platformContext}`,
        weight: 0.4,
      },
      {
        type: 'challenges',
        query: `current challenges problems ${targetAudience} ${primaryExpertise} ${expertKeywords}`,
        weight: 0.3,
      },
      {
        type: 'opportunities',
        query: `emerging opportunities market gaps ${primaryExpertise} ${expertKeywords} ${targetAudience}`,
        weight: 0.2,
      },
      {
        type: 'competitive',
        query: `${primaryExpertise} thought leaders discussing ${expertKeywords} ${platformContext}`,
        weight: 0.1,
      }
    ];
  }
  
  /**
   * Phase 3.2: Execute searches in parallel for efficiency
   */
  private async executeParallelSearches(streams: ResearchStream[]): Promise<ResearchStream[]> {
    const searchPromises = streams.map(async (stream) => {
      try {
        console.log(`🔎 Searching ${stream.type}: ${stream.query}`);
        
        const result = await perplexityService.search(stream.query, {
          recency: 'week',
          maxResults: 5
        });
        
        const qualityScore = await sourceValidator.validateSources(result.sources);
        
        stream.results = {
          content: result.content,
          sources: result.sources,
          qualityScore
        };
        
        console.log(`✓ ${stream.type} search complete - Quality: ${qualityScore}%`);
        
      } catch (error) {
        console.error(`❌ ${stream.type} search failed:`, error);
        
        // Graceful degradation - don't fail entire research
        stream.results = {
          content: `Research for ${stream.type} temporarily unavailable`,
          sources: [],
          qualityScore: 0
        };
      }
      
      return stream;
    });
    
    return Promise.all(searchPromises);
  }
  
  /**
   * Phase 3.3: Synthesize multiple research streams into comprehensive intelligence
   */
  private async synthesizeResearch(
    streams: ResearchStream[], 
    params: SmartResearchParams
  ): Promise<{ content: string; sources: string[] }> {
    
    // Combine all research findings
    const allContent = streams
      .filter(s => s.results && s.results.qualityScore > 30)
      .map(s => `${s.type.toUpperCase()}: ${s.results!.content}`)
      .join('\n\n');
    
    const allSources = streams
      .flatMap(s => s.results?.sources || [])
      .filter((source, index, arr) => arr.indexOf(source) === index) // Remove duplicates
      .slice(0, 10); // Limit to top 10 sources
    
    // Create contextual synthesis
    const synthesis = `COMPREHENSIVE MARKET INTELLIGENCE FOR ${params.primaryExpertise.toUpperCase()} EXPERTS

CURRENT LANDSCAPE ANALYSIS:
${allContent}

STRATEGIC POSITIONING OPPORTUNITIES:
Based on the research above, ${params.primaryExpertise} experts targeting ${params.targetAudience} should focus on:

1. TREND ALIGNMENT: Leverage current industry developments to position expertise
2. PROBLEM SOLVING: Address specific challenges identified in target audience
3. MARKET GAPS: Capitalize on emerging opportunities in the space
4. THOUGHT LEADERSHIP: Engage with topics other experts are discussing

This intelligence is curated specifically for content creation on ${params.platforms.join(', ')} platforms.`;
    
    return {
      content: synthesis,
      sources: allSources
    };
  }
  
  /**
   * Phase 3.4: Calculate comprehensive quality metrics
   */
  private calculateQualityMetrics(streams: ResearchStream[]) {
    const validStreams = streams.filter(s => s.results && s.results.qualityScore > 0);
    
    if (validStreams.length === 0) {
      return {
        qualityScore: 0,
        expertAlignment: 0,
        authorityLevel: 'low' as const,
        conflictingViews: false
      };
    }
    
    // Weighted average of stream quality scores
    const totalWeight = validStreams.reduce((sum, s) => sum + s.weight, 0);
    const weightedQuality = validStreams.reduce(
      (sum, s) => sum + (s.results!.qualityScore * s.weight), 
      0
    ) / totalWeight;
    
    // Authority level based on source quality
    const avgQuality = validStreams.reduce((sum, s) => sum + s.results!.qualityScore, 0) / validStreams.length;
    const authorityLevel = avgQuality > 80 ? 'high' : avgQuality > 60 ? 'medium' : 'low';
    
    // Expert alignment based on successful stream coverage
    const expertAlignment = (validStreams.length / streams.length) * 100;
    
    // Detect conflicting views (simplified - could be enhanced with NLP)
    const conflictingViews = validStreams.length > 2 && 
      validStreams.some(s => s.results!.qualityScore < 50);
    
    return {
      qualityScore: Math.round(weightedQuality),
      expertAlignment: Math.round(expertAlignment),
      authorityLevel,
      conflictingViews
    };
  }
}

export const smartResearchService = new SmartResearchService();