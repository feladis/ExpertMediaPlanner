import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { ScrapedContent, InsertScrapedContent, ExpertProfile } from '@shared/schema';

export interface ScrapingResult {
  success: boolean;
  content?: InsertScrapedContent;
  error?: string;
}

export interface ScrapingOptions {
  timeout?: number;
  rateLimit?: number;
  maxContentLength?: number;
  userAgent?: string;
}

export class WebScraper {
  private readonly defaultOptions: Required<ScrapingOptions> = {
    timeout: 30000, // 30 seconds
    rateLimit: 2000, // 2 seconds between requests
    maxContentLength: 50000, // 50KB max content
    userAgent: 'ExpertPlanner Content Aggregator 1.0'
  };

  private lastRequestTime = 0;

  constructor(private options: ScrapingOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async scrapeUrl(url: string): Promise<ScrapingResult> {
    try {
      // Rate limiting
      await this.enforceRateLimit();

      // Validate URL
      if (!this.isValidUrl(url)) {
        return { success: false, error: 'Invalid URL provided' };
      }

      // CRITICAL: Block suspicious URLs that could be fake
      if (this.isSuspiciousUrl(url)) {
        return { success: false, error: 'Suspicious URL pattern detected - refusing to scrape' };
      }

      // Fetch content with timeout
      const response = await this.fetchWithTimeout(url);
      
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const html = await response.text();
      
      // Parse content
      const scrapedContent = await this.extractContent(url, html);
      
      if (!scrapedContent) {
        return { success: false, error: 'Failed to extract meaningful content' };
      }

      return { success: true, content: scrapedContent };

    } catch (error: any) {
      console.error('Scraping error:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown scraping error' 
      };
    }
  }

  async scrapeMultipleUrls(urls: string[]): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    
    for (const url of urls) {
      try {
        const result = await this.scrapeUrl(url);
        results.push(result);
        
        // Log progress
        console.log(`Scraped ${url}: ${result.success ? 'SUCCESS' : result.error}`);
        
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
        results.push({ success: false, error: 'Scraping failed' });
      }
    }
    
    return results;
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.options.rateLimit!) {
      const waitTime = this.options.rateLimit! - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.options.userAgent!,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async extractContent(url: string, html: string): Promise<InsertScrapedContent | null> {
    try {
      const $ = cheerio.load(html);
      
      // Remove unwanted elements
      $('script, style, nav, footer, header, aside, .advertisement, .ads, .sidebar').remove();
      
      // Extract title
      const title = this.extractTitle($);
      if (!title) return null;

      // Extract main content
      const content = this.extractMainContent($);
      if (!content || content.length < 100) return null; // Minimum content length

      // Check content length limit
      if (content.length > this.options.maxContentLength!) {
        return null;
      }

      // Extract metadata
      const author = this.extractAuthor($);
      const publishedDate = this.extractPublishedDate($);
      const keywords = this.extractKeywords($, content, title);
      
      // Generate content hash for duplicate detection
      const contentHash = this.generateContentHash(content);
      
      // Extract domain
      const domain = new URL(url).hostname;

      // Calculate word count
      const wordCount = content.split(/\s+/).length;

      // Generate summary (first 200 words)
      const summary = this.generateSummary(content);

      return {
        url,
        title,
        content,
        summary,
        author,
        publishedDate,
        scrapedDate: new Date(),
        contentHash,
        domain,
        wordCount,
        relevanceScore: 0, // Will be calculated later based on expert profile
        status: 'active',
        keywords
      };

    } catch (error) {
      console.error('Content extraction error:', error);
      return null;
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string | null {
    // Try multiple selectors for title
    const titleSelectors = [
      'h1',
      'title',
      '[property="og:title"]',
      '[name="twitter:title"]',
      '.title',
      '.headline',
      '.post-title'
    ];

    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const title = element.attr('content') || element.text().trim();
        if (title && title.length > 5 && title.length < 200) {
          return title;
        }
      }
    }

    return null;
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    // Try multiple selectors for main content
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.main-content',
      'main',
      '.post-body'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const content = element.text().trim();
        if (content.length > 200) {
          return content;
        }
      }
    }

