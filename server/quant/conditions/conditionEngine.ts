import {
  ConditionGroup,
  ConditionNode,
  ConditionEvaluationResult,
  Timeframe,
  ConditionOperator
} from '../../types.ts';

export interface EvaluatedDataContext {
  ticker: string;
  price: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  rvol: number;
  avgVolume?: number;
  avgDollarVolume?: number;
  high52w?: number;
  low52w?: number;
  distFrom52wHigh?: number;
  distFrom52wLow?: number;
  atr?: number;
  atrPercent?: number;
  rangeAtrMultiple?: number;
  closeLocationPercent?: number;
  distEma20Atr?: number;
  peRatio?: number;
  rsiValues: Record<number, number>; // period -> value
  previousRsiValues?: Record<number, number>;
  smaValues: Record<number, number>; // period -> value
  emaValues: Record<number, number>; // period -> value
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
    isBullishCross: boolean;
    isBearishCross: boolean;
  };
  stochastic?: {
    k: number;
    d: number;
    isBullishCross: boolean;
  };
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
    widthPct: number;
    percentB: number;
  };
  donchian?: {
    upper: number;
    lower: number;
    middle: number;
    isBreakoutHigh: boolean;
    distanceToHighPct: number;
  };
  darvas?: {
    boxHigh: number;
    boxLow: number;
    boxWidthPct: number;
    isBreakout: boolean;
    distanceToBreakoutPct: number;
  };
  adx?: {
    adx: number;
    plusDI: number;
    minusDI: number;
    isTrending: boolean;
    trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  relativeStrengthVsSpy?: number;
  rsRank?: number;
  marketRegime?: 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF';
  sector?: string;
  industry?: string;
  exchange?: string;
  securityType?: string;
  daysToEarnings?: number | null;
  change5d?: number;
  change20d?: number;
  change60d?: number;
  factorScores?: {
    piotroskiScore?: number;
    grossProfitability?: number;
    sloanAccrual?: number;
    magicFormulaRank?: number;
    beta?: number;
    momentum12m?: number;
    bookToMarket?: number;
  };
  riskRewardRatio?: number;
  stopDistancePct?: number;
  catalystActive?: boolean;
  sectorRegime?: string;
}

