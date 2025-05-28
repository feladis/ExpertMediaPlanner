import { ExpertProfile } from "@shared/schema";

export interface CostOptimizationConfig {
  dailyBudget: number;
  monthlyBudget: number;
  costPerExpertLimit: number;
  emergencyThreshold: number;
  optimizationEnabled: boolean;
}

export interface UsagePattern {
  expertId: number;
  requestsPerDay: number;
  averageCost: number;
  peakHours: number[];
  preferredPlatforms: string[];
  complexityProfile: 'simple' | 'medium' | 'complex';
}

export interface OptimizationStrategy {
  name: string;
  description: string;
  expectedSavings: number;
  impactLevel: 'low' | 'medium' | 'high';
  implementation: () => Promise<void>;
}

export class CostOptimizer {
  private config: CostOptimizationConfig = {
    dailyBudget: 50.0,
    monthlyBudget: 1200.0,
    costPerExpertLimit: 10.0,
    emergencyThreshold: 0.9, // 90% of budget
    optimizationEnabled: true,
  };

  private usagePatterns = new Map<number, UsagePattern>();
  private currentDailyCost = 0;
  private currentMonthlyCost = 0;
  private lastOptimization = new Date();

  // Token cost mapping with dynamic pricing
  private readonly TOKEN_COSTS = {
    perplexity: {
      'llama-3.1-sonar-small-128k-online': 0.0002, // per 1K tokens
      'llama-3.1-sonar-large-128k-online': 0.0006,
      'llama-3.1-sonar-huge-128k-online': 0.0012,
    },
    anthropic: {
      'claude-3-7-sonnet-20250219': 0.003, // per 1K tokens
      'claude-3-haiku-20240307': 0.0008,
    }
  };

  /**
   * Analyze request and recommend optimal service/model configuration
   */
  optimizeRequest(
    expertProfile: ExpertProfile,
    requestType: 'topics' | 'contentIdeas',
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): {
    service: 'perplexity' | 'anthropic';
    model: string;
    maxTokens: number;
    useCache: boolean;
    estimatedCost: number;
    rationale: string;
  } {
    const pattern = this.usagePatterns.get(expertProfile.expertId);
    const currentBudgetUsage = this.currentDailyCost / this.config.dailyBudget;

    // Budget-based optimization
    if (currentBudgetUsage > this.config.emergencyThreshold) {
      return {
        service: 'anthropic',
        model: 'claude-3-haiku-20240307',
        maxTokens: 500,
        useCache: true,
        estimatedCost: this.TOKEN_COSTS.anthropic['claude-3-haiku-20240307'] * 0.5,
        rationale: 'Emergency cost reduction: using fastest, cheapest model with aggressive caching'
      };
    }

    // Pattern-based optimization
    if (pattern) {
      const complexity = this.determineComplexity(expertProfile, requestType, pattern);
      
      if (complexity === 'simple' && urgency === 'low') {
        return {
          service: 'anthropic',
          model: 'claude-3-haiku-20240307',
          maxTokens: 800,
          useCache: true,
          estimatedCost: this.TOKEN_COSTS.anthropic['claude-3-haiku-20240307'] * 0.8,
          rationale: 'Simple request with low urgency: using cost-efficient model'
        };
      }

      if (complexity === 'complex' || urgency === 'high') {
        return {
          service: 'perplexity',
          model: 'llama-3.1-sonar-large-128k-online',
          maxTokens: 1500,
          useCache: false,
          estimatedCost: this.TOKEN_COSTS.perplexity['llama-3.1-sonar-large-128k-online'] * 1.5,
          rationale: 'Complex request or high urgency: using premium model for quality'
        };
      }
    }

    // Default balanced optimization
    return {
      service: 'perplexity',
      model: 'llama-3.1-sonar-small-128k-online',
      maxTokens: 1000,
      useCache: true,
      estimatedCost: this.TOKEN_COSTS.perplexity['llama-3.1-sonar-small-128k-online'] * 1.0,
      rationale: 'Balanced approach: good quality with reasonable cost'
    };
  }

