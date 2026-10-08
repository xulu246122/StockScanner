export type Exchange = 'NYSE' | 'NASDAQ';

export type RSIStatus = 'OVERSOLD' | 'WEAK' | 'NEUTRAL' | 'OVERBOUGHT';

export type Timeframe = '10m' | '30m' | '1h' | '2h' | '4h' | '1D' | '1W' | '1M';

export interface StockMeta {
  ticker: string;
  name: string;
  exchange: Exchange;
  marketCap: number; // in USD
  sector: string;
  industry: string;
  isActive: boolean;
  securityType?: string;
  isADR?: boolean;
  isREIT?: boolean;
  isETF?: boolean;
  isIndex?: boolean;
}

export interface PriceBar {
  date: string; // YYYY-MM-DD or HH:mm
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number;
}

export interface RSIValue {
  period: number;
  timeframe?: Timeframe;
  value: number;
  status: RSIStatus;
  statusLabel: string;
  previousValue?: number;
  change?: number;
}

export interface StockQuoteSnapshot {
  ticker: string;
  name: string;
  exchange: Exchange;
  sector?: string;
  industry?: string;
  price: number;
  change: number;
  changePercent: number;
  high52w?: number;
  low52w?: number;
  marketCap: number;
  volume: number;
  timeframe?: Timeframe;
  rsi: RSIValue;
  allRsi?: {
    rsi6: number;
    rsi9: number;
    rsi14: number;
    rsi21: number;
    rsi30: number;
  };
  marketTime: string;
  isDelayed: boolean;
  dataSource: string;
  updatedAt: string;
  hasActiveAlert?: boolean;
  activeAlertRule?: AlertRule;
}

export interface ScreenerFilter {
  universe?: string; // SP500, NASDAQ100, MEGA_CAP, LARGE_CAP, MID_CAP, SMALL_CAP, US_LIQUID, NYSE_STOCKS, NASDAQ_STOCKS, ADR, REIT, ETF, WATCHLIST, CUSTOM
  market?: 'ALL' | 'NYSE' | 'NASDAQ';
  sector?: string; // ALL, Technology, Healthcare, Financials, Consumer Discretionary, Communication Services, Industrials, Energy, etc.
  sectors?: string[]; // Multi-sector array support
  minMarketCap?: number;
  maxMarketCap?: number;
  minPrice?: number;
  maxPrice?: number;
  rsiPeriod?: number; // 6, 9, 14, 21, 30 (default 14)
  timeframe?: Timeframe; // 10m, 30m, 1h, 2h, 4h, 1D, 1W, 1M
  searchQuery?: string;
  rsiOperator?: '<' | '<=' | '>' | '>=' | 'BETWEEN';
  rsiValue?: number;
  rsiMin?: number;
  rsiMax?: number;
  preset?: 
    | 'OVERSOLD_20' 
    | 'OVERSOLD_25' 
    | 'OVERSOLD_30' 
    | 'OVERSOLD_35' 
    | 'PULLBACK'
    | 'BREAKOUT'
    | 'HIGH_REL_VOL'
    | 'ALL'
    | 'OVERBOUGHT_70' 
    | 'OVERBOUGHT_75' 
    | 'OVERBOUGHT_80'
    | 'BULLISH_DIV'
    | 'BEARISH_DIV'
    | 'MA_BULLISH'
    | 'MA_BEARISH'
    | string;
  sortBy?: 'rsi' | 'marketCap' | 'changePercent' | 'price' | 'ticker' | 'score' | 'rsRank' | 'rvol' | 'atrPercent' | 'dollarVolume' | 'riskRewardRatio';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  // Professional Radar 2.0 Extensions
  rules?: ConditionGroup;
  rankingWeights?: RankingWeights;
  presetId?: string;
  mode?: 'QUICK' | 'PRO' | 'QUANT';
  minDollarVolume?: number;
  minRvol?: number;
  minRsRank?: number;
  earningsSafeOnly?: boolean;
}

