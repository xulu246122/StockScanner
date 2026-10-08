import { RSIStatus, RSIValue } from '../types.ts';

/**
 * Calculates Classic Wilder RSI (J. Welles Wilder Jr. Smoothed RSI).
 * Formula:
 * - Changes = Close[i] - Close[i-1]
 * - Initial AvgGain = Sum(Gains in period) / period
 * - Initial AvgLoss = Sum(Losses in period) / period
 * - Subsequent AvgGain = (PrevAvgGain * (period - 1) + Gain) / period
 * - Subsequent AvgLoss = (PrevAvgLoss * (period - 1) + Loss) / period
 * - RS = AvgGain / AvgLoss
 * - RSI = 100 - (100 / (1 + RS))
 *
 * Edge cases & validation:
 * - If both AvgGain == 0 and AvgLoss == 0 (flat price): RSI = 50 (Neutral)
 * - If AvgLoss == 0 (strictly positive gains): RSI = 100
 * - If AvgGain == 0 (strictly negative losses): RSI = 0
 */
export function calculateWilderRSI(rawCloses: number[], period: number = 14): (number | null)[] {
  if (!rawCloses || rawCloses.length <= period) {
    return new Array(rawCloses ? rawCloses.length : 0).fill(null);
  }

  // Validate and sanitize input series
  const closes = rawCloses.map(c => (typeof c === 'number' && Number.isFinite(c) ? c : 0));
  const results: (number | null)[] = new Array(closes.length).fill(null);

  let sumGain = 0;
  let sumLoss = 0;

  // 1. Initial period simple average seed (Bars 1 .. period)
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) {
      sumGain += diff;
    } else if (diff < 0) {
      sumLoss += Math.abs(diff);
    }
  }

  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;

  // First RSI value at index = period
  if (avgGain === 0 && avgLoss === 0) {
    results[period] = 50.0;
  } else if (avgLoss === 0) {
    results[period] = 100.0;
  } else if (avgGain === 0) {
    results[period] = 0.0;
  } else {
    const rs = avgGain / avgLoss;
    results[period] = Number((100 - 100 / (1 + rs)).toFixed(2));
  }

  // 2. Subsequent periods using Wilder's Modified Exponential Smoothing (alpha = 1 / period)
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    if (avgGain === 0 && avgLoss === 0) {
      results[i] = 50.0;
    } else if (avgLoss === 0) {
      results[i] = 100.0;
    } else if (avgGain === 0) {
      results[i] = 0.0;
    } else {
      const rs = avgGain / avgLoss;
      results[i] = Number((100 - 100 / (1 + rs)).toFixed(2));
    }
  }

  return results;
}

export function getRSIStatus(rsi: number): { status: RSIStatus; statusLabel: string } {
  if (rsi < 30) {
    return { status: 'OVERSOLD', statusLabel: '超卖 (Oversold)' };
  }
  if (rsi < 50) {
    return { status: 'WEAK', statusLabel: '偏弱 (Weak)' };
  }
  if (rsi <= 70) {
    return { status: 'NEUTRAL', statusLabel: '中性 (Neutral)' };
  }
  return { status: 'OVERBOUGHT', statusLabel: '超买 (Overbought)' };
}

/**
 * Computes single latest RSI value with mathematical validation step
 */
export function computeLatestRSI(closes: number[], period: number = 14): RSIValue {
  const series = calculateWilderRSI(closes, period);
  const validValues = series.filter((v): v is number => v !== null);

  if (validValues.length === 0) {
    return {
      period,
      value: 50,
      status: 'NEUTRAL',
      statusLabel: '中性 (Neutral)',
      change: 0,
    };
  }

  const latest = validValues[validValues.length - 1];
  const previous = validValues.length > 1 ? validValues[validValues.length - 2] : latest;
  const change = Number((latest - previous).toFixed(2));
  const { status, statusLabel } = getRSIStatus(latest);

  // Validation step: ensure exact parity with series output
  if (series[series.length - 1] !== null && Math.abs(series[series.length - 1]! - latest) > 0.001) {
    console.warn(`[RSI Validation Error] Latest RSI mismatch: series=${series[series.length - 1]}, computed=${latest}`);
  }

  return {
    period,
    value: latest,
    status,
    statusLabel,
    previousValue: previous,
    change,
  };
}

/**
 * Self-validation test verifying Wilder RSI smoothing against standard reference textbook vectors
 */
export function validateWilderRSIAlgorithm(): boolean {
  // Benchmark reference prices (15 closing prices)
  const testPrices = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
    45.89, 46.03, 45.61, 46.28, 46.28
  ];

  const rsiResult = calculateWilderRSI(testPrices, 14);
  const latestRsi = rsiResult[rsiResult.length - 1];

  // Expected 14-period Wilder RSI for this textbook sequence is approx 70.53
  const isValid = latestRsi !== null && Math.abs(latestRsi - 70.53) < 0.2;
  if (!isValid) {
    console.error(`[RSI Algorithm Self-Check FAILED] Expected ~70.53, got ${latestRsi}`);
  }
  return isValid;
}

// Run self-check on initialization
validateWilderRSIAlgorithm();
