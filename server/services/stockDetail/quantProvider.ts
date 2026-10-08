import { DataBlock, QuantIntelligenceData, PriceBar, Timeframe } from '../../types.ts';
import { calculateATR, calculateSMA } from '../../quant/indicators.ts';
import { riskEngine } from '../../quant/riskEngine.ts';
import { computeLatestRSI } from '../rsiEngine.ts';
import { MINIMUM_TECHNICAL_HISTORY_BARS, TechnicalSummaryProvider } from './technicalSummaryProvider.ts';

const MINIMUM_ATR_BARS = 15;
const MINIMUM_VOLATILITY_BARS = 21;
const ACCOUNT_SIZE = 100000;
const RISK_PER_TRADE_PERCENT = 1;
const STOP_ATR_MULTIPLIER = 2;
const HARD_STOP_CAP_PERCENT = 5;

function periodsPerYear(timeframe: Timeframe): number {
  switch (timeframe) {
    case '10m': return 252 * 39;
    case '30m': return 252 * 13;
    case '1h': return 252 * 6.5;
    case '2h': return 252 * 3.25;
    case '4h': return 252 * 1.625;
    case '1W': return 52;
    case '1M': return 12;
    default: return 252;
  }
}

function calculateAnnualizedVolatility(closes: number[], timeframe: Timeframe): number | null {
  const returns = closes.slice(1).map((close, index) => (close - closes[index]) / closes[index]);
  if (returns.length < MINIMUM_VOLATILITY_BARS - 1) return null;

  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Number((Math.sqrt(variance * periodsPerYear(timeframe)) * 100).toFixed(2));
}

function unavailableBlock(error: string, updatedAt: string | null = null): DataBlock<QuantIntelligenceData> {
  return {
    status: 'UNAVAILABLE',
    data: null,
    error,
    isMock: false,
    isStale: false,
    updatedAt,
    source: 'UNAVAILABLE'
  };
}

export class QuantProvider {
  public async getQuantIntelligence(
    ticker: string,
    inputBars: PriceBar[],
    currentPrice: number,
    timeframe: Timeframe = '1D'
  ): Promise<DataBlock<QuantIntelligenceData>> {
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      return unavailableBlock('有效股价不足，无法计算量化风险指标');
    }

    const bars = [...(inputBars || [])].sort((a, b) => a.timestamp - b.timestamp);
    const invalidBar = bars.some(bar =>
      !Number.isFinite(bar.timestamp) ||
      !Number.isFinite(bar.open) || bar.open <= 0 ||
      !Number.isFinite(bar.high) ||
      !Number.isFinite(bar.low) || bar.low <= 0 ||
      !Number.isFinite(bar.close) || bar.close <= 0 ||
      !Number.isFinite(bar.volume) || bar.volume < 0 ||
      bar.high < bar.low || bar.high < bar.open || bar.high < bar.close ||
      bar.low > bar.open || bar.low > bar.close
    );
    if (invalidBar || bars.length < MINIMUM_ATR_BARS) {
      return unavailableBlock(`量化风险指标至少需要 ${MINIMUM_ATR_BARS} 根有效 OHLCV 历史数据`);
    }

    const atrSeries = calculateATR(bars, 14);
    const atr = atrSeries[atrSeries.length - 1];
    if (atr === null || atr === undefined || !Number.isFinite(atr) || atr <= 0) {
      return unavailableBlock('历史数据不足以计算 ATR(14)');
    }

    const closes = bars.map(bar => bar.close);
    const rsi14 = computeLatestRSI(closes, 14).value;
    const sma20 = calculateSMA(closes, 20).at(-1) ?? null;
    const sma50 = calculateSMA(closes, 50).at(-1) ?? null;
    const sma200 = calculateSMA(closes, 200).at(-1) ?? null;
    let technicalSummary = null;
    if (bars.length >= MINIMUM_TECHNICAL_HISTORY_BARS) {
      try {
        technicalSummary = TechnicalSummaryProvider.calculateTechnicalSummary(bars, currentPrice, timeframe);
      } catch {
        technicalSummary = null;
      }
    }

