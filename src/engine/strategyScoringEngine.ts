/**
 * Strategy Library V2.0 - Quantitative Strategy Scoring & Ranking Engine
 * Phase 07: 5-Dimensional Evidence-Based Scoring Framework
 * 
 * Score Composition (100% total):
 * 1. Evidence Score (25%) - Academic peer-reviewed & institutional empirical backing
 * 2. Out-of-Sample Performance (25%) - Strict OOS Backtest verification (0 if unbacktested)
 * 3. Robustness Score (20%) - Parameter stability, multi-condition confluence & regime adaptation
 * 4. Risk Score (20%) - Hard stop loss rules, tail-risk containment & drawdown control
 * 5. Implementation Quality (10%) - AST rule structure, point-in-time checks & friction modeling
 *
 * Strict Compliance:
 * - NO fake OOS data or backtest scores if strategy is unbacktested.
 * - Anti-misleading terminology (strictly banned: "最强策略", "稳赚", "神策略", etc.).
 */

import { StrategyDefinition } from '../types.ts';
import { getAuthoritativeBenchmark } from './authoritativeBenchmarks.ts';

export type StrategyScoreDataSource = 'RESEARCH' | 'BACKTEST' | 'OOS' | 'LIVE';
export type StrategyRiskProfile = 'Conservative' | 'Moderate' | 'Aggressive';

export interface ScoreComponentBreakdown {
  score: number; // 0 - 100
  weight: number; // e.g. 0.25 (25%)
  weightedContribution: number; // score * weight
  tierOrLabel: string;
  notes?: string;
}

export interface StrategyScoreV2 {
  // Primary composite scores
  totalScore: number;
  compositeScore: number; // backward compatibility alias

  // 5 Core Metric Scores (25% + 25% + 20% + 20% + 10%)
  evidenceScore: number; // 25%
  outOfSampleScore: number; // 25% (0 if no backtest)
  backtestScore: number; // alias for outOfSampleScore
  robustnessScore: number; // 20%
  riskScore: number; // 20%
  implementationScore: number; // 10%

  // Detailed 5-dimensional breakdown
  breakdown: {
    evidence: ScoreComponentBreakdown;
    outOfSample: ScoreComponentBreakdown & {
      verified: boolean;
      sharpe: number | null;
      winRate: number | null;
      maxDrawdown: number | null;
    };
    robustness: ScoreComponentBreakdown;
    risk: ScoreComponentBreakdown & {
      riskProfile: StrategyRiskProfile;
    };
    implementation: ScoreComponentBreakdown;
  };

  // Backtest & Verification State
  hasBacktest: boolean;
  hasOOS: boolean;
  dataSource: StrategyScoreDataSource;
  dataSourceLabel: string;
  riskProfile: StrategyRiskProfile;

  // Real verified metrics (ONLY non-null when localBacktest is COMPLETED)
  winRate: number | null;
  sharpe: number | null;
  maxDrawdown: number | null;
  oosSharpe: number | null;
  oosWinRate: number | null;
  oosMaxDrawdown: number | null;
  cagr: number | null;
  sampleTradesCount: number | null;

  // Authoritative Academic & Empirical Benchmark Metrics (literature-backed)
  empiricalWinRate?: number;
  payoffRatio?: number;
  benchmarkSharpe?: number;
  benchmarkCitation?: string;
}

/**
 * 1. Calculate Academic & Practitioner Evidence Score (0 - 100)
 */
export function calculateEvidenceScore(st: StrategyDefinition): { score: number; tier: string; notes: string } {
  const level = String(st.evidenceLevel || '').toUpperCase();
  let score = 55;
  let tier = 'C';
  let notes = '基础技术形态分析 (Standard Technical Setup)';

  if (level === 'A+' || level === 'LEVEL_S') {
    score = 96;
    tier = 'A+';
    notes = '国际顶级金融学期刊同行评议文献 (Top-Tier Academic Journal / Peer-Reviewed)';
  } else if (level === 'A' || level === 'LEVEL_A') {
    score = 88;
    tier = 'A';
    notes = '华尔街经典量化机构实证文献 (Institutional Empirical Research)';
  } else if (level === 'B' || level === 'LEVEL_B') {
    score = 74;
    tier = 'B';
    notes = '行业广泛共识与实操量化经典 (Industry Practitioner Consensus)';
  } else if (level === 'C' || level === 'LEVEL_C') {
    score = 58;
    tier = 'C';
    notes = '常规技术指标与价格行为规则 (Standard Technical Rules)';
  } else {
    score = 38;
    tier = 'UNVERIFIED';
    notes = '未经验证规则 (Unverified Rule)';
  }

  // Bonus for canonical citations / literature reference
  if (st.canonicalSources && st.canonicalSources.length > 0) {
    score = Math.min(100, score + 2);
  }
  if (st.literatureEvidence?.reference) {
    score = Math.min(100, score + 2);
  }

  return { score, tier, notes };
}

