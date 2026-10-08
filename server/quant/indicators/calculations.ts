import { PriceBar } from '../../types.ts';
import { calculateSMA, calculateEMA, calculateATR, computeRelativeVolume } from '../indicators.ts';

export { calculateSMA, calculateEMA, calculateATR, computeRelativeVolume };

/**
 * MACD: Moving Average Convergence Divergence
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
  latest: { macd: number; signal: number; histogram: number; isBullishCross: boolean; isBearishCross: boolean };
} {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine[i] = Number(((fastEMA[i] as number) - (slowEMA[i] as number)).toFixed(3));
    }
  }

  // Calculate signal line as EMA of macdLine
  const validMacdValues: number[] = [];
  const validIndices: number[] = [];
  macdLine.forEach((v, idx) => {
    if (v !== null) {
      validMacdValues.push(v);
      validIndices.push(idx);
    }
  });

  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  const histogram: (number | null)[] = new Array(closes.length).fill(null);

  if (validMacdValues.length >= signalPeriod) {
    const rawSignal = calculateEMA(validMacdValues, signalPeriod);
    rawSignal.forEach((sigVal, idx) => {
      const origIdx = validIndices[idx];
      signalLine[origIdx] = sigVal;
      if (sigVal !== null && macdLine[origIdx] !== null) {
        histogram[origIdx] = Number(((macdLine[origIdx] as number) - sigVal).toFixed(3));
      }
    });
  }

  const lastIdx = closes.length - 1;
  const prevIdx = closes.length - 2;
  const lastMacd = macdLine[lastIdx] ?? 0;
  const lastSignal = signalLine[lastIdx] ?? 0;
  const lastHist = histogram[lastIdx] ?? 0;

  const prevMacd = prevIdx >= 0 ? macdLine[prevIdx] : null;
  const prevSignal = prevIdx >= 0 ? signalLine[prevIdx] : null;

  const isBullishCross = prevMacd !== null && prevSignal !== null && prevMacd <= prevSignal && lastMacd > lastSignal;
  const isBearishCross = prevMacd !== null && prevSignal !== null && prevMacd >= prevSignal && lastMacd < lastSignal;

  return {
    macdLine,
    signalLine,
    histogram,
    latest: {
      macd: lastMacd,
      signal: lastSignal,
      histogram: lastHist,
      isBullishCross,
      isBearishCross
    }
  };
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2.0
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  latest: { upper: number; middle: number; lower: number; widthPct: number; percentB: number };
} {
  const middle = calculateSMA(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = middle[i] as number;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    upper[i] = Number((mean + stdDevMultiplier * stdDev).toFixed(2));
    lower[i] = Number((mean - stdDevMultiplier * stdDev).toFixed(2));
  }

  const lastIdx = closes.length - 1;
  const currentClose = closes[lastIdx] || 1;
  const u = upper[lastIdx] ?? currentClose;
  const m = middle[lastIdx] ?? currentClose;
  const l = lower[lastIdx] ?? currentClose;
  const widthPct = m > 0 ? Number((((u - l) / m) * 100).toFixed(2)) : 0;
  const percentB = u !== l ? Number(((currentClose - l) / (u - l)).toFixed(3)) : 0.5;

  return {
    upper,
    middle,
    lower,
    latest: {
      upper: u,
      middle: m,
      lower: l,
      widthPct,
      percentB
    }
  };
}

/**
 * Donchian Channels
 */
export function calculateDonchianChannels(
  bars: PriceBar[],
  period: number = 20
): {
  upper: number;
  lower: number;
  middle: number;
  isBreakoutHigh: boolean;
  isBreakoutLow: boolean;
  distanceToHighPct: number;
} {
  if (!bars || bars.length < period) {
    const last = bars[bars.length - 1]?.close || 100;
    return { upper: last, lower: last, middle: last, isBreakoutHigh: false, isBreakoutLow: false, distanceToHighPct: 0 };
  }

  // Lookback bars excluding current active candle
  const lookback = bars.slice(-period - 1, -1);
  const upper = Math.max(...lookback.map(b => b.high));
  const lower = Math.min(...lookback.map(b => b.low));
  const middle = Number(((upper + lower) / 2).toFixed(2));

  const current = bars[bars.length - 1];
  const isBreakoutHigh = current.close >= upper;
  const isBreakoutLow = current.close <= lower;
  const distanceToHighPct = upper > 0 ? Number((((current.close - upper) / upper) * 100).toFixed(2)) : 0;

  return {
    upper: Number(upper.toFixed(2)),
    lower: Number(lower.toFixed(2)),
    middle,
    isBreakoutHigh,
    isBreakoutLow,
    distanceToHighPct
  };
}