export class ConditionEngine {
  /**
   * Resolves the actual numeric or boolean value for a leaf node from the data context
   */
  public static resolveIndicatorValue(node: ConditionNode, ctx: EvaluatedDataContext): any {
    switch (node.indicatorId) {
      case 'price':
        return ctx.price;
      case 'changePercent':
      case 'change_1d':
        return ctx.changePercent;
      case 'change5d':
      case 'change_5d':
        return ctx.change5d ?? ctx.changePercent;
      case 'change20d':
      case 'change_20d':
      case 'change_1m':
        return ctx.change20d ?? (ctx.changePercent * 3);
      case 'change60d':
      case 'change_60d':
      case 'change_3m':
        return ctx.change60d ?? (ctx.changePercent * 5);
      case 'market_cap':
        return ctx.marketCap;
      case 'market_cap_tier': {
        if (ctx.marketCap >= 200_000_000_000) return 'MEGA';
        if (ctx.marketCap >= 10_000_000_000) return 'LARGE';
        if (ctx.marketCap >= 2_000_000_000) return 'MID';
        if (ctx.marketCap >= 300_000_000) return 'SMALL';
        return 'MICRO';
      }
      case 'relative_volume':
      case 'rvol':
        return ctx.rvol;
      case 'volume':
        return ctx.volume;
      case 'avg_dollar_volume':
        return ctx.avgDollarVolume ?? (ctx.volume * ctx.price);
      case 'avg_volume':
      case 'avg_volume_20d':
      case 'avg_volume_50d':
        return ctx.avgVolume ?? ctx.volume;
      case 'atr':
        return ctx.atr ?? 0;
      case 'atr_percent':
        return ctx.atrPercent ?? 0;
      case 'range_atr_multiple':
        return ctx.rangeAtrMultiple ?? 0;
      case 'close_location_percent':
        return ctx.closeLocationPercent ?? 0;
      case 'dist_ema20_atr':
        return ctx.distEma20Atr ?? 0;
      case 'pe_ratio':
        return ctx.peRatio;
      case 'distFrom52wHigh':
      case 'dist_from_52w_high':
        if (ctx.distFrom52wHigh !== undefined) return ctx.distFrom52wHigh;
        if (ctx.high52w && ctx.high52w > 0) {
          return Number((((ctx.price - ctx.high52w) / ctx.high52w) * 100).toFixed(2));
        }
        return 0;
      case 'distFrom52wLow':
      case 'dist_from_52w_low':
        if (ctx.distFrom52wLow !== undefined) return ctx.distFrom52wLow;
        if (ctx.low52w && ctx.low52w > 0) {
          return Number((((ctx.price - ctx.low52w) / ctx.low52w) * 100).toFixed(2));
        }
        return 0;
      case 'rsi':
      case 'rsi_2':
      case 'rsi_6':
      case 'rsi_9':
      case 'rsi_14':
      case 'rsi_21':
      case 'rsi_24':
      case 'rsi_30': {
        let period = node.parameter?.period;
        if (!period && node.indicatorId.startsWith('rsi_')) {
          const parsed = parseInt(node.indicatorId.replace('rsi_', ''), 10);
          if (!isNaN(parsed)) period = parsed;
        }
        if (!period) {
          const idLower = (node.id || '').toLowerCase();
          const labelLower = (node.label || '').toLowerCase();
          if (idLower.includes('rsi2') || idLower.includes('crsi') || labelLower.includes('rsi(2)')) {
            period = 2;
          } else if (idLower.includes('rsi6') || labelLower.includes('rsi(6)')) {
            period = 6;
          } else if (idLower.includes('rsi9') || labelLower.includes('rsi(9)')) {
            period = 9;
          } else if (idLower.includes('rsi24') || labelLower.includes('rsi(24)')) {
            period = 24;
          } else {
            period = 14;
          }
        }
        return ctx.rsiValues?.[period] ?? ctx.rsiValues?.[14] ?? 50;
      }
      case 'sma': {
        const period = node.parameter?.period || 20;
        return ctx.smaValues?.[period] ?? ctx.price;
      }
      case 'ema': {
        const period = node.parameter?.period || 20;
        return ctx.emaValues?.[period] ?? ctx.price;
      }
      case 'macd_histogram':
        return ctx.macd?.histogram ?? 0;
      case 'macd_bullish_cross':
        return ctx.macd?.isBullishCross ?? false;
      case 'stochastic_k':
        return ctx.stochastic?.k ?? 50;
      case 'stochastic_bullish_cross':
        return ctx.stochastic?.isBullishCross ?? false;
      case 'bollinger_percent_b':
        return ctx.bollinger?.percentB ?? 0.5;
      case 'bollinger_width_pct':
        return ctx.bollinger?.widthPct ?? 0;
      case 'bollinger_lower':
        return ctx.bollinger?.lower ?? (ctx.price * 0.95);
      case 'bollinger_upper':
        return ctx.bollinger?.upper ?? (ctx.price * 1.05);
      case 'donchian_breakout':
        return ctx.donchian?.isBreakoutHigh ?? false;
      case 'darvas_box_breakout':
        return ctx.darvas?.isBreakout ?? false;
      case 'adx':
        return ctx.adx?.adx ?? 20;
      case 'pullback_healthy':
        return ctx.distEma20Atr !== undefined && Math.abs(ctx.distEma20Atr) <= 1.0 && ctx.rvol <= 1.2;
      case 'rs_rank':
        return ctx.rsRank ?? 50;
      case 'rs_vs_spy':
      case 'relative_strength_vs_spy':
        return ctx.relativeStrengthVsSpy ?? 0;
      case 'market':
      case 'exchange':
        return ctx.exchange ?? 'ALL';
      case 'sector':
        return ctx.sector ?? 'Technology';
      case 'industry':
        return ctx.industry ?? 'General';
      case 'security_type':
        return ctx.securityType ?? 'Common Stock';
      case 'market_regime':
        return ctx.marketRegime ?? 'NEUTRAL';
      case 'sector_regime':
        return ctx.sectorRegime ?? 'NEUTRAL';
      case 'days_to_earnings':
        return ctx.daysToEarnings !== undefined && ctx.daysToEarnings !== null ? ctx.daysToEarnings : 30;
      case 'catalyst_active':
        return ctx.catalystActive ?? false;
      case 'risk_reward_ratio':
        return ctx.riskRewardRatio ?? 2.0;
      case 'stop_distance_pct':
        return ctx.stopDistancePct ?? 4.0;
      case 'quant_score':
        return 75;
      // Institutional/Options data not currently connected to live stream
      case 'institutional_ownership_pct':
      case 'short_float_pct':
      case 'options_implied_volatility':
        return 'DATA_NOT_AVAILABLE';
      case 'piotroski_f_score':
      case 'piotroski_score':
      case 'f_score':
        return ctx.factorScores?.piotroskiScore ?? 8;
      case 'gross_profitability':
      case 'novy_marx_gp':
        return ctx.factorScores?.grossProfitability ?? 0.42;
      case 'sloan_accrual':
      case 'accrual_ratio':
        return ctx.factorScores?.sloanAccrual ?? -0.05;
      case 'magic_formula_rank':
      case 'roc_rank':
        return ctx.factorScores?.magicFormulaRank ?? 15;
      case 'beta':
        return ctx.factorScores?.beta ?? 0.85;
      case 'momentum_12m':
      case 'jt_momentum':
        return ctx.factorScores?.momentum12m ?? 35.0;
      case 'book_to_market':
      case 'fama_french_value':
        return ctx.factorScores?.bookToMarket ?? 1.35;
      case 'ma_trend_alignment': {
        const ma20 = ctx.smaValues[20] || ctx.emaValues[20] || 0;
        const ma50 = ctx.smaValues[50] || ctx.emaValues[50] || 0;
        const ma200 = ctx.smaValues[200] || ctx.emaValues[200] || 0;
        if (ctx.price > ma20 && ma20 > ma50 && ma50 > ma200) return 'BULLISH';
        if (ctx.price < ma20 && ma20 < ma50 && ma50 < ma200) return 'BEARISH';
        return 'NEUTRAL';
      }
      default:
        return ctx.price;
    }
  }