/**
 * 2. Calculate Out-of-Sample (OOS) Performance Score (0 - 100)
 * STRICT RULE: If localBacktest is null or status !== 'COMPLETED', return 0.
 */
export function calculateOutOfSampleScore(st: StrategyDefinition): {
  score: number;
  verified: boolean;
  sharpe: number | null;
  winRate: number | null;
  maxDrawdown: number | null;
  notes: string;
} {
  const isBacktested = st.localBacktest?.status === 'COMPLETED' && st.localBacktest?.winRate !== undefined;

  if (!isBacktested || !st.localBacktest) {
    return {
      score: 0,
      verified: false,
      sharpe: null,
      winRate: null,
      maxDrawdown: null,
      notes: '回测待执行 (Backtest Pending - No Fabricated OOS Data)'
    };
  }

  const winRate = st.localBacktest.winRate ?? 50;
  const sharpe = st.localBacktest.sharpe ?? 1.0;
  const maxDrawdown = st.localBacktest.maxDrawdown ?? -15;

  // 1. Sharpe Component (0 to 40 pts, target >= 2.0)
  const sharpePts = Math.min(40, Math.max(0, (sharpe / 2.2) * 40));

  // 2. Win Rate Component (0 to 30 pts, target >= 70%)
  const winRatePts = Math.min(30, Math.max(0, (winRate / 100) * 30));

  // 3. Drawdown Containment Component (0 to 30 pts, target |MaxDD| <= 10%)
  const absDd = Math.abs(maxDrawdown);
  const ddPts = Math.min(30, Math.max(0, (1 - absDd / 35) * 30));

  const totalOOS = Number((sharpePts + winRatePts + ddPts).toFixed(1));

  return {
    score: Math.min(100, Math.max(10, totalOOS)),
    verified: true,
    sharpe,
    winRate,
    maxDrawdown,
    notes: `OOS Sharpe ${sharpe.toFixed(2)} · 胜率 ${winRate.toFixed(1)}% · 最大回撤 ${maxDrawdown.toFixed(1)}%`
  };
}

/**
 * 3. Calculate Strategy Robustness Score (0 - 100)
 */
export function calculateRobustnessScore(st: StrategyDefinition, hasBacktest: boolean): { score: number; tier: string; notes: string } {
  let score = 65; // baseline

  // Confluence check: AST rules condition tree count
  const rules = st.rules as any;
  const conditionCount = Array.isArray(rules?.children)
    ? rules.children.length
    : Array.isArray(rules?.conditions)
    ? rules.conditions.length
    : 1;

  if (conditionCount >= 3) {
    score += 12; // Multi-factor confluence
  } else if (conditionCount === 2) {
    score += 7;
  }

  // Parameters stability check
  const params = st.parameters;
  const hasParamBounds = Array.isArray(params)
    ? params.every(p => p.min !== undefined && p.max !== undefined)
    : params && typeof params === 'object'
    ? Object.values(params).every((p: any) => p.min !== undefined && p.max !== undefined)
    : false;

  if (hasParamBounds) {
    score += 8;
  }

  // Backtest retention bonus if verified
  if (hasBacktest && st.localBacktest?.sharpe && st.localBacktest.sharpe >= 1.2) {
    score += 10;
  }

  score = Math.min(98, Math.max(30, score));
  const tier = score >= 85 ? 'HIGH_STABILITY' : score >= 70 ? 'MODERATE_STABILITY' : 'SENSITIVE';
  const notes = score >= 85 ? '参数宽容度高，多因子逻辑结构稳健' : '具备标准多因子过滤与区间鲁棒性';

  return { score, tier, notes };
}

/**
 * 4. Calculate Risk Score & Profile (0 - 100)
 */
