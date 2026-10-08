import { PriceBar, TrendAnalysisResult, DivergenceType, TrendAlignment } from '../types.ts';

/**
 * Calculates Simple Moving Average (SMA) for an array of values
 */
export function calculateSMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Calculates Wilder's RSI array for an array of PriceBar
 */
export function calculateWilderRSIArray(bars: PriceBar[], period = 14): (number | null)[] {
  if (bars.length < period + 1) {
    return bars.map(() => null);
  }

  const closes = bars.map(b => b.close);
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  const rsiResults: (number | null)[] = [null]; // first bar has no change

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const chg = changes[i];
    if (chg > 0) avgGain += chg;
    else avgLoss += Math.abs(chg);
  }

  avgGain /= period;
  avgLoss /= period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let firstRsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
  
  // Fill nulls before initial period
  for (let i = 0; i < period - 1; i++) {
    rsiResults.push(null);
  }
  rsiResults.push(firstRsi);

  // Wilder exponential smoothing for subsequent bars
  for (let i = period; i < changes.length; i++) {
    const chg = changes[i];
    const gain = chg > 0 ? chg : 0;
    const loss = chg < 0 ? Math.abs(chg) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    rsiResults.push(rsi);
  }

  return rsiResults;
}

/**
 * Identifies local peaks and troughs in a numeric array
 */
function findExtremas(data: (number | null)[], window = 3): { index: number; value: number; type: 'PEAK' | 'TROUGH' }[] {
  const extremas: { index: number; value: number; type: 'PEAK' | 'TROUGH' }[] = [];

  for (let i = window; i < data.length - window; i++) {
    const val = data[i];
    if (val === null) continue;

    let isPeak = true;
    let isTrough = true;

    for (let w = 1; w <= window; w++) {
      const prev = data[i - w];
      const next = data[i + w];
      if (prev === null || next === null) {
        isPeak = false;
        isTrough = false;
        break;
      }
      if (prev >= val || next > val) isPeak = false;
      if (prev <= val || next < val) isTrough = false;
    }

    if (isPeak) {
      extremas.push({ index: i, value: val, type: 'PEAK' });
    } else if (isTrough) {
      extremas.push({ index: i, value: val, type: 'TROUGH' });
    }
  }

  return extremas;
}

/**
 * Multi-period Trend & MA7/25/99 + Wilder RSI Divergence Evaluator
 */
