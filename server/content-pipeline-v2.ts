import { perplexityService } from './services/perplexity';
import { storage } from './storage';
import { generateContentIdeas } from './anthropic';

export interface ContentPipelineV2Result {
  ideas: Array<{
    id: number;
    title: string;
    description: string | null;
    format: string | null;
    keyPoints: string[];
    sources: string[];
    platform: string;
  }>;
  sourcesUsed: string[];
  timestamp: Date;
  metadata: {
    engine: string;
    searchQuery: string;
    processingTime: number;
  };
}

export class ContentPipelineV2 {
  /**
   * Generates content using Perplexity (real-time search) 
   * instead of scraping
   */
  async generateContent(params: {
    topicId: number;
    platform: string;
    expertId: number;
  }): Promise<ContentPipelineV2Result> {
    const startTime = Date.now();
    console.log('[NEW-PIPELINE] Starting generation with Perplexity');

    try {
      // 1. Fetch data from database
      const topic = await storage.getTopic(params.topicId);
      const profile = await storage.getExpertProfile(params.expertId);

      if (!topic || !profile) {
        throw new Error('Topic or profile not found');
      }

      // 2. Build search query for Perplexity
      const searchQuery = `
        Find recent content (last 7 days) about "${topic.title}"
        for publishing on ${params.platform}.
        Focus on: ${topic.description}
        Area: ${profile.primaryExpertise}
        Keywords: ${profile.expertiseKeywords?.join(', ') || 'digital transformation'}
      `.trim();

      console.log('[NEW-PIPELINE] Searching with Perplexity...', { searchQuery });

      // 3. Search for recent information
      const searchResult = await perplexityService.search(searchQuery, {
        recency: 'week', // Last 7 days
        maxResults: 5
      });

      console.log('[NEW-PIPELINE] Perplexity results:', {
        sourcesFound: searchResult.sources?.length || 0,
        contentLength: searchResult.content?.length || 0
      });

      // 4. Generate ideas with Claude using the context
      const ideas = await generateContentIdeas({
        topic: topic.title,
        description: topic.description || '',
        platform: params.platform,
        viewpoints: [], // Simplified for now
        expertiseKeywords: profile.expertiseKeywords || [],
        voiceTone: profile.voiceTone || [],
        // Pass Perplexity context
        additionalContext: searchResult.content,
        realSources: searchResult.sources
      });

      // 5. Save and return
      const savedIdeas = [];
      for (const idea of ideas) {
        const saved = await storage.createContentIdea({
          topicId: params.topicId,
          platform: params.platform,
          title: idea.title,
          description: idea.description,
          format: idea.format,
          keyPoints: idea.keyPoints,
          sources: searchResult.sources?.slice(0, 3) || [] // Maximum 3 sources
        });
        
        // Transform to match expected format
        savedIdeas.push({
          id: saved.id,
          title: saved.title,
          description: saved.description,
          format: saved.format,
          keyPoints: saved.keyPoints || [],
          sources: saved.sources || [],
          platform: saved.platform
        });
      }

      const processingTime = Date.now() - startTime;
      console.log('[NEW-PIPELINE] Success! Ideas generated:', savedIdeas.length, `in ${processingTime}ms`);

      return {
        ideas: savedIdeas,
        sourcesUsed: searchResult.sources || [],
        timestamp: new Date(),
        metadata: {
          engine: 'perplexity-realtime',
          searchQuery,
          processingTime
        }
      };

    } catch (error) {
      console.error('[NEW-PIPELINE] Error:', error);
      throw error;
    }
  }
}

export const contentPipelineV2 = new ContentPipelineV2();