// PHASE 3: Advanced Source Validation & Reliability Scoring
import { createHash } from 'crypto';

export interface ValidationResult {
  url: string;
  isValid: boolean;
  isAccessible: boolean;
  reliabilityScore: number;
  domainAuthority: 'high' | 'medium' | 'low';
  reason?: string;
  lastChecked: Date;
  responseTime?: number;
}

export interface SourceReliabilityMetrics {
  domainAge?: number;
  httpsEnabled: boolean;
  hasValidCert: boolean;
  responseTime: number;
  contentQuality: number;
  authorityScore: number;
}

export class AdvancedSourceValidator {
  private validationCache = new Map<string, ValidationResult>();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  
  // PHASE 3: Expanded blacklist with unreliable sources
  private blacklistedDomains = new Set([
    'example.com',
    'test.com',
    'localhost',
    'placeholder.com',
    '127.0.0.1',
    'fake-site.com',
    'spam-source.com',
    'unreliable-news.com',
    // Social media for content authenticity
    'reddit.com',
    'facebook.com', 
    'instagram.com',
    'tiktok.com',
    'pinterest.com'
  ]);

  // PHASE 3: Trusted domains with authority scores
  private trustedDomains = new Map([
    // Tier 1: Highest Authority (Score: 90-100)
    ['harvard.edu', { authority: 'high', score: 98 }],
    ['mit.edu', { authority: 'high', score: 97 }],
    ['stanford.edu', { authority: 'high', score: 96 }],
    ['hbr.org', { authority: 'high', score: 95 }],
    ['sloanreview.mit.edu', { authority: 'high', score: 94 }],
    ['fastcompany.com', { authority: 'high', score: 92 }],
    ['mckinsey.com', { authority: 'high', score: 91 }],
    ['nature.com', { authority: 'high', score: 96 }],
    ['science.org', { authority: 'high', score: 95 }],
    
    // Tier 2: High Authority (Score: 80-89)
    ['reuters.com', { authority: 'high', score: 88 }],
    ['bloomberg.com', { authority: 'high', score: 87 }],
    ['wsj.com', { authority: 'high', score: 86 }],
    ['ft.com', { authority: 'high', score: 85 }],
    ['techcrunch.com', { authority: 'high', score: 83 }],
    ['wired.com', { authority: 'high', score: 82 }],
    ['ieee.org', { authority: 'high', score: 89 }],
    ['who.int', { authority: 'high', score: 88 }],
    ['cdc.gov', { authority: 'high', score: 87 }],
    
    // Tier 3: Medium Authority (Score: 70-79)
    ['forbes.com', { authority: 'medium', score: 78 }],
    ['inc.com', { authority: 'medium', score: 76 }],
    ['entrepreneur.com', { authority: 'medium', score: 75 }],
    ['marketingland.com', { authority: 'medium', score: 74 }],
    ['adage.com', { authority: 'medium', score: 73 }],
    ['theverge.com', { authority: 'medium', score: 72 }],
    ['arstechnica.com', { authority: 'medium', score: 71 }]
  ]);

  async validate(url: string, skipCache = false): Promise<ValidationResult> {
    const urlHash = this.createUrlHash(url);
    
    // PHASE 3: Check cache first
    if (!skipCache && this.validationCache.has(urlHash)) {
      const cached = this.validationCache.get(urlHash)!;
      if (Date.now() - cached.lastChecked.getTime() < this.cacheExpiry) {
        console.log(`[SOURCE-VALIDATOR] Cache hit for ${this.getDomain(url)}`);
        return cached;
      }
    }

    console.log(`[SOURCE-VALIDATOR] Validating ${url}`);
    const result = await this.performValidation(url);
    
    // Cache the result
    this.validationCache.set(urlHash, result);
    
    return result;
  }

  private async performValidation(url: string): Promise<ValidationResult> {
    const startTime = Date.now();
    const result: ValidationResult = {
      url,
      isValid: false,
      isAccessible: false,
      reliabilityScore: 0,
      domainAuthority: 'low',
      lastChecked: new Date()
    };

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();

      // PHASE 3: Check blacklist
      if (this.blacklistedDomains.has(domain)) {
        result.reason = 'Domain is blacklisted for content authenticity';
        return result;
      }

      // PHASE 3: Check protocol security
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        result.reason = 'Invalid or insecure protocol';
        return result;
      }

      // PHASE 3: Get domain authority and base score
      const domainInfo = this.trustedDomains.get(domain);
      if (domainInfo) {
        result.domainAuthority = domainInfo.authority as 'high' | 'medium' | 'low';
        result.reliabilityScore = domainInfo.score;
      } else {
        // Unknown domain gets medium score, validated by accessibility
        result.domainAuthority = 'medium';
        result.reliabilityScore = 60;
      }

      // PHASE 3: Test accessibility with timeout
      const accessibility = await this.testAccessibility(url);
      result.isAccessible = accessibility.accessible;
      result.responseTime = Date.now() - startTime;

      if (!accessibility.accessible) {
        result.reason = accessibility.reason;
        result.reliabilityScore = Math.max(0, result.reliabilityScore - 30);
        return result;
      }

