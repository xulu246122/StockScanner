import { Router, Request, Response } from 'express';
import { findStockInUniverse, getStockMeta, STOCK_UNIVERSE, getUserWatchlist, addToWatchlist, removeFromWatchlist } from '../services/stockUniverse.ts';
import { getStandardSectorZh } from '../utils/stockSectorMapper.ts';
import { marketDataProvider } from '../services/marketDataProvider.ts';
import { screenerService } from '../services/screenerService.ts';
import { alertEngine } from '../services/alertEngine.ts';
import { marketRegimeService } from '../services/marketRegimeService.ts';
import { setupEngine } from '../quant/setupEngine.ts';
import { riskEngine } from '../quant/riskEngine.ts';
import { ScreenerFilter, Timeframe, ConditionGroup, SavedStrategy } from '../types.ts';
import { QUANT_STRATEGY_REGISTRY, STRATEGY_REGISTRY, getStrategyDefinition, getQuantStrategy } from '../quant/strategies/registry.ts';
import { INDICATOR_REGISTRY, getIndicatorDefinition } from '../quant/indicators/registry.ts';
import { ConditionEngine } from '../quant/conditions/conditionEngine.ts';
import { StrategyAdapter } from '../quant/executor/strategyAdapter.ts';
import { indicatorCacheService } from '../services/indicatorCache.ts';
import { strategyAlertService } from '../services/strategyAlertService.ts';
import { BacktestValidationEngine } from '../quant/backtest/backtestValidationEngine.ts';
import { BacktestEngine, backtestEngine } from '../services/backtestEngine.ts';
import { factorEngine } from '../quant/factors/factorEngine.ts';
import { strategyEngine } from '../../src/engine/strategyEngine.ts';
import { logger } from '../services/logger.ts';
import { metricsService } from '../services/metrics.ts';
import { universeDb } from '../db/universeDb.ts';
import { universeBuilder } from '../services/universeBuilder.ts';
import { universeSyncWorker } from '../workers/universeSyncWorker.ts';
import { stockDetailService } from '../services/stockDetail/stockDetailService.ts';
import { newsCenterService } from '../services/newsCenterService.ts';
import { catalystEngine } from '../services/catalystEngine.ts';
import { DataUnavailableError } from '../services/dataUnavailableError.ts';
import { FILTER_CATEGORIES, FILTER_REGISTRY } from '../quant/filters/filterRegistry.ts';
import { validateFilterGroup } from '../quant/filters/filterValidation.ts';
import { radarRouter } from './radarRouter.ts';
import { reboundRouter } from './reboundRouter.ts';
import { brokerRouter } from './brokerRouter.ts';

export const apiRouter = Router();

// Mount Radar 2.0 Professional Screener Sub-Router
apiRouter.use('/radar', radarRouter);

// Mount Plunge Rebound Alert Sub-Router
apiRouter.use('/rebound', reboundRouter);

// Mount Broker & Real Trading Sub-Router
apiRouter.use('/broker', brokerRouter);

function respondWithApiError(res: Response, err: any, fallback: string) {
  if (err instanceof DataUnavailableError) {
    return res.status(503).json({ status: 'UNAVAILABLE', classification: 'UNAVAILABLE', error: err.message });
  }
  return res.status(500).json({ error: err?.message || fallback });
}

// Shared watchlist store (session / local defaults)

// 1. Stock & Instrument Search (5-Tier Priority Search)
apiRouter.get('/stocks/search', async (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  if (!q.trim()) {
    return res.json({ results: [] });
  }

  // 1. First search SQLite Master Database
  const dbResults = universeDb.searchInstruments(q, 25);
  if (dbResults.length > 0) {
    const formatted = dbResults.map((inst) => ({
      ticker: inst.ticker,
      name: inst.companyName,
      exchange: inst.primaryExchange,
      marketCap: inst.marketCap,
      sector: getStandardSectorZh(inst.ticker, inst.sector, inst.industry, inst.companyName),
      industry: inst.industry || '综合商业',
      isActive: inst.active,
      securityType: inst.securityType,
      isADR: inst.isADR,
      isREIT: inst.isREIT,
      isETF: inst.isETF
    }));
    return res.json({ results: formatted });
  }

  // Fallback to legacy universe find
  const matches = await findStockInUniverse(q);
  res.json({ results: matches });
});

apiRouter.post('/radar/filters/validate', (req: Request, res: Response) => {
  const issues = validateFilterGroup(req.body?.rules);
  res.json({ isValid: issues.length === 0, issues });
});

// 2.1 Professional Radar filter metadata. This is intentionally read-only;
// execution remains on the backward-compatible screener endpoints for now.
apiRouter.get('/radar/filters', (_req: Request, res: Response) => {
  res.json({
    version: 1,
    categories: FILTER_CATEGORIES,
    filters: FILTER_REGISTRY,
    logicalOperators: ['AND', 'OR', 'NOT'],
    supportedModes: ['QUICK', 'PRO', 'QUANT']
  });
});

