import { ExpertProfile } from "@shared/schema";

export interface QualityMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  citationAccuracy: number;
  sourceReliability: number;
  costPerRequest: number;
  expertiseAlignment: number;
}

export interface CitationMetrics {
  totalCitations: number;
  validCitations: number;
  brokenCitations: number;
  highAuthorityCount: number;
  mediumAuthorityCount: number;
  lowAuthorityCount: number;
  averageValidationTime: number;
}

export interface PerformanceMetrics {
  apiLatency: {
    perplexity: number[];
    anthropic: number[];
    sourceValidation: number[];
  };
  cacheHitRate: number;
  fallbackRate: number;
  throughputPerMinute: number;
  errorRates: {
    perplexity: number;
    anthropic: number;
    validation: number;
  };
}

export interface CostMetrics {
  dailyCost: number;
  monthlyCost: number;
  costPerExpert: number;
  tokenUsage: {
    perplexity: number;
    anthropic: number;
  };
  requestBreakdown: {
    topics: number;
    contentIdeas: number;
    validation: number;
  };
}

export interface MonitoringAlert {
  id: string;
  type: 'performance' | 'cost' | 'quality' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: any;
}

export class MonitoringService {
  private qualityMetrics: QualityMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    citationAccuracy: 0,
    sourceReliability: 0,
    costPerRequest: 0,
    expertiseAlignment: 0,
  };

  private citationMetrics: CitationMetrics = {
    totalCitations: 0,
    validCitations: 0,
    brokenCitations: 0,
    highAuthorityCount: 0,
    mediumAuthorityCount: 0,
    lowAuthorityCount: 0,
    averageValidationTime: 0,
  };

  private performanceMetrics: PerformanceMetrics = {
    apiLatency: {
      perplexity: [],
      anthropic: [],
      sourceValidation: [],
    },
    cacheHitRate: 0,
    fallbackRate: 0,
    throughputPerMinute: 0,
    errorRates: {
      perplexity: 0,
      anthropic: 0,
      validation: 0,
    },
  };

  private costMetrics: CostMetrics = {
    dailyCost: 0,
    monthlyCost: 0,
    costPerExpert: 0,
    tokenUsage: {
      perplexity: 0,
      anthropic: 0,
    },
    requestBreakdown: {
      topics: 0,
      contentIdeas: 0,
      validation: 0,
    },
  };

  private alerts: MonitoringAlert[] = [];
  private requestTimes: number[] = [];
  private validationTimes: number[] = [];

  // Cost tracking constants (estimated)
  private readonly PERPLEXITY_COST_PER_1K_TOKENS = 0.002;
  private readonly ANTHROPIC_COST_PER_1K_TOKENS = 0.003;

  /**
   * Track a request start and return a function to track completion
   */
  trackRequest(service: 'perplexity' | 'anthropic', type: 'topics' | 'contentIdeas' | 'validation'): () => void {
    const startTime = Date.now();
    this.qualityMetrics.totalRequests++;
    this.costMetrics.requestBreakdown[type]++;

    return () => {
      const duration = Date.now() - startTime;
      this.requestTimes.push(duration);
      this.performanceMetrics.apiLatency[service].push(duration);
      
      // Keep only last 100 measurements for moving average
      if (this.requestTimes.length > 100) {
        this.requestTimes.shift();
      }
      if (this.performanceMetrics.apiLatency[service].length > 100) {
        this.performanceMetrics.apiLatency[service].shift();
      }

      this.updateAverageResponseTime();
      this.checkPerformanceAlerts(service, duration);
    };
  }

  /**
   * Track successful request completion
   */
  trackSuccess(service: 'perplexity' | 'anthropic', tokenUsage?: number): void {
    this.qualityMetrics.successfulRequests++;
    
    if (tokenUsage) {
      this.costMetrics.tokenUsage[service] += tokenUsage;
      const cost = this.calculateTokenCost(service, tokenUsage);
      this.costMetrics.dailyCost += cost;
      this.updateCostMetrics();
    }

    this.updateErrorRates();
  }

  /**
   * Track failed request
   */
  trackError(service: 'perplexity' | 'anthropic', error: Error): void {
    this.qualityMetrics.failedRequests++;
    this.updateErrorRates();

    // Create error alert for high-severity failures
    if (this.performanceMetrics.errorRates[service] > 0.1) { // 10% error rate
      this.createAlert({
        type: 'error',
        severity: 'high',
        message: `High error rate detected for ${service}: ${(this.performanceMetrics.errorRates[service] * 100).toFixed(1)}%`,
        metadata: { service, error: error.message }
      });
    }
  }

  /**
   * Track citation validation metrics
   */
  trackCitationValidation(results: Array<{ isValid: boolean; validationTime: number; authorityScore?: number }>): void {
    const validationStart = Date.now();
    
    results.forEach(result => {
      this.citationMetrics.totalCitations++;
      this.validationTimes.push(result.validationTime);
      
      if (result.isValid) {
        this.citationMetrics.validCitations++;
        
        // Categorize by authority score
        if (result.authorityScore) {
          if (result.authorityScore >= 90) {
            this.citationMetrics.highAuthorityCount++;
          } else if (result.authorityScore >= 70) {
            this.citationMetrics.mediumAuthorityCount++;
          } else {
            this.citationMetrics.lowAuthorityCount++;
          }
        }
      } else {
        this.citationMetrics.brokenCitations++;
      }
    });

    // Update averages
    this.citationMetrics.averageValidationTime = 
      this.validationTimes.reduce((a, b) => a + b, 0) / this.validationTimes.length;

    this.qualityMetrics.citationAccuracy = 
      this.citationMetrics.validCitations / this.citationMetrics.totalCitations;

    this.qualityMetrics.sourceReliability = 
      (this.citationMetrics.highAuthorityCount * 1.0 + 
       this.citationMetrics.mediumAuthorityCount * 0.7 + 
       this.citationMetrics.lowAuthorityCount * 0.4) / this.citationMetrics.totalCitations;

    // Keep only last 1000 validation times
    if (this.validationTimes.length > 1000) {
      this.validationTimes = this.validationTimes.slice(-1000);
    }
  }

  /**
   * Track cache performance
   */
  trackCachePerformance(hitRate: number): void {
    this.performanceMetrics.cacheHitRate = hitRate;
    
    if (hitRate < 0.3) { // Less than 30% hit rate
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        message: `Low cache hit rate: ${(hitRate * 100).toFixed(1)}%`,
        metadata: { hitRate }
      });
    }
  }

  /**
   * Track fallback usage
   */
  trackFallback(reason: string): void {
    const totalFallbacks = this.qualityMetrics.failedRequests;
    this.performanceMetrics.fallbackRate = totalFallbacks / this.qualityMetrics.totalRequests;
    
    if (this.performanceMetrics.fallbackRate > 0.05) { // More than 5% fallback rate
      this.createAlert({
        type: 'performance',
        severity: 'high',
        message: `High fallback rate: ${(this.performanceMetrics.fallbackRate * 100).toFixed(1)}%`,
        metadata: { reason, fallbackRate: this.performanceMetrics.fallbackRate }
      });
    }
  }

  /**
   * Track expertise alignment quality
   */
  trackExpertiseAlignment(score: number, expertProfile: ExpertProfile): void {
    // Weighted running average
    const currentAvg = this.qualityMetrics.expertiseAlignment;
    const requestCount = this.qualityMetrics.totalRequests;
    
    this.qualityMetrics.expertiseAlignment = 
      ((currentAvg * (requestCount - 1)) + score) / requestCount;

    if (score < 0.6) { // Less than 60% alignment
      this.createAlert({
        type: 'quality',
        severity: 'medium',
        message: `Low expertise alignment detected: ${(score * 100).toFixed(1)}%`,
        metadata: { score, expertProfile: expertProfile.primaryExpertise }
      });
    }
  }

  /**
   * Get comprehensive monitoring dashboard data
   */
  getDashboardMetrics(): {
    quality: QualityMetrics;
    citations: CitationMetrics;
    performance: PerformanceMetrics;
    costs: CostMetrics;
    alerts: MonitoringAlert[];
    healthScore: number;
  } {
    return {
      quality: { ...this.qualityMetrics },
      citations: { ...this.citationMetrics },
      performance: { ...this.performanceMetrics },
      costs: { ...this.costMetrics },
      alerts: [...this.alerts],
      healthScore: this.calculateHealthScore(),
    };
  }

  /**
   * Get performance optimizations recommendations
   */
  getOptimizationRecommendations(): Array<{
    type: 'cache' | 'cost' | 'performance' | 'quality';
    priority: 'low' | 'medium' | 'high';
    recommendation: string;
    impact: string;
  }> {
    const recommendations = [];

    // Cache optimization
    if (this.performanceMetrics.cacheHitRate < 0.5) {
      recommendations.push({
        type: 'cache',
        priority: 'high',
        recommendation: 'Increase cache TTL for stable content types and implement smarter cache keys',
        impact: 'Reduce API costs by 30-50% and improve response times'
      });
    }

    // Cost optimization
    if (this.costMetrics.dailyCost > 10) { // $10/day threshold
      recommendations.push({
        type: 'cost',
        priority: 'medium',
        recommendation: 'Implement more aggressive caching and use smaller models for simple queries',
        impact: 'Reduce daily costs by 20-40%'
      });
    }

    // Performance optimization
    const avgLatency = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
    if (avgLatency > 5000) { // 5 seconds
      recommendations.push({
        type: 'performance',
        priority: 'high',
        recommendation: 'Implement parallel processing and reduce timeout values',
        impact: 'Improve response times by 40-60%'
      });
    }

    // Quality optimization
    if (this.qualityMetrics.citationAccuracy < 0.8) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        recommendation: 'Enhance source validation and implement domain scoring',
        impact: 'Increase citation accuracy by 15-25%'
      });
    }

    return recommendations;
  }

  /**
   * Clear old alerts (keep only last 100)
   */
  cleanupAlerts(): void {
    this.alerts = this.alerts.slice(-100);
  }

  /**
   * Reset daily metrics (call this daily)
   */
  resetDailyMetrics(): void {
    this.costMetrics.dailyCost = 0;
    this.costMetrics.requestBreakdown = {
      topics: 0,
      contentIdeas: 0,
      validation: 0,
    };
    this.cleanupAlerts();
  }

  private updateAverageResponseTime(): void {
    if (this.requestTimes.length > 0) {
      this.qualityMetrics.averageResponseTime = 
        this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
    }
  }

  private updateErrorRates(): void {
    const total = this.qualityMetrics.totalRequests;
    const failed = this.qualityMetrics.failedRequests;
    
    // Simple error rate calculation
    this.performanceMetrics.errorRates.perplexity = failed / total;
    this.performanceMetrics.errorRates.anthropic = failed / total;
    this.performanceMetrics.errorRates.validation = failed / total;
  }

  private calculateTokenCost(service: 'perplexity' | 'anthropic', tokens: number): number {
    const costPer1K = service === 'perplexity' 
      ? this.PERPLEXITY_COST_PER_1K_TOKENS 
      : this.ANTHROPIC_COST_PER_1K_TOKENS;
    
    return (tokens / 1000) * costPer1K;
  }

  private updateCostMetrics(): void {
    this.qualityMetrics.costPerRequest = 
      this.costMetrics.dailyCost / this.qualityMetrics.totalRequests;
  }

  private calculateHealthScore(): number {
    const weights = {
      successRate: 0.3,
      responseTime: 0.2,
      citationAccuracy: 0.2,
      cacheHitRate: 0.15,
      expertiseAlignment: 0.15,
    };

    const successRate = this.qualityMetrics.successfulRequests / this.qualityMetrics.totalRequests;
    const responseTimeScore = Math.max(0, 1 - (this.qualityMetrics.averageResponseTime / 10000)); // 10s max
    const citationScore = this.qualityMetrics.citationAccuracy;
    const cacheScore = this.performanceMetrics.cacheHitRate;
    const alignmentScore = this.qualityMetrics.expertiseAlignment;

    return Math.round(
      (successRate * weights.successRate +
       responseTimeScore * weights.responseTime +
       citationScore * weights.citationAccuracy +
       cacheScore * weights.cacheHitRate +
       alignmentScore * weights.expertiseAlignment) * 100
    );
  }

  private checkPerformanceAlerts(service: string, duration: number): void {
    if (duration > 10000) { // 10 seconds
      this.createAlert({
        type: 'performance',
        severity: 'high',
        message: `Slow response detected for ${service}: ${duration}ms`,
        metadata: { service, duration }
      });
    }
  }

  private createAlert(alert: Omit<MonitoringAlert, 'id' | 'timestamp'>): void {
    this.alerts.push({
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...alert
    });
  }
}

export const monitoringService = new MonitoringService();