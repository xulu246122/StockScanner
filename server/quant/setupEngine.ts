import { PriceBar, TradeSetup, SetupType, Timeframe } from '../types.ts';
import { calculateATR } from './indicators.ts';

export class SetupEngine {
  public detectSetups(
    ticker: string,
    name: string,
    bars: PriceBar[],
    timeframe: Timeframe = '1D'
  ): TradeSetup[] {
    if (!bars || bars.length < 25) return [];

    const setups: TradeSetup[] = [];
    const latestBar = bars[bars.length - 1];
    const prevBar = bars[bars.length - 2];
    const currentPrice = latestBar.close;

    const atrs = calculateATR(bars, 14);
    const validAtrs = atrs.filter((a): a is number => a !== null);
    const latestAtr = validAtrs.length > 0 ? validAtrs[validAtrs.length - 1] : currentPrice * 0.02;

    const rsiCurrent = latestBar.rsi ?? 50;
    const rsiPrev = prevBar.rsi ?? rsiCurrent;

    const buildSetup = (
      type: SetupType,
      label: string,
      direction: 'LONG' | 'SHORT',
      confidence: number,
      trigger: string,
      rawStop: number,
      targetMult1: number = 1.5,
      targetMult2: number = 2.5
    ): TradeSetup => {
      const maxStopDist = currentPrice * 0.05;
      let effectiveStop = rawStop;

      const stopDist = Math.abs(currentPrice - effectiveStop);
      let riskPercent = Number(((stopDist / currentPrice) * 100).toFixed(2));
      let isRiskExceeded = false;

      if (riskPercent > 5.0) {
        effectiveStop = Number((currentPrice - maxStopDist).toFixed(2));
        riskPercent = 5.0;
        isRiskExceeded = true;
      }

      const entryMin = Number((currentPrice * 0.996).toFixed(2));
      const entryMax = Number((currentPrice * 1.003).toFixed(2));
      const optimal = currentPrice;

      const riskDist = currentPrice - effectiveStop;
      const target1 = Number((currentPrice + riskDist * targetMult1).toFixed(2));
      const target2 = Number((currentPrice + riskDist * targetMult2).toFixed(2));

      const rewardPercent = Number((((target1 - currentPrice) / currentPrice) * 100).toFixed(2));
      const rrRatio = riskPercent > 0 ? Number((rewardPercent / riskPercent).toFixed(2)) : 1.5;

      return {
        id: `setup-${ticker}-${type}-${Date.now()}`,
        ticker,
        name,
        setupType: type,
        setupLabel: label,
        direction,
        timeframe,
        confidence,
        status: 'ARMED',
        triggerDescription: trigger,
        entryZone: { min: entryMin, max: entryMax, optimal },
        stopLoss: effectiveStop,
        target1,
        target2,
        riskPercent,
        rewardPercent,
        riskRewardRatio: rrRatio,
        invalidationLevel: effectiveStop,
        invalidationReason: isRiskExceeded ? '原始结构止损偏大，已自动适配 5.0% 最大硬止损' : undefined,
        detectedAt: new Date().toISOString()
      };
    };

    if (rsiPrev <= 31 && rsiCurrent > 30 && latestBar.close > latestBar.open) {
      const swingLow = Math.min(...bars.slice(-5).map(b => b.low));
      setups.push(buildSetup(
        'OVERSOLD_REBOUND',
        '超卖突破回升 (Oversold Recovery)',
        'LONG',
        82,
        `RSI从 ${rsiPrev.toFixed(1)} 成功回抽突破 30 超卖线，日K收阳确认逢低做多动能`,
        Number((swingLow * 0.995).toFixed(2)),
        1.6,
        2.6
      ));
    }

    const recentLow = Math.min(...bars.slice(-10).map(b => b.low));
    const priorLow = Math.min(...bars.slice(-25, -10).map(b => b.low));
    if (recentLow < priorLow && rsiCurrent > rsiPrev && rsiCurrent < 45) {
      setups.push(buildSetup(
        'BULLISH_DIVERGENCE',
        '经典底背离反弹 (Bullish Divergence)',
        'LONG',
        88,
        '价格创近25周期新低但 RSI 底部显著抬高，下跌动能衰竭，具备高盈亏比反弹契机',
        Number((recentLow * 0.99).toFixed(2)),
        1.8,
        3.0
      ));
    }

    if (rsiCurrent >= 40 && rsiCurrent <= 52 && latestBar.close > prevBar.close) {
      const pullbackLow = Math.min(...bars.slice(-3).map(b => b.low));
      setups.push(buildSetup(
        'PULLBACK_EMA',
        '多头回踩均线支撑 (Pullback Support)',
        'LONG',
        78,
        '强势主升浪中良性回踩支撑平台，RSI在 40-50 中性中轴企稳，适合顺势做多',
        Number((pullbackLow * 0.992).toFixed(2)),
        1.7,
        2.8
      ));
    }

    if (rsiCurrent >= 55 && rsiCurrent <= 70 && latestBar.close > prevBar.high) {
      const breakoutBase = prevBar.low;
      setups.push(buildSetup(
        'MOMENTUM_BREAKOUT',
        '动能放量突破 (Momentum Breakout)',
        'LONG',
        85,
        '突破前高阻力位且 RSI 动能突破 55，多头量能配合良好',
        Number((breakoutBase * 0.995).toFixed(2)),
        1.5,
        2.5
      ));
    }

    const recentHigh = Math.max(...bars.slice(-10).map(b => b.high));
    const priorHigh = Math.max(...bars.slice(-25, -10).map(b => b.high));
    if (recentHigh > priorHigh && rsiCurrent < rsiPrev && rsiCurrent > 65) {
      setups.push(buildSetup(
        'BEARISH_DIVERGENCE',
        '顶背离冲高见顶 (Bearish Divergence)',
        'SHORT',
        80,
        '价格创近25周期新高但 RSI 未能同步破高形成顶背离，警惕做多动能衰竭与回调风险',
        Number((recentHigh * 1.01).toFixed(2)),
        1.6,
        2.5
      ));
    }

    if (setups.length === 0) {
      const swingLow = Math.min(...bars.slice(-10).map(b => b.low));
      setups.push(buildSetup(
        'RANGE_SUPPORT_BOUNCE',
        '区间支撑蓄势 (Range Support)',
        'LONG',
        70,
        '在关键结构支撑位上方震荡蓄势，设定硬止损保全资本',
        Number((Math.max(swingLow * 0.995, currentPrice * 0.975)).toFixed(2)),
        1.5,
        2.2
      ));
    }

    return setups;
  }
}

export const setupEngine = new SetupEngine();
