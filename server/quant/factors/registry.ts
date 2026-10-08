import { FactorDefinition, FactorModel } from '../../types.ts';

export const FACTOR_LIBRARY: FactorDefinition[] = [
  // 1. MOMENTUM FACTORS (动量因子)
  {
    id: 'rsi_momentum',
    name: 'RSI 动量振荡因子',
    shortName: 'RSI 动量',
    category: 'MOMENTUM',
    categoryLabel: '动量因子 (Momentum)',
    description: 'Wilder RSI 动量区间打分，适中偏强(50-70)赋予高分，超买/超卖梯度赋分',
    formula: 'RSI(14) 动量非线性映射',
    defaultWeight: 0.35,
    min: 0,
    max: 100,
    higherIsBetter: true,
    unit: '分'
  },
  {
    id: 'roc_momentum',
    name: '20日价格变化率 (ROC)',
    shortName: '20D ROC',
    category: 'MOMENTUM',
    categoryLabel: '动量因子 (Momentum)',
    description: '衡量过去 20 个交易日资产价格累计变动百分比，反映中期动能加速度',
    formula: '((Close - Close[20]) / Close[20]) * 100',
    defaultWeight: 0.35,
    min: -50,
    max: 100,
    higherIsBetter: true,
    unit: '%'
  },
  {
    id: 'relative_strength',
    name: '相对大盘强弱度 (RS Rating)',
    shortName: 'RS 强弱比',
    category: 'MOMENTUM',
    categoryLabel: '动量因子 (Momentum)',
    description: '对标 S&P 500 基准指数的超额超额强弱评分，排名前 20% 给予满分加成',
    formula: '(Stock Return 90D / SPY Return 90D) 归一化排位',
    defaultWeight: 0.30,
    min: 1,
    max: 99,
    higherIsBetter: true,
    unit: '分'
  },

  // 2. TREND FACTORS (趋势因子)
  {
    id: 'ema_alignment',
    name: 'EMA 多头排列共振度',
    shortName: 'EMA 多头排列',
    category: 'TREND',
    categoryLabel: '趋势因子 (Trend)',
    description: 'EMA(20) > EMA(50) > EMA(200) 完美均线多头排列一致性度量',
    formula: 'EMA20/EMA50/EMA200 斜率与间距加权一致性得分',
    defaultWeight: 0.40,
    min: 0,
    max: 100,
    higherIsBetter: true,
    unit: '分'
  },
  {
    id: 'adx_trend_strength',
    name: 'ADX 平均趋向指标得分',
    shortName: 'ADX 趋势强度',
    category: 'TREND',
    categoryLabel: '趋势因子 (Trend)',
    description: 'ADX > 25 且 +DI > -DI 代表强劲确定性上升单边趋势',
    formula: 'ADX(14) 强度 + DI 方向加成',
    defaultWeight: 0.30,
    min: 0,
    max: 100,
    higherIsBetter: true,
    unit: '分'
  },
  {
    id: 'price_above_ma50',
    name: '现价相对 50日均线偏离率',
    shortName: 'Price / MA50',
    category: 'TREND',
    categoryLabel: '趋势因子 (Trend)',
    description: '站上 50MA 上方 2%~15% 为最佳右侧机构建仓区间，过大则防止乖离回调',
    formula: '((Price - SMA50) / SMA50) * 100',
    defaultWeight: 0.30,
    min: -30,
    max: 50,
    higherIsBetter: true,
    unit: '%'
  },

  // 3. QUALITY FACTORS (质量基本面因子)
  {
    id: 'quality_roe',
    name: '净资产收益率 (ROE %)',
    shortName: 'ROE 收益率',
    category: 'QUALITY',
    categoryLabel: '质量因子 (Quality)',
    description: '衡量公司利用股东资本创造收益的效率，巴菲特最看重的核心基本面因子',
    formula: 'Net Income / Shareholders Equity',
    defaultWeight: 0.40,
    min: -20,
    max: 60,
    higherIsBetter: true,
    unit: '%'
  },
  {
    id: 'operating_margin',
    name: '营业利润率 (Operating Margin %)',
    shortName: '营业利润率',
    category: 'QUALITY',
    categoryLabel: '质量因子 (Quality)',
    description: '反映企业核心主营业务盈利质量与行业定价权护城河',
    formula: 'Operating Income / Total Revenue',
    defaultWeight: 0.30,
    min: -20,
    max: 60,
    higherIsBetter: true,
    unit: '%'
  },
  {
    id: 'debt_to_equity',
    name: '资产负债杠杆率 (Debt / Equity)',
    shortName: '资产负债率',
    category: 'QUALITY',
    categoryLabel: '质量因子 (Quality)',
    description: '财务稳健性指标，负债率越低或适中防御性越强 (数值越低得分越高)',
    formula: 'Total Liabilities / Total Equity',
    defaultWeight: 0.30,
    min: 0.1,
    max: 5.0,
    higherIsBetter: false, // Lower is better
    unit: 'x'
  },

  // 4. VOLATILITY & VOLUME (波动与量价因子)
  {
    id: 'volatility_compression',
    name: 'ATR 波动率收敛因子',
    shortName: 'ATR 波动压缩',
    category: 'VOLATILITY',
    categoryLabel: '波动因子 (Volatility)',
    description: 'ATR% 处于历史极低分位代表暴风雨前的宁静，即将发生重大方向性突破',
    formula: '(1 - (ATR / Price)) 归一化收敛度',
    defaultWeight: 0.50,
    min: 0,
    max: 100,
    higherIsBetter: true,
    unit: '分'
  },
  {
    id: 'rvol_factor',
    name: '相对成交量比率 (RVOL)',
    shortName: '相对成交量 RVOL',
    category: 'VOLUME',
    categoryLabel: '量价资金 (Volume)',
    description: '盘中成交量与过去 20 日均量之比，反映机构主力大单介入意愿',
    formula: 'Today Volume / SMA(Volume, 20)',
    defaultWeight: 0.50,
    min: 0.2,
    max: 5.0,
    higherIsBetter: true,
    unit: 'x'
  }
];

