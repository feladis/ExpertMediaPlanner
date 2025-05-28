import { ExpertProfile } from '@shared/schema';
import { advancedSourceValidator } from './source-validator';
import { perplexityCache } from './intelligent-cache';
import { robustFallbackSystem } from './fallback-system';

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

// PHASE 2: Advanced Contextual Search Builder with Expert-Profile Intelligence
class AdvancedContextualSearchBuilder {
  buildSearchParams(expertProfile: ExpertProfile, contentType: string): SearchContext {
    const domainFilters = this.buildExpertSpecificDomains(expertProfile);
    const recencyFilter = this.getIntelligentRecencyFilter(contentType, expertProfile);

    return {
      domainFilters,
      recencyFilter,
      expertiseArea: expertProfile.primaryExpertise || '',
      targetAudience: expertProfile.targetAudience || '',
      contentType
    };
  }

  // PHASE 2: Multi-dimensional domain filtering based on complete expert profile
  private buildExpertSpecificDomains(expertProfile: ExpertProfile): string[] {
    const primaryDomains = this.getPrimaryExpertiseDomains(expertProfile.primaryExpertise || '');
    const secondaryDomains = this.getSecondaryExpertiseDomains(expertProfile.secondaryExpertise || []);
    const platformDomains = this.getPlatformSpecificDomains(expertProfile.platforms || []);
    const audienceDomains = this.getAudienceSpecificDomains(expertProfile.targetAudience || '');
    
    // Core trusted sources (always included)
    const coreTrustedSources = ['hbr.org', 'fastcompany.com', 'sloanreview.mit.edu'];
    
    // Combine and deduplicate
    const allDomains = [
      ...coreTrustedSources,
      ...primaryDomains,
      ...secondaryDomains,
      ...platformDomains,
      ...audienceDomains
    ];
    
    return Array.from(new Set(allDomains));
  }

  private getPrimaryExpertiseDomains(expertise: string): string[] {
    const expertiseDomainMap: Record<string, string[]> = {
      // Technology & Innovation
      'technology': ['techcrunch.com', 'wired.com', 'arstechnica.com', 'theverge.com', 'ieee.org'],
      'artificial intelligence': ['openai.com', 'deepmind.com', 'ai.google', 'research.microsoft.com'],
      'cybersecurity': ['krebsonsecurity.com', 'darkreading.com', 'securelist.com', 'csoonline.com'],
      'software development': ['stackoverflow.com', 'github.com', 'dev.to', 'medium.com'],
      
      // Business & Management  
      'business': ['mckinsey.com', 'bcg.com', 'deloitte.com', 'pwc.com', 'accenture.com'],
      'leadership': ['leadershipnow.com', 'ccl.org', 'centerforleadership.org'],
      'strategy': ['strategybusiness.pwc.com', 'strategy-business.com'],
      'entrepreneurship': ['inc.com', 'entrepreneur.com', 'techstars.com'],
      
      // Finance & Economics
      'finance': ['reuters.com', 'bloomberg.com', 'ft.com', 'wsj.com', 'sec.gov'],
      'investment': ['morningstar.com', 'fool.com', 'seekingalpha.com'],
      'cryptocurrency': ['coindesk.com', 'cointelegraph.com'],
      
      // Healthcare & Life Sciences
      'healthcare': ['nejm.org', 'who.int', 'cdc.gov', 'pubmed.ncbi.nlm.nih.gov'],
      'biotechnology': ['nature.com', 'cell.com', 'sciencemag.org'],
      'pharmaceuticals': ['pharmatimes.com', 'fiercepharma.com'],
      
      // Marketing & Communications
      'marketing': ['marketingland.com', 'adage.com', 'contentmarketinginstitute.com'],
      'digital marketing': ['searchengineland.com', 'socialmediaexaminer.com'],
      'brand management': ['brandingmag.com', 'campaignlive.com'],
      
      // Science & Research
      'science': ['nature.com', 'science.org', 'pnas.org', 'cell.com'],
      'research': ['researchgate.net', 'scholar.google.com'],
      
      // Education & Training
      'education': ['edutopia.org', 'chronicle.com', 'insidehighered.com'],
      'training': ['trainingindustry.com', 'td.org'],
      
      // Sustainability & Environment
      'sustainability': ['greenbiz.com', 'sustainablebrands.com', 'triplepundit.com'],
      'environment': ['epa.gov', 'unep.org', 'climatecentral.org']
    };

    return expertiseDomainMap[expertise.toLowerCase()] || [];
  }