  /**
   * Update usage patterns for intelligent optimization
   */
  updateUsagePattern(
    expertProfile: ExpertProfile,
    requestType: 'topics' | 'contentIdeas',
    actualCost: number,
    responseQuality: number
  ): void {
    const expertId = expertProfile.expertId;
    const currentPattern = this.usagePatterns.get(expertId);
    const currentHour = new Date().getHours();

    if (currentPattern) {
      // Update existing pattern
      currentPattern.requestsPerDay++;
      currentPattern.averageCost = (currentPattern.averageCost + actualCost) / 2;
      
      // Track peak hours
      if (!currentPattern.peakHours.includes(currentHour)) {
        currentPattern.peakHours.push(currentHour);
      }

      // Update complexity profile based on response quality
      if (responseQuality < 0.7 && currentPattern.complexityProfile === 'simple') {
        currentPattern.complexityProfile = 'medium';
      } else if (responseQuality > 0.9 && currentPattern.complexityProfile === 'complex') {
        currentPattern.complexityProfile = 'medium';
      }

    } else {
      // Create new pattern
      this.usagePatterns.set(expertId, {
        expertId,
        requestsPerDay: 1,
        averageCost: actualCost,
        peakHours: [currentHour],
        preferredPlatforms: [expertProfile.platforms[0] || 'linkedin'],
        complexityProfile: this.inferComplexityFromProfile(expertProfile)
      });
    }

    this.currentDailyCost += actualCost;
    this.currentMonthlyCost += actualCost;
  }

  /**
   * Get cost optimization strategies based on current usage
   */
  getOptimizationStrategies(): OptimizationStrategy[] {
    const strategies: OptimizationStrategy[] = [];

    // Cache optimization strategy
    const cacheStrategy: OptimizationStrategy = {
      name: 'Intelligent Caching Enhancement',
      description: 'Increase cache TTL for stable content and implement smarter invalidation',
      expectedSavings: this.currentDailyCost * 0.3,
      impactLevel: 'medium',
      implementation: async () => {
        // Implementation would update cache configuration
        console.log('Implementing enhanced caching strategy');
      }
    };

    // Model optimization strategy
    const modelStrategy: OptimizationStrategy = {
      name: 'Dynamic Model Selection',
      description: 'Use cheaper models for simple requests and premium models only when needed',
      expectedSavings: this.currentDailyCost * 0.25,
      impactLevel: 'low',
      implementation: async () => {
        console.log('Implementing dynamic model selection');
      }
    };

    // Batch processing strategy
    const batchStrategy: OptimizationStrategy = {
      name: 'Request Batching',
      description: 'Combine multiple similar requests to reduce API overhead',
      expectedSavings: this.currentDailyCost * 0.2,
      impactLevel: 'high',
      implementation: async () => {
        console.log('Implementing request batching');
      }
    };

    strategies.push(cacheStrategy, modelStrategy, batchStrategy);

    // Add emergency strategies if over budget
    const budgetUsage = this.currentDailyCost / this.config.dailyBudget;
    if (budgetUsage > 0.8) {
      strategies.push({
        name: 'Emergency Cost Reduction',
        description: 'Switch to cheapest models and aggressive caching until budget resets',
        expectedSavings: this.currentDailyCost * 0.5,
        impactLevel: 'high',
        implementation: async () => {
          console.log('Implementing emergency cost reduction');
        }
      });
    }

    return strategies.sort((a, b) => b.expectedSavings - a.expectedSavings);
  }

  /**
   * Check if request should be approved based on budget constraints
   */
  shouldApproveRequest(estimatedCost: number, expertId: number): {
    approved: boolean;
    reason: string;
    alternatives?: string[];
  } {
    const projectedDailyCost = this.currentDailyCost + estimatedCost;
    const budgetUsage = projectedDailyCost / this.config.dailyBudget;

    // Check daily budget
    if (budgetUsage > 1.0) {
      return {
        approved: false,
        reason: 'Daily budget exceeded',
        alternatives: [
          'Wait until budget resets tomorrow',
          'Use cached results if available',
          'Switch to cheaper model'
        ]
      };
    }

    // Check per-expert limit
    const expertPattern = this.usagePatterns.get(expertId);
    if (expertPattern && expertPattern.averageCost > this.config.costPerExpertLimit) {
      return {
        approved: false,
        reason: 'Per-expert cost limit exceeded',
        alternatives: [
          'Use cached content for this expert',
          'Reduce request frequency',
          'Switch to simpler content generation'
        ]
      };
    }

    // Check emergency threshold
    if (budgetUsage > this.config.emergencyThreshold) {
      return {
        approved: true,
        reason: 'Approved with cost optimization',
        alternatives: [
          'Using cheaper model automatically',
          'Enabling aggressive caching',
          'Reducing token limits'
        ]
      };
    }

    return {
      approved: true,
      reason: 'Within budget limits'
    };
  }

