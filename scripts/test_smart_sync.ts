import { universeDb } from '../server/db/universeDb.ts';
import { compileRadarRules } from '../server/routes/radarRouter.ts';
import { ConditionEngine } from '../server/quant/conditions/conditionEngine.ts';
import { indicatorCacheService } from '../server/services/indicatorCache.ts';
import { ConditionGroup, RadarPreset } from '../server/types.ts';

function getRecommendedRadarMode(profileType: string, currentMode: string): string {
  switch (profileType) {
    case 'BREAKOUT':
    case 'GAP_AND_GO':
      return 'BREAKOUT';
    case 'PULLBACK':
      return 'PULLBACK';
    case 'VOLUME_SURGE':
      return 'HIGH_REL_VOL';
    case 'EXTREME_OVERSOLD':
      return 'OVERSOLD_20';
    case 'OVERSOLD':
    case 'SHORT_TERM_1_10D':
    case 'MEAN_REVERSION':
      return currentMode.startsWith('OVERSOLD_') ? currentMode : 'OVERSOLD_30';
    default:
      // Trend, Momentum, Relative Strength, Defensive, High Liquidity: allow pure strategy factors
      return 'ALL';
  }
}

async function testSmartSyncPresets() {
  await universeDb.init();
  const presets = universeDb.getAllPresets();
  const instruments = universeDb.getAllInstruments({ activeOnly: true })
    .filter(i => !i.isIndex && !i.isETF && i.securityType !== 'OTC')
    .slice(0, 150);

  console.log('Pre-warming cache for 50 top market cap stocks...');
  for (const inst of instruments.slice(0, 50)) {
    try { await indicatorCacheService.getEvaluatedContext(inst.ticker, '1D'); } catch {}
  }

  console.log('\n================================================================================');
  console.log('🎯 SMART-SYNC AUDIT: All 15 Presets with Context-Aware Tactical Mode & No Price Cap');
  console.log('================================================================================');
  console.log('ID | 预设名称 | 推荐战术模式 | 命中数/50 | 命中股票示例');
  console.log('---|----------|--------------|-----------|-------------');

  for (const preset of presets) {
    const recommendedMode = getRecommendedRadarMode(preset.profileType, 'OVERSOLD_30');
    
    // Test with default mode
    const rules = compileRadarRules({
      presetRules: preset.rules,
      radarMode: recommendedMode,
      rsiPeriod: 14,
      minMarketCap: 1_000_000_000,
      minPrice: 10 // Only minPrice, NO maxPrice!
    });

    let hits = 0;
    const hitTickers: string[] = [];

    for (const inst of instruments.slice(0, 50)) {
      try {
        const ctx = await indicatorCacheService.getEvaluatedContext(inst.ticker, '1D');
        if (ConditionEngine.evaluateGroup(rules, ctx).passed) {
          hits++;
          hitTickers.push(inst.ticker);
        }
      } catch {}
    }

    const sample = hitTickers.slice(0, 5).join(', ') || '无匹配';
    console.log(`${preset.id.padEnd(28)} | ${preset.nameZh.slice(0, 12).padEnd(12)} | ${recommendedMode.padEnd(12)} | ${hits.toString().padStart(2)}/50 | ${sample}`);

    // If it's Short Term 1-10D or Oversold, also test relaxed mode OVERSOLD_40
    if (preset.profileType === 'SHORT_TERM_1_10D' || preset.profileType === 'OVERSOLD') {
      const relaxedRules = compileRadarRules({
        presetRules: preset.rules,
        radarMode: 'OVERSOLD_40',
        rsiPeriod: 14,
        minMarketCap: 1_000_000_000,
        minPrice: 10
      });
      let relaxedHits = 0;
      const relaxedTickers: string[] = [];
      for (const inst of instruments.slice(0, 50)) {
        try {
          const ctx = await indicatorCacheService.getEvaluatedContext(inst.ticker, '1D');
          if (ConditionEngine.evaluateGroup(relaxedRules, ctx).passed) {
            relaxedHits++;
            relaxedTickers.push(inst.ticker);
          }
        } catch {}
      }
      console.log(`   ↳ [放宽至 RSI<=40 弱势吸筹]               | OVERSOLD_40  | ${relaxedHits.toString().padStart(2)}/50 | ${relaxedTickers.slice(0, 5).join(', ')}`);
    }
  }
}

testSmartSyncPresets().catch(console.error);
