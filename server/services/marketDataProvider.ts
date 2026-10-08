import { StockMeta, StockQuoteSnapshot, PriceBar, MarketStatus, Timeframe } from '../types.ts';
import { calculateWilderRSI, computeLatestRSI } from './rsiEngine.ts';
import { STOCK_UNIVERSE, getStockMeta } from './stockUniverse.ts';
import { sessionClock } from './sessionClock.ts';
import { computeLatestATR, computeRelativeVolume } from '../quant/indicators.ts';
import { DataUnavailableError } from './dataUnavailableError.ts';
import { apiConfigService } from './apiConfigService.ts';

const TICKER_ALIASES: Record<string, string> = {
  'BZX': 'CBOE',
  'BRK.B': 'BRK-B',
  'BF.B': 'BF-B',
  'ANSS': 'SNPS',
};

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  retrievedAt: number;
}

export class MarketDataProvider {
  private quoteCache: Map<string, CacheEntry<StockQuoteSnapshot>> = new Map();
  private historyCache: Map<string, CacheEntry<PriceBar[]>> = new Map();
  
  // Cache TTLs: Intraday 20s, Daily/Weekly 60s
  private readonly QUOTE_TTL_MS = 20 * 1000;
  private readonly HISTORY_INTRADAY_TTL_MS = 30 * 1000;
  private readonly HISTORY_DAILY_TTL_MS = 120 * 1000;

  /**
   * Clears internal quote and history caches
   */
  public clearCache(): void {
    this.quoteCache.clear();
    this.historyCache.clear();
  }

  /**
   * Evaluates current New York Market Session via unified sessionClock
   */
  public getMarketStatus(): MarketStatus {
    return sessionClock.getMarketStatus();
  }

  /**
   * Fetches real live historical OHLCV prices from financial markets API
   */
  public async getHistoricalPrices(
    ticker: string,
    rangeDays: number = 180,
    rsiPeriod: number = 14,
    timeframe: Timeframe = '1D',
    maxBars: number = 120
  ): Promise<PriceBar[]> {
    const normTicker = ticker.toUpperCase().trim();
    const session = sessionClock.getMarketStatus().session;
    const barLimit = Math.max(1, Math.floor(maxBars));
    // Keep requests with different history depth isolated in cache.
    const cacheKey = `${normTicker}:${timeframe}:${session}:${rangeDays}:${barLimit}`;
    const cached = this.historyCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return this.enrichBarsWithRSI(this.attachProvenance(cached.data, 'REAL', cached.retrievedAt, normTicker), rsiPeriod);
    }

    let bars: PriceBar[] = [];
    const feedMode = process.env.DATA_FEED_MODE || 'hybrid';

    if (feedMode === 'offline') {
      if (cached) {
        const classification = cached.expiresAt > Date.now() ? 'REAL' : 'STALE_REAL';
        return this.enrichBarsWithRSI(this.attachProvenance(cached.data, classification, cached.retrievedAt, normTicker), rsiPeriod);
      }
      throw new DataUnavailableError(`Offline mode and no cache available for ${normTicker}`);
    } else {
      try {
        bars = await this.fetchRealMarketBars(normTicker, timeframe, rangeDays, barLimit);
      } catch (e: any) {
        // If previous cache exists even if expired, use it as fallback
        if (cached) {
          return this.enrichBarsWithRSI(this.attachProvenance(cached.data, 'STALE_REAL', cached.retrievedAt, normTicker), rsiPeriod);
        }
        throw new DataUnavailableError(`Failed to fetch market data: ${e.message}`);
      }
    }

    if (bars.length === 0) {
      throw new DataUnavailableError(`No verified historical bars available for ${normTicker}`);
    }

    const isIntraday = timeframe.includes('m') || timeframe.includes('h');
    const ttl = isIntraday ? this.HISTORY_INTRADAY_TTL_MS : this.HISTORY_DAILY_TTL_MS;

