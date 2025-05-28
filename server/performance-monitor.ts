import { ExpertProfile } from "@shared/schema";

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  timestamp: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  services: {
    perplexity: 'up' | 'down' | 'slow';
    anthropic: 'up' | 'down' | 'slow';
    database: 'up' | 'down' | 'slow';
    cache: 'up' | 'down' | 'slow';
  };
  lastUpdated: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
}

export interface PerformanceAlert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: Date;
  resolved: boolean;
  metadata?: any;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private systemHealth: SystemHealth = {
    overall: 'healthy',
    services: {
      perplexity: 'up',
      anthropic: 'up',
      database: 'up',
      cache: 'up',
    },
    lastUpdated: new Date(),
  };

  private alertRules: AlertRule[] = [
    {
      id: 'response_time_high',
      name: 'High Response Time',
      condition: 'responseTime > threshold',
      threshold: 5000, // 5 seconds
      severity: 'warning',
      enabled: true,
    },
    {
      id: 'error_rate_high',
      name: 'High Error Rate',
      condition: 'errorRate > threshold',
      threshold: 0.1, // 10%
      severity: 'error',
      enabled: true,
    },
    {
      id: 'throughput_low',
      name: 'Low Throughput',
      condition: 'throughput < threshold',
      threshold: 0.5, // 0.5 requests per second
      severity: 'warning',
      enabled: true,
    },
    {
      id: 'availability_low',
      name: 'Low Availability',
      condition: 'availability < threshold',
      threshold: 0.95, // 95%
      severity: 'critical',
      enabled: true,
    },
  ];

  private requestCounters = {
    total: 0,
    successful: 0,
    failed: 0,
    perplexity: 0,
    anthropic: 0,
  };

  private responseTimes: number[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;

  /**
   * Record a request start time and return completion tracker
   */
  startRequest(service: 'perplexity' | 'anthropic'): () => void {
    const startTime = Date.now();
    this.requestCounters.total++;
    this.requestCounters[service]++;

    return () => {
      const responseTime = Date.now() - startTime;
      this.recordResponseTime(responseTime);
      this.updateMetrics();
    };
  }

  /**
   * Record successful request completion
   */
  recordSuccess(): void {
    this.requestCounters.successful++;
    this.updateSystemHealth();
  }

  /**
   * Record failed request
   */
  recordFailure(service: 'perplexity' | 'anthropic', error: Error): void {
    this.requestCounters.failed++;
    this.updateServiceHealth(service, 'down');
    this.checkAlertRules();
  }

  /**
   * Update service health status
   */
  updateServiceHealth(service: keyof SystemHealth['services'], status: 'up' | 'down' | 'slow'): void {
    this.systemHealth.services[service] = status;
    this.systemHealth.lastUpdated = new Date();
    this.updateOverallHealth();
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const now = new Date();
    const recentMetrics = this.metrics.filter(m => 
      now.getTime() - m.timestamp.getTime() < 60000 // Last minute
    );

    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    const errorRate = this.requestCounters.total > 0 
      ? this.requestCounters.failed / this.requestCounters.total 
      : 0;

    const throughput = recentMetrics.length > 0 
      ? recentMetrics.length / 60 // requests per second
      : 0;

    const availability = this.requestCounters.total > 0 
      ? this.requestCounters.successful / this.requestCounters.total 
      : 1;

    return {
      responseTime: avgResponseTime,
      throughput,
      errorRate,
      availability,
      timestamp: now,
    };
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealth {
    return { ...this.systemHealth };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get performance dashboard data
   */
  getDashboardData(): {
    metrics: PerformanceMetrics;
    health: SystemHealth;
    alerts: PerformanceAlert[];
    trends: {
      responseTime: number[];
      errorRate: number[];
      throughput: number[];
    };
    recommendations: string[];
  } {
    const currentMetrics = this.getCurrentMetrics();
    const recentMetrics = this.metrics.slice(-10); // Last 10 data points

    return {
      metrics: currentMetrics,
      health: this.getSystemHealth(),
      alerts: this.getActiveAlerts(),
      trends: {
        responseTime: recentMetrics.map(m => m.responseTime),
        errorRate: recentMetrics.map(m => m.errorRate),
        throughput: recentMetrics.map(m => m.throughput),
      },
      recommendations: this.generateRecommendations(currentMetrics),
    };
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.responseTime > 3000) {
      recommendations.push('Consider implementing request caching to reduce response times');
    }

    if (metrics.errorRate > 0.05) {
      recommendations.push('High error rate detected - review error logs and implement better retry logic');
    }

    if (metrics.throughput < 1) {
      recommendations.push('Low throughput - consider optimizing database queries and API calls');
    }

    if (metrics.availability < 0.98) {
      recommendations.push('Availability below target - implement better health checks and failover mechanisms');
    }

    if (this.systemHealth.services.perplexity === 'slow') {
      recommendations.push('Perplexity service is slow - consider using fallback to Anthropic');
    }

    if (this.systemHealth.services.cache === 'down') {
      recommendations.push('Cache service is down - this may impact performance significantly');
    }

    return recommendations;
  }

  /**
   * Get detailed service statistics
   */
  getServiceStatistics(): {
    perplexity: {
      totalRequests: number;
      successRate: number;
      avgResponseTime: number;
      status: 'up' | 'down' | 'slow';
    };
    anthropic: {
      totalRequests: number;
      successRate: number;
      avgResponseTime: number;
      status: 'up' | 'down' | 'slow';
    };
    overall: {
      totalRequests: number;
      successRate: number;
      avgResponseTime: number;
      uptime: number;
    };
  } {
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    const successRate = this.requestCounters.total > 0 
      ? this.requestCounters.successful / this.requestCounters.total 
      : 1;

    return {
      perplexity: {
        totalRequests: this.requestCounters.perplexity,
        successRate,
        avgResponseTime,
        status: this.systemHealth.services.perplexity,
      },
      anthropic: {
        totalRequests: this.requestCounters.anthropic,
        successRate,
        avgResponseTime,
        status: this.systemHealth.services.anthropic,
      },
      overall: {
        totalRequests: this.requestCounters.total,
        successRate,
        avgResponseTime,
        uptime: this.calculateUptime(),
      },
    };
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.alertRules.push({
      id,
      ...rule,
    });
    return id;
  }

  /**
   * Reset counters (call periodically)
   */
  resetCounters(): void {
    this.requestCounters = {
      total: 0,
      successful: 0,
      failed: 0,
      perplexity: 0,
      anthropic: 0,
    };
    this.responseTimes = [];
  }

  /**
   * Cleanup old data
   */
  cleanup(): void {
    // Keep only recent metrics
    this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    
    // Keep only unresolved alerts from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || alert.timestamp > oneDayAgo
    );
  }

  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for moving average
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  private updateMetrics(): void {
    const currentMetrics = this.getCurrentMetrics();
    this.metrics.push(currentMetrics);
    
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }
  }

  private updateSystemHealth(): void {
    const metrics = this.getCurrentMetrics();
    
    // Update service status based on performance
    if (metrics.responseTime > 10000) { // 10 seconds
      this.systemHealth.services.perplexity = 'slow';
      this.systemHealth.services.anthropic = 'slow';
    } else if (metrics.errorRate > 0.5) { // 50% error rate
      this.systemHealth.services.perplexity = 'down';
      this.systemHealth.services.anthropic = 'down';
    } else {
      this.systemHealth.services.perplexity = 'up';
      this.systemHealth.services.anthropic = 'up';
    }

    this.updateOverallHealth();
    this.systemHealth.lastUpdated = new Date();
  }

  private updateOverallHealth(): void {
    const services = Object.values(this.systemHealth.services);
    const downServices = services.filter(status => status === 'down').length;
    const slowServices = services.filter(status => status === 'slow').length;

    if (downServices > 0) {
      this.systemHealth.overall = 'critical';
    } else if (slowServices > 1) {
      this.systemHealth.overall = 'degraded';
    } else {
      this.systemHealth.overall = 'healthy';
    }
  }

  private checkAlertRules(): void {
    const currentMetrics = this.getCurrentMetrics();
    
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      let shouldAlert = false;
      
      switch (rule.condition) {
        case 'responseTime > threshold':
          shouldAlert = currentMetrics.responseTime > rule.threshold;
          break;
        case 'errorRate > threshold':
          shouldAlert = currentMetrics.errorRate > rule.threshold;
          break;
        case 'throughput < threshold':
          shouldAlert = currentMetrics.throughput < rule.threshold;
          break;
        case 'availability < threshold':
          shouldAlert = currentMetrics.availability < rule.threshold;
          break;
      }

      if (shouldAlert) {
        this.createAlert(rule, currentMetrics);
      }
    }
  }

  private createAlert(rule: AlertRule, metrics: PerformanceMetrics): void {
    // Don't create duplicate alerts for the same rule within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingAlert = this.alerts.find(alert => 
      alert.ruleId === rule.id && 
      !alert.resolved && 
      alert.timestamp > fiveMinutesAgo
    );

    if (existingAlert) return;

    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      message: `${rule.name}: ${this.formatAlertMessage(rule, metrics)}`,
      severity: rule.severity,
      timestamp: new Date(),
      resolved: false,
      metadata: { metrics, rule },
    };

    this.alerts.push(alert);
  }

  private formatAlertMessage(rule: AlertRule, metrics: PerformanceMetrics): string {
    switch (rule.condition) {
      case 'responseTime > threshold':
        return `Response time is ${Math.round(metrics.responseTime)}ms (threshold: ${rule.threshold}ms)`;
      case 'errorRate > threshold':
        return `Error rate is ${(metrics.errorRate * 100).toFixed(1)}% (threshold: ${(rule.threshold * 100).toFixed(1)}%)`;
      case 'throughput < threshold':
        return `Throughput is ${metrics.throughput.toFixed(2)} req/s (threshold: ${rule.threshold} req/s)`;
      case 'availability < threshold':
        return `Availability is ${(metrics.availability * 100).toFixed(1)}% (threshold: ${(rule.threshold * 100).toFixed(1)}%)`;
      default:
        return 'Performance threshold exceeded';
    }
  }

  private calculateUptime(): number {
    const totalMinutes = this.metrics.length;
    if (totalMinutes === 0) return 1;

    const healthyMinutes = this.metrics.filter(m => 
      m.availability >= 0.95 && m.responseTime < 10000
    ).length;

    return healthyMinutes / totalMinutes;
  }
}

export const performanceMonitor = new PerformanceMonitor();