// Dedicated Comprehensive Instrument Search Endpoint
apiRouter.get('/instruments/search', (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const limit = parseInt((req.query.limit as string) || '20', 10);
  const results = universeDb.searchInstruments(q, limit);
  res.json({ query: q, total: results.length, results });
});

// 1.1 Universe API: List All 16 Universes
apiRouter.get('/universe/list', (_req: Request, res: Response) => {
  const universes = universeDb.getAllUniverses();
  res.json({ total: universes.length, universes });
});

// 1.2 Universe API: Get Instruments in a Universe
apiRouter.get('/universe/:code/instruments', (req: Request, res: Response) => {
  const code = req.params.code.toUpperCase();
  const limit = parseInt((req.query.limit as string) || '100', 10);
  const offset = parseInt((req.query.offset as string) || '0', 10);

  const universe = universeDb.getUniverseByCode(code);
  if (!universe) {
    return res.status(404).json({ error: `股票池 ${code} 未找到` });
  }

  const instruments = universeDb.getUniverseInstruments(code, limit, offset);
  res.json({
    universe: {
      code: universe.code,
      name: universe.name,
      category: universe.category,
      memberCount: universe.memberCount
    },
    total: universe.memberCount,
    limit,
    offset,
    instruments
  });
});

// 1.3 Universe API: Index Constituents (S&P 500 / Nasdaq 100 with ADD/REMOVE/UPDATE history)
apiRouter.get('/universe/indices/:symbol/constituents', (req: Request, res: Response) => {
  const symbol = req.params.symbol.toUpperCase();
  const constituents = universeDb.getIndexConstituents(symbol);
  res.json({ indexSymbol: symbol, total: constituents.length, constituents });
});

// 1.4 Universe API: Manual Trigger Sync
apiRouter.post('/universe/sync', async (_req: Request, res: Response) => {
  try {
    const result = await universeSyncWorker.runSync();
    const counts = universeDb.getCounts();
    res.json({ success: true, syncResult: result, counts });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '股票池同步执行失败' });
  }
});

// 1.5 Universe API: Counts & System Metrics
apiRouter.get('/universe/metrics', (_req: Request, res: Response) => {
  const counts = universeDb.getCounts();
  res.json({ counts });
});

// 2. Market Status & Overview
apiRouter.get('/market/status', (_req: Request, res: Response) => {
  const status = marketDataProvider.getMarketStatus();
  res.json(status);
});

apiRouter.get('/market/overview', async (_req: Request, res: Response) => {
  try {
    const overview = await marketRegimeService.getMarketOverview();
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取大盘概览失败' });
  }
});

// 3. Stock Meta
apiRouter.get('/stocks/:ticker', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase();
  const meta = getStockMeta(ticker);
  if (!meta) {
    return res.status(404).json({ error: `股票代码 ${ticker} 未找到` });
  }
  res.json(meta);
});

// 3.1 Unified Stock Detail V2 Model Endpoint
apiRouter.get('/stocks/:ticker/detail', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const timeframe = (req.query.timeframe as any) || '1D';
    const detail = await stockDetailService.getStockDetail(ticker, timeframe);
    res.json(detail);
  } catch (err: any) {
    respondWithApiError(res, err, '获取股票多维详情数据失败');
  }
});

// 4. Stock Quote Snapshot + RSI
apiRouter.get('/stocks/:ticker/quote', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const period = parseInt((req.query.period as string) || '14', 10);
    const timeframe = (req.query.timeframe as any) || '1D';
    const quote = await marketDataProvider.getQuote(ticker, period, timeframe);
    res.json(quote);
  } catch (err: any) {
    respondWithApiError(res, err, '获取股票行情失败');
  }
});

// 5. Stock History (OHLC + Wilder RSI Series)
apiRouter.get('/stocks/:ticker/history', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const rangeParam = (req.query.range as string) || '90d';
    const period = parseInt((req.query.period as string) || '14', 10);
    const timeframe = (req.query.timeframe as any) || '1D';

    let days = 90;
    if (rangeParam === '30d') days = 30;
    else if (rangeParam === '90d') days = 90;
    else if (rangeParam === '180d') days = 180;
    else if (rangeParam === '1y') days = 365;

    const bars = await marketDataProvider.getHistoricalPrices(ticker, days, period, timeframe);
    const quote = await marketDataProvider.getQuote(ticker, period, timeframe);

    res.json({
      ticker,
      name: quote.name,
      period,
      timeframe,
      range: rangeParam,
      bars,
      currentPrice: quote.price,
      changePercent: quote.changePercent,
      rsi: quote.rsi
    });
  } catch (err: any) {
    respondWithApiError(res, err, '获取历史图表数据失败');
  }
});