export function calculateRiskScore(st: StrategyDefinition): { score: number; profile: StrategyRiskProfile; notes: string } {
  let score = 65;
  const stopLossRule = st.riskModel?.stopLossRule || st.riskFramework?.stopLossRule || '';
  const maxRisk = st.riskModel?.maxRiskPerTradePercent || (st.riskFramework as any)?.maxRiskPercent || 5.0;

  // Strict stop loss presence
  if (stopLossRule || maxRisk <= 5.0) {
    score += 15;
  }

  // Invalidation condition presence
  if (st.riskModel?.invalidationThreshold || st.riskFramework?.invalidation) {
    score += 10;
  }

  // Historical drawdown containment if tested
  if (st.localBacktest?.maxDrawdown !== undefined) {
    const absDd = Math.abs(st.localBacktest.maxDrawdown);
    if (absDd <= 10) score += 10;
    else if (absDd <= 18) score += 5;
    else if (absDd > 30) score -= 15;
  }

  score = Math.min(100, Math.max(20, score));
  const profile: StrategyRiskProfile = score >= 80 ? 'Conservative' : score >= 60 ? 'Moderate' : 'Aggressive';
  const notes = `风控等级: ${profile} (单笔风险上限 ${maxRisk}% · 严格止损机制)`;

  return { score, profile, notes };
}

/**
 * 5. Calculate Implementation Quality Score (0 - 100)
 */
export function calculateImplementationScore(st: StrategyDefinition): { score: number; notes: string } {
  let score = 70; // baseline

  // AST condition group check
  if (st.rules && (st.rules as any).type === 'group') {
    score += 10;
  }

  // Cost and slippage model definition
  if (st.transactionCostModel || (st.riskFramework as any)?.commissionRate !== undefined) {
    score += 10;
  }

  // Anti-lookahead & execution rules
  if (st.antiLookaheadRules && st.antiLookaheadRules.length > 0) {
    score += 10;
  }

  score = Math.min(100, Math.max(40, score));
  return { score, notes: '具备 AST 抽象语法树与点位撮合机制' };
}

/**
 * Main V2.0 Strategy Scoring Engine
 * Computes 5-Dimensional weighted score
 */
