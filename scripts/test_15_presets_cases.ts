import { universeDb } from '../server/db/universeDb.ts';
import { compileRadarRules } from '../server/routes/radarRouter.ts';
import { ConditionEngine } from '../server/quant/conditions/conditionEngine.ts';
import { indicatorCacheService } from '../server/services/indicatorCache.ts';

async function testAll15PresetsRealApi() {
  await universeDb.init();
  const presets = universeDb.getAllPresets();

  console.log(`Auditing all ${presets.length} presets with standard UI interactions...\n`);

  const instruments = universeDb.getAllInstruments({ activeOnly: true })
    .filter(i => !i.isIndex && !i.isETF && i.securityType !== 'OTC')
    .slice(0, 150);

  // Pre-warm indicator context for 40 stocks
  console.log('Pre-warming cache for top 40 market cap stocks...');
  for (const inst of instruments.slice(0, 40)) {
    try {
      await indicatorCacheService.getEvaluatedContext(inst.ticker, '1D');
    } catch {}
  }

  console.log('\nChecking Preset Matching under 2 cases:');
  console.log('Case 1: With current bug (priceFilter: 10_50, maxPrice=50, mode=OVERSOLD_30)');
  console.log('Case 2: Fixed (priceFilter: ALL / no maxPrice, mode=OVERSOLD_30 / OVERSOLD_40)');
  console.log('--------------------------------------------------------------------------------');

  for (const preset of presets) {
    // Case 1: The current buggy state with maxPrice=50 and OVERSOLD_30
    const rulesCase1 = compileRadarRules({
      presetRules: preset.rules,
      radarMode: 'OVERSOLD_30',
      rsiPeriod: 14,
      minMarketCap: 1_000_000_000,
      minPrice: 10,
      maxPrice: 50 // The bug!
    });

    // Case 2A: Fixed with no maxPrice, OVERSOLD_30
    const rulesCase2A = compileRadarRules({
      presetRules: preset.rules,
      radarMode: 'OVERSOLD_30',
      rsiPeriod: 14,
      minMarketCap: 1_000_000_000
    });

    // Case 2B: Fixed with no maxPrice, OVERSOLD_40
    const rulesCase2B = compileRadarRules({
      presetRules: preset.rules,
      radarMode: 'OVERSOLD_40',
      rsiPeriod: 14,
      minMarketCap: 1_000_000_000
    });

    // Evaluate on top 40 stocks
    let match1 = 0, match2A = 0, match2B = 0;
    const sample2B: string[] = [];

    for (const inst of instruments.slice(0, 40)) {
      try {
        const ctx = await indicatorCacheService.getEvaluatedContext(inst.ticker, '1D');
        if (ConditionEngine.evaluateGroup(rulesCase1, ctx).passed) match1++;
        if (ConditionEngine.evaluateGroup(rulesCase2A, ctx).passed) match2A++;
        if (ConditionEngine.evaluateGroup(rulesCase2B, ctx).passed) {
          match2B++;
          sample2B.push(inst.ticker);
        }
      } catch {}
    }

    console.log(`[${preset.nameZh}]`);
    console.log(`   Buggy (Price 10-50, <=30): ${match1} 命中`);
    console.log(`   Fixed (Price ALL,   <=30): ${match2A} 命中`);
    console.log(`   Fixed (Price ALL,   <=40): ${match2B} 命中 ${sample2B.length > 0 ? `(示例: ${sample2B.slice(0, 5).join(', ')})` : ''}`);
  }
}

testAll15PresetsRealApi().catch(console.error);
