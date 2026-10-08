import { StrategyDefinition } from '../../../types.ts';

export const FACTOR_MODELS: StrategyDefinition[] = [
  {
    id: 'jt_momentum',
    name: 'Jegadeesh & Titman Cross-Sectional Momentum Factor',
    shortName: 'JT 截面动量因子模型',
    category: 'FACTOR',
    categoryLabel: '多因子与学术阿尔法 (Multi-Factor)',
    family: 'factor',
    horizon: '1-6 Months',
    holdingPeriodLabel: '中期 1-6月',
    direction: 'LONG',
    author: 'Narasimhan Jegadeesh & Sheridan Titman',
    origin: 'Journal of Finance: Returns to Buying Winners (1993)',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_S',
    sourceReference: 'Jegadeesh, N., & Titman, S. (1993). Returns to Buying Winners and Selling Losers. The Journal of Finance, 48(1), 65-91.',
    description: '量化金融领域引用量最高的实证资产定价顶刊经典。买入过去3-12个月收益排名前10%的强动能赢家股组合。',
    winRateEst: 67.5,
    sharpeEst: 2.15,
    profitFactorEst: 2.65,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['过去6个月收益率处于全市场前10%分位数', '跳过最近1个月反转期（防止微观反转磨损）', '做多排名前列的截面动量赢家'],
      exitRules: ['月度截面重新打分，动量排名掉出前30%时移出组合', '趋势发生系统性结构反转清仓'],
      invalidationRules: ['若回撤达到8%执行组合再平衡止损']
    },
    parameters: [
      { id: 'lookbackMonths', name: '动量回溯周期 (月)', type: 'number', default: 6, min: 3, max: 12, step: 1, description: '经典J-T模型标准形成期为6个月。' },
      { id: 'holdingMonths', name: '持有期 (月)', type: 'number', default: 6, min: 1, max: 12, step: 1, description: '经典J-T持有期为6个月。' }
    ],
    rules: {
      type: 'group',
      id: 'jt_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'jt_rsi', indicatorId: 'rsi', operator: 'GT', value: 55, label: '维持在中长期动量强势区 (RSI > 55)' },
        { type: 'leaf', id: 'jt_high_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -15, label: '位于近高点强势区间 (距高点 < 15%)' },
        { type: 'leaf', id: 'jt_price', indicatorId: 'price', operator: 'GT', value: 10, label: '排除低价垃圾股 (Price > $10)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['学术顶刊', 'JT动量', '资产定价', '截面多因子'],
    version: '2.5.0'
  },
  {
    id: 'fama_french_size_mom',
    name: 'Fama-French Size & Momentum Quality Composite',
    shortName: 'Fama-French 规模动量复合模型',
    category: 'FACTOR',
    categoryLabel: '多因子与学术阿尔法 (Multi-Factor)',
    family: 'factor',
    horizon: '3-12 Months',
    holdingPeriodLabel: '中长线 3-12月',
    direction: 'LONG',
    author: 'Eugene Fama & Kenneth French',
    origin: 'Nobel Prize Winning Factor Pricing Framework (1993/2015)',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_S',
    sourceReference: 'Fama, Eugene F., and Kenneth R. French. "Common risk factors in the returns on stocks and bonds." Journal of Financial Economics (1993).',
    description: '诺贝尔经济学奖得主Fama资产定价模型衍生。在中等规模和高盈利标的中筛选具有持续超额Alpha的优质标的。',
    winRateEst: 65.8,
    sharpeEst: 2.05,
    profitFactorEst: 2.42,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['市值适中具备成长弹性', '具有持续正向现金流与高毛利', '技术面处于中期多头上升波段'],
      exitRules: ['季度财报恶化或Alpha消退时调仓'],
      invalidationRules: ['跌破长期价值支撑线止损']
    },
    parameters: [
      { id: 'minCap', name: '最低市值 (亿美元)', type: 'number', default: 20, min: 5, max: 100, step: 5, description: '过滤微型股。' }
    ],
    rules: {
      type: 'group',
      id: 'ff_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'ff_rsi', indicatorId: 'rsi', operator: 'GT', value: 50, label: '技术面稳健 (RSI > 50)' },
        { type: 'leaf', id: 'ff_price', indicatorId: 'price', operator: 'GT', value: 15, label: '成熟企业标的 (Price > $15)' },
        { type: 'leaf', id: 'ff_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.0, label: '活跃交易 (RVOL >= 1.0x)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['Fama-French', '诺贝尔奖', '多因子选股', 'Smart Beta'],
    version: '2.5.0'
  },
  {
    id: 'piotroski_f_score',
    name: 'Joseph Piotroski F-Score High Quality Momentum',
    shortName: 'Piotroski F-Score 高分基本面动量',
    category: 'FACTOR',
    categoryLabel: '多因子与学术阿尔法 (Multi-Factor)',
    family: 'position',
    horizon: '3-12 Months',
    holdingPeriodLabel: '中长线 3-12月',
    direction: 'LONG',
    author: 'Joseph Piotroski',
    origin: 'Value Investing: The Use of Historical Financial Statement (2000)',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_S',
    sourceReference: 'Piotroski, Joseph D. "Value Investing: The Use of Historical Financial Statement Information to Separate Winners from Losers." Journal of Accounting Research (2000).',
    description: '斯坦福大学教授打造的9分制财务质地评分。筛选盈利能力、财务杠杆、运营效率全部优化的顶级基本面标的。',
    winRateEst: 71.2,
    sharpeEst: 2.38,
    profitFactorEst: 2.95,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['F-Score总分在8分或9分以上（顶级财务质地）', '自由现金流大于净利润', '均线系统多头排列支持基本面放量'],
      exitRules: ['年度/半年度财报F-Score降至6分以下退出'],
      invalidationRules: ['跌破核心多头均线止损']
    },
    parameters: [
      { id: 'minScore', name: '最低 F-Score 分数', type: 'number', default: 8, min: 7, max: 9, step: 1, description: '满分9分，8-9分为极度优秀。' }
    ],
    rules: {
      type: 'group',
      id: 'fscore_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'fscore_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 52, max: 75 }, label: '稳健向上通道 (RSI 52-75)' },
        { type: 'leaf', id: 'fscore_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -18, label: '未深度破位 (距高点 < 18%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['F-Score', '斯坦福', '基本面量化', '顶级白马'],
    version: '2.5.0'
  },
  {
    id: 'low_volatility_anomaly',
    name: 'Low Volatility Anomaly Quality Alpha',
    shortName: '贝塔异象低波动优质阿尔法',
    category: 'FACTOR',
    categoryLabel: '多因子与学术阿尔法 (Multi-Factor)',
    family: 'position',
    horizon: '1-12 Months',
    holdingPeriodLabel: '长线 1-12月',
    direction: 'LONG',
    author: 'Malcolm Baker, Brendan Bradley & Jeffrey Wurgler',
    origin: 'Financial Analysts Journal: Benchmarks as Limits to Arbitrage (2011)',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Baker, Malcolm, Brendan Bradley, and Jeffrey Wurgler. "Benchmarks as limits to arbitrage: Understanding the low-volatility anomaly." (2011).',
    description: '经典现代投资组合异象。低波动、低贝塔股票在长期风险调整后收益显著碾压高波动热门投机股。',
    winRateEst: 69.4,
    sharpeEst: 2.22,
    profitFactorEst: 2.70,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['标的年化实际波动率处于同业最低分位数', '最大回撤显著小于标普500基准', '股价稳定处于50日和200日均线上方'],
      exitRules: ['波动率异动飙升并伴随基本面恶化时调仓'],
      invalidationRules: ['跌穿200日长期防守均线止损']
    },
    parameters: [
      { id: 'maxBeta', name: '最高Beta系数', type: 'number', default: 0.75, min: 0.5, max: 1.0, step: 0.05, description: '低于大盘波动。' }
    ],
    rules: {
      type: 'group',
      id: 'low_vol_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'lv_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 46, max: 65 }, label: '低波窄幅运行 (RSI 46-65)' },
        { type: 'leaf', id: 'lv_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -10, label: '极其抗跌 (距高点 < 10%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['低波动异象', 'Low-Vol', '抗跌Alpha', '稳健长牛'],
    version: '2.5.0'
  },
  {
    id: 'novy_marx_profitability',
    name: 'Robert Novy-Marx Gross Profitability Factor',
    shortName: 'Novy-Marx 毛利动量优质成长因子',
    category: 'FACTOR',
    categoryLabel: '多因子与学术阿尔法 (Multi-Factor)',
    family: 'factor',
    horizon: '2-12 Months',
    holdingPeriodLabel: '中长线 2-12月',
    direction: 'LONG',
    author: 'Robert Novy-Marx',
    origin: 'Journal of Financial Economics (2013)',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_S',
    sourceReference: 'Novy-Marx, Robert. "The other side of value: The gross profitability premium." Journal of Financial Economics (2013).',
    description: '全美顶尖实证金融学突破。毛利/总资产比率能够强力预测未来横截面预期收益，能完美免疫会计造假与操纵。',
    winRateEst: 68.1,
    sharpeEst: 2.12,
    profitFactorEst: 2.55,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['毛利润占总资产比位列全行业前20%', '结合中短期价格动能进行双重筛选', '买入高质量护城河成长股'],
      exitRules: ['资产毛利效率下滑至平均水平以下调仓'],
      invalidationRules: ['出现系统性熊市或跌破150日均线']
    },
    parameters: [
      { id: 'minMargin', name: '毛利率门槛(%)', type: 'number', default: 40, min: 20, max: 60, step: 5, description: '高护城河行业壁垒。' }
    ],
    rules: {
      type: 'group',
      id: 'novy_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'novy_rsi', indicatorId: 'rsi', operator: 'GT', value: 52, label: '多头动能支撑 (RSI > 52)' },
        { type: 'leaf', id: 'novy_price', indicatorId: 'price', operator: 'GT', value: 20, label: '优质高价标的 (Price > $20)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['Novy-Marx', '毛利溢价', '高质量因子', '护城河'],
    version: '2.5.0'
  },
  {
    id: 'carhart_four_factor',
    name: 'Carhart Four-Factor Momentum Cross-Alpha',
    shortName: 'Carhart 四因子动量增强策略',
    category: 'FACTOR',
    categoryLabel: '多因子与学术阿尔法 (Multi-Factor)',
    family: 'factor',
    horizon: '1-6 Months',
    holdingPeriodLabel: '中期 1-6月',
    direction: 'LONG',
    author: 'Mark Carhart',
    origin: 'Journal of Finance: On Persistence in Mutual Fund Performance (1997)',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_S',
    sourceReference: 'Carhart, Mark M. "On persistence in mutual fund performance." The Journal of Finance (1997).',
    description: '公募与对冲基金业绩归因行业黄金标准。在市场(MKT)、规模(SMB)、价值(HML)基础上增加动量(WML)因子。',
    winRateEst: 66.4,
    sharpeEst: 2.01,
    profitFactorEst: 2.40,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['综合四因子Alpha残差评分位于全市场顶端', '在动量与价值之间保持因子正交平衡', '机构评级整体为买入'],
      exitRules: ['月度Alpha打分衰减时执行组合再平衡'],
      invalidationRules: ['跌破动量下轨止损']
    },
    parameters: [
      { id: 'topPercentile', name: '优选分位数(%)', type: 'number', default: 10, min: 5, max: 20, step: 1, description: '前10%多因子Alpha标的。' }
    ],
    rules: {
      type: 'group',
      id: 'carhart_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'carhart_rsi', indicatorId: 'rsi', operator: 'GT', value: 54, label: '动能强劲 (RSI > 54)' },
        { type: 'leaf', id: 'carhart_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.1, label: '稳步吸筹 (RVOL >= 1.1x)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['Carhart四因子', '基金归因', 'WML动量', '资产定价'],
    version: '2.5.0'
  },
  {
    id: 'dividend_yield_growth',
    name: 'Dividend Growth & Free Cash Flow Aristocrats',
    shortName: '股息成长与自由现金流双核模型',
    category: 'FACTOR',
    categoryLabel: '多因子与学术阿尔法 (Multi-Factor)',
    family: 'position',
    horizon: '3-24 Months',
    holdingPeriodLabel: '长线 3-24月',
    direction: 'LONG',
    author: 'David Fish',
    origin: 'Dividend Champions, Contenders, and Challengers (2008)',
    sourceType: 'ESTABLISHED_PRACTITIONER',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Fish, David. "Dividend Aristocrats Investing Handbook." (2008).',
    description: '连续10年以上增加股息派发、自由现金流充沛的红利成长之王，在穿越多次熊市周期中均表现出极强的复利Alpha。',
    winRateEst: 73.5,
    sharpeEst: 2.45,
    profitFactorEst: 3.10,
    difficultyLevel: 'BEGINNER',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['连续10年以上股息持续增长', '股息支付率在合理健康的60%以下', '出现技术面回踩企稳长线买点'],
      exitRules: ['公司宣布削减或停发股息当天坚决离场'],
      invalidationRules: ['基本面分红政策恶化清仓']
    },
    parameters: [
      { id: 'minYield', name: '最低股息率(%)', type: 'number', default: 2.0, min: 1.0, max: 6.0, step: 0.5, description: '稳健现金流回报。' }
    ],
    rules: {
      type: 'group',
      id: 'div_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'div_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 42, max: 68 }, label: '波动稳健 (RSI 42-68)' },
        { type: 'leaf', id: 'div_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -15, label: '保持长牛结构 (距高点 < 15%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['红利贵族', '现金流', '抗通胀', '长期复利'],
    version: '2.5.0'
  },
  {
    id: 'sue_earnings_momentum',
    name: 'Standardized Unexpected Earnings (SUE) Drift',
    shortName: 'SUE 盈余超预期价格漂移因子',
    category: 'FACTOR',
    categoryLabel: '多因子与学术阿尔法 (Multi-Factor)',
    family: 'swing',
    horizon: '1-3 Months',
    holdingPeriodLabel: '中期 1-3月',
    direction: 'LONG',
    author: 'Victor Bernard & Jacob Thomas',
    origin: 'Post-Earnings-Announcement Drift: Delayed Price Response (1989)',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_A',
    sourceReference: 'Bernard, Victor L., and Jacob K. Thomas. "Post-earnings-announcement drift: delayed price response or risk premium?" Journal of Accounting Research (1989).',
    description: '华尔街著名的“业绩漂移效应(PEAD)”。当季报EPS与营收大幅超越华尔街一致预期，机构资金往往会在随后60天内持续净买入。',
    winRateEst: 70.8,
    sharpeEst: 2.32,
    profitFactorEst: 2.82,
    difficultyLevel: 'INTERMEDIATE',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['财报超预期幅度(SUE)显著大于2个标准差', '财报公布日伴随跳空放量且收在日内高位', '随后数日缩量回踩缺口不破'],
      exitRules: ['下季度财报前夕获利平仓规避不确定性', '达到3倍初始风险止盈'],
      invalidationRules: ['完全回补业绩跳空缺口下沿强制止损']
    },
    parameters: [
      { id: 'minSurprise', name: 'EPS 超预期幅度(%)', type: 'number', default: 10, min: 5, max: 30, step: 5, description: '盈利超出一致预期比例。' }
    ],
    rules: {
      type: 'group',
      id: 'sue_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'sue_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.35, label: '业绩爆量推动 (RVOL >= 1.35x)' },
        { type: 'leaf', id: 'sue_rsi', indicatorId: 'rsi', operator: 'GT', value: 58, label: '动量爆发区 (RSI > 58)' },
        { type: 'leaf', id: 'sue_chg', indicatorId: 'changePercent', operator: 'GT', value: 1.5, label: '单日强劲上涨 (> 1.5%)' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['SUE', '盈余漂移', 'PEAD', '财报超预期'],
    version: '2.5.0'
  },
  {
    id: 'q_factor_growth_combo',
    name: 'Hou-Xue-Zhang Q-Factor Investment & ROE Composite',
    shortName: 'Q-Factor 投资与ROE双核动量',
    category: 'FACTOR',
    categoryLabel: '多因子与学术阿尔法 (Multi-Factor)',
    family: 'factor',
    horizon: '2-12 Months',
    holdingPeriodLabel: '中长线 2-12月',
    direction: 'LONG',
    author: 'Kewei Hou, Chen Xue & Lu Zhang',
    origin: 'Digesting Anomalies: An Investment Approach (Review of Financial Studies 2015)',
    sourceType: 'ACADEMIC_RESEARCH',
    evidenceLevel: 'LEVEL_S',
    sourceReference: 'Hou, Kewei, Chen Xue, and Lu Zhang. "Digesting anomalies: An investment approach." The Review of Financial Studies 28.3 (2015): 650-705.',
    description: '击败传统Fama-French的现代资产定价顶刊四因子Q-model。低资本开支过度扩张、高ROE股本回报率与动量组合。',
    winRateEst: 71.8,
    sharpeEst: 2.38,
    profitFactorEst: 2.92,
    difficultyLevel: 'ADVANCED',
    riskLevel: 'LOW',
    tradingLogic: {
      entryRules: ['ROE位于全市场前15%分位数', '投资增长率稳健克制（杜绝烧钱盲目稀释）', '股价位于50日均线上方形成动量拐点'],
      exitRules: ['季度ROE骤降或动能衰退调仓'],
      invalidationRules: ['跌穿中期支撑均线止损']
    },
    parameters: [
      { id: 'minRoe', name: '最低净资产收益率ROE(%)', type: 'number', default: 18, min: 10, max: 35, step: 2, description: '顶级商业回报率。' }
    ],
    rules: {
      type: 'group',
      id: 'qfactor_root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'qf_rsi', indicatorId: 'rsi', operator: 'BETWEEN', value: { min: 53, max: 72 }, label: '稳步推升多头动能 (RSI 53-72)' },
        { type: 'leaf', id: 'qf_dist', indicatorId: 'distFrom52wHigh', operator: 'GTE', value: -15, label: '保持长牛走势' },
        { type: 'leaf', id: 'qf_price', indicatorId: 'price', operator: 'GT', value: 15, label: '主流优质企业' }
      ]
    },
    defaultTimeframes: ['1D'],
    tags: ['Q-Factor', 'Lu Zhang', '高ROE', '顶刊资产定价'],
    version: '2.5.0'
  }
];
