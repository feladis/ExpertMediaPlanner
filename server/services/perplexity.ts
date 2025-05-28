import { SimpleRateLimiter } from './rate-limiter';

export interface PerplexitySearchOptions {
  domains?: string[];
  recency?: 'day' | 'week' | 'month';
  maxResults?: number;
}

export interface PerplexitySearchResult {
  content: string;
  sources: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class PerplexityService {
  private rateLimiter: SimpleRateLimiter;
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    this.rateLimiter = new SimpleRateLimiter();

    if (!this.apiKey) {
      console.warn('Perplexity API key not configured');
    }
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async search(
    query: string,
    options: PerplexitySearchOptions = {}
  ): Promise<PerplexitySearchResult> {
    if (!this.isEnabled()) {
      throw new Error('Perplexity service is not enabled');
    }

    // Rate limiting
    await this.rateLimiter.throttle();

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{
            role: 'user',
            content: this.buildSearchQuery(query, options)
          }],
          search_domain_filter: options.domains,
          search_recency_filter: options.recency,
          return_citations: true,
          max_tokens: 1000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${error}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        sources: data.citations || [],
        usage: data.usage,
      };
    } catch (error) {
      console.error('Perplexity search failed:', error);
      throw error;
    }
  }

  private buildSearchQuery(query: string, options: PerplexitySearchOptions): string {
    // Manter prompts simples e diretos
    let searchQuery = query;

    if (options.recency) {
      searchQuery = `${query} (focus on information from the last ${options.recency})`;
    }
    if (options.maxResults) {
      searchQuery += ` Limit to ${options.maxResults} most relevant results.`;
    }

    return searchQuery;
  }
}

export const perplexityService = new PerplexityService();