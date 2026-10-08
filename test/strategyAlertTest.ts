import { strategyAlertService } from '../server/services/strategyAlertService.ts';
import { alertEngine } from '../server/services/alertEngine.ts';
import { universeDb } from '../server/db/universeDb.ts';

console.log('🧪 Starting Phase 6 Strategy Alert Engine Unit Tests...\n');

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

async function runStrategyAlertTests() {
  await universeDb.init();
  // ==========================================================================
  // 1. Test CRUD & 4 Trigger Types for Strategy Alerts
  // ==========================================================================
  console.log('--- 1. Testing Strategy Alert 4 Trigger Types & Auto-Inference ---');

  // Type 1: Condition Trigger
  const alert1 = strategyAlertService.createAlert({
    strategy_id: 'connors_rsi2',
    strategyName: 'RSI Mean Reversion Alert',
    parameters: { rsiThreshold: 15 },
    timeframe: '1D',
    symbols: ['NVDA', 'AAPL', 'MSFT'],
    trigger_type: 'CONDITION_TRIGGER'
  });
  assert(alert1.trigger_type === 'CONDITION_TRIGGER', 'Alert 1 created with CONDITION_TRIGGER');
  assert(alert1.symbols.length === 3, 'Alert 1 monitors 3 symbols');
  assert(alert1.status === 'ACTIVE', 'Alert 1 status is ACTIVE');

  // Type 2: Breakout Trigger
  const alert2 = strategyAlertService.createAlert({
    strategy_id: 'donchian_breakout',
    strategyName: 'Donchian High Breakout Alert',
    parameters: { lookback: 20, minRvol: 1.5 },
    timeframe: '1D',
    symbols: ['PLTR', 'AVAV', 'ARM']
  });
  assert(alert2.trigger_type === 'BREAKOUT_TRIGGER', 'Alert 2 auto-inferred as BREAKOUT_TRIGGER');

  // Type 3: Trend Change
  const alert3 = strategyAlertService.createAlert({
    strategy_id: 'elder_impulse',
    strategyName: 'EMA Trend Golden Cross Alert',
    parameters: { emaPeriod: 13 },
    timeframe: '1D',
    symbols: ['TSLA', 'AMD']
  });
  assert(alert3.trigger_type === 'TREND_CHANGE', 'Alert 3 auto-inferred as TREND_CHANGE');

  // Type 4: Volume Anomaly
  const alert4 = strategyAlertService.createAlert({
    strategy_id: 'high_rvol_spike',
    strategyName: 'Institutional Volume Spike 2x Alert',
    parameters: { spikeRvol: 2.0 },
    timeframe: '1D',
    symbols: ['NVDA', 'PLTR']
  });
  assert(alert4.trigger_type === 'VOLUME_ANOMALY', 'Alert 4 auto-inferred as VOLUME_ANOMALY');

  // ==========================================================================
  // 2. Test Listing, Updating & Deleting Strategy Alerts
  // ==========================================================================
  console.log('\n--- 2. Testing List, Update & Delete Lifecycle ---');

  const allAlerts = strategyAlertService.listAlerts();
  assert(allAlerts.length >= 4, `listAlerts returns all created alerts (got ${allAlerts.length})`);

  // Update Status
  const updatedAlert = strategyAlertService.updateAlert(alert1.id, { status: 'PAUSED' });
  assert(updatedAlert?.status === 'PAUSED', 'updateAlert successfully toggled status to PAUSED');

  // Delete Alert
  const deletedOk = strategyAlertService.deleteAlert(alert4.id);
  assert(deletedOk === true, 'deleteAlert successfully removed alert4');
  const postDeleteList = strategyAlertService.listAlerts();
  assert(!postDeleteList.some(a => a.id === alert4.id), 'Deleted alert is no longer present in list');

  // ==========================================================================
  // 3. Test Periodic Evaluation Engine
  // ==========================================================================
  console.log('\n--- 3. Testing Strategy Alert Evaluation Engine ---');

  const evalResult = await strategyAlertService.evaluateAllActiveAlerts();
  assert(typeof evalResult.evaluatedCount === 'number', `evaluateAllActiveAlerts evaluated ${evalResult.evaluatedCount} active alerts`);
  assert(typeof evalResult.triggeredCount === 'number', `evaluateAllActiveAlerts produced triggeredCount: ${evalResult.triggeredCount}`);

  // ==========================================================================
  // 4. Verify Existing Stock Alert Functionality is Intact
  // ==========================================================================
  console.log('\n--- 4. Verify Existing Single Stock Alerts Unbroken ---');

  const existingAlerts = alertEngine.getAlerts();
  assert(Array.isArray(existingAlerts), 'Existing alertEngine.getAlerts() returns array');

  console.log(`\n🎉 All ${passedCount}/${totalCount} Strategy Alert Engine tests passed successfully!`);
}

runStrategyAlertTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
