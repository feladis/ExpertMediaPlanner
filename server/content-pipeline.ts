import { storage } from './storage';
import { WebScraper, calculateRelevanceScore } from './scraping';
import { generateContentIdeas } from './anthropic';
import { profileScrapingSync } from './profile-scraping-sync';

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
  }) {
    console.log('Starting scraping-first content generation...');

    // Step 1: Ensure expert's URLs are synced to scraping targets
    await profileScrapingSync.syncExpertSources(params.expertId);

    // Step 2: Scrape fresh content from expert's trusted sources
    const scrapedData = await this.scrapeFreshContent(params.expertId);

    // Step 3: Validate we have sufficient content
    if (scrapedData.length === 0) {
      throw new Error('No scraped content available. Cannot generate content ideas without trusted sources.');
    }

    // Step 4: Get topic and viewpoints
    const topic = await storage.getTopic(params.topicId);
    const viewpoints = await storage.getViewpoints(params.topicId);
    const expertProfile = await storage.getExpertProfile(params.expertId);

    if (!topic || !expertProfile) {
      throw new Error('Topic or expert profile not found');
    }

    // Step 5: Generate content ideas with real scraped data
    const contentIdeas = await generateContentIdeas({
      topic: topic.title,
      description: topic.description || '',
      platform: params.platform,
      viewpoints: viewpoints.map(v => v.title),
      expertiseKeywords: expertProfile.expertiseKeywords || [],
      voiceTone: expertProfile.voiceTone || [],
      expertId: params.expertId
    });

    // Step 6: Save content ideas with source validation
    const savedIdeas = [];
    for (const idea of contentIdeas) {
      // Validate that sources reference actual scraped content
      const validatedSources = await this.validateSources(idea.sources, scrapedData);
      
      const savedIdea = await storage.createContentIdea({
        title: idea.title,
        topicId: params.topicId,
        platform: params.platform,
        description: idea.description,
        format: idea.format,
        keyPoints: idea.keyPoints,
        sources: validatedSources
      });

      savedIdeas.push(savedIdea);
    }

    return {
      ideas: savedIdeas,
      sourcesUsed: scrapedData.length,
      timestamp: new Date()
    };
  }

  /**
   * Scrape fresh content from expert's trusted sources
   */
  private async scrapeFreshContent(expertId: number) {
    const expertProfile = await storage.getExpertProfile(expertId);
    if (!expertProfile?.informationSources) {
      return [];
    }

    const scrapedData = [];
    
    for (const source of expertProfile.informationSources) {
      if (!source.url) continue;

      try {
        // Check if we already have recent content from this URL
        const existingContent = await storage.getScrapedContentByUrl(source.url);
        const isRecent = existingContent && existingContent.scrapedDate &&
          (Date.now() - existingContent.scrapedDate.getTime()) < 24 * 60 * 60 * 1000; // 24 hours

        if (isRecent) {
          scrapedData.push(existingContent);
          continue;
        }

        // Scrape fresh content
        console.log(`Scraping fresh content from: ${source.url}`);
        const result = await this.scraper.scrapeUrl(source.url);

        if (result.success && result.content) {
          // Save or update scraped content
          let savedContent;
          if (existingContent) {
            savedContent = await storage.updateScrapedContent(existingContent.id, {
              title: result.content.title,
              content: result.content.content,
              summary: result.content.summary,
              scrapedDate: new Date()
            });
          } else {
            savedContent = await storage.createScrapedContent(result.content);
          }

          if (savedContent) {
            // Calculate and save relevance
            const relevanceScore = calculateRelevanceScore(savedContent, expertProfile);
            await storage.createExpertContentRelevance({
              expertId,
              scrapedContentId: savedContent.id,
              relevanceScore,
              matchedKeywords: []
            });

            scrapedData.push(savedContent);
          }
        }
      } catch (error) {
        console.error(`Error scraping ${source.url}:`, error);
      }
    }

    console.log(`Scraped ${scrapedData.length} articles from trusted sources`);
    return scrapedData;
  }

  /**
   * Validate that sources reference actual scraped content
   */
  private async validateSources(sources: string[], scrapedData: any[]) {
    const validatedSources = [];
    const scrapedUrls = scrapedData.map(data => data.url);

    for (const source of sources) {
      if (source === 'No sources available - manual research required') {
        validatedSources.push(source);
      } else if (scrapedUrls.includes(source)) {
        validatedSources.push(source);
      } else {
        // Try to find a similar domain
        const domain = this.extractDomain(source);
        const matchingContent = scrapedData.find(data => 
          data.url.includes(domain) || data.domain === domain
        );
        
        if (matchingContent) {
          validatedSources.push(matchingContent.url);
        } else {
          validatedSources.push('Source validation failed - manual verification required');
        }
      }
    }

    return validatedSources;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
}

export const contentPipeline = new ContentPipeline();