export function analyzeTrendAndDivergence(
  bars: PriceBar[],
  timeframe: '4h' | '1D' | '1W'
): TrendAnalysisResult {
  const defaultPrice = bars.length > 0 ? bars[bars.length - 1].close : 100;
  
  if (bars.length < 10) {
    return {
      timeframe,
      price: defaultPrice,
      ma7: defaultPrice,
      ma25: defaultPrice,
      ma99: defaultPrice,
      alignment: 'NEUTRAL',
      alignmentLabel: 'Data accumulating',
      alignmentStatus: 'NEUTRAL',
      divergence: 'NONE',
      divergenceLabel: 'No Divergence',
      divergenceDescription: 'Historical bar range is insufficient for divergence calculation',
      rsiCurrent: 50,
      priceCurrent: defaultPrice
    };
  }

  const closes = bars.map(b => b.close);
  const currentPrice = closes[closes.length - 1];

  // Calculate MAs
  const ma7Series = calculateSMA(closes, 7);
  const ma25Series = calculateSMA(closes, Math.min(25, closes.length));
  const ma99Series = calculateSMA(closes, Math.min(99, closes.length));

  const ma7 = ma7Series[ma7Series.length - 1] ?? currentPrice;
  const ma25 = ma25Series[ma25Series.length - 1] ?? ma7;
  const ma99 = ma99Series[ma99Series.length - 1] ?? ma25;

  const prevMa7 = ma7Series[ma7Series.length - 2] ?? ma7;
  const prevMa25 = ma25Series[ma25Series.length - 2] ?? ma25;

  // Trend Alignment Evaluation
  let alignment: TrendAlignment = 'NEUTRAL';
  let alignmentLabel = 'Consolidation / Range';
  let alignmentStatus: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

  if (currentPrice > ma7 && ma7 > ma25 && ma25 > ma99) {
    alignment = 'BULLISH_ALIGNMENT';
    alignmentLabel = 'Bullish Alignment (多头排列)';
    alignmentStatus = 'BULLISH';
  } else if (currentPrice < ma7 && ma7 < ma25 && ma25 < ma99) {
    alignment = 'BEARISH_ALIGNMENT';
    alignmentLabel = 'Bearish Alignment (空头排列)';
    alignmentStatus = 'BEARISH';
  } else if (prevMa7 <= prevMa25 && ma7 > ma25) {
    alignment = 'GOLDEN_CROSS';
    alignmentLabel = 'MA Golden Cross (金叉突破)';
    alignmentStatus = 'BULLISH';
  } else if (prevMa7 >= prevMa25 && ma7 < ma25) {
    alignment = 'DEATH_CROSS';
    alignmentLabel = 'MA Death Cross (死叉承压)';
    alignmentStatus = 'BEARISH';
  } else if (currentPrice > ma25 && ma7 > ma25) {
    alignment = 'BULLISH_ALIGNMENT';
    alignmentLabel = 'Short-term Bullish (偏多震荡)';
    alignmentStatus = 'BULLISH';
  } else if (currentPrice < ma25 && ma7 < ma25) {
    alignment = 'BEARISH_ALIGNMENT';
    alignmentLabel = 'Short-term Bearish (偏空下行)';
    alignmentStatus = 'BEARISH';
  }

  // Calculate Wilder RSI Series
  const rsiSeries = calculateWilderRSIArray(bars, 14);
  const currentRsi = rsiSeries[rsiSeries.length - 1] ?? 50;

  // Divergence Detection
  const priceExtremas = findExtremas(closes, 3);
  const rsiExtremas = findExtremas(rsiSeries, 3);

  let divergence: DivergenceType = 'NONE';
  let divergenceLabel = 'Synchronized (趋势同步)';
  let divergenceDescription = 'Price and Wilder RSI momentum are moving in healthy synchrony.';
  let rsiPrevExtrema: number | undefined;
  let pricePrevExtrema: number | undefined;

  // Check Bullish Divergence (底背离):
  // Price makes Lower Low (or equal low), but RSI makes Higher Low, particularly near oversold area
  const priceTroughs = priceExtremas.filter(e => e.type === 'TROUGH');
  const rsiTroughs = rsiExtremas.filter(e => e.type === 'TROUGH');

  if (priceTroughs.length >= 2 && rsiTroughs.length >= 2) {
    const recentPT = priceTroughs[priceTroughs.length - 1];
    const prevPT = priceTroughs[priceTroughs.length - 2];

    const recentRT = rsiTroughs[rsiTroughs.length - 1];
    const prevRT = rsiTroughs[rsiTroughs.length - 2];

    // Check if recent price trough is lower than previous price trough
    // AND recent RSI trough is HIGHER than previous RSI trough
    if (recentPT.value < prevPT.value && recentRT.value > prevRT.value) {
      divergence = 'BULLISH_DIV';
      divergenceLabel = 'Bullish Divergence (底背离)';
      divergenceDescription = `Price made lower low ($${recentPT.value.toFixed(2)} < $${prevPT.value.toFixed(2)}), but Wilder RSI formed a higher trough (${recentRT.value.toFixed(1)} > ${prevRT.value.toFixed(1)}), signaling strong oversold rebound momentum.`;
      rsiPrevExtrema = prevRT.value;
      pricePrevExtrema = prevPT.value;
    }
  }

  // Check Bearish Divergence (顶背离):
  // Price makes Higher High, but RSI makes Lower High
  const pricePeaks = priceExtremas.filter(e => e.type === 'PEAK');
  const rsiPeaks = rsiExtremas.filter(e => e.type === 'PEAK');

  if (divergence === 'NONE' && pricePeaks.length >= 2 && rsiPeaks.length >= 2) {
    const recentPP = pricePeaks[pricePeaks.length - 1];
    const prevPP = pricePeaks[pricePeaks.length - 2];

    const recentRP = rsiPeaks[rsiPeaks.length - 1];
    const prevRP = rsiPeaks[rsiPeaks.length - 2];

    if (recentPP.value > prevPP.value && recentRP.value < prevRP.value) {
      divergence = 'BEARISH_DIV';
      divergenceLabel = 'Bearish Divergence (顶背离)';
      divergenceDescription = `Price pushed to higher peak ($${recentPP.value.toFixed(2)} > $${prevPP.value.toFixed(2)}), but Wilder RSI failed to break high (${recentRP.value.toFixed(1)} < ${prevRP.value.toFixed(1)}), indicating buyer momentum exhaustion and reversal risk.`;
      rsiPrevExtrema = prevRP.value;
      pricePrevExtrema = prevPP.value;
    }
  }

  // Fallback direct check against recent 15-bar extrema if local troughs weren't spaced wide enough
  if (divergence === 'NONE' && bars.length >= 20) {
    const recentWindow = bars.slice(-15);
    const olderWindow = bars.slice(-35, -15);
    if (olderWindow.length > 0) {
      const minRecentP = Math.min(...recentWindow.map(b => b.close));
      const minOlderP = Math.min(...olderWindow.map(b => b.close));

      const rsiRecent = rsiSeries.slice(-15).filter((r): r is number => r !== null);
      const rsiOlder = rsiSeries.slice(-35, -15).filter((r): r is number => r !== null);

      if (rsiRecent.length > 0 && rsiOlder.length > 0) {
        const minRecentRsi = Math.min(...rsiRecent);
        const minOlderRsi = Math.min(...rsiOlder);

        if (minRecentP < minOlderP * 0.985 && minRecentRsi > minOlderRsi + 3 && minRecentRsi < 45) {
          divergence = 'BULLISH_DIV';
          divergenceLabel = 'Bullish Divergence (底背离)';
          divergenceDescription = `Price formed lower low while Wilder RSI formed higher low on ${timeframe} timeframe, presenting a prime dip-buying rebound signal.`;
        } else {
          const maxRecentP = Math.max(...recentWindow.map(b => b.close));
          const maxOlderP = Math.max(...olderWindow.map(b => b.close));
          const maxRecentRsi = Math.max(...rsiRecent);
          const maxOlderRsi = Math.max(...rsiOlder);

          if (maxRecentP > maxOlderP * 1.015 && maxRecentRsi < maxOlderRsi - 3 && maxRecentRsi > 60) {
            divergence = 'BEARISH_DIV';
            divergenceLabel = 'Bearish Divergence (顶背离)';
            divergenceDescription = `Price achieved new high while Wilder RSI lost upward momentum on ${timeframe} timeframe, indicating high probability of top pullback.`;
          }
        }
      }
    }
  }

  return {
    timeframe,
    price: currentPrice,
    ma7,
    ma25,
    ma99,
    alignment,
    alignmentLabel,
    alignmentStatus,
    divergence,
    divergenceLabel,
    divergenceDescription,
    rsiCurrent: currentRsi,
    rsiPreviousPeakOrTrough: rsiPrevExtrema,
    priceCurrent: currentPrice,
    pricePreviousPeakOrTrough: pricePrevExtrema,
    supportLevel: Math.min(ma7, ma25, ma99),
    resistanceLevel: Math.max(ma7, ma25, ma99)
  };
}