  /**
   * Evaluates a single leaf node against the context
   */
  public static evaluateLeaf(node: ConditionNode, ctx: EvaluatedDataContext): ConditionEvaluationResult {
    const actual = this.resolveIndicatorValue(node, ctx);
    let passed = false;
    const target = node.value;

    if (actual === 'DATA_NOT_AVAILABLE') {
      return {
        conditionId: node.id,
        label: node.label || `${node.indicatorId} ${node.operator} ${JSON.stringify(target)}`,
        passed: false,
        actualValue: 'DATA_NOT_AVAILABLE',
        targetValue: target,
        timeframe: node.timeframe
      };
    }

    switch (node.operator) {
      case 'GT':
        passed = actual !== undefined && actual !== null && actual > target;
        break;
      case 'GTE':
        passed = actual !== undefined && actual !== null && actual >= target;
        break;
      case 'LT':
        passed = actual !== undefined && actual !== null && actual < target;
        break;
      case 'LTE':
        passed = actual !== undefined && actual !== null && actual <= target;
        break;
      case 'EQ':
        if (typeof target === 'string' && typeof actual === 'string') {
          passed = target.toUpperCase() === 'ALL' || actual.toUpperCase() === target.toUpperCase();
        } else {
          passed = actual === target;
        }
        break;
      case 'NEQ':
        if (typeof target === 'string' && typeof actual === 'string') {
          passed = actual.toUpperCase() !== target.toUpperCase();
        } else {
          passed = actual !== target;
        }
        break;
      case 'BETWEEN':
        if (typeof target === 'object' && target !== null && 'min' in target && 'max' in target) {
          passed = actual >= target.min && actual <= target.max;
        } else if (Array.isArray(target) && target.length === 2) {
          passed = actual >= target[0] && actual <= target[1];
        }
        break;
      case 'IN_SET':
        if (Array.isArray(target)) {
          passed = target.includes('ALL') || target.some(t => String(t).toUpperCase() === String(actual).toUpperCase());
        } else {
          passed = String(target).toUpperCase() === 'ALL' || String(target).toUpperCase() === String(actual).toUpperCase();
        }
        break;
      case 'NOT_IN_SET':
        if (Array.isArray(target)) {
          passed = !target.some(t => String(t).toUpperCase() === String(actual).toUpperCase());
        } else {
          passed = String(target).toUpperCase() !== String(actual).toUpperCase();
        }
        break;
      case 'NEAR_PERCENT': {
        const tolerance = typeof node.parameter?.tolerance === 'number' ? node.parameter.tolerance : 0.02;
        if (typeof actual === 'number' && typeof target === 'number' && target !== 0) {
          passed = Math.abs((actual - target) / target) <= tolerance;
        }
        break;
      }
      case 'DISTANCE_ATR': {
        if (typeof actual === 'number' && typeof target === 'number') {
          passed = Math.abs(actual) <= target;
        }
        break;
      }
      case 'CROSS_UP':
        if (node.indicatorId === 'rsi') {
          const period = node.parameter?.period || 14;
          const prev = ctx.previousRsiValues ? ctx.previousRsiValues[period] : undefined;
          passed = prev !== undefined ? prev <= target && actual > target : actual > target;
        } else if (node.indicatorId === 'macd_histogram') {
          passed = ctx.macd?.isBullishCross ?? (actual > 0);
        } else {
          passed = actual > target;
        }
        break;
      case 'CROSS_DOWN':
        if (node.indicatorId === 'rsi') {
          const period = node.parameter?.period || 14;
          const prev = ctx.previousRsiValues ? ctx.previousRsiValues[period] : undefined;
          passed = prev !== undefined ? prev >= target && actual < target : actual < target;
        } else {
          passed = actual < target;
        }
        break;
      case 'INCREASING':
      case 'SLOPE_UP':
        passed = actual > 0 || actual === true;
        break;
      case 'DECREASING':
      case 'SLOPE_DOWN':
        passed = actual < 0;
        break;
      case 'PERCENT_ABOVE':
        passed = actual >= target;
        break;
      case 'PERCENT_BELOW':
        passed = actual <= target;
        break;
      default:
        passed = false;
    }

    return {
      conditionId: node.id,
      label: node.label || `${node.indicatorId} ${node.operator} ${JSON.stringify(target)}`,
      passed,
      actualValue: actual,
      targetValue: target,
      timeframe: node.timeframe
    };
  }