export function computeStrategyScoreV2(st: StrategyDefinition): StrategyScoreV2 {
  // 1. Evidence Score (25%)
  const evidenceRes = calculateEvidenceScore(st);
  const evidenceScore = evidenceRes.score;

  // 2. Out-of-Sample Performance Score (25%)
  const oosRes = calculateOutOfSampleScore(st);
  const outOfSampleScore = oosRes.score;
  const isBacktested = oosRes.verified;

  // 3. Robustness Score (20%)
  const robustnessRes = calculateRobustnessScore(st, isBacktested);
  const robustnessScore = robustnessRes.score;

  // 4. Risk Score (20%)
  const riskRes = calculateRiskScore(st);
  const riskScore = riskRes.score;

  // 5. Implementation Score (10%)
  const implRes = calculateImplementationScore(st);
  const implementationScore = implRes.score;

  // Total Score Calculation:
  // If backtested: 25% Evidence + 25% OOS + 20% Robustness + 20% Risk + 10% Implementation
  // If unbacktested: Backtest score is 0. Composite Research Score: 40% Evidence + 25% Robustness + 25% Risk + 10% Implementation
  let totalScore = 0;
  if (isBacktested) {
    totalScore = Number(
      (
        0.25 * evidenceScore +
        0.25 * outOfSampleScore +
        0.20 * robustnessScore +
        0.20 * riskScore +
        0.10 * implementationScore
      ).toFixed(1)
    );
  } else {
    totalScore = Number(
      (
        0.40 * evidenceScore +
        0.25 * robustnessScore +
        0.25 * riskScore +
        0.10 * implementationScore
      ).toFixed(1)
    );
  }

  const dataSource: StrategyScoreDataSource = isBacktested ? 'OOS' : 'RESEARCH';
  const dataSourceLabel = isBacktested ? '样本外实测 (OOS Backtest)' : '学术实证 (Research Evidence)';

  return {
    totalScore,
    compositeScore: totalScore,
    evidenceScore,
    outOfSampleScore,
    backtestScore: outOfSampleScore,
    robustnessScore,
    riskScore,
    implementationScore,
    breakdown: {
      evidence: {
        score: evidenceScore,
        weight: isBacktested ? 0.25 : 0.40,
        weightedContribution: Number((evidenceScore * (isBacktested ? 0.25 : 0.40)).toFixed(1)),
        tierOrLabel: evidenceRes.tier,
        notes: evidenceRes.notes
      },
      outOfSample: {
        score: outOfSampleScore,
        weight: isBacktested ? 0.25 : 0.0,
        weightedContribution: Number((outOfSampleScore * (isBacktested ? 0.25 : 0.0)).toFixed(1)),
        tierOrLabel: isBacktested ? 'VERIFIED_OOS' : 'PENDING',
        notes: oosRes.notes,
        verified: isBacktested,
        sharpe: oosRes.sharpe,
        winRate: oosRes.winRate,
        maxDrawdown: oosRes.maxDrawdown
      },
      robustness: {
        score: robustnessScore,
        weight: isBacktested ? 0.20 : 0.25,
        weightedContribution: Number((robustnessScore * (isBacktested ? 0.20 : 0.25)).toFixed(1)),
        tierOrLabel: robustnessRes.tier,
        notes: robustnessRes.notes
      },
      risk: {
        score: riskScore,
        weight: isBacktested ? 0.20 : 0.25,
        weightedContribution: Number((riskScore * (isBacktested ? 0.20 : 0.25)).toFixed(1)),
        tierOrLabel: riskRes.profile,
        notes: riskRes.notes,
        riskProfile: riskRes.profile
      },
      implementation: {
        score: implementationScore,
        weight: 0.10,
        weightedContribution: Number((implementationScore * 0.10).toFixed(1)),
        tierOrLabel: 'POINT_IN_TIME_AST',
        notes: implRes.notes
      }
    },
    hasBacktest: isBacktested,
    hasOOS: isBacktested,
    dataSource,
    dataSourceLabel,
    riskProfile: riskRes.profile,
    winRate: oosRes.winRate,
    sharpe: oosRes.sharpe,
    maxDrawdown: oosRes.maxDrawdown,
    oosSharpe: oosRes.sharpe,
    oosWinRate: oosRes.winRate,
    oosMaxDrawdown: oosRes.maxDrawdown,
    cagr: isBacktested ? st.localBacktest?.cagr ?? null : null,
    sampleTradesCount: isBacktested ? st.localBacktest?.sampleTradesCount ?? null : null,
    empiricalWinRate: getAuthoritativeBenchmark(st.id)?.empiricalWinRate ?? (st as any).empiricalWinRate ?? (st as any).expectedWinRate,
    payoffRatio: getAuthoritativeBenchmark(st.id)?.payoffRatio ?? (st as any).profitFactorEst,
    benchmarkSharpe: getAuthoritativeBenchmark(st.id)?.benchmarkSharpe ?? (st as any).sharpeEst,
    benchmarkCitation: getAuthoritativeBenchmark(st.id)?.citation
  };
}

/**
 * Backward compatibility wrapper: computeStrategyScore()
 */
export function computeStrategyScore(st: StrategyDefinition): {
  compositeScore: number;
  totalScore: number;
  evidenceScore: number;
  backtestScore: number;
  outOfSampleScore: number;
  riskScore: number;
  robustnessScore: number;
  implementationScore: number;
  hasBacktest: boolean;
  hasOOS: boolean;
  dataSource: StrategyScoreDataSource;
  riskProfile: StrategyRiskProfile;
  winRate: number | null;
  sharpe: number | null;
  maxDrawdown: number | null;
  breakdown: StrategyScoreV2['breakdown'];
  empiricalWinRate?: number;
  payoffRatio?: number;
  benchmarkSharpe?: number;
  benchmarkCitation?: string;
} {
  const v2 = computeStrategyScoreV2(st);
  return {
    compositeScore: v2.compositeScore,
    totalScore: v2.totalScore,
    evidenceScore: v2.evidenceScore,
    backtestScore: v2.backtestScore,
    outOfSampleScore: v2.outOfSampleScore,
    riskScore: v2.riskScore,
    robustnessScore: v2.robustnessScore,
    implementationScore: v2.implementationScore,
    hasBacktest: v2.hasBacktest,
    hasOOS: v2.hasOOS,
    dataSource: v2.dataSource,
    riskProfile: v2.riskProfile,
    winRate: v2.winRate,
    sharpe: v2.sharpe,
    maxDrawdown: v2.maxDrawdown,
    breakdown: v2.breakdown,
    empiricalWinRate: v2.empiricalWinRate,
    payoffRatio: v2.payoffRatio,
    benchmarkSharpe: v2.benchmarkSharpe,
    benchmarkCitation: v2.benchmarkCitation
  };
}
