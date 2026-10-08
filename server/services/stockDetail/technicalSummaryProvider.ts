import { PriceBar, Timeframe, TechnicalSummaryData, TechnicalRating, IndicatorSummaryItem, PivotLevels } from '../../types.ts';
import {
  calculateSMA,
  calculateEMA,
  calculateMACD,
  calculateStochastic,
  calculateADX,
  calculateBollingerBands,
  calculateATR,
  calculateHMA,
  calculateVWMA,
  calculateIchimokuBaseLine,
  calculateAwesomeOscillator,
  calculateElderRay,
  calculateStochRSI,
  calculateUltimateOscillator
} from '../../quant/indicators/calculations.ts';
import { computeLatestRSI } from '../rsiEngine.ts';
import { analyzeTrendAndDivergence } from '../../../src/utils/trendAndDivergence.ts';

export const MINIMUM_TECHNICAL_HISTORY_BARS = 250;

export class TechnicalSummaryProvider {
  /**
   * Generates a comprehensive Quant Technical Rating from 26 standard technical indicators
   * (15 Moving Averages + 11 Oscillators) from genuine OHLCV price bars.
   */
  public static calculateTechnicalSummary(
    bars: PriceBar[],
    currentPrice: number,
    timeframe: Timeframe = '1D'
  ): TechnicalSummaryData {
    if (!bars || bars.length < MINIMUM_TECHNICAL_HISTORY_BARS) {
      throw new RangeError(`Technicals require at least ${MINIMUM_TECHNICAL_HISTORY_BARS} bars; received ${bars?.length ?? 0}`);
    }

    const closes = bars.map(b => b.close);
    const highs = bars.map(b => b.high);
    const lows = bars.map(b => b.low);
    const lastBar = bars[bars.length - 1];
    const provenance = lastBar.provenance;
    const dataAsOf = provenance?.dataAsOf ?? (Number.isFinite(lastBar.timestamp) ? new Date(lastBar.timestamp).toISOString() : null);

    // =========================================================================
    // 1. Moving Averages Calculation (15 Standard Moving Averages)
    // =========================================================================
    const maPeriods = [10, 20, 30, 50, 100, 200];
    const maItems: IndicatorSummaryItem[] = [];

    // 1.1-1.6 EMA Calculations (6 items)
    maPeriods.forEach(p => {
      const series = calculateEMA(closes, p);
      const val = series[series.length - 1];
      if (val === null || val === undefined) {
        throw new RangeError(`EMA(${p}) requires at least ${p} bars`);
      }
      const action: 'BUY' | 'SELL' | 'NEUTRAL' = currentPrice > val ? 'BUY' : currentPrice < val ? 'SELL' : 'NEUTRAL';
      maItems.push({
        id: `ema_${p}`,
        name: `EMA (${p})`,
        value: val,
        formattedValue: `$${val.toFixed(2)}`,
        action,
        actionLabelZh: action === 'BUY' ? '买入' : action === 'SELL' ? '卖出' : '中性',
        description: currentPrice > val ? `现价高于 ${p} 周期指数均线` : `现价低于 ${p} 周期指数均线`
      });
    });

    // 1.7-1.12 SMA Calculations (6 items)
    maPeriods.forEach(p => {
      const series = calculateSMA(closes, p);
      const val = series[series.length - 1];
      if (val === null || val === undefined) {
        throw new RangeError(`SMA(${p}) requires at least ${p} bars`);
      }
      const action: 'BUY' | 'SELL' | 'NEUTRAL' = currentPrice > val ? 'BUY' : currentPrice < val ? 'SELL' : 'NEUTRAL';
      maItems.push({
        id: `sma_${p}`,
        name: `SMA (${p})`,
        value: val,
        formattedValue: `$${val.toFixed(2)}`,
        action,
        actionLabelZh: action === 'BUY' ? '买入' : action === 'SELL' ? '卖出' : '中性',
        description: currentPrice > val ? `现价高于 ${p} 周期简单均线` : `现价低于 ${p} 周期简单均线`
      });
    });

    // 1.13 Hull Moving Average HMA(9)
    const hmaSeries = calculateHMA(closes, 9);
    const lastHma = hmaSeries[hmaSeries.length - 1] ?? currentPrice;
    const hmaAction: 'BUY' | 'SELL' | 'NEUTRAL' = currentPrice > lastHma ? 'BUY' : currentPrice < lastHma ? 'SELL' : 'NEUTRAL';
    maItems.push({
      id: 'hma_9',
      name: 'Hull MA 赫尔均线 (9)',
      value: lastHma,
      formattedValue: `$${lastHma.toFixed(2)}`,
      action: hmaAction,
      actionLabelZh: hmaAction === 'BUY' ? '买入' : hmaAction === 'SELL' ? '卖出' : '中性',
      description: currentPrice > lastHma ? '现价高于赫尔加权均线' : '现价低于赫尔加权均线'
    });

    // 1.14 Volume-Weighted Moving Average VWMA(20)
    const vwmaSeries = calculateVWMA(bars, 20);
    const lastVwma = vwmaSeries[vwmaSeries.length - 1] ?? currentPrice;
    const vwmaAction: 'BUY' | 'SELL' | 'NEUTRAL' = currentPrice > lastVwma ? 'BUY' : currentPrice < lastVwma ? 'SELL' : 'NEUTRAL';
    maItems.push({
      id: 'vwma_20',
      name: 'VWMA 量加权均线 (20)',
      value: lastVwma,
      formattedValue: `$${lastVwma.toFixed(2)}`,
      action: vwmaAction,
      actionLabelZh: vwmaAction === 'BUY' ? '买入' : vwmaAction === 'SELL' ? '卖出' : '中性',
      description: currentPrice > lastVwma ? '成交量加权重心位于现价下方' : '成交量加权重心位于现价上方'
    });

    // 1.15 Ichimoku Base Line (Kijun-sen 26)
    const ichiSeries = calculateIchimokuBaseLine(bars, 26);
    const lastIchi = ichiSeries[ichiSeries.length - 1] ?? currentPrice;
    const ichiAction: 'BUY' | 'SELL' | 'NEUTRAL' = currentPrice > lastIchi ? 'BUY' : currentPrice < lastIchi ? 'SELL' : 'NEUTRAL';
    maItems.push({
      id: 'ichimoku_base_26',
      name: '一目均衡基准线 (26)',
      value: lastIchi,
      formattedValue: `$${lastIchi.toFixed(2)}`,
      action: ichiAction,
      actionLabelZh: ichiAction === 'BUY' ? '买入' : ichiAction === 'SELL' ? '卖出' : '中性',
      description: currentPrice > lastIchi ? '运行于一目均衡基准线上方' : '跌破一目均衡基准线'
    });

    const maBuy = maItems.filter(i => i.action === 'BUY').length;
    const maSell = maItems.filter(i => i.action === 'SELL').length;
    const maNeutral = maItems.filter(i => i.action === 'NEUTRAL').length;

    let maRating: TechnicalRating = 'NEUTRAL';
    let maRatingLabel = '本地中性';
    if (maBuy >= 11) { maRating = 'STRONG_BUY'; maRatingLabel = '本地强力买入'; }
    else if (maBuy >= 8) { maRating = 'BUY'; maRatingLabel = '本地买入'; }
    else if (maSell >= 11) { maRating = 'STRONG_SELL'; maRatingLabel = '本地强力卖出'; }
    else if (maSell >= 8) { maRating = 'SELL'; maRatingLabel = '本地卖出'; }

    // =========================================================================
    // 2. Oscillators Calculation (11 Standard Oscillators)
    // =========================================================================
    const oscItems: IndicatorSummaryItem[] = [];

    // 2.1 RSI(14)
    const rsi14 = computeLatestRSI(closes, 14).value;
    const rsiAction: 'BUY' | 'SELL' | 'NEUTRAL' = rsi14 < 30 ? 'BUY' : rsi14 > 70 ? 'SELL' : 'NEUTRAL';
    oscItems.push({
      id: 'rsi_14',
      name: 'RSI 相对强弱 (14)',
      value: rsi14,
      formattedValue: rsi14.toFixed(1),
      action: rsiAction,
      actionLabelZh: rsiAction === 'BUY' ? '买入' : rsiAction === 'SELL' ? '卖出' : '中性',
      description: rsi14 < 30 ? '触及超卖反弹区间' : rsi14 > 70 ? '触及超买风险区域' : '中性动量波动'
    });

    // 2.2 Stochastic (14, 3, 3)
    const stoch = calculateStochastic(bars, 14, 3, 3);
    const stochAction: 'BUY' | 'SELL' | 'NEUTRAL' = stoch.isOversold && stoch.isBullishCross
      ? 'BUY'
      : stoch.isOverbought && stoch.isBearishCross
        ? 'SELL'
        : 'NEUTRAL';
    oscItems.push({
      id: 'stoch_14_3',
      name: 'Stochastic (14, 3, 3)',
      value: stoch.k,
      formattedValue: `${stoch.k.toFixed(1)} / ${stoch.d.toFixed(1)}`,
      action: stochAction,
      actionLabelZh: stochAction === 'BUY' ? '买入' : stochAction === 'SELL' ? '卖出' : '中性',
      description: stoch.isBullishCross ? '随机指标低位金叉' : stoch.isBearishCross ? '随机指标高位死叉' : stoch.isOverbought ? '高位超买钝化' : '震荡中继'
    });

    // 2.3 CCI (20) - Commodity Channel Index
    const cci = this.calculateCCI(bars, 20);
    const cciAction: 'BUY' | 'SELL' | 'NEUTRAL' = cci < -100 ? 'BUY' : cci > 100 ? 'SELL' : 'NEUTRAL';
    oscItems.push({
      id: 'cci_20',
      name: 'CCI 顺势指标 (20)',
      value: cci,
      formattedValue: cci.toFixed(1),
      action: cciAction,
      actionLabelZh: cciAction === 'BUY' ? '买入' : cciAction === 'SELL' ? '卖出' : '中性',
      description: cci < -100 ? '进入极端超跌区域' : cci > 100 ? '进入极端超买区域' : '常态常轨波动'
    });

    // 2.4 ADX (14)
    const adx = calculateADX(bars, 14);
    const adxAction: 'BUY' | 'SELL' | 'NEUTRAL' = adx.isTrending && adx.trendDirection === 'BULLISH' ? 'BUY' : adx.isTrending && adx.trendDirection === 'BEARISH' ? 'SELL' : 'NEUTRAL';
    oscItems.push({
      id: 'adx_14',
      name: 'ADX 趋势强度 (14)',
      value: adx.adx,
      formattedValue: `${adx.adx.toFixed(1)} (+DI:${adx.plusDI.toFixed(0)}, -DI:${adx.minusDI.toFixed(0)})`,
      action: adxAction,
      actionLabelZh: adxAction === 'BUY' ? '买入' : adxAction === 'SELL' ? '卖出' : '中性',
      description: adx.isTrending ? `强劲${adx.trendDirection === 'BULLISH' ? '多头' : '空头'}单边趋势` : '无显著趋势 (震荡箱体)'
    });

    // 2.5 Awesome Oscillator (AO)
    const ao = calculateAwesomeOscillator(bars);
    const aoAction: 'BUY' | 'SELL' | 'NEUTRAL' = ao.isBullish ? 'BUY' : ao.latest < 0 && ao.latest < ao.prev ? 'SELL' : 'NEUTRAL';
    oscItems.push({
      id: 'awesome_oscillator',
      name: 'Awesome Oscillator (AO)',
      value: ao.latest,
      formattedValue: `${ao.latest >= 0 ? '+' : ''}${ao.latest.toFixed(2)}`,
      action: aoAction,
      actionLabelZh: aoAction === 'BUY' ? '买入' : aoAction === 'SELL' ? '卖出' : '中性',
      description: ao.isBullish ? '中位价动能红绿柱发散多头' : '中位价动能空头占优'
    });

    // 2.6 Momentum (10)
    const momPeriod = 10;
    const momValue = closes.length > momPeriod ? closes[closes.length - 1] - closes[closes.length - 1 - momPeriod] : 0;
    const momPct = closes.length > momPeriod && closes[closes.length - 1 - momPeriod] > 0
      ? ((momValue / closes[closes.length - 1 - momPeriod]) * 100)
      : 0;
    const momAction: 'BUY' | 'SELL' | 'NEUTRAL' = momValue > 0.05 ? 'BUY' : momValue < -0.05 ? 'SELL' : 'NEUTRAL';
    oscItems.push({
      id: 'momentum_10',
      name: 'Momentum 动量 (10)',
      value: Number(momValue.toFixed(2)),
      formattedValue: `${momValue >= 0 ? '+' : ''}${momValue.toFixed(2)} (${momPct >= 0 ? '+' : ''}${momPct.toFixed(1)}%)`,
      action: momAction,
      actionLabelZh: momAction === 'BUY' ? '买入' : momAction === 'SELL' ? '卖出' : '中性',
      description: momValue > 0 ? '短期价格动量正向加速' : momValue < 0 ? '短期价格动量向下失速' : '动能走平'
    });

    // 2.7 MACD Level (12, 26, 9)
    const macd = calculateMACD(closes, 12, 26, 9);
    const macdAction: 'BUY' | 'SELL' | 'NEUTRAL' = macd.latest.isBullishCross || macd.latest.histogram > 0 ? 'BUY' : macd.latest.isBearishCross || macd.latest.histogram < 0 ? 'SELL' : 'NEUTRAL';
    oscItems.push({
      id: 'macd_12_26',
      name: 'MACD Level (12, 26)',
      value: macd.latest.macd,
      formattedValue: `${macd.latest.macd.toFixed(2)} (柱: ${macd.latest.histogram.toFixed(2)})`,
      action: macdAction,
      actionLabelZh: macdAction === 'BUY' ? '买入' : macdAction === 'SELL' ? '卖出' : '中性',
      description: macd.latest.isBullishCross ? 'MACD 金叉上穿' : macd.latest.histogram > 0 ? '多头红柱动能发散' : '空头绿柱施压'
    });

    // 2.8 Stochastic RSI (14, 14, 3, 3)
    const rsiSeries: number[] = [];
    for (let i = 14; i <= closes.length; i++) {
      rsiSeries.push(computeLatestRSI(closes.slice(0, i), 14).value);
    }
    const stochRsi = calculateStochRSI(rsiSeries, 14, 3);
    oscItems.push({
      id: 'stoch_rsi_14',
      name: 'Stochastic RSI (14, 14, 3, 3)',
      value: stochRsi.k,
      formattedValue: `${stochRsi.k.toFixed(1)} / ${stochRsi.d.toFixed(1)}`,
      action: stochRsi.action,
      actionLabelZh: stochRsi.action === 'BUY' ? '买入' : stochRsi.action === 'SELL' ? '卖出' : '中性',
      description: stochRsi.action === 'BUY' ? '超卖区间低位金叉上行' : stochRsi.action === 'SELL' ? '超买区间高位承压' : '常态震荡'
    });

    // 2.9 Williams %R (14)
    const willR = this.calculateWilliamsR(bars, 14);
    const willAction: 'BUY' | 'SELL' | 'NEUTRAL' = willR < -80 ? 'BUY' : willR > -20 ? 'SELL' : 'NEUTRAL';
    oscItems.push({
      id: 'williams_r_14',
      name: 'Williams %R (14)',
      value: willR,
      formattedValue: willR.toFixed(1),
      action: willAction,
      actionLabelZh: willAction === 'BUY' ? '买入' : willAction === 'SELL' ? '卖出' : '中性',
      description: willR < -80 ? '威廉超卖区' : willR > -20 ? '威廉超买区' : '中性区间'
    });

    // 2.10 Bull / Bear Power (Elder Ray 13)
    const elder = calculateElderRay(bars, 13);
    oscItems.push({
      id: 'bull_bear_power_13',
      name: 'Bull/Bear Power 牛熊力量 (13)',
      value: elder.combinedPower,
      formattedValue: `${elder.combinedPower > 0 ? '+' : ''}${elder.combinedPower.toFixed(2)} (多:${elder.bullPower.toFixed(2)} / 空:${elder.bearPower.toFixed(2)})`,
      action: elder.action,
      actionLabelZh: elder.action === 'BUY' ? '买入' : elder.action === 'SELL' ? '卖出' : '中性',
      description: elder.action === 'BUY' ? '多头推升力度强劲' : elder.action === 'SELL' ? '空头下砸力量占优' : '多空力量均衡'
    });

    // 2.11 Ultimate Oscillator (7, 14, 28)
    const uo = calculateUltimateOscillator(bars, 7, 14, 28);
    const uoAction: 'BUY' | 'SELL' | 'NEUTRAL' = uo > 70 ? 'SELL' : uo < 30 ? 'BUY' : 'NEUTRAL';
    oscItems.push({
      id: 'ultimate_oscillator',
      name: 'Ultimate Oscillator 终极震荡 (7, 14, 28)',
      value: uo,
      formattedValue: uo.toFixed(1),
      action: uoAction,
      actionLabelZh: uoAction === 'BUY' ? '买入' : uoAction === 'SELL' ? '卖出' : '中性',
      description: uo > 70 ? '超买警惕顶背离' : uo < 30 ? '超跌酝酿底反弹' : '多周期加权均衡'
    });

    const oscBuy = oscItems.filter(i => i.action === 'BUY').length;
    const oscSell = oscItems.filter(i => i.action === 'SELL').length;
    const oscNeutral = oscItems.filter(i => i.action === 'NEUTRAL').length;

    let oscRating: TechnicalRating = 'NEUTRAL';
    let oscRatingLabel = '本地中性';
    if (oscBuy >= 6) { oscRating = 'STRONG_BUY'; oscRatingLabel = '本地强力买入'; }
    else if (oscBuy >= 4) { oscRating = 'BUY'; oscRatingLabel = '本地买入'; }
    else if (oscSell >= 6) { oscRating = 'STRONG_SELL'; oscRatingLabel = '本地强力卖出'; }
    else if (oscSell >= 4) { oscRating = 'SELL'; oscRatingLabel = '本地卖出'; }

    // =========================================================================
    // 3. Overall Summary Gauge Calculation (All 26 Indicators)
    // =========================================================================
    const totalBuy = maBuy + oscBuy;
    const totalSell = maSell + oscSell;
    const totalNeutral = maNeutral + oscNeutral;
    const totalCount = maItems.length + oscItems.length;

    const netScore = totalCount > 0 ? Math.round(((totalBuy - totalSell) / totalCount) * 100) : 0;

    let overallRating: TechnicalRating = 'NEUTRAL';
    let overallRatingLabel = '本地中性';
    if (netScore >= 40) { overallRating = 'STRONG_BUY'; overallRatingLabel = '本地强烈买入'; }
    else if (netScore >= 15) { overallRating = 'BUY'; overallRatingLabel = '本地积极买入'; }
    else if (netScore <= -40) { overallRating = 'STRONG_SELL'; overallRatingLabel = '本地强烈卖出'; }
    else if (netScore <= -15) { overallRating = 'SELL'; overallRatingLabel = '本地建议减持'; }

    // =========================================================================
    // 4. Pivot Points (Classic, Fibonacci, Camarilla)
    // =========================================================================
    const prevHigh = highs[highs.length - 2] || lastBar.high;
    const prevLow = lows[lows.length - 2] || lastBar.low;
    const prevClose = closes[closes.length - 2] || lastBar.close;

    const classicPivot = (prevHigh + prevLow + prevClose) / 3;
    const classicRange = prevHigh - prevLow;

    const pivots = {
      classic: {
        p: Number(classicPivot.toFixed(2)),
        r1: Number((2 * classicPivot - prevLow).toFixed(2)),
        r2: Number((classicPivot + classicRange).toFixed(2)),
        r3: Number((prevHigh + 2 * (classicPivot - prevLow)).toFixed(2)),
        s1: Number((2 * classicPivot - prevHigh).toFixed(2)),
        s2: Number((classicPivot - classicRange).toFixed(2)),
        s3: Number((prevLow - 2 * (prevHigh - classicPivot)).toFixed(2))
      },
      fibonacci: {
        p: Number(classicPivot.toFixed(2)),
        r1: Number((classicPivot + 0.382 * classicRange).toFixed(2)),
        r2: Number((classicPivot + 0.618 * classicRange).toFixed(2)),
        r3: Number((classicPivot + 1.0 * classicRange).toFixed(2)),
        s1: Number((classicPivot - 0.382 * classicRange).toFixed(2)),
        s2: Number((classicPivot - 0.618 * classicRange).toFixed(2)),
        s3: Number((classicPivot - 1.0 * classicRange).toFixed(2))
      },
      camarilla: {
        p: Number(classicPivot.toFixed(2)),
        r1: Number((prevClose + classicRange * 1.1 / 12).toFixed(2)),
        r2: Number((prevClose + classicRange * 1.1 / 6).toFixed(2)),
        r3: Number((prevClose + classicRange * 1.1 / 4).toFixed(2)),
        r4: Number((prevClose + classicRange * 1.1 / 2).toFixed(2)),
        s1: Number((prevClose - classicRange * 1.1 / 12).toFixed(2)),
        s2: Number((prevClose - classicRange * 1.1 / 6).toFixed(2)),
        s3: Number((prevClose - classicRange * 1.1 / 4).toFixed(2)),
        s4: Number((prevClose - classicRange * 1.1 / 2).toFixed(2))
      }
    };

    // =========================================================================
    // 5. Trend Alignment & Divergence
    // =========================================================================
    const trendDiag = analyzeTrendAndDivergence(bars, timeframe as any);

    return {
      timeframe,
      dataQuality: {
        calculationMethod: 'LOCAL_TECHNICAL_INDICATOR_ENGINE',
        source: provenance?.source ?? 'UNKNOWN',
        barsUsed: bars.length,
        requiredBars: MINIMUM_TECHNICAL_HISTORY_BARS,
        dataAsOf,
        isStale: provenance?.classification === 'STALE_REAL'
      },
      summary: {
        rating: overallRating,
        ratingScore: netScore,
        ratingLabelZh: overallRatingLabel,
        buyCount: totalBuy,
        neutralCount: totalNeutral,
        sellCount: totalSell,
        totalIndicators: totalCount
      },
      movingAverages: {
        rating: maRating,
        ratingLabelZh: maRatingLabel,
        buyCount: maBuy,
        sellCount: maSell,
        neutralCount: maNeutral,
        items: maItems
      },
      oscillators: {
        rating: oscRating,
        ratingLabelZh: oscRatingLabel,
        buyCount: oscBuy,
        sellCount: oscSell,
        neutralCount: oscNeutral,
        items: oscItems
      },
      pivots,
      trendAlignment: {
        status: trendDiag.alignmentStatus,
        label: trendDiag.alignmentLabel,
        ma7: trendDiag.ma7,
        ma25: trendDiag.ma25,
        ma99: trendDiag.ma99,
        bias7Pct: Number((((currentPrice - trendDiag.ma7) / Math.max(0.01, trendDiag.ma7)) * 100).toFixed(2)),
        bias25Pct: Number((((currentPrice - trendDiag.ma25) / Math.max(0.01, trendDiag.ma25)) * 100).toFixed(2)),
        bias99Pct: Number((((currentPrice - trendDiag.ma99) / Math.max(0.01, trendDiag.ma99)) * 100).toFixed(2))
      },
      divergence: {
        status: trendDiag.divergence,
        label: trendDiag.divergenceLabel,
        description: trendDiag.divergenceDescription
      }
    };
  }

  private static calculateCCI(bars: PriceBar[], period: number = 20): number {
    if (bars.length < period) return 0;
    const tps = bars.map(b => (b.high + b.low + b.close) / 3);
    const slice = tps.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const meanDev = slice.reduce((acc, v) => acc + Math.abs(v - mean), 0) / period;
    if (meanDev === 0) return 0;
    const currentTP = tps[tps.length - 1];
    return Number(((currentTP - mean) / (0.015 * meanDev)).toFixed(2));
  }

  private static calculateWilliamsR(bars: PriceBar[], period: number = 14): number {
    if (bars.length < period) return -50;
    const slice = bars.slice(-period);
    const highestHigh = Math.max(...slice.map(b => b.high));
    const lowestLow = Math.min(...slice.map(b => b.low));
    const currentClose = bars[bars.length - 1].close;
    if (highestHigh === lowestLow) return -50;
    return Number((((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100).toFixed(2));
  }

}
