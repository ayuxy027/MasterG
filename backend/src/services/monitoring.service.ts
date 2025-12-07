import logger from "./logger.service";

interface Metrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  averageLatency: number;
  requestsByStrategy: Record<string, number>;
  requestsByLanguage: Record<string, number>;
  errorsByType: Record<string, number>;
}

/**
 * Observability & Monitoring Service
 * Tracks metrics, performance, and system health
 */
export class MonitoringService {
  private metrics: Metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    averageLatency: 0,
    requestsByStrategy: {},
    requestsByLanguage: {},
    errorsByType: {},
  };

  private latencies: number[] = [];

  /**
   * Track request start
   */
  trackRequestStart(correlationId: string): number {
    this.metrics.totalRequests++;
    return Date.now();
  }

  /**
   * Track request completion
   */
  trackRequestComplete(
    correlationId: string,
    startTime: number,
    strategy: string,
    language: string,
    success: boolean,
    cached: boolean
  ): void {
    const duration = Date.now() - startTime;
    this.latencies.push(duration);

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    if (cached) {
      this.metrics.cacheHits++;
    }

    // Track by strategy
    this.metrics.requestsByStrategy[strategy] =
      (this.metrics.requestsByStrategy[strategy] || 0) + 1;

    // Track by language
    this.metrics.requestsByLanguage[language] =
      (this.metrics.requestsByLanguage[language] || 0) + 1;

    // Update average latency
    this.updateAverageLatency();

    logger.info(
      `📊 [${correlationId}] Request completed: ${duration}ms | Strategy: ${strategy} | Success: ${success}`
    );
  }

  /**
   * Track error
   */
  trackError(errorType: string): void {
    this.metrics.errorsByType[errorType] =
      (this.metrics.errorsByType[errorType] || 0) + 1;
  }

  /**
   * Update average latency
   */
  private updateAverageLatency(): void {
    if (this.latencies.length === 0) {
      this.metrics.averageLatency = 0;
      return;
    }

    // Keep only last 1000 latencies
    if (this.latencies.length > 1000) {
      this.latencies = this.latencies.slice(-1000);
    }

    const sum = this.latencies.reduce((a, b) => a + b, 0);
    this.metrics.averageLatency = sum / this.latencies.length;
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metrics & {
    successRate: number;
    cacheHitRate: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
  } {
    const successRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
        : 0;

    const cacheHitRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
        : 0;

    return {
      ...this.metrics,
      successRate,
      cacheHitRate,
      p50Latency: this.getPercentile(50),
      p95Latency: this.getPercentile(95),
      p99Latency: this.getPercentile(99),
    };
  }

  /**
   * Calculate percentile latency
   */
  private getPercentile(percentile: number): number {
    if (this.latencies.length === 0) return 0;

    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      averageLatency: 0,
      requestsByStrategy: {},
      requestsByLanguage: {},
      errorsByType: {},
    };
    this.latencies = [];
    logger.info("📊 Metrics reset");
  }

  /**
   * Log metrics summary
   */
  logMetricsSummary(): void {
    const metrics = this.getMetrics();
    logger.info("📊 === METRICS SUMMARY ===");
    logger.info(`Total Requests: ${metrics.totalRequests}`);
    logger.info(`Success Rate: ${metrics.successRate.toFixed(2)}%`);
    logger.info(`Cache Hit Rate: ${metrics.cacheHitRate.toFixed(2)}%`);
    logger.info(`Average Latency: ${metrics.averageLatency.toFixed(0)}ms`);
    logger.info(`P95 Latency: ${metrics.p95Latency.toFixed(0)}ms`);
    logger.info(`P99 Latency: ${metrics.p99Latency.toFixed(0)}ms`);
    logger.info(
      `Requests by Strategy: ${JSON.stringify(metrics.requestsByStrategy)}`
    );
    logger.info(
      `Requests by Language: ${JSON.stringify(metrics.requestsByLanguage)}`
    );
    logger.info("📊 =======================");
  }
}

export const monitoringService = new MonitoringService();

// Log metrics every 5 minutes
setInterval(() => {
  monitoringService.logMetricsSummary();
}, 5 * 60 * 1000);
