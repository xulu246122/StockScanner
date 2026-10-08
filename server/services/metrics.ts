export class ProductionMetricsService {
  private requestsTotal = 0;
  private requestsFailed = 0;
  private totalLatencyMs = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private activeJobsCount = 0;
  private startTime = Date.now();

  public recordRequest(latencyMs: number, isError: boolean = false) {
    this.requestsTotal++;
    if (isError) this.requestsFailed++;
    this.totalLatencyMs += latencyMs;
  }

  public recordCacheHit() {
    this.cacheHits++;
  }

  public recordCacheMiss() {
    this.cacheMisses++;
  }

  public incrementActiveJobs() {
    this.activeJobsCount++;
  }

  public decrementActiveJobs() {
    this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
  }

  public getMetricsSummary() {
    const uptimeSeconds = Math.round((Date.now() - this.startTime) / 1000);
    const avgLatencyMs = this.requestsTotal > 0
      ? Number((this.totalLatencyMs / this.requestsTotal).toFixed(2))
      : 0;
    const totalCacheAccesses = this.cacheHits + this.cacheMisses;
    const cacheHitRatio = totalCacheAccesses > 0
      ? Number(((this.cacheHits / totalCacheAccesses) * 100).toFixed(1))
      : 100;

    return {
      status: 'UP',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      requests: {
        total: this.requestsTotal,
        failed: this.requestsFailed,
        avgLatencyMs
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRatioPercent: cacheHitRatio
      },
      jobs: {
        activeBackgroundJobs: this.activeJobsCount
      }
    };
  }
}

export const metricsService = new ProductionMetricsService();
