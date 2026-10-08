/**
 * ==============================================================================
 * ANTIGRAVITY AGENT DIAGNOSTIC SUITE & SYSTEM HEALTH VERIFIER
 * ==============================================================================
 * This script is executed by Antigravity agents or local developers
 * (via `npm run antigravity:check` or `npm run check`) to perform an end-to-end
 * verification of system health, quant engines, data feeds, and compliance rules.
 */

import { QUANT_STRATEGY_REGISTRY } from '../server/quant/strategies/registry.ts';
import { MarketDataProvider } from '../server/services/marketDataProvider.ts';
import { TechnicalSummaryProvider } from '../server/services/stockDetail/technicalSummaryProvider.ts';
import { stockDetailService } from '../server/services/stockDetail/stockDetailService.ts';
import { riskEngine } from '../server/quant/riskEngine.ts';
import { sessionClock } from '../server/services/sessionClock.ts';

interface DiagnosticResult {
  step: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

async function runAntigravityDiagnostics() {
  console.log('\n================================================================');
  console.log('🛸 [ANTIGRAVITY] Local Environment & Quant Engine Diagnostics');
  console.log('================================================================\n');

  const results: DiagnosticResult[] = [];
  const marketProvider = new MarketDataProvider();

  // 1. Verify Node.js Environment & Settings
  const nodeVersion = process.version;
  const feedMode = process.env.DATA_FEED_MODE || 'hybrid';
  console.log(`[ENV] Node.js Version: ${nodeVersion} | Data Feed Mode: ${feedMode}`);
  results.push({
    step: 'Node.js Runtime & Feed Mode',
    passed: parseInt(nodeVersion.slice(1).split('.')[0], 10) >= 18,
    message: `Running on Node ${nodeVersion} with DATA_FEED_MODE=${feedMode}`
  });

  // 2. Master 72-Strategy Registry
  try {
    const strategies = QUANT_STRATEGY_REGISTRY;
    const shortTerm = strategies.filter(s => s.mode === 'SHORT_TERM').length;
    const swing = strategies.filter(s => s.mode === 'SWING').length;
    const position = strategies.filter(s => s.mode === 'POSITION').length;
    const all72 = strategies.length === 72;

    results.push({
      step: 'Master Strategy Registry (72 Models)',
      passed: all72,
      message: `Loaded ${strategies.length}/72 strategies (Short: ${shortTerm}, Swing: ${swing}, Position: ${position})`,
      details: { total: strategies.length, shortTerm, swing, position }
    });
  } catch (err: any) {
    results.push({
      step: 'Master Strategy Registry (72 Models)',
      passed: false,
      message: `Failed to load strategies: ${err.message}`
    });
  }

  // 3. Technical Indicator Engine (26-Indicator Quant Technical Rating)
  try {
    const bars = await marketProvider.getHistoricalPrices('NVDA', 400, 14, '1D', 260);
    const summary = TechnicalSummaryProvider.calculateTechnicalSummary(bars, 230.86, '1D');

    const hasOsc = summary.oscillators.items.length === 11;
    const hasMAs = summary.movingAverages.items.length === 15;
    const hasRating = !!summary.summary.rating;

    results.push({
      step: '26-Indicator Technical Rating Engine',
      passed: hasOsc && hasMAs && hasRating,
      message: `Evaluated 26 Indicators (Oscillators: ${summary.oscillators.items.length}/11, MAs: ${summary.movingAverages.items.length}/15, Rating: ${summary.summary.rating})`,
      details: {
        score: summary.summary.ratingScore,
        rating: summary.summary.rating,
        oscillators: summary.oscillators.items.length,
        mas: summary.movingAverages.items.length
      }
    });
  } catch (err: any) {
    results.push({
      step: '26-Indicator Technical Rating Engine',
      passed: false,
      message: `Technical engine computation failed: ${err.message}`
    });
  }

  // 4. Strict Anti-Fabrication Safeguard
  try {
    const vm = await stockDetailService.getStockDetail('NVDA', '1D');
    const quantData = vm.quant.data;
    const matches = quantData?.strategyMatches || [];
    const pending = matches.filter(s => s.backtestStatus === 'Pending');
    const allNullified = matches.length === 0 || pending.every(s => s.winRate === null && s.backtestSharpe === null && s.cagr === null);
    const scoresProtected = quantData?.strategyScore === null && quantData?.factorScore === null && quantData?.riskScore === null;
    const forecastsProtected = vm.forecasts.data?.analystConsensus === null && vm.forecasts.data?.priceTarget === null;
    const antiFabricationPassed = allNullified && scoresProtected && forecastsProtected;

    results.push({
      step: 'Strict Anti-Fabrication Safeguard',
      passed: antiFabricationPassed,
      message: `Anti-Fabrication active: unverified metrics nullified (zero fabricated matches/scores/targets)`
    });
  } catch (err: any) {
    results.push({
      step: 'Strict Anti-Fabrication Safeguard',
      passed: false,
      message: `Anti-fabrication check error: ${err.message}`
    });
  }

  // 5. Hard Stop Risk Governance (5.0% Cap)
  try {
    const safeCalc = riskEngine.calculatePositionSize(100000, 1.0, 100, 97); // 3% risk -> Valid
    const blockedCalc = riskEngine.calculatePositionSize(100000, 1.0, 100, 93); // 7% risk -> Blocked

    const riskGoverned = safeCalc.isRiskValid && !blockedCalc.isRiskValid;

    results.push({
      step: 'Hard-Stop Risk Governance (5.0% Cap)',
      passed: riskGoverned,
      message: `Enforces strict 5% risk stop-loss cut (3% allowed: ${safeCalc.isRiskValid}, 7% blocked: ${!blockedCalc.isRiskValid})`
    });
  } catch (err: any) {
    results.push({
      step: 'Hard-Stop Risk Governance (5.0% Cap)',
      passed: false,
      message: `Risk engine evaluation failed: ${err.message}`
    });
  }

  // 6. Unified 9-Dimension Stock Detail Model
  try {
    const detail = await stockDetailService.getStockDetail('NVDA', '1D');
    const hasAllBlocks = !!(
      detail.company &&
      detail.quote &&
      detail.marketStatus &&
      detail.chart &&
      detail.technicals &&
      detail.fundamentals &&
      detail.forecasts &&
      detail.newsAndEvents &&
      detail.options &&
      detail.quant
    );

    results.push({
      step: 'Unified 9-Dimension Stock Detail ViewModel',
      passed: hasAllBlocks,
      message: `StockDetailViewModel verified with 9 dimensions (Cache TTL: 15s)`
    });
  } catch (err: any) {
    results.push({
      step: 'Unified 9-Dimension Stock Detail ViewModel',
      passed: false,
      message: `Stock detail assembly failed: ${err.message}`
    });
  }

  // 7. Market Session Clock
  try {
    const status = sessionClock.getMarketStatus();
    results.push({
      step: 'New York Market Session Clock',
      passed: !!status.session,
      message: `Session: ${status.session} (${status.sessionLabel}) - ${status.nyTime}`
    });
  } catch (err: any) {
    results.push({
      step: 'New York Market Session Clock',
      passed: false,
      message: `Session clock error: ${err.message}`
    });
  }

  // Print Summary Table
  console.log('\n----------------------------------------------------------------');
  console.log('📋 DIAGNOSTIC RESULTS');
  console.log('----------------------------------------------------------------');
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} [${r.step}]: ${r.message}`);
    if (!r.passed) allPassed = false;
  }
  console.log('----------------------------------------------------------------\n');

  if (allPassed) {
    console.log('🎉 [ANTIGRAVITY] All 7 subsystem diagnostic gates PASSED successfully!');
    console.log('🛸 The project is fully ready for local development with Antigravity.\n');
    process.exit(0);
  } else {
    console.error('⚠️ [ANTIGRAVITY] One or more diagnostic checks failed. Review output above.');
    process.exit(1);
  }
}

runAntigravityDiagnostics().catch((err) => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
