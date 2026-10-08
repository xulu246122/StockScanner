import { SignalState, RadarWhyMatched } from '../../types.ts';
import { EvaluatedDataContext } from '../conditions/conditionEngine.ts';

export interface ArbitratorResult {
  signalState: SignalState;
  noTrade: boolean;
  noTradeReasons: string[];
  whyMatched: RadarWhyMatched;
  suggestedEntry: number;
  suggestedStop: number;
  suggestedTarget: number;
  riskRewardRatio: number;
  stopDistancePct: number;
}

export class NoTradeArbitrator {
  /**
   * Evaluates institutional risk traps, stop-loss hard bounds, and generates Why Matched commentary
   */
  public static evaluate(
    ctx: EvaluatedDataContext,
    allHardConditionsPassed: boolean,
    confluenceScore: number,
    radarScore: number
  ): ArbitratorResult {
    const noTradeReasons: string[] = [];
    const strengths: string[] = [];
    const cautions: string[] = [];

    const price = ctx.price;
    const atr = ctx.atr || (price * 0.02);

    // ==========================================
    // 1. HARD RISK LIMIT: 5.0% STOP LOSS CAP
    // ==========================================
    const maxAllowedStopDistance = price * 0.05; // 5% maximum stop loss
    let calculatedStopDist = Math.min(1.5 * atr, maxAllowedStopDistance);
    let stopLossPrice = Number((price - calculatedStopDist).toFixed(2));
    let stopDistancePct = Number((((price - stopLossPrice) / price) * 100).toFixed(2));

    if (stopDistancePct >= 5.0) {
      stopLossPrice = Number((price * 0.95).toFixed(2));
      stopDistancePct = 5.0;
      cautions.push('结构止损距离触及 5.0% 硬性风控上限，已被强制截断保护本金。');
    }

    // 2R minimum target
    const targetDistance = (price - stopLossPrice) * 2.0;
    const targetPrice = Number((price + targetDistance).toFixed(2));
    const riskRewardRatio = stopDistancePct > 0 ? Number((targetDistance / (price - stopLossPrice)).toFixed(2)) : 2.0;

    // ==========================================
    // 2. BINARY EARNINGS BLACKOUT RISK CHECK
    // ==========================================
    if (ctx.daysToEarnings !== null && ctx.daysToEarnings !== undefined && ctx.daysToEarnings <= 1) {
      noTradeReasons.push(`财报黑天鹅风险：距官方财报公布仅剩 ${ctx.daysToEarnings} 个交易日，二元跳空风险极高，禁止追多。`);
    } else if (ctx.daysToEarnings !== null && ctx.daysToEarnings !== undefined && ctx.daysToEarnings <= 5) {
      cautions.push(`距官方财报仅剩 ${ctx.daysToEarnings} 个交易日，请注意持仓周期控制。`);
    }

    // ==========================================
    // 3. ILLIQUIDITY & SPREAD TRAP CHECK
    // ==========================================
    const dollarVolume = ctx.avgDollarVolume ?? (ctx.volume * price);
    if (dollarVolume < 5_000_000) {
      noTradeReasons.push(`流动性陷阱：日均成交额不足 $5M ($${(dollarVolume / 1_000_000).toFixed(1)}M)，存在严重滑点与抢跑风险。`);
    }
    if (price < 3.0) {
      noTradeReasons.push('低价股流动性陷阱：股价低于 $3.00，属于仙股投机标的，机构风控系统禁止开仓。');
    }

    // ==========================================
    // 4. MACRO REGIME CONFLICT CHECK
    // ==========================================
    if (ctx.marketRegime === 'RISK_OFF') {
      if (ctx.changePercent > 3.0 && (ctx.rsiValues?.[14] ?? 50) > 70) {
        cautions.push('大盘宏观处于避险防守周期 (Risk-Off)，高位追涨面临系统性回撤风险。');
      }
    }

    const noTrade = noTradeReasons.length > 0;

    // ==========================================
    // 5. SIGNAL STATE DERIVATION (INSTITUTIONAL TACTICAL HIERARCHY)
    // ==========================================
    // Real tactical triggers
    const rsi14 = ctx.rsiValues?.[14] ?? 50;
    const isOversoldTrigger = rsi14 <= 30;
    const isBreakoutTrigger = Boolean(
      ctx.donchian?.isBreakoutHigh ||
      ctx.darvas?.isBreakout ||
      ((ctx.distFrom52wHigh !== undefined && ctx.distFrom52wHigh >= -3.0) && (ctx.rvol ?? 1) >= 1.3)
    );
    const isPullbackTrigger = Boolean(
      ctx.distEma20Atr !== undefined &&
      Math.abs(ctx.distEma20Atr) <= 0.8 &&
      (ctx.rvol ?? 1) <= 1.2
    );
    const isVolumeSurgeTrigger = Boolean((ctx.rvol ?? 1) >= 1.8 && (ctx.changePercent ?? 0) > 1.0);
    const isIndicatorCrossTrigger = Boolean(ctx.macd?.isBullishCross || ctx.stochastic?.isBullishCross);

    const hasTacticalTrigger = isOversoldTrigger || isBreakoutTrigger || isPullbackTrigger || isVolumeSurgeTrigger || isIndicatorCrossTrigger;

    let signalState: SignalState = 'WATCHING';
    if (noTrade) {
      signalState = 'NO_TRADE';
    } else if (allHardConditionsPassed && hasTacticalTrigger) {
      signalState = 'TRIGGERED';
    } else if (allHardConditionsPassed && (confluenceScore >= 75 || (ctx.distFrom52wHigh !== undefined && ctx.distFrom52wHigh >= -5.0))) {
      signalState = 'NEAR_TRIGGER';
    } else if (allHardConditionsPassed && confluenceScore >= 50) {
      signalState = 'SETUP';
    } else {
      signalState = 'WATCHING';
    }

    // ==========================================
    // 6. WHY MATCHED EXPLANATION GENERATION
    // ==========================================
    // Identify primary driver
    let primaryDriver: RadarWhyMatched['primaryDriver'] = 'MOMENTUM';
    if (ctx.donchian?.isBreakoutHigh || ctx.darvas?.isBreakout || (ctx.distFrom52wHigh !== undefined && ctx.distFrom52wHigh >= -2.0)) {
      primaryDriver = 'BREAKOUT';
    } else if ((ctx.rsiValues?.[14] ?? 50) <= 35 || (ctx.rsiValues?.[6] ?? 50) <= 25) {
      primaryDriver = 'OVERSOLD';
    } else if (ctx.distEma20Atr !== undefined && Math.abs(ctx.distEma20Atr) <= 1.0) {
      primaryDriver = 'PULLBACK';
    } else if (ctx.daysToEarnings !== null && ctx.daysToEarnings !== undefined && ctx.daysToEarnings >= 3 && ctx.daysToEarnings <= 14) {
      primaryDriver = 'EARNINGS';
    } else if ((ctx.peRatio || 0) < 18) {
      primaryDriver = 'VALUE';
    } else {
      primaryDriver = 'MOMENTUM';
    }

    // Identify strengths
    if (ctx.rvol >= 2.0) {
      strengths.push(`异动爆发：RVOL ${ctx.rvol.toFixed(1)}x 伴随主力机构资金进场`);
    } else if (ctx.rvol >= 1.2) {
      strengths.push(`量能充裕：RVOL ${ctx.rvol.toFixed(1)}x 维持良性换手`);
    }

    if (dollarVolume >= 50_000_000) {
      strengths.push(`高流动性：日均成交额 $${(dollarVolume / 1_000_000).toFixed(0)}M，极低交易滑点`);
    }

    if (ctx.rsRank !== undefined && ctx.rsRank >= 75) {
      strengths.push(`跑赢基准：Alpha 领头羊 (RS Rank ${ctx.rsRank}/99)`);
    } else if (ctx.relativeStrengthVsSpy !== undefined && ctx.relativeStrengthVsSpy > 2.0) {
      strengths.push(`相对强弱：相对标普 SPY 产生 +${ctx.relativeStrengthVsSpy.toFixed(1)}% 超额收益`);
    }

    if (ctx.distFrom52wHigh !== undefined && ctx.distFrom52wHigh >= -5.0) {
      strengths.push(`强势结构：距52周历史新高仅 ${Math.abs(ctx.distFrom52wHigh).toFixed(1)}%`);
    }

    if (ctx.atrPercent !== undefined && ctx.atrPercent >= 2.0 && ctx.atrPercent <= 4.5) {
      strengths.push(`理想波幅：日内 ATR% ${ctx.atrPercent.toFixed(1)}% 适合短波段盈亏比`);
    }

    // Generate concise summary
    let summary = '';
    if (primaryDriver === 'BREAKOUT') {
      summary = `平台向上突破启动，量比 RVOL ${ctx.rvol.toFixed(1)}x，相对强弱 RS Rank ${ctx.rsRank ?? 70}，均线呈多头排列。`;
    } else if (primaryDriver === 'OVERSOLD') {
      summary = `极度超卖右侧企稳，RSI(14)=${ctx.rsiValues?.[14] ?? 30}，量能沉淀等待情绪反转修复。`;
    } else if (primaryDriver === 'PULLBACK') {
      summary = `上升中继健康回踩 EMA20 支撑位，无大幅抛压，回踩低吸盈亏比良好。`;
    } else {
      summary = `多因子量化综合评分 ${radarScore}/100，相对强弱 RS Rank ${ctx.rsRank ?? 70}，短线风控目标盈亏比 1:${riskRewardRatio}。`;
    }

    const whyMatched: RadarWhyMatched = {
      summary,
      strengths: strengths.length > 0 ? strengths : ['综合技术形态健康，符合短线动能策略标准'],
      cautions: cautions.length > 0 ? cautions : ['常规操作需严格执行止损纪律'],
      primaryDriver,
      riskRewardRatio,
      suggestedEntry: price,
      suggestedStop: stopLossPrice,
      suggestedTarget: targetPrice,
      matchedCriteria: strengths.length > 0 ? strengths : ['动量与量能指标符合筛选条件'],
      warnings: cautions.length > 0 ? cautions : [],
      riskLevel: stopDistancePct > 4.0 ? 'HIGH' : stopDistancePct > 2.5 ? 'MEDIUM' : 'LOW',
      actionAdvice: noTrade ? '禁止开仓 (风控阻断)' : signalState === 'TRIGGERED' ? '建议进场 (标准买点)' : '耐心观察 (形态构筑)',
      noTradeReasons: noTrade ? noTradeReasons : undefined
    };

    return {
      signalState,
      noTrade,
      noTradeReasons,
      whyMatched,
      suggestedEntry: price,
      suggestedStop: stopLossPrice,
      suggestedTarget: targetPrice,
      riskRewardRatio,
      stopDistancePct
    };
  }
}