      // PHASE 3: Additional reliability factors
      const metrics = await this.calculateReliabilityMetrics(urlObj);
      result.reliabilityScore = this.calculateFinalScore(result.reliabilityScore, metrics);
      result.isValid = result.reliabilityScore >= 60; // Minimum threshold

      console.log(`[SOURCE-VALIDATOR] ${domain}: Score ${result.reliabilityScore}, Authority: ${result.domainAuthority}`);
      
      return result;

    } catch (error) {
      result.reason = 'Invalid URL format or validation error';
      result.responseTime = Date.now() - startTime;
      console.error(`[SOURCE-VALIDATOR] Error validating ${url}:`, error);
      return result;
    }
  }

  private async testAccessibility(url: string): Promise<{ accessible: boolean; reason?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ExpertPlanner-SourceValidator/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return { accessible: true };
      } else {
        return { 
          accessible: false, 
          reason: `HTTP ${response.status} ${response.statusText}` 
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { accessible: false, reason: 'Request timeout (8s)' };
      }
      return { 
        accessible: false, 
        reason: error.message || 'Network error' 
      };
    }
  }

  private async calculateReliabilityMetrics(urlObj: URL): Promise<SourceReliabilityMetrics> {
    return {
      httpsEnabled: urlObj.protocol === 'https:',
      hasValidCert: urlObj.protocol === 'https:', // Simplified for now
      responseTime: 0, // Will be set by caller
      contentQuality: this.estimateContentQuality(urlObj.hostname),
      authorityScore: this.trustedDomains.get(urlObj.hostname)?.score || 50
    };
  }

  private estimateContentQuality(domain: string): number {
    // PHASE 3: Content quality estimation based on domain characteristics
    let score = 50; // Base score

    // Educational domains
    if (domain.endsWith('.edu')) score += 30;
    if (domain.endsWith('.gov')) score += 25;
    if (domain.endsWith('.org')) score += 15;
    
    // Known quality indicators
    if (domain.includes('research')) score += 10;
    if (domain.includes('journal')) score += 15;
    if (domain.includes('institute')) score += 10;
    if (domain.includes('university')) score += 15;

    // Reduce score for commercial or potentially biased sources
    if (domain.includes('blog')) score -= 10;
    if (domain.includes('news') && !this.trustedDomains.has(domain)) score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  private calculateFinalScore(baseScore: number, metrics: SourceReliabilityMetrics): number {
    let finalScore = baseScore;

    // PHASE 3: Reliability adjustments
    if (metrics.httpsEnabled) finalScore += 5;
    if (metrics.hasValidCert) finalScore += 5;
    if (metrics.responseTime < 2000) finalScore += 3; // Fast response
    if (metrics.responseTime > 5000) finalScore -= 5; // Slow response

    finalScore += (metrics.contentQuality - 50) * 0.2; // Content quality influence

    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  async validateBatch(urls: string[]): Promise<ValidationResult[]> {
    console.log(`[SOURCE-VALIDATOR] Batch validating ${urls.length} sources`);
    
    const results: ValidationResult[] = [];
    const batchSize = 3; // Conservative to avoid overwhelming servers

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => 
        this.validate(url).catch(error => {
          console.error(`[SOURCE-VALIDATOR] Batch validation failed for ${url}:`, error);
          return {
            url,
            isValid: false,
            isAccessible: false,
            reliabilityScore: 0,
            domainAuthority: 'low' as const,
            reason: 'Validation failed',
            lastChecked: new Date()
          };
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be respectful
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // PHASE 3: Sort by reliability score
    results.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
    
    const validCount = results.filter(r => r.isValid).length;
    console.log(`[SOURCE-VALIDATOR] Batch complete: ${validCount}/${urls.length} sources validated`);

    return results;
  }

  // PHASE 3: Get high-quality sources only
  getHighQualitySources(validationResults: ValidationResult[]): string[] {
    return validationResults
      .filter(result => 
        result.isValid && 
        result.reliabilityScore >= 70 && 
        result.domainAuthority !== 'low'
      )
      .map(result => result.url);
  }

  // PHASE 3: Get reliability summary
  getReliabilitySummary(validationResults: ValidationResult[]): {
    totalSources: number;
    validSources: number;
    highQualitySources: number;
    averageScore: number;
    topDomains: string[];
  } {
    const validResults = validationResults.filter(r => r.isValid);
    const highQualityResults = validResults.filter(r => r.reliabilityScore >= 70);
    
    const averageScore = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + r.reliabilityScore, 0) / validResults.length
      : 0;

    const domainCounts = new Map<string, number>();
    validResults.forEach(result => {
      const domain = this.getDomain(result.url);
      domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
    });

    const topDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain]) => domain);

    return {
      totalSources: validationResults.length,
      validSources: validResults.length,
      highQualitySources: highQualityResults.length,
      averageScore: Math.round(averageScore),
      topDomains
    };
  }

  private createUrlHash(url: string): string {
    return createHash('md5').update(url).digest('hex');
  }

  private getDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  // PHASE 3: Cache management
  clearCache(): void {
    this.validationCache.clear();
    console.log('[SOURCE-VALIDATOR] Cache cleared');
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.validationCache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }
}

export const advancedSourceValidator = new AdvancedSourceValidator();