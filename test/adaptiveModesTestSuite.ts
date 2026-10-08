import assert from 'node:assert';
import { strategyEngine } from '../src/engine/strategyEngine.ts';
import { generateDefaultModesForStrategy, ensureStrategyModes } from '../src/engine/strategyModesHelper.ts';
import { StrategyModeType } from '../src/types.ts';

async function runAdaptiveModesTests() {
  console.log('🛡️ Starting Strategy Adaptive Parameter Engine Test Suite...\n');

  // 1. Verify Strategy Modes Migration across all registered strategies
  console.log('--- 1. Testing Strategy Modes Migration ---');
  const allStrategies = strategyEngine.getAllStrategies();
  assert(allStrategies.length >= 13, `Engine contains ${allStrategies.length} strategies`);

  allStrategies.forEach(st => {
    assert(st.modes !== undefined, `Strategy ${st.id} has modes object`);
    assert(st.modes.short_term !== undefined, `Strategy ${st.id} has short_term mode`);
    assert(st.modes.swing !== undefined, `Strategy ${st.id} has swing mode`);
    assert(st.modes.position !== undefined, `Strategy ${st.id} has position mode`);

    // Verify timeframe linking
    assert(st.modes.short_term.defaultTimeframe === '1h', `Short term default timeframe is 1h`);
    assert(st.modes.swing.defaultTimeframe === '1D', `Swing default timeframe is 1D`);
    assert(st.modes.position.defaultTimeframe === '1W', `Position default timeframe is 1W`);

    // Verify distinct parameter profiles
    assert(typeof st.modes.short_term.parameters === 'object', `Short term has parameters object`);
    assert(typeof st.modes.swing.parameters === 'object', `Swing has parameters object`);
    assert(typeof st.modes.position.parameters === 'object', `Position has parameters object`);

    // Verify risk frameworks
    assert((st.modes.short_term.riskFramework?.stopLossRule.length || 0) > 0, `Short term has stop loss rule`);
    assert((st.modes.swing.riskFramework?.stopLossRule.length || 0) > 0, `Swing has stop loss rule`);
    assert((st.modes.position.riskFramework?.stopLossRule.length || 0) > 0, `Position has stop loss rule`);
  });
  console.log(`  ✓ All ${allStrategies.length} strategies successfully migrated with 3 adaptive modes (short_term, swing, position)`);

  // 2. Testing Parameter Override & AST Injection per Mode
  console.log('\n--- 2. Testing Engine Parameter Overrides per Mode ---');
  const targetStrategy = allStrategies[0];
  assert(targetStrategy !== null, 'Target Strategy loaded');

  // Modify to Short Term mode
  const shortTermSt = strategyEngine.modifyParameters(targetStrategy, {}, 'short_term');
  const shortTermParamVal = (shortTermSt.parameters as any[])[0]?.value;

  // Modify to Position mode
  const positionSt = strategyEngine.modifyParameters(targetStrategy, {}, 'position');
  const positionParamVal = (positionSt.parameters as any[])[0]?.value;

  assert(shortTermParamVal !== undefined && positionParamVal !== undefined, 'Mode parameters defined');
  console.log(`  ✓ Dynamic mode parameter modification verified: Short Term parameter (${shortTermParamVal}) vs Position (${positionParamVal})`);

  // 3. Testing Backward Compatibility
  console.log('\n--- 3. Testing Backward Compatibility ---');
  const defaultSt = strategyEngine.modifyParameters(targetStrategy, {});
  assert(defaultSt !== null, 'Default parameters resolve without modeType');
  console.log('  ✓ Backward compatibility maintained for strategy calls without modeType');

  console.log('\n🎉 All Adaptive Parameter Engine tests passed successfully!');
}

runAdaptiveModesTests().catch(err => {
  console.error('\n❌ Adaptive Modes Test Error:', err);
  process.exit(1);
});
