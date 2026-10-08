import {
  StockDetailViewModel,
  Timeframe,
  DataBlock,
  CompanyProfileData,
  LiveQuoteData,
  MarketStatusData,
  PriceBar,
  TechnicalSummaryData,
  FundamentalData,
  EarningsAndForecastData,
  StockNewsAndEventsData,
  OptionsFlowData,
  QuantIntelligenceData
} from '../../types.ts';
import { marketDataProvider } from '../marketDataProvider.ts';
import { sessionClock } from '../sessionClock.ts';
import { MINIMUM_TECHNICAL_HISTORY_BARS, TechnicalSummaryProvider } from './technicalSummaryProvider.ts';
import { fundamentalProvider } from './fundamentalProvider.ts';
import { forecastProvider } from './forecastProvider.ts';
import { newsProvider } from './newsProvider.ts';
import { optionsProvider } from './optionsProvider.ts';
import { quantProvider } from './quantProvider.ts';
import { alertEngine } from '../alertEngine.ts';

export class StockDetailService {
  private cache = new Map<string, { data: StockDetailViewModel; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 15 * 1000; // 15 seconds TTL cache for stock detail view model

  /**
   * Builds the comprehensive unified StockDetailViewModel with all 9 dimension blocks
   */
  public async getStockDetail(
    ticker: string,
    timeframe: Timeframe = '1D'
  ): Promise<StockDetailViewModel> {
    const symbol = ticker.toUpperCase();
    const cacheKey = `${symbol}_${timeframe}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const nowIso = new Date().toISOString();

    // 1. Fetch Real Live Quote & Historical Candles (Core Market Data)
    const quote = await marketDataProvider.getQuote(symbol, 14, timeframe);
    const bars: PriceBar[] = await marketDataProvider.getHistoricalPrices(symbol, 1825, 14, timeframe, 1300);
    const chartBars = bars.slice(-120);
    const currentPrice = quote.price;
    const marketCap = quote.marketCap;

    // 2. Company Profile DataBlock. The instrument master supplies identity only;
    // descriptive and SEC fields remain unavailable until an authoritative provider is connected.
    const companyBlock: DataBlock<CompanyProfileData> = {
      status: 'UNAVAILABLE',
      data: null,
      error: '公司描述和 SEC 标识尚未接入权威数据源',
      isMock: false,
      isStale: false,
      updatedAt: nowIso,
      source: 'UNAVAILABLE'
    };

    // 3. Live Quote & Stats DataBlock (TTL ~20s)
    const quoteBlock: DataBlock<LiveQuoteData> = {
      status: 'success',
      data: {
        symbol,
        name: quote.name,
        exchange: quote.exchange,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
         open: chartBars[chartBars.length - 1]?.open ?? quote.price,
         high: chartBars[chartBars.length - 1]?.high ?? quote.price,
         low: chartBars[chartBars.length - 1]?.low ?? quote.price,
         previousClose: Number((quote.price - quote.change).toFixed(2)),
        volume: quote.volume,
         avgVolume20d: quote.avgVolume ?? quote.volume,
         relativeVolume: quote.relativeVolume ?? 1,
        turnoverUsd: quote.price * quote.volume,
        marketCap: quote.marketCap,
         peTrailing: null,
         peForward: null,
         epsTrailing: null,
         epsForward: null,
         dividendYield: null,
         beta: null,
         high52w: quote.high52w ?? quote.price,
         low52w: quote.low52w ?? quote.price,
         dist52wHighPct: quote.high52w ? Number((((quote.price - quote.high52w) / quote.high52w) * 100).toFixed(1)) : 0,
         dist52wLowPct: quote.low52w ? Number((((quote.price - quote.low52w) / quote.low52w) * 100).toFixed(1)) : 0,
         dayRange: {
            low: chartBars[chartBars.length - 1]?.low ?? quote.price,
            high: chartBars[chartBars.length - 1]?.high ?? quote.price
        },
         allRsi: quote.allRsi!
      },
      isMock: false,
      isStale: false,
      updatedAt: quote.updatedAt || nowIso,
      source: 'LIVE_EXCHANGE_MARKET_FEED'
    };

    // 4. Market Session Status DataBlock
    const sessionInfo = sessionClock.getMarketStatus();
    const marketStatusBlock: DataBlock<MarketStatusData> = {
      status: 'success',
      data: {
        isOpen: sessionInfo.isOpen,
        session: sessionInfo.session,
        sessionLabel: sessionInfo.sessionLabel,
        nyTime: sessionInfo.nyTime,
        isHoliday: sessionInfo.isHoliday,
        serverTime: nowIso
      },
      isMock: false,
      isStale: false,
      updatedAt: nowIso,
      source: 'NEW_YORK_SESSION_CLOCK'
    };

    // 5. Chart Bars DataBlock
    const chartBlock: DataBlock<PriceBar[]> = {
      status: 'success',
      data: chartBars,
      isMock: false,
      isStale: false,
      updatedAt: nowIso,
      source: 'YAHOO_FINANCE_CANDLE_STREAM'
    };

    // 6. Technical Summary DataBlock (Calculated from Bars)
    const technicalsAvailable = bars.length >= MINIMUM_TECHNICAL_HISTORY_BARS;
    const technicalsAreStale = bars[bars.length - 1]?.provenance?.classification === 'STALE_REAL';
    const technicals = technicalsAvailable
      ? TechnicalSummaryProvider.calculateTechnicalSummary(bars, currentPrice, timeframe)
      : null;
    const technicalsBlock: DataBlock<TechnicalSummaryData> = {
      status: technicalsAvailable ? (technicalsAreStale ? 'stale' : 'success') : 'UNAVAILABLE',
      data: technicals,
      error: technicalsAvailable ? null : `Technicals require at least ${MINIMUM_TECHNICAL_HISTORY_BARS} verified bars; received ${bars.length}`,
      isMock: false,
      isStale: technicalsAreStale,
      updatedAt: bars[bars.length - 1]?.provenance?.retrievedAt ?? nowIso,
      source: 'LOCAL_TECHNICAL_INDICATOR_ENGINE'
    };

    // 7. Parallel fetch for remaining specialized dimension providers with fault-tolerant error boundaries
    const [fundamentalsBlock, forecastsBlock, newsBlock, optionsBlock, quantBlock] = await Promise.all([
      fundamentalProvider.getFundamentals(symbol, currentPrice, marketCap).catch(err => ({
        status: 'UNAVAILABLE' as const,
        data: null,
        error: err?.message || '财务基本面暂时不可用',
        isMock: false,
        isStale: false,
        updatedAt: nowIso,
        source: 'UNAVAILABLE'
      })),
      forecastProvider.getForecasts(symbol, currentPrice, bars, timeframe).catch(err => ({
        status: 'UNAVAILABLE' as const,
        data: null,
        error: err?.message || '分析师预测数据暂时不可用',
        isMock: false,
        isStale: false,
        updatedAt: nowIso,
        source: 'UNAVAILABLE'
      })),
      newsProvider.getNewsAndEvents(symbol).catch(err => ({
        status: 'UNAVAILABLE' as const,
        data: null,
        error: err?.message || '新闻与公司事件暂时不可用',
        isMock: false,
        isStale: false,
        updatedAt: nowIso,
        source: 'UNAVAILABLE'
      })),
      optionsProvider.getOptionsFlow(symbol, currentPrice).catch(err => ({
        status: 'UNAVAILABLE' as const,
        data: null,
        error: err?.message || '期权异动数据暂时不可用',
        isMock: false,
        isStale: false,
        updatedAt: nowIso,
        source: 'UNAVAILABLE'
      })),
      quantProvider.getQuantIntelligence(symbol, bars, currentPrice, timeframe).catch(err => ({
        status: 'UNAVAILABLE' as const,
        data: null,
        error: err?.message || '量化情报数据暂时不可用',
        isMock: false,
        isStale: false,
        updatedAt: nowIso,
        source: 'UNAVAILABLE'
      }))
    ]);

    // Check user active alerts
    const alerts = alertEngine.getAlerts();
    const activeAlert = alerts.find(a => a.ticker === symbol && a.isEnabled);

    const result: StockDetailViewModel = {
      symbol,
      exchange: quote.exchange,
      company: companyBlock,
      quote: quoteBlock,
      marketStatus: marketStatusBlock,
      chart: chartBlock,
      technicals: technicalsBlock,
      fundamentals: fundamentalsBlock,
      forecasts: forecastsBlock,
      newsAndEvents: newsBlock,
      options: optionsBlock,
      quant: quantBlock,
      userState: {
        isWatchlisted: false,
        hasActiveAlert: !!activeAlert,
        activeAlertRule: activeAlert
      }
    };

    // Cache valid view model for 15 seconds
    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.CACHE_TTL_MS
    });

    return result;
  }
}

export const stockDetailService = new StockDetailService();