export type SignalState =
  | 'NORMAL'
  | 'WATCH'
  | 'SETUP'
  | 'TRIGGERED'
  | 'NEAR_TRIGGER'
  | 'WATCHING'
  | 'CONFIRMED'
  | 'ENTRY_WINDOW'
  | 'TAKE_PROFIT'
  | 'INVALIDATED'
  | 'NO_TRADE';

export interface RadarWhyMatched {
  summary?: string;
  strengths?: string[];
  cautions?: string[];
  primaryDriver?: 'BREAKOUT' | 'MOMENTUM' | 'OVERSOLD' | 'PULLBACK' | 'VALUE' | 'EARNINGS';
  riskRewardRatio?: number;
  suggestedEntry?: number;
  suggestedStop?: number;
  suggestedTarget?: number;
  matchedCriteria: string[];
  warnings: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  actionAdvice: string;
  noTradeReasons?: string[];
}

export interface RankingWeights {
  relativeStrength?: number;
  momentum?: number;
  volume?: number;
  trend?: number;
  sector?: number;
  market?: number;
  structure?: number;
  volatility?: number;
}

export interface RadarPreset {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  mode: 'QUICK' | 'PRO' | 'QUANT';
  profileType: string;
  rules: ConditionGroup;
  rankingWeights?: RankingWeights;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScreenerResultItem {
  ticker: string;
  name: string;
  exchange: Exchange;
  sector?: string;
  industry?: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  rsi: number;
  rsiPrevious?: number;
  rsiChange?: number;
  rsiStatus: RSIStatus;
  rsiStatusLabel: string;
  rsiPeriod: number;
  timeframe?: Timeframe;
  volume: number;
  avgVolume?: number;
  updatedAt: string;
  relativeVolume?: number;
  rvol?: number;
  dollarVolume?: number;
  avgDollarVolume?: number;
  atr?: number;
  atrPercent?: number;
  rsRank?: number;
  trend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  activeSetup?: string;
  strategyState?: StrategyState;
  strategyEvaluation?: StrategyEvaluation;
  confluenceScore?: number;
  factorScore?: number;
  score?: number;
  rank?: number;
  signalStrength?: number;
  signalState?: SignalState;
  sectorRelStrength?: number;
  marketRegime?: string;
  sectorRegime?: string;
  whyMatched?: RadarWhyMatched;
  riskRewardRatio?: number;
  stopLossPrice?: number;
  targetPrice?: number;
  noTrade?: boolean;
  noTradeReasons?: string[];
  daysToEarnings?: number | null;
  factorRecommendation?: string;
}

export interface ScreenerResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  results: ScreenerResultItem[];
  filterApplied: ScreenerFilter;
  scannedCount: number;
  marketStatus: MarketStatus;
  timestamp: string;
  executionTimeMs?: number;
}

export type AlertTargetDimension = 'PRICE' | 'CHANGE_PERCENT' | 'RSI' | 'MOVING_AVERAGE';

export type AlertOperator =
  | 'CROSSING'
  | 'CROSSING_UP'
  | 'CROSSING_DOWN'
  | 'GREATER_EQUAL'
  | 'LESS_EQUAL'
  | 'ENTER_CHANNEL'
  | 'EXIT_CHANNEL';

export type AlertTriggerFrequency =
  | 'ONLY_ONCE'
  | 'ONCE_PER_BAR_CLOSE'
  | 'ONCE_PER_MINUTE';

export type AlertSoundType =
  | 'ALARM_CLOCK'
  | 'RADAR_PING'
  | 'DIGITAL_CHIME'
  | 'URGENT_BEAT';

export type AlertConditionType =
  // Price Dimension
  | 'PRICE_GTE'
  | 'PRICE_LTE'
  | 'PRICE_CROSS_UP'
  | 'PRICE_CROSS_DOWN'
  // % Change Dimension
  | 'CHANGE_PCT_GTE'
  | 'CHANGE_PCT_LTE'
  // RSI Dimension
  | 'RSI_LTE'
  | 'RSI_GTE'
  | 'CROSS_BELOW_30'
  | 'CROSS_ABOVE_70'
  | 'RSI_BETWEEN'
  | 'RSI_OVERSOLD'
  | 'RSI_OVERBOUGHT'
  | 'RSI_CUSTOM_CROSS'
  // Moving Average Cross Dimension
  | 'PRICE_CROSS_UP_MA'
  | 'PRICE_CROSS_DOWN_MA';