/**
 * Nicolas Darvas Box Detection
 */
export function calculateDarvasBox(
  bars: PriceBar[],
  lookback: number = 30
): {
  boxHigh: number;
  boxLow: number;
  boxWidthPct: number;
  isBreakout: boolean;
  invalidationLevel: number;
  distanceToBreakoutPct: number;
} {
  if (!bars || bars.length < 15) {
    const last = bars[bars.length - 1]?.close || 100;
    return { boxHigh: last, boxLow: last * 0.95, boxWidthPct: 5, isBreakout: false, invalidationLevel: last * 0.95, distanceToBreakoutPct: 0 };
  }

  const effectiveLookback = Math.min(bars.length - 1, lookback);
  const slice = bars.slice(-effectiveLookback - 1, -1);
  const boxHigh = Math.max(...slice.map(b => b.high));
  const boxLow = Math.min(...slice.map(b => b.low));
  const boxWidthPct = boxLow > 0 ? Number((((boxHigh - boxLow) / boxLow) * 100).toFixed(2)) : 0;

  const current = bars[bars.length - 1];
  const isBreakout = current.close > boxHigh;
  const distanceToBreakoutPct = boxHigh > 0 ? Number((((current.close - boxHigh) / boxHigh) * 100).toFixed(2)) : 0;

  return {
    boxHigh: Number(boxHigh.toFixed(2)),
    boxLow: Number(boxLow.toFixed(2)),
    boxWidthPct,
    isBreakout,
    invalidationLevel: Number(boxLow.toFixed(2)),
    distanceToBreakoutPct
  };
}

/**
 * Stochastic Oscillator (%K, %D)
 */
export function calculateStochastic(
  bars: PriceBar[],
  kPeriod: number = 14,
  smoothK: number = 3,
  dPeriod: number = 3
): {
  k: number;
  d: number;
  isAvailable: boolean;
  isOversold: boolean;
  isOverbought: boolean;
  isBullishCross: boolean;
  isBearishCross: boolean;
} {
  const minimumBars = kPeriod + smoothK + dPeriod - 1;
  if (!bars || bars.length < minimumBars) {
    return { k: 50, d: 50, isAvailable: false, isOversold: false, isOverbought: false, isBullishCross: false, isBearishCross: false };
  }

  const rawKValues: number[] = [];
  for (let i = kPeriod - 1; i < bars.length; i++) {
    const slice = bars.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...slice.map(b => b.high));
    const lowestLow = Math.min(...slice.map(b => b.low));
    const currentClose = bars[i].close;

    const kVal = highestHigh !== lowestLow ? ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100 : 50;
    rawKValues.push(kVal);
  }

  const kValues: number[] = [];
  for (let i = smoothK - 1; i < rawKValues.length; i++) {
    const slice = rawKValues.slice(i - smoothK + 1, i + 1);
    kValues.push(slice.reduce((sum, value) => sum + value, 0) / smoothK);
  }

  const dValues: number[] = [];
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    const slice = kValues.slice(i - dPeriod + 1, i + 1);
    dValues.push(slice.reduce((sum, value) => sum + value, 0) / dPeriod);
  }

  const currentK = kValues[kValues.length - 1];
  const currentD = dValues[dValues.length - 1];
  const prevK = kValues[kValues.length - 2];
  const prevD = dValues[dValues.length - 2];

  const isBullishCross = prevK <= prevD && currentK > currentD;
  const isBearishCross = prevK >= prevD && currentK < currentD;

  return {
    k: Number(currentK.toFixed(2)),
    d: Number(currentD.toFixed(2)),
    isAvailable: true,
    isOversold: currentK < 20 && currentD < 20,
    isOverbought: currentK > 80 && currentD > 80,
    isBullishCross,
    isBearishCross
  };
}