// 5.1 Stock Trade Setups (10 Institutional Setups Engine)
apiRouter.get('/stocks/:ticker/setup', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const timeframe = (req.query.timeframe as any) || '1D';
    const quote = await marketDataProvider.getQuote(ticker, 14, timeframe);
    const bars = await marketDataProvider.getHistoricalPrices(ticker, 90, 14, timeframe);
    const setups = setupEngine.detectSetups(ticker, quote.name, bars, timeframe);
    res.json({ ticker, name: quote.name, timeframe, setups });
  } catch (err: any) {
    respondWithApiError(res, err, '识别交易形态失败');
  }
});

// 5.2 Position Sizing & Risk Calculation (Hard stop 5% cap) - Supports both POST and GET
apiRouter.post('/stocks/:ticker/risk', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const { accountSize = 100000, maxRiskPercent = 1.0, entryPrice, stopLossPrice } = req.body;
    let entry = entryPrice;
    let stop = stopLossPrice;
    if (!entry) {
      const quote = await marketDataProvider.getQuote(ticker, 14, '1D');
      entry = quote.price;
    }
    if (!stop) throw new DataUnavailableError('A verified or user-supplied stop-loss price is required.');
    const calculation = riskEngine.calculatePositionSize(accountSize, maxRiskPercent, entry, stop);
    res.json(calculation);
  } catch (err: any) {
    respondWithApiError(res, err, '计算风控仓位失败');
  }
});

apiRouter.get('/stocks/:ticker/risk', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const accountSize = parseFloat(req.query.accountSize as string) || 100000;
    const maxRiskPercent = parseFloat(req.query.maxRiskPercent as string) || 1.0;
    const quote = await marketDataProvider.getQuote(ticker, 14, '1D');
    const entry = parseFloat(req.query.entryPrice as string) || quote.price;
    const stop = parseFloat(req.query.stopLossPrice as string);
    if (!Number.isFinite(stop)) throw new DataUnavailableError('A verified or user-supplied stop-loss price is required.');
    const calculation = riskEngine.calculatePositionSize(accountSize, maxRiskPercent, entry, stop);
    res.json(calculation);
  } catch (err: any) {
    respondWithApiError(res, err, '计算风控仓位失败');
  }
});

// 6. Screener API
apiRouter.post('/screener', async (req: Request, res: Response) => {
  try {
    const filter: ScreenerFilter = req.body || {};
    const result = await screenerService.runScreener(filter);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '执行筛选引擎出错' });
  }
});

// 7. Watchlist API
apiRouter.get('/watchlist', async (req: Request, res: Response) => {
  try {
    const period = parseInt((req.query.period as string) || '14', 10);
    const tickers = getUserWatchlist();
    const quotes = await marketDataProvider.batchGetQuotes(tickers, period);
    
    // Check alert status for each watchlist item
    const alerts = alertEngine.getAlerts();
    const enriched = quotes.map(q => {
      const activeAlert = alerts.find(a => a.ticker === q.ticker && a.isEnabled);
      return {
        ...q,
        sector: getStandardSectorZh(q.ticker, q.sector, q.industry, q.name),
        hasActiveAlert: !!activeAlert,
        activeAlertRule: activeAlert
      };
    });

    res.json({
      tickers,
      items: enriched,
      count: enriched.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取自选股列表失败' });
  }
});

apiRouter.post('/watchlist', (req: Request, res: Response) => {
  const ticker = (req.body.ticker as string || '').toUpperCase().trim();
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker is required' });
  }
  const updated = addToWatchlist(ticker);
  res.json({ success: true, watchlist: updated });
});

apiRouter.delete('/watchlist/:ticker', (req: Request, res: Response) => {
  const ticker = req.params.ticker.toUpperCase().trim();
  const updated = removeFromWatchlist(ticker);
  res.json({ success: true, watchlist: updated });
});

// 8. Alerts API
apiRouter.get('/alerts', (_req: Request, res: Response) => {
  const alerts = alertEngine.getAlerts();
  res.json({ alerts });
});

apiRouter.post('/alerts', (req: Request, res: Response) => {
  const { ticker, name, period, timeframe, conditionType, thresholdValue, thresholdMax, isEnabled } = req.body;
  if (!ticker || !conditionType || thresholdValue === undefined) {
    return res.status(400).json({ error: '缺少预警参数' });
  }

  const stock = getStockMeta(ticker);
  const stockName = name || (stock ? stock.name : `${ticker} Corp`);

  const created = alertEngine.createAlert({
    ticker: ticker.toUpperCase(),
    name: stockName,
    period: period || 14,
    timeframe: timeframe || '1D',
    conditionType,
    thresholdValue: Number(thresholdValue),
    thresholdMax: thresholdMax !== undefined ? Number(thresholdMax) : undefined,
    isEnabled: isEnabled !== undefined ? isEnabled : true
  });

  res.json(created);
});

apiRouter.put('/alerts/:id', (req: Request, res: Response) => {
  const updated = alertEngine.updateAlert(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: '预警规则不存在' });
  }
  res.json(updated);
});

