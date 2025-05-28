import { storage } from './storage';
import { generateContentIdeas } from './anthropic';
// Legacy scraping system removed - migrated to Perplexity real-time search

export interface ContentPipelineResult {
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
}

export class ContentPipeline {
  /**
   * LEGACY COMPATIBILITY: Redirect to new Perplexity-based pipeline
   * This method maintains API compatibility while using the modern system
   */
  async generateContentWithScraping(params: {
    topicId: number;
    platform: string;
    expertId: number;
  }): Promise<ContentPipelineResult> {
    // Import the new pipeline dynamically to avoid circular dependencies
    const { contentPipelineV2 } = await import('./content-pipeline-v2');
    
    console.log('[LEGACY-REDIRECT] Using Perplexity pipeline instead of scraping');
    
    // Call the new Perplexity-based system
    const result = await contentPipelineV2.generateContent(params);
    
    // Convert the new format to legacy format for compatibility
    return {
      ideas: result.ideas,
      sourcesUsed: result.sourcesUsed,
      timestamp: result.timestamp
    };
  }
}

export const contentPipeline = new ContentPipeline();