export interface AlertRule {
  id: string;
  ticker: string;
  name: string;
  stockName?: string;
  targetDimension?: AlertTargetDimension;
  operator?: AlertOperator;
  period?: number;
  timeframe?: Timeframe;
  conditionType: AlertConditionType;
  thresholdValue: number;
  thresholdMax?: number;
  thresholdSecondary?: number;
  isEnabled: boolean;
  state?: string;
  triggerFrequency?: AlertTriggerFrequency | string;
  lastTriggeredAt?: string;
  lastCheckedRsi?: number;
  lastCheckedPrice?: number;
  notifySound?: boolean;
  notifyPush?: boolean;
  soundType?: AlertSoundType | string;
  expireAt?: string | null;
  alertName?: string;
  customMessage?: string;
  triggerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  ticker: string;
  name: string;
  timeframe?: Timeframe;
  triggeredRsi?: number;
  triggeredPrice?: number;
  triggeredValue?: number;
  threshold: number;
  conditionType: AlertConditionType;
  targetDimension?: AlertTargetDimension;
  message: string;
  triggeredAt: string;
  isRead: boolean;
}

// ==========================================
// QUANT STRATEGY ALERT SYSTEM TYPES
// ==========================================

export type StrategyAlertTriggerType =
  | 'CONDITION_TRIGGER'  // 1. 条件触发 (如 RSI 进入超卖)
  | 'BREAKOUT_TRIGGER'   // 2. 突破触发 (如 价格突破 Donchian High / Darvas Box)
  | 'TREND_CHANGE'      // 3. 趋势变化 (如 EMA20 上穿 EMA50)
  | 'VOLUME_ANOMALY';   // 4. 成交量异常 (如 Volume > 20日均量2倍)

export type StrategyAlertStatus = 'ACTIVE' | 'PAUSED' | 'TRIGGERED';

export interface StrategyAlert {
  id: string;
  user_id?: string;
  strategy_id: string;
  strategyName: string;
  parameters: Record<string, any>;
  timeframe: Timeframe;
  symbols: string[];
  universe?: string;
  intervalMinutes?: number;
  status: StrategyAlertStatus;
  trigger_type: StrategyAlertTriggerType;
  triggerTypeLabel?: string;
  conditionDescription: string;
  created_at: string;
  last_triggered_at?: string | null;
  last_triggered_symbol?: string | null;
  triggerCount?: number;
  lastMatchCount?: number;
  lastMatchedTickers?: string[];
}

// ==========================================
// QUANT STRATEGY BACKTEST ENGINE TYPES (PHASE 7)
// ==========================================

export type BacktestTimeRange = '6M' | '1Y' | '2Y' | '3Y' | '5Y';

export interface BacktestConfig {
  strategyId: string;
  strategyName?: string;
  parameters: Record<string, any>;
  timeframe: Timeframe;
  range: BacktestTimeRange;
  symbols: string[];
  initialCapital: number;
  commission: number; // e.g. 0.0005 = 0.05%
  slippage: number;   // e.g. 0.0005 = 0.05%
  startDate?: string;
  endDate?: string;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  holdingPeriodBars: number;
  holdingDays?: number;
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL_EXIT' | 'TRAILING_STOP';
}

export interface EquityPoint {
  date: string;
  equity: number;
  benchmarkEquity: number;
  drawdown: number;
  cash: number;
}

export type BacktestValidationStatus =
  | 'NOT_RUN'
  | 'RUNNING'
  | 'BACKTESTED'
  | 'INSUFFICIENT_DATA'
  | 'FAILED';