  private getSecondaryExpertiseDomains(secondaryExpertise: string[]): string[] {
    const domains: string[] = [];
    
    secondaryExpertise.forEach(expertise => {
      domains.push(...this.getPrimaryExpertiseDomains(expertise));
    });
    
    return domains;
  }

  private getPlatformSpecificDomains(platforms: string[]): string[] {
    const platformDomainMap: Record<string, string[]> = {
      'linkedin': ['linkedin.com', 'business.linkedin.com'],
      'twitter': ['blog.twitter.com', 'business.twitter.com'],
      'instagram': ['business.instagram.com', 'creators.instagram.com'],
      'youtube': ['creatoracademy.youtube.com', 'blog.youtube'],
      'tiktok': ['newsroom.tiktok.com', 'business.tiktok.com'],
      'facebook': ['business.facebook.com', 'about.fb.com']
    };

    const domains: string[] = [];
    platforms.forEach(platform => {
      const platformDomains = platformDomainMap[platform.toLowerCase()];
      if (platformDomains) {
        domains.push(...platformDomains);
      }
    });
    
    return domains;
  }

  private getAudienceSpecificDomains(targetAudience: string): string[] {
    const audienceDomainMap: Record<string, string[]> = {
      'executives': ['mckinsey.com', 'bcg.com', 'hbr.org', 'strategy-business.com'],
      'entrepreneurs': ['inc.com', 'entrepreneur.com', 'forbes.com'],
      'professionals': ['linkedin.com', 'glassdoor.com', 'indeed.com'],
      'students': ['edutopia.org', 'chronicle.com', 'insidehighered.com'],
      'researchers': ['researchgate.net', 'academia.edu', 'scholar.google.com'],
      'developers': ['stackoverflow.com', 'github.com', 'dev.to'],
      'marketers': ['marketingland.com', 'adage.com', 'campaignlive.com']
    };

    const audienceKey = Object.keys(audienceDomainMap).find(key => 
      targetAudience.toLowerCase().includes(key)
    );
    
    return audienceKey ? audienceDomainMap[audienceKey] : [];
  }

  // PHASE 2: Intelligent recency filtering based on content type and expertise
  private getIntelligentRecencyFilter(contentType: string, expertProfile: ExpertProfile): string {
    const expertise = expertProfile.primaryExpertise?.toLowerCase() || '';
    
    // Fast-moving fields need more recent content
    const fastMovingFields = ['technology', 'artificial intelligence', 'cryptocurrency', 'digital marketing'];
    const isFastMoving = fastMovingFields.some(field => expertise.includes(field));
    
    const recencyMap: Record<string, string> = {
      'trending_topics': isFastMoving ? 'day' : 'week',
      'content_ideas': isFastMoving ? 'week' : 'month',
      'research': 'month',
      'news': 'day',
      'analysis': isFastMoving ? 'week' : 'month'
    };

    return recencyMap[contentType] || (isFastMoving ? 'week' : 'month');
  }
}

// PHASE 2: Intelligent Model Selection & Advanced Prompt Builder
class IntelligentModelSelector {
  selectOptimalModel(contentType: string, expertProfile: ExpertProfile, complexity: 'simple' | 'medium' | 'complex'): string {
    // PHASE 2: Intelligent model selection based on content requirements
    const expertise = expertProfile.primaryExpertise?.toLowerCase() || '';
    
    // Technical fields benefit from larger models for accuracy
    const technicalFields = ['technology', 'artificial intelligence', 'science', 'research', 'finance'];
    const isTechnical = technicalFields.some(field => expertise.includes(field));
    
    // Content complexity determines model size
    if (complexity === 'complex' || isTechnical) {
      return 'llama-3.1-sonar-large-128k-online';  // Most capable for complex analysis
    } else if (complexity === 'medium' || contentType === 'trending_topics') {
      return 'llama-3.1-sonar-small-128k-online';  // Balanced for standard tasks
    } else {
      return 'llama-3.1-sonar-small-128k-online';  // Efficient for simple tasks
    }
  }
  
