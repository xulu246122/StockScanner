import { indicatorEngine, CORE_INDICATORS } from '../src/engine/indicatorEngine.ts';

console.log('🧪 Starting Indicator Engine (7 Core Indicators) Unit Tests...\n');

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

// 1. Verify 7 Core Indicators Existence
console.log('--- 1. Testing Core Indicators Registry Presence ---');

const expectedIds = ['rsi', 'macd', 'ema', 'sma', 'atr', 'boll', 'adx'];
const allIndicators = indicatorEngine.getAllIndicators();

assert(allIndicators.length >= 7, `Indicator engine has at least 7 core indicators (got ${allIndicators.length})`);

expectedIds.forEach(id => {
  const found = indicatorEngine.getIndicator(id);
  assert(found !== null, `Indicator "${id.toUpperCase()}" is registered in Indicator Engine`);
  
  // Verify required page dossier fields
  assert(Boolean(found?.description && found.description.length > 10), `[${id.toUpperCase()}] has comprehensive description (指标说明)`);
  assert(Boolean(found?.mathFormula && found.mathFormula.length > 5), `[${id.toUpperCase()}] has math formula (计算公式)`);
  assert(Array.isArray(found?.calculationSteps) && found.calculationSteps.length > 0, `[${id.toUpperCase()}] has step-by-step calculation logic (计算逻辑)`);
  assert(Array.isArray(found?.applicableScenarios) && found.applicableScenarios.length > 0, `[${id.toUpperCase()}] has applicable scenarios (使用场景)`);
  assert(Array.isArray(found?.riskWarnings) && found.riskWarnings.length > 0, `[${id.toUpperCase()}] has risk & invalidation warnings (风控警示)`);
  assert(Array.isArray(found?.parameters) && found.parameters.length > 0, `[${id.toUpperCase()}] has configurable parameters (参数配置)`);

  // Verify parameter ranges and defaults
  found?.parameters.forEach(param => {
    assert(param.default !== undefined, `[${id.toUpperCase()}] param "${param.id}" has default value: ${param.default}`);
    if (param.type === 'number') {
      assert(param.min !== undefined && param.max !== undefined, `[${id.toUpperCase()}] param "${param.id}" has min (${param.min}) and max (${param.max}) range`);
    }
  });
});

// 2. Testing Parameter Modification & Clamping
console.log('\n--- 2. Testing Indicator Parameter Editing & Range Clamping ---');

const rsiModified = indicatorEngine.modifyIndicatorParameters('rsi', {
  period: 21,
  oversoldThreshold: 25
});

assert(rsiModified !== null, 'modifyIndicatorParameters("rsi") successfully returns updated indicator');
const periodParam = rsiModified?.parameters.find(p => p.id === 'period');
assert(periodParam?.currentValue === 21, 'RSI period successfully updated to 21');
const oversoldParam = rsiModified?.parameters.find(p => p.id === 'oversoldThreshold');
assert(oversoldParam?.currentValue === 25, 'RSI oversoldThreshold successfully updated to 25');

// Clamping test: value above max clamped to max
const clampedRsi = indicatorEngine.modifyIndicatorParameters('rsi', {
  period: 999
});
const clampedPeriod = clampedRsi?.parameters.find(p => p.id === 'period');
assert(clampedPeriod?.currentValue === 50, 'RSI period 999 clamped to max limit 50');

// 3. Testing Reset to Default Parameters
console.log('\n--- 3. Testing Parameter Reset to Defaults ---');

const resetRsi = indicatorEngine.resetIndicatorParameters('rsi');
const resetPeriod = resetRsi?.parameters.find(p => p.id === 'period');
assert(resetPeriod?.currentValue === 14, 'RSI period successfully reset to default 14');

console.log(`\n🎉 All ${passedCount}/${totalCount} Indicator Engine tests passed successfully!`);