export interface MonteCarloSimulationResult {
  iterations: number;             // e.g. 1000 次模拟
  confidenceLevel: number;        // e.g. 0.95 (95% 置信度)
  var95: number;                  // 95% Value at Risk (单笔/单日最大在险亏损百分比，e.g. -3.5%)
  cvar95: number;                 // 95% CVaR / Expected Shortfall (超额条件损失期望，e.g. -5.2%)
  maxDrawdown95: number;          // 95% 置信度下最大可能回撤 (e.g. 18.4%)
  riskOfRuin: number;             // 破产概率 (50%本金回撤或归零概率，e.g. 0.0% ~ 2.1%)
  medianReturn: number;           // 模拟收益率中位数 (e.g. 32.5%)
  percentile5Return: number;      // 悲观情景 (5th 百分位收益，e.g. 5.1%)
  percentile95Return: number;     // 乐观情景 (95th 百分位收益，e.g. 68.2%)
  drawdownDistribution: {
    min: number;
    median: number;
    p95: number;
    max: number;
  };
}

export interface BacktestPerformance {
  totalReturn: number;      // % e.g. 48.65
  annualReturn: number;     // % CAGR e.g. 28.4
  cagr: number;             // % CAGR synonym
  winRate: number;          // % e.g. 64.2
  maxDrawdown: number;      // % e.g. -12.4
  sharpeRatio: number;      // e.g. 1.85
  sharpe: number;           // synonym
  sortino: number;          // e.g. 2.41
  profitFactor: number;     // e.g. 2.14
  avgWin: number;           // % e.g. 4.82
  avgLoss: number;          // % e.g. -2.15
  expectancy: number;       // e.g. 1.85% or $ / trade
  turnover: number;         // % annualized turnover
  exposure: number;         // % market exposure time
  benchmarkReturn: number;  // % e.g. 18.2
  alpha?: number;           // % e.g. 12.8
  beta?: number;            // e.g. 1.05
  status?: BacktestValidationStatus;
  monteCarlo?: MonteCarloSimulationResult;
}

export interface TradeStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgHoldingDays: number;
  profitFactor?: number;
  expectancy?: number;
  exposurePercent?: number;
}

export interface StrategyScoreCard {
  researchEvidenceScore: number; // 0-100 (A+: 95, A: 85, B: 70, C: 55, UNVERIFIED: 35)
  backtestScore: number;         // 0-100 based on CAGR, Sharpe, Sortino, MaxDD, Profit Factor
  outOfSampleScore?: number;     // 0-100 (25% OOS performance score)
  riskScore: number;             // 0-100 (100 - tail risk, maxDD, excessive vol)
  robustnessScore: number;       // 0-100 (OOS retention, parameter stability)
  implementationScore?: number;  // 0-100 (10% AST friction and rules completeness)
  compositeScore: number;        // 0-100 weighted multi-factor rating
  totalScore?: number;           // 0-100 composite score alias
  evidenceTier: string;
  dataSource?: 'RESEARCH' | 'BACKTEST' | 'OOS' | 'LIVE';
  breakdown?: any;
}

export interface BiasChecksSummary {
  lookAheadBias: 'PASSED' | 'FAILED';
  survivorshipBias: 'POINT_IN_TIME_ACKNOWLEDGED' | 'STRICT_SURVIVOR_FREE';
  dataSnooping: 'OOS_VERIFIED' | 'LOW_PENALTY' | 'POTENTIAL_OVERFIT';
  dataLeakage: 'STRICT_PARTITIONED' | 'ISOLATED';
  delistingBias: 'DIVIDEND_SPLIT_ADJUSTED' | 'HANDLED';
  corporateActionError: 'POINT_IN_TIME_ALIGNED';
}

export interface BacktestValidationSummary {
  strategyId: string;
  strategyName: string;
  mode: string;
  evidenceLevel: string;
  status: BacktestValidationStatus;
  universe: string[];
  dataset: string;
  period: { start: string; end: string; totalBars: number };
  transactionCost: { commissionRatePercent: number; slippageRatePercent: number };
  fullPeriod: BacktestPerformance;
  inSample?: BacktestPerformance | null;
  validation?: BacktestPerformance | null;
  outOfSample?: BacktestPerformance | null;
  scores: StrategyScoreCard;
  dataQuality: 'HIGH' | 'MEDIUM' | 'INSUFFICIENT_DATA';
  biasChecks: BiasChecksSummary;
}