  determineContentComplexity(contentType: string, expertProfile: ExpertProfile): 'simple' | 'medium' | 'complex' {
    const expertise = expertProfile.primaryExpertise?.toLowerCase() || '';
    const platforms = expertProfile.platforms || [];
    
    // Technical expertise requires more complex analysis
    const complexFields = ['artificial intelligence', 'biotechnology', 'finance', 'research'];
    const isComplexField = complexFields.some(field => expertise.includes(field));
    
    // Long-form platforms need more detailed content
    const longFormPlatforms = ['linkedin', 'blog', 'medium'];
    const isLongForm = platforms.some(platform => longFormPlatforms.includes(platform.toLowerCase()));
    
    if (isComplexField && isLongForm) {
      return 'complex';
    } else if (isComplexField || isLongForm || contentType === 'research') {
      return 'medium';
    } else {
      return 'simple';
    }
  }
}

// PHASE 2: Context-Aware Advanced Prompt Builder
class ContextAwarePromptBuilder {
  buildTopicGenerationPrompt(expertProfile: ExpertProfile): string {
    const expertise = expertProfile.primaryExpertise || 'business';
    const secondaryAreas = (expertProfile.secondaryExpertise || []).slice(0, 3).join(', ');
    const voiceTone = (expertProfile.voiceTone || []).join(', ') || 'professional';
    const platforms = (expertProfile.platforms || []).join(', ') || 'LinkedIn';
    const audience = expertProfile.targetAudience || 'professionals';
    const keywords = (expertProfile.expertiseKeywords || []).slice(0, 5).join(', ');

    return `
EXPERT CONTENT STRATEGIST ROLE:
Specialization: ${expertise}
${secondaryAreas ? `Secondary Areas: ${secondaryAreas}` : ''}
Target Audience: ${audience}
Voice Style: ${voiceTone}
Primary Platforms: ${platforms}
${keywords ? `Key Expertise Keywords: ${keywords}` : ''}

SEARCH STRATEGY:
1. Prioritize authoritative industry sources and recent developments
2. Focus on ${expertise} trends and breakthrough insights
3. Look for data-driven analysis and expert commentary
4. Exclude opinion pieces without credible backing
5. Emphasize actionable insights for ${audience}

CONTENT DISCOVERY MISSION:
Generate 3 trending topics that demonstrate thought leadership in ${expertise}:

REQUIREMENTS for each topic:
- Compelling, expertise-driven headline (6-10 words)
- Strategic description with clear value proposition
- Current trend catalyst (specific event, study, or data point)
- Professional relevance to ${audience}
- Optimal format for ${platforms.split(',')[0] || 'LinkedIn'}

OUTPUT STRUCTURE:
For each topic provide:
1. **Title**: [Engaging headline focusing on ${expertise}]
2. **Hook**: [Why this matters to ${audience} right now]
3. **Trend Driver**: [Specific recent development with date]
4. **Value Angle**: [Unique insight or perspective]
5. **Engagement Factor**: [Why this will resonate with your audience]

Focus exclusively on authentic, source-backed content that positions you as a thought leader.`;
  }

