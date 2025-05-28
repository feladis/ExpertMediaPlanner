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
   * LAZY BOOTSTRAP: Scrape fresh content with cold-start handling
   */
  private async scrapeFreshContent(expertId: number) {
    console.log(`[BOOTSTRAP] Starting content acquisition for expert ${expertId}`);
    
    const targets = await storage.getActiveScrapingTargets();
    const results = [];

    // PHASE 1: Check for any existing content for this expert
    const existingContent = await storage.getRelevantContentForExpert(expertId, 5);
    const hasAnyContent = existingContent && existingContent.length > 0;

    console.log(`[BOOTSTRAP] Found ${existingContent?.length || 0} existing content pieces`);

    // PHASE 2: Bootstrap logic - different strategies based on content availability
    if (!hasAnyContent) {
      console.log(`[BOOTSTRAP] COLD START detected - initiating aggressive scraping`);
      return await this.performColdStartScraping(expertId, targets);
    } else {
      console.log(`[BOOTSTRAP] WARM START - checking for fresh updates`);
      return await this.performWarmStartScraping(expertId, targets, existingContent);
    }
  }

  /**
   * COLD START: No content exists - aggressively scrape multiple articles
   */
  private async performColdStartScraping(expertId: number, targets: any[]) {
    console.log(`[COLD-START] Attempting to bootstrap content from ${targets.length} sources`);
    const results = [];
    const maxAttemptsPerSource = 3; // Try multiple URLs per source

    for (const target of targets) {
      console.log(`[COLD-START] Processing source: ${target.sourceName}`);
      
      // Strategy: Try base URL + common article patterns
      const urlsToTry = this.generateDiscoveryUrls(target.baseUrl);
      let successCount = 0;

      for (const url of urlsToTry) {
        if (successCount >= maxAttemptsPerSource) break;

        try {
          console.log(`[COLD-START] Attempting: ${url}`);
          const result = await this.scraper.scrapeUrl(url);
          
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
            successCount++;
            console.log(`[COLD-START] SUCCESS: ${url} - ${savedContent.title}`);
          } else {
            console.log(`[COLD-START] FAILED: ${url} - ${result.error}`);
          }
        } catch (error) {
          console.error(`[COLD-START] ERROR scraping ${url}:`, error);
        }

        // Rate limiting between attempts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`[COLD-START] Completed ${target.sourceName}: ${successCount} articles scraped`);
    }

    console.log(`[COLD-START] Bootstrap complete: ${results.length} total articles`);
    return results;
  }

  /**
   * WARM START: Content exists - check for fresh updates only
   */
  private async performWarmStartScraping(expertId: number, targets: any[], existingContent: any[]) {
    console.log(`[WARM-START] Checking for fresh content updates`);
    const results = [...existingContent]; // Start with existing content

    for (const target of targets) {
      try {
        // Check for fresh content first (within 24 hours)
        const existingFresh = await storage.getFreshScrapedContent(target.baseUrl, 24);
        
        if (existingFresh) {
          console.log(`[WARM-START] Using cached fresh content from ${target.baseUrl}`);
          if (!results.find(r => r.url === existingFresh.url)) {
            results.push(existingFresh);
          }
          continue;
        }

        // Scrape new content from base URL only
        console.log(`[WARM-START] Checking for updates from ${target.baseUrl}`);
        const result = await this.scraper.scrapeUrl(target.baseUrl);
        
        if (result.success && result.content) {
          // Check if this content is already in our database
          const existing = await storage.getScrapedContentByHash(result.content.contentHash);
          if (!existing) {
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
            console.log(`[WARM-START] NEW CONTENT: ${savedContent.title}`);
          }
        }
      } catch (error) {
        console.error(`[WARM-START] Failed to update from ${target.baseUrl}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate discovery URLs for cold start scraping
   */
  private generateDiscoveryUrls(baseUrl: string): string[] {
    const urls = [baseUrl]; // Always try base URL first

    try {
      const urlObj = new URL(baseUrl);
      const domain = urlObj.hostname;

      // Add common article discovery patterns based on known sites
      if (domain.includes('hbr.org')) {
        urls.push(
          'https://hbr.org/topic/strategy',
          'https://hbr.org/topic/leadership',
          'https://hbr.org/topic/innovation'
        );
      } else if (domain.includes('fastcompany.com')) {
        urls.push(
          'https://www.fastcompany.com/section/leadership',
          'https://www.fastcompany.com/section/innovation',
          'https://www.fastcompany.com/section/technology'
        );
      } else if (domain.includes('sloanreview.mit.edu')) {
        urls.push(
          'https://sloanreview.mit.edu/topic/strategy/',
          'https://sloanreview.mit.edu/topic/leadership/',
          'https://sloanreview.mit.edu/topic/innovation/'
        );
      }
      // Add generic patterns
      else {
        urls.push(
          `${baseUrl}/articles`,
          `${baseUrl}/blog`,
          `${baseUrl}/insights`,
          `${baseUrl}/news`
        );
      }
    } catch (error) {
      console.error('Error generating discovery URLs:', error);
    }

    return urls.slice(0, 5); // Limit to 5 URLs per source
  }
}

export const contentPipeline = new ContentPipeline();