export interface BacktestResult {
  id: string;
  jobId: string;
  strategyId: string;
  strategyName: string;
  config: BacktestConfig;
  performance: BacktestPerformance;
  statistics: TradeStatistics;
  equityCurve: EquityPoint[];
  trades: Trade[];
  executedAt: string;
  executionTimeMs: number;
}

export interface BacktestJob {
  id: string;
  strategyId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  createdAt: string;
  completedAt?: string;
  resultId?: string;
}

export type TrendAlignment = 
  | 'BULLISH_ALIGNMENT' 
  | 'BEARISH_ALIGNMENT' 
  | 'GOLDEN_CROSS' 
  | 'DEATH_CROSS' 
  | 'NEUTRAL';

export type DivergenceType = 
  | 'BULLISH_DIV' 
  | 'BEARISH_DIV' 
  | 'NONE';

export interface TrendAnalysisResult {
  timeframe: '4h' | '1D' | '1W';
  price: number;
  ma7: number;
  ma25: number;
  ma99: number;
  alignment: TrendAlignment;
  alignmentLabel: string;
  alignmentStatus: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  divergence: DivergenceType;
  divergenceLabel: string;
  divergenceDescription: string;
  rsiCurrent: number;
  rsiPreviousPeakOrTrough?: number;
  priceCurrent: number;
  pricePreviousPeakOrTrough?: number;
  supportLevel?: number;
  resistanceLevel?: number;
}

export type SetupType = string;

export interface TradeSetup {
  id: string;
  ticker: string;
  name: string;
  setupType: SetupType;
  setupLabel: string;
  direction: 'LONG' | 'SHORT';
  timeframe: Timeframe;
  confidence: number;
  status: string;
  triggerDescription: string;
  entryZone: { min: number; max: number; optimal: number };
  stopLoss: number;
  target1: number;
  target2: number;
  riskPercent: number;
  rewardPercent: number;
  riskRewardRatio: number;
  isRiskExceeded?: boolean;
  invalidationLevel?: number;
  invalidationReason?: string;
  detectedAt?: string;
}

export interface PositionSizeResult {
  accountSize: number;
  maxRiskPercent: number;
  riskCapital: number;
  entryPrice: number;
  stopLossPrice: number;
  riskPerShare: number;
  riskPercent: number;
  shares: number;
  positionValue: number;
  portfolioWeightPercent: number;
  isRiskExceeded: boolean;
  isHardCapExceeded?: boolean;
  warningMessage?: string;
}


export interface MarketStatus {
  isOpen: boolean;
  session: 'PRE_MARKET' | 'REGULAR' | 'AFTER_HOURS' | 'CLOSED' | 'WEEKEND';
  sessionLabel: string;
  nyTime: string;
  isHoliday: boolean;
  holidayName?: string;
  nextOpenTime?: string;
}

export type ActiveTab = 'home' | 'screener' | 'chart' | 'detail' | 'watchlist' | 'alerts' | 'market' | 'quant' | 'radar' | 'rebound' | 'news' | 'settings';

export interface ApiProviderStatus {
  status: 'ONLINE' | 'OFFLINE' | 'UNTESTED';
  latencyMs?: number;
  message?: string;
}

export interface ApiProviderConfig {
  finnhubApiKey: string;
  massiveApiKey: string;
  alphaVantageApiKey: string;
  primaryProvider: 'AUTO' | 'FINNHUB' | 'MASSIVE' | 'ALPHAVANTAGE' | 'YAHOO_FALLBACK';
  enableFailover: boolean;
  lastTestedAt?: string;
  providerStatus?: {
    finnhub?: ApiProviderStatus;
    massive?: ApiProviderStatus;
    alphaVantage?: ApiProviderStatus;
  };
}

export const DEFAULT_API_CONFIG: ApiProviderConfig = {
  finnhubApiKey: 'dauanj1r01qkvn4p3qi0dauanj1r01qkvn4p3qig',
  massiveApiKey: '1mfijJuxcpzxhX_0GshqQ3N7SV9s8mlP',
  alphaVantageApiKey: 'LIWYBWJZZWD1NII5',
  primaryProvider: 'AUTO',
  enableFailover: true,
  providerStatus: {
    finnhub: { status: 'UNTESTED' },
    massive: { status: 'UNTESTED' },
    alphaVantage: { status: 'UNTESTED' }
  }
};

