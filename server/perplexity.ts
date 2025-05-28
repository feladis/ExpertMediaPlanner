import { ExpertProfile } from '@shared/schema';

// Advanced Perplexity configuration based on the document recommendations
interface PerplexityConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  searchDomainFilter?: string[];
  searchRecencyFilter?: 'hour' | 'day' | 'week' | 'month';
  webSearchOptions?: {
    searchContextSize: 'low' | 'medium' | 'high';
    userLocation?: {
      latitude: number;
      longitude: number;
      country: string;
    };
  };
}

interface PerplexityRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  search_domain_filter?: string[];
  return_images?: boolean;
  return_related_questions?: boolean;
  search_recency_filter?: string;
  top_k?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations?: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface SearchContext {
  domainFilters: string[];
  recencyFilter?: string;
  expertiseArea: string;
  targetAudience: string;
  contentType: string;
}

// Advanced Rate Limiter as recommended in the document
class AdvancedRateLimiter {
  private config = {
    tier1: { requestsPerMinute: 20, requestsPerHour: 1000 },
    tier2: { requestsPerMinute: 60, requestsPerHour: 3000 },
    tier3: { requestsPerMinute: 100, requestsPerHour: 5000 }
  };

  private requestHistory: number[] = [];
  private adaptiveBackoff = true;
  private burstCapacity = 5;