/**
 * ADX & Directional Movement (+DI, -DI)
 */
export function calculateADX(
  bars: PriceBar[],
  period: number = 14
): {
  adx: number;
  plusDI: number;
  minusDI: number;
  isAvailable: boolean;
  isTrending: boolean;
  trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
} {
  if (!bars || bars.length < period * 2) {
    return { adx: 0, plusDI: 0, minusDI: 0, isAvailable: false, isTrending: false, trendDirection: 'NEUTRAL' };
  }

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i];
    const prev = bars[i - 1];

    const currentTR = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    tr.push(currentTR);

    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Smooth Wilder TR, +DM, -DM
  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

  const dxList: number[] = [];
  const initialPlusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
  const initialMinusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
  const initialDISum = initialPlusDI + initialMinusDI;
  dxList.push(initialDISum > 0 ? (Math.abs(initialPlusDI - initialMinusDI) / initialDISum) * 100 : 0);

  for (let i = period; i < tr.length; i++) {
    smoothTR = smoothTR - smoothTR / period + tr[i];
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];

    const pDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const mDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const diSum = pDI + mDI;
    const dx = diSum > 0 ? (Math.abs(pDI - mDI) / diSum) * 100 : 0;
    dxList.push(dx);
  }

  const latestPlusDI = smoothTR > 0 ? Number(((smoothPlusDM / smoothTR) * 100).toFixed(1)) : 0;
  const latestMinusDI = smoothTR > 0 ? Number(((smoothMinusDM / smoothTR) * 100).toFixed(1)) : 0;

  if (dxList.length < period) {
    return { adx: 0, plusDI: Number(latestPlusDI.toFixed(1)), minusDI: Number(latestMinusDI.toFixed(1)), isAvailable: false, isTrending: false, trendDirection: 'NEUTRAL' };
  }

  let smoothedAdx = dxList.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxList.length; i++) {
    smoothedAdx = (smoothedAdx * (period - 1) + dxList[i]) / period;
  }
  const adx = Number(smoothedAdx.toFixed(1));

  const isTrending = adx >= 25;
  const trendDirection = latestPlusDI > latestMinusDI ? 'BULLISH' : latestMinusDI > latestPlusDI ? 'BEARISH' : 'NEUTRAL';

  return {
    adx,
    plusDI: latestPlusDI,
    minusDI: latestMinusDI,
    isAvailable: true,
    isTrending,
    trendDirection
  };
}

/**
 * Linear Regression Slope & Direction
 */
export function calculateLinearRegressionSlope(values: number[], period: number = 14): {
  slope: number;
  isUp: boolean;
  isDown: boolean;
} {
  if (!values || values.length < period) return { slope: 0, isUp: false, isDown: false };
  const slice = values.slice(-period);
  const n = slice.length;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = slice[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const roundedSlope = Number(slope.toFixed(4));
  return {
    slope: roundedSlope,
    isUp: roundedSlope > 0.0001,
    isDown: roundedSlope < -0.0001
  };
}

/**
 * OBV: On-Balance Volume
 */
export function calculateOBV(closes: number[], volumes: number[]): {
  series: number[];
  latest: number;
  isRising: boolean;
  slope: number;
} {
  if (!closes || closes.length === 0) return { series: [], latest: 0, isRising: false, slope: 0 };
  const series: number[] = [0];
  let current = 0;
  for (let i = 1; i < closes.length; i++) {
    const prevC = closes[i - 1];
    const currC = closes[i];
    const vol = volumes[i] || 0;
    if (currC > prevC) current += vol;
    else if (currC < prevC) current -= vol;
    series.push(current);
  }

  const latest = series[series.length - 1];
  const prev = series.length > 5 ? series[series.length - 6] : series[0];
  const isRising = latest > prev;
  const slope = series.length >= 10 ? calculateLinearRegressionSlope(series, 10).slope : 0;

  return { series, latest, isRising, slope };
}

/**
 * 52-Week High & Low Metrics
 */
export function calculate52WeekMetrics(bars: PriceBar[], currentPrice: number): {
  high52w: number;
  low52w: number;
  distFrom52wHigh: number;
  distFrom52wLow: number;
  percentFromHigh: number;
} {
  if (!bars || bars.length === 0) {
    return {
      high52w: currentPrice,
      low52w: currentPrice,
      distFrom52wHigh: 0,
      distFrom52wLow: 0,
      percentFromHigh: 0
    };
  }

  let high52w = -Infinity;
  let low52w = Infinity;
  for (const bar of bars) {
    if (bar.high > high52w) high52w = bar.high;
    if (bar.low < low52w) low52w = bar.low;
  }

  const distFrom52wHigh = Number((((currentPrice - high52w) / high52w) * 100).toFixed(2));
  const distFrom52wLow = Number((((currentPrice - low52w) / low52w) * 100).toFixed(2));

  return {
    high52w: Number(high52w.toFixed(2)),
    low52w: Number(low52w.toFixed(2)),
    distFrom52wHigh,
    distFrom52wLow,
    percentFromHigh: Math.abs(distFrom52wHigh)
  };
}

/**
 * Weighted Moving Average (WMA)
 */
export function calculateWMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return result;
  const denominator = (period * (period + 1)) / 2;

  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - period + 1 + j] * (j + 1);
    }
    result[i] = Number((sum / denominator).toFixed(2));
  }
  return result;
}

