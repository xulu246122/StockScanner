import { EarningsAndForecastData, DataBlock, PriceBar, Timeframe } from '../../types.ts';

interface CacheEntry { data: DataBlock<EarningsAndForecastData>; expiresAt: number; }
interface Recommendation { strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number; }
interface PriceTarget { targetMean?: number; targetMedian?: number; targetHigh?: number; targetLow?: number; }

const PERIODS_PER_YEAR: Record<Timeframe, number> = { '10m': 9828, '30m': 3276, '1h': 1638, '2h': 819, '4h': 410, '1D': 252, '1W': 52, '1M': 12 };

export class ForecastProvider {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 6 * 60 * 60 * 1000;

  public async getForecasts(ticker: string, currentPrice: number, bars: PriceBar[], timeframe: Timeframe): Promise<DataBlock<EarningsAndForecastData>> {
    const symbol = ticker.toUpperCase().trim();
    const key = `${symbol}:${timeframe}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    const model = this.calculateModel(currentPrice, bars, timeframe);
    if (!model) return { status: 'UNAVAILABLE', data: null, error: 'At least 30 verified price bars are required for a historical statistical forecast.', isMock: false, isStale: false, updatedAt: null, source: 'UNAVAILABLE' };

    let analystConsensus: EarningsAndForecastData['analystConsensus'] = null;
    let priceTarget: EarningsAndForecastData['priceTarget'] = null;
    let usedFinnhub = false;
    const apiKey = process.env.FINNHUB_API_KEY?.trim();
    if (apiKey) {
      try {
        const [recommendationData, targetData] = await Promise.all([
          this.fetchJson<unknown>(`https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`),
          this.fetchJson<PriceTarget>(`https://finnhub.io/api/v1/stock/price-target?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(apiKey)}`)
        ]);
        const recommendation = Array.isArray(recommendationData) ? recommendationData[0] as Recommendation | undefined : undefined;
        if (recommendation) {
          const strongBuy = this.count(recommendation.strongBuy);
          const buy = this.count(recommendation.buy);
          const hold = this.count(recommendation.hold);
          const underperform = this.count(recommendation.sell);
          const sell = this.count(recommendation.strongSell);
          const totalAnalysts = strongBuy + buy + hold + underperform + sell;
          if (totalAnalysts > 0) {
            const ratingScore = (strongBuy + buy * 2 + hold * 3 + underperform * 4 + sell * 5) / totalAnalysts;
            const rating: NonNullable<EarningsAndForecastData['analystConsensus']>['rating'] = ratingScore <= 1.5 ? 'STRONG_BUY' : ratingScore <= 2.5 ? 'BUY' : ratingScore <= 3.5 ? 'HOLD' : ratingScore <= 4.5 ? 'UNDERPERFORM' : 'SELL';
            analystConsensus = { rating, ratingScore: Number(ratingScore.toFixed(2)), ratingLabelZh: ({ STRONG_BUY: '强力买入', BUY: '买入', HOLD: '持有', UNDERPERFORM: '表现不佳', SELL: '卖出' } as const)[rating], totalAnalysts, strongBuy, buy, hold, underperform, sell };
            usedFinnhub = true;
          }
        }
        const meanTarget = this.positive(targetData?.targetMean);
        const medianTarget = this.positive(targetData?.targetMedian);
        const highTarget = this.positive(targetData?.targetHigh);
        const lowTarget = this.positive(targetData?.targetLow);
        if (meanTarget !== null || medianTarget !== null || highTarget !== null || lowTarget !== null) {
          priceTarget = { current: currentPrice, meanTarget, medianTarget, highTarget, lowTarget, upsidePct: meanTarget === null ? null : Number(((meanTarget / currentPrice - 1) * 100).toFixed(2)) };
          usedFinnhub = true;
        }
      } catch (error) {
        console.warn(`[ForecastProvider] Finnhub data unavailable for ${symbol}:`, error instanceof Error ? error.message : error);
      }
    }

    const now = new Date().toISOString();
    const block: DataBlock<EarningsAndForecastData> = {
      status: 'success',
      data: { forecastMethod: usedFinnhub ? 'FINNHUB_WITH_HISTORICAL_MODEL' : 'HISTORICAL_STATISTICAL_MODEL', modelAssumptions: model.assumptions, modelScenarios: model.scenarios, nextEarningsDate: null, nextEarningsDaysRemaining: null, earningsHistory: [], analystConsensus, priceTarget },
      error: null,
      isMock: false,
      isStale: bars.at(-1)?.provenance?.classification === 'STALE_REAL',
      updatedAt: now,
      source: usedFinnhub ? 'FINNHUB_AND_LOCAL_HISTORICAL_MODEL' : 'LOCAL_HISTORICAL_STATISTICAL_MODEL',
      provenance: { source: usedFinnhub ? 'FINNHUB_AND_YAHOO_FINANCE_CHART_API' : 'YAHOO_FINANCE_CHART_API', classification: 'DERIVED_FROM_REAL', timestamp: now, dataAsOf: bars.at(-1)?.provenance?.dataAsOf, retrievedAt: now, calculationMethod: 'Drift-adjusted log-return projections with 80% normal confidence intervals; not analyst guidance.' }
    };
    this.cache.set(key, { data: block, expiresAt: Date.now() + this.TTL_MS });
    return block;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as T;
    } finally { clearTimeout(timeout); }
  }

  private count(value: unknown): number { return Number.isFinite(value) && Number(value) >= 0 ? Math.floor(Number(value)) : 0; }
  private positive(value: unknown): number | null { return Number.isFinite(value) && Number(value) > 0 ? Number(value) : null; }

  private calculateModel(currentPrice: number, bars: PriceBar[], timeframe: Timeframe) {
    const closes = bars.map(bar => bar.close).filter(value => Number.isFinite(value) && value > 0);
    if (closes.length < 31 || !Number.isFinite(currentPrice) || currentPrice <= 0) return null;
    const returns = closes.slice(1).map((close, index) => Math.log(close / closes[index])).filter(Number.isFinite);
    const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, returns.length - 1);
    const annualizedVolatility = Math.sqrt(variance * PERIODS_PER_YEAR[timeframe]);
    const annualizedDrift = mean * PERIODS_PER_YEAR[timeframe];
    if (!Number.isFinite(annualizedVolatility) || !Number.isFinite(annualizedDrift)) return null;
    const scenarios = ([{ horizon: '1M' as const, years: 1 / 12 }, { horizon: '3M' as const, years: 0.25 }]).map(({ horizon, years }) => {
      const expected = currentPrice * Math.exp(annualizedDrift * years);
      const interval = 1.28155 * annualizedVolatility * Math.sqrt(years);
      return { horizon, expectedPrice: Number(expected.toFixed(2)), lowPrice: Number((currentPrice * Math.exp(annualizedDrift * years - interval)).toFixed(2)), highPrice: Number((currentPrice * Math.exp(annualizedDrift * years + interval)).toFixed(2)), expectedChangePct: Number(((expected / currentPrice - 1) * 100).toFixed(2)) };
    });
    return { assumptions: { annualizedVolatilityPct: Number((annualizedVolatility * 100).toFixed(2)), sampleBars: closes.length, timeframe, confidenceLevelPct: 80, note: '基于历史对数收益率漂移与波动率的统计情景，不是分析师目标价、投资建议或收益保证。' }, scenarios };
  }
}

export const forecastProvider = new ForecastProvider();