// ==========================================
// COMMERCIAL QUANT STRATEGY & AST CONDITION TYPES
// ==========================================

export type ConditionOperator =
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'EQ'
  | 'NEQ'
  | 'CROSS_UP'
  | 'CROSS_DOWN'
  | 'BETWEEN'
  | 'SLOPE_UP'
  | 'SLOPE_DOWN'
  | 'PERCENT_ABOVE'
  | 'PERCENT_BELOW'
  | 'INCREASING'
  | 'DECREASING'
  | 'NEAR_PERCENT'
  | 'DISTANCE_ATR'
  | 'IN_SET'
  | 'NOT_IN_SET';

export interface ConditionNode {
  type: 'leaf';
  id: string;
  indicatorId: string;
  parameter?: Record<string, any>;
  timeframe?: Timeframe;
  operator: ConditionOperator;
  value: any;
  label?: string;
}

export interface ConditionGroup {
  type: 'group';
  id: string;
  logicalOperator: 'AND' | 'OR';
  negate?: boolean;
  children: (ConditionNode | ConditionGroup)[];
  label?: string;
}

export type IndicatorCategory =
  | 'price'
  | 'moving_averages'
  | 'momentum'
  | 'trend'
  | 'volatility'
  | 'volume'
  | 'structure'
  | 'relative_strength'
  | 'market'
  | 'fundamental'
  | 'events';

export interface IndicatorParamSchema {
  id: string;
  name: string;
  type: 'number' | 'select' | 'boolean';
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  description: string;
}

export interface IndicatorDefinition {
  id: string;
  name: string;
  shortName: string;
  category: IndicatorCategory;
  categoryLabel?: string;
  mathFormula?: string;
  description: string;
  parameters: Record<string, { label: string; type: 'number' | 'select'; default: any; options?: any[] }> | IndicatorParamSchema[];
  paramSchemas?: IndicatorParamSchema[];
  usageGuide?: string;
  applicableScenarios?: string[];
  riskWarnings?: string[];
  supportedTimeframes: Timeframe[];
  operators: ConditionOperator[];
  unit?: string;
  sourceReference?: string;
  bullishSignal?: string;
  bearishSignal?: string;
}

export type StrategyCategory =
  | 'TREND'
  | 'MOMENTUM'
  | 'MEAN_REVERSION'
  | 'FACTOR'
  | 'BREAKOUT'
  | 'STAT_ARBITRAGE'
  | 'STAT_ARB'
  | 'EVENT_DRIVEN'
  | 'VOLATILITY'
  | 'MARKET_REGIME'
  | 'MACRO_REGIME'
  | 'SMART_MONEY'
  | 'AI_ML'
  | 'CLASSIC'
  | 'TECHNICAL'
  | 'MULTI_FACTOR';

export interface StrategyParamConfig {
  id: string;
  name: string;
  type: 'number' | 'select' | 'boolean';
  default: any;
  value?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  description: string;
}

export type StrategyFamily = 'short_term' | 'swing' | 'position' | 'long_term' | 'factor';

export type StrategySourceType =
  | 'ORIGINAL_AUTHOR'
  | 'ACADEMIC_RESEARCH'
  | 'INSTITUTIONAL_REFERENCE'
  | 'ESTABLISHED_PRACTITIONER'
  | 'TECHNICAL_ANALYSIS_REFERENCE';

export type StrategyEvidenceLevel = 'LEVEL_S' | 'LEVEL_A' | 'LEVEL_B' | 'LEVEL_C';

export interface StrategyRiskFramework {
  entryReference: string;
  invalidation: string;
  stopLossRule: string;
  profitTargetRule?: string;
}

export type StrategyModeType = 'short_term' | 'swing' | 'position';

