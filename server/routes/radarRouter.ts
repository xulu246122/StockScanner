import { Router, Request, Response } from 'express';
import {
  ConditionGroup,
  RadarPreset,
  RankingWeights,
  Timeframe,
  ScreenerResultItem,
  ScreenerResponse
} from '../types.ts';
import { FILTER_CATEGORIES, getAllFilterDefinitions } from '../quant/filters/filterRegistry.ts';
import { ConditionEngine } from '../quant/conditions/conditionEngine.ts';
import { universeDb } from '../db/universeDb.ts';
import { indicatorCacheService } from '../services/indicatorCache.ts';
import { marketDataProvider } from '../services/marketDataProvider.ts';
import { marketRegimeService } from '../services/marketRegimeService.ts';
import { getStockMeta, STOCK_UNIVERSE } from '../services/stockUniverse.ts';
import { RadarRankingEngine } from '../quant/ranking/radarRankingEngine.ts';
import { NoTradeArbitrator } from '../quant/risk/noTradeArbitrator.ts';
import { getStandardSectorZh } from '../utils/stockSectorMapper.ts';

export const radarRouter = Router();

// ==========================================
// 1. FILTER METADATA & VALIDATION
// ==========================================

/**
 * GET /api/radar/filters
 * Returns all 28 categories and executable filter definitions
 */
radarRouter.get('/filters', (_req: Request, res: Response) => {
  try {
    const categories = FILTER_CATEGORIES;
    const filters = getAllFilterDefinitions();
    res.json({
      success: true,
      categories,
      filters,
      totalCategories: categories.length,
      totalFilters: filters.length
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve filter metadata', details: err.message });
  }
});

/**
 * POST /api/radar/filters/validate
 * Validates AST rules and detects logical conflicts
 */
radarRouter.post('/filters/validate', (req: Request, res: Response) => {
  try {
    const rules: ConditionGroup = req.body.rules;
    if (!rules || rules.type !== 'group') {
      return res.status(400).json({ valid: false, error: 'Invalid ConditionGroup AST payload' });
    }

    const conflicts = ConditionEngine.detectConflicts(rules);
    res.json({
      valid: conflicts.length === 0,
      conflicts,
      rules
    });
  } catch (err: any) {
    res.status(400).json({ valid: false, error: err.message });
  }
});

// ==========================================
// 2. PRESET MANAGEMENT CRUD
// ==========================================

/**
 * GET /api/radar/presets
 * Returns all system and custom saved presets
 */
radarRouter.get('/presets', (_req: Request, res: Response) => {
  try {
    const presets = universeDb.getAllPresets();
    res.json({
      success: true,
      total: presets.length,
      presets
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve presets', details: err.message });
  }
});

/**
 * GET /api/radar/presets/:id
 */
radarRouter.get('/presets/:id', (req: Request, res: Response) => {
  try {
    const preset = universeDb.getPresetById(req.params.id);
    if (!preset) {
      return res.status(404).json({ error: `Preset with id ${req.params.id} not found` });
    }
    res.json({ success: true, preset });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve preset', details: err.message });
  }
});

/**
 * POST /api/radar/presets
 * Save a new user preset
 */
radarRouter.post('/presets', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.name || !body.rules) {
      return res.status(400).json({ error: 'Name and rules AST are required' });
    }

    const newPreset: RadarPreset = {
      id: body.id || `preset_custom_${Date.now()}`,
      name: body.name,
      nameZh: body.nameZh || body.name,
      description: body.description || 'Custom multi-factor screening preset',
      mode: body.mode || 'PRO',
      profileType: body.profileType || 'CUSTOM',
      rules: body.rules,
      rankingWeights: body.rankingWeights,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    universeDb.savePreset(newPreset);
    res.json({ success: true, preset: newPreset });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save preset', details: err.message });
  }
});

/**
 * PUT /api/radar/presets/:id
 * Update an existing preset
 */
radarRouter.put('/presets/:id', (req: Request, res: Response) => {
  try {
    const existing = universeDb.getPresetById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: `Preset ${req.params.id} not found` });
    }
    if (existing.isSystem) {
      return res.status(403).json({ error: 'Cannot modify system factory presets' });
    }

    const updated: RadarPreset = {
      ...existing,
      ...req.body,
      id: req.params.id,
      isSystem: false,
      updatedAt: new Date().toISOString()
    };

    universeDb.savePreset(updated);
    res.json({ success: true, preset: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update preset', details: err.message });
  }
});

/**
 * DELETE /api/radar/presets/:id
 * Delete a custom preset
 */
radarRouter.delete('/presets/:id', (req: Request, res: Response) => {
  try {
    const existing = universeDb.getPresetById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: `Preset ${req.params.id} not found` });
    }
    if (existing.isSystem) {
      return res.status(403).json({ error: 'Cannot delete system factory presets' });
    }

    universeDb.deletePreset(req.params.id);
    res.json({ success: true, deletedId: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete preset', details: err.message });
  }
});

