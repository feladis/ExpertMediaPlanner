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

    // Step 3: Generate content ideas using scraped data with full traceability
    const contentIdeas = await generateContentIdeas({
      topic: topic.title,
      description: topic.description || '',
      platform: params.platform,
      viewpoints: viewpoints.map(v => v.title),
      expertiseKeywords: profile.expertiseKeywords || [],
      voiceTone: profile.voiceTone || [],
      expertId: params.expertId,
      scrapedContent: scrapedData.map(content => ({
        title: content.title,
        url: content.url,
        summary: content.summary || undefined,
        domain: content.domain
      }))
    });

    // Step 4: Validate and save content ideas with source references
    const savedIdeas = [];
    const sourcesUsed: string[] = [];

    for (const idea of contentIdeas) {
      // Validate that sources reference actual scraped content
      const validatedSources = await this.validateSources(idea.sources, scrapedData);
      sourcesUsed.push(...validatedSources);

      const newIdea = await storage.createContentIdea({
        topicId: params.topicId,
        platform: params.platform,
        title: idea.title,
        description: idea.description,
        format: idea.format,
        keyPoints: idea.keyPoints,
        sources: validatedSources
      });

      savedIdeas.push(newIdea);
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
      sourcesUsed: Array.from(new Set(sourcesUsed)), // Remove duplicates
      timestamp: new Date()
    };
  }

  /**
   * Scrape fresh content from expert's trusted sources with freshness check
   */
  private async scrapeFreshContent(expertId: number) {
    const targets = await storage.getActiveScrapingTargets();
    const results = [];

    for (const target of targets) {
      try {
        // Check if we have fresh content (within 24 hours)
        const existingFresh = await storage.getFreshScrapedContent(target.baseUrl, 24);
        
        if (existingFresh) {
          console.log(`Using fresh content from ${target.baseUrl} (${existingFresh.createdAt})`);
          results.push(existingFresh);
          continue;
        }

        // Scrape new content if not fresh enough
        console.log(`Scraping fresh content from ${target.baseUrl}`);
        const result = await this.scraper.scrapeUrl(target.baseUrl);
        
        if (result.success && result.content) {
          // Save new content
          const savedContent = await storage.createScrapedContent(result.content);
          
          // Calculate relevance for this expert
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

  /**
   * Validate that sources reference actual scraped content
   */
  private async validateSources(sources: string[], scrapedData: any[]) {
    const validatedSources: string[] = [];
    
    for (const source of sources) {
      // Extract domain from source URL
      const sourceDomain = this.extractDomain(source);
      
      // Check if we have scraped content from this domain
      const hasContent = scrapedData.some(data => 
        this.extractDomain(data.url) === sourceDomain
      );
      
      if (hasContent) {
        validatedSources.push(source);
      }
    }
    
    return validatedSources;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
}

export const contentPipeline = new ContentPipeline();