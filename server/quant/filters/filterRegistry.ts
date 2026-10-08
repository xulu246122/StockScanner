import { ConditionOperator, Timeframe } from '../../types.ts';
import { INDICATOR_REGISTRY } from '../indicators/registry.ts';

export type FilterAvailability = 'AVAILABLE' | 'PARTIAL' | 'DATA_NOT_AVAILABLE';

export interface FilterCategoryItem {
  id: string;
  name: string;
  nameZh: string;
  availability: FilterAvailability;
}

export interface FilterDefinition {
  id: string;
  category: string;
  name: string;
  nameZh?: string;
  description: string;
  dataSource: string;
  valueType: 'number' | 'boolean' | 'text' | 'enum';
  supportedTimeframes: Timeframe[];
  operators: ConditionOperator[];
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  enumOptions?: { label: string; value: any }[];
  availability: FilterAvailability;
  calculation?: string;
}

export const FILTER_CATEGORIES: FilterCategoryItem[] = [
  { id: 'universe', name: 'Universe', nameZh: '标的宇宙与板块', availability: 'AVAILABLE' },
  { id: 'price_market', name: 'Price & Market', nameZh: '价格与市值', availability: 'AVAILABLE' },
  { id: 'liquidity', name: 'Liquidity', nameZh: '流动性过滤', availability: 'AVAILABLE' },
  { id: 'volume', name: 'Volume', nameZh: '成交量异动', availability: 'AVAILABLE' },
  { id: 'volatility', name: 'Volatility', nameZh: '波动率体系', availability: 'AVAILABLE' },
  { id: 'performance', name: 'Performance', nameZh: '周期收益率', availability: 'AVAILABLE' },
  { id: 'trend', name: 'Trend', nameZh: '趋势均线群', availability: 'AVAILABLE' },
  { id: 'momentum', name: 'Momentum', nameZh: '动量振荡器', availability: 'AVAILABLE' },
  { id: 'relative_strength', name: 'Relative Strength', nameZh: '相对强弱 (Alpha)', availability: 'AVAILABLE' },
  { id: 'price_structure', name: 'Price Structure', nameZh: '形态与高低位', availability: 'AVAILABLE' },
  { id: 'technical_signals', name: 'Technical Signals', nameZh: '标准化信号库', availability: 'AVAILABLE' },
  { id: 'mean_reversion', name: 'Mean Reversion', nameZh: '均值回归模型', availability: 'AVAILABLE' },
  { id: 'breakout', name: 'Breakout', nameZh: '突破形态识别', availability: 'AVAILABLE' },
  { id: 'pullback', name: 'Pullback', nameZh: '均线回踩形态', availability: 'AVAILABLE' },
  { id: 'fundamentals', name: 'Fundamentals', nameZh: '基本面指标', availability: 'PARTIAL' },
  { id: 'valuation', name: 'Valuation', nameZh: '估值水平', availability: 'PARTIAL' },
  { id: 'growth', name: 'Growth', nameZh: '成长因子', availability: 'PARTIAL' },
  { id: 'profitability', name: 'Profitability', nameZh: '盈利能力', availability: 'PARTIAL' },
  { id: 'earnings', name: 'Earnings', nameZh: '财报与业绩风险', availability: 'AVAILABLE' },
  { id: 'ownership', name: 'Ownership', nameZh: '持股与机构结构', availability: 'DATA_NOT_AVAILABLE' },
  { id: 'short_interest', name: 'Short Interest', nameZh: '空头与借券比', availability: 'DATA_NOT_AVAILABLE' },
  { id: 'options', name: 'Options', nameZh: '期权异动与IV', availability: 'DATA_NOT_AVAILABLE' },
  { id: 'news_catalyst', name: 'News & Catalyst', nameZh: '资讯与催化剂', availability: 'AVAILABLE' },
  { id: 'market_regime', name: 'Market Regime', nameZh: '宏观大盘机制', availability: 'AVAILABLE' },
  { id: 'sector_regime', name: 'Sector Regime', nameZh: '行业轮动阶段', availability: 'AVAILABLE' },
  { id: 'multi_timeframe', name: 'Multi-Timeframe', nameZh: '多周期共振', availability: 'AVAILABLE' },
  { id: 'risk', name: 'Risk', nameZh: '交易风控与止损', availability: 'AVAILABLE' },
  { id: 'quant_score', name: 'Quant Score', nameZh: '量化综合评分', availability: 'AVAILABLE' }
];

