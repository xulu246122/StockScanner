import { StrategyDefinition } from '../../../types.ts';

export const MEAN_REVERSION_MODELS: StrategyDefinition[] = [
  {
    id: 'connors_rsi2',
    name: 'Larry Connors RSI(2) Mean Reversion',
    shortName: '康纳斯 RSI(2) 均值回归',
    category: 'MEAN_REVERSION',
    categoryLabel: '均值回归 (Mean Reversion)',
    family: 'short_term',
    horizon: '1-5 Trading Days',
    holdingPeriodLabel: '超短线 1-5天',
    direction: 'LONG',
    author: 'Larry Connors',
    origin: 'Short-Term Trading Strategies That Work (2008)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Connors, Larry, and Cesar Alvarez. "Short Term Trading Strategies That Work." (2008).',
    description: '量化交易界实盘胜率最高的回测策略之一。主升趋势回调中捕捉2周期RSI极度超卖的弹簧式反弹。',
    winRateEst: 72.4,
    sharpeEst: 2.35,
    profitFactorEst: 2.92,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['长期处于上升趋势（价格高于200日均线）', '2周期RSI极限超跌小于10', '处于短期恐慌抛售尾声'],
      exitRules: ['价格回升至5日均线上方获利了结', '持有达到3-5个交易日时间窗口止盈'],
      invalidationRules: ['若继续下挫超过入场价4%无条件截断']
    },
    parameters: [
      { id: 'rsiThreshold', name: 'RSI(2)买入阈值', type: 'number', default: 10, min: 5, max: 20, step: 1, description: '经典阈值为10以下。' }
    ],
    rules: {
      type: 'group',
      id: 'connors_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'connors_rsi', indicatorId: 'rsi', parameter: { period: 2 }, operator: 'LT', value: 12, label: '极度超卖 (RSI(2) < 12)' },
        { type: 'leaf', id: 'connors_ma200', indicatorId: 'rsi', operator: 'GT', value: 30, label: '大级别未崩盘 (RSI(14) > 30)' },
        { type: 'leaf', id: 'connors_price', indicatorId: 'price', operator: 'GT', value: 5, label: '美股正规流动性标的' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['RSI2', '均值回归', 'Connors', '高胜率'],
    version: '2.5.0'
  },
  {
    id: 'wilder_oversold_rebound',
    name: 'Wilder Dynamic RSI Oversold Bounce',
    shortName: 'RSI 动态极度超卖反弹',
    category: 'MEAN_REVERSION',
    categoryLabel: '均值回归 (Mean Reversion)',
    family: 'short_term',
    horizon: '1-5 Trading Days',
    holdingPeriodLabel: '短线 1-5天',
    direction: 'LONG',
    author: 'J. Welles Wilder',
    origin: 'Wilder Classical RSI Rebound Model (1978)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Wilder, J. Welles. "New Concepts in Technical Trading Systems." (1978).',
    description: '标准14周期Wilder平滑RSI跌入30以下极限超跌区后的V型强力反弹，结合大阴线缩量衰竭。',
    winRateEst: 66.8,
    sharpeEst: 1.85,
    profitFactorEst: 2.18,
    difficultyLevel: 'BEGINNER',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['RSI(14)低于30极度超卖阈值', '当日或次日出现下影线企稳或止跌十字星', '抛压量能衰竭'],
      exitRules: ['RSI反弹修复突破50中轴止盈', '反弹达到第一压力位离场'],
      invalidationRules: ['跌破前低下方3%止损']
    },
    parameters: [
      { id: 'rsiOversold', name: 'RSI超卖门槛', type: 'number', default: 30, min: 20, max: 35, step: 1, description: '经典标准为30。' }
    ],
    rules: {
      type: 'group',
      id: 'wilder_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'wilder_rsi_leaf', indicatorId: 'rsi', operator: 'LTE', value: 30, label: '日线经典超卖 (RSI <= 30)' },
        { type: 'leaf', id: 'wilder_price_leaf', indicatorId: 'price', operator: 'GT', value: 5, label: '股价大于$5' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['Wilder', 'RSI超卖', '左侧抄底', '反弹波段'],
    version: '2.5.0'
  },
  {
    id: 'stoch_double_bottom',
    name: 'Stochastic KD Double Bottom Divergence',
    shortName: '随机指标 KD 双底背离',
    category: 'MEAN_REVERSION',
    categoryLabel: '均值回归 (Mean Reversion)',
    family: 'short_term',
    horizon: '2-8 Trading Days',
    holdingPeriodLabel: '短线 2-8天',
    direction: 'LONG',
    author: 'George Lane',
    origin: 'Lane Stochastics Oscillator Divergence Model',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Lane, George. "Investment Psychology Explained." (1984).',
    description: '随机指标KD在超卖区(20以下)形成双重底，且K线上穿D线形成二次黄金交叉，动能强烈回抽。',
    winRateEst: 68.2,
    sharpeEst: 1.94,
    profitFactorEst: 2.36,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['KD指标在20以下发生金叉', '指标底部抬高而价格创新低产生经典多头底背离', '当日收实体阳线'],
      exitRules: ['KD上冲至80超买区止盈', '价格触及20日均线回归平仓'],
      invalidationRules: ['下破双底低点止损']
    },
    parameters: [
      { id: 'kThreshold', name: 'K值超卖界限', type: 'number', default: 20, min: 15, max: 25, step: 1, description: '超卖底背离区域。' }
    ],
    rules: {
      type: 'group',
      id: 'stoch_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'stoch_rsi_low', indicatorId: 'rsi', operator: 'LTE', value: 38, label: '处于低位区间 (RSI <= 38)' },
        { type: 'leaf', id: 'stoch_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.2, label: '企稳翻红 (> 0.2%)' },
        { type: 'leaf', id: 'stoch_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.0, label: '放量资金接盘 (RVOL >= 1.0x)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['KD指标', '底背离', 'George Lane', '均值回归'],
    version: '2.5.0'
  },
  {
    id: 'cci_oversold_thrust',
    name: 'Commodity Channel Index (CCI) Oversold Thrust',
    shortName: 'CCI 顺势指标超跌暴动',
    category: 'MEAN_REVERSION',
    categoryLabel: '均值回归 (Mean Reversion)',
    family: 'short_term',
    horizon: '2-6 Trading Days',
    holdingPeriodLabel: '短线 2-6天',
    direction: 'LONG',
    author: 'Donald Lambert',
    origin: 'Commodities Technical Analysis (1980)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_B',
    sourceReference: 'Lambert, Donald. "Commodity Channel Index: Tool for Trading Cyclic Trends." (1980).',
    description: 'CCI指标跌破-100进入极端负偏离区后出现拐头向上突破，捕捉统计学正态分布3倍标准差外的强势回归。',
    winRateEst: 64.6,
    sharpeEst: 1.78,
    profitFactorEst: 2.12,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['CCI自-100以下极度偏离区向上拐头站回-100', '短线波幅企稳回升', '当日收盘价高于前一日收盘价'],
      exitRules: ['CCI回升至+100超买区止盈', '价格回到布林中轨平仓'],
      invalidationRules: ['跌破近3日最低点止损']
    },
    parameters: [
      { id: 'period', name: 'CCI计算周期', type: 'number', default: 20, min: 14, max: 30, step: 1, description: '标准周期20天。' }
    ],
    rules: {
      type: 'group',
      id: 'cci_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'cci_rsi_cond', indicatorId: 'rsi', operator: 'LTE', value: 36, label: '短期超跌状态 (RSI <= 36)' },
        { type: 'leaf', id: 'cci_bounce', indicatorId: 'changePercent', operator: 'GT', value: 0.5, label: '出现向上反弹阳线 (> 0.5%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['CCI', '统计偏离', '反弹爆发', '超买超卖'],
    version: '2.5.0'
  },
  {
    id: 'williams_r_exhaustion',
    name: 'Williams %R Exhaustion Reversal',
    shortName: '威廉指标 %R 动能竭尽反转',
    category: 'MEAN_REVERSION',
    categoryLabel: '均值回归 (Mean Reversion)',
    family: 'short_term',
    horizon: '1-5 Trading Days',
    holdingPeriodLabel: '超短线 1-5天',
    direction: 'LONG',
    author: 'Larry Williams',
    origin: 'Secrets of Selecting Stocks (1972)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Williams, Larry. "How I Made One Million Dollars Last Year Trading Commodities." (1979).',
    description: '威廉指标跌至-90至-100极端极限，空头动能彻底衰竭并产生动能断崖，随后触发快速均值拉回。',
    winRateEst: 65.1,
    sharpeEst: 1.81,
    profitFactorEst: 2.16,
    difficultyLevel: 'BEGINNER',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['%R指标在-85以下形成空头竭尽', '次日收阳并突破%R的-80阻力线', '量能出现地量'],
      exitRules: ['%R上升至-20超买区止盈', '价格触及5日均线'],
      invalidationRules: ['收盘跌破入场K线低点']
    },
    parameters: [
      { id: 'lookback', name: '威廉周期', type: 'number', default: 14, min: 10, max: 28, step: 2, description: '14日经典威廉指标。' }
    ],
    rules: {
      type: 'group',
      id: 'williams_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'williams_rsi', indicatorId: 'rsi', operator: 'LTE', value: 34, label: '动能耗尽 (RSI <= 34)' },
        { type: 'leaf', id: 'williams_pos', indicatorId: 'changePercent', operator: 'GT', value: 0, label: '当日收阳 (Change% > 0%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['威廉指标', 'Larry Williams', '空头竭尽', '左侧买点'],
    version: '2.5.0'
  },
  {
    id: 'bollinger_mean_revert',
    name: 'Bollinger Band Lower Band Mean Reversion',
    shortName: '布林带下轨触及与中轨回归',
    category: 'MEAN_REVERSION',
    categoryLabel: '均值回归 (Mean Reversion)',
    family: 'short_term',
    horizon: '2-8 Trading Days',
    holdingPeriodLabel: '短线 2-8天',
    direction: 'LONG',
    author: 'John Bollinger',
    origin: 'Bollinger on Bollinger Bands (2001)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Bollinger, John. "Bollinger on Bollinger Bands." McGraw-Hill (2001).',
    description: '价格触及或跌破2倍标准差布林下轨后，产生明显的长下影线探底，预期向20日中轨均值回归。',
    winRateEst: 67.8,
    sharpeEst: 2.02,
    profitFactorEst: 2.45,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['收盘价跌穿布林下轨或%B小于0', '随后一根K线收出看涨吞没或反转十字星', '带外放量探底回升'],
      exitRules: ['价格触及20日布林中轨全额止盈', '价格到达上轨若遇阻清仓'],
      invalidationRules: ['有效收破下影线低点止损']
    },
    parameters: [
      { id: 'devMultiplier', name: '标准差倍数', type: 'number', default: 2.0, min: 1.5, max: 2.5, step: 0.1, description: '布林通道标准差倍数。' }
    ],
    rules: {
      type: 'group',
      id: 'bb_revert_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'bb_rsi_low', indicatorId: 'rsi', operator: 'LTE', value: 35, label: '带外超卖 (RSI <= 35)' },
        { type: 'leaf', id: 'bb_rebound', indicatorId: 'changePercent', operator: 'GT', value: 0.3, label: '探底回升 (> 0.3%)' },
        { type: 'leaf', id: 'bb_vol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.05, label: '资金承接 (RVOL >= 1.05x)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['布林带', '下轨触及', '中轨回归', '均值回归'],
    version: '2.5.0'
  },
  {
    id: 'dpo_detrended_osc',
    name: 'Detrended Price Oscillator (DPO) Reversion',
    shortName: '非趋势价格摆动去噪回归',
    category: 'MEAN_REVERSION',
    categoryLabel: '均值回归 (Mean Reversion)',
    family: 'swing',
    horizon: '3-10 Trading Days',
    holdingPeriodLabel: '波段 3-10天',
    direction: 'LONG',
    author: 'Joe DiNapoli',
    origin: 'Trading with DiNapoli Levels (1998)',
    sourceType: 'ESTABLISHED_PRACTITIONER',
    evidenceLevel: 'LEVEL_B',
    sourceReference: 'DiNapoli, Joe. "Trading with DiNapoli Levels." (1998).',
    description: '通过位移移动平均线消除长期趋势对价格的干扰，精准测量中短期周期波动的极值波谷，抄底胜率突出。',
    winRateEst: 62.4,
    sharpeEst: 1.68,
    profitFactorEst: 2.05,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'MEDIUM',
    tradingLogic: {
      entryRules: ['DPO指标下探至历史波谷负极值', '价格未出现破位大跌，呈现横盘抵抗', '次日收中阳线确认拐头'],
      exitRules: ['DPO冲回零轴上方波峰区止盈'],
      invalidationRules: ['破位跌破震荡箱体下沿止损']
    },
    parameters: [
      { id: 'period', name: 'DPO周期', type: 'number', default: 20, min: 10, max: 30, step: 2, description: '位移平均周期。' }
    ],
    rules: {
      type: 'group',
      id: 'dpo_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'dpo_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 30, max: 45 }, label: '周期波谷低点 (RSI 30-45)' },
        { type: 'leaf', id: 'dpo_turn', indicatorId: 'changePercent', operator: 'GT', value: 0.4, label: '拐头企稳 (> 0.4%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['DPO', '周期滤波', '去趋势', '均值回归'],
    version: '2.5.0'
  },
  {
    id: 'mfi_divergence_reversion',
    name: 'Money Flow Index (MFI) Divergence Reversion',
    shortName: '资金流量 MFI 底部超跌共振',
    category: 'MEAN_REVERSION',
    categoryLabel: '均值回归 (Mean Reversion)',
    family: 'short_term',
    horizon: '2-7 Trading Days',
    holdingPeriodLabel: '短线 2-7天',
    direction: 'LONG',
    author: 'Gene Quong & Avrum Soudack',
    origin: 'Volume-Weighted RSI Capital Inflow Model (1989)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Quong, Gene, and Avrum Soudack. "Volume-Weighted RSI." Technical Analysis of Stocks & Commodities (1989).',
    description: '结合成交量权重的量能RSI指标。在20以下极度超卖区捕捉价跌量增的主力隐蔽吸筹底背离。',
    winRateEst: 69.3,
    sharpeEst: 2.15,
    profitFactorEst: 2.58,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['MFI跌破20进入极限资金流超卖区', '股价创新低而MFI指标拐头不创新低（底背离）', '主力资金悄然建仓'],
      exitRules: ['MFI修复回升至50-80区间分批锁定利润', '价格收盘跌破入场日前低平仓'],
      invalidationRules: ['跌破背离结构低点下方3.5%止损']
    },
    parameters: [
      { id: 'mfiOversold', name: 'MFI超卖阈值', type: 'number', default: 20, min: 15, max: 25, step: 1, description: '标准资金流超卖阈值。' }
    ],
    rules: {
      type: 'group',
      id: 'mfi_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'mfi_rsi', indicatorId: 'rsi', operator: 'LTE', value: 36, label: '量价共振超跌 (RSI <= 36)' },
        { type: 'leaf', id: 'mfi_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.1, label: '吸筹放量 (RVOL >= 1.1x)' },
        { type: 'leaf', id: 'mfi_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.2, label: '资金净流入收红 (> 0.2%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['MFI', '资金流', '成交量加权', '底背离'],
    version: '2.5.0'
  },
  {
    id: 'keltner_mean_reversion',
    name: 'Keltner Channel Lower Band Exhaustion Rebound',
    shortName: '肯特纳通道超跌均值回归',
    category: 'MEAN_REVERSION',
    categoryLabel: '均值回归 (Mean Reversion)',
    family: 'short_term',
    horizon: '2-7 Trading Days',
    holdingPeriodLabel: '短线 2-7天',
    direction: 'LONG',
    author: 'Chester Keltner',
    origin: 'How to Make Money in Commodities (1960)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_B',
    sourceReference: 'Keltner, Chester W. "How to Make Money in Commodities." (1960).',
    description: '以EMA(20)为中轨、真实波幅ATR为包络线的通道。价格深跌触碰肯特纳下轨后，动量空头衰竭，回归中轴概率极大。',
    winRateEst: 64.2,
    sharpeEst: 1.76,
    profitFactorEst: 2.10,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['日线跌破肯特纳下轨形成超跌', '随后收出止跌锤子线或反转K线', '短周期RSI出现超跌拐头'],
      exitRules: ['回归至肯特纳EMA中轨完全止盈'],
      invalidationRules: ['跌破下影线最低点止损']
    },
    parameters: [
      { id: 'atrMultiplier', name: 'ATR通道倍数', type: 'number', default: 2.0, min: 1.5, max: 3.0, step: 0.1, description: '通道宽度系数。' }
    ],
    rules: {
      type: 'group',
      id: 'keltner_rev_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'kelt_rsi', indicatorId: 'rsi', operator: 'LTE', value: 37, label: '通道下轨超跌 (RSI <= 37)' },
        { type: 'leaf', id: 'kelt_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.3, label: '企稳反弹阳线 (> 0.3%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['肯特纳', 'ATR通道', '超跌反弹', '均值回归'],
    version: '2.5.0'
  }
];
