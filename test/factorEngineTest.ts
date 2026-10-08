import { factorEngine } from '../server/quant/factors/factorEngine.ts';
import { FactorModel } from '../src/types.ts';

console.log('🧪 Starting Phase 8 Multi-Factor Quant Engine Unit Tests...\n');

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

async function runFactorTests() {
  // ==========================================================================
  // 1. Test Factor Library Registry
  // ==========================================================================
  console.log('--- 1. Testing Factor Library Registry ---');

  const library = factorEngine.getFactorLibrary();
  assert(library.length >= 10, `Factor library initialized with ${library.length} factors`);

  const momFactor = library.find(f => f.id === 'rsi_momentum');
  assert(momFactor !== undefined, 'Factor "rsi_momentum" present in library');
  assert(momFactor?.category === 'MOMENTUM', 'Category is MOMENTUM');

  const qualityFactor = library.find(f => f.id === 'quality_roe');
  assert(qualityFactor !== undefined, 'Factor "quality_roe" present in library');
  assert(qualityFactor?.category === 'QUALITY', 'Category is QUALITY');

  // ==========================================================================
  // 2. Test Normalization Function
  // ==========================================================================
  console.log('\n--- 2. Testing Factor Normalization ---');

  if (momFactor) {
    const score50 = factorEngine.normalizeFactorValue(momFactor, 50);
    assert(score50 === 50, `RSI 50 normalized to ${score50}/100`);

    const scoreMax = factorEngine.normalizeFactorValue(momFactor, 100);
    assert(scoreMax === 100, `RSI 100 normalized to ${scoreMax}/100`);
  }

  const debtFactor = library.find(f => f.id === 'debt_to_equity');
  if (debtFactor) {
    // debt_to_equity: lower is better
    const scoreLowDebt = factorEngine.normalizeFactorValue(debtFactor, 0.1);
    const scoreHighDebt = factorEngine.normalizeFactorValue(debtFactor, 5.0);
    assert(scoreLowDebt > scoreHighDebt, `Low debt (0.1 -> ${scoreLowDebt}) scores higher than high debt (5.0 -> ${scoreHighDebt})`);
  }

  // ==========================================================================
  // 3. Test Factor Model Weighted Evaluation
  // ==========================================================================
  console.log('\n--- 3. Testing Weighted Sum Factor Model Evaluation ---');

  const models = factorEngine.getFactorModels();
  assert(models.length >= 3, `Preset factor models loaded (${models.length} models)`);

  const balancedModel = models[0];
  const evalResult = await factorEngine.evaluateFactorModel(balancedModel, '1D', 20);

  assert(evalResult.scores.length > 0, `Evaluation returned ${evalResult.scores.length} stock factor scores`);

  const topStock = evalResult.scores[0];
  assert(topStock.rank === 1, 'Top stock assigned Rank #1');
  assert(typeof topStock.compositeScore === 'number' && topStock.compositeScore >= 0 && topStock.compositeScore <= 100, `Composite score is valid (${topStock.compositeScore})`);
  assert(topStock.signalStrength >= 1 && topStock.signalStrength <= 5, `Signal strength is ${topStock.signalStrength} stars`);
  assert(typeof topStock.factorBreakdown === 'object', 'Factor breakdown object present');

  // ==========================================================================
  // 4. Test Logical AND / OR Factor Models
  // ==========================================================================
  console.log('\n--- 4. Testing Logical AND Gate Combination Mode ---');

  const andModel: FactorModel = {
    id: 'test_and_model',
    name: 'Test AND Gate Model',
    description: 'Strict AND gate test',
    combinationMode: 'LOGICAL_AND',
    factors: [
      { factorId: 'rsi_momentum', weight: 0.5, minThreshold: 40 },
      { factorId: 'ema_alignment', weight: 0.5, minThreshold: 60 }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const andResult = await factorEngine.evaluateFactorModel(andModel, '1D', 10);
  assert(andResult.scores.length > 0, 'Logical AND model evaluation executed successfully');

  // ==========================================================================
  // 5. Test CRUD for Custom Factor Models
  // ==========================================================================
  console.log('\n--- 5. Testing Save and Delete Custom Factor Model ---');

  const saved = factorEngine.saveFactorModel({
    name: '我的自建 40/40/20 动量趋势模型',
    description: 'User custom multi-factor model',
    combinationMode: 'WEIGHTED_SUM',
    factors: [
      { factorId: 'rsi_momentum', weight: 0.4 },
      { factorId: 'ema_alignment', weight: 0.4 },
      { factorId: 'volatility_compression', weight: 0.2 }
    ]
  });

  assert(typeof saved.id === 'string', `Custom factor model saved with ID (${saved.id})`);
  assert(factorEngine.getFactorModel(saved.id) !== undefined, 'Saved model retrievable from engine');

  const deleted = factorEngine.deleteFactorModel(saved.id);
  assert(deleted === true, 'Custom factor model successfully deleted');

  console.log(`\n🎉 All ${passedCount}/${totalCount} Multi-Factor Engine tests passed successfully!`);
}

runFactorTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