const EXECUTABLE_FILTERS: FilterDefinition[] = [
  // 1. Universe
  {
    id: 'market',
    category: 'universe',
    name: 'Market Exchange',
    nameZh: '交易所市场',
    description: 'Filter by primary stock exchange (NYSE, NASDAQ, AMEX).',
    dataSource: 'UNIVERSE_DATABASE',
    valueType: 'enum',
    supportedTimeframes: ['1D'],
    operators: ['EQ', 'IN_SET'],
    enumOptions: [
      { label: 'All Exchanges', value: 'ALL' },
      { label: 'NASDAQ', value: 'NASDAQ' },
      { label: 'NYSE', value: 'NYSE' },
      { label: 'AMEX', value: 'AMEX' }
    ],
    availability: 'AVAILABLE'
  },
  {
    id: 'sector',
    category: 'universe',
    name: 'Sector',
    nameZh: 'GICS 核心板块',
    description: 'Filter by standard 11 GICS sectors.',
    dataSource: 'UNIVERSE_DATABASE',
    valueType: 'enum',
    supportedTimeframes: ['1D'],
    operators: ['EQ', 'IN_SET'],
    enumOptions: [
      { label: 'Technology', value: 'Technology' },
      { label: 'Healthcare', value: 'Healthcare' },
      { label: 'Financial Services', value: 'Financial Services' },
      { label: 'Consumer Cyclical', value: 'Consumer Cyclical' },
      { label: 'Communication Services', value: 'Communication Services' },
      { label: 'Industrials', value: 'Industrials' },
      { label: 'Energy', value: 'Energy' },
      { label: 'Consumer Defensive', value: 'Consumer Defensive' },
      { label: 'Real Estate', value: 'Real Estate' },
      { label: 'Utilities', value: 'Utilities' },
      { label: 'Materials', value: 'Materials' },
      { label: 'ETF', value: 'ETF' }
    ],
    availability: 'AVAILABLE'
  },
  {
    id: 'security_type',
    category: 'universe',
    name: 'Security Type',
    nameZh: '证券类型',
    description: 'Filter by security type: Common Stock, ADR, REIT, ETF.',
    dataSource: 'UNIVERSE_DATABASE',
    valueType: 'enum',
    supportedTimeframes: ['1D'],
    operators: ['EQ', 'IN_SET'],
    enumOptions: [
      { label: 'Common Stock', value: 'COMMON_STOCK' },
      { label: 'ADR', value: 'ADR' },
      { label: 'REIT', value: 'REIT' },
      { label: 'ETF', value: 'ETF' }
    ],
    availability: 'AVAILABLE'
  },

  // 2. Price & Market
  {
    id: 'price',
    category: 'price_market',
    name: 'Current Price',
    nameZh: '当前股价',
    description: 'Latest verified market close price.',
    dataSource: 'YAHOO_FINANCE_CHART_API',
    valueType: 'number',
    supportedTimeframes: ['10m', '30m', '1h', '2h', '4h', '1D', '1W', '1M'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'EQ', 'BETWEEN'],
    defaultValue: 10,
    min: 0,
    step: 0.5,
    unit: '$',
    availability: 'AVAILABLE'
  },
  {
    id: 'market_cap',
    category: 'price_market',
    name: 'Market Capitalization',
    nameZh: '公司总市值',
    description: 'Total market capitalization verified from universe database.',
    dataSource: 'UNIVERSE_DATABASE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'EQ', 'BETWEEN'],
    defaultValue: 2000000000,
    min: 0,
    step: 100000000,
    unit: '$',
    availability: 'AVAILABLE'
  },
  {
    id: 'market_cap_tier',
    category: 'price_market',
    name: 'Market Cap Tier',
    nameZh: '市值梯队',
    description: 'Mega (>$200B), Large ($10B-$200B), Mid ($2B-$10B), Small ($300M-$2B).',
    dataSource: 'UNIVERSE_DATABASE',
    valueType: 'enum',
    supportedTimeframes: ['1D'],
    operators: ['EQ', 'IN_SET'],
    enumOptions: [
      { label: 'Mega Cap (>$200B)', value: 'MEGA' },
      { label: 'Large Cap ($10B-$200B)', value: 'LARGE' },
      { label: 'Mid Cap ($2B-$10B)', value: 'MID' },
      { label: 'Small Cap ($300M-$2B)', value: 'SMALL' }
    ],
    availability: 'AVAILABLE'
  },

  // 3. Liquidity
  {
    id: 'avg_dollar_volume',
    category: 'liquidity',
    name: 'Average Dollar Volume (20D)',
    nameZh: '20日日均成交额',
    description: '20-day Average Daily Volume multiplied by Price. Crucial institutional liquidity filter.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    defaultValue: 25000000,
    min: 0,
    step: 5000000,
    unit: '$',
    availability: 'AVAILABLE',
    calculation: 'avg_volume_20d * price'
  },
  {
    id: 'avg_volume_20d',
    category: 'liquidity',
    name: 'Average Volume (20D)',
    nameZh: '20日日均成交量',
    description: '20-day average daily share volume.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    defaultValue: 1000000,
    min: 0,
    step: 100000,
    unit: 'shs',
    availability: 'AVAILABLE'
  },
  {
    id: 'avg_volume_50d',
    category: 'liquidity',
    name: 'Average Volume (50D)',
    nameZh: '50日日均成交量',
    description: '50-day average daily share volume.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    min: 0,
    step: 100000,
    unit: 'shs',
    availability: 'AVAILABLE'
  },

  // 4. Volume
  {
    id: 'relative_volume',
    category: 'volume',
    name: 'Relative Volume (RVOL)',
    nameZh: '相对量比 (RVOL)',
    description: 'Current bar volume divided by the historical 20-period average volume.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['10m', '30m', '1h', '2h', '4h', '1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    defaultValue: 1.2,
    min: 0.1,
    max: 20,
    step: 0.1,
    unit: 'x',
    availability: 'AVAILABLE',
    calculation: 'volume / avgVolume20'
  },
  {
    id: 'volume',
    category: 'volume',
    name: 'Current Volume',
    nameZh: '当前成交量',
    description: 'Latest bar volume in shares.',
    dataSource: 'YAHOO_FINANCE_CHART_API',
    valueType: 'number',
    supportedTimeframes: ['10m', '30m', '1h', '2h', '4h', '1D', '1W'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    min: 0,
    step: 10000,
    unit: 'shs',
    availability: 'AVAILABLE'
  },

  // 5. Volatility
  {
    id: 'atr_percent',
    category: 'volatility',
    name: 'ATR % (Volatility Ratio)',
    nameZh: '真实波幅比率 (ATR%)',
    description: '14-period Average True Range normalized as a percentage of current price.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1h', '2h', '4h', '1D', '1W'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    defaultValue: 2.5,
    min: 0,
    max: 30,
    step: 0.1,
    unit: '%',
    availability: 'AVAILABLE',
    calculation: 'ATR(14) / price * 100'
  },
  {
    id: 'atr',
    category: 'volatility',
    name: 'ATR (14)',
    nameZh: '真实波幅 (14周期)',
    description: '14-period Wilder Average True Range in dollars.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1h', '2h', '4h', '1D', '1W'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    min: 0,
    step: 0.1,
    unit: '$',
    availability: 'AVAILABLE'
  },
  {
    id: 'bollinger_percent_b',
    category: 'volatility',
    name: 'Bollinger %B',
    nameZh: '布林带 %B 位置',
    description: 'Relative position of price within Bollinger Bands (0.0 = Lower Band, 1.0 = Upper Band).',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['30m', '1h', '2h', '4h', '1D', '1W'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    min: -0.5,
    max: 1.5,
    step: 0.05,
    availability: 'AVAILABLE',
    calculation: '(Price - LowerBand) / (UpperBand - LowerBand)'
  },
  {
    id: 'bollinger_width_pct',
    category: 'volatility',
    name: 'Bollinger Band Width %',
    nameZh: '布林带宽度百分比',
    description: 'Bandwidth percentage衡量波动率收口与挤压。',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    min: 0,
    step: 0.5,
    unit: '%',
    availability: 'AVAILABLE'
  },

  // 6. Performance
  {
    id: 'changePercent',
    category: 'performance',
    name: '1D Change %',
    nameZh: '单日涨跌幅 (1D)',
    description: 'Percentage change over the current/latest trading bar.',
    dataSource: 'YAHOO_FINANCE_CHART_API',
    valueType: 'number',
    supportedTimeframes: ['10m', '30m', '1h', '2h', '4h', '1D', '1W', '1M'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    step: 0.2,
    unit: '%',
    availability: 'AVAILABLE'
  },
  {
    id: 'change5d',
    category: 'performance',
    name: '5D Return %',
    nameZh: '5日累计涨跌幅',
    description: 'Percentage change over the last 5 trading days.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    step: 0.5,
    unit: '%',
    availability: 'AVAILABLE'
  },
  {
    id: 'change20d',
    category: 'performance',
    name: '1M Return % (20D)',
    nameZh: '月度涨跌幅 (20日)',
    description: 'Percentage change over the last 20 trading days.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    step: 1,
    unit: '%',
    availability: 'AVAILABLE'
  },

  // 7. Trend
  {
    id: 'sma',
    category: 'trend',
    name: 'Simple Moving Average (SMA)',
    nameZh: '简单移动平均线 (SMA)',
    description: 'SMA of verified closing prices (Periods: 10, 20, 50, 100, 200).',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1h', '2h', '4h', '1D', '1W'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'CROSS_UP', 'CROSS_DOWN'],
    unit: '$',
    availability: 'AVAILABLE'
  },
  {
    id: 'ema',
    category: 'trend',
    name: 'Exponential Moving Average (EMA)',
    nameZh: '指数移动平均线 (EMA)',
    description: 'EMA of verified closing prices (Periods: 7, 9, 20, 21, 50, 200).',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1h', '2h', '4h', '1D', '1W'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'CROSS_UP', 'CROSS_DOWN'],
    unit: '$',
    availability: 'AVAILABLE'
  },
  {
    id: 'ma_trend_alignment',
    category: 'trend',
    name: 'MA Trend Alignment',
    nameZh: '均线多空排列状态',
    description: 'Evaluates Price > MA20 > MA50 > MA200 sequence.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'enum',
    supportedTimeframes: ['1D'],
    operators: ['EQ'],
    enumOptions: [
      { label: 'Bullish Alignment (多头排列)', value: 'BULLISH' },
      { label: 'Bearish Alignment (空头排列)', value: 'BEARISH' },
      { label: 'Neutral/Chop (震荡缠绕)', value: 'NEUTRAL' }
    ],
    availability: 'AVAILABLE'
  },

  // 8. Momentum
  {
    id: 'rsi',
    category: 'momentum',
    name: 'Wilder RSI',
    nameZh: 'J. Welles Wilder RSI',
    description: 'Wilder Continuous RSI formula (Periods: 6, 9, 14, 24).',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['10m', '30m', '1h', '2h', '4h', '1D', '1W', '1M'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'EQ', 'BETWEEN', 'CROSS_UP', 'CROSS_DOWN'],
    defaultValue: 30,
    min: 0,
    max: 100,
    step: 1,
    unit: 'pts',
    availability: 'AVAILABLE'
  },
  {
    id: 'macd_histogram',
    category: 'momentum',
    name: 'MACD Histogram',
    nameZh: 'MACD 柱状图',
    description: 'MACD (12, 26, 9) histogram divergence value.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['30m', '1h', '2h', '4h', '1D', '1W'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'CROSS_UP', 'CROSS_DOWN'],
    step: 0.1,
    unit: 'pts',
    availability: 'AVAILABLE'
  },
  {
    id: 'stochastic_k',
    category: 'momentum',
    name: 'Stochastic %K',
    nameZh: '随机指标 %K',
    description: 'Fast Stochastic %K (14, 3) oscillator level.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1h', '2h', '4h', '1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    min: 0,
    max: 100,
    unit: 'pts',
    availability: 'AVAILABLE'
  },
  {
    id: 'adx',
    category: 'momentum',
    name: 'ADX (Trend Strength)',
    nameZh: '平均趋向指数 (ADX)',
    description: 'Average Directional Index (14) measuring trend strength (>25 indicates strong trend).',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    min: 0,
    max: 100,
    unit: 'pts',
    availability: 'AVAILABLE'
  },

  // 9. Relative Strength
  {
    id: 'rs_rank',
    category: 'relative_strength',
    name: 'Relative Strength Rank (0-100)',
    nameZh: '全市场相对强弱排位 (RS Rank)',
    description: 'Performance percentile relative to SPY and the broader US equities market.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    defaultValue: 70,
    min: 0,
    max: 100,
    step: 1,
    unit: 'pts',
    availability: 'AVAILABLE'
  },
  {
    id: 'rs_vs_spy',
    category: 'relative_strength',
    name: 'Relative Alpha vs SPY',
    nameZh: '个股相对标普超额收益 (Alpha)',
    description: 'Stock 5D/20D percentage return minus SPY percentage return over same period.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    step: 0.5,
    unit: '%',
    availability: 'AVAILABLE'
  },

  // 10. Price Structure
  {
    id: 'distFrom52wHigh',
    category: 'price_structure',
    name: 'Distance from 52W High',
    nameZh: '距52周最高点距离',
    description: 'Percentage distance from the 52-week high (negative percentage indicates discount).',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    defaultValue: -5,
    min: -100,
    max: 0,
    step: 0.5,
    unit: '%',
    availability: 'AVAILABLE',
    calculation: '(Price - High52W) / High52W * 100'
  },
  {
    id: 'distFrom52wLow',
    category: 'price_structure',
    name: 'Distance from 52W Low',
    nameZh: '距52周最低点反弹幅',
    description: 'Percentage rebound above the 52-week low.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    min: 0,
    step: 1,
    unit: '%',
    availability: 'AVAILABLE',
    calculation: '(Price - Low52W) / Low52W * 100'
  },

  // 11. Technical Signals
  {
    id: 'donchian_breakout',
    category: 'technical_signals',
    name: 'Donchian Channel Breakout',
    nameZh: '唐奇安通道突破信号',
    description: 'Price breaks above the highest high of the prior 20 bars.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'boolean',
    supportedTimeframes: ['1D', '1W'],
    operators: ['EQ'],
    defaultValue: true,
    availability: 'AVAILABLE'
  },
  {
    id: 'darvas_box_breakout',
    category: 'technical_signals',
    name: 'Darvas Box Breakout',
    nameZh: '达瓦斯箱体突破信号',
    description: 'Price breaks out of a consolidated Darvas consolidation channel.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'boolean',
    supportedTimeframes: ['1D'],
    operators: ['EQ'],
    defaultValue: true,
    availability: 'AVAILABLE'
  },

  // 12. Mean Reversion
  {
    id: 'dist_ema20_atr',
    category: 'mean_reversion',
    name: 'Distance from EMA20 in ATRs',
    nameZh: '偏离EMA20的ATR倍数',
    description: 'Normalized distance between Price and EMA20 divided by ATR (<-1.5 indicates extreme stretch).',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    step: 0.1,
    unit: 'ATR',
    availability: 'AVAILABLE',
    calculation: '(Price - EMA20) / ATR'
  },

  // 13. Breakout
  {
    id: 'range_atr_multiple',
    category: 'breakout',
    name: 'Bar Range / ATR Multiple',
    nameZh: '单日振幅 / ATR 倍数',
    description: 'Measures volatility thrust on the breakout bar.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE'],
    defaultValue: 1.5,
    min: 0,
    step: 0.1,
    unit: 'x',
    availability: 'AVAILABLE'
  },
  {
    id: 'close_location_percent',
    category: 'breakout',
    name: 'Close Location Value (0-100)',
    nameZh: '收盘价处于K线区间百分位',
    description: 'Close relative to High-Low range (85+ means closing near the day high).',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE'],
    defaultValue: 80,
    min: 0,
    max: 100,
    unit: '%',
    availability: 'AVAILABLE',
    calculation: '(Close - Low) / (High - Low) * 100'
  },

  // 14. Pullback
  {
    id: 'pullback_healthy',
    category: 'pullback',
    name: 'Healthy Pullback Candidate',
    nameZh: '健康缩量回踩',
    description: 'Price pulling back toward EMA20/50 on contracting RVOL (< 1.0x).',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'boolean',
    supportedTimeframes: ['1D'],
    operators: ['EQ'],
    defaultValue: true,
    availability: 'AVAILABLE'
  },

  // 15. Fundamentals (PARTIAL)
  {
    id: 'pe_ratio',
    category: 'fundamentals',
    name: 'Price-to-Earnings Ratio',
    nameZh: '市盈率 (P/E)',
    description: 'P/E valuation metric where available from verified company reports.',
    dataSource: 'LOCAL_INDICATOR_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    min: 0,
    step: 1,
    availability: 'PARTIAL'
  },

  // 19. Earnings
  {
    id: 'days_to_earnings',
    category: 'earnings',
    name: 'Days Until Earnings Release',
    nameZh: '距财报披露交易日天数',
    description: 'Trading days until the next scheduled earnings report. <= 1 indicates high binary gap risk.',
    dataSource: 'SEC_EVENT_SERVICE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    defaultValue: 3,
    min: 0,
    unit: 'days',
    availability: 'AVAILABLE'
  },

  // 20. Ownership (DATA_NOT_AVAILABLE - Fail closed)
  {
    id: 'institutional_ownership_pct',
    category: 'ownership',
    name: 'Institutional Ownership %',
    nameZh: '机构持股比例',
    description: 'Requires SEC Form 13F live aggregator. Fails closed when provider not configured.',
    dataSource: 'UNAVAILABLE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE'],
    unit: '%',
    availability: 'DATA_NOT_AVAILABLE'
  },

  // 21. Short Interest (DATA_NOT_AVAILABLE - Fail closed)
  {
    id: 'short_float_pct',
    category: 'short_interest',
    name: 'Short Interest % of Float',
    nameZh: '空头占流通盘比率',
    description: 'Requires authoritative bi-monthly FINRA short interest feed.',
    dataSource: 'UNAVAILABLE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE'],
    unit: '%',
    availability: 'DATA_NOT_AVAILABLE'
  },

  // 22. Options (DATA_NOT_AVAILABLE - Fail closed)
  {
    id: 'options_implied_volatility',
    category: 'options',
    name: 'Implied Volatility (IV)',
    nameZh: '期权隐含波动率 (IV)',
    description: 'Requires OPRA live option surface feed. Fails closed without authorization.',
    dataSource: 'UNAVAILABLE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE'],
    unit: '%',
    availability: 'DATA_NOT_AVAILABLE'
  },

  // 23. News & Catalyst
  {
    id: 'catalyst_active',
    category: 'news_catalyst',
    name: 'Active Statutory Catalyst',
    nameZh: '存在法定重大催化事件',
    description: 'Official SEC 8-K, FDA approval or earnings beat catalyst identified by deterministic catalyst engine.',
    dataSource: 'LOCAL_CATALYST_ENGINE',
    valueType: 'boolean',
    supportedTimeframes: ['1D'],
    operators: ['EQ'],
    defaultValue: true,
    availability: 'AVAILABLE'
  },

  // 24. Market Regime
  {
    id: 'market_regime',
    category: 'market_regime',
    name: 'Market Regime State',
    nameZh: '大盘宏观状态',
    description: 'RISK_ON (多头进攻), NEUTRAL (平衡震荡), RISK_OFF (避险防守), CRASH (严重崩盘熔断).',
    dataSource: 'MARKET_REGIME_SERVICE',
    valueType: 'enum',
    supportedTimeframes: ['1D'],
    operators: ['EQ', 'IN_SET'],
    enumOptions: [
      { label: 'Risk-On (多头进攻)', value: 'RISK_ON' },
      { label: 'Neutral / Chop (震荡蓄势)', value: 'NEUTRAL' },
      { label: 'Risk-Off (避险防守)', value: 'RISK_OFF' },
      { label: 'Crash (崩盘熔断)', value: 'CRASH' }
    ],
    availability: 'AVAILABLE'
  },

  // 25. Sector Regime
  {
    id: 'sector_regime',
    category: 'sector_regime',
    name: 'Sector Rotation Stage',
    nameZh: '板块轮动阶段',
    description: 'Leading (领涨), Improving (改善), Weakening (转弱), Lagging (滞后).',
    dataSource: 'MARKET_REGIME_SERVICE',
    valueType: 'enum',
    supportedTimeframes: ['1D'],
    operators: ['EQ', 'IN_SET'],
    enumOptions: [
      { label: 'Leading (领涨主线)', value: 'LEADING' },
      { label: 'Improving (转强改善)', value: 'IMPROVING' },
      { label: 'Weakening (滞涨转弱)', value: 'WEAKENING' },
      { label: 'Lagging (弱势垫底)', value: 'LAGGING' }
    ],
    availability: 'AVAILABLE'
  },

  // 27. Risk
  {
    id: 'risk_reward_ratio',
    category: 'risk',
    name: 'Risk / Reward Ratio',
    nameZh: '预期盈亏比 (R:R)',
    description: 'Estimated potential reward divided by stop-loss distance. Minimum >= 1.5 recommended.',
    dataSource: 'LOCAL_RISK_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE'],
    defaultValue: 1.5,
    min: 0.5,
    step: 0.1,
    unit: 'x',
    availability: 'AVAILABLE'
  },
  {
    id: 'stop_distance_pct',
    category: 'risk',
    name: 'Effective Stop Distance %',
    nameZh: '有效止损空间百分比',
    description: 'Enforces the mandatory 5.0% hard-stop ceiling. Values > 5.0% are blocked.',
    dataSource: 'LOCAL_RISK_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['LTE'],
    defaultValue: 5.0,
    max: 5.0,
    unit: '%',
    availability: 'AVAILABLE'
  },

  // 28. Quant Score
  {
    id: 'quant_score',
    category: 'quant_score',
    name: 'Composite Quant Score',
    nameZh: '量化综合评分 (0-100)',
    description: 'Multifactor technical, momentum, liquidity, and regime composite score.',
    dataSource: 'LOCAL_QUANT_ENGINE',
    valueType: 'number',
    supportedTimeframes: ['1D'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    defaultValue: 75,
    min: 0,
    max: 100,
    unit: 'pts',
    availability: 'AVAILABLE'
  }
];

const registeredById = new Map(INDICATOR_REGISTRY.map(indicator => [indicator.id, indicator]));

export const FILTER_REGISTRY: FilterDefinition[] = EXECUTABLE_FILTERS.map(filter => {
  const indicator = registeredById.get(filter.id);
  return indicator
    ? {
        ...filter,
        operators: indicator.operators.length > 0 ? indicator.operators : filter.operators,
        supportedTimeframes: indicator.supportedTimeframes.length > 0 ? indicator.supportedTimeframes : filter.supportedTimeframes
      }
    : filter;
});

export function getFilterDefinition(id: string): FilterDefinition | undefined {
  return FILTER_REGISTRY.find(filter => filter.id === id);
}

export function getFiltersByCategory(category: string): FilterDefinition[] {
  return FILTER_REGISTRY.filter(filter => filter.category === category);
}

export function getAllFilterDefinitions(): FilterDefinition[] {
  return FILTER_REGISTRY;
}