/**
 * Hull Moving Average (HMA) - Period default 9
 */
export function calculateHMA(values: number[], period: number = 9): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.round(Math.sqrt(period));

  if (values.length < period + sqrtPeriod) return result;

  const wmaHalf = calculateWMA(values, halfPeriod);
  const wmaFull = calculateWMA(values, period);

  const diffSeries: number[] = [];
  const diffIndices: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const h = wmaHalf[i];
    const f = wmaFull[i];
    if (h !== null && f !== null) {
      diffSeries.push(2 * h - f);
      diffIndices.push(i);
    }
  }

  if (diffSeries.length >= sqrtPeriod) {
    const wmaDiff = calculateWMA(diffSeries, sqrtPeriod);
    wmaDiff.forEach((val, idx) => {
      if (val !== null) {
        result[diffIndices[idx]] = val;
      }
    });
  }

  return result;
}

/**
 * Volume-Weighted Moving Average (VWMA) - Period default 20
 */
export function calculateVWMA(bars: PriceBar[], period: number = 20): (number | null)[] {
  const result: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length < period) return result;

  for (let i = period - 1; i < bars.length; i++) {
    let sumPV = 0;
    let sumV = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const vol = bars[j].volume || 1;
      sumPV += bars[j].close * vol;
      sumV += vol;
    }
    result[i] = sumV > 0 ? Number((sumPV / sumV).toFixed(2)) : bars[i].close;
  }
  return result;
}

/**
 * Ichimoku Base Line (Kijun-sen) - Period default 26
 */
export function calculateIchimokuBaseLine(bars: PriceBar[], period: number = 26): (number | null)[] {
  const result: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length < period) return result;

  for (let i = period - 1; i < bars.length; i++) {
    const slice = bars.slice(i - period + 1, i + 1);
    const highest = Math.max(...slice.map(b => b.high));
    const lowest = Math.min(...slice.map(b => b.low));
    result[i] = Number(((highest + lowest) / 2).toFixed(2));
  }
  return result;
}

/**
 * Awesome Oscillator (AO) = SMA(Median Price, 5) - SMA(Median Price, 34)
 */
export function calculateAwesomeOscillator(bars: PriceBar[]): {
  series: (number | null)[];
  latest: number;
  prev: number;
  isBullish: boolean;
} {
  const medians = bars.map(b => (b.high + b.low) / 2);
  const sma5 = calculateSMA(medians, 5);
  const sma34 = calculateSMA(medians, 34);

  const series: (number | null)[] = new Array(bars.length).fill(null);
  for (let i = 0; i < bars.length; i++) {
    if (sma5[i] !== null && sma34[i] !== null) {
      series[i] = Number(((sma5[i] as number) - (sma34[i] as number)).toFixed(2));
    }
  }

  const lastIdx = bars.length - 1;
  const latest = series[lastIdx] ?? 0;
  const prev = series[lastIdx - 1] ?? latest;
  return {
    series,
    latest,
    prev,
    isBullish: latest > 0 && latest > prev
  };
}

/**
 * Bull / Bear Power (Elder Ray Index)
 * Bull Power = High - EMA(13)
 * Bear Power = Low - EMA(13)
 */