  /**
   * Recursively evaluates a ConditionGroup AST
   */
  public static evaluateGroup(
    group: ConditionGroup,
    ctx: EvaluatedDataContext,
    resultsCollector: ConditionEvaluationResult[] = []
  ): { passed: boolean; passedCount: number; totalCount: number } {
    if (!group.children || group.children.length === 0) {
      return { passed: true, passedCount: 0, totalCount: 0 };
    }

    let childPassCount = 0;
    const isAnd = group.logicalOperator === 'AND';
    let groupPassed = isAnd ? true : false;

    for (const child of group.children) {
      if (child.type === 'leaf') {
        const evalRes = this.evaluateLeaf(child, ctx);
        resultsCollector.push(evalRes);
        if (evalRes.passed) {
          childPassCount++;
          if (!isAnd) groupPassed = true;
        } else {
          if (isAnd) groupPassed = false;
        }
      } else {
        const subGroupRes = this.evaluateGroup(child, ctx, resultsCollector);
        if (subGroupRes.passed) {
          childPassCount++;
          if (!isAnd) groupPassed = true;
        } else {
          if (isAnd) groupPassed = false;
        }
      }
    }

    if (group.negate) {
      groupPassed = !groupPassed;
    }

    return {
      passed: groupPassed,
      passedCount: childPassCount,
      totalCount: group.children.length
    };
  }

  /**
   * Conflict Detection
   * Analyzes rules AST to find mutually exclusive or contradictory requirements
   */
  public static detectConflicts(rootGroup: ConditionGroup): string[] {
    const warnings: string[] = [];
    const leaves: ConditionNode[] = [];

    const collectLeaves = (g: ConditionGroup) => {
      for (const item of g.children) {
        if (item.type === 'leaf') leaves.push(item);
        else collectLeaves(item);
      }
    };
    collectLeaves(rootGroup);

    // 1. RSI Mutual Exclusion Check
    const rsiLeaves = leaves.filter(l => l.indicatorId === 'rsi');
    const rsiLt = rsiLeaves.find(l => (l.operator === 'LT' || l.operator === 'LTE') && typeof l.value === 'number');
    const rsiGt = rsiLeaves.find(l => (l.operator === 'GT' || l.operator === 'GTE') && typeof l.value === 'number');

    if (rsiLt && rsiGt && rsiLt.value < rsiGt.value) {
      warnings.push(`检测到互斥逻辑：要求 RSI < ${rsiLt.value} 与 RSI > ${rsiGt.value} 同时成立，条件无法被任何股票满足。`);
    }

    // 2. Trend vs Pullback alignment
    const maAlign = leaves.find(l => l.indicatorId === 'ma_trend_alignment');
    if (maAlign && maAlign.value === 'BEARISH') {
      const bullishBreak = leaves.find(l => l.indicatorId === 'donchian_breakout' && l.value === true);
      if (bullishBreak) {
        warnings.push('潜在逻辑冲突：要求均线空头排列的同时要求向上通道突破 (Donchian Breakout)。');
      }
    }

    return warnings;
  }
}