export interface StrategyModeConfig {
  modeType?: StrategyModeType;
  modeName?: string;
  name?: string;
  description?: string;
  holdingPeriod?: string;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  applicableTimeframes?: Timeframe[];
  defaultTimeframe?: Timeframe;
  parameters: Record<string, any>;
  parameterNotes?: string;
  riskFramework?: StrategyRiskFramework;
  riskNotes?: string;
}

export type StrategyModeKind = 'SHORT_TERM' | 'SWING' | 'POSITION';
export type StrategyEvidenceLevelV2 = 'A+' | 'A' | 'B' | 'C' | 'UNVERIFIED';
export type StrategyStatusV2 = 'ACTIVE' | 'BACKTEST_PENDING' | 'EXPERIMENTAL' | 'DEPRECATED';

export interface StrategyRiskModelV2 {
  maxRiskPerTradePercent: number;
  stopLossRule: string;
  profitTargetRule: string;
  invalidationThreshold: string;
  maxHoldingPeriodBars: number;
}

export interface StrategyCostModelV2 {
  commissionRatePercent: number;
  slippageRatePercent: number;
  minimumLiquidityDailyDollar: number;
}

export interface StrategyBacktestConfigV2 {
  defaultUniverse: string;
  benchmark: string;
  lookbackDays: number;
  recommendedTimeframe: Timeframe;
}

export interface StrategyDefinition {
  id: string;
  slug?: string;
  name: string;
  nameZh?: string;
  nameEn?: string;
  shortName: string;
  mode?: StrategyModeKind;
  holdingPeriod?: string;
  category?: StrategyCategory;
  categoryLabel?: string;
  family: StrategyFamily;
  strategyFamily?: string;
  strategySchool?: string;
  horizon: string;
  direction: 'LONG' | 'SHORT' | 'BOTH';
  author: string;
  origin: string;
  sourceType: StrategySourceType;
  evidenceLevel: StrategyEvidenceLevel | StrategyEvidenceLevelV2 | any;
  evidenceType?: 'ACADEMIC_PEER_REVIEWED' | 'INDUSTRY_EMPIRICAL' | 'PRACTITIONER_CLASSIC' | 'UNVERIFIED';
  canonicalSources?: string[];
  sourceReference: string;
  thesis?: string;
  description: string;
  requiredData?: string[];
  requiredIndicators?: string[];
  tradingLogic?: {
    entryRules: string[];
    exitRules: string[];
    invalidationRules: string[];
  };
  entry?: string[];
  confirmation?: string[];
  exit?: string[];
  rebalance?: string[];
  rules: ConditionGroup;
  signalDefinition?: {
    setupCondition: string;
    entryTrigger: string;
    confirmationFilter: string;
    exitRule: string;
  };
  parameters: Record<string, { label: string; default: any; value: any; min?: number; max?: number; step?: number }> | StrategyParamConfig[];
  paramConfigs?: StrategyParamConfig[];
  defaultTimeframes: Timeframe[];
  defaultMode?: StrategyModeType;
  modes?: Record<StrategyModeType, StrategyModeConfig>;
  riskFramework?: StrategyRiskFramework;
  riskModel?: StrategyRiskModelV2;
  riskWarning?: string;
  antiLookaheadRules?: string[];
  transactionCostModel?: StrategyCostModelV2;
  backtestConfig?: StrategyBacktestConfigV2;
  status?: StrategyStatusV2;
  literatureEvidence?: {
    reference: string;
    empiricalFindings: string;
    samplePeriod?: string;
  };
  localBacktest?: {
    status: 'BACKTEST_PENDING' | 'COMPLETED' | 'UNTESTED';
    winRate?: number;
    sharpe?: number;
    cagr?: number;
    maxDrawdown?: number;
    sampleTradesCount?: number;
    testedPeriod?: string;
    monteCarlo?: MonteCarloSimulationResult;
  };
  liveObservation?: {
    status: 'ACTIVE_MONITORING' | 'PILOT' | 'INACTIVE';
    monitoredSymbolsCount?: number;
    lastSignalTimestamp?: string;
  };
  historicalPerformanceNote?: string;
  exampleTicker?: string;
  tags: string[];
  version: string;
  notes?: string;
  difficultyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  holdingPeriodLabel?: string;
  winRateEst?: number;
  sharpeEst?: number;
  profitFactorEst?: number;
  annualReturnEst?: number;
  maxDrawdownEst?: number;
  popularityStars?: number;
}

