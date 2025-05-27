import { storage } from './storage';
import { WebScraper, calculateRelevanceScore } from './scraping';
import { generateContentIdeas } from './anthropic';

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
  private scraper: WebScraper;

  constructor() {
    this.scraper = new WebScraper();
  }

  /**
   * SCRAPING-FIRST WORKFLOW: Generate content ideas with fresh scraped data
   */
  async generateContentWithScraping(params: {
    topicId: number;
    platform: string;
    expertId: number;
  }): Promise<ContentPipelineResult> {
    // Step 1: Scrape fresh content
    const scrapedData = await this.scrapeFreshContent(params.expertId);
    
    if (scrapedData.length === 0) {
      throw new Error('No scraped content available for this expert. Please ensure your profile has valid information sources.');
    }

    // Step 2: Get topic and viewpoints
    const topic = await storage.getTopic(params.topicId);
    if (!topic) {
      throw new Error('Topic not found');
    }

    const viewpoints = await storage.getViewpoints(params.topicId);
    const profile = await storage.getExpertProfile(params.expertId);
    if (!profile) {
      throw new Error('Expert profile not found');
    }

    // Step 3: Generate content ideas using scraped data
    const contentIdeas = await generateContentIdeas({
      topic: topic.title,
      description: topic.description || '',
      platform: params.platform,
      viewpoints: viewpoints.map(v => v.title),
      expertiseKeywords: profile.expertiseKeywords || [],
      voiceTone: profile.voiceTone || [],
      expertId: params.expertId
    });

    // Step 4: Save content ideas
    const savedIdeas = [];
    const sourcesUsed: string[] = [];

    for (const idea of contentIdeas) {
      const newIdea = await storage.createContentIdea({
        topicId: params.topicId,
        platform: params.platform,
        title: idea.title,
        description: idea.description,
        format: idea.format,
        keyPoints: idea.keyPoints,
        sources: idea.sources
      });

      savedIdeas.push(newIdea);
      sourcesUsed.push(...idea.sources);
    }

    return {
      ideas: savedIdeas.map(idea => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        format: idea.format,
        keyPoints: idea.keyPoints || [],
        sources: idea.sources || [],
        platform: idea.platform
      })),
      sourcesUsed: Array.from(new Set(sourcesUsed)),
      timestamp: new Date()
    };
  }

  /**
   * Scrape fresh content from expert's trusted sources
   */
  private async scrapeFreshContent(expertId: number) {
    const targets = await storage.getActiveScrapingTargets();
    const results = [];

    for (const target of targets) {
      try {
        // Check for fresh content first (within 24 hours)
        const existingFresh = await storage.getFreshScrapedContent(target.baseUrl, 24);
        
        if (existingFresh) {
          console.log(`Using fresh content from ${target.baseUrl}`);
          results.push(existingFresh);
          continue;
        }

        // Scrape new content
        console.log(`Scraping fresh content from ${target.baseUrl}`);
        const result = await this.scraper.scrapeUrl(target.baseUrl);
        
        if (result.success && result.content) {
          const savedContent = await storage.createScrapedContent(result.content);
          
          // Calculate relevance
          const expertProfile = await storage.getExpertProfile(expertId);
          if (expertProfile) {
            const relevanceScore = calculateRelevanceScore(savedContent, expertProfile);
            await storage.createExpertContentRelevance({
              expertId,
              scrapedContentId: savedContent.id!,
              relevanceScore,
              matchedKeywords: []
            });
          }
          
          results.push(savedContent);
        }
      } catch (error) {
        console.error(`Failed to scrape ${target.baseUrl}:`, error);
      }
    }

    return results;
  }
}

export const contentPipeline = new ContentPipeline();