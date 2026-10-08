import { Exchange, Timeframe, PriceBar, TradeSetup, StrategyState } from '../types.ts';

export type DataBlockStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty' | 'stale' | 'UNAVAILABLE';

export type DataClassification =
  | 'REAL'
  | 'DERIVED_FROM_REAL'
  | 'STALE_REAL'
  | 'UNKNOWN'
  | 'MOCK'
  | 'SYNTHESIZED'
  | 'HARDCODED'
  | 'UNAVAILABLE'
  | 'ERROR';

export interface DataProvenance {
  source: string | null;
  classification: DataClassification;
  timestamp: string;
  dataAsOf?: string;
  retrievedAt?: string;
  age?: number;
  reason?: string;
  calculationMethod?: string;
  symbol?: string;
  period?: string | number;
}

export interface DataBlock<T> {
  status: DataBlockStatus;
  data: T | null;
  error?: string | null;
  isMock: boolean;
  isStale: boolean;
  updatedAt: string | null;
  source: string;
  provenance?: DataProvenance;
}

// 1. Company Profile Data
export interface CompanyProfileData {
  symbol: string;
  name: string;
  exchange: Exchange;
  sector: string;
  industry: string;
  description: string;
  ceo?: string;
  website?: string;
  employees?: number;
  headquarters?: string;
  cik?: string;
  ipoDate?: string;
  fiscalYearEnd?: string;
}

// 2. Live Quote & Price Statistics Data
export interface LiveQuoteData {
  symbol: string;
  name: string;
  exchange: Exchange;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  avgVolume20d: number;
  relativeVolume: number;
  turnoverUsd?: number;
  marketCap: number;
  peTrailing?: number | null;
  peForward?: number | null;
  epsTrailing?: number | null;
  epsForward?: number | null;
  dividendYield?: number | null;
  beta?: number | null;
  high52w: number;
  low52w: number;
  dist52wHighPct: number;
  dist52wLowPct: number;
  dayRange: { low: number; high: number };
  allRsi: {
    rsi6: number;
    rsi9: number;
    rsi14: number;
    rsi21: number;
    rsi30: number;
  };
}

// 3. Market Session Status Data
export interface MarketStatusData {
  isOpen: boolean;
  session: 'REGULAR' | 'PRE_MARKET' | 'POST_MARKET' | 'AFTER_HOURS' | 'CLOSED' | 'WEEKEND';
  sessionLabel: string;
  nyTime: string;
  isHoliday: boolean;
  serverTime?: string;
}

// 4. Technical Summary & Detailed Indicator Matrix Data
export type TechnicalRating = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';

export interface IndicatorSummaryItem {
  id: string;
  name: string;
  value: number | string;
  formattedValue: string;
  action: 'BUY' | 'SELL' | 'NEUTRAL';
  actionLabelZh: '买入' | '卖出' | '中性';
  description?: string;
}

export interface PivotLevels {
  p: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  r4?: number;
  s4?: number;
}

export interface TechnicalDataQuality {
  calculationMethod: 'LOCAL_TECHNICAL_INDICATOR_ENGINE';
  source: string;
  barsUsed: number;
  requiredBars: number;
  dataAsOf: string | null;
  isStale: boolean;
}

export interface TechnicalSummaryData {
  timeframe: Timeframe;
  dataQuality: TechnicalDataQuality;
  summary: {
    rating: TechnicalRating;
    ratingScore: number; // -100 (Strong Sell) to +100 (Strong Buy)
    ratingLabelZh: string;
    buyCount: number;
    neutralCount: number;
    sellCount: number;
    totalIndicators: number;
  };
  movingAverages: {
    rating: TechnicalRating;
    ratingLabelZh: string;
    buyCount: number;
    sellCount: number;
    neutralCount: number;
    items: IndicatorSummaryItem[];
  };
  oscillators: {
    rating: TechnicalRating;
    ratingLabelZh: string;
    buyCount: number;
    sellCount: number;
    neutralCount: number;
    items: IndicatorSummaryItem[];
  };
  pivots: {
    classic: PivotLevels;
    fibonacci: PivotLevels;
    camarilla: PivotLevels;
  };
  trendAlignment: {
    status: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    label: string;
    ma7: number;
    ma25: number;
    ma99: number;
    bias7Pct: number;
    bias25Pct: number;
    bias99Pct: number;
  };
  divergence: {
    status: 'BULLISH_DIV' | 'BEARISH_DIV' | 'NONE';
    label: string;
    description: string;
  };
}