  async waitForAvailableSlot(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old requests
    this.requestHistory = this.requestHistory.filter(time => time > oneMinuteAgo);
    
    // Check if we can make a request
    if (this.requestHistory.length >= this.config.tier1.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requestHistory);
      const waitTime = oneMinuteAgo - oldestRequest + 1000; // Add 1 second buffer
      
      if (waitTime > 0) {
        console.log(`[RATE-LIMIT] Waiting ${waitTime}ms before next request`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestHistory.push(now);
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
    console.log(`[BACKOFF] Attempt ${attempt}, waiting ${delay}ms`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async executeWithRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.waitForAvailableSlot();
        return await operation();
      } catch (error: any) {
        if (this.isRateLimitError(error) && attempt < maxAttempts) {
          await this.exponentialBackoff(attempt);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retry attempts exceeded');
  }

  private isRateLimitError(error: any): boolean {
    return error.status === 429 || error.message?.includes('rate limit');
  }
}

// Contextual Search Builder as recommended
class ContextualSearchBuilder {
  buildSearchParams(expertProfile: ExpertProfile, contentType: string): SearchContext {
    const domainFilters = this.getDomainFiltersForExpertise(expertProfile.primaryExpertise || '');
    const recencyFilter = this.getRecencyForContentType(contentType);

    return {
      domainFilters,
      recencyFilter,
      expertiseArea: expertProfile.primaryExpertise || '',
      targetAudience: expertProfile.targetAudience || '',
      contentType
    };
  }

  private getDomainFiltersForExpertise(expertise: string): string[] {
    const domainMap: Record<string, string[]> = {
      'technology': ['stackoverflow.com', 'github.com', 'techcrunch.com', 'hbr.org', '-reddit.com'],
      'healthcare': ['pubmed.ncbi.nlm.nih.gov', 'who.int', 'cdc.gov', 'hbr.org', '-pinterest.com'],
      'finance': ['sec.gov', 'reuters.com', 'bloomberg.com', 'hbr.org', '-reddit.com'],
      'science': ['nature.com', 'science.org', 'arxiv.org', 'researchgate.net', 'hbr.org'],
      'business': ['hbr.org', 'fastcompany.com', 'sloanreview.mit.edu', 'mckinsey.com', '-reddit.com'],
      'marketing': ['hbr.org', 'fastcompany.com', 'marketingland.com', 'adage.com', '-pinterest.com'],
      'leadership': ['hbr.org', 'fastcompany.com', 'sloanreview.mit.edu', 'forbes.com', '-linkedin.com'],
      'content creation': ['hbr.org', 'fastcompany.com', 'contentmarketinginstitute.com', '-reddit.com']
    };

    // Default to trusted sources + expertise-specific domains
    const expertiseDomains = domainMap[expertise.toLowerCase()] || [];
    const trustedSources = ['hbr.org', 'fastcompany.com', 'sloanreview.mit.edu'];
    
    return [...new Set([...expertiseDomains, ...trustedSources])];
  }

  private getRecencyForContentType(contentType: string): string {
    const recencyMap: Record<string, string> = {
      'trending_topics': 'day',
      'content_ideas': 'week',
      'research': 'month',
      'news': 'day'
    };

    return recencyMap[contentType] || 'week';
  }
}

// Advanced Prompt Builder as recommended
class AdvancedPromptBuilder {
  buildTopicGenerationPrompt(expertProfile: ExpertProfile): string {
    return `
ROLE: Expert Content Strategist specializing in ${expertProfile.primaryExpertise}

CONTEXT:
- Primary Expertise: ${expertProfile.primaryExpertise}
- Target Audience: ${expertProfile.targetAudience}
- Voice Tone: ${(expertProfile.voiceTone || []).join(', ')}
- Content Platforms: ${(expertProfile.platforms || []).join(', ')}

SEARCH INSTRUCTIONS:
1. Focus on information published within the last 7 days
2. Prioritize authoritative sources in ${expertProfile.primaryExpertise}
3. Look for trending discussions, breakthrough announcements, or industry shifts
4. Exclude social media opinions and focus on factual reporting

TASK:
Generate 3 highly relevant content topics that are:
- Currently trending (cite specific recent events/data)
- Aligned with expert's specialization
- Engaging for target audience
- Suitable for ${(expertProfile.platforms || ['LinkedIn'])[0]} format

OUTPUT FORMAT:
For each topic, provide:
1. Compelling title (6-8 words)
2. Brief description with hook angle
3. Recent trend trigger (specific event/statistic with date)
4. 3 authoritative sources with publication dates
5. Engagement potential score (1-10) with justification

Ensure all information is current and cite sources with URLs.`;
  }

  buildContentIdeaPrompt(topic: string, expertProfile: ExpertProfile, platform: string): string {
    return `
ROLE: Expert Content Creator specializing in ${expertProfile.primaryExpertise}

CONTEXT:
- Topic: ${topic}
- Platform: ${platform}
- Expert Voice: ${(expertProfile.voiceTone || []).join(', ')}
- Target Audience: ${expertProfile.targetAudience}

SEARCH INSTRUCTIONS:
1. Find recent, authoritative content related to: ${topic}
2. Focus on sources from last 30 days
3. Prioritize expert insights, data, and actionable advice
4. Look for unique angles and fresh perspectives

TASK:
Generate 3 content ideas for ${platform} about ${topic} that:
- Reference recent developments or data
- Provide actionable insights
- Match expert's voice and expertise
- Engage the target audience

OUTPUT FORMAT:
For each content idea:
1. Compelling headline
2. Key points (3-5 bullet points)
3. Call-to-action suggestion
4. Supporting sources with URLs and dates
5. Platform-specific formatting recommendations

Focus on authentic, source-backed content only.`;
  }
}

// Main Perplexity Service
export class PerplexityService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';
  private rateLimiter: AdvancedRateLimiter;
  private searchBuilder: ContextualSearchBuilder;
  private promptBuilder: AdvancedPromptBuilder;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY environment variable is required');
    }
    
    this.rateLimiter = new AdvancedRateLimiter();
    this.searchBuilder = new ContextualSearchBuilder();
    this.promptBuilder = new AdvancedPromptBuilder();
  }

  async generateTopicsWithIntelligentSearch(expertProfile: ExpertProfile): Promise<any> {
    const searchContext = this.searchBuilder.buildSearchParams(expertProfile, 'trending_topics');
    const prompt = this.promptBuilder.buildTopicGenerationPrompt(expertProfile);

    const request: PerplexityRequest = {
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
      search_domain_filter: searchContext.domainFilters,
      search_recency_filter: searchContext.recencyFilter,
      return_images: false,
      return_related_questions: false
    };

    console.log(`[PERPLEXITY] Searching with domain filters: ${searchContext.domainFilters.join(', ')}`);
    console.log(`[PERPLEXITY] Recency filter: ${searchContext.recencyFilter}`);

    return this.rateLimiter.executeWithRetry(async () => {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data: PerplexityResponse = await response.json();
      
      console.log(`[PERPLEXITY] Success! Used ${data.usage.total_tokens} tokens`);
      if (data.citations) {
        console.log(`[PERPLEXITY] Found ${data.citations.length} citations`);
      }

      return data;
    });
  }

  async generateContentIdeasWithIntelligentSearch(
    topic: string, 
    expertProfile: ExpertProfile, 
    platform: string
  ): Promise<any> {
    const searchContext = this.searchBuilder.buildSearchParams(expertProfile, 'content_ideas');
    const prompt = this.promptBuilder.buildContentIdeaPrompt(topic, expertProfile, platform);

    const request: PerplexityRequest = {
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.4,
      search_domain_filter: searchContext.domainFilters,
      search_recency_filter: searchContext.recencyFilter,
      return_images: false,
      return_related_questions: false
    };

    console.log(`[PERPLEXITY] Content search for topic: ${topic}`);
    console.log(`[PERPLEXITY] Platform: ${platform}, Domains: ${searchContext.domainFilters.join(', ')}`);

    return this.rateLimiter.executeWithRetry(async () => {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data: PerplexityResponse = await response.json();
      
      console.log(`[PERPLEXITY] Content ideas generated! Used ${data.usage.total_tokens} tokens`);
      if (data.citations) {
        console.log(`[PERPLEXITY] Sources found: ${data.citations.length} citations`);
      }

      return data;
    });
  }
}

export const perplexityService = new PerplexityService();