apiRouter.delete('/alerts/:id', (req: Request, res: Response) => {
  const deleted = alertEngine.deleteAlert(req.params.id);
  res.json({ success: deleted });
});

apiRouter.get('/alerts/events', (_req: Request, res: Response) => {
  const events = alertEngine.getAlertEvents();
  res.json({ events });
});

apiRouter.post('/alerts/events/:id/read', (req: Request, res: Response) => {
  const success = alertEngine.markEventAsRead(req.params.id);
  res.json({ success });
});

apiRouter.post('/alerts/events/clear', (_req: Request, res: Response) => {
  alertEngine.clearAllEvents();
  res.json({ success: true });
});

// On-demand scan trigger
apiRouter.post('/alerts/scan', async (_req: Request, res: Response) => {
  try {
    const triggered = await alertEngine.scanAlerts();
    res.json({ scanned: true, newEvents: triggered });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '预警扫描失败' });
  }
});

// 9. RSI Calculation Flow & Price Stream Diagnostic API
apiRouter.get('/diagnostic/rsi/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker.toUpperCase().trim();
    const timeframe = (req.query.timeframe as Timeframe) || '1D';
    const period = parseInt((req.query.period as string) || '14', 10);

    const { diagnoseTickerRSI } = await import('../services/rsiDiagnostic.ts');
    const report = await diagnoseTickerRSI(ticker, timeframe, period);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'RSI 诊断执行失败' });
  }
});

// ============================================================================
// 10. QUANTITATIVE STRATEGY & INDICATOR REGISTRY API
// ============================================================================

// In-memory store for custom user-saved strategies
let savedUserStrategies: SavedStrategy[] = [
  {
    id: 'user_custom_darvas_mom',
    name: '达瓦斯箱体突破 + 放量异动',
    description: '个人交易体系：突破30日盘整箱顶且 RVOL >= 1.5 伴随阳线',
    baseStrategyId: 'darvas_box',
    rules: {
      type: 'group',
      id: 'custom_root_1',
      logicalOperator: 'AND',
      children: [
        {
          type: 'leaf',
          id: 'c1',
          indicatorId: 'darvas_box_breakout',
          operator: 'EQ',
          value: true,
          label: '价格突破近 30 周期整理箱体上轨'
        },
        {
          type: 'leaf',
          id: 'c2',
          indicatorId: 'relative_volume',
          operator: 'GTE',
          value: 1.5,
          label: '相对成交量 RVOL >= 1.5x'
        }
      ]
    },
    parameters: { lookback: 30, minRvol: 1.5 },
    timeframes: ['1D'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 10.1 List all registered strategies
apiRouter.get('/strategies', (_req: Request, res: Response) => {
  res.json({
    total: STRATEGY_REGISTRY.length,
    strategies: STRATEGY_REGISTRY
  });
});

// 10.2 Get single strategy with full rules & parameters
apiRouter.get('/strategies/:id', (req: Request, res: Response) => {
  const strategy = getStrategyDefinition(req.params.id);
  if (!strategy) {
    return res.status(404).json({ error: `未找到策略: ${req.params.id}` });
  }
  res.json(strategy);
});

// 10.3 Single ticker evaluation against a strategy
apiRouter.get('/strategies/:id/evaluate/:ticker', async (req: Request, res: Response) => {
  try {
    const strategy = getStrategyDefinition(req.params.id);
    if (!strategy) {
      return res.status(404).json({ error: `未找到策略: ${req.params.id}` });
    }
    const ticker = req.params.ticker.toUpperCase();
    const timeframe = (req.query.timeframe as Timeframe) || '1D';
    const evaluation = await indicatorCacheService.evaluateStrategyForStock(ticker, strategy, timeframe);
    res.json(evaluation);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '策略单标的求值失败' });
  }
});

// 10.4 Run Strategy Screener
apiRouter.post('/screener/strategy', async (req: Request, res: Response) => {
  try {
    const { strategyId, timeframe = '1D', filter = {} } = req.body;
    if (!strategyId) {
      return res.status(400).json({ error: '必须指定 strategyId' });
    }
    const result = await screenerService.runStrategyScreener(strategyId, timeframe, filter);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '运行策略筛选器失败' });
  }
});

