import { SYSTEM_RADAR_PRESETS } from '../server/quant/filters/defaultPresets.ts';
import { ConditionEngine, EvaluatedDataContext } from '../server/quant/conditions/conditionEngine.ts';
import { indicatorCacheService } from '../server/services/indicatorCache.ts';
import { STOCK_UNIVERSE } from '../server/services/stockUniverse.ts';
import { ConditionEvaluationResult, ConditionGroup } from '../server/types.ts';

async function runRadarPresetsAudit() {
  console.log('================================================================================');
  console.log('📡 [RADAR PRESETS AUDIT] System Presets Validation in Real Market Context');
  console.log('================================================================================\n');

  // Load diverse sample universe
  const sampleTickers = [
    'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD',
    'AVGO', 'PLTR', 'UBER', 'COIN', 'LLY', 'UNH', 'JPM', 'XOM',
    'BAC', 'JNJ', 'MRK', 'PFE', 'ABBV', 'MRNA'
  ];

  console.log(`📡 Pre-warming market data for ${sampleTickers.length} real tickers...`);
  const contexts: Map<string, EvaluatedDataContext> = new Map();
  for (const t of sampleTickers) {
    try {
      const ctx = await indicatorCacheService.getEvaluatedContext(t, '1D');
      contexts.set(t, ctx);
    } catch (e: any) {
      console.warn(`  Failed ${t}: ${e.message}`);
    }
  }

  console.log(`✅ Loaded ${contexts.size} tickers into evaluation context.\n`);

  console.log('ID | 预设名称 | 命中数 | 命中率 | 耗时 | 命中股票');
  console.log('---|----------|--------|--------|------|---------');

  for (const preset of SYSTEM_RADAR_PRESETS) {
    const t0 = performance.now();
    const rules = preset.rules as ConditionGroup;

    let hits = 0;
    const hitTickers: string[] = [];
    const conditionStats = new Map<string, { label: string; pass: number; total: number }>();

    for (const [ticker, ctx] of contexts.entries()) {
      const results: ConditionEvaluationResult[] = [];
      const evalRes = ConditionEngine.evaluateGroup(rules, ctx, results);

      results.forEach(r => {
        if (!conditionStats.has(r.conditionId)) {
          conditionStats.set(r.conditionId, { label: r.label, pass: 0, total: 0 });
        }
        const s = conditionStats.get(r.conditionId)!;
        s.total += 1;
        if (r.passed) s.pass += 1;
      });

      if (evalRes.passed) {
        hits++;
        hitTickers.push(ticker);
      }
    }

    const elapsed = (performance.now() - t0).toFixed(2);
    const hitRate = `${((hits / contexts.size) * 100).toFixed(1)}%`;
    const tickerSample = hitTickers.slice(0, 4).join(', ') || '无触发 (0 命中)';

    console.log(`${preset.id.padEnd(30)} | ${preset.nameZh.slice(0, 14).padEnd(14)} | ${hits.toString().padStart(2)}/${contexts.size} | ${hitRate.padStart(5)} | ${elapsed}ms | ${tickerSample}`);

    if (hits === 0) {
      console.log(`   ⚠️ [0 命中瓶颈分析] 条件逐项通过率:`);
      conditionStats.forEach((st, cid) => {
        const rate = Math.round((st.pass / st.total) * 100);
        console.log(`      • ${cid} [${st.label}]: ${rate}% (${st.pass}/${st.total})`);
      });
    }
  }
}

runRadarPresetsAudit().catch(console.error);
