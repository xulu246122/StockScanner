import { QUANT_STRATEGY_REGISTRY, getQuantStrategy } from '../server/quant/strategies/registry.ts';
import { StrategyAdapter } from '../server/quant/executor/strategyAdapter.ts';
import { ConditionEngine, EvaluatedDataContext } from '../server/quant/conditions/conditionEngine.ts';
import { indicatorCacheService } from '../server/services/indicatorCache.ts';
import { STOCK_UNIVERSE } from '../server/services/stockUniverse.ts';
import { ConditionEvaluationResult, ConditionGroup } from '../server/types.ts';

interface StrategyLiveAuditReport {
  id: string;
  name: string;
  mode: string;
  category: string;
  timeframe: string;
  leafConditionsCount: number;
  conditionDetails: Array<{
    indicatorId: string;
    operator: string;
    expectedValue: any;
    passRate: string;
  }>;
  totalCandidates: number;
  fullTriggers: number;
  nearTriggers: number;
  highConfluence: number;
  totalMatches: number;
  recallPercent: string;
  executionTimeMs: number;
  matchedTickers: string[];
}

async function run72StrategiesLiveAudit() {
  console.log('================================================================================');
  console.log('🚀 [QUANT AUDIT] 72-Strategy Master Engine Live Market Scan & Benchmark');
  console.log('================================================================================\n');

  // 1. Select representative real stocks across different sectors & volatility profiles
  const sampleUniverse = [
    'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD',
    'AVGO', 'PLTR', 'UBER', 'COIN', 'LLY', 'UNH', 'JPM', 'XOM',
    'BAC', 'JNJ', 'MRK', 'PFE'
  ];

  console.log(`📡 Step 1: Pre-warming real market data & indicators for ${sampleUniverse.length} diverse tickers...`);
  const tickerContexts: Map<string, EvaluatedDataContext> = new Map();

  const loadStart = performance.now();
  for (const ticker of sampleUniverse) {
    try {
      const ctx = await indicatorCacheService.getEvaluatedContext(ticker, '1D');
      tickerContexts.set(ticker, ctx);
      console.log(`  ✓ [${ticker}] Price: $${ctx.price} | RSI14: ${ctx.rsiValues[14]} | RVOL: ${ctx.rvol}x | ATR%: ${ctx.atrPercent}%`);
    } catch (err: any) {
      console.warn(`  ⚠️ Failed to pre-load ${ticker}: ${err.message}`);
    }
  }
  const loadElapsed = Math.round(performance.now() - loadStart);
  console.log(`\n✅ Pre-warming complete: ${tickerContexts.size}/${sampleUniverse.length} live stocks loaded in ${loadElapsed}ms.\n`);

  if (tickerContexts.size === 0) {
    console.error('❌ Cannot proceed: No market data contexts available.');
    process.exit(1);
  }

  // 2. Iterate through all 72 strategies and audit live AST execution
  console.log(`🔬 Step 2: Running AST Screen & Diagnostics across all ${QUANT_STRATEGY_REGISTRY.length} strategies...\n`);

  const reports: StrategyLiveAuditReport[] = [];
  const totalAuditStart = performance.now();

  for (const rawStrategy of QUANT_STRATEGY_REGISTRY) {
    const t0 = performance.now();
    const adapted = StrategyAdapter.adapt(rawStrategy, {
      timeframe: rawStrategy.defaultTimeframes?.[0] || '1D'
    });

    const rules = adapted.strategy.rules as ConditionGroup;
    let fullTriggers = 0;
    let nearTriggers = 0;
    let highConfluence = 0;
    const matchedTickers: string[] = [];

    // Track pass statistics for individual leaf conditions across all stocks
    const conditionStats = new Map<number, { conditionId: string; label: string; passes: number; total: number; target: any }>();

    for (const [ticker, ctx] of tickerContexts.entries()) {
      const resultsCollector: ConditionEvaluationResult[] = [];
      const evalResult = ConditionEngine.evaluateGroup(rules, ctx, resultsCollector);

      const totalConds = resultsCollector.length;
      const passedConds = resultsCollector.filter(r => r.passed).length;

      // Update per-condition stats
      resultsCollector.forEach((res, idx) => {
        if (!conditionStats.has(idx)) {
          conditionStats.set(idx, {
            conditionId: res.conditionId,
            label: res.label,
            target: res.targetValue,
            passes: 0,
            total: 0
          });
        }
        const stat = conditionStats.get(idx)!;
        stat.total += 1;
        if (res.passed) stat.passes += 1;
      });

      const isFull = evalResult.passed;
      const isNear = !isFull && totalConds >= 3 && passedConds >= totalConds - 1;
      const isHighConf = !isFull && totalConds >= 2 && (passedConds / totalConds) >= 0.66;

      if (isFull) {
        fullTriggers++;
        matchedTickers.push(`${ticker}(100%)`);
      } else if (isNear) {
        nearTriggers++;
        matchedTickers.push(`${ticker}(Near)`);
      } else if (isHighConf) {
        highConfluence++;
        matchedTickers.push(`${ticker}(${Math.round((passedConds/totalConds)*100)}%)`);
      }
    }

    const tElapsed = performance.now() - t0;
    const totalMatches = fullTriggers + nearTriggers + highConfluence;
    const recallRate = ((totalMatches / tickerContexts.size) * 100).toFixed(1);

    const conditionDetails = Array.from(conditionStats.values()).map(s => ({
      indicatorId: s.conditionId,
      operator: '',
      expectedValue: s.target,
      passRate: `${Math.round((s.passes / s.total) * 100)}% (${s.passes}/${s.total})`
    }));

    reports.push({
      id: rawStrategy.id,
      name: rawStrategy.name,
      mode: rawStrategy.mode || 'UNKNOWN',
      category: rawStrategy.category || 'UNKNOWN',
      timeframe: adapted.timeframe || '1D',
      leafConditionsCount: conditionDetails.length,
      conditionDetails,
      totalCandidates: tickerContexts.size,
      fullTriggers,
      nearTriggers,
      highConfluence,
      totalMatches,
      recallPercent: `${recallRate}%`,
      executionTimeMs: Number(tElapsed.toFixed(2)),
      matchedTickers
    });
  }

  const totalAuditTime = performance.now() - totalAuditStart;

  // 3. Summarize and group by trading style mode
  const shortTermReports = reports.filter(r => r.mode === 'SHORT_TERM');
  const swingReports = reports.filter(r => r.mode === 'SWING');
  const positionReports = reports.filter(r => r.mode === 'POSITION');

  const printGroupSummary = (title: string, group: StrategyLiveAuditReport[]) => {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`📊 ${title} (${group.length} Models)`);
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`ID | 策略名称 | 召回数 (全触发/近触发/高共振) | 召回率 | 耗时 | 命中示例`);
    console.log(`---|----------|--------------------------------|--------|------|---------`);
    for (const r of group) {
      const matchBreakdown = `${r.totalMatches} (${r.fullTriggers}/${r.nearTriggers}/${r.highConfluence})`;
      const sample = r.matchedTickers.slice(0, 3).join(', ') || '无触发';
      console.log(`${r.id.padEnd(26)} | ${r.name.slice(0, 16).padEnd(16)} | ${matchBreakdown.padEnd(16)} | ${r.recallPercent.padStart(5)} | ${r.executionTimeMs}ms | ${sample}`);
    }
  };

  printGroupSummary('SHORT_TERM 短线模型 (1-10D)', shortTermReports);
  printGroupSummary('SWING 波段模型 (5-20D)', swingReports);
  printGroupSummary('POSITION 底仓与趋势模型 (1-12M)', positionReports);

  // 4. Overall Statistics
  const totalStrategies = reports.length;
  const strategiesWithHits = reports.filter(r => r.totalMatches > 0).length;
  const avgExecutionTime = (reports.reduce((acc, r) => acc + r.executionTimeMs, 0) / totalStrategies).toFixed(2);
  const totalMatchCount = reports.reduce((acc, r) => acc + r.totalMatches, 0);

  console.log('\n================================================================================');
  console.log('📈 [MASTER RECALL & LATENCY AUDIT SUMMARY]');
  console.log('================================================================================');
  console.log(`• 策略评估总量: ${totalStrategies} 套量化策略 (SHORT_TERM: ${shortTermReports.length}, SWING: ${swingReports.length}, POSITION: ${positionReports.length})`);
  console.log(`• 产生触发的策略数: ${strategiesWithHits} / ${totalStrategies} (${((strategiesWithHits/totalStrategies)*100).toFixed(1)}% 的策略在当前盘后行情中有至少 1 个匹配标的)`);
  console.log(`• 策略累计触发信号次: ${totalMatchCount} 次`);
  console.log(`• 平均单策略执行耗时: ${avgExecutionTime} ms`);
  console.log(`• 72 套策略全量扫描总计算耗时: ${totalAuditTime.toFixed(2)} ms (平均在真实内存上下文中仅需 ~${Math.round(totalAuditTime)}ms 完成全量评估)`);
  console.log('================================================================================\n');

  // 5. Zero-Recall Strategy Analysis (Strict Conditions requiring review)
  const zeroHits = reports.filter(r => r.totalMatches === 0);
  console.log(`🔍 [DIAGNOSTIC] 暂无触发的策略分析 (${zeroHits.length} 套):`);
  if (zeroHits.length === 0) {
    console.log('  🎉 所有 72 套策略均有触发！无死规则。');
  } else {
    for (const z of zeroHits) {
      console.log(`\n• [${z.id}] ${z.name} (${z.mode}):`);
      z.conditionDetails.forEach((c, idx) => {
        console.log(`   - 条件 ${idx+1}: [${c.indicatorId}] ${c.operator} ${JSON.stringify(c.expectedValue)} -> 通过率: ${c.passRate}`);
      });
    }
  }
}

run72StrategiesLiveAudit().catch(console.error);
