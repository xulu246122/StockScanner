import {
  Timeframe,
  StrategyDefinition,
  StrategyEvaluation,
  StrategyState,
  ConditionEvaluationResult,
  PriceBar
} from '../types.ts';
import { marketDataProvider } from './marketDataProvider.ts';
import { getStockMeta } from './stockUniverse.ts';
import { newsCenterService } from './newsCenterService.ts';
import { marketRegimeService } from './marketRegimeService.ts';
import { computeLatestRSI } from './rsiEngine.ts';
import {
  calculateSMA,
  calculateEMA,
  calculateATR,
  computeRelativeVolume,
  calculateMACD,
  calculateBollingerBands,
  calculateDonchianChannels,
  calculateDarvasBox,
  calculateStochastic,
  calculateADX,
  calculateLinearRegressionSlope
} from '../quant/indicators/calculations.ts';
import { EvaluatedDataContext, ConditionEngine } from '../quant/conditions/conditionEngine.ts';

interface CacheEntry {
  data: EvaluatedDataContext;
  expiresAt: number;
}

export class IndicatorCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 60 * 1000; // 60 seconds TTL
  private readonly MAX_CACHE_ENTRIES = 500; // Cap cache size to prevent memory bloat
  private spyHistoryCache: { bars: PriceBar[]; expiresAt: number } | null = null;

  private getCacheKey(ticker: string, timeframe: Timeframe): string {
    return `${ticker.toUpperCase()}_${timeframe}`;
  }

  /**
   * Fetches SPY return benchmarks for real relative strength (Alpha) calculation
   */
  private async getSpyReturns(): Promise<{ return1d: number; return5d: number; return20d: number }> {
    try {
      const now = Date.now();
      if (!this.spyHistoryCache || this.spyHistoryCache.expiresAt < now) {
        const spyBars = await marketDataProvider.getHistoricalPrices('SPY', 180, 14, '1D', 60);
        this.spyHistoryCache = { bars: spyBars, expiresAt: now + 5 * 60 * 1000 };
      }
      const bars = this.spyHistoryCache.bars;
      const latest = bars[bars.length - 1]?.close || 1;
      const p1 = bars[bars.length - 2]?.close || latest;
      const p5 = bars.length >= 6 ? bars[bars.length - 6]?.close : latest;
      const p20 = bars.length >= 21 ? bars[bars.length - 21]?.close : latest;
      return {
        return1d: Number((((latest - p1) / p1) * 100).toFixed(2)),
        return5d: Number((((latest - p5) / p5) * 100).toFixed(2)),
        return20d: Number((((latest - p20) / p20) * 100).toFixed(2))
      };
    } catch {
      return { return1d: 0.2, return5d: 0.8, return20d: 2.1 };
    }
  }

  /**
   * Builds or retrieves the EvaluatedDataContext for a stock on a specific timeframe
   */
  public async getEvaluatedContext(ticker: string, timeframe: Timeframe = '1D'): Promise<EvaluatedDataContext> {
    const key = this.getCacheKey(ticker, timeframe);
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // 1. Fetch current quote & snapshot
    const quote = await marketDataProvider.getQuote(ticker, 14, timeframe);
    const meta = getStockMeta(ticker);
    
    // 2. Fetch historical prices (at least 260 bars on 1D for SMA200 / EMA200 calculation)
    const rangeDays = timeframe === '1D' ? 400 : 180;
    const maxBars = timeframe === '1D' ? 260 : 120;
    const bars: PriceBar[] = await marketDataProvider.getHistoricalPrices(ticker, rangeDays, 14, timeframe, maxBars);
    const closes = bars.map(b => b.close);

    // 3. Multi-period RSIs
    const rsiValues: Record<number, number> = {
      2: 50,
      6: 50,
      9: 50,
      14: quote.rsi.value,
      21: 50,
      30: 50
    };

    if (quote.allRsi) {
      rsiValues[6] = quote.allRsi.rsi6;
      rsiValues[9] = quote.allRsi.rsi9;
      rsiValues[14] = quote.allRsi.rsi14;
      rsiValues[21] = quote.allRsi.rsi21;
      rsiValues[30] = quote.allRsi.rsi30;
    }

    // Calculate RSI(2) specifically for Larry Connors strategy using standard Wilder smoothing
    if (closes.length >= 3) {
      rsiValues[2] = computeLatestRSI(closes, 2).value;
    }

    // 4. Moving Averages
    const smaValues: Record<number, number> = {};
    const emaValues: Record<number, number> = {};

    [5, 10, 20, 50, 100, 150, 200].forEach(p => {
      const series = calculateSMA(closes, p);
      const val = series[series.length - 1];
      if (val !== null && val !== undefined) smaValues[p] = val;
    });

    [7, 9, 13, 20, 21, 50, 200].forEach(p => {
      const series = calculateEMA(closes, p);
      const val = series[series.length - 1];
      if (val !== null && val !== undefined) emaValues[p] = val;
    });

    // 5. Quant Indicators
    const rvolData = computeRelativeVolume(bars, 20);
    const avgVol = rvolData.avgVolume > 0 ? rvolData.avgVolume : quote.volume;
    const avgDollarVolume = Math.round(avgVol * quote.price);

    const atrSeries = calculateATR(bars, 14);
    const validAtr = atrSeries.filter((v): v is number => v !== null);
    const latestAtr = validAtr.length > 0 ? validAtr[validAtr.length - 1] : quote.price * 0.02;
    const priorAtr = validAtr.length > 1 ? validAtr[validAtr.length - 2] : latestAtr;
    const atrPercent = Number(((latestAtr / Math.max(1, quote.price)) * 100).toFixed(2));
    const latestBar = bars[bars.length - 1];
    const previousBar = bars.length > 1 ? bars[bars.length - 2] : undefined;
    const latestTrueRange = latestBar
      ? Math.max(
          latestBar.high - latestBar.low,
          previousBar ? Math.abs(latestBar.high - previousBar.close) : 0,
          previousBar ? Math.abs(latestBar.low - previousBar.close) : 0
        )
      : 0;
    const rangeAtrMultiple = priorAtr > 0 ? latestTrueRange / priorAtr : 0;
    const closeLocationPercent = latestBar && latestBar.high > latestBar.low
      ? ((latestBar.close - latestBar.low) / (latestBar.high - latestBar.low)) * 100
      : 0;

    const macdData = calculateMACD(closes);
    const stochData = calculateStochastic(bars);
    const bbData = calculateBollingerBands(closes);
    const donchianData = calculateDonchianChannels(bars, 20);
    const darvasData = calculateDarvasBox(bars, 30);
    const adxData = calculateADX(bars, 14);

    // Multi-period price changes
    const change5d = bars.length >= 6 ? Number((((quote.price - bars[bars.length - 6].close) / bars[bars.length - 6].close) * 100).toFixed(2)) : quote.changePercent;
    const change20d = bars.length >= 21 ? Number((((quote.price - bars[bars.length - 21].close) / bars[bars.length - 21].close) * 100).toFixed(2)) : Number((quote.changePercent * 3).toFixed(2));
    const change60d = bars.length >= 61 ? Number((((quote.price - bars[bars.length - 61].close) / bars[bars.length - 61].close) * 100).toFixed(2)) : Number((quote.changePercent * 5).toFixed(2));

    // Real Relative Strength vs SPY Benchmark (Alpha)
    const spyReturns = await this.getSpyReturns();
    const rsVsSpy = Number((change20d - spyReturns.return20d).toFixed(2));
    const rsRank = Math.max(1, Math.min(99, Math.round(50 + rsVsSpy * 2.5)));

    // Proximity to 52-week High/Low
    const high52 = quote.high52w ?? 0;
    const low52 = quote.low52w ?? 0;
    const distFrom52wHigh = high52 > 0 ? Number((((quote.price - high52) / high52) * 100).toFixed(2)) : 0;
    const distFrom52wLow = low52 > 0 ? Number((((quote.price - low52) / low52) * 100).toFixed(2)) : 0;

    // Distance from EMA20 in ATR units
    const ema20 = emaValues[20] || smaValues[20] || quote.price;
    const distEma20Atr = latestAtr > 0 ? Number(((quote.price - ema20) / latestAtr).toFixed(2)) : 0;

    // Strict 5.0% Stop Loss Hard Limit Protection
    const maxStopDistance = quote.price * 0.05;
    const rawStopDist = Math.min(1.5 * latestAtr, maxStopDistance);
    const stopLossPrice = Number((quote.price - rawStopDist).toFixed(2));
    const stopDistancePct = Number((((quote.price - stopLossPrice) / quote.price) * 100).toFixed(2));
    const targetPrice = Number((quote.price + 2 * (quote.price - stopLossPrice)).toFixed(2));
    const riskRewardRatio = stopDistancePct > 0 ? Number(((targetPrice - quote.price) / (quote.price - stopLossPrice)).toFixed(2)) : 2.0;

    // Earnings date retrieval from corporate calendar
    let daysToEarnings: number | null = null;
    let catalystActive = false;
    try {
      const events = newsCenterService.getEvents(ticker);
      const upcomingEarnings = events.find(e => e.eventType === 'Earnings' && new Date(e.date).getTime() >= Date.now() - 86400000);
      if (upcomingEarnings) {
        const diffMs = new Date(upcomingEarnings.date).getTime() - Date.now();
        daysToEarnings = Math.max(0, Math.ceil(diffMs / 86400000));
      }
      catalystActive = events.some(e => e.impactLevel === 'HIGH');
    } catch {
      // fallback
    }

    // Market and Sector Regime
    let marketRegime: 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF' = 'RISK_ON';
    let sectorRegime = 'NEUTRAL';
    try {
      const overview = await marketRegimeService.getMarketOverview();
      marketRegime = overview.regime === 'RISK_OFF' ? 'RISK_OFF' : overview.regime === 'RISK_ON' ? 'RISK_ON' : 'NEUTRAL';
      const secPerf = overview.sectors.find(s => s.sector.toLowerCase() === (meta?.sector || '').toLowerCase());
      if (secPerf) {
        sectorRegime = secPerf.trend;
      }
    } catch {
      // fallback
    }

    // Approximate P/E ratio based on market cap tiers
    const peRatio = quote.marketCap > 100_000_000_000 ? 28 : quote.marketCap > 10_000_000_000 ? 22 : 18;

    const data: EvaluatedDataContext = {
      ticker: ticker.toUpperCase(),
      price: quote.price,
      changePercent: quote.changePercent,
      marketCap: quote.marketCap,
      volume: quote.volume,
      rvol: rvolData.relativeVolume,
      avgVolume: avgVol,
      avgDollarVolume,
      high52w: quote.high52w,
      low52w: quote.low52w,
      distFrom52wHigh,
      distFrom52wLow,
      atr: latestAtr,
      atrPercent,
      rangeAtrMultiple,
      closeLocationPercent,
      distEma20Atr,
      peRatio,
      rsiValues,
      previousRsiValues: {
        14: quote.rsi.previousValue || quote.rsi.value
      },
      smaValues,
      emaValues,
      macd: macdData.latest,
      stochastic: stochData,
      bollinger: bbData.latest,
      donchian: donchianData,
      darvas: darvasData,
      adx: adxData,
      relativeStrengthVsSpy: rsVsSpy,
      rsRank,
      marketRegime,
      sectorRegime,
      sector: meta?.sector || 'General',
      industry: meta?.industry || 'Public Company',
      exchange: meta?.exchange || 'NASDAQ',
      securityType: 'Common Stock',
      daysToEarnings,
      change5d,
      change20d,
      change60d,
      riskRewardRatio,
      stopDistancePct,
      catalystActive
    };

    // Prevent unbounded memory growth by pruning expired/oldest entries
    if (this.cache.size >= this.MAX_CACHE_ENTRIES) {
      this.pruneCache();
    }

    this.cache.set(key, { data, expiresAt: now + this.TTL_MS });
    return data;
  }

  /**
   * Evaluates a Strategy against a stock and derives full execution status
   */
  public async evaluateStrategyForStock(
    ticker: string,
    strategy: StrategyDefinition,
    timeframe: Timeframe = '1D'
  ): Promise<StrategyEvaluation> {
    const ctx = await this.getEvaluatedContext(ticker, timeframe);
    const resultsCollector: ConditionEvaluationResult[] = [];

    const groupResult = ConditionEngine.evaluateGroup(strategy.rules, ctx, resultsCollector);
    const passedConditionsCount = resultsCollector.filter(r => r.passed).length;
    const totalConditionsCount = resultsCollector.length;

    // Calculate confluence score (0 to 100)
    let score = totalConditionsCount > 0 ? Math.round((passedConditionsCount / totalConditionsCount) * 100) : 50;

    // Bonus confluence for volume and clean trend alignment
    if (ctx.rvol >= 1.2) score = Math.min(100, score + 5);
    if (ctx.rsiValues[14] > 50 && ctx.rsiValues[14] < 68) score = Math.min(100, score + 5);

    // Derive Strategy State
    let state: StrategyState = 'WATCHING';
    let stateLabel = '正在观察 (Watching)';

    if (groupResult.passed) {
      state = 'TRIGGERED';
      stateLabel = '已触发买入 (Triggered)';
    } else if (score >= 75) {
      state = 'NEAR_TRIGGER';
      stateLabel = '临界触发 (Near Trigger)';
    } else if (score >= 50) {
      state = 'SETUP';
      stateLabel = '形态构筑中 (Setup)';
    } else {
      state = 'WATCHING';
      stateLabel = '观察蓄势 (Watching)';
    }

    // Specific trigger levels for breakout strategies
    let triggerPrice: number | undefined;
    let stopLossPrice: number | undefined;
    let distanceToTriggerPercent: number | undefined;

    if (strategy.id === 'darvas_box' && ctx.darvas) {
      triggerPrice = ctx.darvas.boxHigh;
      stopLossPrice = ctx.darvas.boxLow;
      distanceToTriggerPercent = ctx.darvas.distanceToBreakoutPct;
    } else if (strategy.id === 'donchian_breakout' && ctx.donchian) {
      triggerPrice = ctx.donchian.upper;
      stopLossPrice = ctx.donchian.lower;
      distanceToTriggerPercent = ctx.donchian.distanceToHighPct;
    } else if (strategy.id === 'connors_rsi2') {
      triggerPrice = ctx.smaValues[200] || ctx.price;
      stopLossPrice = ctx.price * 0.94;
    }

    return {
      ticker: ticker.toUpperCase(),
      strategyId: strategy.id,
      strategyName: strategy.name,
      state,
      stateLabel,
      confluenceScore: score,
      passedConditionsCount,
      totalConditionsCount,
      distanceToTriggerPercent,
      triggerPrice,
      stopLossPrice,
      boxHigh: ctx.darvas?.boxHigh,
      boxLow: ctx.darvas?.boxLow,
      evaluatedAt: new Date().toISOString(),
      details: resultsCollector
    };
  }

  /**
   * Prunes expired entries, and if still exceeding capacity, purges oldest entries (FIFO/LRU)
   */
  public pruneCache(): void {
    const now = Date.now();
    // 1. Remove expired entries
    for (const [k, v] of this.cache.entries()) {
      if (v.expiresAt <= now) {
        this.cache.delete(k);
      }
    }
    // 2. If still exceeding limit, evict oldest 20% entries
    if (this.cache.size >= this.MAX_CACHE_ENTRIES) {
      const toRemove = Math.ceil(this.MAX_CACHE_ENTRIES * 0.2);
      let removed = 0;
      for (const k of this.cache.keys()) {
        this.cache.delete(k);
        removed++;
        if (removed >= toRemove) break;
      }
    }
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

export const indicatorCacheService = new IndicatorCacheService();
