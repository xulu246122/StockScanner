import { strategyEngine } from '../src/engine/strategyEngine.ts';
import { MOCK_QUANT_INDICATORS } from '../src/mock/quantStrategiesMock.ts';
import { backtestEngine } from '../server/services/backtestEngine.ts';
import { factorEngine } from '../server/quant/factors/factorEngine.ts';
import { metricsService } from '../server/services/metrics.ts';

console.log('🛡️ Starting Phase 10 Production Readiness & Hardening Test Suite...\n');

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string) {
  totalCount++;
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exit(1);
  }
}

async function runProductionTests() {
  // ==========================================================================
  // 1. Architecture Modularity Audit (Strategy & Indicator Engine)
  // ==========================================================================
  console.log('--- 1. Testing Engine Modularity & Extensibility ---');

  const allStrategies = strategyEngine.getAllStrategies();
  assert(allStrategies.length >= 13, `Strategy engine registered ${allStrategies.length} modular strategies`);

  // Verify custom strategy registration without hardcoding
  const res = strategyEngine.saveStrategy({
    id: `prod_dyn_${Date.now()}`,
    name: 'Production Dynamic Momentum Strategy',
    description: 'Dynamic strategy for production testing',
    rules: {
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: [
        { type: 'leaf', id: 'leaf_1', indicatorId: 'rsi', operator: 'LTE', value: 35 }
      ]
    },
    parameters: [{ id: 'period', name: 'Period', type: 'number', default: 14, description: 'Period' }],
    timeframe: '1D',
    author: 'Quant Team',
    category: 'TECHNICAL'
  });

  assert(res.success && res.saved !== undefined && typeof res.saved.id === 'string', 'Strategy Engine dynamically saved new custom strategy');

  // Verify Indicator Engine extensibility
  assert(MOCK_QUANT_INDICATORS.length >= 4, `Indicator engine contains ${MOCK_QUANT_INDICATORS.length} core indicators`);
  const rsiInd = MOCK_QUANT_INDICATORS.find(i => i.id === 'rsi');
  assert(rsiInd !== undefined && !!rsiInd.mathFormula, 'RSI indicator has complete math formula specification');

  // ==========================================================================
  // 2. Asynchronous Backtest Engine Job Queue
  // ==========================================================================
  console.log('\n--- 2. Testing Asynchronous Backtest Job Queue ---');

  const backtestResult = await backtestEngine.runBacktest({
    strategyId: 'rsi_2_mean_reversion',
    symbols: ['AAPL', 'MSFT', 'NVDA', 'GOOGL'],
    timeframe: '1D',
    range: '1Y',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialCapital: 100000,
    commission: 0.001,
    slippage: 0.001,
    parameters: { oversoldThreshold: 20 }
  });

  assert(typeof backtestResult.jobId === 'string' && backtestResult.jobId.startsWith('job_'), `Backtest created async job (${backtestResult.jobId})`);
  assert(typeof backtestResult.id === 'string' && backtestResult.id.startsWith('btr_'), `Backtest report persisted (${backtestResult.id})`);
  assert(backtestResult.performance.totalReturn !== undefined, `Performance metrics computed (Total Return: ${backtestResult.performance.totalReturn}%)`);

  // ==========================================================================
  // 3. Multi-Factor Quant Engine Batch & Parallel Evaluation
  // ==========================================================================
  console.log('\n--- 3. Testing Multi-Factor Universe Batch Evaluation ---');

  const models = factorEngine.getFactorModels();
  assert(models.length > 0, 'Factor models available');

  const factorEval = await factorEngine.evaluateFactorModel(models[0], '1D', 30);
  assert(factorEval.scores.length > 0, `Multi-factor universe evaluation returned ${factorEval.scores.length} ranked stocks`);
  assert(factorEval.scores[0].rank === 1, 'Universe ranking correctly assigned #1');

  // ==========================================================================
  // 4. Production Metrics & Health Monitoring
  // ==========================================================================
  console.log('\n--- 4. Testing System Metrics & Health Endpoint ---');

  metricsService.recordRequest(12.5, false);
  metricsService.recordCacheHit();

  const metrics = metricsService.getMetricsSummary();
  assert(metrics.status === 'UP', 'Health status is UP');
  assert(metrics.requests.total > 0, `Request metrics recorded (Total: ${metrics.requests.total})`);
  assert(metrics.cache.hitRatioPercent >= 0, `Cache hit ratio calculated (${metrics.cache.hitRatioPercent}%)`);

  console.log(`\n🎉 All ${passedCount}/${totalCount} Production Readiness & Hardening tests passed!`);
}

runProductionTests().catch(err => {
  console.error('Production Test Error:', err);
  process.exit(1);
});
