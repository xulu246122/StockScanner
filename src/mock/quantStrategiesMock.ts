import { StrategyDefinition, IndicatorDefinition } from '../types.ts';
import { ensureStrategyModes } from '../engine/strategyModesHelper.ts';
import { RAW_STRATEGY_REGISTRY } from '../../server/quant/strategies/registry.ts';

export const RAW_MOCK_QUANT_STRATEGIES: StrategyDefinition[] = RAW_STRATEGY_REGISTRY;

export const MOCK_QUANT_STRATEGIES: StrategyDefinition[] = RAW_MOCK_QUANT_STRATEGIES.map(s => ensureStrategyModes(s));

export const MOCK_QUANT_INDICATORS: IndicatorDefinition[] = [
  {
    id: 'rsi',
    name: 'Relative Strength Index (Wilder RSI)',
    shortName: 'RSI',
    category: 'momentum',
    categoryLabel: '动量指标',
    mathFormula: 'RSI = 100 - [100 / (1 + RS)], RS = AvgGain / AvgLoss',
    description: 'J. Welles Wilder 经典相对强弱指标，衡量近 N 个周期上涨动能与下跌动能的速率比率。',
    parameters: {},
    supportedTimeframes: ['10m', '30m', '1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'BETWEEN'],
    unit: 'pts'
  },
  {
    id: 'macd',
    name: 'Moving Average Convergence Divergence (MACD)',
    shortName: 'MACD',
    category: 'momentum',
    categoryLabel: '动量指标',
    mathFormula: 'DIF = EMA(12) - EMA(26); DEA = EMA(DIF, 9); Hist = (DIF - DEA) * 2',
    description: 'Gerald Appel 提出的异同移动平均线，反映短期指数均线与长期均线离散聚合的趋势与加速度。',
    parameters: {},
    supportedTimeframes: ['30m', '1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'SLOPE_UP', 'SLOPE_DOWN'],
    unit: 'pts'
  },
  {
    id: 'relative_volume',
    name: 'Relative Volume Ratio (RVOL)',
    shortName: 'RVOL',
    category: 'volume',
    categoryLabel: '成交量指标',
    mathFormula: 'RVOL = Current_Volume / 20_Day_Average_Volume',
    description: '相对成交量比率，将当前成交量与过去 20 交易日均量比值标准化，捕捉主力异动。',
    parameters: {},
    supportedTimeframes: ['10m', '30m', '1h', '1D'],
    operators: ['GT', 'GTE', 'LT', 'BETWEEN'],
    unit: 'x'
  },
  {
    id: 'distFrom52wHigh',
    name: 'Distance from 52-Week High',
    shortName: 'Dist 52w High',
    category: 'price',
    categoryLabel: '价格与形态',
    mathFormula: 'Dist = ((Close - 52_Week_High) / 52_Week_High) * 100',
    description: '当前股价相对过去 52 周最高点的百分比距离，是欧奈尔与动量学派选强不选弱的核心标准。',
    parameters: {},
    supportedTimeframes: ['1D', '1W'],
    operators: ['GT', 'LT', 'BETWEEN'],
    unit: '%'
  }
];
