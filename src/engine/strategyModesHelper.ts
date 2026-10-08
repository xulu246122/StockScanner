import { StrategyDefinition, StrategyModeType, StrategyModeConfig, StrategyParamConfig, Timeframe } from '../types.ts';

/**
 * Generates the 3 adaptive mode profiles (Short Term, Swing, Position) for any strategy.
 */
export function generateDefaultModesForStrategy(strategy: StrategyDefinition): Record<StrategyModeType, StrategyModeConfig> {
  const baseParams: StrategyParamConfig[] = Array.isArray(strategy.parameters)
    ? (strategy.parameters as StrategyParamConfig[])
    : strategy.paramConfigs || [];

  const extractDefaultParams = (): Record<string, any> => {
    const res: Record<string, any> = {};
    baseParams.forEach(p => {
      res[p.id] = p.default !== undefined ? p.default : p.value;
    });
    return res;
  };

  const defaultValues = extractDefaultParams();

  // Determine native style
  const nativeMode: StrategyModeType =
    strategy.family === 'short_term'
      ? 'short_term'
      : strategy.family === 'position' || strategy.family === 'long_term'
      ? 'position'
      : 'swing';

  // Helper to adjust parameters for short-term mode
  const getShortTermParams = (): Record<string, any> => {
    const p = { ...defaultValues };
    if (p.rsiThreshold !== undefined) p.rsiThreshold = Math.max(10, p.rsiThreshold - 2);
    if (p.rsiOversold !== undefined) p.rsiOversold = Math.max(10, p.rsiOversold - 2);
    if (p.minRvol !== undefined) p.minRvol = Math.max(1.1, Number((p.minRvol * 1.05).toFixed(1)));
    if (p.lookback !== undefined) p.lookback = Math.max(5, Math.round(p.lookback * 0.7));
    if (p.fastPeriod !== undefined) p.fastPeriod = Math.max(3, Math.round(p.fastPeriod * 0.7));
    if (p.slowPeriod !== undefined) p.slowPeriod = Math.max(10, Math.round(p.slowPeriod * 0.7));
    if (p.donchianPeriod !== undefined) p.donchianPeriod = 10;
    if (p.distFromHigh !== undefined) p.distFromHigh = 3.0;
    return p;
  };

  // Helper to adjust parameters for swing mode
  const getSwingParams = (): Record<string, any> => {
    return { ...defaultValues };
  };

  // Helper to adjust parameters for position mode
  const getPositionParams = (): Record<string, any> => {
    const p = { ...defaultValues };
    if (p.rsiThreshold !== undefined) p.rsiThreshold = Math.min(45, p.rsiThreshold + 5);
    if (p.rsiOversold !== undefined) p.rsiOversold = Math.min(45, p.rsiOversold + 5);
    if (p.minRvol !== undefined) p.minRvol = Math.max(1.0, Number((p.minRvol * 0.9).toFixed(1)));
    if (p.lookback !== undefined) p.lookback = Math.round(p.lookback * 1.5);
    if (p.fastPeriod !== undefined) p.fastPeriod = Math.round(p.fastPeriod * 1.5);
    if (p.slowPeriod !== undefined) p.slowPeriod = Math.round(p.slowPeriod * 1.5);
    if (p.donchianPeriod !== undefined) p.donchianPeriod = 20;
    if (p.distFromHigh !== undefined) p.distFromHigh = 10.0;
    return p;
  };

  const baseRisk = strategy.riskFramework || {
    entryReference: '确认信号触发价格',
    invalidation: '跌破前低或止损关口',
    stopLossRule: '固定 4-6% 严格止损',
    profitTargetRule: '移动止盈 trailing stop'
  };

  const shortTermRisk = {
    entryReference: '分时突破或超卖急速反弹点',
    invalidation: '跌破触发棒最低价',
    stopLossRule: '2.5% - 3.5% 紧密日内止损',
    profitTargetRule: '1.5-2.0 盈亏比快速获利结清'
  };

  const swingRisk = {
    ...baseRisk,
    stopLossRule: baseRisk.stopLossRule || '4.0% - 6.0% 波段标准止损'
  };

  const positionRisk = {
    entryReference: '周线级别趋势确认突破点',
    invalidation: '跌破20日均线或关键结构支点',
    stopLossRule: '7.0% - 10.0% 移动追踪止损 (Trailing Stop)',
    profitTargetRule: '分批止盈并让利润持续奔跑'
  };

  return {
    short_term: {
      modeType: 'short_term',
      modeName: '超短线 (Short Term)',
      applicableTimeframes: ['10m', '30m', '1h'],
      defaultTimeframe: '1h',
      parameters: getShortTermParams(),
      parameterNotes: '调紧超卖与动量阈值，缩短回看周期，捕捉日内高频快速反弹信号。',
      riskFramework: shortTermRisk,
      riskNotes: '高频交易风险较高，控制单笔仓位在 5%-10%，严格执行 3% 以内紧密止损。'
    },
    swing: {
      modeType: 'swing',
      modeName: '波段交易 (Swing)',
      applicableTimeframes: ['1D'],
      defaultTimeframe: '1D',
      parameters: getSwingParams(),
      parameterNotes: '采用经典机构标准参数，兼顾胜率与盈亏比，适合 2-10 个交易日持仓。',
      riskFramework: swingRisk,
      riskNotes: '标准波段风控，建议仓位 10%-15%，止损区间控制在 4%-6%。'
    },
    position: {
      modeType: 'position',
      modeName: '趋势持仓 (Position)',
      applicableTimeframes: ['1W', '1M'],
      defaultTimeframe: '1W',
      parameters: getPositionParams(),
      parameterNotes: '放宽指标噪音过滤，延长均线与指标周期，捕获数周至数月的大波段趋势。',
      riskFramework: positionRisk,
      riskNotes: '持仓周期较长，承受较大波动回撤，建议采用移动追踪止损并分批建仓。'
    }
  };
}

/**
 * Ensures strategy definition has modes fully initialized.
 */
export function ensureStrategyModes(strategy: StrategyDefinition): StrategyDefinition {
  if (strategy.modes && strategy.modes.short_term && strategy.modes.swing && strategy.modes.position) {
    return strategy;
  }

  const generated = generateDefaultModesForStrategy(strategy);
  const nativeMode: StrategyModeType =
    strategy.family === 'short_term'
      ? 'short_term'
      : strategy.family === 'position' || strategy.family === 'long_term'
      ? 'position'
      : 'swing';

  return {
    ...strategy,
    defaultMode: strategy.defaultMode || nativeMode,
    modes: generated
  };
}