// ==========================================
// 3. MARKET CONTEXT & OVERVIEW
// ==========================================

/**
 * GET /api/radar/market-context
 * Returns macro regime, indices, and sector relative strength table
 */
radarRouter.get('/market-context', async (_req: Request, res: Response) => {
  try {
    const overview = await marketRegimeService.getMarketOverview();
    res.json({
      success: true,
      ...overview
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve market context', details: err.message });
  }
});

// ==========================================
// 4. MULTI-FACTOR SCREENING & PREVIEW
// ==========================================

/**
 * Compiles quick parameters, preset rules, and custom conditions into a unified AST ConditionGroup
 */
export function compileRadarRules(
  incomingRulesOrOptions?: ConditionGroup | {
    incomingRules?: ConditionGroup;
    rules?: ConditionGroup;
    presetRules?: ConditionGroup;
    radarMode?: string;
    rsiPeriod?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
    minPrice?: number;
    maxPrice?: number;
  },
  presetRulesArg?: ConditionGroup,
  radarModeArg?: string,
  rsiPeriodArg: number = 14,
  minMarketCapArg?: number,
  maxMarketCapArg?: number,
  minPriceArg?: number,
  maxPriceArg?: number
): ConditionGroup {
  let incomingRules: ConditionGroup | undefined;
  let presetRules: ConditionGroup | undefined;
  let radarMode: string | undefined;
  let rsiPeriod: number = 14;
  let minMarketCap: number | undefined;
  let maxMarketCap: number | undefined;
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  if (
    incomingRulesOrOptions &&
    typeof incomingRulesOrOptions === 'object' &&
    ('presetRules' in incomingRulesOrOptions || 'radarMode' in incomingRulesOrOptions || ('type' in incomingRulesOrOptions === false))
  ) {
    const opts = incomingRulesOrOptions as any;
    incomingRules = opts.incomingRules || opts.rules;
    presetRules = opts.presetRules;
    radarMode = opts.radarMode;
    rsiPeriod = opts.rsiPeriod || 14;
    minMarketCap = opts.minMarketCap;
    maxMarketCap = opts.maxMarketCap;
    minPrice = opts.minPrice;
    maxPrice = opts.maxPrice;
  } else {
    incomingRules = incomingRulesOrOptions as ConditionGroup | undefined;
    presetRules = presetRulesArg;
    radarMode = radarModeArg;
    rsiPeriod = rsiPeriodArg;
    minMarketCap = minMarketCapArg;
    maxMarketCap = maxMarketCapArg;
    minPrice = minPriceArg;
    maxPrice = maxPriceArg;
  }

  const childrenMap = new Map<string, any>();

  // 1. Add preset rules if available
  if (presetRules && Array.isArray(presetRules.children)) {
    for (const child of presetRules.children) {
      if (child && child.id) childrenMap.set(child.id, child);
    }
  }

  // 2. Add incoming custom rules (override or extend)
  if (incomingRules && Array.isArray(incomingRules.children)) {
    for (const child of incomingRules.children) {
      if (child && child.id) childrenMap.set(child.id, child);
    }
  }

  // 3. Inject Tactical Trigger Mode
  if (radarMode && radarMode !== 'ALL' && radarMode !== 'CUSTOM') {
    // Clean up any stale trigger rules
    for (const [key, val] of Array.from(childrenMap.entries())) {
      if (
        key.startsWith('trigger_') ||
        key.startsWith('tactical_trigger_') ||
        key.startsWith('rule_oversold') ||
        key.startsWith('rule_overbought')
      ) {
        childrenMap.delete(key);
      } else if (radarMode.startsWith('OVERSOLD_') || radarMode.startsWith('OVERBOUGHT_')) {
        // When dynamic RSI mode is selected, replace any static RSI rules from the preset
        if (
          key === 'rsi' ||
          key === 'rsi_group' ||
          key === 'extreme_rsi_group' ||
          (val && val.type === 'leaf' && (val.indicatorId === 'rsi' || val.indicatorId.startsWith('rsi_')))
        ) {
          childrenMap.delete(key);
        }
      }
    }

    const period = rsiPeriod || 14;
    const rsiInd = `rsi_${period}`;

    switch (radarMode) {
      case 'OVERSOLD_30':
        childrenMap.set('trigger_oversold_30', {
          type: 'leaf',
          id: 'trigger_oversold_30',
          indicatorId: rsiInd,
          operator: 'LTE',
          value: 30,
          label: `超卖反弹 RSI(${period}) <= 30`
        });
        break;
      case 'OVERSOLD_20':
        childrenMap.set('trigger_oversold_20', {
          type: 'leaf',
          id: 'trigger_oversold_20',
          indicatorId: rsiInd,
          operator: 'LTE',
          value: 20,
          label: `极度超跌 RSI(${period}) <= 20`
        });
        break;
      case 'OVERSOLD_40':
        childrenMap.set('trigger_oversold_40', {
          type: 'leaf',
          id: 'trigger_oversold_40',
          indicatorId: rsiInd,
          operator: 'LTE',
          value: 40,
          label: `弱势吸筹 RSI(${period}) <= 40`
        });
        break;
      case 'PULLBACK':
        childrenMap.set('trigger_pullback', {
          type: 'leaf',
          id: 'trigger_pullback',
          indicatorId: 'dist_ema20_atr',
          operator: 'BETWEEN',
          value: [-1.2, 1.2],
          label: '均线回踩 EMA20 (±1.2 ATR)'
        });
        break;
      case 'BREAKOUT':
        childrenMap.set('trigger_breakout', {
          type: 'leaf',
          id: 'trigger_breakout',
          indicatorId: 'donchian_breakout',
          operator: 'EQ',
          value: true,
          label: '动能突破 唐奇安通道'
        });
        break;
      case 'HIGH_REL_VOL':
        childrenMap.set('trigger_high_rvol', {
          type: 'leaf',
          id: 'trigger_high_rvol',
          indicatorId: 'relative_volume',
          operator: 'GTE',
          value: 1.4,
          label: '相对量比 RVOL >= 1.4x'
        });
        break;
      case 'OVERBOUGHT_70':
        childrenMap.set('trigger_overbought_70', {
          type: 'leaf',
          id: 'trigger_overbought_70',
          indicatorId: rsiInd,
          operator: 'GTE',
          value: 70,
          label: `超买预警 RSI(${period}) >= 70`
        });
        break;
    }
  }

  // 4. Inject Market Cap Filter
  if (minMarketCap && minMarketCap > 0) {
    childrenMap.set('filter_min_market_cap', {
      type: 'leaf',
      id: 'filter_min_market_cap',
      indicatorId: 'market_cap',
      operator: 'GTE',
      value: minMarketCap,
      label: `市值 >= $${(minMarketCap / 1e9).toFixed(0)}B`
    });
  }
  if (maxMarketCap && maxMarketCap > 0) {
    childrenMap.set('filter_max_market_cap', {
      type: 'leaf',
      id: 'filter_max_market_cap',
      indicatorId: 'market_cap',
      operator: 'LTE',
      value: maxMarketCap,
      label: `市值 <= $${(maxMarketCap / 1e9).toFixed(0)}B`
    });
  }

  // 5. Inject Price Filter
  if (minPrice && minPrice > 0) {
    childrenMap.set('filter_min_price', {
      type: 'leaf',
      id: 'filter_min_price',
      indicatorId: 'price',
      operator: 'GTE',
      value: minPrice,
      label: `股价 >= $${minPrice}`
    });
  }
  if (maxPrice && maxPrice > 0) {
    childrenMap.set('filter_max_price', {
      type: 'leaf',
      id: 'filter_max_price',
      indicatorId: 'price',
      operator: 'LTE',
      value: maxPrice,
      label: `股价 <= $${maxPrice}`
    });
  }

  return {
    type: 'group',
    id: 'root',
    logicalOperator: 'AND',
    children: Array.from(childrenMap.values())
  };
}

/**
 * POST /api/radar/preview-count
 * Fast universe scan count preview
 */
radarRouter.post('/preview-count', async (req: Request, res: Response) => {
  try {
    const {
      rules: incomingRules,
      presetId,
      radarMode,
      rsiPeriod = 14,
      minMarketCap,
      maxMarketCap,
      minPrice,
      maxPrice,
      universe = 'ALL',
      timeframe = '1D'
    } = req.body;

    let presetRules: ConditionGroup | undefined;
    if (presetId) {
      const p = universeDb.getPresetById(presetId);
      if (p) presetRules = p.rules;
    }

    const compiledRules = compileRadarRules(
      incomingRules,
      presetRules,
      radarMode,
      rsiPeriod,
      minMarketCap,
      maxMarketCap,
      minPrice,
      maxPrice
    );

    let candidates = universeDb.getAllInstruments({ activeOnly: true })
      .filter(i => !i.isIndex && !i.isETF && i.securityType !== 'OTC');
    
    if (universe !== 'ALL') {
      try {
        const uList = universeDb.getUniverseInstruments(universe);
        if (uList.length > 0) candidates = uList;
      } catch {
        // fallback
      }
    }

    if (!compiledRules.children || compiledRules.children.length === 0) {
      return res.json({ totalCount: candidates.length, matchingCount: candidates.length });
    }

    // Sample scan for fast preview (up to 40 candidates)
    const sample = candidates.slice(0, 40);
    let matchCount = 0;
    for (const c of sample) {
      try {
        const ctx = await indicatorCacheService.getEvaluatedContext(c.ticker, timeframe as Timeframe);
        const evalRes = ConditionEngine.evaluateGroup(compiledRules, ctx);
        if (evalRes.passed) matchCount++;
      } catch {
        // skip
      }
    }

    // Extrapolate count estimate
    const estimatedCount = sample.length > 0 ? Math.round((matchCount / sample.length) * candidates.length) : 0;
    res.json({
      totalCount: candidates.length,
      matchingCount: estimatedCount,
      sampleMatchRate: sample.length > 0 ? Math.round((matchCount / sample.length) * 100) : 0
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to evaluate preview count', details: err.message });
  }
});

/**
 * POST /api/radar/screen
 * Professional Multi-Factor Quant Screener 2.0 Execution
 */
radarRouter.post('/screen', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const {
      universe = 'ALL',
      presetId,
      radarMode,
      rsiPeriod = 14,
      sectors,
      minMarketCap,
      maxMarketCap,
      minPrice,
      maxPrice,
      rules: incomingRules,
      rankingWeights: incomingWeights,
      timeframe = '1D',
      sortBy = 'score',
      sortOrder = 'desc',
      page = 1,
      pageSize = 60
    } = req.body;

    // 1. Resolve Preset Rules & Weights
    let presetRules: ConditionGroup | undefined;
    let weights: RankingWeights | undefined = incomingWeights;

    if (presetId) {
      const preset = universeDb.getPresetById(presetId);
      if (preset) {
        presetRules = preset.rules;
        if (!weights) weights = preset.rankingWeights;
      }
    }

    // Compile into unified AST
    const rules = compileRadarRules(
      incomingRules,
      presetRules,
      radarMode,
      rsiPeriod,
      minMarketCap,
      maxMarketCap,
      minPrice,
      maxPrice
    );

    // 2. Select Candidate Universe
    let candidateTickers: { ticker: string; companyName: string; primaryExchange: string; sector: string; industry: string }[] = [];

    if (universe !== 'ALL') {
      try {
        const uList = universeDb.getUniverseInstruments(universe);
        if (uList.length > 0) {
          candidateTickers = uList.map(u => ({
            ticker: u.ticker,
            companyName: u.companyName,
            primaryExchange: u.primaryExchange,
            sector: u.sector || 'Technology',
            industry: u.industry || 'General'
          }));
        }
      } catch {
        // fallback
      }
    }

    if (candidateTickers.length === 0) {
      try {
        const dbInstruments = universeDb.getAllInstruments({ activeOnly: true })
          .filter(i => !i.isIndex && !i.isETF && i.securityType !== 'OTC');
        if (dbInstruments.length > 0) {
          candidateTickers = dbInstruments.map(u => ({
            ticker: u.ticker,
            companyName: u.companyName,
            primaryExchange: u.primaryExchange,
            sector: u.sector || 'Technology',
            industry: u.industry || 'General'
          }));
        }
      } catch {
        // fallback
      }
    }

    if (candidateTickers.length === 0) {
      candidateTickers = STOCK_UNIVERSE.filter(s => s.isActive).map(s => ({
        ticker: s.ticker,
        companyName: s.name,
        primaryExchange: s.exchange,
        sector: s.sector,
        industry: s.industry
      }));
    }

    // Sector Filtering
    if (sectors && Array.isArray(sectors) && sectors.length > 0) {
      const validSectors = sectors.filter(s => s && s !== 'ALL');
      if (validSectors.length > 0) {
        candidateTickers = candidateTickers.filter(c => {
          const standardZh = getStandardSectorZh(c.ticker, c.sector, c.industry, c.companyName);
          const normStock = (c.sector || '').toLowerCase().replace(/[\s&_-]/g, '');
          const normInd = (c.industry || '').toLowerCase().replace(/[\s&_-]/g, '');
          return validSectors.some(targetSec => {
            const normTarget = targetSec.toLowerCase().replace(/[\s&_-]/g, '');
            return normTarget === normStock ||
              normStock.includes(normTarget) ||
              normTarget.includes(normStock) ||
              normTarget === standardZh.toLowerCase() ||
              targetSec.includes(standardZh) ||
              standardZh.includes(targetSec) ||
              normInd.includes(normTarget);
          });
        });
      }
    }

    const matchedItems: ScreenerResultItem[] = [];
    let evaluatedCount = 0;
    let dataErrorCount = 0;

    // 3. Batch Evaluation across candidates (chunked concurrency)
    const scanBatch = candidateTickers.slice(0, 150);
    const BATCH_CHUNK_SIZE = 20;

    for (let i = 0; i < scanBatch.length; i += BATCH_CHUNK_SIZE) {
      const chunk = scanBatch.slice(i, i + BATCH_CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(async (c) => {
          try {
            evaluatedCount++;
            const ctx = await indicatorCacheService.getEvaluatedContext(c.ticker, timeframe as Timeframe);
            const meta = getStockMeta(c.ticker);

            // AST Rules Hard Evaluation
            let hardPassed = true;
            let confluenceScore = 100;
            if (rules && rules.children && rules.children.length > 0) {
              const evalRes = ConditionEngine.evaluateGroup(rules, ctx);
              hardPassed = evalRes.passed;
              confluenceScore = evalRes.totalCount > 0 ? Math.round((evalRes.passedCount / evalRes.totalCount) * 100) : 100;
            }

            // If rules specified and stock failed hard conditions, skip
            if (rules && rules.children && rules.children.length > 0 && !hardPassed) {
              return null;
            }

            // Soft Multi-Factor Scoring
            const scoring = RadarRankingEngine.calculateScore(ctx, weights);

            // NO TRADE Arbitrator & Risk Evaluation
            const arbitration = NoTradeArbitrator.evaluate(
              ctx,
              hardPassed,
              confluenceScore,
              scoring.radarScore
            );

            // Synthesize Multi-Factor Quantitative Model Analysis
            const dominantFactors: string[] = [];
            const sb = scoring.scoreBreakdown;
            if (sb.momentumScore >= 75) {
              dominantFactors.push(ctx.rsiValues[14] <= 30 ? '超卖反转动能' : ctx.rsiValues[14] >= 70 ? '超买风险警示' : '多头动能爆发');
            }
            if (sb.relativeStrengthScore >= 75) {
              dominantFactors.push('相对强弱Alpha');
            }
            if (sb.trendScore >= 75) {
              dominantFactors.push('均线多头共振');
            }
            if (sb.volumeScore >= 75) {
              dominantFactors.push('主力增仓异动');
            }
            if (sb.structureScore >= 75) {
              dominantFactors.push('形态突破结构');
            }
            if (sb.volatilityScore >= 75) {
              dominantFactors.push('优质ATR风控');
            }

            const factorDriver = dominantFactors.length > 0
              ? dominantFactors.slice(0, 2).join(' + ')
              : (ctx.rsiValues[14] <= 30 ? '反转+估值修复因子' : '多因子均衡配置');

            const factorRecommendation = arbitration.whyMatched?.summary
              ? `【${factorDriver}】${arbitration.whyMatched.summary}`
              : `【${factorDriver}】多因子评分 ${scoring.radarScore}/100，相对强弱 RS Rank ${ctx.rsRank ?? 70}，${arbitration.whyMatched?.actionAdvice || '技术形态符合量化买点标准'}。`;

            const quote = await marketDataProvider.getQuote(c.ticker, 14, timeframe as Timeframe);

            const item: ScreenerResultItem = {
              ticker: ctx.ticker,
              name: meta?.name || c.companyName || `${ctx.ticker} Corporation`,
              sector: getStandardSectorZh(ctx.ticker, ctx.sector || c.sector, ctx.industry || c.industry, meta?.name || c.companyName),
              industry: ctx.industry || c.industry || '综合商业',
              exchange: (ctx.exchange || c.primaryExchange || 'NASDAQ') as any,
              price: ctx.price,
              change: quote.change,
              changePercent: ctx.changePercent,
              marketCap: ctx.marketCap,
              volume: ctx.volume,
              avgVolume: ctx.avgVolume,
              relativeVolume: ctx.rvol,
              rvol: ctx.rvol,
              dollarVolume: ctx.avgDollarVolume,
              avgDollarVolume: ctx.avgDollarVolume,
              atr: ctx.atr,
              atrPercent: ctx.atrPercent,
              rsi: ctx.rsiValues[14],
              rsiPrevious: ctx.previousRsiValues?.[14],
              rsiChange: ctx.previousRsiValues?.[14] ? Number((ctx.rsiValues[14] - ctx.previousRsiValues[14]).toFixed(1)) : 0,
              rsiStatus: ctx.rsiValues[14] <= 30 ? 'OVERSOLD' : ctx.rsiValues[14] >= 70 ? 'OVERBOUGHT' : 'NEUTRAL',
              rsiStatusLabel: ctx.rsiValues[14] <= 30 ? '超卖' : ctx.rsiValues[14] >= 70 ? '超买' : '中性',
              rsiPeriod: 14,
              timeframe: timeframe as Timeframe,
              rsRank: ctx.rsRank,
              score: scoring.radarScore,
              factorScore: scoring.radarScore,
              factorRecommendation,
              rank: 0,
              confluenceScore,
              signalState: arbitration.signalState,
              noTrade: arbitration.noTrade,
              noTradeReasons: arbitration.noTradeReasons,
              whyMatched: arbitration.whyMatched,
              riskRewardRatio: arbitration.riskRewardRatio,
              stopLossPrice: arbitration.suggestedStop,
              targetPrice: arbitration.suggestedTarget,
              daysToEarnings: ctx.daysToEarnings,
              marketRegime: ctx.marketRegime,
              sectorRegime: ctx.sectorRegime,
              updatedAt: new Date().toISOString()
            };

            return item;
          } catch (err) {
            dataErrorCount++;
            return null;
          }
        })
      );

      for (const res of chunkResults) {
        if (res) matchedItems.push(res);
      }

      if (matchedItems.length >= 80) break;
    }

    // 4. Sorting
    matchedItems.sort((a, b) => {
      const field = sortBy || 'score';
      const order = sortOrder || 'desc';
      const valA = (a as any)[field] ?? 0;
      const valB = (b as any)[field] ?? 0;
      return order === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    // Assign Rank Order
    matchedItems.forEach((item, index) => {
      item.rank = index + 1;
    });

    // 5. Pagination
    const total = matchedItems.length;
    const paginatedItems = matchedItems.slice((page - 1) * pageSize, page * pageSize);
    const executionTimeMs = Date.now() - startTime;

    // Record screening run asynchronously
    try {
      universeDb.recordScreeningRun({
        id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        presetId,
        scannedCount: evaluatedCount,
        matchedCount: total,
        executionTimeMs,
        marketRegime: matchedItems[0]?.marketRegime || 'RISK_ON'
      });
    } catch {
      // ignore db audit logging errors
    }

    const response: ScreenerResponse = {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      results: paginatedItems,
      filterApplied: {
        universe,
        mode: (req.body.mode || 'PRO') as any,
        timeframe: timeframe as Timeframe,
        rules,
        rankingWeights: weights,
        sortBy,
        sortOrder
      },
      scannedCount: evaluatedCount,
      marketStatus: marketDataProvider.getMarketStatus(),
      timestamp: new Date().toISOString(),
      executionTimeMs,
      evaluatedCount,
      dataErrorCount
    };

    res.json(response);
  } catch (err: any) {
    res.status(500).json({
      error: 'Screening run execution failed',
      details: err.message,
      executionTimeMs: Date.now() - startTime
    });
  }
});