  buildContentIdeaPrompt(topic: string, expertProfile: ExpertProfile, platform: string): string {
    const expertise = expertProfile.primaryExpertise || 'business';
    const voiceTone = (expertProfile.voiceTone || []).join(', ') || 'professional';
    const audience = expertProfile.targetAudience || 'professionals';
    const goals = (expertProfile.contentGoals || []).slice(0, 3).join(', ');
    const keywords = (expertProfile.expertiseKeywords || []).slice(0, 5).join(', ');

    return `
EXPERT CONTENT CREATOR BRIEF:
Expertise: ${expertise}
Topic Focus: "${topic}"
Platform: ${platform}
Voice & Tone: ${voiceTone}
Target Audience: ${audience}
${goals ? `Content Goals: ${goals}` : ''}
${keywords ? `Focus Keywords: ${keywords}` : ''}

RESEARCH PARAMETERS:
1. Search for cutting-edge insights on: ${topic}
2. Prioritize recent authoritative analysis (last 30 days)
3. Focus on actionable intelligence for ${audience}
4. Look for data, case studies, and expert perspectives
5. Identify unique angles that demonstrate ${expertise} expertise

${platform.toLowerCase()}-OPTIMIZED CONTENT MISSION:
Create 3 high-impact content ideas that establish thought leadership:

PLATFORM-SPECIFIC REQUIREMENTS:
${this.getPlatformGuidelines(platform)}

OUTPUT FORMAT for each idea:
1. **Headline**: [${platform}-optimized, attention-grabbing title]
2. **Value Proposition**: [Clear benefit for ${audience}]
3. **Key Insights**: [3-4 actionable takeaways backed by research]
4. **Expert Angle**: [Your unique ${expertise} perspective]
5. **Engagement Hook**: [Question or statement to drive discussion]
6. **Call-to-Action**: [Platform-appropriate next step]
7. **Source Citations**: [Authoritative references with dates]

Ensure each idea demonstrates deep ${expertise} knowledge while being immediately actionable for ${audience}.`;
  }

  private getPlatformGuidelines(platform: string): string {
    const guidelines: Record<string, string> = {
      'linkedin': `
- Professional tone with thought leadership positioning
- Optimal length: 1-3 paragraphs + bullet points
- Include relevant hashtags and mentions
- Encourage professional discussion in comments`,
      
      'twitter': `
- Concise, impactful messaging (280 characters)
- Thread format for complex topics
- Strong opening hook and clear value
- Strategic use of hashtags and mentions`,
      
      'instagram': `
- Visual-first approach with compelling captions
- Story-driven content with personal insights
- Use relevant hashtags for discovery
- Encourage saves and shares`,
      
      'youtube': `
- Educational video content with clear structure
- Strong thumbnail and title optimization
- Detailed description with timestamps
- Call-to-action for subscriptions and engagement`,
      
      'tiktok': `
- Short-form, engaging video content
- Trending audio and hashtag integration
- Quick value delivery in first 3 seconds
- Educational but entertaining approach`
    };

    return guidelines[platform.toLowerCase()] || guidelines['linkedin'];
  }
}

