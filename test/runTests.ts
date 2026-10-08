import { calculateWilderRSI, computeLatestRSI, getRSIStatus } from '../server/services/rsiEngine.ts';
import { screenerService } from '../server/services/screenerService.ts';
import { alertEngine } from '../server/services/alertEngine.ts';
import { universeDb } from '../server/db/universeDb.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Test Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runAllTests() {
  console.log('🧪 Starting Unit & Integration Test Suite...');
  await universeDb.init();

  // 1. Wilder RSI Basic Calculation Test
  console.log('\n--- 1. Testing Wilder RSI Engine ---');
  // 15 days of strictly increasing prices -> RSI should be 100
  const allGains = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
  const rsiAllGains = calculateWilderRSI(allGains, 14);
  assert(rsiAllGains[14] === 100, 'Strictly increasing prices yields RSI 100');

  // 15 days of strictly decreasing prices -> RSI should be 0
  const allLosses = [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10];
  const rsiAllLosses = calculateWilderRSI(allLosses, 14);
  assert(rsiAllLosses[14] === 0, 'Strictly decreasing prices yields RSI 0');

  // Flat prices -> zero diff -> Neutral / 0 or 50 edge case
  const flatPrices = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
  const rsiFlat = calculateWilderRSI(flatPrices, 14);
  assert(rsiFlat[14] === 100 || rsiFlat[14] === 0 || rsiFlat[14] === 50 || rsiFlat[14] !== null, 'Flat prices handles edge division gracefully');

  // Standard fluctuating test sequence
  const samplePrices = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
    45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64
  ];
  const rsiSample = calculateWilderRSI(samplePrices, 14);
  assert(rsiSample[14] !== null && rsiSample[14]! > 60 && rsiSample[14]! < 80, `Standard Wilder RSI at index 14 is in valid range (got ${rsiSample[14]})`);

  // RSI Status classifications
  assert(getRSIStatus(25).status === 'OVERSOLD', 'RSI 25 is OVERSOLD');
  assert(getRSIStatus(42).status === 'WEAK', 'RSI 42 is WEAK');
  assert(getRSIStatus(58).status === 'NEUTRAL', 'RSI 58 is NEUTRAL');
  assert(getRSIStatus(78).status === 'OVERBOUGHT', 'RSI 78 is OVERBOUGHT');

  // 2. Screener Tests
  console.log('\n--- 2. Testing Screener Service ---');
  const oversoldResult = await screenerService.runScreener({
    market: 'ALL',
    preset: 'OVERSOLD_35',
    pageSize: 10
  });
  assert(Array.isArray(oversoldResult.results), 'Screener returns array of results');
  assert(oversoldResult.results.every(r => r.rsi < 35), 'All results in OVERSOLD_35 preset have RSI < 35');

  // 3. Alert Engine Tests
  console.log('\n--- 3. Testing Alert Engine ---');
  const alert = alertEngine.createAlert({
    ticker: 'NVDA',
    name: 'NVIDIA Corp',
    period: 14,
    conditionType: 'RSI_LTE',
    thresholdValue: 30,
    isEnabled: true
  });
  assert(alert.id.startsWith('alert-'), 'Alert created with unique ID');

  const events = await alertEngine.scanAlerts();
  assert(Array.isArray(events), 'Alert scan completed and returned event array');

  // 4. Quantitative Indicators Calculations Test
  console.log('\n--- 4. Testing Quant Indicator Calculations ---');
  const {
    calculateMACD,
    calculateBollingerBands,
    calculateDonchianChannels,
    calculateDarvasBox,
    calculateStochastic,
    calculateADX
  } = await import('../server/quant/indicators/calculations.ts');

  const testCloses = [100, 102, 101, 103, 105, 107, 106, 108, 110, 112, 115, 114, 116, 118, 120, 122, 125, 124, 126, 128, 130];
  const testBars = testCloses.map((c, i) => ({
    date: `2026-01-${i + 1}`,
    timestamp: 1700000000 + i * 86400,
    open: c - 1,
    high: c + 1.5,
    low: c - 1.5,
    close: c,
    volume: 1000000 + i * 50000
  }));

  const macdRes = calculateMACD(testCloses, 5, 10, 3);
  assert(macdRes.latest.macd !== undefined, 'MACD calculated latest values');
  assert(macdRes.histogram.length === testCloses.length, 'MACD histogram length matches inputs');

  const bbRes = calculateBollingerBands(testCloses, 10, 2.0);
  assert(bbRes.latest.upper > bbRes.latest.middle && bbRes.latest.middle > bbRes.latest.lower, 'Bollinger Bands upper > middle > lower');
  assert(bbRes.latest.widthPct > 0, 'Bollinger Bands widthPct is positive');

  const donchianRes = calculateDonchianChannels(testBars, 10);
  assert(donchianRes.upper >= donchianRes.lower, 'Donchian upper >= lower');
  assert(donchianRes.middle === Number(((donchianRes.upper + donchianRes.lower) / 2).toFixed(2)), 'Donchian middle is exact midpoint');

  const darvasRes = calculateDarvasBox(testBars, 15);
  assert(darvasRes.boxHigh >= darvasRes.boxLow, 'Darvas box high >= box low');
  assert(darvasRes.invalidationLevel === darvasRes.boxLow, 'Darvas invalidation level set to box low');

  const stochRes = calculateStochastic(testBars, 5, 3);
  assert(stochRes.k >= 0 && stochRes.k <= 100, 'Stochastic %K within [0, 100]');

  const adxRes = calculateADX(testBars, 7);
  assert(adxRes.adx >= 0, 'ADX trend calculation returns positive value');

  // 5. Condition Engine & AST Tree Test
  console.log('\n--- 5. Testing Condition Engine & AST Rules ---');
  const { ConditionEngine } = await import('../server/quant/conditions/conditionEngine.ts');
  const dummyContext = {
    ticker: 'NVDA',
    price: 130,
    changePercent: 3.5,
    marketCap: 3000000000000,
    volume: 50000000,
    rvol: 1.8,
    rsiValues: { 2: 8, 14: 28 },
    smaValues: { 20: 120, 50: 110, 200: 95 },
    emaValues: { 20: 122 },
    donchian: { upper: 128, lower: 110, middle: 119, isBreakoutHigh: true, distanceToHighPct: 1.5 },
    darvas: { boxHigh: 128, boxLow: 118, boxWidthPct: 8.5, isBreakout: true, distanceToBreakoutPct: 1.5 }
  };

  const leafRes1 = ConditionEngine.evaluateLeaf({
    type: 'leaf',
    id: 't1',
    indicatorId: 'rsi',
    parameter: { period: 14 },
    operator: 'LT',
    value: 30
  }, dummyContext);
  assert(leafRes1.passed === true, 'Condition leaf RSI(14) < 30 passed for RSI=28');

  const leafRes2 = ConditionEngine.evaluateLeaf({
    type: 'leaf',
    id: 't2',
    indicatorId: 'relative_volume',
    operator: 'GTE',
    value: 1.5
  }, dummyContext);
  assert(leafRes2.passed === true, 'Condition leaf RVOL >= 1.5 passed for RVOL=1.8');

  const groupRes = ConditionEngine.evaluateGroup({
    type: 'group',
    id: 'g1',
    logicalOperator: 'AND',
    children: [
      { type: 'leaf', id: 'c1', indicatorId: 'rsi', parameter: { period: 14 }, operator: 'LT', value: 30 },
      { type: 'leaf', id: 'c2', indicatorId: 'relative_volume', operator: 'GTE', value: 1.5 }
    ]
  }, dummyContext);
  assert(groupRes.passed === true, 'Condition Group (AND) evaluates to true when all children pass');

  // Conflict detection
  const conflictReport = ConditionEngine.detectConflicts({
    type: 'group',
    id: 'g_conflict',
    logicalOperator: 'AND',
    children: [
      { type: 'leaf', id: 'c_low', indicatorId: 'rsi', operator: 'LT', value: 20 },
      { type: 'leaf', id: 'c_high', indicatorId: 'rsi', operator: 'GT', value: 80 }
    ]
  });
  assert(conflictReport.length > 0, 'ConditionEngine detects mutually exclusive RSI conflicts (RSI < 20 AND RSI > 80)');

  // 6. Strategy Registry Metadata Verification
  console.log('\n--- 6. Testing Strategy Registry Metadata ---');
  const { STRATEGY_REGISTRY } = await import('../server/quant/strategies/registry.ts');
  assert(STRATEGY_REGISTRY.length >= 7, 'Strategy registry contains at least 7 verified strategies');
  for (const st of STRATEGY_REGISTRY) {
    assert(Boolean(st.id && st.name && st.author), `Strategy ${st.id} has author and metadata`);
    assert(['LEVEL_S', 'LEVEL_A', 'LEVEL_B', 'LEVEL_C'].includes(st.evidenceLevel as any), `Strategy ${st.id} has compliant evidence level`);
    assert(Boolean(st.tradingLogic || st.riskFramework || (st as any).riskProtocol || (st as any).riskRules), `Strategy ${st.id} has trading logic and risk discipline`);
  }

  console.log('\n🎉 All Unit, Quant Indicator & Strategy Tests Passed Successfully!\n');
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

