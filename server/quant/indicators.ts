import { PriceBar } from '../types.ts';

export function calculateSMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  result[period - 1] = Number((sum / period).toFixed(2));

  for (let i = period; i < values.length; i++) {
    sum += values[i] - values[i - period];
    result[i] = Number((sum / period).toFixed(2));
  }
  return result;
}

export function calculateEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return result;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prevEMA = sum / period;
  result[period - 1] = Number(prevEMA.toFixed(2));

  for (let i = period; i < values.length; i++) {
    prevEMA = values[i] * k + prevEMA * (1 - k);
    result[i] = Number(prevEMA.toFixed(2));
  }
  return result;
}

export function calculateATR(bars: PriceBar[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(bars.length).fill(null);
  if (bars.length < period + 1) return result;

  const trs: number[] = [bars[0].high - bars[0].low];

  for (let i = 1; i < bars.length; i++) {
    const current = bars[i];
    const prev = bars[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trs.push(tr);
  }

  let sumTR = 0;
  for (let i = 0; i < period; i++) sumTR += trs[i];
  let prevATR = sumTR / period;
  result[period - 1] = Number(prevATR.toFixed(2));

  for (let i = period; i < bars.length; i++) {
    prevATR = (prevATR * (period - 1) + trs[i]) / period;
    result[i] = Number(prevATR.toFixed(2));
  }

  return result;
}

export function computeLatestATR(bars: PriceBar[], period: number = 14): { atr: number; atrPercent: number } {
  if (!bars || bars.length < period) {
    const lastPrice = bars[bars.length - 1]?.close || 100;
    return { atr: Number((lastPrice * 0.02).toFixed(2)), atrPercent: 2.0 };
  }

  const series = calculateATR(bars, period);
  const valid = series.filter((v): v is number => v !== null);
  const lastAtr = valid.length > 0 ? valid[valid.length - 1] : bars[bars.length - 1].close * 0.02;
  const currentPrice = bars[bars.length - 1].close || 1;
  const atrPercent = Number(((lastAtr / currentPrice) * 100).toFixed(2));

  return {
    atr: Number(lastAtr.toFixed(2)),
    atrPercent
  };
}

export function computeRelativeVolume(bars: PriceBar[], period: number = 20): { avgVolume: number; relativeVolume: number } {
  if (!bars || bars.length === 0) return { avgVolume: 1000000, relativeVolume: 1.0 };
  const slice = bars.slice(-period);
  const avg = slice.reduce((sum, b) => sum + b.volume, 0) / slice.length;
  let currentVol = bars[bars.length - 1].volume;

  // Off-session / partial day safeguard:
  // If the current bar volume is below 60% of average (due to partial session / pre-market / after-hours)
  // and a prior completed session exists, use the maximum of current and previous completed session
  // to avoid false zero-out when scanning outside regular market closing hours.
  if (currentVol < avg * 0.6 && bars.length >= 2 && bars[bars.length - 2].volume > avg * 0.3) {
    currentVol = Math.max(currentVol, bars[bars.length - 2].volume);
  }

  const relVol = avg > 0 ? Number((currentVol / avg).toFixed(2)) : 1.0;
  return {
    avgVolume: Math.round(avg),
    relativeVolume: relVol
  };
}