// PHASE 2: Enhanced Perplexity Service with Intelligent Context
export class PerplexityService {
  private apiKey: string;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';
  private rateLimiter: AdvancedRateLimiter;
  private searchBuilder: AdvancedContextualSearchBuilder;
  private promptBuilder: ContextAwarePromptBuilder;
  private modelSelector: IntelligentModelSelector;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY environment variable is required');
    }
    
    this.rateLimiter = new AdvancedRateLimiter();
    this.searchBuilder = new AdvancedContextualSearchBuilder();
    this.promptBuilder = new ContextAwarePromptBuilder();
    this.modelSelector = new IntelligentModelSelector();
  }

  // PHASE 3: Enterprise-grade topic generation with quality & reliability
  async generateTopicsWithIntelligentSearch(expertProfile: ExpertProfile): Promise<any> {
    const cacheKey = `topics_${expertProfile.primaryExpertise}_${Date.now() - Date.now() % (2 * 60 * 60 * 1000)}`; // 2-hour cache windows
    
    // PHASE 3: Check intelligent cache first
    const cachedResult = await perplexityCache.get(cacheKey, expertProfile, 'trending_topics');
    if (cachedResult) {
      return cachedResult;
    }

    // PHASE 3: Use robust fallback system
    return robustFallbackSystem.executeWithFallback(
      () => this.performTopicGeneration(expertProfile),
      () => this.generateAnthropicFallback(expertProfile, 'topics'),
      {
        expertProfile,
        contentType: 'trending_topics',
        operationType: 'topics'
      }
    ).then(async (fallbackResult) => {
      // Cache successful results
      if (fallbackResult.data) {
        await perplexityCache.set(
          cacheKey,
          fallbackResult.data,
          expertProfile,
          'trending_topics',
          [],
          fallbackResult.reliability
        );
      }
      return fallbackResult.data;
    });
  }

  // PHASE 3: Core topic generation logic
  private async performTopicGeneration(expertProfile: ExpertProfile): Promise<any> {
    const searchContext = this.searchBuilder.buildSearchParams(expertProfile, 'trending_topics');
    const contentComplexity = this.modelSelector.determineContentComplexity('trending_topics', expertProfile);
    const optimalModel = this.modelSelector.selectOptimalModel('trending_topics', expertProfile, contentComplexity);
    const prompt = this.promptBuilder.buildTopicGenerationPrompt(expertProfile);

    const request: PerplexityRequest = {
      model: optimalModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.getOptimalTokenLimit(contentComplexity),
      temperature: this.getOptimalTemperature('trending_topics'),
      search_domain_filter: searchContext.domainFilters,
      search_recency_filter: searchContext.recencyFilter,
      return_images: false,
      return_related_questions: false,
      top_p: 0.9,
      frequency_penalty: 0.1
    };

    console.log(`[PERPLEXITY-PHASE3] Expert: ${expertProfile.primaryExpertise}`);
    console.log(`[PERPLEXITY-PHASE3] Model: ${optimalModel} (${contentComplexity} complexity)`);
    console.log(`[PERPLEXITY-PHASE3] Domains: ${searchContext.domainFilters.length} filtered sources`);
    console.log(`[PERPLEXITY-PHASE3] Recency: ${searchContext.recencyFilter}`);

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
      
      // PHASE 3: Validate sources for quality assurance
      if (data.citations && data.citations.length > 0) {
        const validationResults = await advancedSourceValidator.validateBatch(data.citations);
        const highQualitySources = advancedSourceValidator.getHighQualitySources(validationResults);
        const reliabilitySummary = advancedSourceValidator.getReliabilitySummary(validationResults);
        
        console.log(`[PERPLEXITY-PHASE3] Source validation: ${reliabilitySummary.highQualitySources}/${reliabilitySummary.totalSources} high-quality, avg score: ${reliabilitySummary.averageScore}`);
        
        // Enhance response with validated sources
        data.validatedCitations = highQualitySources;
        data.sourceQuality = reliabilitySummary;
      }
      
      console.log(`[PERPLEXITY-PHASE3] Success! Model: ${optimalModel}, Tokens: ${data.usage.total_tokens}`);
      console.log(`[PERPLEXITY-PHASE3] Quality-validated sources: ${data.validatedCitations?.length || 0} citations`);

      return data;
    });
  }

  // PHASE 3: Enterprise-grade content ideas with quality assurance
  async generateContentIdeasWithIntelligentSearch(
    topic: string, 
    expertProfile: ExpertProfile, 
    platform: string
  ): Promise<any> {
    const cacheKey = `content_${topic}_${platform}_${expertProfile.primaryExpertise}`;
    
    // PHASE 3: Check intelligent cache first
    const cachedResult = await perplexityCache.get(cacheKey, expertProfile, 'content_ideas');
    if (cachedResult) {
      return cachedResult;
    }

    // PHASE 3: Use robust fallback system
    return robustFallbackSystem.executeWithFallback(
      () => this.performContentGeneration(topic, expertProfile, platform),
      () => this.generateAnthropicFallback(expertProfile, 'content_ideas', { topic, platform }),
      {
        expertProfile,
        contentType: 'content_ideas',
        operationType: 'content_ideas'
      }
    ).then(async (fallbackResult) => {
      // Cache successful results
      if (fallbackResult.data) {
        await perplexityCache.set(
          cacheKey,
          fallbackResult.data,
          expertProfile,
          'content_ideas',
          fallbackResult.data.validatedCitations || [],
          fallbackResult.reliability
        );
      }
      return fallbackResult.data;
    });
  }

  // PHASE 3: Core content generation logic
  private async performContentGeneration(
    topic: string, 
    expertProfile: ExpertProfile, 
    platform: string
  ): Promise<any> {
    const searchContext = this.searchBuilder.buildSearchParams(expertProfile, 'content_ideas');
    const contentComplexity = this.modelSelector.determineContentComplexity('content_ideas', expertProfile);
    const optimalModel = this.modelSelector.selectOptimalModel('content_ideas', expertProfile, contentComplexity);
    const prompt = this.promptBuilder.buildContentIdeaPrompt(topic, expertProfile, platform);

    const request: PerplexityRequest = {
      model: optimalModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: this.getOptimalTokenLimit(contentComplexity),
      temperature: this.getOptimalTemperature('content_ideas'),
      search_domain_filter: searchContext.domainFilters,
      search_recency_filter: searchContext.recencyFilter,
      return_images: false,
      return_related_questions: false,
      top_p: 0.85,
      frequency_penalty: 0.2
    };

    console.log(`[PERPLEXITY-PHASE3] Content Generation Context:`);
    console.log(`  Topic: ${topic}`);
    console.log(`  Platform: ${platform}`);
    console.log(`  Expert: ${expertProfile.primaryExpertise}`);
    console.log(`  Model: ${optimalModel} (${contentComplexity})`);
    console.log(`  Domains: ${searchContext.domainFilters.length} expert-specific sources`);
    console.log(`  Audience: ${expertProfile.targetAudience}`);

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
      
      // PHASE 3: Advanced source validation and quality scoring
      if (data.citations && data.citations.length > 0) {
        const validationResults = await advancedSourceValidator.validateBatch(data.citations);
        const highQualitySources = advancedSourceValidator.getHighQualitySources(validationResults);
        const reliabilitySummary = advancedSourceValidator.getReliabilitySummary(validationResults);
        
        console.log(`[PERPLEXITY-PHASE3] Source validation: ${reliabilitySummary.highQualitySources}/${reliabilitySummary.totalSources} high-quality sources`);
        console.log(`[PERPLEXITY-PHASE3] Top domains: ${reliabilitySummary.topDomains.join(', ')}`);
        
        // Enhance response with validated sources and quality metrics
        data.validatedCitations = highQualitySources;
        data.sourceQuality = reliabilitySummary;
        data.qualityScore = reliabilitySummary.averageScore;
      }
      
      console.log(`[PERPLEXITY-PHASE3] Content Success! Model: ${optimalModel}, Tokens: ${data.usage.total_tokens}`);
      console.log(`[PERPLEXITY-PHASE3] Quality-validated sources: ${data.validatedCitations?.length || 0} citations`);

      return data;
    });
  }

  // PHASE 3: Anthropic fallback for both topics and content ideas
  private async generateAnthropicFallback(
    expertProfile: ExpertProfile, 
    type: 'topics' | 'content_ideas',
    context?: { topic?: string; platform?: string }
  ): Promise<any> {
    console.log(`[PERPLEXITY-PHASE3] Executing Anthropic fallback for ${type}`);
    
    if (type === 'topics') {
      const { generateTopics } = await import('./anthropic');
      return generateTopics({
        primaryExpertise: expertProfile.primaryExpertise || '',
        secondaryExpertise: expertProfile.secondaryExpertise || [],
        expertiseKeywords: expertProfile.expertiseKeywords || [],
        voiceTone: expertProfile.voiceTone || [],
        personalBranding: expertProfile.personalBranding || '',
        platforms: expertProfile.platforms || [],
        targetAudience: expertProfile.targetAudience || '',
        contentGoals: expertProfile.contentGoals || [],
        count: 3
      });
    } else {
      const { generateContentIdeas } = await import('./anthropic');
      return generateContentIdeas({
        topic: context?.topic || 'Industry insights',
        platform: context?.platform || 'linkedin',
        viewpoints: ['professional perspective', 'market analysis'],
        expertiseKeywords: expertProfile.expertiseKeywords || [],
        voiceTone: expertProfile.voiceTone || [],
        expertId: 1 // Fallback ID
      });
    }
  }

  // PHASE 2: Optimization utilities
  private getOptimalTokenLimit(complexity: 'simple' | 'medium' | 'complex'): number {
    const tokenLimits = {
      'simple': 1000,
      'medium': 1500,
      'complex': 2500
    };
    return tokenLimits[complexity];
  }

  private getOptimalTemperature(contentType: string): number {
    const temperatureMap: Record<string, number> = {
      'trending_topics': 0.3,    // More focused for trending content
      'content_ideas': 0.4,      // Slightly more creative for ideas
      'research': 0.2,           // Very focused for research
      'analysis': 0.3            // Balanced for analysis
    };
    return temperatureMap[contentType] || 0.35;
  }
}

export const perplexityService = new PerplexityService();