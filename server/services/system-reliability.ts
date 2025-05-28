/**
 * System Reliability - Phase 4 Implementation
 * Error handling, freshness indicators, and performance monitoring
 */

export interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'offline';
  services: {
    perplexity: ServiceHealth;
    anthropic: ServiceHealth;
    database: ServiceHealth;
    cache: ServiceHealth;
  };
  lastCheck: Date;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'offline';
  responseTime?: number;
  errorRate: number;
  lastError?: string;
  uptime: number; // percentage
}

export interface ResearchFreshness {
  level: 'fresh' | 'recent' | 'stale' | 'expired';
  age: string; // "2 hours ago", "1 day ago"
  ageInHours: number;
  recommendRefresh: boolean;
  sourceTimestamp: Date;
  qualityImpact: 'none' | 'minimal' | 'moderate' | 'significant';
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  cacheHitRate: number;
  costSavings: number;
  topicRelevanceScore: number;
  userSatisfactionScore: number;
}

export interface ErrorState {
  type: 'api_key_missing' | 'service_unavailable' | 'rate_limit' | 'quality_low' | 'network_error';
  message: string;
  userAction: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  canProceed: boolean;
  fallbackAvailable: boolean;
}

export class SystemReliabilityService {
  private performanceData: PerformanceMetrics = {
    averageResponseTime: 0,
    successRate: 100,
    cacheHitRate: 0,
    costSavings: 0,
    topicRelevanceScore: 0,
    userSatisfactionScore: 0
  };

  private serviceHealth: SystemStatus['services'] = {
    perplexity: { status: 'healthy', errorRate: 0, uptime: 100 },
    anthropic: { status: 'healthy', errorRate: 0, uptime: 100 },
    database: { status: 'healthy', errorRate: 0, uptime: 100 },
    cache: { status: 'healthy', errorRate: 0, uptime: 100 }
  };

  /**
   * Phase 4.1: Clear Error State Management
   */
  createErrorState(error: any, context: string): ErrorState {
    console.log(`🚨 Creating error state for ${context}:`, error);

    // API Key Missing
    if (error.message?.includes('API key') || error.status === 401) {
      return {
        type: 'api_key_missing',
        message: 'Research API key required for current industry intelligence',
        userAction: 'Connect your research API to access real-time market discussions',
        severity: 'warning',
        canProceed: false,
        fallbackAvailable: false
      };
    }

    // Rate Limits
    if (error.status === 429 || error.message?.includes('rate limit')) {
      return {
        type: 'rate_limit',
        message: 'Research quota reached for this hour',
        userAction: 'Enhanced intelligence available in 1 hour, or upgrade for higher limits',
        severity: 'info',
        canProceed: true,
        fallbackAvailable: true
      };
    }

    // Service Unavailable
    if (error.status >= 500 || error.message?.includes('network')) {
      return {
        type: 'service_unavailable',
        message: 'Research service temporarily unavailable',
        userAction: 'Using cached intelligence - refresh in a few minutes for latest data',
        severity: 'warning',
        canProceed: true,
        fallbackAvailable: true
      };
    }

    // Quality Issues
    if (error.message?.includes('quality') || error.message?.includes('sources')) {
      return {
        type: 'quality_low',
        message: 'Limited research quality detected',
        userAction: 'Consider upgrading data sources for premium industry insights',
        severity: 'info',
        canProceed: true,
        fallbackAvailable: false
      };
    }

    // Generic Network Error
    return {
      type: 'network_error',
      message: 'Connection issue detected',
      userAction: 'Check your internet connection and try again',
      severity: 'error',
      canProceed: false,
      fallbackAvailable: false
    };
  }

  /**
   * Phase 4.2: Research Freshness Indicators
   */
  calculateFreshness(sourceTimestamp: Date, contentType: 'trends' | 'general' = 'general'): ResearchFreshness {
    const now = new Date();
    const ageInHours = (now.getTime() - sourceTimestamp.getTime()) / (1000 * 60 * 60);
    
    // Different freshness standards for different content types
    const freshnessThresholds = {
      trends: { fresh: 6, recent: 24, stale: 72 },
      general: { fresh: 24, recent: 72, stale: 168 }
    };
    
    const thresholds = freshnessThresholds[contentType];
    
    let level: ResearchFreshness['level'];
    let qualityImpact: ResearchFreshness['qualityImpact'];
    let recommendRefresh: boolean;
    
    if (ageInHours <= thresholds.fresh) {
      level = 'fresh';
      qualityImpact = 'none';
      recommendRefresh = false;
    } else if (ageInHours <= thresholds.recent) {
      level = 'recent';
      qualityImpact = 'minimal';
      recommendRefresh = false;
    } else if (ageInHours <= thresholds.stale) {
      level = 'stale';
      qualityImpact = 'moderate';
      recommendRefresh = true;
    } else {
      level = 'expired';
      qualityImpact = 'significant';
      recommendRefresh = true;
    }
    
    return {
      level,
      age: this.formatAge(ageInHours),
      ageInHours,
      recommendRefresh,
      sourceTimestamp,
      qualityImpact
    };
  }

  /**
   * Phase 4.3: Performance Monitoring
   */
  trackPerformance(operation: string, duration: number, success: boolean, metadata?: any) {
    console.log(`📊 Performance tracked: ${operation} - ${duration}ms - ${success ? 'Success' : 'Failed'}`);
    
    // Update running averages
    this.performanceData.averageResponseTime = 
      (this.performanceData.averageResponseTime + duration) / 2;
    
    this.performanceData.successRate = success ? 
      Math.min(100, this.performanceData.successRate + 1) :
      Math.max(0, this.performanceData.successRate - 5);

    if (metadata?.cacheHit) {
      this.performanceData.cacheHitRate = 
        (this.performanceData.cacheHitRate + 10) / 2;
    }

    if (metadata?.costSaved) {
      this.performanceData.costSavings += metadata.costSaved;
    }
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): SystemStatus {
    const overallHealth = this.calculateOverallHealth();
    
    return {
      overall: overallHealth,
      services: this.serviceHealth,
      lastCheck: new Date()
    };
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceData };
  }

  /**
   * Update service health status
   */
  updateServiceHealth(service: keyof SystemStatus['services'], health: Partial<ServiceHealth>) {
    this.serviceHealth[service] = {
      ...this.serviceHealth[service],
      ...health
    };
    
    console.log(`🏥 Service health updated: ${service} - ${health.status || 'status unchanged'}`);
  }

  /**
   * Private helper methods
   */
  private formatAge(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes ago`;
    } else if (hours < 24) {
      return `${Math.round(hours)} hours ago`;
    } else {
      const days = Math.round(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  private calculateOverallHealth(): SystemStatus['overall'] {
    const services = Object.values(this.serviceHealth);
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const offlineCount = services.filter(s => s.status === 'offline').length;
    
    if (offlineCount > 1) return 'offline';
    if (healthyCount === services.length) return 'healthy';
    return 'degraded';
  }
}

export const systemReliability = new SystemReliabilityService();