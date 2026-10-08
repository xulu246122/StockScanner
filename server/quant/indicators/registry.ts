import { IndicatorDefinition } from '../../types.ts';

export const INDICATOR_REGISTRY: IndicatorDefinition[] = [
  // ==========================================
  // 1. MOMENTUM INDICATORS
  // ==========================================
  {
    id: 'rsi',
    name: 'Relative Strength Index (Wilder RSI)',
    shortName: 'RSI',
    category: 'momentum',
    categoryLabel: '动量指标 (Momentum)',
    mathFormula: 'RSI = 100 - [100 / (1 + RS)], RS = Wilder_Smoothed_Gain / Wilder_Smoothed_Loss',
    description: 'J. Welles Wilder 经典相对强弱指标，衡量近 N 个周期上涨动能与下跌动能的速率比率。',
    parameters: {
      period: { label: 'Period', type: 'select', default: 14, options: [2, 6, 9, 14, 21, 24, 30] }
    },
    paramSchemas: [
      {
        id: 'period',
        name: '计算周期 (Period)',
        type: 'number',
        default: 14,
        min: 2,
        max: 100,
        step: 1,
        description: '标准参数为14；超短线均值回归常用2周期(Connors RSI)，快动量常用6或9周期。'
      },
      {
        id: 'overbought',
        name: '超买阈值 (Overbought)',
        type: 'number',
        default: 70,
        min: 50,
        max: 95,
        step: 1,
        description: '高于该阈值通常提示上行动能过度拉升，进入超买区域。'
      },
      {
        id: 'oversold',
        name: '超卖阈值 (Oversold)',
        type: 'number',
        default: 30,
        min: 5,
        max: 50,
        step: 1,
        description: '低于该阈值通常提示卖压过度释放，容易发生均值回归反弹。'
      }
    ],
    usageGuide: 'RSI在30以下为超卖区域，适合寻找做多反弹机会；70以上为超买区域；50中轴线代表多空强弱分水岭。',
    applicableScenarios: [
      '箱体震荡市场的反转交易 (Mean Reversion)',
      '主升浪中的极端超买预警与背离识别',
      '超短线2日RSI极度超卖抓反弹 (Connors Strategy)'
    ],
    riskWarnings: [
      '在强单边牛市中，RSI可能长时间高位钝化（维持在70-85），过早做空容易踏空或严重亏损。',
      '在主跌浪或系统性熊市中，RSI超卖后可能继续深跌出现负向钝化。'
    ],
    supportedTimeframes: ['10m', '30m', '1h', '2h', '4h', '1D', '1W', '1M'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'BETWEEN'],
    unit: 'pts',
    sourceReference: 'J. Welles Wilder, New Concepts in Technical Trading Systems (1978)'
  },
  {
    id: 'macd',
    name: 'Moving Average Convergence Divergence (MACD)',
    shortName: 'MACD',
    category: 'momentum',
    categoryLabel: '动量指标 (Momentum)',
    mathFormula: 'DIF = EMA(Fast) - EMA(Slow); DEA = EMA(DIF, Signal); Hist = (DIF - DEA) * 2',
    description: 'Gerald Appel 提出的异同移动平均线，反映短期指数均线与长期均线离散聚合的趋势与加速度。',
    parameters: {
      fast: { label: 'Fast Period', type: 'number', default: 12 },
      slow: { label: 'Slow Period', type: 'number', default: 26 },
      signal: { label: 'Signal Period', type: 'number', default: 9 }
    },
    paramSchemas: [
      {
        id: 'fast',
        name: '快线周期 (Fast EMA)',
        type: 'number',
        default: 12,
        min: 3,
        max: 50,
        step: 1,
        description: '短期指数移动平均线平滑周期，经典参数为 12。'
      },
      {
        id: 'slow',
        name: '慢线周期 (Slow EMA)',
        type: 'number',
        default: 26,
        min: 10,
        max: 100,
        step: 1,
        description: '长期基准指数移动平均线周期，经典参数为 26。'
      },
      {
        id: 'signal',
        name: '信号线周期 (Signal Line)',
        type: 'number',
        default: 9,
        min: 2,
        max: 30,
        step: 1,
        description: 'DIF 的平滑信号线 DEA 周期，经典参数为 9。'
      }
    ],
    usageGuide: '快线向上金叉慢线且位于零轴上方为极强买入信号；柱线由负转正且扩张代表动能翻多。',
    applicableScenarios: [
      '零轴上多头二次金叉爆发',
      '波段趋势启动加速度确认',
      '顶背离与底背离反转预警'
    ],
    riskWarnings: [
      '在无明确趋势的窄幅横盘市中，频繁产生假金叉假死叉拉锯损耗。',
      '均线计算具有固有滞后性，需结合成交量与形态。'
    ],
    supportedTimeframes: ['30m', '1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'SLOPE_UP', 'SLOPE_DOWN'],
    unit: 'pts',
    sourceReference: 'Gerald Appel, Systems and Forecasts (1979)'
  },
  {
    id: 'stochastic',
    name: 'Stochastic Oscillator (%K / %D)',
    shortName: 'Stoch',
    category: 'momentum',
    categoryLabel: '动量指标 (Momentum)',
    mathFormula: '%K = 100 * (Close - Lowest_Low_N) / (Highest_High_N - Lowest_Low_N); %D = SMA(%K, 3)',
    description: 'George Lane 提出的慢速随机摆动指标，通过当前收盘价在近期高低区间的相对位置判定动能转折。',
    parameters: {
      kPeriod: { label: '%K Period', type: 'number', default: 14 },
      dPeriod: { label: '%D Period', type: 'number', default: 3 }
    },
    paramSchemas: [
      {
        id: 'kPeriod',
        name: '%K 计算周期',
        type: 'number',
        default: 14,
        min: 3,
        max: 50,
        step: 1,
        description: '寻找极值高低点的回测周期，通常为 14。'
      },
      {
        id: 'dPeriod',
        name: '%D 平滑周期',
        type: 'number',
        default: 3,
        min: 2,
        max: 20,
        step: 1,
        description: '信号线平滑移动平均周期，通常为 3。'
      },
      {
        id: 'oversold',
        name: '超卖阈值',
        type: 'number',
        default: 20,
        min: 5,
        max: 40,
        step: 1,
        description: '低于20为极度超卖区。'
      }
    ],
    usageGuide: '%K 在 20 之下向上金叉 %D 产生超卖反转买点；在 80 之上死叉产生超买警告。',
    applicableScenarios: [
      '震荡市网格交易与通道高抛低吸',
      '顺大趋势中的次回踩超卖点'
    ],
    riskWarnings: [
      '在强趋势主升行情中快速触碰超买边界，若过早离场会错失主升波段。'
    ],
    supportedTimeframes: ['10m', '30m', '1h', '4h', '1D'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'BETWEEN'],
    unit: 'pts',
    sourceReference: 'George Lane, Technical Analysis of Stocks & Commodities (1984)'
  },

  // ==========================================
  // 2. TREND INDICATORS
  // ==========================================
  {
    id: 'sma',
    name: 'Simple Moving Average (SMA)',
    shortName: 'SMA',
    category: 'trend',
    categoryLabel: '趋势指标 (Trend)',
    mathFormula: 'SMA = (Close_1 + Close_2 + ... + Close_N) / N',
    description: '算术平均收盘价线，消除短期价格噪音，是机构判定中长期趋势最重要的基础锚点。',
    parameters: {
      period: { label: 'Period', type: 'select', default: 50, options: [10, 20, 50, 150, 200] }
    },
    paramSchemas: [
      {
        id: 'period',
        name: '均线周期 (Period)',
        type: 'number',
        default: 50,
        min: 5,
        max: 300,
        step: 5,
        description: '20日为短线生命线；50日为机构建仓成本线；200日为牛熊分水岭。'
      }
    ],
    usageGuide: '价格处于 200 SMA 之上且 50 SMA > 200 SMA 为经典 Stage 2 牛市上升通道。',
    applicableScenarios: [
      '大盘及个股多头排列趋势过滤 (Minervini Trend Template)',
      '动态支撑线与回调企稳确认'
    ],
    riskWarnings: [
      '滞后性显著，在急跌暴跌时无法提供即时逃顶信号。'
    ],
    supportedTimeframes: ['1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN'],
    unit: '$'
  },
  {
    id: 'ema',
    name: 'Exponential Moving Average (EMA)',
    shortName: 'EMA',
    category: 'trend',
    categoryLabel: '趋势指标 (Trend)',
    mathFormula: 'EMA_t = [Close_t * (2 / (N + 1))] + [EMA_{t-1} * (1 - (2 / (N + 1)))]',
    description: '加权指数移动平均线，赋予近期价格更高权重，对价格趋势反转响应更灵敏。',
    parameters: {
      period: { label: 'Period', type: 'select', default: 21, options: [9, 13, 21, 34, 55] }
    },
    paramSchemas: [
      {
        id: 'period',
        name: '指数均线周期 (Period)',
        type: 'number',
        default: 21,
        min: 3,
        max: 100,
        step: 1,
        description: '9与21 EMA 常用于短线动量追踪；13 EMA 为 Elder Impulse 系统核心。'
      }
    ],
    usageGuide: '短周期 EMA 上穿长周期 EMA（如 9 EMA 上穿 21 EMA）作为激进动量进场依据。',
    applicableScenarios: [
      '短线动能加速买入',
      '移动追踪止损线 (Trailing Stop)'
    ],
    riskWarnings: [
      '横盘整理行情中噪音较多，容易产生连续止损磨损。'
    ],
    supportedTimeframes: ['10m', '30m', '1h', '4h', '1D'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'SLOPE_UP', 'SLOPE_DOWN'],
    unit: '$'
  },
  {
    id: 'adx',
    name: 'Average Directional Index (ADX / DMI)',
    shortName: 'ADX',
    category: 'trend',
    categoryLabel: '趋势指标 (Trend)',
    mathFormula: 'ADX = Wilder_EMA(DX, N), DX = 100 * |+DI - -DI| / (+DI + -DI)',
    description: 'J. Welles Wilder 趋向系统，专门量化趋势强度的绝对值，不包含方向偏见。',
    parameters: {
      period: { label: 'Period', type: 'number', default: 14 }
    },
    paramSchemas: [
      {
        id: 'period',
        name: '计算周期 (Period)',
        type: 'number',
        default: 14,
        min: 5,
        max: 50,
        step: 1,
        description: '标准经典参数为 14。'
      },
      {
        id: 'trendThreshold',
        name: '趋势确认阈值',
        type: 'number',
        default: 25,
        min: 15,
        max: 40,
        step: 1,
        description: 'ADX > 25 判定为强趋势市场；ADX < 20 判定为无趋势震荡行情。'
      }
    ],
    usageGuide: 'ADX > 25 且 +DI > -DI 时，表明多头单边趋势极强，顺势突破策略胜率极高。',
    applicableScenarios: [
      '趋势跟踪策略有效性过滤器',
      '突破真假鉴别（过滤低 ADX 的假突破）'
    ],
    riskWarnings: [
      'ADX 极高（>50）时趋势已处于极度成熟后期，易发生剧烈衰竭反转。'
    ],
    supportedTimeframes: ['1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'BETWEEN'],
    unit: 'pts',
    sourceReference: 'J. Welles Wilder, New Concepts in Technical Trading Systems (1978)'
  },

  // ==========================================
  // 3. VOLATILITY INDICATORS
  // ==========================================
  {
    id: 'atr',
    name: 'Average True Range (ATR)',
    shortName: 'ATR',
    category: 'volatility',
    categoryLabel: '波动率指标 (Volatility)',
    mathFormula: 'TR = MAX(High - Low, |High - PrevClose|, |Low - PrevClose|); ATR = Wilder_Smoothed(TR, N)',
    description: '真实波幅均值，剥离价格方向，纯粹量化标的绝对价格波动幅度，是机构风控与头寸管理的核心基础。',
    parameters: {
      period: { label: 'Period', type: 'number', default: 14 }
    },
    paramSchemas: [
      {
        id: 'period',
        name: '平滑周期 (Period)',
        type: 'number',
        default: 14,
        min: 3,
        max: 50,
        step: 1,
        description: '标准参数为 14 周期。'
      }
    ],
    usageGuide: '通常用于设置动态止损位（如入场价 - 2 * ATR），以及根据波动率逆向定头寸（波动大仓位轻）。',
    applicableScenarios: [
      '动态波动率止损 (Chandelier Exit / ATR Trailing Stop)',
      '突破爆发确认（价格突破当日幅度超过 1.5 ATR）'
    ],
    riskWarnings: [
      'ATR 无法判断上涨或下跌方向，仅反映波动烈度。'
    ],
    supportedTimeframes: ['1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'BETWEEN'],
    unit: '$',
    sourceReference: 'J. Welles Wilder, New Concepts in Technical Trading Systems (1978)'
  },
  {
    id: 'bollinger',
    name: 'Bollinger Bands (Width & %B)',
    shortName: 'Bollinger',
    category: 'volatility',
    categoryLabel: '波动率指标 (Volatility)',
    mathFormula: 'Mid = SMA(N); Upper = Mid + K*σ; Lower = Mid - K*σ; %B = (Close - Lower)/(Upper - Lower)',
    description: 'John Bollinger 统计学包络线，利用标准差衡量价格波动离散度与极限通道。',
    parameters: {
      period: { label: 'Period', type: 'number', default: 20 },
      stdDev: { label: 'Std Dev', type: 'number', default: 2 }
    },
    paramSchemas: [
      {
        id: 'period',
        name: '基准周期 (Period)',
        type: 'number',
        default: 20,
        min: 5,
        max: 100,
        step: 1,
        description: '经典参数为 20。'
      },
      {
        id: 'stdDevMultiplier',
        name: '标准差倍数 (StdDev Multiplier)',
        type: 'number',
        default: 2.0,
        min: 1.0,
        max: 3.5,
        step: 0.1,
        description: '覆盖 95.4% 的正态价格分布，标准取 2.0。'
      }
    ],
    usageGuide: '带宽压缩（Squeeze）至极值预示巨大单边行情即将爆发；价格破上轨且带宽放大为暴涨启动。',
    applicableScenarios: [
      '布林收口压缩变盘突破 (Bollinger Squeeze Breakout)',
      '通道内逆向摆动回归'
    ],
    riskWarnings: [
      '通道紧贴上轨单边拉升时，盲目以“触碰上轨超买”做空极具破坏性。'
    ],
    supportedTimeframes: ['30m', '1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'BETWEEN', 'CROSS_UP', 'CROSS_DOWN'],
    unit: 'pts',
    sourceReference: 'John Bollinger, Bollinger on Bollinger Bands (2001)'
  },

  // ==========================================
  // 4. VOLUME INDICATORS
  // ==========================================
  {
    id: 'relative_volume',
    name: 'Relative Volume Ratio (RVOL)',
    shortName: 'RVOL',
    category: 'volume',
    categoryLabel: '成交量指标 (Volume)',
    mathFormula: 'RVOL = Current_Volume / 20_Day_Average_Volume',
    description: '相对成交量比率，将当前成交量与过去 20 交易日同时间窗口均量比值标准化，捕捉主力异动。',
    parameters: {
      lookback: { label: 'Lookback Period', type: 'number', default: 20 }
    },
    paramSchemas: [
      {
        id: 'threshold',
        name: '放量门槛比率',
        type: 'number',
        default: 1.5,
        min: 1.0,
        max: 5.0,
        step: 0.1,
        description: '1.5x 以上代表显著机构资金介入；2.0x 以上为极端放量。'
      }
    ],
    usageGuide: '任何突破策略（如箱体、52周新高）若无 RVOL ≥ 1.2-1.5x 支持，假突破概率增加 60% 以上。',
    applicableScenarios: [
      '量价齐升有效突破过滤',
      '盘中资金异常扫货监控'
    ],
    riskWarnings: [
      '财报季或重大事件导致的放量假突破高开低走（长上影线）。'
    ],
    supportedTimeframes: ['10m', '30m', '1h', '1D'],
    operators: ['GT', 'GTE', 'LT', 'BETWEEN'],
    unit: 'x'
  },
  {
    id: 'obv',
    name: 'On-Balance Volume (OBV)',
    shortName: 'OBV',
    category: 'volume',
    categoryLabel: '成交量指标 (Volume)',
    mathFormula: 'IF Close > PrevClose THEN OBV = PrevOBV + Volume; IF Close < PrevClose THEN OBV = PrevOBV - Volume',
    description: 'Joseph Granville 提出的能量潮指标，将成交量赋予正负方向累加，衡量多空主力净资金沉淀。',
    parameters: {},
    paramSchemas: [],
    usageGuide: 'OBV 领先创出新高而价格尚未突破时，为高可靠性底仓潜伏看涨先兆。',
    applicableScenarios: [
      '量价底背离与机构吸筹识别',
      '突破有效性的成交量深度验证'
    ],
    riskWarnings: [
      '遇超大巨量单日异动（如指数调仓）可能导致数值跳变失真。'
    ],
    supportedTimeframes: ['1D', '1W'],
    operators: ['SLOPE_UP', 'SLOPE_DOWN', 'GT'],
    unit: 'vol',
    sourceReference: 'Joseph Granville, Granville\'s New Strategy of Daily Stock Market Timing (1963)'
  },

  // ==========================================
  // 5. PRICE & STRUCTURE INDICATORS
  // ==========================================
  {
    id: 'distFrom52wHigh',
    name: 'Distance from 52-Week High',
    shortName: 'Dist 52w High',
    category: 'price',
    categoryLabel: '价格与形态 (Price & Structure)',
    mathFormula: 'Dist = ((Close - 52_Week_High) / 52_Week_High) * 100',
    description: '当前股价相对过去 52 周最高点的百分比距离，是动量学派与欧奈尔模型选强不选弱的核心标准。',
    parameters: {},
    paramSchemas: [
      {
        id: 'threshold',
        name: '距高点上限百分比',
        type: 'number',
        default: -15,
        min: -50,
        max: 0,
        step: 1,
        description: '例如 -15% 表示股价在 52 周高点下方 15% 以内，过滤掉深陷阴跌泥潭的弱势标的。'
      }
    ],
    usageGuide: '领导股与十倍股爆发通常发生在其距离历史/52周新高 15%–20% 的紧凑整合区间。',
    applicableScenarios: [
      'CANSLIM 与 SEPA 强势股首轮筛选',
      '规避重套牢盘弱势股'
    ],
    riskWarnings: [
      '高位突破失败可能形成双顶或中期阶段性顶部。'
    ],
    supportedTimeframes: ['1D', '1W'],
    operators: ['GT', 'LT', 'BETWEEN'],
    unit: '%'
  },
  {
    id: 'changePercent',
    name: 'Price Change %',
    shortName: 'Chg%',
    category: 'price',
    categoryLabel: '价格与形态 (Price & Structure)',
    mathFormula: 'Chg% = ((Close - PrevClose) / PrevClose) * 100',
    description: '相对前一交易周期的涨跌幅度百分比，用于日内或波段动能强弱初筛。',
    parameters: {},
    paramSchemas: [
      {
        id: 'minChange',
        name: '最小涨幅要求 (%)',
        type: 'number',
        default: 0,
        min: -10,
        max: 20,
        step: 0.5,
        description: '通常要求突破当日收盘为正涨幅 (>0%)。'
      }
    ],
    usageGuide: '配合突破形态使用，确保介入当天买方完全主导控盘。',
    applicableScenarios: ['日线收阳过滤', '涨停与大阳线爆发扫描'],
    riskWarnings: ['单日涨幅过大（>10%）次日容易遭遇冲高回落获利盘抛压。'],
    supportedTimeframes: ['10m', '30m', '1h', '1D', '1W'],
    operators: ['GT', 'GTE', 'LT', 'BETWEEN'],
    unit: '%'
  },
  {
    id: 'price',
    name: 'Current Close Price',
    shortName: 'Price',
    category: 'price',
    categoryLabel: '价格与形态 (Price & Structure)',
    mathFormula: 'Price = Latest Executed Transaction Price',
    description: '当前最新成交价格，用于过滤过低低价股（Penny Stocks）以保证流动性。',
    parameters: {},
    paramSchemas: [
      {
        id: 'minPrice',
        name: '最低股价限制 ($)',
        type: 'number',
        default: 10,
        min: 1,
        max: 100,
        step: 1,
        description: '机构通常要求股价高于 $10 或 $15 以避免仙股流动性风险。'
      }
    ],
    usageGuide: '结合市值指标共同设立标的流动性准入门槛。',
    applicableScenarios: ['全市场流动性基本面过滤'],
    riskWarnings: ['高价股与低价股波动率特征差异显著。'],
    supportedTimeframes: ['10m', '30m', '1h', '1D', '1W'],
    operators: ['GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
    unit: '$'
  }
];

export function getIndicatorDefinition(id: string): IndicatorDefinition | undefined {
  return INDICATOR_REGISTRY.find(i => i.id === id);
}