// 5. Fundamentals & Valuation Multiples Data
export interface FundamentalData {
  valuation: {
    peRatio: number | null;
    forwardPE: number | null;
    psRatio: number | null;
    pbRatio: number | null;
    evToEbitda: number | null;
    pegRatio: number | null;
    enterpriseValue: number | null;
  };
  profitability: {
    grossMargin: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    roe: number | null;
    roa: number | null;
    roic: number | null;
  };
  balanceSheet: {
    totalCash: number | null;
    totalDebt: number | null;
    currentRatio: number | null;
    quickRatio: number | null;
    debtToEquity: number | null;
    bookValuePerShare: number | null;
  };
  cashFlow: {
    operatingCashFlow: number | null;
    freeCashFlow: number | null;
    fcfPerShare: number | null;
    fcfYield: number | null;
  };
  dividends: {
    dividendRate: number | null;
    dividendYield: number | null;
    payoutRatio: number | null;
    exDividendDate: string | null;
  };
  growth: {
    revenueGrowthYoy: number | null;
    earningsGrowthYoy: number | null;
    revenue3yCagr: number | null;
  };
}

// 6. Earnings, Estimates & Wall Street Analyst Forecasts Data
export interface EarningsQuarterItem {
  quarter: string; // e.g. '2026-Q1'
  date: string;
  epsEstimate: number | null;
  epsActual: number | null;
  epsSurprisePct: number | null;
  revenueEstimateUsd: number | null;
  revenueActualUsd: number | null;
  revenueSurprisePct: number | null;
}

export interface EarningsAndForecastData {
  forecastMethod: 'HISTORICAL_STATISTICAL_MODEL' | 'FINNHUB_WITH_HISTORICAL_MODEL';
  modelAssumptions: {
    annualizedVolatilityPct: number;
    sampleBars: number;
    timeframe: Timeframe;
    confidenceLevelPct: number;
    note: string;
  };
  modelScenarios: Array<{
    horizon: '1M' | '3M';
    expectedPrice: number;
    lowPrice: number;
    highPrice: number;
    expectedChangePct: number;
  }>;
  nextEarningsDate: string | null;
  nextEarningsDaysRemaining: number | null;
  earningsHistory: EarningsQuarterItem[];
  analystConsensus: {
    rating: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'UNDERPERFORM' | 'SELL';
    ratingScore: number; // 1.0 (Strong Buy) to 5.0 (Sell)
    ratingLabelZh: string;
    totalAnalysts: number;
    strongBuy: number;
    buy: number;
    hold: number;
    underperform: number;
    sell: number;
  } | null;
  priceTarget: {
    current: number;
    meanTarget: number | null;
    highTarget: number | null;
    lowTarget: number | null;
    medianTarget: number | null;
    upsidePct: number | null;
  } | null;
}

// 7. Stock News & Corporate Events Data
export interface StockNewsItem {
  id: string;
  titleZh: string;
  summaryZh: string;
  source: string;
  publishedAt: string;
  timestamp: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'ALERT';
  sentimentLabel: string;
  sentimentScore: number; // -100 to +100
  impactFactor: string;
  url?: string;
}

export interface CorporateEventItem {
  id: string;
  type: 'EARNINGS' | 'DIVIDEND' | 'SPLIT' | 'PRODUCT_LAUNCH' | 'CONFERENCE';
  typeLabelZh: string;
  titleZh: string;
  date: string;
  details: string;
  isUpcoming: boolean;
}

export interface StockNewsAndEventsData {
  news: StockNewsItem[];
  events: CorporateEventItem[];
}

// 8. Options Flow & Volatility Surface Data
export interface OptionsFlowData {
  impliedVolatility: number | null; // e.g. 42.5%
  ivPercentile: number | null;       // e.g. 68%
  ivRank: number | null;
  putCallVolumeRatio: number | null; // e.g. 0.72
  putCallOpenInterestRatio: number | null;
  maxPainPrice: number | null;
  totalCallVolume: number | null;
  totalPutVolume: number | null;
  sentiment: 'BULLISH_FLOW' | 'BEARISH_FLOW' | 'NEUTRAL_FLOW';
  sentimentLabelZh: string;
}