    // Fallback: try to get all paragraph text
    const paragraphs = $('p').map((_, el) => $(el).text().trim()).get();
    return paragraphs.join('\n\n').trim();
  }

  private extractAuthor($: cheerio.CheerioAPI): string | null {
    const authorSelectors = [
      '[rel="author"]',
      '[property="article:author"]',
      '[name="author"]',
      '.author',
      '.byline',
      '.writer'
    ];

    for (const selector of authorSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const author = element.attr('content') || element.text().trim();
        if (author && author.length > 2 && author.length < 100) {
          return author;
        }
      }
    }

    return null;
  }

  private extractPublishedDate($: cheerio.CheerioAPI): Date | null {
    const dateSelectors = [
      '[property="article:published_time"]',
      '[property="article:modified_time"]',
      '[name="publish_date"]',
      'time[datetime]',
      '.published',
      '.date'
    ];

    for (const selector of dateSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const dateStr = element.attr('content') || element.attr('datetime') || element.text().trim();
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    }

    return null;
  }

  private extractKeywords($: cheerio.CheerioAPI, content: string, title: string): string[] {
    const keywords: Set<string> = new Set();

    // Extract from meta keywords
    const metaKeywords = $('[name="keywords"]').attr('content');
    if (metaKeywords) {
      metaKeywords.split(',').forEach(keyword => {
        const cleaned = keyword.trim().toLowerCase();
        if (cleaned.length > 2) keywords.add(cleaned);
      });
    }

    // Extract from content (simple keyword extraction)
    const text = `${title} ${content}`.toLowerCase();
    const words = text.match(/\b[a-z]{3,}\b/g) || [];
    
    // Count word frequency and take top words
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      if (!this.isStopWord(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    // Get top 10 most frequent words
    const topWords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    topWords.forEach(word => keywords.add(word));

    return Array.from(keywords);
  }

  private generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private generateSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const summary = sentences.slice(0, 3).join('. ').trim();
    return summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
  }

  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isSuspiciousUrl(url: string): boolean {
    // CRITICAL: Block known fake URL patterns that AI commonly generates
    const suspiciousPatterns = [
      /^https?:\/\/hbr\.org\/\d{4}\/\d{2}\//,
      /^https?:\/\/www\.mckinsey\.com\/business-functions/,
      /^https?:\/\/sloanreview\.mit\.edu\/article\//,
      /^https?:\/\/www\.fastcompany\.com\/\d+/,
      /^https?:\/\/example\.com/,
      /^https?:\/\/.*\.example/,
      /placeholder/i,
      /fake/i,
      /test\.com/,
      /sample\.com/,
      /dummy/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'this', 'that', 'these', 'those', 'is', 'it', 'its', 'his', 'her', 'their'
    ]);
    return stopWords.has(word);
  }
}

// Relevance scoring functions
export function calculateRelevanceScore(
  scrapedContent: ScrapedContent,
  expertProfile: ExpertProfile
): number {
  let score = 0;
  const maxScore = 100;

  // Get all expert keywords
  const expertKeywords = [
    ...(expertProfile.expertiseKeywords || []),
    expertProfile.primaryExpertise,
    ...(expertProfile.secondaryExpertise || [])
  ].filter(Boolean).map(k => k?.toLowerCase()).filter(Boolean);

  const contentKeywords = scrapedContent.keywords || [];
  const contentText = `${scrapedContent.title} ${scrapedContent.content}`.toLowerCase();

  // Keyword matching (40% of score)
  let keywordMatches = 0;
  expertKeywords.forEach(keyword => {
    if (keyword && typeof keyword === 'string' && contentText.includes(keyword)) {
      keywordMatches++;
      // Bonus for title matches
      if (scrapedContent.title.toLowerCase().includes(keyword)) {
        keywordMatches += 0.5;
      }
    }
  });

  score += Math.min(40, (keywordMatches / expertKeywords.length) * 40);

  // Content freshness (30% of score)
  const daysSincePublished = scrapedContent.publishedDate 
    ? (Date.now() - scrapedContent.publishedDate.getTime()) / (1000 * 60 * 60 * 24)
    : 30; // Assume 30 days if no date

  const freshnessScore = Math.max(0, 30 - daysSincePublished);
  score += Math.min(30, freshnessScore);

  // Content quality indicators (30% of score)
  const qualityScore = Math.min(30, 
    (scrapedContent.wordCount > 500 ? 10 : 5) +
    (scrapedContent.author ? 10 : 0) +
    (scrapedContent.summary ? 5 : 0) +
    (contentKeywords.length > 3 ? 5 : 0)
  );

  score += qualityScore;

  return Math.min(maxScore, Math.round(score));
}

export function getMatchedKeywords(
  scrapedContent: ScrapedContent,
  expertProfile: ExpertProfile
): string[] {
  const expertKeywords = [
    ...(expertProfile.expertiseKeywords || []),
    expertProfile.primaryExpertise,
    ...(expertProfile.secondaryExpertise || [])
  ].filter(Boolean).map(k => k.toLowerCase());

  const contentText = `${scrapedContent.title} ${scrapedContent.content}`.toLowerCase();
  
  return expertKeywords.filter(keyword => contentText.includes(keyword));
}