export function calculateElderRay(bars: PriceBar[], emaPeriod: number = 13): {
  bullPower: number;
  bearPower: number;
  combinedPower: number;
  isAvailable: boolean;
  action: 'BUY' | 'SELL' | 'NEUTRAL';
} {
  if (!bars || bars.length < emaPeriod) {
    return { bullPower: 0, bearPower: 0, combinedPower: 0, isAvailable: false, action: 'NEUTRAL' };
  }

  const closes = bars.map(b => b.close);
  const ema = calculateEMA(closes, emaPeriod);
  const lastEma = ema[ema.length - 1];
  if (lastEma === null || lastEma === undefined) {
    return { bullPower: 0, bearPower: 0, combinedPower: 0, isAvailable: false, action: 'NEUTRAL' };
  }
  const lastBar = bars[bars.length - 1];

  const bull = Number((lastBar.high - lastEma).toFixed(2));
  const bear = Number((lastBar.low - lastEma).toFixed(2));
  const combined = Number((bull + bear).toFixed(2));

  let action: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (bull > 0 && bear > 0) action = 'BUY';
  else if (bear < 0 && bull < 0) action = 'SELL';

  return { bullPower: bull, bearPower: bear, combinedPower: combined, isAvailable: true, action };
}

/**
 * Stochastic RSI (14, 14, 3, 3)
 */
export function calculateStochRSI(
  rsiValues: number[],
  period: number = 14,
  kPeriod: number = 3
): { k: number; d: number; action: 'BUY' | 'SELL' | 'NEUTRAL' } {
  if (rsiValues.length < period + kPeriod) {
    return { k: 50, d: 50, action: 'NEUTRAL' };
  }

  const rawStochRsi: number[] = [];
  for (let i = period - 1; i < rsiValues.length; i++) {
    const slice = rsiValues.slice(i - period + 1, i + 1);
    const minRsi = Math.min(...slice);
    const maxRsi = Math.max(...slice);
    const curr = rsiValues[i];
    const val = maxRsi !== minRsi ? ((curr - minRsi) / (maxRsi - minRsi)) * 100 : 50;
    rawStochRsi.push(val);
  }

  const kSlice = rawStochRsi.slice(-kPeriod);
  const k = kSlice.length > 0 ? Number((kSlice.reduce((a, b) => a + b, 0) / kSlice.length).toFixed(1)) : 50;
  const dSlice = rawStochRsi.slice(-kPeriod * 2, -kPeriod);
  const d = dSlice.length > 0 ? Number((dSlice.reduce((a, b) => a + b, 0) / dSlice.length).toFixed(1)) : k;

  let action: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (k < 20 && k > d) action = 'BUY';
  else if (k > 80 && k < d) action = 'SELL';

  return { k, d, action };
}

/**
 * Ultimate Oscillator (7, 14, 28)
 */
export function calculateUltimateOscillator(
  bars: PriceBar[],
  p1: number = 7,
  p2: number = 14,
  p3: number = 28
): number {
  if (bars.length < p3 + 1) return 50;

  const bp: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i];
    const prevClose = bars[i - 1].close;
    const trueLow = Math.min(cur.low, prevClose);
    const trueHigh = Math.max(cur.high, prevClose);
    bp.push(cur.close - trueLow);
    tr.push(trueHigh - trueLow);
  }

  const sumSlice = (arr: number[], count: number) => arr.slice(-count).reduce((a, b) => a + b, 0);

  const sumBP1 = sumSlice(bp, p1);
  const sumTR1 = sumSlice(tr, p1);
  const sumBP2 = sumSlice(bp, p2);
  const sumTR2 = sumSlice(tr, p2);
  const sumBP3 = sumSlice(bp, p3);
  const sumTR3 = sumSlice(tr, p3);

  const a1 = sumTR1 > 0 ? sumBP1 / sumTR1 : 0.5;
  const a2 = sumTR2 > 0 ? sumBP2 / sumTR2 : 0.5;
  const a3 = sumTR3 > 0 ? sumBP3 / sumTR3 : 0.5;

  const uo = 100 * ((4 * a1 + 2 * a2 + a3) / 7);
  return Number(uo.toFixed(1));
}