// 9. Quant Intelligence, Strategies & Risk Governance Data
export interface QuantStrategyMatch {
  strategyId: string;
  strategyName: string;
  strategyFamily: string; // e.g. "Breakout & Trend", "Mean Reversion", "Factor / Quantitative", "Smart Money"
  mode: string; // "SWING", "SHORT_TERM", "POSITION"
  signal: 'Bullish' | 'Neutral' | 'Bearish';
  state: StrategyState;
  stateLabelZh: string;
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  riskRewardRatio: number;
  confluenceScore: number;
  evidenceLevel: string;
  horizon: string;
  backtestStatus: 'Completed' | 'Pending';
  backtestSharpe: number | null; // must be null if Pending!
  winRate: number | null; // must be null if Pending!
  cagr: number | null; // must be null if Pending!
  maxDrawdown: number | null;
}

export interface QuantFactorScores {
  compositeScore: number | null;
  factorRank: number | null;
  totalRankUniverse: number | null;
  rankPercentile: number | null;
  momentum: number | null; // 0 - 100
  value: number | null; // 0 - 100
  quality: number | null; // 0 - 100
  profitability: number | null; // 0 - 100
  growth: number | null; // 0 - 100
  liquidity: number | null; // 0 - 100
  volatility: number | null; // 0 - 100
  rating: string;
  // Backward compatibility aliases:
  momentumScore?: number | null;
  valueScore?: number | null;
  qualityScore?: number | null;
  volatilityScore?: number | null;
  growthScore?: number | null;
}

export interface QuantRiskMetrics {
  atr: number;
  atrPercent: number;
  volatility: number | null; // annualized volatility e.g. 28.5%
  beta: number | null; // beta vs S&P 500 e.g. 1.28
  maxPositionSizePercent: number; // e.g. 10.0%
  riskPerTradePercent: number; // e.g. 1.0% ($1,000)
  stopLossPrice: number;
  stopLossDistancePct: number;
  positionShares: number;
  positionValueUsd: number;
  hardCapPct: number;
  riskRewardRatio: number | null;
  status: 'APPROVED' | 'CAPPED' | 'REJECTED';
  warningMessage?: string;
  suggestedPositionShares?: number;
  suggestedPositionValueUsd?: number;
  accountRiskPercent?: number;
}

export interface QuantMarketRegime {
  regime: 'Risk-On' | 'Neutral' | 'Risk-Off' | 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL_CHOP';
  regimeLabel: string;
  regimeSource: string; // e.g. "S&P 500 200DMA 多头排列 (4.2% 上方) + VIX 期限结构升水 (15.2) + HYG 高收益债利差收窄"
  spyTrend: string;
  qqqTrend: string;
  vixLevel: string | number;
}

export interface QuantIntelligenceData {
  // Top Scores
  quantScore: number | null; // 0 - 100
  strategyScore: number | null; // 0 - 100
  factorScore: number | null; // 0 - 100
  riskScore: number | null; // 0 - 100
  signal: 'Bullish' | 'Neutral' | 'Bearish' | 'Unavailable';
  signalLabelZh: string;
  oosScore?: number;
  oosWinRate?: number;

  technicalIndicators: {
    rsi14: number;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
  };
  technicalSummary: TechnicalSummaryData | null;

  // Components
  factorScores: QuantFactorScores;
  strategyMatches: QuantStrategyMatch[];
  riskEvaluation: QuantRiskMetrics;
  marketRegime: QuantMarketRegime | null;
  setups: TradeSetup[];
}

// Master Unified ViewModel
export interface StockDetailViewModel {
  symbol: string;
  exchange: Exchange;
  company: DataBlock<CompanyProfileData>;
  quote: DataBlock<LiveQuoteData>;
  marketStatus: DataBlock<MarketStatusData>;
  chart: DataBlock<PriceBar[]>;
  technicals: DataBlock<TechnicalSummaryData>;
  fundamentals: DataBlock<FundamentalData>;
  forecasts: DataBlock<EarningsAndForecastData>;
  newsAndEvents: DataBlock<StockNewsAndEventsData>;
  options: DataBlock<OptionsFlowData>;
  quant: DataBlock<QuantIntelligenceData>;
  userState: {
    isWatchlisted: boolean;
    hasActiveAlert: boolean;
    activeAlertRule?: any;
  };
}