    const rawStopDistance = Math.min(atr * STOP_ATR_MULTIPLIER, currentPrice * HARD_STOP_CAP_PERCENT / 100);
    const stopLossPrice = Number(Math.max(0.01, currentPrice - rawStopDistance).toFixed(2));
    const position = riskEngine.calculatePositionSize(
      ACCOUNT_SIZE,
      RISK_PER_TRADE_PERCENT,
      currentPrice,
      stopLossPrice
    );
    const isCapped = atr * STOP_ATR_MULTIPLIER > currentPrice * HARD_STOP_CAP_PERCENT / 100;
    const lastBar = bars[bars.length - 1];
    const isStale = lastBar.provenance?.classification === 'STALE_REAL';
    const rating = technicalSummary?.summary.rating;
    const signal = rating?.includes('BUY')
      ? 'Bullish'
      : rating?.includes('SELL')
        ? 'Bearish'
        : technicalSummary ? 'Neutral' : 'Unavailable';

    const quantScore = technicalSummary
      ? Math.round((technicalSummary.summary.ratingScore + 100) / 2)
      : null;

    const data: QuantIntelligenceData = {
      quantScore,
      strategyScore: null,
      factorScore: null,
      riskScore: null,
      signal,
      signalLabelZh: signal === 'Bullish' ? '本地技术偏多' : signal === 'Bearish' ? '本地技术偏空' : signal === 'Neutral' ? '本地技术中性' : '技术数据不足',
      technicalIndicators: { rsi14, sma20, sma50, sma200 },
      technicalSummary,
      factorScores: {
        compositeScore: null,
        factorRank: null,
        totalRankUniverse: null,
        rankPercentile: null,
        momentum: null,
        value: null,
        quality: null,
        profitability: null,
        growth: null,
        liquidity: null,
        volatility: null,
        rating: 'UNAVAILABLE'
      },
      strategyMatches: [],
      riskEvaluation: {
        atr: Number(atr.toFixed(2)),
        atrPercent: Number((atr / currentPrice * 100).toFixed(2)),
        volatility: calculateAnnualizedVolatility(closes, timeframe),
        beta: null,
        maxPositionSizePercent: position.portfolioExposurePercent,
        riskPerTradePercent: RISK_PER_TRADE_PERCENT,
        stopLossPrice,
        stopLossDistancePct: Number(((rawStopDistance / currentPrice) * 100).toFixed(2)),
        positionShares: position.shares,
        positionValueUsd: position.positionValue,
        hardCapPct: HARD_STOP_CAP_PERCENT,
        riskRewardRatio: null,
        status: isCapped ? 'CAPPED' : 'APPROVED',
        warningMessage: `示例仓位按账户 $${ACCOUNT_SIZE.toLocaleString()}、单笔风险 ${RISK_PER_TRADE_PERCENT}% 计算；止损参考 2×ATR 并受 ${HARD_STOP_CAP_PERCENT}% 硬上限约束。非交易建议。`,
        suggestedPositionShares: position.shares,
        suggestedPositionValueUsd: position.positionValue,
        accountRiskPercent: RISK_PER_TRADE_PERCENT
      },
      marketRegime: null,
      setups: []
    };

    return {
      status: isStale ? 'stale' : 'success',
      data,
      error: technicalSummary ? null : `技术评分需要 ${MINIMUM_TECHNICAL_HISTORY_BARS} 根历史数据；当前风险与因子指标可用`,
      isMock: false,
      isStale,
      updatedAt: lastBar.provenance?.retrievedAt ?? new Date(lastBar.timestamp).toISOString(),
      source: 'LOCAL_QUANT_INDICATOR_ENGINE',
      provenance: lastBar.provenance ? {
        ...lastBar.provenance,
        calculationMethod: 'LOCAL_ATR_RSI_SMA_BETA_AND_REGIME'
      } : undefined
    };
  }
}

export const quantProvider = new QuantProvider();