export type StrategyState =
  | 'WATCHING'
  | 'SETUP'
  | 'NEAR_TRIGGER'
  | 'TRIGGERED'
  | 'ACTIVE'
  | 'INVALIDATED'
  | 'COMPLETED';

export interface ConditionEvaluationResult {
  conditionId: string;
  label: string;
  passed: boolean;
  actualValue?: any;
  targetValue?: any;
  timeframe?: Timeframe;
}

export interface StrategyEvaluation {
  ticker: string;
  strategyId: string;
  strategyName: string;
  state: StrategyState;
  stateLabel: string;
  confluenceScore: number;
  passedConditionsCount: number;
  totalConditionsCount: number;
  distanceToTriggerPercent?: number;
  triggerPrice?: number;
  stopLossPrice?: number;
  boxHigh?: number;
  boxLow?: number;
  evaluatedAt: string;
  details: ConditionEvaluationResult[];
}

export interface SavedStrategy {
  id: string;
  name: string;
  description: string;
  baseStrategyId?: string;
  rules: ConditionGroup;
  parameters: Record<string, any>;
  timeframes: Timeframe[];
  createdAt: string;
  updatedAt: string;
}

export interface ExtendedScreenerItem extends ScreenerResultItem {
  strategyEvaluation?: StrategyEvaluation;
  confluenceScore?: number;
  strategyState?: StrategyState;
  rvol?: number;
  atr?: number;
  atrPercent?: number;
  factorScore?: number;
  rank?: number;
  signalStrength?: number;
}

// ==========================================
// MULTI-FACTOR QUANT PLATFORM TYPES (PHASE 8)
// ==========================================

export type FactorCategory =
  | 'MOMENTUM'      // 动量因子 (RSI, ROC, Relative Strength)
  | 'TREND'         // 趋势因子 (EMA, ADX, Price Above MA)
  | 'QUALITY'       // 质量基本面因子 (ROE, Margin, Debt Ratio)
  | 'VOLATILITY'    // 波动率因子 (ATR %, Bollinger Bandwidth)
  | 'VOLUME';       // 量价资金因子 (RVOL, Volume Spike)

export interface FactorDefinition {
  id: string;
  name: string;
  shortName: string;
  category: FactorCategory;
  categoryLabel: string;
  description: string;
  formula: string;
  defaultWeight: number; // e.g. 0.33 (33%)
  min: number;
  max: number;
  higherIsBetter: boolean;
  unit?: string;
  parameters?: Record<string, any>;
  historicalIC?: number;
}

export interface FactorWeight {
  factorId: string;
  factorName?: string;
  category?: FactorCategory;
  weight: number; // 0 to 1 (or 0 to 100%)
  operator?: 'WEIGHT' | 'AND' | 'OR';
  minThreshold?: number;
  maxThreshold?: number;
}

export interface FactorModel {
  id: string;
  name: string;
  description: string;
  combinationMode: 'WEIGHTED_SUM' | 'LOGICAL_AND' | 'LOGICAL_OR';
  factors: FactorWeight[];
  minCompositeScore?: number;
  createdAt: string;
  updatedAt: string;
  isPreset?: boolean;
}

export interface StockFactorScore {
  ticker: string;
  name: string;
  sector: string;
  industry?: string;
  price: number;
  changePercent: number;
  compositeScore: number; // 0 - 100
  rank: number;           // 1, 2, 3 ...
  signalStrength: number; // 1 - 5 stars
  strategyState?: StrategyState;
  factorBreakdown: Record<string, {
    rawValue: number;
    normalizedScore: number;
    weightedScore: number;
    passed?: boolean;
  }>;
  breakdown?: {
    momentumScore?: number;
    trendScore?: number;
    qualityScore?: number;
  };
}

export * from './types/stockDetail.ts';
export * from './types/newsCatalyst.ts';
export * from './types/rebound.ts';
export * from './types/trading.ts';
export * from './types/websocket.ts';
export * from './types/notification.ts';


