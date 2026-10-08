import { universeDb } from '../server/db/universeDb.ts';
import { compileRadarRules } from '../server/routes/radarRouter.ts';
import { ConditionEngine } from '../server/quant/conditions/conditionEngine.ts';
import { indicatorCacheService } from '../server/services/indicatorCache.ts';
import { getRecommendedRadarMode } from '../src/views/RadarScannerView.tsx';

async function verifyRadarViewE2E() {
  await universeDb.init();
  const presets = universeDb.getAllPresets();
  const allInstruments = universeDb.getAllInstruments({ activeOnly: true })
    .filter(i => !i.isIndex && !i.isETF && i.securityType !== 'OTC');

  console.log('Pre-warming cache for 60 universe assets...');
  for (const inst of allInstruments.slice(0, 60)) {
    try { await indicatorCacheService.getEvaluatedContext(inst.ticker, '1D'); } catch {}
  }

  console.log('\n========================================================================================');
  console.log('🚀 RADAR SCANNED VIEW E2E VERIFICATION (Simulating New Frontend Parameters)');
  console.log('========================================================================================');
  console.log('预设ID | 策略名称 | 推荐战术模式 | 召回标的数/60 | 命中股票');
  console.log('-------|----------|--------------|---------------|---------');

  for (const preset of presets) {
    const recommendedMode = getRecommendedRadarMode(preset.profileType, 'OVERSOLD_30');

    // Frontend now sends priceFilter: 'ALL' (no maxPrice)
    const compiled = compileRadarRules({
      presetRules: preset.rules,
      radarMode: recommendedMode,
      rsiPeriod: 14,
      minMarketCap: 1_000_000_000
      // minPrice handled by preset rules, NO maxPrice!
    });

    let hits = 0;
    const hitTickers: string[] = [];

    for (const inst of allInstruments.slice(0, 60)) {
      try {
        const ctx = await indicatorCacheService.getEvaluatedContext(inst.ticker, '1D');
        const evalRes = ConditionEngine.evaluateGroup(compiled, ctx);
        if (evalRes.passed) {
          hits++;
          hitTickers.push(inst.ticker);
        }
      } catch {}
    }

    console.log(`${preset.id.padEnd(28)} | ${preset.nameZh.slice(0, 10).padEnd(10)} | ${recommendedMode.padEnd(12)} | ${hits.toString().padStart(2)}/60 | ${hitTickers.slice(0, 6).join(', ') || '(极值空)'}`);

    // If preset is short-term setup or oversold, also test user clicking RSI <= 40
    if (preset.id === 'preset_short_term_1_10d') {
      const relaxedRules = compileRadarRules({
        presetRules: preset.rules,
        radarMode: 'OVERSOLD_40',
        rsiPeriod: 14,
        minMarketCap: 1_000_000_000
      });

      let relaxedHits = 0;
      const relaxedTickers: string[] = [];
      for (const inst of allInstruments.slice(0, 60)) {
        try {
          const ctx = await indicatorCacheService.getEvaluatedContext(inst.ticker, '1D');
          if (ConditionEngine.evaluateGroup(relaxedRules, ctx).passed) {
            relaxedHits++;
            relaxedTickers.push(inst.ticker);
          }
        } catch {}
      }
      console.log(`   ↳ [用户切换至 RSI≤40 弱势吸筹]      | OVERSOLD_40  | ${relaxedHits.toString().padStart(2)}/60 | ${relaxedTickers.slice(0, 8).join(', ')}`);
    }
  }

  console.log('========================================================================================\n');
}

verifyRadarViewE2E().catch(console.error);
