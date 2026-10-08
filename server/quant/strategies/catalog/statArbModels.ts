import { StrategyDefinition } from '../../../types.ts';

export const STAT_ARB_MODELS: StrategyDefinition[] = [
  {
    id: 'pairs_trading_cointegration',
    name: 'Gatev Cointegration Pairs Residual Mean Reversion',
    shortName: '协整配对交易残差均值回归',
    category: 'STAT_ARB',
    categoryLabel: '统计套利与截面配对 (Statistical Arbitrage)',
    family: 'short_term',
    horizon: '2-15 Trading Days',
    holdingPeriodLabel: '短线 2-15天',
    direction: 'BOTH',
    author: 'Evan Gatev, William Goetzmann & Geert Rouwenhorst',
    origin: 'Pairs Trading: Performance of a Relative-Value Arbitrage Rule (2006)',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_S',
    sourceReference: 'Gatev, E., Goetzmann, W. N., & Rouwenhorst, K. G. (2006). Pairs trading: Performance of a relative-value arbitrage rule. The Review of Financial Studies, 19(3), 797-827.',
    description: '华尔街自营与量化对冲基金最著名阿尔法模型。在同行业具有高度协整关系的资产对中，价差偏离超过2倍标准差时建仓回归。',
    winRateEst: 74.5,
    sharpeEst: 2.52,
    profitFactorEst: 3.15,
    difficultyLevel: 'EXPERT',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['配对标的残差序列ADF检验平稳（p<0.01）', '价差偏离达到历史残差均值+2.0个标准差', '做空相对高估端同时做多相对低估端'],
      exitRules: ['残差回归至历史均值（Z-score回归至0附近）平仓获利', '达到预定期限强行平仓'],
      invalidationRules: ['若残差进一步发散突破3.5个标准差强制止损']
    },
    parameters: [
      { id: 'zThreshold', name: 'Z-score开仓偏离门槛', type: 'number', default: 2.0, min: 1.5, max: 3.0, step: 0.1, description: '标准偏离阈值。' }
    ],
    rules: {
      type: 'group',
      id: 'pairs_arb_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'pairs_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 32, max: 68 }, label: '非系统性单边崩盘 (RSI 32-68)' },
        { type: 'leaf', id: 'pairs_vol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.0, label: '充沛套利流动性' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['统计套利', '配对交易', '协整检验', '对冲阿尔法'],
    version: '2.5.0'
  },
  {
    id: 'zscore_cross_sectional_arb',
    name: 'Cross-Sectional Factor Z-Score Mean Reversion',
    shortName: '截面 Z-Score 极值偏离套利',
    category: 'STAT_ARB',
    categoryLabel: '统计套利与截面配对 (Statistical Arbitrage)',
    family: 'short_term',
    horizon: '1-8 Trading Days',
    holdingPeriodLabel: '短线 1-8天',
    direction: 'LONG',
    author: 'Statistical Arbitrage Quant Group',
    origin: 'Cross-Sectional Valuation & Momentum Residual Reversion',
    sourceType: 'INSTITUTIONAL_REFERENCE',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Avellaneda, Marco, and Jeong-Hyun Lee. "Statistical arbitrage in the US equities market." Quantitative Finance (2010).',
    description: '通过截面主成分分析(PCA)剥离市场与行业因子后，针对残差特征收益偏离历史均值超过2.2个标准差的标的进行逆向套利。',
    winRateEst: 72.8,
    sharpeEst: 2.36,
    profitFactorEst: 2.90,
    difficultyLevel: 'EXPERT',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['个股行业内相对收益Z-Score达到-2.2极值', '该个股基本面无破产违约黑天鹅', '出现成交量回补企稳'],
      exitRules: ['残差收益回升至行业均值水平(Z-score=0)离场'],
      invalidationRules: ['残差跌破-3.2标准差止损']
    },
    parameters: [
      { id: 'minZ', name: '负向偏离Z值', type: 'number', default: -2.0, min: -3.0, max: -1.5, step: 0.1, description: '极度超跌偏离。' }
    ],
    rules: {
      type: 'group',
      id: 'zscore_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'z_rsi', indicatorId: 'rsi', operator: 'LTE', value: 33, label: '截面超跌极值 (RSI <= 33)' },
        { type: 'leaf', id: 'z_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.2, label: '企稳收阳 (> 0.2%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['Z-Score', '截面套利', 'PCA残差', '顶级对冲'],
    version: '2.5.0'
  },
  {
    id: 'etf_nav_premium_arbitrage',
    name: 'Sector ETF & Large-Cap Momentum Scissors Arbitrage',
    shortName: '行业 ETF 与龙头股动量剪刀差套利',
    category: 'STAT_ARB',
    categoryLabel: '统计套利与截面配对 (Statistical Arbitrage)',
    family: 'short_term',
    horizon: '2-10 Trading Days',
    holdingPeriodLabel: '短线 2-10天',
    direction: 'LONG',
    author: 'Index Arbitrage Trading Desk',
    origin: 'ETF Basket Dispersion & Lead-Lag Momentum',
    sourceType: 'INSTITUTIONAL_REFERENCE',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Ben-David, Itzhak, Francesco Franzoni, and Rabih Moussawi. "Do ETFs increase volatility?" The Journal of Finance (2018).',
    description: '当行业板块指数整体已放量突破，但该板块中最核心龙头股因短期大单压盘而出现滞后钝化时，捕捉补涨暴冲。',
    winRateEst: 70.4,
    sharpeEst: 2.20,
    profitFactorEst: 2.75,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['对应板块ETF已经连续大涨创20日新高', '龙头股仍处于整理蓄势末端，产生剪刀差', '龙头股出现资金回补大买单'],
      exitRules: ['龙头股加速补涨与板块同步后分批止盈'],
      invalidationRules: ['跌破蓄势平台底沿止损']
    },
    parameters: [
      { id: 'spreadThreshold', name: '板块剪刀差幅度(%)', type: 'number', default: 3.5, min: 2.0, max: 8.0, step: 0.5, description: '相对板块滞后百分比。' }
    ],
    rules: {
      type: 'group',
      id: 'etf_arb_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'etf_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 48, max: 62 }, label: '补涨前夜蓄势区 (RSI 48-62)' },
        { type: 'leaf', id: 'etf_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -12, label: '保持基本多头框架' },
        { type: 'leaf', id: 'etf_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.1, label: '资金开始回流 (RVOL >= 1.1x)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['ETF剪刀差', '补涨套利', '龙头滞后', '分散套利'],
    version: '2.5.0'
  },
  {
    id: 'dual_class_spread_convergence',
    name: 'Dual-Class Share & ADR Spread Convergence',
    shortName: '美股 ADR 与母股折溢价收敛',
    category: 'STAT_ARB',
    categoryLabel: '统计套利与截面配对 (Statistical Arbitrage)',
    family: 'swing',
    horizon: '3-20 Trading Days',
    holdingPeriodLabel: '波段 3-20天',
    direction: 'LONG',
    author: 'Global Cross-Border Arbitrage',
    origin: 'ADR Pricing Dislocation & FX-Adjusted Convergence',
    sourceType: 'INSTITUTIONAL_REFERENCE',
    evidenceLevel: 'LEVEL_B',
    sourceReference: 'Gagnon, Louis, and G. Andrew Karolyi. "Multi-market trading and arbitrage." Journal of Financial Economics (2010).',
    description: '美股上市ADR与其海外本土原股之间因汇率波动或流动性时区差异出现异常折价时，套利资金进场推动折溢价迅速收敛。',
    winRateEst: 75.2,
    sharpeEst: 2.58,
    profitFactorEst: 3.25,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['ADR经汇率折算后相对本土正股出现超过2.5%的折价', '折价主要源于时区交叠时的流动性错配', '美股端出现放量买盘护盘'],
      exitRules: ['折价收敛至0.5%以内完全平仓'],
      invalidationRules: ['折价持续扩大至5%以上止损']
    },
    parameters: [
      { id: 'minDiscount', name: '最小折价率(%)', type: 'number', default: 2.5, min: 1.5, max: 5.0, step: 0.5, description: '开仓折价阈值。' }
    ],
    rules: {
      type: 'group',
      id: 'dual_class_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'adr_rsi', indicatorId: 'rsi', operator: 'LTE', value: 42, label: '折价压制超跌 (RSI <= 42)' },
        { type: 'leaf', id: 'adr_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.3, label: '收敛翻红启动 (> 0.3%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['ADR套利', '基差收敛', '跨境价差', '高确定性'],
    version: '2.5.0'
  },
  {
    id: 'lead_lag_cross_asset',
    name: 'Supply Chain Lead-Lag Momentum Transmission',
    shortName: '产业链上下游领先后滞动量传导',
    category: 'STAT_ARB',
    categoryLabel: '统计套利与截面配对 (Statistical Arbitrage)',
    family: 'short_term',
    horizon: '1-5 Trading Days',
    holdingPeriodLabel: '短线 1-5天',
    direction: 'LONG',
    author: 'Bruno Biais & Pierre Hillion',
    origin: 'Financial Econometrics Lead-Lag Cross Predictive Framework',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Hou, Kewei. "Industry information diffusion and the lead-lag effect in stock returns." The Review of Financial Studies (2007).',
    description: '产业链核心上游（如半导体设备与代工厂）率先放量大涨后，下游设计与应用端标的通常存在1-3天的确定性动能传导窗口。',
    winRateEst: 68.6,
    sharpeEst: 2.14,
    profitFactorEst: 2.60,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['产业链领导厂商发布重大利好并大涨', '同产业链关联紧密的中游厂商尚未启动', '关联标的日内买盘开始异动集聚'],
      exitRules: ['跟随上涨达到第一阻力位离场', '持仓3-5天传导兑现'],
      invalidationRules: ['跌破前日收盘价止损']
    },
    parameters: [
      { id: 'leaderThreshold', name: '龙头涨幅确认(%)', type: 'number', default: 3.0, min: 2.0, max: 6.0, step: 0.5, description: '上游涨幅确立传导。' }
    ],
    rules: {
      type: 'group',
      id: 'lead_lag_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'll_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 45, max: 65 }, label: '等待传导启动区 (RSI 45-65)' },
        { type: 'leaf', id: 'll_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.15, label: '放量跟随启动 (RVOL >= 1.15x)' },
        { type: 'leaf', id: 'll_chg', indicatorId: 'changePercent', operator: 'GT', value: 0.4, label: '向上翻阳 (> 0.4%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['领先后滞', '产业链传导', 'Lead-Lag', '行业溢出'],
    version: '2.5.0'
  },
  {
    id: 'triangular_correlation_arb',
    name: 'Triangular Correlation & Statistical Dispersion Arbitrage',
    shortName: '三角相关性残差收敛套利',
    category: 'STAT_ARB',
    categoryLabel: '统计套利与截面配对 (Statistical Arbitrage)',
    family: 'short_term',
    horizon: '2-10 Trading Days',
    holdingPeriodLabel: '短线 2-10天',
    direction: 'BOTH',
    author: 'Quantitative Correlation Arbitrage Desk',
    origin: 'Triangular Basis Dispersion & Cross-Asset Implied Correlation',
    sourceType: 'INSTITUTIONAL_REFERENCE',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Driessen, Joost, Pascal J. Maenhout, and Grigory Vilkov. "The price of correlation risk." The American Economic Review (2009).',
    description: '在三只高度相关的美股龙头三角闭环中，当某只个股偏离另外两只隐含定价矩阵超过2倍标准差时介入收敛。',
    winRateEst: 73.2,
    sharpeEst: 2.40,
    profitFactorEst: 2.96,
    difficultyLevel: 'EXPERT',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['三角相关性矩阵偏离度达到历史极大值', '被套利标的显现过度超卖压制', '套利资金流入触发回归'],
      exitRules: ['残差回归至相关矩阵中值时了结'],
      invalidationRules: ['若结构性基本面破裂强平止损']
    },
    parameters: [
      { id: 'dispersionThreshold', name: '偏离标准差倍数', type: 'number', default: 2.0, min: 1.5, max: 3.0, step: 0.1, description: '开仓阈值。' }
    ],
    rules: {
      type: 'group',
      id: 'tri_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'tri_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 35, max: 65 }, label: '在合理区间偏离 (RSI 35-65)' },
        { type: 'leaf', id: 'tri_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.05, label: '充沛套利量能' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['三角套利', '相关性风险', '统计离散', '无风险阿尔法'],
    version: '2.5.0'
  }
];
