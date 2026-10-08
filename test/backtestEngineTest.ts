import { backtestEngine } from '../server/services/backtestEngine.ts';
import { BacktestConfig } from '../src/types.ts';

console.log('🧪 Starting Phase 7 Strategy Backtest Engine Unit Tests...\n');

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

async function runBacktestTests() {
  // ==========================================================================
  // 1. Run Backtest with Simulation Configuration
  // ==========================================================================
  console.log('--- 1. Testing Backtest Engine Execution ---');

  const config: BacktestConfig = {
    strategyId: 'connors_rsi2',
    strategyName: 'RSI(2) Mean Reversion Backtest',
    parameters: { rsiThreshold: 12 },
    timeframe: '1D',
    range: '1Y',
    symbols: ['NVDA', 'AAPL', 'MSFT', 'PLTR', 'AMD'],
    initialCapital: 100000,
    commission: 0.0005, // 0.05%
    slippage: 0.0005    // 0.05%
  };

  const result = await backtestEngine.runBacktest(config);

  assert(result !== null && typeof result === 'object', 'Backtest executed and returned result object');
  assert(typeof result.id === 'string' && result.id.startsWith('btr_'), `Result ID generated (${result.id})`);
  assert(typeof result.jobId === 'string' && result.jobId.startsWith('job_'), `Job ID generated (${result.jobId})`);
  assert(result.strategyId === 'connors_rsi2', 'Strategy ID correctly matched');

  // ==========================================================================
  // 2. Verify 6 Core Performance Metrics
  // ==========================================================================
  console.log('\n--- 2. Testing 6 Core Performance Metrics ---');

  const perf = result.performance;
  assert(typeof perf.totalReturn === 'number', `1. Total Return: ${perf.totalReturn}%`);
  assert(typeof perf.annualReturn === 'number', `2. Annual Return (CAGR): ${perf.annualReturn}%`);
  assert(typeof perf.winRate === 'number' && perf.winRate >= 0 && perf.winRate <= 100, `3. Win Rate: ${perf.winRate}%`);
  assert(typeof perf.maxDrawdown === 'number' && perf.maxDrawdown <= 0, `4. Max Drawdown: ${perf.maxDrawdown}%`);
  assert(typeof perf.sharpeRatio === 'number', `5. Sharpe Ratio: ${perf.sharpeRatio}`);
  assert(typeof perf.profitFactor === 'number' && perf.profitFactor > 0, `6. Profit Factor: ${perf.profitFactor}`);
  assert(typeof perf.benchmarkReturn === 'number', `Benchmark Return (SPY): ${perf.benchmarkReturn}%`);

  // ==========================================================================
  // 3. Verify Trade Statistics
  // ==========================================================================
  console.log('\n--- 3. Testing Trade Statistics ---');

  const stats = result.statistics;
  assert(typeof stats.totalTrades === 'number' && stats.totalTrades > 0, `Total Trades: ${stats.totalTrades}`);
  assert(typeof stats.avgWin === 'number' && stats.avgWin >= 0, `Avg Win: $${stats.avgWin}`);
  assert(typeof stats.avgLoss === 'number' && stats.avgLoss >= 0, `Avg Loss: $${stats.avgLoss}`);
  assert(typeof stats.maxConsecutiveWins === 'number' && stats.maxConsecutiveWins >= 1, `Max Consecutive Wins: ${stats.maxConsecutiveWins}`);
  assert(typeof stats.maxConsecutiveLosses === 'number' && stats.maxConsecutiveLosses >= 1, `Max Consecutive Losses: ${stats.maxConsecutiveLosses}`);

  // ==========================================================================
  // 4. Verify Equity Curve & Drawdown Series
  // ==========================================================================
  console.log('\n--- 4. Testing Equity Curve & Drawdown Series ---');

  assert(Array.isArray(result.equityCurve) && result.equityCurve.length > 50, `Equity curve points generated (${result.equityCurve.length} points)`);
  const firstPt = result.equityCurve[0];
  const lastPt = result.equityCurve[result.equityCurve.length - 1];

  assert(typeof firstPt.equity === 'number' && firstPt.equity > 0, 'First equity point is valid');
  assert(typeof lastPt.benchmarkEquity === 'number', 'Benchmark equity tracked across time series');
  assert(typeof lastPt.drawdown === 'number' && lastPt.drawdown <= 0, 'Drawdown calculated across time series');

  // ==========================================================================
  // 5. Verify Trade History
  // ==========================================================================
  console.log('\n--- 5. Testing Trade History Structure ---');

  assert(Array.isArray(result.trades) && result.trades.length > 0, `Trades array populated (${result.trades.length} trades)`);
  const sampleTrade = result.trades[0];
  assert(typeof sampleTrade.symbol === 'string', `Trade Symbol: ${sampleTrade.symbol}`);
  assert(sampleTrade.side === 'LONG' || sampleTrade.side === 'SHORT', `Trade Side: ${sampleTrade.side}`);
  assert(typeof sampleTrade.entryPrice === 'number' && sampleTrade.entryPrice > 0, `Entry Price: $${sampleTrade.entryPrice}`);
  assert(typeof sampleTrade.exitPrice === 'number' && sampleTrade.exitPrice > 0, `Exit Price: $${sampleTrade.exitPrice}`);
  assert(typeof sampleTrade.pnl === 'number', `PnL ($): $${sampleTrade.pnl}`);
  assert(typeof sampleTrade.pnlPercent === 'number', `PnL (%): ${sampleTrade.pnlPercent}%`);
  assert(typeof sampleTrade.exitReason === 'string', `Exit Reason: ${sampleTrade.exitReason}`);

  // ==========================================================================
  // 6. Test History Listing & Retrieval API
  // ==========================================================================
  console.log('\n--- 6. Testing Persistence & Query API ---');

  const fetched = backtestEngine.getResult(result.id);
  assert(fetched !== null && fetched.id === result.id, 'getResult(id) successfully retrieves saved backtest result');

  const history = backtestEngine.listResultsForStrategy('connors_rsi2');
  assert(history.length >= 1, `listResultsForStrategy returns backtests (${history.length} found)`);

  console.log(`\n🎉 All ${passedCount}/${totalCount} Backtest Engine tests passed successfully!`);
}

runBacktestTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
