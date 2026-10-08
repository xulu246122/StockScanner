import { strategyEngine, validateStrategySchema } from '../src/engine/strategyEngine.ts';

console.log('🧪 Starting Strategy Engine & JSON Schema Unit Tests...\n');

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

// ==========================================
// 1. JSON Schema Validation Tests
// ==========================================
console.log('--- 1. Testing Strategy JSON Schema Validator ---');

const validStrategy = {
  name: 'Test Momentum Squeeze',
  author: 'Quant Tester',
  category: 'CLASSIC' as const,
  timeframe: '1D',
  rules: {
    type: 'group' as const,
    id: 'test_root',
    logicalOperator: 'AND' as const,
    children: [
      {
        type: 'leaf' as const,
        id: 'c1',
        indicatorId: 'rsi',
        operator: 'LT' as const,
        value: 30
      }
    ]
  },
  parameters: [
    {
      id: 'rsiThreshold',
      name: 'RSI 阈值',
      type: 'number' as const,
      default: 30,
      description: '超卖阈值'
    }
  ],
  risk: {
    entryReference: 'RSI < 30',
    invalidation: 'RSI < 20 continuous breakdown',
    stopLossRule: 'Max 4.0% loss'
  }
};

const resValid = validateStrategySchema(validStrategy);
assert(resValid.valid === true, 'Valid strategy object passes JSON schema validation');
assert(resValid.errors.length === 0, 'Valid strategy produces 0 errors');

// Missing required fields
const invalidMissingName = { ...validStrategy, name: '' };
const resMissingName = validateStrategySchema(invalidMissingName);
assert(resMissingName.valid === false, 'Detects empty name in schema');

const invalidMissingAuthor = { ...validStrategy, author: '' };
const resMissingAuthor = validateStrategySchema(invalidMissingAuthor);
assert(resMissingAuthor.valid === false, 'Detects empty author in schema');

const invalidCategory = { ...validStrategy, category: 'INVALID_CATEGORY' as any };
const resInvalidCategory = validateStrategySchema(invalidCategory);
assert(resInvalidCategory.valid === false, 'Detects invalid category in schema');

const invalidMissingRules = { ...validStrategy, rules: null as any };
const resMissingRules = validateStrategySchema(invalidMissingRules);
assert(resMissingRules.valid === false, 'Detects missing AST rules in schema');

const invalidMissingRisk = { ...validStrategy, risk: null as any };
const resMissingRisk = validateStrategySchema(invalidMissingRisk);
assert(resMissingRisk.valid === false, 'Detects missing risk definition in schema');

// ==========================================
// 2. Strategy Loading Tests
// ==========================================
console.log('\n--- 2. Testing Strategy Engine: Loading ---');

const donchian = strategyEngine.loadStrategy('donchian_breakout');
assert(donchian !== null, 'loadStrategy("donchian_breakout") successfully returns strategy');
assert(donchian?.name === 'Donchian Channel 20-Day Breakout', 'Loaded strategy has correct name');
assert(donchian?.author === 'Richard Donchian', 'Loaded strategy has correct author');
assert(donchian?.category === 'CLASSIC', 'Loaded strategy has correct category');

const allStrategies = strategyEngine.getAllStrategies();
assert(allStrategies.length >= 7, `getAllStrategies returns at least 7 strategies (got ${allStrategies.length})`);

// ==========================================
// 3. Parameter Modification Tests
// ==========================================
console.log('\n--- 3. Testing Strategy Engine: Parameter Modification ---');

if (donchian) {
  const modified = strategyEngine.modifyParameters(donchian, {
    lookback: 55,
    minRvol: 2.5
  });

  const rvolLeaf = modified.rules.children.find((c: any) => c.indicatorId === 'relative_volume');
  assert(rvolLeaf !== undefined && (rvolLeaf as any).value === 2.5, 'modifyParameters correctly updates AST condition leaf value to 2.5');
}

// ==========================================
// 4. Strategy Saving Tests
// ==========================================
console.log('\n--- 4. Testing Strategy Engine: Saving Custom Strategy ---');

const saveResult = strategyEngine.saveStrategy({
  name: 'My Custom Turtle Strategy',
  author: 'Alice Trader',
  category: 'CLASSIC',
  timeframe: '1D',
  rules: {
    type: 'group',
    id: 'custom_turtle_root',
    logicalOperator: 'AND',
    children: [
      {
        type: 'leaf',
        id: 'leaf_1',
        indicatorId: 'donchian_high_break',
        operator: 'EQ',
        value: true
      }
    ]
  },
  parameters: [
    {
      id: 'lookback',
      name: '突破观察周期',
      type: 'number',
      default: 30,
      description: '自定义突破观察周期'
    }
  ],
  risk: {
    entryReference: '30-day breakout',
    invalidation: 'Fall below 30-day midpoint',
    stopLossRule: 'Max 3.5% stop loss'
  }
});

assert(saveResult.success === true, 'saveStrategy successfully saves compliant strategy');
assert(saveResult.saved !== undefined, 'saveStrategy returns saved Strategy instance');

if (saveResult.saved) {
  const reloaded = strategyEngine.loadStrategy(saveResult.saved.id);
  assert(reloaded !== null, 'Custom strategy can be immediately re-loaded by ID');
  assert(reloaded?.name === 'My Custom Turtle Strategy', 'Reloaded custom strategy has identical name');
}

console.log(`\n🎉 All ${passedCount}/${totalCount} Strategy Engine & JSON Schema tests passed successfully!`);