    const retrievedAt = Date.now();
    this.historyCache.set(cacheKey, {
      data: bars,
      expiresAt: retrievedAt + ttl,
      retrievedAt
    });

    return this.enrichBarsWithRSI(this.attachProvenance(bars, 'REAL', retrievedAt, normTicker), rsiPeriod);
  }

  private attachProvenance(
    bars: PriceBar[],
    classification: 'REAL' | 'STALE_REAL',
    retrievedAt: number,
    symbol: string,
    fallbackSource: string = 'YAHOO_FINANCE_CHART_API'
  ): PriceBar[] {
    const retrievedAtIso = new Date(retrievedAt).toISOString();
    const now = Date.now();
    return bars.map(bar => {
      const dataAsOf = new Date(bar.timestamp).toISOString();
      return {
        ...bar,
        provenance: {
          source: bar.provenance?.source || fallbackSource,
          classification,
          timestamp: retrievedAtIso,
          dataAsOf,
          retrievedAt: retrievedAtIso,
          age: Math.max(0, Math.floor((now - bar.timestamp) / 1000)),
          symbol
        }
      };
    });
  }

  /**
   * Resolves provider execution order based on user settings and failover toggle
   */
  private getProviderOrder(): ('MASSIVE' | 'FINNHUB' | 'YAHOO_FALLBACK' | 'ALPHAVANTAGE')[] {
    const config = apiConfigService.getConfig();
    const primary = config.primaryProvider;
    const failover = config.enableFailover;

    let baseOrder: ('MASSIVE' | 'FINNHUB' | 'YAHOO_FALLBACK' | 'ALPHAVANTAGE')[];

    switch (primary) {
      case 'FINNHUB':
        baseOrder = ['FINNHUB', 'MASSIVE', 'YAHOO_FALLBACK', 'ALPHAVANTAGE'];
        break;
      case 'MASSIVE':
        baseOrder = ['MASSIVE', 'FINNHUB', 'YAHOO_FALLBACK', 'ALPHAVANTAGE'];
        break;
      case 'ALPHAVANTAGE':
        baseOrder = ['ALPHAVANTAGE', 'MASSIVE', 'FINNHUB', 'YAHOO_FALLBACK'];
        break;
      case 'YAHOO_FALLBACK':
        baseOrder = ['YAHOO_FALLBACK', 'MASSIVE', 'FINNHUB', 'ALPHAVANTAGE'];
        break;
      case 'AUTO':
      default:
        baseOrder = ['YAHOO_FALLBACK', 'FINNHUB', 'MASSIVE', 'ALPHAVANTAGE'];
        break;
    }

    if (!failover) {
      return [baseOrder[0]];
    }

    return baseOrder;
  }

  /**
   * Fetches market bars with multi-feed automatic failover
   */
  private async fetchRealMarketBars(
    ticker: string,
    timeframe: Timeframe,
    rangeDays: number,
    maxBars: number
  ): Promise<PriceBar[]> {
    const providers = this.getProviderOrder();
    const config = apiConfigService.getConfig();
    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        let bars: PriceBar[] = [];
        if (provider === 'MASSIVE' && config.massiveApiKey) {
          bars = await this.fetchPolygonBars(ticker, timeframe, rangeDays, maxBars, config.massiveApiKey);
        } else if (provider === 'FINNHUB' && config.finnhubApiKey) {
          bars = await this.fetchFinnhubBars(ticker, timeframe, rangeDays, maxBars, config.finnhubApiKey);
        } else if (provider === 'ALPHAVANTAGE' && config.alphaVantageApiKey) {
          bars = await this.fetchAlphaVantageBars(ticker, timeframe, rangeDays, maxBars, config.alphaVantageApiKey);
        } else if (provider === 'YAHOO_FALLBACK') {
          bars = await this.fetchYahooBars(ticker, timeframe, rangeDays, maxBars);
        }

        if (bars && bars.length >= 5) {
          // Freshness validation: reject feeds that return historical or stale bars
          const latestBar = bars[bars.length - 1];
          const isSubDaily = timeframe.includes('m') || timeframe.includes('h');
          const maxAgeMs = isSubDaily ? 5 * 86400000 : 7 * 86400000;
          const barAgeMs = Date.now() - latestBar.timestamp;
          if (barAgeMs > maxAgeMs) {
            console.warn(`[MarketDataProvider] Stale data from ${provider} for ${ticker}: latest bar is from ${latestBar.date} (${(barAgeMs / 86400000).toFixed(1)} days old). Cascading to next provider.`);
            throw new Error(`Data feed from ${provider} is stale: latest bar is from ${latestBar.date}`);
          }
          return bars;
        }
      } catch (err: any) {
        lastError = err;
        // In failover mode, gracefully log and cascade to next provider
      }
    }

    throw lastError || new DataUnavailableError(`No verified historical bars available for ${ticker} across all channels`);
  }

  /**
   * Fetch bars via Massive (Polygon.io Aggregates API)
   */
  private async fetchPolygonBars(
    ticker: string,
    timeframe: Timeframe,
    rangeDays: number,
    maxBars: number,
    apiKey: string
  ): Promise<PriceBar[]> {
    let multiplier = 1;
    let timespan = 'day';

    switch (timeframe) {
      case '10m': multiplier = 5; timespan = 'minute'; break;
      case '30m': multiplier = 30; timespan = 'minute'; break;
      case '1h':
      case '2h':
      case '4h': multiplier = 1; timespan = 'hour'; break;
      case '1D': multiplier = 1; timespan = 'day'; break;
      case '1W': multiplier = 1; timespan = 'week'; break;
      case '1M': multiplier = 1; timespan = 'month'; break;
    }

    const cleanTicker = (TICKER_ALIASES[ticker.toUpperCase().trim()] || ticker.toUpperCase().trim()).replace('-', '.');
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - rangeDays * 86400000).toISOString().split('T')[0];
    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(cleanTicker)}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=5000&apiKey=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`Polygon API HTTP ${res.status}`);
    }

    const json = await res.json();
    if (!json || !Array.isArray(json.results) || json.results.length < 5) {
      throw new Error('Polygon API returned empty or insufficient bars');
    }

    const lastBarItem = json.results[json.results.length - 1];
    const isSubDaily = timeframe.includes('m') || timeframe.includes('h');
    const maxAgeMs = isSubDaily ? 5 * 86400000 : 7 * 86400000;
    if (Date.now() - lastBarItem.t > maxAgeMs) {
      throw new Error(`Polygon API returned outdated historical bars (latest bar from ${new Date(lastBarItem.t).toISOString().split('T')[0]}). Free tier limitation.`);
    }
    const rawBars: PriceBar[] = json.results.map((r: any) => {
      const tsMs = r.t;
      const d = new Date(tsMs);
      const dateStr = isSubDaily
        ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      return {
        date: dateStr,
        timestamp: tsMs,
        open: Number(r.o.toFixed(2)),
        high: Number(r.h.toFixed(2)),
        low: Number(r.l.toFixed(2)),
        close: Number(r.c.toFixed(2)),
        volume: r.v || 0,
        provenance: {
          source: 'MASSIVE_POLYGON_API',
          classification: 'REAL' as const,
          timestamp: new Date().toISOString(),
          dataAsOf: new Date(tsMs).toISOString(),
          retrievedAt: new Date().toISOString(),
          age: Math.max(0, Math.floor((Date.now() - tsMs) / 1000)),
          symbol: cleanTicker
        }
      };
    });

    if (timeframe === '2h') {
      return this.aggregateBars(rawBars, 2, maxBars);
    }
    if (timeframe === '4h') {
      return this.aggregateBars(rawBars, 4, maxBars);
    }

    return rawBars.slice(-maxBars);
  }

  /**
   * Fetch bars via Finnhub Stock Candle API
   */
  private async fetchFinnhubBars(
    ticker: string,
    timeframe: Timeframe,
    rangeDays: number,
    maxBars: number,
    apiKey: string
  ): Promise<PriceBar[]> {
    let resolution = 'D';
    switch (timeframe) {
      case '10m': resolution = '5'; break;
      case '30m': resolution = '30'; break;
      case '1h':
      case '2h':
      case '4h': resolution = '60'; break;
      case '1D': resolution = 'D'; break;
      case '1W': resolution = 'W'; break;
      case '1M': resolution = 'M'; break;
    }

    const cleanTicker = (TICKER_ALIASES[ticker.toUpperCase().trim()] || ticker.toUpperCase().trim()).replace('-', '.');
    const toSec = Math.floor(Date.now() / 1000);
    const fromSec = Math.floor((Date.now() - rangeDays * 86400000) / 1000);
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(cleanTicker)}&resolution=${resolution}&from=${fromSec}&to=${toSec}&token=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`Finnhub Candle API HTTP ${res.status}`);
    }

    const json = await res.json();
    if (!json || json.s !== 'ok' || !Array.isArray(json.c) || json.c.length < 5) {
      throw new Error('Finnhub API returned no candle data');
    }

    const isSubDaily = timeframe.includes('m') || timeframe.includes('h');
    const rawBars: PriceBar[] = [];
    const len = json.c.length;

    for (let i = 0; i < len; i++) {
      const tsMs = json.t[i] * 1000;
      const d = new Date(tsMs);
      const dateStr = isSubDaily
        ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      rawBars.push({
        date: dateStr,
        timestamp: tsMs,
        open: Number(json.o[i].toFixed(2)),
        high: Number(json.h[i].toFixed(2)),
        low: Number(json.l[i].toFixed(2)),
        close: Number(json.c[i].toFixed(2)),
        volume: json.v[i] || 0,
        provenance: {
          source: 'FINNHUB_API',
          classification: 'REAL' as const,
          timestamp: new Date().toISOString(),
          dataAsOf: new Date(tsMs).toISOString(),
          retrievedAt: new Date().toISOString(),
          age: Math.max(0, Math.floor((Date.now() - tsMs) / 1000)),
          symbol: cleanTicker
        }
      });
    }

    if (timeframe === '2h') {
      return this.aggregateBars(rawBars, 2, maxBars);
    }
    if (timeframe === '4h') {
      return this.aggregateBars(rawBars, 4, maxBars);
    }

    return rawBars.slice(-maxBars);
  }

  /**
   * Fetch bars via Alpha Vantage Daily Series API
   */
  private async fetchAlphaVantageBars(
    ticker: string,
    timeframe: Timeframe,
    _rangeDays: number,
    maxBars: number,
    apiKey: string
  ): Promise<PriceBar[]> {
    const cleanTicker = (TICKER_ALIASES[ticker.toUpperCase().trim()] || ticker.toUpperCase().trim()).replace('-', '.');
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(cleanTicker)}&outputsize=compact&apikey=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`Alpha Vantage API HTTP ${res.status}`);
    }

    const json = await res.json();
    const series = json?.['Time Series (Daily)'];
    if (!series || typeof series !== 'object') {
      throw new Error('Alpha Vantage returned no daily series or rate limit reached');
    }

    const dates = Object.keys(series).sort();
    if (dates.length < 5) {
      throw new Error('Alpha Vantage returned insufficient bars');
    }

    const rawBars: PriceBar[] = dates.map(dStr => {
      const item = series[dStr];
      const tsMs = new Date(dStr).getTime();
      return {
        date: dStr,
        timestamp: tsMs,
        open: parseFloat(item['1. open']) || 0,
        high: parseFloat(item['2. high']) || 0,
        low: parseFloat(item['3. low']) || 0,
        close: parseFloat(item['4. close']) || 0,
        volume: parseInt(item['5. volume'], 10) || 0,
        provenance: {
          source: 'ALPHAVANTAGE_API',
          classification: 'REAL' as const,
          timestamp: new Date().toISOString(),
          dataAsOf: new Date(tsMs).toISOString(),
          retrievedAt: new Date().toISOString(),
          age: Math.max(0, Math.floor((Date.now() - tsMs) / 1000)),
          symbol: cleanTicker
        }
      };
    });

    return rawBars.slice(-maxBars);
  }

  /**
   * Fetch real live market candle bars from Yahoo Finance v8 chart API
   */
  private async fetchYahooBars(
    ticker: string,
    timeframe: Timeframe,
    rangeDays: number,
    maxBars: number
  ): Promise<PriceBar[]> {
    let interval = '1d';
    let range = '6mo';

    switch (timeframe) {
      case '10m':
        interval = '5m';
        range = '5d';
        break;
      case '30m':
        interval = '30m';
        range = '1mo';
        break;
      case '1h':
      case '2h':
      case '4h':
        interval = '60m';
        range = timeframe === '1h' ? '1mo' : timeframe === '2h' ? '3mo' : '6mo';
        break;
      case '1D':
        interval = '1d';
        range = rangeDays > 365 ? '5y' : '1y';
        break;
      case '1W':
        interval = '1wk';
        range = rangeDays > 730 ? '5y' : '2y';
        break;
      case '1M':
        interval = '1mo';
        range = '5y';
        break;
    }

    const mapped = TICKER_ALIASES[ticker.toUpperCase().trim()] || ticker.toUpperCase().trim();
    const yahooTicker = mapped.replace('.', '-');
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?range=${range}&interval=${interval}&includePrePost=false`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        }
      });
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }

    clearTimeout(timeout);

    if (!res.ok) {
      throw new DataUnavailableError(`Yahoo Finance API returned HTTP ${res.status}`);
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      throw new DataUnavailableError('Empty or invalid chart payload from Yahoo Finance');
    }

    const timestamps: number[] = result.timestamp;
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const closes: (number | null)[] = quote.close || [];
    const volumes: (number | null)[] = quote.volume || [];

    const rawBars: PriceBar[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      if (!timestamp || timestamp <= 0) continue;

      let open = opens[i];
      let high = highs[i];
      let low = lows[i];
      let close = closes[i];
      let volume = volumes[i];

      // Skip non-trading hollows where all OHLC are null
      if (open == null && high == null && low == null && close == null) {
        continue;
      }

      // Handle unfinalized live / post-market bar where close is null
      if (close == null) {
        if (i === timestamps.length - 1 && meta?.regularMarketPrice && meta.regularMarketPrice > 0) {
          close = meta.regularMarketPrice;
        } else if (open != null) {
          close = open;
        } else if (high != null) {
          close = high;
        }
      }

      if (open == null) open = close ?? high ?? low ?? 100;
      if (close == null) close = open;
      if (high == null) high = Math.max(open, close);
      if (low == null) low = Math.min(open, close);

      high = Math.max(high, open, close);
      low = Math.min(low, open, close);

      if (volume == null || volume < 0) volume = 0;

      if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
        continue;
      }

      const tsMs = timestamp * 1000;
      const d = new Date(tsMs);
      const isSubDaily = timeframe.includes('m') || timeframe.includes('h');

      const dateStr = isSubDaily
        ? `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      rawBars.push({
        date: dateStr,
        timestamp: tsMs,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume,
        provenance: {
          source: 'YAHOO_FINANCE_CHART_API',
          classification: 'REAL',
          timestamp: new Date().toISOString(),
          dataAsOf: new Date(tsMs).toISOString(),
          retrievedAt: new Date().toISOString(),
          age: Math.max(0, Math.floor((Date.now() - tsMs) / 1000)),
          symbol: ticker.toUpperCase().trim()
        }
      });
    }

    if (rawBars.length < 5) {
      throw new DataUnavailableError('Insufficient valid price bars extracted from real market feed');
    }

    // Aggregate 60m bars for 2h or 4h if requested
    if (timeframe === '2h') {
      return this.aggregateBars(rawBars, 2, maxBars);
    }
    if (timeframe === '4h') {
      return this.aggregateBars(rawBars, 4, maxBars);
    }

    return rawBars.slice(-maxBars);
  }

  /**
   * Fast real-time quote snapshot fetch via Finnhub
   */
  public async fetchFinnhubQuote(ticker: string, apiKey: string): Promise<{ c: number; d: number; dp: number } | null> {
    const cleanTicker = (TICKER_ALIASES[ticker.toUpperCase().trim()] || ticker.toUpperCase().trim()).replace('-', '.');
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(cleanTicker)}&token=${encodeURIComponent(apiKey)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && typeof data.c === 'number' && data.c > 0) {
        return { c: data.c, d: data.d || 0, dp: data.dp || 0 };
      }
      return null;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  /**
   * Aggregates N consecutive 1h bars into a single multi-hour bar
   */
  private aggregateBars(bars: PriceBar[], groupSize: number, maxBars: number): PriceBar[] {
    const aggregated: PriceBar[] = [];
    for (let i = 0; i < bars.length; i += groupSize) {
      const chunk = bars.slice(i, i + groupSize);
      if (chunk.length === 0) continue;
      const first = chunk[0];
      const last = chunk[chunk.length - 1];
      const high = Math.max(...chunk.map(b => b.high));
      const low = Math.min(...chunk.map(b => b.low));
      const volume = chunk.reduce((acc, b) => acc + b.volume, 0);

      aggregated.push({
        date: first.date,
        timestamp: first.timestamp,
        open: first.open,
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: last.close,
        volume
      });
    }
    return aggregated.slice(-maxBars);
  }

  /**
   * Enriches price bars with Wilder RSI calculations
   */
  private enrichBarsWithRSI(bars: PriceBar[], period: number): PriceBar[] {
    const closes = bars.map(b => b.close);
    const rsiValues = calculateWilderRSI(closes, period);

    return bars.map((bar, i) => ({
      ...bar,
      rsi: rsiValues[i] !== null ? rsiValues[i]! : undefined
    }));
  }

  /**
   * Fetches single stock quote snapshot with Wilder RSI calculated from real market data
   */
  public async getQuote(
    ticker: string,
    rsiPeriod: number = 14,
    timeframe: Timeframe = '1D'
  ): Promise<StockQuoteSnapshot> {
    const normTicker = ticker.toUpperCase().trim();
    const session = sessionClock.getMarketStatus().session;
    const cacheKey = `${normTicker}:${rsiPeriod}:${timeframe}:${session}`;
    const cached = this.quoteCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const meta = getStockMeta(normTicker);
    if (!meta) {
      throw new DataUnavailableError(`Verified instrument metadata unavailable for ${normTicker}`);
    }

    const history = await this.getHistoricalPrices(normTicker, 180, rsiPeriod, timeframe);
    const closes = history.map(b => b.close);

    const latestBar = history[history.length - 1];
    if (!latestBar) {
      throw new DataUnavailableError(`Verified historical bars unavailable for ${normTicker}`);
    }
    const prevBar = history.length > 1 ? history[history.length - 2] : latestBar;

    let currentPrice = Number(latestBar.close.toFixed(2));
    let priceChange = Number((currentPrice - prevBar.close).toFixed(2));
    let changePercent = Number(((priceChange / prevBar.close) * 100).toFixed(2));

    let activeDataSource = latestBar.provenance?.source === 'MASSIVE_POLYGON_API'
      ? 'Massive (Polygon) Market Feed'
      : latestBar.provenance?.source === 'FINNHUB_API'
        ? 'Finnhub Market Data Feed'
        : latestBar.provenance?.source === 'ALPHAVANTAGE_API'
          ? 'Alpha Vantage Market Feed'
          : 'Yahoo Finance Historical Chart API';

    // If Finnhub key is configured, attempt ultra-fast real-time price snapshot
    const apiConfig = apiConfigService.getConfig();
    if (apiConfig.finnhubApiKey && (apiConfig.primaryProvider === 'FINNHUB' || apiConfig.primaryProvider === 'AUTO')) {
      try {
        const live = await this.fetchFinnhubQuote(normTicker, apiConfig.finnhubApiKey);
        if (live && live.c > 0) {
          currentPrice = Number(live.c.toFixed(2));
          priceChange = Number(live.d.toFixed(2));
          changePercent = Number(live.dp.toFixed(2));
          activeDataSource = 'Finnhub Real-time Market Quote';
        }
      } catch {
        // Fall back gracefully to bar-derived quote
      }
    }

    const rsiInfo = computeLatestRSI(closes, rsiPeriod);
    rsiInfo.timeframe = timeframe;

    // Strict Validation Step: Verify that the quote snapshot RSI matches the chart component's latest bar RSI
    const lastBarRsi = history[history.length - 1]?.rsi;
    if (lastBarRsi !== undefined && Math.abs(lastBarRsi - rsiInfo.value) > 0.001) {
      console.warn(`[Parity Verification] Synced quote RSI (${rsiInfo.value}) to chart bar RSI (${lastBarRsi})`);
      rsiInfo.value = lastBarRsi;
    }

    // Also compute RSIs for all standard periods: 6, 9, 14, 21, 30
    const rsi6 = computeLatestRSI(closes, 6).value;
    const rsi9 = computeLatestRSI(closes, 9).value;
    const rsi14 = computeLatestRSI(closes, 14).value;
    const rsi21 = computeLatestRSI(closes, 21).value;
    const rsi30 = computeLatestRSI(closes, 30).value;

    const { atr, atrPercent } = computeLatestATR(history, 14);
    const { avgVolume, relativeVolume } = computeRelativeVolume(history, 20);
    const dataQuality = sessionClock.createDataQualityTag();

    const now = new Date();
    const marketStatus = this.getMarketStatus();

    const snapshot: StockQuoteSnapshot = {
      ticker: meta.ticker,
      name: meta.name,
      exchange: meta.exchange,
      sector: meta.sector,
      industry: meta.industry,
      price: currentPrice,
      change: priceChange,
      changePercent,
      marketCap: meta.marketCap,
      volume: latestBar.volume,
      avgVolume,
      relativeVolume,
      atr14: atr,
      atrPercent,
      timeframe: timeframe,
      high52w: Math.max(...history.map(b => b.high || b.close)),
      low52w: Math.min(...history.map(b => b.low || b.close)),
      rsi: rsiInfo,
      allRsi: {
        rsi6,
        rsi9,
        rsi14,
        rsi21,
        rsi30
      },
      marketTime: marketStatus.nyTime,
      isDelayed: activeDataSource.includes('Historical'),
      dataSource: activeDataSource,
      dataQuality,
      updatedAt: now.toISOString(),
      provenance: latestBar.provenance
    };

    this.quoteCache.set(cacheKey, {
      data: snapshot,
      expiresAt: Date.now() + this.QUOTE_TTL_MS,
      retrievedAt: Date.now()
    });

    return snapshot;
  }

  /**
   * Batch fetches quotes for multiple tickers
   */
  public async batchGetQuotes(tickers: string[], rsiPeriod: number = 14): Promise<StockQuoteSnapshot[]> {
    const results: StockQuoteSnapshot[] = [];
    for (const t of tickers) {
      try {
        const q = await this.getQuote(t, rsiPeriod);
        results.push(q);
      } catch (err) {
        console.error(`Failed to fetch quote for ${t}:`, err);
      }
    }
    return results;
  }

}

export const marketDataProvider = new MarketDataProvider();
