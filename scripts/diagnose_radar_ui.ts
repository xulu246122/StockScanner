import { universeDb } from '../server/db/universeDb.ts';
import { compileRadarRules } from '../server/routes/radarRouter.ts';
import { ConditionEngine } from '../server/quant/conditions/conditionEngine.ts';
import { indicatorCacheService } from '../server/services/indicatorCache.ts';

async function diagnoseRadarZeroMatches() {
  await universeDb.init();

  // Test Case 1: The exact request that Frontend sends when user selects "preset_short_term_1_10d"
  const shortTermPreset = universeDb.getPresetById('preset_short_term_1_10d')!;
  console.log('Preset Short Term 1-10D rules:');
  console.log(JSON.stringify(shortTermPreset.rules, null, 2));

  // Scenario A: Exactly as User Screen shows (with priceFilter '10_50', minCap '1B', radarMode 'OVERSOLD_30')
  console.log('\n--- SCENARIO A: EXACT USER UI PARAMS (with price 10-50, cap 1B, mode OVERSOLD_30) ---');
  const compiledRulesA = compileRadarRules({
    presetRules: shortTermPreset.rules,
    radarMode: 'OVERSOLD_30',
    rsiPeriod: 14,
    minMarketCap: 1_000_000_000,
    minPrice: 10,
    maxPrice: 50
  });

  console.log('Compiled Rules A children:');
  compiledRulesA.children.forEach((c: any) => console.log(`  • [${c.id}] ${c.indicatorId} ${c.operator} ${JSON.stringify(c.value)} (${c.label})`));

  // Scenario B: With priceFilter 'ALL' (no maxPrice) and radarMode 'OVERSOLD_30'
  console.log('\n--- SCENARIO B: WITHOUT 50 CAP (priceFilter ALL, mode OVERSOLD_30) ---');
  const compiledRulesB = compileRadarRules({
    presetRules: shortTermPreset.rules,
    radarMode: 'OVERSOLD_30',
    rsiPeriod: 14,
    minMarketCap: 1_000_000_000
  });
  compiledRulesB.children.forEach((c: any) => console.log(`  • [${c.id}] ${c.indicatorId} ${c.operator} ${JSON.stringify(c.value)} (${c.label})`));

  // Scenario C: With radarMode 'OVERSOLD_40' (user relaxed to RSI <= 40)
  console.log('\n--- SCENARIO C: USER RELAXED TO RSI <= 40 (with price 10-50 vs price ALL) ---');
  const compiledRulesC_with50 = compileRadarRules({
    presetRules: shortTermPreset.rules,
    radarMode: 'OVERSOLD_40',
    rsiPeriod: 14,
    minMarketCap: 1_000_000_000,
    minPrice: 10,
    maxPrice: 50
  });
  const compiledRulesC_noMax = compileRadarRules({
    presetRules: shortTermPreset.rules,
    radarMode: 'OVERSOLD_40',
    rsiPeriod: 14,
    minMarketCap: 1_000_000_000
  });

  // Evaluate across the 150 candidates in candidateTickers
  const allInstruments = universeDb.getAllInstruments({ activeOnly: true })
    .filter(i => !i.isIndex && !i.isETF && i.securityType !== 'OTC');
  const topCandidates = allInstruments.slice(0, 50);

  console.log(`\nEvaluating top ${topCandidates.length} universe stocks...`);

  async function testRuleOnStocks(name: string, rules: any) {
    let passed = 0;
    const failsByCondition = new Map<string, number>();
    const passedTickers: string[] = [];

    for (const inst of topCandidates) {
      try {
        const ctx = await indicatorCacheService.getEvaluatedContext(inst.ticker, '1D');
        const collector: any[] = [];
        const res = ConditionEngine.evaluateGroup(rules, ctx, collector);
        if (res.passed) {
          passed++;
          passedTickers.push(`${inst.ticker}($${ctx.price}, RSI=${ctx.rsiValues[14]})`);
        } else {
          collector.forEach(c => {
            if (!c.passed) {
              failsByCondition.set(c.conditionId, (failsByCondition.get(c.conditionId) || 0) + 1);
            }
          });
        }
      } catch (err: any) {
        failsByCondition.set('DATA_ERROR', (failsByCondition.get('DATA_ERROR') || 0) + 1);
      }
    }
    console.log(`\n[${name}] Matched: ${passed} / ${topCandidates.length}`);
    if (passed > 0) {
      console.log(`   Matches: ${passedTickers.join(', ')}`);
    } else {
      console.log('   Condition Failure Breakdown:');
      failsByCondition.forEach((count, cond) => {
        console.log(`     - Failed by [${cond}]: ${count} times`);
      });
    }
  }

  await testRuleOnStocks('Scenario A: Exact User UI (price 10-50, mode <=30)', compiledRulesA);
  await testRuleOnStocks('Scenario B: No Price Upper Bound (price ALL, mode <=30)', compiledRulesB);
  await testRuleOnStocks('Scenario C1: Exact User UI with RSI<=40 BUT with price 10-50', compiledRulesC_with50);
  await testRuleOnStocks('Scenario C2: RSI<=40 AND No Price Upper Bound (price ALL)', compiledRulesC_noMax);
}

diagnoseRadarZeroMatches().catch(console.error);