// 10.5 Run Custom AST Screener
apiRouter.post('/screener/custom', async (req: Request, res: Response) => {
  try {
    const { rules, timeframe = '1D', filter = {} } = req.body;
    if (!rules || !rules.children) {
      return res.status(400).json({ error: '必须提供有效的 ConditionGroup AST' });
    }
    const result = await screenerService.runCustomASTScreener(rules, timeframe, filter);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '运行自定义条件树筛选失败' });
  }
});

// 10.6 List all indicator definitions
apiRouter.get('/indicators', (_req: Request, res: Response) => {
  res.json({
    total: INDICATOR_REGISTRY.length,
    indicators: INDICATOR_REGISTRY
  });
});

apiRouter.get('/indicators/:id', (req: Request, res: Response) => {
  const item = getIndicatorDefinition(req.params.id);
  if (!item) {
    return res.status(404).json({ error: `未找到指标: ${req.params.id}` });
  }
  res.json(item);
});

// 10.7 Validate AST Rules & Detect Conflicts
apiRouter.post('/strategies/validate', (req: Request, res: Response) => {
  const { rules } = req.body;
  if (!rules) {
    return res.json({ isValid: true, warnings: [] });
  }
  const warnings = ConditionEngine.detectConflicts(rules);
  res.json({
    isValid: warnings.length === 0,
    hasConflicts: warnings.length > 0,
    warnings
  });
});

// 10.8 Saved Strategies CRUD
apiRouter.get('/strategies/saved/all', (_req: Request, res: Response) => {
  res.json({
    total: savedUserStrategies.length,
    savedStrategies: savedUserStrategies
  });
});

