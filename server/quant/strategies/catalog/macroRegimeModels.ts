import { StrategyDefinition } from '../../../types.ts';

export const MACRO_REGIME_MODELS: StrategyDefinition[] = [
  {
    id: 'bridgewater_all_weather',
    name: 'Ray Dalio Bridgewater All-Weather Risk Parity',
    shortName: '桥水全天候风险平价轮动',
    category: 'MACRO_REGIME',
    categoryLabel: '全天候与宏观对冲 (Macro & Regime)',
    family: 'position',
    horizon: '1-12 Months',
    holdingPeriodLabel: '长线 1-12月',
    direction: 'LONG',
    author: 'Ray Dalio / Bridgewater Associates',
    origin: 'Risk Parity Framework Across 4 Economic Regimes (1996)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_S',
    sourceReference: 'Dalio, Ray. "Engineering targeted returns & risks." Bridgewater Associates Research (2011).',
    description: '全球最大对冲基金桥水传奇策略。根据“经济增长”与“通胀预期”的四宫格象限动态平衡资产波动率贡献，穿越任何经济危机。',
    winRateEst: 77.5,
    sharpeEst: 2.58,
    profitFactorEst: 3.20,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['根据宏观领先指标判断当前所处象限（通胀上行/增长下行/复苏/过热）', '配置该象限内夏普比率最高的核心资产龙头', '风险波动率等权重平价'],
      exitRules: ['宏观象限发生转移时进行季度组合再平衡', '偏离风险平价预算时调仓'],
      invalidationRules: ['遭遇极端全球流动性紧缩执行动态降杠杆']
    },
    parameters: [
      { id: 'targetVol', name: '组合目标波动率(%)', type: 'number', default: 10, min: 6, max: 18, step: 2, description: '全天候目标风险水平。' }
    ],
    rules: {
      type: 'group',
      id: 'all_weather_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'aw_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 45, max: 70 }, label: '运行于稳健长期通道 (RSI 45-70)' },
        { type: 'leaf', id: 'aw_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -12, label: '极度抗跌资产 (距高点 < 12%)' },
        { type: 'leaf', id: 'aw_price', indicatorId: 'price', operator: 'GT', value: 20, label: '主流大资产标的' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['桥水', '全天候', '风险平价', '达利欧', '宏观对冲'],
    version: '2.5.0'
  },
  {
    id: 'sector_rs_rotation',
    name: 'Sector Relative Strength (RS) Momentum Rotation',
    shortName: '标普500 行业相对强弱 (RS) 动量轮动',
    category: 'MACRO_REGIME',
    categoryLabel: '全天候与宏观对冲 (Macro & Regime)',
    family: 'swing',
    horizon: '1-3 Months',
    holdingPeriodLabel: '中期 1-3月',
    direction: 'LONG',
    author: 'John Murphy',
    origin: 'Intermarket Technical Analysis & Sector Rotation (1991)',
    sourceType: 'ORIGINAL_AUTHOR',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Murphy, John J. "Intermarket Analysis: Leveraging the Global Investment Opportunity." (2004).',
    description: '美股经典跨市场行业轮动。计算各行业板块相对标普500(SPY)的比率曲线，聚焦处于领头羊强势轮动象限的顶流个股。',
    winRateEst: 72.1,
    sharpeEst: 2.25,
    profitFactorEst: 2.78,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['个股所在行业板块相对大盘RS比率连续3周走强', '个股在板块内部动量排名前20%', '形成顺应行业大风口的共振买点'],
      exitRules: ['板块RS比率拐头跌破20日均线时轮动撤离', '调仓至新启动板块'],
      invalidationRules: ['跌破行业领军平台下沿止损']
    },
    parameters: [
      { id: 'minRsRank', name: '行业RS前排比例(%)', type: 'number', default: 25, min: 10, max: 40, step: 5, description: '前25%强势板块。' }
    ],
    rules: {
      type: 'group',
      id: 'rs_rot_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'rs_rsi', indicatorId: 'rsi', operator: 'GT', value: 56, label: '跑赢大盘强动能 (RSI > 56)' },
        { type: 'leaf', id: 'rs_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -10, label: '行业先锋新高' },
        { type: 'leaf', id: 'rs_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.15, label: '板块资金涌入 (RVOL >= 1.15x)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['行业轮动', '相对强度', 'RS动量', 'John Murphy'],
    version: '2.5.0'
  },
  {
    id: 'treasury_sensitive_defense',
    name: 'Yield Sensitive High-Dividend Defensive Anchor',
    shortName: '利率敏感型高股息低波动防御',
    category: 'MACRO_REGIME',
    categoryLabel: '全天候与宏观对冲 (Macro & Regime)',
    family: 'position',
    horizon: '3-12 Months',
    holdingPeriodLabel: '长线 3-12月',
    direction: 'LONG',
    author: 'Macro Fixed Income & Equity Cross Group',
    origin: 'Bond-Proxy Equities & Yield Curve Macro Rotation',
    sourceType: 'INSTITUTIONAL_REFERENCE',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Campbell, John Y., and Robert J. Shiller. "Yield spreads and interest rate movements." The Review of Economic Studies (1991).',
    description: '在美联储降息周期或收益率曲线倒挂修复期，公用事业、电讯与必需消费类高股息资产具备极佳的债券替代与抗跌Alpha。',
    winRateEst: 74.2,
    sharpeEst: 2.34,
    profitFactorEst: 2.90,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['宏观利率处于顶点转向或下行通道', '股息率显著高于10年期美债收益率利差+100bp', '现金流稳健无削减股息风险'],
      exitRules: ['长端国债利率急剧飙升导致股息吸引力下降时调仓'],
      invalidationRules: ['跌破50周长周期防御线清仓']
    },
    parameters: [
      { id: 'spreadOverTreasury', name: '股息利差门槛(bp)', type: 'number', default: 100, min: 50, max: 250, step: 25, description: '高于美债收益率。' }
    ],
    rules: {
      type: 'group',
      id: 'bond_proxy_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'bp_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 44, max: 64 }, label: '低波防守 (RSI 44-64)' },
        { type: 'leaf', id: 'bp_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -14, label: '大跌中韧性抗跌' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['利率敏感', '降息对冲', '高股息', '防御资产'],
    version: '2.5.0'
  },
  {
    id: 'merrill_clock_expansion',
    name: 'Merrill Lynch Investment Clock Tech Expansion',
    shortName: '美林时钟复苏期科技成长领航',
    category: 'MACRO_REGIME',
    categoryLabel: '全天候与宏观对冲 (Macro & Regime)',
    family: 'position',
    horizon: '2-6 Months',
    holdingPeriodLabel: '中期 2-6月',
    direction: 'LONG',
    author: 'Merrill Lynch Strategy Team',
    origin: 'The Investment Clock: Making Money from Macro (2004)',
    sourceType: 'INSTITUTIONAL_REFERENCE',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Trevor Greetham. "The Investment Clock: Making Money from Macro." Merrill Lynch (2004).',
    description: '美林投资时钟经典模型。在经济复苏至过热扩张期，大科技、半导体与非必需消费成长股由于高盈利弹性与风险偏好抬升而大涨。',
    winRateEst: 73.4,
    sharpeEst: 2.30,
    profitFactorEst: 2.85,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['宏观处于美林时钟复苏/扩张象限', '科技与半导体龙头股处于主升浪突破形态', '盈利预期与估值双轮驱动戴维斯双击'],
      exitRules: ['经济进入滞胀或衰退期转向防御，全面获利了结'],
      invalidationRules: ['跌破主升浪趋势线下沿止损']
    },
    parameters: [
      { id: 'peRatioMax', name: '估值上限', type: 'number', default: 60, min: 25, max: 100, step: 5, description: '估值保护门槛。' }
    ],
    rules: {
      type: 'group',
      id: 'merrill_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'merrill_rsi', indicatorId: 'rsi', operator: 'GT', value: 55, label: '成长动能领跑 (RSI > 55)' },
        { type: 'leaf', id: 'merrill_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.2, label: '机构加速配置 (RVOL >= 1.2x)' },
        { type: 'leaf', id: 'merrill_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -12, label: '强势领涨龙头' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['美林时钟', '科技成长', '宏观扩张', '戴维斯双击'],
    version: '2.5.0'
  }
];
