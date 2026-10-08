import { RadarPreset } from '../../types.ts';

export const SYSTEM_RADAR_PRESETS: RadarPreset[] = [
  {
    id: 'preset_short_term_1_10d',
    name: 'Short-Term 1-10D Setup',
    nameZh: '短线 1-10D 优质买点',
    description: '综合短线 1~10 交易日抓取模型：高流动性、中等波幅、无财报炸弹、高盈亏比。',
    mode: 'PRO',
    profileType: 'SHORT_TERM_1_10D',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: {
      relativeStrength: 0.20,
      momentum: 0.20,
      volume: 0.15,
      trend: 0.15,
      sector: 0.15,
      market: 0.10,
      structure: 0.05
    },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'cap', indicatorId: 'market_cap', operator: 'GTE', value: 2000000000, label: '市值 >= $2B' },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 10, label: '股价 >= $10' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 25000000, label: '日均成交额 >= $25M' },
        { type: 'leaf', id: 'rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 0.6, label: 'RVOL >= 0.6x' },
        { type: 'leaf', id: 'atr', indicatorId: 'atr_percent', operator: 'BETWEEN', value: [1.2, 7.0], label: 'ATR% 1.2%~7.0%' },
        { type: 'leaf', id: 'earn', indicatorId: 'days_to_earnings', operator: 'GTE', value: 3, label: '距财报 > 3 交易日' }
      ]
    }
  },
  {
    id: 'preset_oversold_rebound',
    name: 'Oversold Rebound Confirmation',
    nameZh: '超跌磨底·右侧反转确认',
    description: '超卖区间量能逐步沉淀，结合恐慌盘释放与右侧企稳确认，拒绝左侧盲目接飞刀。',
    mode: 'PRO',
    profileType: 'OVERSOLD',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: {
      momentum: 0.30,
      relativeStrength: 0.25,
      volume: 0.20,
      trend: 0.15,
      sector: 0.10
    },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        {
          type: 'group',
          id: 'rsi_group',
          logicalOperator: 'OR',
          children: [
            { type: 'leaf', id: 'rsi14', indicatorId: 'rsi', parameter: { period: 14 }, operator: 'LTE', value: 35, label: 'RSI(14) <= 35 经典超卖' },
            { type: 'leaf', id: 'rsi6', indicatorId: 'rsi', parameter: { period: 6 }, operator: 'LTE', value: 25, label: 'RSI(6) <= 25 短线极值' }
          ]
        },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 5, label: '股价 >= $5' },
        { type: 'leaf', id: 'rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 0.95, label: '量能企稳承接 RVOL >= 0.95x' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 10000000, label: '日均成交额 >= $10M' }
      ]
    }
  },
  {
    id: 'preset_momentum_breakout',
    name: 'Momentum Breakout',
    nameZh: '放量动能平台突破',
    description: '顺势突破高位盘整平台，均线多头排列，主力量能放大推升。',
    mode: 'PRO',
    profileType: 'BREAKOUT',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: {
      momentum: 0.25,
      relativeStrength: 0.25,
      volume: 0.25,
      trend: 0.15,
      sector: 0.10
    },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 10, label: '股价高于 $10' },
        { type: 'leaf', id: 'rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.15, label: '放量推升 RVOL >= 1.15x' },
        { type: 'leaf', id: 'atr', indicatorId: 'atr_percent', operator: 'GTE', value: 1.2, label: '有效波幅 ATR% >= 1.2%' },
        { type: 'leaf', id: 'dist_high', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -10, label: '距52周高点在 10% 以内' }
      ]
    }
  },
  {
    id: 'preset_extreme_oversold',
    name: 'Extreme Oversold Capitulation',
    nameZh: '极端恐慌超卖吸筹',
    description: '触及历史极值超跌区（RSI <= 25 或 RSI(6) <= 18），恐慌抛压彻底宣泄，左侧与右侧共振观察。',
    mode: 'PRO',
    profileType: 'EXTREME_OVERSOLD',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { momentum: 0.40, relativeStrength: 0.25, volume: 0.20, trend: 0.15 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        {
          type: 'group',
          id: 'extreme_rsi_group',
          logicalOperator: 'OR',
          children: [
            { type: 'leaf', id: 'rsi14', indicatorId: 'rsi', parameter: { period: 14 }, operator: 'LTE', value: 25, label: 'RSI(14) <= 25 极限恐慌' },
            { type: 'leaf', id: 'rsi6', indicatorId: 'rsi', parameter: { period: 6 }, operator: 'LTE', value: 18, label: 'RSI(6) <= 18 急跌宣泄' }
          ]
        },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 5, label: '股价 >= $5' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 10000000, label: '日均成交额 >= $10M' }
      ]
    }
  },
  {
    id: 'preset_pullback_support',
    name: 'Pullback Support',
    nameZh: '均线中继回踩支撑',
    description: '中期多头趋势中健康缩量回踩关键支撑均线，挂单低吸等待顺势拉升。',
    mode: 'PRO',
    profileType: 'PULLBACK',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { trend: 0.30, momentum: 0.25, structure: 0.20, volume: 0.15, sector: 0.10 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 10, label: '股价 >= $10' },
        { type: 'leaf', id: 'rsi', indicatorId: 'rsi', parameter: { period: 14 }, operator: 'BETWEEN', value: [35, 55], label: 'RSI(14) 35~55 中轴回踩' },
        { type: 'leaf', id: 'rvol', indicatorId: 'relative_volume', operator: 'LTE', value: 1.2, label: '健康缩量 RVOL <= 1.2x' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 15000000, label: '日均成交额 >= $15M' }
      ]
    }
  },
  {
    id: 'preset_trend_following',
    name: 'Trend Following Alignment',
    nameZh: '机构趋势多头共振',
    description: '中大市值多头排列，依托 SMA20/50/200 稳健趋势持仓通道。',
    mode: 'PRO',
    profileType: 'TREND_FOLLOWING',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { trend: 0.35, relativeStrength: 0.25, sector: 0.15, volume: 0.15, volatility: 0.10 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'cap', indicatorId: 'market_cap', operator: 'GTE', value: 5000000000, label: '市值 >= $5B' },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 15, label: '股价 >= $15' },
        { type: 'leaf', id: 'rsi', indicatorId: 'rsi', parameter: { period: 14 }, operator: 'GTE', value: 50, label: 'RSI(14) >= 50' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 30000000, label: '日均成交额 >= $30M' }
      ]
    }
  },
  {
    id: 'preset_relative_strength_leader',
    name: 'Relative Strength Leaders',
    nameZh: '全市场相对强弱领头羊',
    description: '大盘震荡期跑赢标普 (RS Rank > 80)，展现极高机构 Alpha 优势。',
    mode: 'PRO',
    profileType: 'RELATIVE_STRENGTH',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { relativeStrength: 0.40, momentum: 0.25, volume: 0.15, sector: 0.10, trend: 0.10 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'rs', indicatorId: 'rs_rank', operator: 'GTE', value: 80, label: 'RS Rank >= 80' },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 15, label: '股价 >= $15' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 25000000, label: '日均成交额 >= $25M' }
      ]
    }
  },
  {
    id: 'preset_volume_surge',
    name: 'Volume Surge Inflow',
    nameZh: '异动巨量资金进场',
    description: '单日相对成交量 RVOL > 2.5x，主力机构大单净流入或利好事件驱动。',
    mode: 'PRO',
    profileType: 'VOLUME_SURGE',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { volume: 0.40, momentum: 0.25, relativeStrength: 0.15, trend: 0.10, sector: 0.10 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.35, label: '异动量比 RVOL >= 1.35x' },
        { type: 'leaf', id: 'chg', indicatorId: 'changePercent', operator: 'GTE', value: 1.0, label: '单日涨幅 >= +1.0%' },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 5, label: '股价 >= $5' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 20000000, label: '日均成交额 >= $20M' }
      ]
    }
  },
  {
    id: 'preset_gap_and_go',
    name: 'Gap & Go Momentum',
    nameZh: '跳空高开顺势推升',
    description: '开盘跳空突破且日内延续买盘，强势突破盘整区间。',
    mode: 'PRO',
    profileType: 'GAP_AND_GO',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { momentum: 0.35, volume: 0.30, relativeStrength: 0.20, trend: 0.15 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'chg', indicatorId: 'changePercent', operator: 'GTE', value: 1.5, label: '涨幅 >= +1.5%' },
        { type: 'leaf', id: 'rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.15, label: 'RVOL >= 1.15x' },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 10, label: '股价 >= $10' }
      ]
    }
  },
  {
    id: 'preset_mean_reversion',
    name: 'Bollinger & ATR Mean Reversion',
    nameZh: '布林极限均值回归',
    description: '触及布林通道极限下轨 (%B <= 0.20) 且 RSI 处于超卖区间，技术修复胜率高。',
    mode: 'PRO',
    profileType: 'MEAN_REVERSION',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { momentum: 0.35, structure: 0.25, volume: 0.20, relativeStrength: 0.20 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'bb', indicatorId: 'bollinger_percent_b', operator: 'LTE', value: 0.20, label: '布林带 %B <= 0.20' },
        { type: 'leaf', id: 'rsi', indicatorId: 'rsi', parameter: { period: 14 }, operator: 'LTE', value: 38, label: 'RSI(14) <= 38 超卖下轨' },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 10, label: '股价 >= $10' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 15000000, label: '日均成交额 >= $15M' }
      ]
    }
  },
  {
    id: 'preset_high_liquidity',
    name: 'High Liquidity Mega-Cap Core',
    nameZh: '大市值高流动性底仓',
    description: '日均成交额超 1 亿美元，低滑点，大资金机构稳健持仓池。',
    mode: 'PRO',
    profileType: 'HIGH_LIQUIDITY',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { trend: 0.25, relativeStrength: 0.25, sector: 0.20, momentum: 0.20, volatility: 0.10 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'cap', indicatorId: 'market_cap', operator: 'GTE', value: 50000000000, label: '市值 >= $50B' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 100000000, label: '日均成交额 >= $100M' },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 20, label: '股价 >= $20' },
        { type: 'leaf', id: 'atr', indicatorId: 'atr_percent', operator: 'LTE', value: 4.0, label: '稳健波动 ATR% <= 4.0%' }
      ]
    }
  },
  {
    id: 'preset_institutional_momentum',
    name: 'Jegadeesh-Titman 12M Momentum',
    nameZh: '机构中长线动能优选',
    description: '基于学术经典动量溢价理论：过去 12 个月持续强于基准，回踩中继续创新高。',
    mode: 'PRO',
    profileType: 'MOMENTUM',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { relativeStrength: 0.35, trend: 0.30, momentum: 0.20, sector: 0.15 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'rs', indicatorId: 'rs_rank', operator: 'GTE', value: 75, label: 'RS Rank >= 75' },
        { type: 'leaf', id: 'cap', indicatorId: 'market_cap', operator: 'GTE', value: 3000000000, label: '市值 >= $3B' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 25000000, label: '日均成交额 >= $25M' }
      ]
    }
  },
  {
    id: 'preset_earnings_momentum',
    name: 'Post-Earnings Drift Candidate',
    nameZh: '业绩超预期漂移筛选',
    description: '业绩报告公布后跳空高开并维持放量，捕捉中短期 PEAD 漂移效应。',
    mode: 'PRO',
    profileType: 'EARNINGS',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { momentum: 0.30, volume: 0.30, relativeStrength: 0.25, sector: 0.15 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'chg', indicatorId: 'changePercent', operator: 'GTE', value: 1.5, label: '单日涨幅 >= +1.5%' },
        { type: 'leaf', id: 'rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.15, label: '放量确认 RVOL >= 1.15x' },
        { type: 'leaf', id: 'cap', indicatorId: 'market_cap', operator: 'GTE', value: 2000000000, label: '市值 >= $2B' }
      ]
    }
  },
  {
    id: 'preset_short_squeeze',
    name: 'Short Squeeze Setup',
    nameZh: '空头回补轧空异动',
    description: '成交量明显放大、波动率急剧扩张，技术面向上突破逼空。',
    mode: 'PRO',
    profileType: 'SHORT_SQUEEZE',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { volume: 0.35, momentum: 0.35, volatility: 0.20, relativeStrength: 0.10 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.25, label: '放量脉冲 RVOL >= 1.25x' },
        { type: 'leaf', id: 'rsi', indicatorId: 'rsi', parameter: { period: 14 }, operator: 'GTE', value: 52, label: '多头动能 RSI(14) >= 52' },
        { type: 'leaf', id: 'atr', indicatorId: 'atr_percent', operator: 'GTE', value: 2.2, label: '高波幅扩张 ATR% >= 2.2%' },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 5, label: '股价 >= $5' }
      ]
    }
  },
  {
    id: 'preset_defensive',
    name: 'Defensive Low-Volatility Quality',
    nameZh: '低波防御抗跌优选',
    description: '大盘回调或震荡环境下的防守型配置，低波动，稳健现金流行业标的。',
    mode: 'PRO',
    profileType: 'DEFENSIVE',
    isSystem: true,
    createdAt: '2026-10-05T00:00:00.000Z',
    updatedAt: '2026-10-05T00:00:00.000Z',
    rankingWeights: { volatility: 0.30, trend: 0.25, sector: 0.25, relativeStrength: 0.20 },
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'atr', indicatorId: 'atr_percent', operator: 'LTE', value: 2.5, label: '低波幅 ATR% <= 2.5%' },
        { type: 'leaf', id: 'cap', indicatorId: 'market_cap', operator: 'GTE', value: 10000000000, label: '市值 >= $10B' },
        { type: 'leaf', id: 'dvol', indicatorId: 'avg_dollar_volume', operator: 'GTE', value: 30000000, label: '日均成交额 >= $30M' },
        { type: 'leaf', id: 'px', indicatorId: 'price', operator: 'GTE', value: 20, label: '股价 >= $20' }
      ]
    }
  }
];