  /**
   * Get cost analytics and projections
   */
  getCostAnalytics(): {
    current: {
      daily: number;
      monthly: number;
      perExpert: number;
    };
    projections: {
      dailyAtCurrentRate: number;
      monthlyAtCurrentRate: number;
      budgetExhaustionDate?: Date;
    };
    topExperts: Array<{ expertId: number; cost: number; requests: number }>;
    recommendations: string[];
  } {
    const avgCostPerRequest = this.currentDailyCost / Math.max(this.getTotalRequests(), 1);
    const dailyProjection = avgCostPerRequest * this.getProjectedDailyRequests();
    const monthlyProjection = dailyProjection * 30;

    const topExperts = Array.from(this.usagePatterns.entries())
      .map(([expertId, pattern]) => ({
        expertId,
        cost: pattern.averageCost * pattern.requestsPerDay,
        requests: pattern.requestsPerDay
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    const recommendations = this.generateCostRecommendations();

    let budgetExhaustionDate: Date | undefined;
    if (dailyProjection > this.config.dailyBudget) {
      const daysRemaining = this.config.monthlyBudget / dailyProjection;
      budgetExhaustionDate = new Date();
      budgetExhaustionDate.setDate(budgetExhaustionDate.getDate() + daysRemaining);
    }

    return {
      current: {
        daily: this.currentDailyCost,
        monthly: this.currentMonthlyCost,
        perExpert: this.currentDailyCost / Math.max(this.usagePatterns.size, 1)
      },
      projections: {
        dailyAtCurrentRate: dailyProjection,
        monthlyAtCurrentRate: monthlyProjection,
        budgetExhaustionDate
      },
      topExperts,
      recommendations
    };
  }

  /**
   * Reset daily cost tracking (call daily)
   */
  resetDailyTracking(): void {
    this.currentDailyCost = 0;
    // Reset daily counters in usage patterns
    for (const pattern of this.usagePatterns.values()) {
      pattern.requestsPerDay = 0;
    }
  }

  /**
   * Reset monthly cost tracking (call monthly)
   */
  resetMonthlyTracking(): void {
    this.currentMonthlyCost = 0;
    // Reset usage patterns
    this.usagePatterns.clear();
  }

  private determineComplexity(
    expertProfile: ExpertProfile,
    requestType: 'topics' | 'contentIdeas',
    pattern: UsagePattern
  ): 'simple' | 'medium' | 'complex' {
    let complexityScore = 0;

    // Base complexity by request type
    if (requestType === 'contentIdeas') complexityScore += 1;

    // Expertise complexity
    const fastMovingFields = ['AI', 'blockchain', 'cryptocurrency', 'tech', 'startup'];
    if (fastMovingFields.some(field => 
      expertProfile.primaryExpertise.toLowerCase().includes(field.toLowerCase())
    )) {
      complexityScore += 2;
    }

    // Platform complexity
    if (expertProfile.platforms.length > 2) complexityScore += 1;

    // Pattern-based complexity
    if (pattern.complexityProfile === 'complex') complexityScore += 2;

    if (complexityScore <= 2) return 'simple';
    if (complexityScore <= 4) return 'medium';
    return 'complex';
  }

  private inferComplexityFromProfile(expertProfile: ExpertProfile): 'simple' | 'medium' | 'complex' {
    const indicators = [
      expertProfile.secondaryExpertise.length > 3,
      expertProfile.platforms.length > 2,
      expertProfile.contentGoals.length > 5,
      expertProfile.targetAudience.toLowerCase().includes('enterprise'),
      expertProfile.primaryExpertise.toLowerCase().includes('ai') ||
      expertProfile.primaryExpertise.toLowerCase().includes('tech')
    ];

    const trueCount = indicators.filter(Boolean).length;
    
    if (trueCount <= 1) return 'simple';
    if (trueCount <= 3) return 'medium';
    return 'complex';
  }

  private getTotalRequests(): number {
    return Array.from(this.usagePatterns.values())
      .reduce((total, pattern) => total + pattern.requestsPerDay, 0);
  }

  private getProjectedDailyRequests(): number {
    const currentRequests = this.getTotalRequests();
    const avgGrowthRate = 1.1; // 10% daily growth assumption
    return Math.ceil(currentRequests * avgGrowthRate);
  }

  private generateCostRecommendations(): string[] {
    const recommendations: string[] = [];
    const budgetUsage = this.currentDailyCost / this.config.dailyBudget;

    if (budgetUsage > 0.8) {
      recommendations.push('Consider switching to cheaper models for non-critical requests');
    }

    if (this.usagePatterns.size > 10) {
      recommendations.push('Implement user-based rate limiting to control costs');
    }

    const avgCost = this.currentDailyCost / Math.max(this.getTotalRequests(), 1);
    if (avgCost > 0.5) {
      recommendations.push('Enable more aggressive caching to reduce API calls');
    }

    return recommendations;
  }
}

export const costOptimizer = new CostOptimizer();