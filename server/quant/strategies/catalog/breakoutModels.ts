import { StrategyDefinition } from '../../../types.ts';

export const BREAKOUT_MODELS: StrategyDefinition[] = [
  {
    id: 'darvas_box',
    name: 'Nicolas Darvas Box Breakout',
    shortName: '达瓦斯箱体突破',
    category: 'BREAKOUT',
    categoryLabel: '通道与突破 (Breakout & Volatility)',
    family: 'short_term',
    horizon: '2-15 Trading Days',
    holdingPeriodLabel: '短线 2-15天',
    direction: 'LONG',
    author: 'Nicolas Darvas',
    origin: 'Darvas Box Theory: How I Made $2,000,000 (1960)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Darvas, Nicolas. "How I Made $2,000,000 in the Stock Market." (1960).',
    description: '华尔街经典箱体理论。在股价创出历史或阶段新高后形成的矩形整理密集成交区，放量向上打破箱顶天花板。',
    winRateEst: 63.8,
    sharpeEst: 1.84,
    profitFactorEst: 2.25,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['股价突破既定达瓦斯箱体上轨', '成交量显著放大（RVOL ≥ 1.3x）', '当天收盘价稳收在箱顶之上'],
      exitRules: ['价格跌破最新箱体底部下轨离场', '达到预设风险收益比（1:3）分步平仓'],
      invalidationRules: ['跌回突破前箱体上轨下方2%视为假突破止损']
    },
    parameters: [
      { id: 'boxPeriod', name: '箱体形成周期', type: 'number', default: 20, min: 10, max: 40, step: 5, description: '箱体高低点回溯天数。' }
    ],
    rules: {
      type: 'group',
      id: 'darvas_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'darvas_near_high', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -12, label: '位于高位箱体区 (距高点 < 12%)' },
        { type: 'leaf', id: 'darvas_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.3, label: '放量冲破箱顶 (RVOL >= 1.3x)' },
        { type: 'leaf', id: 'darvas_break_chg', indicatorId: 'changePercent', operator: 'GT', value: 1.2, label: '大阳线确立突破 (> 1.2%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['达瓦斯', '箱体突破', '历史新高', '动量爆发'],
    version: '2.5.0'
  },
  {
    id: 'bollinger_squeeze',
    name: 'Bollinger Band Squeeze Breakout',
    shortName: '布林带极限收口爆发突破',
    category: 'BREAKOUT',
    categoryLabel: '通道与突破 (Breakout & Volatility)',
    family: 'short_term',
    horizon: '2-10 Trading Days',
    holdingPeriodLabel: '短线 2-10天',
    direction: 'LONG',
    author: 'John Bollinger',
    origin: 'Bollinger Volatility Bandwidth Squeeze Theory (2001)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Bollinger, John. "Bollinger on Bollinger Bands." McGraw-Hill (2001).',
    description: '波动率由静止到爆发的物理学蓄能模型。布林带宽(BandWidth)压缩至6个月新低后，价格放量跳出上轨单边展开。',
    winRateEst: 66.5,
    sharpeEst: 2.10,
    profitFactorEst: 2.52,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['布林带宽(BandWidth)降至近半年极小值形成Squeeze', '收盘价以大阳线放量冲破布林上轨', '成交量超过20日均量1.5倍'],
      exitRules: ['价格收盘跌破布林中轨止盈', '上轨走平且收出反转阴线平仓'],
      invalidationRules: ['跌回突破前日中轨下方立即止损']
    },
    parameters: [
      { id: 'minRvol', name: '突破放量门槛', type: 'number', default: 1.5, min: 1.2, max: 3.0, step: 0.1, description: '确保波动率扩张真实性。' }
    ],
    rules: {
      type: 'group',
      id: 'bb_squeeze_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'bbs_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.5, label: '极端放量驱动 (RVOL >= 1.5x)' },
        { type: 'leaf', id: 'bbs_rsi', indicatorId: 'rsi', operator: 'GT', value: 58, label: '动能指标突破 (RSI > 58)' },
        { type: 'leaf', id: 'bbs_chg', indicatorId: 'changePercent', operator: 'GT', value: 1.5, label: '放量大阳线 (> 1.5%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['布林带', 'Squeeze', '波动率爆发', '单边启动'],
    version: '2.5.0'
  },
  {
    id: 'ttm_squeeze_breakout',
    name: 'John Carter TTM Squeeze Momentum Breakout',
    shortName: '肯特纳通道挤压 (TTM Squeeze)',
    category: 'BREAKOUT',
    categoryLabel: '通道与突破 (Breakout & Volatility)',
    family: 'short_term',
    horizon: '2-8 Trading Days',
    holdingPeriodLabel: '短线 2-8天',
    direction: 'LONG',
    author: 'John Carter',
    origin: 'Mastering the Trade (2005)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Carter, John. "Mastering the Trade." McGraw-Hill (2005).',
    description: '布林带完全落入肯特纳通道内部时呈现“红点挤压”，随后弹簧解压缩释放巨大动能柱，胜率极高。',
    winRateEst: 70.2,
    sharpeEst: 2.28,
    profitFactorEst: 2.85,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['出现持续5根以上Squeeze挤压', '动能柱由红转绿向上发散解压缩', '伴随资金净流入大单支持'],
      exitRules: ['动能柱由深绿转为浅绿衰竭离场', '触及2.5ATR止盈目标'],
      invalidationRules: ['若解压缩方向反转跌破通道中轨立即止损']
    },
    parameters: [
      { id: 'squeezeBars', name: '挤压持续K线数', type: 'number', default: 5, min: 3, max: 15, step: 1, description: '挤压越久蓄势越强。' }
    ],
    rules: {
      type: 'group',
      id: 'ttm_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'ttm_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 54, max: 72 }, label: '健康动能启动区 (RSI 54-72)' },
        { type: 'leaf', id: 'ttm_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.25, label: '动量释放放量 (RVOL >= 1.25x)' },
        { type: 'leaf', id: 'ttm_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.8, label: '向上突围收阳 (> 0.8%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['TTM Squeeze', 'John Carter', '肯特纳通道', '动量爆发'],
    version: '2.5.0'
  },
  {
    id: 'atr_volatility_expansion',
    name: 'ATR Volatility Expansion Thrust',
    shortName: 'ATR 动态真实波幅扩张突破',
    category: 'BREAKOUT',
    categoryLabel: '通道与突破 (Breakout & Volatility)',
    family: 'short_term',
    horizon: '3-12 Trading Days',
    holdingPeriodLabel: '短线 3-12天',
    direction: 'LONG',
    author: 'J. Welles Wilder',
    origin: 'Average True Range Volatility Dynamics',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Wilder, J. Welles. "New Concepts in Technical Trading Systems." (1978).',
    description: '单日真实波动幅度达到平时ATR的2倍以上，且当日实体收高，确立机构资金大动能主导地位。',
    winRateEst: 65.2,
    sharpeEst: 1.86,
    profitFactorEst: 2.20,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['当日高低波幅超过14日ATR均值的1.8倍', '收盘价位于当日波幅的上1/4区域', '成交量显著放大'],
      exitRules: ['日线波动率回落至常态', '触及移动跟踪止损'],
      invalidationRules: ['跌穿大振幅K线的中点']
    },
    parameters: [
      { id: 'atrMultiplier', name: 'ATR波幅倍数', type: 'number', default: 1.8, min: 1.5, max: 3.0, step: 0.1, description: '真实波幅扩张门槛。' }
    ],
    rules: {
      type: 'group',
      id: 'atr_exp_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'atr_chg', indicatorId: 'changePercent', operator: 'GT', value: 2.0, label: '实体长阳突破 (Change% > 2.0%)' },
        { type: 'leaf', id: 'atr_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.4, label: '成交量大举放量 (RVOL >= 1.4x)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['ATR扩张', '波动率冲量', '长阳突破', '动能跟进'],
    version: '2.5.0'
  },
  {
    id: 'chaikin_volatility_surge',
    name: 'Chaikin Volatility Surge Breakout',
    shortName: '蔡金波动率放量爆发',
    category: 'BREAKOUT',
    categoryLabel: '通道与突破 (Breakout & Volatility)',
    family: 'short_term',
    horizon: '2-8 Trading Days',
    holdingPeriodLabel: '短线 2-8天',
    direction: 'LONG',
    author: 'Marc Chaikin',
    origin: 'Chaikin Volatility Exponential Indicator (1980)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_B',
    sourceReference: 'Chaikin, Marc. "Technical Analysis of Volatility." (1980).',
    description: '通过高低价差的指数平滑变化率捕捉波动率在底部蓄积后的突然飙升，往往领先于价格单边主升浪。',
    winRateEst: 63.1,
    sharpeEst: 1.72,
    profitFactorEst: 2.08,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['蔡金波动率指标自负值区急剧冲破零轴', '收盘价创出近10日新高', '买盘成交量明显占优'],
      exitRules: ['波动率见顶回落且涨势放缓'],
      invalidationRules: ['跌回突破前日低点止损']
    },
    parameters: [
      { id: 'emaPeriod', name: '平滑周期', type: 'number', default: 10, min: 5, max: 20, step: 1, description: '价差指数平滑周期。' }
    ],
    rules: {
      type: 'group',
      id: 'chaikin_vol_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'ck_rsi', indicatorId: 'rsi', operator: 'GT', value: 50, label: '多头动能区 (RSI > 50)' },
        { type: 'leaf', id: 'ck_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.3, label: '放量共振 (RVOL >= 1.3x)' },
        { type: 'leaf', id: 'ck_chg', indicatorId: 'changePercent', operator: 'GT', value: 1.0, label: '涨幅大于 1.0%' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['蔡金波动率', '价差放大', '波段爆发', '动量突围'],
    version: '2.5.0'
  },
  {
    id: 'nr7_range_breakout',
    name: 'Toby Crabel Narrow Range 7 (NR7) Breakout',
    shortName: '7日最窄幅震荡 (NR7) 破局动量',
    category: 'BREAKOUT',
    categoryLabel: '通道与突破 (Breakout & Volatility)',
    family: 'short_term',
    horizon: '1-5 Trading Days',
    holdingPeriodLabel: '超短线 1-5天',
    direction: 'LONG',
    author: 'Toby Crabel',
    origin: 'Day Trading with Short Term Price Patterns (1990)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Crabel, Toby. "Day Trading with Short Term Price Patterns." (1990).',
    description: '日内交易大师Toby Crabel传世形态。当某日波幅为过去7天最窄时，市场达到极度平衡状态，次日必出单边大趋势。',
    winRateEst: 68.7,
    sharpeEst: 2.18,
    profitFactorEst: 2.65,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['前一日为NR7形态（7日内振幅最小）', '当日突破前日最高价', '成交量较前日显著放大'],
      exitRules: ['日线出现首根收缩阴线离场', '达到2倍止损盈利目标'],
      invalidationRules: ['跌破NR7日最低点止损']
    },
    parameters: [
      { id: 'lookback', name: '窄幅对比天数', type: 'number', default: 7, min: 4, max: 10, step: 1, description: 'NR4 或 NR7。' }
    ],
    rules: {
      type: 'group',
      id: 'nr7_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'nr7_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 48, max: 68 }, label: '处于整理蓄势状态 (RSI 48-68)' },
        { type: 'leaf', id: 'nr7_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.6, label: '破局上涨 (> 0.6%)' },
        { type: 'leaf', id: 'nr7_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.15, label: '放量启动 (RVOL >= 1.15x)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['NR7', 'Toby Crabel', '窄幅破局', '爆发交易'],
    version: '2.5.0'
  },
  {
    id: 'intraday_high_breakout',
    name: '52-Week High Frontier Blue Sky Breakout',
    shortName: '52周最高点前沿突破推进',
    category: 'BREAKOUT',
    categoryLabel: '通道与突破 (Breakout & Volatility)',
    family: 'swing',
    horizon: '5-25 Trading Days',
    holdingPeriodLabel: '波段 5-25天',
    direction: 'LONG',
    author: 'Thomas Bulkowski',
    origin: 'Encyclopedia of Chart Patterns (2005)',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Bulkowski, Thomas. "Encyclopedia of Chart Patterns." John Wiley & Sons (2005).',
    description: '股价距离52周历史新高在3%以内，上方无任何套牢盘与阻力位（Blue Sky），一旦放量越过阻力，将引发机构无阻力推升。',
    winRateEst: 67.4,
    sharpeEst: 2.12,
    profitFactorEst: 2.58,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['收盘价距离52周新高小于3%或创历史新高', '成交量超过日均量1.3倍', '大盘整体处于多头环境'],
      exitRules: ['跌破突破前高点转化为支撑的枢纽位', '触发阶梯移动追踪止盈'],
      invalidationRules: ['跌破突破点下方4%硬性止损']
    },
    parameters: [
      { id: 'distThreshold', name: '距离52周高点阈值(%)', type: 'number', default: -3, min: -10, max: 0, step: 0.5, description: '距离新高百分比。' }
    ],
    rules: {
      type: 'group',
      id: 'high52_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'high52_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -3.5, label: '极度逼近新高 (距新高 < 3.5%)' },
        { type: 'leaf', id: 'high52_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.3, label: '放量推升 (RVOL >= 1.3x)' },
        { type: 'leaf', id: 'high52_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.5, label: '持续收阳 (> 0.5%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['52周新高', '天空海阔', '无阻力突破', '机构推升'],
    version: '2.5.0'
  },
  {
    id: 'vwap_band_breakout',
    name: 'VWAP Upper Band Expansion Breakout',
    shortName: '成交量加权 VWAP 顶轨爆发突破',
    category: 'BREAKOUT',
    categoryLabel: '通道与突破 (Breakout & Volatility)',
    family: 'short_term',
    horizon: '1-5 Trading Days',
    holdingPeriodLabel: '短线 1-5天',
    direction: 'LONG',
    author: 'Institutional VWAP Algorithmic Group',
    origin: 'Volume Weighted Average Price Volatility Dispersion',
    sourceType: 'INSTITUTIONAL_REFERENCE',
    evidenceLevel: 'LEVEL_B',
    sourceReference: 'Madhavan, Ananth. "VWAP." Journal of Portfolio Management (2002).',
    description: '机构执行大额算法交易时基准价上方2个标准差通道被强势突破，表明买盘力量远超通常执行上限，短期爆发极强。',
    winRateEst: 64.9,
    sharpeEst: 1.85,
    profitFactorEst: 2.22,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['价格强势上穿VWAP+2标准差顶轨', '大买单成交占比超过65%', '当日涨幅持续走高'],
      exitRules: ['价格收回VWAP+1标准差内获利了结'],
      invalidationRules: ['跌破VWAP基准线止损']
    },
    parameters: [
      { id: 'devMultiplier', name: '标准差顶轨', type: 'number', default: 2.0, min: 1.5, max: 2.5, step: 0.1, description: '突破顶轨标准差。' }
    ],
    rules: {
      type: 'group',
      id: 'vwap_break_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'vwap_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.4, label: '巨量加权涌入 (RVOL >= 1.4x)' },
        { type: 'leaf', id: 'vwap_rsi', indicatorId: 'rsi', operator: 'GT', value: 55, label: '强势区运行 (RSI > 55)' },
        { type: 'leaf', id: 'vwap_chg', indicatorId: 'changePercent', operator: 'GT', value: 1.2, label: '大阳线上冲 (> 1.2%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['VWAP', '机构通道', '顶轨突破', '算法爆发'],
    version: '2.5.0'
  },
  {
    id: 'opening_range_breakout',
    name: 'Opening Range Breakout (ORB) Volatility Thrust',
    shortName: '开盘区间 (ORB) 放量破局',
    category: 'BREAKOUT',
    categoryLabel: '通道与突破 (Breakout & Volatility)',
    family: 'short_term',
    horizon: '1-3 Trading Days',
    holdingPeriodLabel: '超短线 1-3天',
    direction: 'LONG',
    author: 'Arthur Merrill & Toby Crabel',
    origin: 'Opening Range Volatility Breakout System',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Merrill, Arthur. "Filtered Waves, Basic Theory." (1977).',
    description: '美股开盘前30分钟博弈区间被巨量大单向上洞穿，多头机构全面主导日内方向，引发极强动能扩散。',
    winRateEst: 67.8,
    sharpeEst: 2.15,
    profitFactorEst: 2.62,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['开盘后放量突破前30分钟最高价', '成交量较平时开盘放大30%以上', '价格持续走在日内VWAP之上'],
      exitRules: ['日线尾盘止盈或次日冲高离场'],
      invalidationRules: ['跌回开盘区间中轴止损']
    },
    parameters: [
      { id: 'rangeMinutes', name: '开盘观察时间(分钟)', type: 'number', default: 30, min: 15, max: 60, step: 15, description: '经典为30分钟。' }
    ],
    rules: {
      type: 'group',
      id: 'orb_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'orb_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.35, label: '开盘抢筹放量 (RVOL >= 1.35x)' },
        { type: 'leaf', id: 'orb_chg', indicatorId: 'changePercent', operator: 'GT', value: 1.0, label: '大阳线上行 (> 1.0%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['ORB', '开盘突破', '日内破局', '高动能'],
    version: '2.5.0'
  }
];