apiRouter.post('/strategies/save', (req: Request, res: Response) => {
  const { name, description, rules, parameters, timeframes, baseStrategyId } = req.body;
  if (!name || !rules) {
    return res.status(400).json({ error: '必须提供策略名称与规则树' });
  }
  const newStrategy: SavedStrategy = {
    id: `saved_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    description: description || '用户自定义量化策略',
    baseStrategyId,
    rules,
    parameters: parameters || {},
    timeframes: timeframes || ['1D'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  savedUserStrategies.unshift(newStrategy);
  res.json(newStrategy);
});

apiRouter.delete('/strategies/saved/:id', (req: Request, res: Response) => {
  savedUserStrategies = savedUserStrategies.filter(s => s.id !== req.params.id);
  res.json({ success: true, remaining: savedUserStrategies.length });
});

// ==========================================
// 11. QUANT STRATEGY ENGINE FIRST-CLASS APIS
// ==========================================

apiRouter.get('/quant/indicators', (_req: Request, res: Response) => {
  res.json({
    total: INDICATOR_REGISTRY.length,
    indicators: INDICATOR_REGISTRY
  });
});

apiRouter.get('/quant/strategies', (_req: Request, res: Response) => {
  res.json({
    total: QUANT_STRATEGY_REGISTRY.length,
    strategies: QUANT_STRATEGY_REGISTRY
  });
});

apiRouter.get('/quant/strategies/:id', (req: Request, res: Response) => {
  const item = getQuantStrategy(req.params.id);
  if (!item) {
    return res.status(404).json({ error: `未找到策略: ${req.params.id}` });
  }
  res.json(item);
});

apiRouter.post('/quant/strategies/:id/run', async (req: Request, res: Response) => {
  try {
    const rawStrategy = getQuantStrategy(req.params.id);
    if (!rawStrategy) {
      return res.status(404).json({ error: `未找到策略: ${req.params.id}` });
    }

    const { parameters = {}, timeframe, modeType, filter = {} } = req.body;
    const adapted = StrategyAdapter.adapt(rawStrategy, {
      modeType,
      parameters,
      timeframe
    });

    const result = await screenerService.runCustomASTScreener(adapted.strategy.rules, adapted.timeframe, filter);
    res.json({
      strategyId: adapted.strategy.id,
      strategyName: adapted.strategy.name,
      modeType: adapted.modeType,
      appliedParameters: adapted.effectiveParameters,
      timeframe: adapted.timeframe,
      signals: adapted.signals,
      totalMatches: result.total,
      scannedCount: result.scannedCount,
      evaluatedCount: result.evaluatedCount,
      dataErrorCount: result.dataErrorCount,
      dataErrorSamples: result.dataErrorSamples,
      executionTimeMs: result.executionTimeMs,
      results: result.results
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '执行策略扫描失败' });
  }
});

// Phase 05: Unified Backtest Validation Endpoint
apiRouter.get('/quant/strategies/:id/validate', (req: Request, res: Response) => {
  try {
    const rawStrategy = getQuantStrategy(req.params.id);
    if (!rawStrategy) {
      return res.status(404).json({ error: `未找到策略: ${req.params.id}` });
    }
    const validationResult = BacktestValidationEngine.validateStrategy(rawStrategy);
    res.json(validationResult);
  } catch (err: any) {
    respondWithApiError(res, err, '策略回测验证失败');
  }
});

// Phase 05: Core Strategies Validation Benchmark Report
apiRouter.get('/quant/validation/core-report', (_req: Request, res: Response) => {
  try {
    const coreResults = BacktestValidationEngine.validateAllCoreStrategies();
    res.json({
      totalCoreStrategies: coreResults.length,
      validatedAt: new Date().toISOString(),
      results: coreResults.map(r => r.summary)
    });
  } catch (err: any) {
    respondWithApiError(res, err, '获取核心策略回测验证报告失败');
  }
});

apiRouter.post('/quant/universe/create', (req: Request, res: Response) => {
  const { name, tickers } = req.body;
  if (Array.isArray(tickers)) {
    tickers.forEach(t => {
      const norm = String(t).toUpperCase().trim();
      if (norm) {
        addToWatchlist(norm);
      }
    });
  }
  res.json({
    success: true,
    name: name || '策略生成股票池',
    tickersCount: tickers?.length || 0,
    watchlist: getUserWatchlist()
  });
});

// ============================================================================
// STRATEGY ALERT ENGINE API ENDPOINTS
// ============================================================================

// 1. POST /api/strategy-alert/create or /strategy-alert/create
apiRouter.post(['/strategy-alert/create', '/create'], (req: Request, res: Response) => {
  try {
    const { user_id, strategy_id, strategyName, parameters, timeframe, symbols, trigger_type, conditionDescription } = req.body;
    if (!strategy_id) {
      return res.status(400).json({ error: '必须指定 strategy_id' });
    }
    const created = strategyAlertService.createAlert({
      user_id,
      strategy_id,
      strategyName,
      parameters,
      timeframe,
      symbols,
      trigger_type,
      conditionDescription
    });
    res.json({ success: true, alert: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '创建策略提醒失败' });
  }
});

// 2. GET /api/strategy-alert/list or /strategy-alert/list
apiRouter.get(['/strategy-alert/list', '/list'], (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id as string;
    const alerts = strategyAlertService.listAlerts(userId);
    res.json({ alerts, total: alerts.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取策略提醒列表失败' });
  }
});

// 3. PUT /api/strategy-alert/update or /strategy-alert/update
apiRouter.put(['/strategy-alert/update', '/update'], (req: Request, res: Response) => {
  try {
    const { id, ...updates } = req.body;
    if (!id) {
      return res.status(400).json({ error: '必须提供提醒 ID (id)' });
    }
    const updated = strategyAlertService.updateAlert(id, updates);
    if (!updated) {
      return res.status(404).json({ error: '未找到指定策略提醒' });
    }
    res.json({ success: true, alert: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '更新策略提醒失败' });
  }
});

// 4. DELETE /api/strategy-alert/delete or /strategy-alert/delete
apiRouter.delete(['/strategy-alert/delete', '/delete'], (req: Request, res: Response) => {
  try {
    const id = (req.query.id as string) || (req.body?.id as string);
    if (!id) {
      return res.status(400).json({ error: '必须提供提醒 ID (id)' });
    }
    const ok = strategyAlertService.deleteAlert(id);
    if (!ok) {
      return res.status(404).json({ error: '未找到指定策略提醒' });
    }
    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '删除策略提醒失败' });
  }
});

// 5. POST /api/strategy-alert/evaluate or /strategy-alert/evaluate
apiRouter.post(['/strategy-alert/evaluate', '/evaluate'], async (_req: Request, res: Response) => {
  try {
    const evalRes = await strategyAlertService.evaluateAllActiveAlerts();
    res.json({ success: true, ...evalRes, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '执行策略提醒扫描失败' });
  }
});

// ============================================================================
// STRATEGY BACKTEST ENGINE API ENDPOINTS (PHASE 7)
// ============================================================================

// 1. POST /api/quant/backtest/run
apiRouter.post('/quant/backtest/run', async (req: Request, res: Response) => {
  try {
    const config = req.body;
    if (!config || !config.strategyId) {
      return res.status(400).json({ error: '必须提供 strategyId' });
    }
    const result = await backtestEngine.runBacktest(config);
    res.json({ success: true, result });
  } catch (err: any) {
    respondWithApiError(res, err, '运行策略历史回测失败');
  }
});

// 2. GET /api/quant/backtest/results/:id
apiRouter.get('/quant/backtest/results/:id', (req: Request, res: Response) => {
  try {
    const result = backtestEngine.getResult(req.params.id);
    if (!result) {
      return res.status(404).json({ error: '未找到指定回测报告' });
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取回测报告失败' });
  }
});

// 3. GET /api/quant/backtest/history
apiRouter.get('/quant/backtest/history', (req: Request, res: Response) => {
  try {
    const strategyId = req.query.strategyId as string;
    if (!strategyId) {
      return res.status(400).json({ error: '必须提供 strategyId 查询参数' });
    }
    const history = backtestEngine.listResultsForStrategy(strategyId);
    res.json({ history, total: history.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取策略回测历史失败' });
  }
});

// 4. GET & POST /api/quant/backtest/export/csv
apiRouter.get('/quant/backtest/export/csv', (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: '必须提供 id 参数' });
    const result = backtestEngine.getResult(id);
    if (!result) return res.status(404).json({ error: '未找到指定回测报告' });
    const csv = backtestEngine.generateCsvReport(result);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="backtest_${result.strategyId}_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '导出 CSV 失败' });
  }
});

apiRouter.post('/quant/backtest/export/csv', (req: Request, res: Response) => {
  try {
    const result = req.body.result || req.body;
    if (!result || !result.performance) return res.status(400).json({ error: '无效的回测报告数据' });
    const csv = backtestEngine.generateCsvReport(result);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '导出 CSV 失败' });
  }
});

// 5. GET & POST /api/quant/backtest/export/html
apiRouter.get('/quant/backtest/export/html', (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: '必须提供 id 参数' });
    const result = backtestEngine.getResult(id);
    if (!result) return res.status(404).json({ error: '未找到指定回测报告' });
    const html = backtestEngine.generateHtmlReport(result);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '生成 HTML 研报失败' });
  }
});

apiRouter.post('/quant/backtest/export/html', (req: Request, res: Response) => {
  try {
    const result = req.body.result || req.body;
    if (!result || !result.performance) return res.status(400).json({ error: '无效的回测报告数据' });
    const html = backtestEngine.generateHtmlReport(result);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '生成 HTML 研报失败' });
  }
});

// ============================================================================
// MULTI-FACTOR QUANT PLATFORM API ENDPOINTS (PHASE 8)
// ============================================================================

// 1. GET /api/quant/factors/library
apiRouter.get('/quant/factors/library', (_req: Request, res: Response) => {
  try {
    const library = factorEngine.getFactorLibrary();
    res.json({ total: library.length, library });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取因子库失败' });
  }
});

// 2. GET /api/quant/factors/models
apiRouter.get('/quant/factors/models', (_req: Request, res: Response) => {
  try {
    const models = factorEngine.getFactorModels();
    res.json({ total: models.length, models });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取多因子模型列表失败' });
  }
});

// 3. POST /api/quant/factors/evaluate
apiRouter.post('/quant/factors/evaluate', async (req: Request, res: Response) => {
  try {
    const { model, timeframe = '1D', limit = 30 } = req.body;
    if (!model) {
      return res.status(400).json({ error: '必须提供 FactorModel 模型定义' });
    }
    const result = await factorEngine.evaluateFactorModel(model, timeframe, limit);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '计算多因子评分失败' });
  }
});

// 4. POST /api/quant/factors/models/save
apiRouter.post('/quant/factors/models/save', (req: Request, res: Response) => {
  try {
    const model = req.body;
    if (!model || !model.name) {
      return res.status(400).json({ error: '模型名称不能为空' });
    }
    const saved = factorEngine.saveFactorModel(model);
    res.json({ success: true, model: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '保存多因子模型失败' });
  }
});

// 5. DELETE /api/quant/factors/models/:id
apiRouter.delete('/quant/factors/models/:id', (req: Request, res: Response) => {
  try {
    const ok = factorEngine.deleteFactorModel(req.params.id);
    if (!ok) {
      return res.status(404).json({ error: '未找到指定多因子模型' });
    }
    res.json({ success: true, deletedId: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '删除多因子模型失败' });
  }
});

// ============================================================================
// SYSTEM PRODUCTION MONITORING & HEALTH CHECK ENDPOINTS (PHASE 10)
// ============================================================================

// 1. GET /api/health
apiRouter.get('/health', (_req: Request, res: Response) => {
  const summary = metricsService.getMetricsSummary();
  res.json({
    status: 'UP',
    version: '2.0.0-PROD',
    service: 'Institutional Quant Terminal Engine',
    timestamp: new Date().toISOString(),
    uptimeSeconds: summary.uptimeSeconds
  });
});

// 2. GET /api/metrics
apiRouter.get('/metrics', (_req: Request, res: Response) => {
  const summary = metricsService.getMetricsSummary();
  res.json(summary);
});

// ============================================================================
// PHASE STOCK-05: NEWS, EVENTS & CATALYST CENTER API ENDPOINTS
// ============================================================================

// 1. GET /api/news/stream
apiRouter.get('/news/stream', (req: Request, res: Response) => {
  try {
    const tab = (req.query.tab as any) || 'Latest';
    const category = (req.query.category as any) || 'ALL';
    const ticker = req.query.ticker as string;
    const sentiment = (req.query.sentiment as any) || 'ALL';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const stream = newsCenterService.getNewsStream({
      tab,
      category,
      ticker,
      sentiment,
      limit
    });
    res.json(stream);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取实时新闻流失败' });
  }
});

// 2. GET /api/news/velocity
apiRouter.get('/news/velocity', (req: Request, res: Response) => {
  try {
    const ticker = req.query.ticker as string;
    const velocity = newsCenterService.calculateNewsVelocity(ticker);
    res.json(velocity);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '计算新闻发布速率失败' });
  }
});

// 3. GET /api/news/events
apiRouter.get('/news/events', (req: Request, res: Response) => {
  try {
    const ticker = req.query.ticker as string;
    const eventType = (req.query.eventType as any) || 'ALL';
    const upcomingOnly = req.query.upcomingOnly === 'true';

    const events = newsCenterService.getEvents(ticker, eventType, upcomingOnly);
    res.json({ total: events.length, events, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取重大公司与宏观事件日历失败' });
  }
});

// 4. GET /api/news/catalysts
apiRouter.get('/news/catalysts', (req: Request, res: Response) => {
  try {
    const ticker = req.query.ticker as string;
    const direction = req.query.direction as string;
    const minStrength = req.query.minStrength as string;

    const catalysts = newsCenterService.getCatalysts(ticker, direction, minStrength);
    res.json({ total: catalysts.length, catalysts, evaluatedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '执行催化剂引擎失败' });
  }
});

// 5. GET /api/news/sentiment
apiRouter.get('/news/sentiment', (req: Request, res: Response) => {
  try {
    const ticker = req.query.ticker as string;
    const stream = newsCenterService.getNewsStream({ tab: 'Latest', ticker });
    res.json({
      ticker: ticker || 'ALL',
      sentimentSummary: stream.sentimentSummary,
      velocity: stream.velocity
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取情绪分析摘要失败' });
  }
});

// ==========================================
// 6. SOFTWARE SETTINGS: API KEY CONFIGURATION
// ==========================================
import { apiConfigService } from '../services/apiConfigService.ts';

apiRouter.get('/settings/api-keys', (_req: Request, res: Response) => {
  try {
    const config = apiConfigService.getConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: '获取 API 配置失败', details: err.message });
  }
});

apiRouter.post('/settings/api-keys', (req: Request, res: Response) => {
  try {
    const updated = apiConfigService.updateConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ error: '保存 API 配置失败', details: err.message });
  }
});

apiRouter.post('/settings/test-key', async (req: Request, res: Response) => {
  try {
    const { provider, customKey } = req.body;
    if (provider === 'ALL') {
      const [finnhub, massive, alphaVantage] = await Promise.all([
        apiConfigService.testProvider('finnhub'),
        apiConfigService.testProvider('massive'),
        apiConfigService.testProvider('alphaVantage')
      ]);
      const statusMap = { finnhub, massive, alphaVantage };
      apiConfigService.updateConfig({
        providerStatus: statusMap,
        lastTestedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false })
      });
      return res.json({ success: true, results: statusMap });
    }

    const result = await apiConfigService.testProvider(provider, customKey);
    const currentCfg = apiConfigService.getConfig();
    const statusMap = {
      ...currentCfg.providerStatus,
      [provider]: result
    };
    apiConfigService.updateConfig({
      providerStatus: statusMap,
      lastTestedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false })
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: '测试 API 连接失败', details: err.message });
  }
});

apiRouter.post('/settings/reset-keys', (_req: Request, res: Response) => {
  try {
    const reset = apiConfigService.resetToDefaults();
    res.json({ success: true, config: reset });
  } catch (err: any) {
    res.status(500).json({ error: '重置 API 配置失败', details: err.message });
  }
});

// 7. NOTIFICATION CHANNELS CONFIGURATION & TESTING
import { notificationDispatcher } from '../services/notificationDispatcher.ts';

apiRouter.get('/settings/notifications', (_req: Request, res: Response) => {
  try {
    const config = notificationDispatcher.getConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: '获取通知通道配置失败', details: err.message });
  }
});

apiRouter.post('/settings/notifications', (req: Request, res: Response) => {
  try {
    const updated = notificationDispatcher.updateConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ error: '保存通知通道配置失败', details: err.message });
  }
});

apiRouter.post('/settings/test-notification', async (req: Request, res: Response) => {
  try {
    const { channel, config } = req.body;
    if (!channel) {
      return res.status(400).json({ error: '缺少 channel 参数' });
    }
    const result = await notificationDispatcher.testChannel(channel, config);
    res.json({ success: result.success, message: result.message, latencyMs: result.latencyMs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: '测试通知通道发生异常', details: err.message });
  }
});