export const PRESET_FACTOR_MODELS: FactorModel[] = [
  {
    id: 'model_balanced_alpha',
    name: '经典三因子 Alpha 强化模型 (40/40/20)',
    description: '由动量因子(40%) + 趋势因子(40%) + 波动率收敛(20%) 构成的全天候稳健选股模型',
    combinationMode: 'WEIGHTED_SUM',
    factors: [
      { factorId: 'rsi_momentum', factorName: 'RSI 动量', category: 'MOMENTUM', weight: 0.20, operator: 'WEIGHT' },
      { factorId: 'roc_momentum', factorName: '20D ROC', category: 'MOMENTUM', weight: 0.20, operator: 'WEIGHT' },
      { factorId: 'ema_alignment', factorName: 'EMA 多头排列', category: 'TREND', weight: 0.25, operator: 'WEIGHT' },
      { factorId: 'adx_trend_strength', factorName: 'ADX 趋势强度', category: 'TREND', weight: 0.15, operator: 'WEIGHT' },
      { factorId: 'volatility_compression', factorName: 'ATR 波动压缩', category: 'VOLATILITY', weight: 0.20, operator: 'WEIGHT' }
    ],
    minCompositeScore: 70,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isPreset: true
  },
  {
    id: 'model_high_momentum_growth',
    name: '高动量机构抢筹模型 (Momentum + Volume)',
    description: '侧重超额相对强度 (RS Rating) 与机构巨量放量 (RVOL > 1.5x) 的主升浪捕获模型',
    combinationMode: 'WEIGHTED_SUM',
    factors: [
      { factorId: 'relative_strength', factorName: 'RS 强弱比', category: 'MOMENTUM', weight: 0.35, operator: 'WEIGHT' },
      { factorId: 'roc_momentum', factorName: '20D ROC', category: 'MOMENTUM', weight: 0.25, operator: 'WEIGHT' },
      { factorId: 'rvol_factor', factorName: '相对成交量 RVOL', category: 'VOLUME', weight: 0.25, operator: 'WEIGHT' },
      { factorId: 'price_above_ma50', factorName: 'Price / MA50', category: 'TREND', weight: 0.15, operator: 'WEIGHT' }
    ],
    minCompositeScore: 75,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isPreset: true
  },
  {
    id: 'model_quality_trend_gate',
    name: '优质高 ROE 趋势共振门控模型 (Quality AND Trend)',
    description: '使用逻辑与 (AND) 严格门控：ROE > 15% 且 处于 EMA 多头排列的白马成长标的',
    combinationMode: 'LOGICAL_AND',
    factors: [
      { factorId: 'quality_roe', factorName: 'ROE 收益率', category: 'QUALITY', weight: 0.35, operator: 'AND', minThreshold: 60 },
      { factorId: 'operating_margin', factorName: '营业利润率', category: 'QUALITY', weight: 0.25, operator: 'AND', minThreshold: 50 },
      { factorId: 'ema_alignment', factorName: 'EMA 多头排列', category: 'TREND', weight: 0.40, operator: 'AND', minThreshold: 65 }
    ],
    minCompositeScore: 65,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    isPreset: true
  }
];

export function getFactorDefinition(id: string): FactorDefinition | undefined {
  return FACTOR_LIBRARY.find(f => f.id === id);
}
