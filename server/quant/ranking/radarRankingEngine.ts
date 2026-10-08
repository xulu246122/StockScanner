import { RankingWeights } from '../../types.ts';
import { EvaluatedDataContext } from '../conditions/conditionEngine.ts';

export interface ScoreBreakdown {
  trendScore: number;
  momentumScore: number;
  volumeScore: number;
  relativeStrengthScore: number;
  sectorScore: number;
  structureScore: number;
  volatilityScore: number;
}

export interface RadarScoringResult {
  radarScore: number;
  scoreBreakdown: ScoreBreakdown;
  rankingTier: 'ELITE' | 'STRONG' | 'ACCEPTABLE' | 'WEAK';
}

export class RadarRankingEngine {
  private static readonly DEFAULT_WEIGHTS: RankingWeights = {
    relativeStrength: 0.20,
    momentum: 0.20,
    volume: 0.15,
    trend: 0.15,
    sector: 0.15,
    market: 0.10,
    structure: 0.05
  };

  /**
   * Calculates multi-factor quantitative soft score (0 - 100) and breakdown
   */
  public static calculateScore(
    ctx: EvaluatedDataContext,
    customWeights?: RankingWeights
  ): RadarScoringResult {
    const weights: RankingWeights = { ...this.DEFAULT_WEIGHTS, ...(customWeights || {}) };

    // 1. Relative Strength Score (Alpha vs SPY Benchmark)
    let rsScore = 50;
    if (ctx.rsRank !== undefined) {
      rsScore = ctx.rsRank;
    } else if (ctx.relativeStrengthVsSpy !== undefined) {
      rsScore = Math.max(5, Math.min(99, Math.round(50 + ctx.relativeStrengthVsSpy * 2.5)));
    }

    // 2. Momentum Score (RSI Sweet Spot + MACD + ADX)
    let momentumScore = 50;
    const rsi14 = ctx.rsiValues?.[14] ?? 50;
    if (rsi14 >= 50 && rsi14 <= 68) {
      momentumScore = 85; // Bullish momentum sweet spot
    } else if (rsi14 > 68 && rsi14 <= 78) {
      momentumScore = 70; // Extended but still strong
    } else if (rsi14 < 30) {
      momentumScore = 80; // Oversold high-rebound potential
    } else if (rsi14 >= 30 && rsi14 < 45) {
      momentumScore = 55;
    } else {
      momentumScore = 40;
    }

    if (ctx.macd && ctx.macd.histogram > 0) momentumScore += 8;
    if (ctx.macd && ctx.macd.isBullishCross) momentumScore += 7;
    if (ctx.adx && ctx.adx.isTrending && ctx.adx.trendDirection === 'BULLISH') momentumScore += 5;
    momentumScore = Math.max(10, Math.min(99, momentumScore));

    // 3. Volume Score (RVOL + Average Dollar Volume)
    let rvolScore = 50;
    if (ctx.rvol >= 3.0) rvolScore = 98;
    else if (ctx.rvol >= 2.0) rvolScore = 88;
    else if (ctx.rvol >= 1.5) rvolScore = 78;
    else if (ctx.rvol >= 1.0) rvolScore = 60;
    else rvolScore = 40;

    let dollarVolScore = 50;
    const dVol = ctx.avgDollarVolume ?? (ctx.volume * ctx.price);
    if (dVol >= 100_000_000) dollarVolScore = 98;
    else if (dVol >= 50_000_000) dollarVolScore = 88;
    else if (dVol >= 25_000_000) dollarVolScore = 75;
    else if (dVol >= 10_000_000) dollarVolScore = 60;
    else if (dVol >= 5_000_000) dollarVolScore = 45;
    else dollarVolScore = 25;

    const volumeScore = Math.round(rvolScore * 0.6 + dollarVolScore * 0.4);

    // 4. Trend Score (EMA Alignment + MA Slopes)
    let trendScore = 50;
    const p = ctx.price;
    const ema20 = ctx.emaValues?.[20] || ctx.smaValues?.[20] || p;
    const ema50 = ctx.emaValues?.[50] || ctx.smaValues?.[50] || p;
    const ema200 = ctx.emaValues?.[200] || ctx.smaValues?.[200] || p;

    let bullPoints = 0;
    if (p >= ema20) bullPoints += 25;
    if (ema20 >= ema50) bullPoints += 25;
    if (ema50 >= ema200) bullPoints += 25;
    if (p >= ema200) bullPoints += 25;
    trendScore = bullPoints;

    // 5. Sector Score (Relative Performance in Industry Group)
    let sectorScore = 60;
    if (ctx.sectorRegime === 'BULLISH') sectorScore = 85;
    else if (ctx.sectorRegime === 'BEARISH') sectorScore = 35;

    // 6. Structure Score (52-Week High Proximity + Close Location)
    let structureScore = 50;
    const distHigh = ctx.distFrom52wHigh ?? 0;
    if (distHigh >= -5) structureScore = 95;
    else if (distHigh >= -10) structureScore = 85;
    else if (distHigh >= -20) structureScore = 70;
    else if (distHigh >= -35) structureScore = 50;
    else structureScore = 35;

    if (ctx.closeLocationPercent !== undefined && ctx.closeLocationPercent >= 70) {
      structureScore = Math.min(99, structureScore + 5);
    }

    // 7. Volatility Score (Ideal ATR% Range: 1.8% - 4.5%)
    let volatilityScore = 60;
    const atrPct = ctx.atrPercent ?? 2.5;
    if (atrPct >= 1.8 && atrPct <= 4.5) volatilityScore = 90;
    else if (atrPct > 4.5 && atrPct <= 6.5) volatilityScore = 70;
    else if (atrPct < 1.8) volatilityScore = 55;
    else volatilityScore = 40;

    // Weighted Soft Confluence Calculation
    const wRs = weights.relativeStrength ?? 0.20;
    const wMom = weights.momentum ?? 0.20;
    const wVol = weights.volume ?? 0.15;
    const wTrend = weights.trend ?? 0.15;
    const wSec = weights.sector ?? 0.15;
    const wStruct = weights.structure ?? 0.05;
    const wVolat = weights.volatility ?? 0.10;

    const totalWeight = wRs + wMom + wVol + wTrend + wSec + wStruct + wVolat;
    const rawScore = (
      rsScore * wRs +
      momentumScore * wMom +
      volumeScore * wVol +
      trendScore * wTrend +
      sectorScore * wSec +
      structureScore * wStruct +
      volatilityScore * wVolat
    ) / (totalWeight || 1);

    // Macro Regime Tail-Risk Adjustment
    let regimeAdjustment = 0;
    if (ctx.marketRegime === 'RISK_ON') regimeAdjustment = 3;
    else if (ctx.marketRegime === 'RISK_OFF') regimeAdjustment = -7;

    const finalRadarScore = Math.max(5, Math.min(99, Math.round(rawScore + regimeAdjustment)));

    let rankingTier: RadarScoringResult['rankingTier'] = 'ACCEPTABLE';
    if (finalRadarScore >= 85) rankingTier = 'ELITE';
    else if (finalRadarScore >= 72) rankingTier = 'STRONG';
    else if (finalRadarScore >= 55) rankingTier = 'ACCEPTABLE';
    else rankingTier = 'WEAK';

    return {
      radarScore: finalRadarScore,
      scoreBreakdown: {
        trendScore,
        momentumScore,
        volumeScore,
        relativeStrengthScore: rsScore,
        sectorScore,
        structureScore,
        volatilityScore
      },
      rankingTier
    };
  }
}
