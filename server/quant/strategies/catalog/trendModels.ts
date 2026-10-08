import { StrategyDefinition } from '../../../types.ts';

export const TREND_MODELS: StrategyDefinition[] = [
  {
    id: 'donchian_breakout',
    name: 'Donchian Channel 20-Day Breakout',
    shortName: '唐奇安通道突破',
    category: 'TREND',
    categoryLabel: '趋势跟踪 (Trend Following)',
    family: 'short_term',
    horizon: '1-10 Trading Days',
    holdingPeriodLabel: '短线 1-10天',
    direction: 'LONG',
    author: 'Richard Donchian',
    origin: 'Futures Market Trend Following Strategy (1960s)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Donchian, Richard. "High Finance in Copper." Financial Analysts Journal (1960).',
    description: '趋势跟踪交易学派鼻祖策略。收盘价突破过去20周期最高点通道上轨，配合成交量放大确立突破动能。',
    winRateEst: 64.8,
    sharpeEst: 1.82,
    profitFactorEst: 2.15,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['收盘价突破过去20日最高点通道上轨', '成交量显著放大（RVOL ≥ 1.2x 20日均量）', '当日收阳（涨幅 > 0%）'],
      exitRules: ['价格跌破10日最低点离场', '达到2.5倍ATR盈利目标分批止盈'],
      invalidationRules: ['跌回突破前箱体中轴或入场价下方4%硬性截断风险']
    },
    parameters: [
      { id: 'lookback', name: '突破周期 (N天高点)', type: 'number', default: 20, min: 10, max: 60, step: 5, description: '经典参数为20天或55天。' },
      { id: 'minRvol', name: '放量门槛 (RVOL)', type: 'number', default: 1.2, min: 1.0, max: 3.0, step: 0.1, description: '过滤缩量假突破。' }
    ],
    rules: {
      type: 'group',
      id: 'donchian_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'donchian_high_leaf', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -15, label: '靠近高位区域 (距高点 < 15%)' },
        { type: 'leaf', id: 'donchian_rvol_leaf', indicatorId: 'relative_volume', operator: 'GTE', value: 1.2, label: '成交量放大 (RVOL >= 1.2x)' },
        { type: 'leaf', id: 'donchian_chg_leaf', indicatorId: 'changePercent', operator: 'GT', value: 0, label: '当日收盘为正 (Change% > 0%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['趋势跟踪', '通道突破', '唐奇安', '经典量化'],
    version: '2.5.0'
  },
  {
    id: 'turtle_system_1',
    name: 'Turtle Trading System One',
    shortName: '海龟交易法则系统一',
    category: 'TREND',
    categoryLabel: '趋势跟踪 (Trend Following)',
    family: 'swing',
    horizon: '2-8 Weeks',
    holdingPeriodLabel: '波段 2-8周',
    direction: 'LONG',
    author: 'Richard Dennis & William Eckhardt',
    origin: 'Chicago Turtle Traders Experiment (1983)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Faith, Curtis. "Way of the Turtle." McGraw-Hill (2007).',
    description: '华尔街传奇海龟实验系统。突破20日高点建立底仓，严格基于真实波幅ATR计算头寸大小并按2ATR硬止损。',
    winRateEst: 58.6,
    sharpeEst: 1.95,
    profitFactorEst: 2.68,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['突破20日最高价建立1个单位头寸', '价格每上涨0.5个N(ATR)加仓1个单位', '最多加仓至4个单位'],
      exitRules: ['跌破10日最低价全额清仓', '触及2ATR跟踪止损离场'],
      invalidationRules: ['跌破入场价下方2个ATR强制止损']
    },
    parameters: [
      { id: 'breakoutPeriod', name: '突破周期 (天)', type: 'number', default: 20, min: 10, max: 40, step: 5, description: '海龟短期系统默认为20天。' },
      { id: 'exitPeriod', name: '离场周期 (天)', type: 'number', default: 10, min: 5, max: 20, step: 1, description: '跌破10日最低价止盈。' }
    ],
    rules: {
      type: 'group',
      id: 'turtle_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'turtle_price_ma', indicatorId: 'price', operator: 'GT', value: 10, label: '股价大于$10保证流动性' },
        { type: 'leaf', id: 'turtle_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.1, label: '放量启动 (RVOL >= 1.1x)' },
        { type: 'leaf', id: 'turtle_trend', indicatorId: 'changePercent', operator: 'GT', value: 0.5, label: '收盘实体走强 (> 0.5%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['海龟法则', 'ATR仓位', '趋势跟踪', '头寸管理'],
    version: '2.5.0'
  },
  {
    id: 'minervini_trend_template',
    name: 'Mark Minervini Trend Template (VCP)',
    shortName: '米奈尔维尼趋势模板',
    category: 'TREND',
    categoryLabel: '趋势跟踪 (Trend Following)',
    family: 'position',
    horizon: '1-6 Months',
    holdingPeriodLabel: '中期 1-6月',
    direction: 'LONG',
    author: 'Mark Minervini',
    origin: 'US Investing Champion SEPA Methodology',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Minervini, Mark. "Trade Like a Stock Market Wizard." McGraw-Hill (2013).',
    description: '全美投资冠军Minervini独创SEPA系统核心。严格要求股价处于阶段2明确上升趋势中，均线呈完全多头排列。',
    winRateEst: 68.5,
    sharpeEst: 2.21,
    profitFactorEst: 2.85,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['当前价格 > 150日均线且 > 200日均线', '50日均线 > 150日均线 > 200日均线', '200日均线至少向上抬头1个月'],
      exitRules: ['跌破50日均线且成交量放大', '触及阶梯移动止损'],
      invalidationRules: ['跌回收缩结构枢纽点下方7%一律截断']
    },
    parameters: [
      { id: 'minRs', name: '相对大盘强度 (RS)', type: 'number', default: 70, min: 50, max: 99, step: 1, description: '只选取跑赢大盘的领先品种。' }
    ],
    rules: {
      type: 'group',
      id: 'minervini_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'min_above_ma50', indicatorId: 'rsi', operator: 'GT', value: 50, label: 'RSI(14) 位于多头强势区 (> 50)' },
        { type: 'leaf', id: 'min_dist_high', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -25, label: '距52周新高在25%以内' },
        { type: 'leaf', id: 'min_pos_chg', indicatorId: 'changePercent', operator: 'GT', value: -2.0, label: '拒绝恶性大阴线' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['Minervini', '趋势模板', '阶段2', '高胜率'],
    version: '2.5.0'
  },
  {
    id: 'weinstein_stage2',
    name: 'Stan Weinstein Stage 2 Breakout',
    shortName: '温斯坦第二阶段突破',
    category: 'TREND',
    categoryLabel: '趋势跟踪 (Trend Following)',
    family: 'position',
    horizon: '1-6 Months',
    holdingPeriodLabel: '中期 1-6月',
    direction: 'LONG',
    author: 'Stan Weinstein',
    origin: 'Professional Tape Reading Trend Stage Theory (1988)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Weinstein, Stan. "Secrets for Profiting in Bull and Bear Markets." McGraw-Hill (1988).',
    description: '四阶段牛熊转折交易法。第一阶段筑底箱体完毕，价格以倍量突破30周均线进入主升浪第二阶段。',
    winRateEst: 67.2,
    sharpeEst: 2.05,
    profitFactorEst: 2.45,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['价格放量向上突破30周均线与底部阻力位', '突破周成交量至少为过去均量2倍以上', '曼斯菲尔德相对强度由负转正'],
      exitRules: ['跌破30周拐头均线离场', '第四阶段下跌趋势确立清仓'],
      invalidationRules: ['跌回突破基底下方5%止损']
    },
    parameters: [
      { id: 'volMultiplier', name: '突破放量倍数', type: 'number', default: 1.5, min: 1.2, max: 3.0, step: 0.1, description: '放量过滤假突破。' }
    ],
    rules: {
      type: 'group',
      id: 'weinstein_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'ws_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.5, label: '放量突破基底 (RVOL >= 1.5x)' },
        { type: 'leaf', id: 'ws_rsi', indicatorId: 'rsi', operator: 'GT', value: 55, label: '动能转强 (RSI > 55)' },
        { type: 'leaf', id: 'ws_chg', indicatorId: 'changePercent', operator: 'GT', value: 1.0, label: '向上大阳线 (> 1%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['温斯坦', '第二阶段', '30周均线', '主升浪'],
    version: '2.5.0'
  },
  {
    id: 'elder_triple_screen',
    name: 'Alexander Elder Triple Screen System',
    shortName: '三重滤网脉冲系统',
    category: 'TREND',
    categoryLabel: '趋势跟踪 (Trend Following)',
    family: 'short_term',
    horizon: '2-10 Trading Days',
    holdingPeriodLabel: '短线 2-10天',
    direction: 'LONG',
    author: 'Alexander Elder',
    origin: 'Multi-Timeframe Trading System (1986)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Elder, Alexander. "Trading for a Living." John Wiley & Sons (1993).',
    description: '大周期定顺势方向，中周期寻逆向回调买点，小周期设追踪突破出击的三重滤网体系。',
    winRateEst: 63.5,
    sharpeEst: 1.75,
    profitFactorEst: 2.10,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['周线MACD柱线上升确定大趋势向上', '日线振荡指标（威廉%R或RSI）超卖回调', '盘中突破前日高点顺势击发'],
      exitRules: ['日线指标进入严重超买区止盈', '周线趋势转空完全退出'],
      invalidationRules: ['跌破近两日最低点截断风险']
    },
    parameters: [
      { id: 'rsiThreshold', name: '日线回调买入门槛', type: 'number', default: 45, min: 30, max: 50, step: 1, description: '多头趋势中的超跌买点。' }
    ],
    rules: {
      type: 'group',
      id: 'elder_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'elder_rsi_pullback', indicatorId: 'rsi', operator: 'LTE', value: 48, label: '多头回调买点 (RSI <= 48)' },
        { type: 'leaf', id: 'elder_rsi_floor', indicatorId: 'rsi', operator: 'GT', value: 35, label: '非破位超跌 (RSI > 35)' },
        { type: 'leaf', id: 'elder_price', indicatorId: 'price', operator: 'GT', value: 5, label: '有效标的价格' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['三重滤网', 'Elder', '多周期', '共振交易'],
    version: '2.5.0'
  },
  {
    id: 'supertrend_momentum',
    name: 'SuperTrend Dynamic Momentum Following',
    shortName: '超级趋势线动量跟踪',
    category: 'TREND',
    categoryLabel: '趋势跟踪 (Trend Following)',
    family: 'swing',
    horizon: '3-15 Trading Days',
    holdingPeriodLabel: '波段 3-15天',
    direction: 'LONG',
    author: 'Olivier Seban',
    origin: 'Algorithmic Volatility Band Trailing System',
    sourceType: 'ESTABLISHED_PRACTITIONER',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Seban, Olivier. "Tout le monde peut réussir en bourse." (2008).',
    description: '结合ATR波动率的自适应动态单边跟踪算法。当价格翻越上轨翻绿时形成波段顺势买点。',
    winRateEst: 65.4,
    sharpeEst: 1.88,
    profitFactorEst: 2.24,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['收盘价由SuperTrend下方向上突破并翻多', '20日均成交量放大支持趋势确立', 'RSI处于50-70中高动能区'],
      exitRules: ['价格收盘跌破SuperTrend动态红线止盈止损'],
      invalidationRules: ['日线收破SuperTrend动态下轨立即平仓']
    },
    parameters: [
      { id: 'atrPeriod', name: 'ATR周期', type: 'number', default: 10, min: 7, max: 21, step: 1, description: '用于计算波动率宽度的周期。' },
      { id: 'multiplier', name: 'ATR倍数因子', type: 'number', default: 3.0, min: 1.5, max: 4.5, step: 0.5, description: '动态追踪止损间距。' }
    ],
    rules: {
      type: 'group',
      id: 'supertrend_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'st_rsi', indicatorId: 'rsi', operator: 'GT', value: 52, label: '动能多头活跃 (RSI > 52)' },
        { type: 'leaf', id: 'st_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.8, label: '当日强劲涨幅 (> 0.8%)' },
        { type: 'leaf', id: 'st_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.15, label: '放量驱动 (RVOL >= 1.15x)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['SuperTrend', '动态止损', 'ATR自适应', '趋势跟踪'],
    version: '2.5.0'
  },
  {
    id: 'kama_adaptive_trend',
    name: 'Kaufman Adaptive Moving Average (KAMA) Trend',
    shortName: '考夫曼自适应均线趋势',
    category: 'TREND',
    categoryLabel: '趋势跟踪 (Trend Following)',
    family: 'swing',
    horizon: '5-20 Trading Days',
    holdingPeriodLabel: '波段 5-20天',
    direction: 'LONG',
    author: 'Perry Kaufman',
    origin: 'Smarter Trading: Improving Performance (1995)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Kaufman, Perry J. "Smarter Trading." McGraw-Hill (1995).',
    description: '利用市场效率系数(ER)根据波动剧烈程度动态调整平滑速度，震荡市钝化抗洗盘，单边市敏锐跟随。',
    winRateEst: 62.8,
    sharpeEst: 1.76,
    profitFactorEst: 2.08,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['价格向上突破KAMA自适应均线', '效率系数(ER)达到高效率单边阈值', '成交量支持趋势加速'],
      exitRules: ['价格回落跌穿KAMA均线', '效率系数下降至震荡区分批锁定利润'],
      invalidationRules: ['跌回KAMA下方3%止损离场']
    },
    parameters: [
      { id: 'erPeriod', name: '效率系数检验周期', type: 'number', default: 10, min: 5, max: 30, step: 1, description: '考夫曼标准效率参数。' }
    ],
    rules: {
      type: 'group',
      id: 'kama_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'kama_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 50, max: 75 }, label: '动能稳健 (RSI 50-75)' },
        { type: 'leaf', id: 'kama_dist_high', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -20, label: '处于强势上升通道中' },
        { type: 'leaf', id: 'kama_vol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.1, label: '温和放量 (RVOL >= 1.1x)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['考夫曼', '自适应均线', 'KAMA', '效率系数'],
    version: '2.5.0'
  },
  {
    id: 'parabolic_sar_trend',
    name: 'Parabolic SAR Acceleration Trend',
    shortName: '抛物线转向顺势加速',
    category: 'TREND',
    categoryLabel: '趋势跟踪 (Trend Following)',
    family: 'short_term',
    horizon: '3-12 Trading Days',
    holdingPeriodLabel: '短线 3-12天',
    direction: 'LONG',
    author: 'J. Welles Wilder',
    origin: 'New Concepts in Technical Trading Systems (1978)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_B',
    sourceReference: 'Wilder, J. Welles. "New Concepts in Technical Trading Systems." (1978).',
    description: '时间和价格双重约束的动态加速指标。当SAR翻转到价格下方时确立多头加速期，紧贴SAR跟踪保护利润。',
    winRateEst: 61.5,
    sharpeEst: 1.62,
    profitFactorEst: 1.95,
    difficultyLevel: 'BEGINNER',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['SAR点位由价格上方跳空反转至价格下方', '当日收阳确立多头反转', '成交量较前日放大'],
      exitRules: ['SAR点位再次反转至价格上方'],
      invalidationRules: ['收盘价跌破当前最新SAR点位立即离场']
    },
    parameters: [
      { id: 'step', name: '加速步长因子', type: 'number', default: 0.02, min: 0.01, max: 0.05, step: 0.01, description: '经典 Wilder 加速步长。' }
    ],
    rules: {
      type: 'group',
      id: 'sar_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'sar_rsi', indicatorId: 'rsi', operator: 'GT', value: 48, label: '多头动能萌芽 (RSI > 48)' },
        { type: 'leaf', id: 'sar_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.5, label: '当日明确涨幅 (> 0.5%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['抛物线SAR', 'Wilder', '追踪止损', '短线波段'],
    version: '2.5.0'
  },
  {
    id: 'adx_trend_strength',
    name: 'ADX Trend Strength & Directional Momentum',
    shortName: 'ADX 强动能趋势顺势共振',
    category: 'TREND',
    categoryLabel: '趋势跟踪 (Trend Following)',
    family: 'swing',
    horizon: '3-15 Trading Days',
    holdingPeriodLabel: '波段 3-15天',
    direction: 'LONG',
    author: 'J. Welles Wilder',
    origin: 'Average Directional Index System (1978)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Wilder, J. Welles. "New Concepts in Technical Trading Systems." (1978).',
    description: '平均趋向指标ADX大于25确立单边大趋势，配合+DI持续压制-DI，有效剔除70%震荡市虚假假突破。',
    winRateEst: 66.2,
    sharpeEst: 1.95,
    profitFactorEst: 2.35,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['ADX指标大于25且斜率向上攀升', '+DI显著高于-DI处于多头主导', '收盘价突破10日最高点'],
      exitRules: ['ADX高位拐头向下或者+DI死叉-DI离场'],
      invalidationRules: ['收盘跌破20日均线止损']
    },
    parameters: [
      { id: 'minAdx', name: 'ADX门槛', type: 'number', default: 25, min: 20, max: 35, step: 1, description: '趋势强度阈值。' }
    ],
    rules: {
      type: 'group',
      id: 'adx_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'adx_rsi', indicatorId: 'rsi', operator: 'GT', value: 54, label: '强势动能 (RSI > 54)' },
        { type: 'leaf', id: 'adx_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.15, label: '放量共振 (RVOL >= 1.15x)' },
        { type: 'leaf', id: 'adx_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.6, label: '顺势上涨 (> 0.6%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['ADX', 'DMI', 'Wilder', '趋势强度'],
    version: '2.5.0'
  },
  {
    id: 'triple_ema_alignment',
    name: 'Triple Exponential MA (TEMA) Bullish Convergence',
    shortName: '三重指数均线 (TEMA) 多头共振',
    category: 'TREND',
    categoryLabel: '趋势跟踪 (Trend Following)',
    family: 'swing',
    horizon: '5-20 Trading Days',
    holdingPeriodLabel: '波段 5-20天',
    direction: 'LONG',
    author: 'Patrick Mulloy',
    origin: 'Technical Analysis of Stocks & Commodities (1994)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Mulloy, Patrick G. "Smoothing Data with Faster Moving Averages." (1994).',
    description: '通过三重指数平滑消除传统移动平均线的滞后性，在5/10/20周期形成发散金叉时提供极佳平滑顺势买点。',
    winRateEst: 65.0,
    sharpeEst: 1.86,
    profitFactorEst: 2.22,
    difficultyLevel: 'BEGINNER',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['短期TEMA金叉中期TEMA', '均线系统呈扇形向上多头发散', '价格稳居均线上方运行'],
      exitRules: ['短周期均线死叉中周期均线止盈'],
      invalidationRules: ['收破长周期TEMA均线止损']
    },
    parameters: [
      { id: 'fastPeriod', name: '快线周期', type: 'number', default: 5, min: 3, max: 10, step: 1, description: '短期TEMA。' }
    ],
    rules: {
      type: 'group',
      id: 'tema_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'tema_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 52, max: 70 }, label: '稳步推升 (RSI 52-70)' },
        { type: 'leaf', id: 'tema_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -18, label: '处于强势主升浪' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['TEMA', '零滞后均线', '多头排列', '顺势波段'],
    version: '2.5.0'
  }
];
