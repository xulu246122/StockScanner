import {
  ScreenerFilter,
  ScreenerResponse,
  Timeframe,
  PriceBar,
  ConditionGroup,
  ExtendedScreenerItem,
  StrategyEvaluation,
  StrategyState,
  ConditionEvaluationResult,
  StockMeta
} from '../types.ts';
import { STOCK_UNIVERSE } from './stockUniverse.ts';
import { marketDataProvider } from './marketDataProvider.ts';
import { STRATEGY_REGISTRY, getStrategyDefinition } from '../quant/strategies/registry.ts';
import { indicatorCacheService } from './indicatorCache.ts';
import { ConditionEngine } from '../quant/conditions/conditionEngine.ts';
import { universeDb } from '../db/universeDb.ts';

export class ScreenerService {
  /**
   * Filters the universe by UniverseRepository and base metadata (market, sector, market cap, search query)
   */
  private filterCandidates(filter: ScreenerFilter) {
    let candidateStocks: StockMeta[] = [];

    // 1. Load from UniverseRepository
    if (filter.universe && filter.universe !== 'ALL') {
      try {
        const dbInstruments = universeDb.getUniverseInstruments(filter.universe);
        candidateStocks = dbInstruments.map(inst => ({
          ticker: inst.ticker,
          name: inst.companyName,
          exchange: (inst.primaryExchange === 'NYSE' ? 'NYSE' : 'NASDAQ') as any,
          marketCap: inst.marketCap,
          sector: inst.sector || 'Technology',
          industry: inst.industry || 'General',
          isActive: inst.active
        }));
      } catch {
        candidateStocks = STOCK_UNIVERSE.filter(s => s.isActive);
      }
    } else {
      try {
        // Default Core Stock Universe: active=true, common stock + ADR/REIT, excluding OTC, Warrant, Right, Unit, Preferred
        const dbInstruments = universeDb.getAllInstruments({ activeOnly: true })
          .filter(i =>
            !i.isIndex &&
            !i.isETF &&
            i.securityType !== 'OTC' &&
            i.securityType !== 'WARRANT' &&
            i.securityType !== 'RIGHT' &&
            i.securityType !== 'UNIT' &&
            i.securityType !== 'PREFERRED'
          );

        if (dbInstruments.length > 0) {
          candidateStocks = dbInstruments.map(inst => ({
            ticker: inst.ticker,
            name: inst.companyName,
            exchange: (inst.primaryExchange === 'NYSE' ? 'NYSE' : 'NASDAQ') as any,
            marketCap: inst.marketCap,
            sector: inst.sector || 'Technology',
            industry: inst.industry || 'General',
            isActive: inst.active
          }));
        } else {
          candidateStocks = STOCK_UNIVERSE.filter(s => s.isActive);
        }
      } catch {
        candidateStocks = STOCK_UNIVERSE.filter(s => s.isActive);
      }
    }

    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.trim().toLowerCase();
      candidateStocks = candidateStocks.filter(s =>
        s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }

    if (filter.market && filter.market !== 'ALL') {
      candidateStocks = candidateStocks.filter(s => s.exchange === filter.market);
    }

    // Sector filtering (single sector or multi-sector array)
    const filterSectors: string[] = [];
    if (filter.sectors && Array.isArray(filter.sectors) && filter.sectors.length > 0) {
      filterSectors.push(...filter.sectors.filter(s => s && s !== 'ALL'));
    } else if (filter.sector && filter.sector !== 'ALL') {
      filterSectors.push(filter.sector);
    }

    if (filterSectors.length > 0) {
      candidateStocks = candidateStocks.filter(s => {
        if (!s.sector) return false;
        return filterSectors.some(targetSec => {
          if (targetSec === s.sector) return true;
          const normTarget = targetSec.toLowerCase().replace(/[\s&_-]/g, '');
          const normStock = s.sector!.toLowerCase().replace(/[\s&_-]/g, '');
          return normTarget === normStock || normStock.includes(normTarget) || normTarget.includes(normStock);
        });
      });
    }

    // Market cap filtering: defaults to $200M micro-cap exclusion unless explicitly configured
    const BASE_MIN_MARKET_CAP = 200_000_000;
    const effectiveMinCap = filter.minMarketCap !== undefined ? filter.minMarketCap : BASE_MIN_MARKET_CAP;
    if (effectiveMinCap > 0) {
      candidateStocks = candidateStocks.filter(s => s.marketCap >= effectiveMinCap);
    }

    if (filter.maxMarketCap && filter.maxMarketCap > 0) {
      candidateStocks = candidateStocks.filter(s => s.marketCap <= filter.maxMarketCap!);
    }

    return candidateStocks;
  }

  /**
   * Evaluates and runs a registered Strategy across candidate stocks
   */
  public async runStrategyScreener(
    strategyId: string,
    timeframe: Timeframe = '1D',
    filter: ScreenerFilter = {}
  ): Promise<ScreenerResponse & { strategyEvaluationSummary: { strategyId: string; strategyName: string; totalMatches: number } }> {
    const strategy = getStrategyDefinition(strategyId) || STRATEGY_REGISTRY[0];
    const candidateStocks = this.filterCandidates(filter);
    const startTime = performance.now();

    const items: ExtendedScreenerItem[] = [];

    // Evaluate candidates with bounded concurrency (batch of 10)
    const BATCH_SIZE = 10;
    for (let i = 0; i < candidateStocks.length; i += BATCH_SIZE) {
      const batch = candidateStocks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async stock => {
          try {
            const ctx = await indicatorCacheService.getEvaluatedContext(stock.ticker, timeframe);
            const evaluation = await indicatorCacheService.evaluateStrategyForStock(stock.ticker, strategy, timeframe);

            // Filter condition: matched if triggered, near trigger, or high score
            const isMatch = evaluation.state === 'TRIGGERED' || evaluation.state === 'NEAR_TRIGGER' || evaluation.confluenceScore >= 60;
            if (!isMatch && (filter.preset as string) !== 'ALL') {
              return null;
            }

            const item: ExtendedScreenerItem = {
              ticker: stock.ticker,
              name: stock.name,
              exchange: stock.exchange,
              sector: stock.sector,
              industry: stock.industry,
              price: ctx.price,
              change: Number((ctx.price * (ctx.changePercent / 100)).toFixed(2)),
              changePercent: ctx.changePercent,
              marketCap: ctx.marketCap,
              rsi: ctx.rsiValues[14] || 50,
              rsiStatus: ctx.rsiValues[14] <= 30 ? 'OVERSOLD' : ctx.rsiValues[14] >= 70 ? 'OVERBOUGHT' : 'NEUTRAL',
              rsiStatusLabel: ctx.rsiValues[14] <= 30 ? '超卖' : ctx.rsiValues[14] >= 70 ? '超买' : '中性',
              rsiPeriod: 14,
              timeframe,
              volume: ctx.volume,
              updatedAt: new Date().toISOString(),
              strategyEvaluation: evaluation,
              confluenceScore: evaluation.confluenceScore,
              strategyState: evaluation.state,
              rvol: ctx.rvol,
              atr: ctx.atr,
              atrPercent: ctx.atrPercent
            };
            return item;
          } catch (e) {
            return null;
          }
        })
      );

      for (const res of batchResults) {
        if (res) items.push(res);
      }
    }

    // Sort by Confluence Score or specified sortBy
    items.sort((a, b) => {
      if (filter.sortBy === 'changePercent') {
        return filter.sortOrder === 'asc' ? a.changePercent - b.changePercent : b.changePercent - a.changePercent;
      }
      if (filter.sortBy === 'rsi') {
        return filter.sortOrder === 'asc' ? a.rsi - b.rsi : b.rsi - a.rsi;
      }
      // Default: sort by highest Confluence Score, then by Market Cap
      const scoreDiff = (b.confluenceScore || 0) - (a.confluenceScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return b.marketCap - a.marketCap;
    });

    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.max(1, Math.min(200, filter.pageSize || 50));
    const total = items.length;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      results: paginatedItems,
      filterApplied: { ...filter, timeframe },
      scannedCount: candidateStocks.length,
      marketStatus: {
        isOpen: true,
        session: 'REGULAR',
        sessionLabel: '常规交易中',
        nyTime: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
        isHoliday: false
      },
      timestamp: new Date().toISOString(),
      executionTimeMs: Math.round(performance.now() - startTime),
      strategyEvaluationSummary: {
        strategyId: strategy.id,
        strategyName: strategy.name,
        totalMatches: total
      }
    };
  }

  /**
   * Evaluates an arbitrary custom ConditionGroup AST
   */
  public async runCustomASTScreener(
    rules: ConditionGroup,
    timeframe: Timeframe = '1D',
    filter: ScreenerFilter = {}
  ): Promise<ScreenerResponse> {
    const candidateStocks = this.filterCandidates(filter);
    const items: ExtendedScreenerItem[] = [];
    const dataErrors: Array<{ ticker: string; message: string }> = [];
    const startTime = performance.now();

    const BATCH_SIZE = 20;
    for (let i = 0; i < candidateStocks.length; i += BATCH_SIZE) {
      const batch = candidateStocks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async stock => {
          try {
            const ctx = await indicatorCacheService.getEvaluatedContext(stock.ticker, timeframe);
            const resultsCollector: ConditionEvaluationResult[] = [];
            const evalResult = ConditionEngine.evaluateGroup(rules, ctx, resultsCollector);

            const totalConditions = resultsCollector.length;
            const passedConditions = resultsCollector.filter(r => r.passed).length;
            const confluenceScore = totalConditions > 0 ? Math.round((passedConditions / totalConditions) * 100) : 50;

            // Tiered Confluence Matching:
            // 1. Full 100% trigger: all conditions satisfied
            // 2. Near-trigger: when total >= 3, N - 1 conditions satisfied (e.g. 2/3, 3/4)
            // 3. High confluence: pass rate >= 66% (e.g. 2/3, 4/5)
            const isFullTrigger = evalResult.passed;
            const isNearTrigger = !isFullTrigger && totalConditions >= 3 && passedConditions >= totalConditions - 1;
            const isHighConfluence = !isFullTrigger && totalConditions >= 2 && (passedConditions / totalConditions) >= 0.66;

            const isMatch = isFullTrigger || isNearTrigger || isHighConfluence;
            if (!isMatch) {
              return null;
            }

            let strategyState: StrategyState = 'WATCHING';
            let stateLabel = '正在观察 (Watching)';
            if (isFullTrigger) {
              strategyState = 'TRIGGERED';
              stateLabel = '已触发买入 (Triggered)';
            } else if (isNearTrigger || confluenceScore >= 75) {
              strategyState = 'NEAR_TRIGGER';
              stateLabel = '临界触发 (Near Trigger)';
            } else {
              strategyState = 'SETUP';
              stateLabel = '形态构筑中 (Setup)';
            }

            const item: ExtendedScreenerItem = {
              ticker: stock.ticker,
              name: stock.name,
              exchange: stock.exchange,
              sector: stock.sector,
              industry: stock.industry,
              price: ctx.price,
              change: Number((ctx.price * (ctx.changePercent / 100)).toFixed(2)),
              changePercent: ctx.changePercent,
              marketCap: ctx.marketCap,
              rsi: ctx.rsiValues[14] || 50,
              rsiStatus: ctx.rsiValues[14] <= 30 ? 'OVERSOLD' : ctx.rsiValues[14] >= 70 ? 'OVERBOUGHT' : 'NEUTRAL',
              rsiStatusLabel: ctx.rsiValues[14] <= 30 ? '超卖' : ctx.rsiValues[14] >= 70 ? '超买' : '中性',
              rsiPeriod: 14,
              timeframe,
              volume: ctx.volume,
              updatedAt: new Date().toISOString(),
              confluenceScore,
              strategyState,
              strategyEvaluation: {
                ticker: stock.ticker,
                strategyId: 'ast_screener',
                strategyName: 'Quantitative Screener',
                state: strategyState,
                stateLabel,
                confluenceScore,
                passedConditionsCount: passedConditions,
                totalConditionsCount: totalConditions,
                evaluatedAt: new Date().toISOString(),
                details: resultsCollector
              },
              rvol: ctx.rvol,
              atr: ctx.atr,
              atrPercent: ctx.atrPercent
            };
            return item;
          } catch (e) {
            dataErrors.push({
              ticker: stock.ticker,
              message: e instanceof Error ? e.message : String(e)
            });
            return null;
          }
        })
      );

      for (const res of batchResults) {
        if (res) items.push(res);
      }
    }

    // Sort items by priority: TRIGGERED (100% full match) first, then NEAR_TRIGGER, then by confluenceScore desc
    items.sort((a, b) => {
      const statePriority = (st?: string) => {
        if (st === 'TRIGGERED') return 3;
        if (st === 'NEAR_TRIGGER') return 2;
        if (st === 'SETUP') return 1;
        return 0;
      };
      const prioDiff = statePriority(b.strategyState) - statePriority(a.strategyState);
      if (prioDiff !== 0) return prioDiff;

      const confDiff = (b.confluenceScore || 0) - (a.confluenceScore || 0);
      if (confDiff !== 0) return confDiff;

      if (filter.sortBy === 'changePercent') {
        return filter.sortOrder === 'asc' ? a.changePercent - b.changePercent : b.changePercent - a.changePercent;
      }
      if (filter.sortBy === 'rsi') {
        return filter.sortOrder === 'asc' ? a.rsi - b.rsi : b.rsi - a.rsi;
      }
      return b.marketCap - a.marketCap;
    });

    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.max(1, Math.min(200, filter.pageSize || 50));
    const total = items.length;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      results: paginatedItems,
      filterApplied: { ...filter, timeframe },
      scannedCount: candidateStocks.length,
      evaluatedCount: candidateStocks.length - dataErrors.length,
      dataErrorCount: dataErrors.length,
      dataErrorSamples: dataErrors.slice(0, 5),
      executionTimeMs: Math.round(performance.now() - startTime),
      marketStatus: {
        isOpen: true,
        session: 'REGULAR',
        sessionLabel: '常规交易中',
        nyTime: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
        isHoliday: false
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Classic runScreener for backward-compatibility with existing presets
   */
  public async runScreener(filter: ScreenerFilter): Promise<ScreenerResponse> {
    // If filter has a classic strategy preset that maps to one of our core strategies, route smoothly
    if (filter.preset === 'DONCHIAN_BREAKOUT' as any) {
      return this.runStrategyScreener('donchian_breakout', filter.timeframe || '1D', filter);
    }
    if (filter.preset === 'DARVAS_BOX' as any) {
      return this.runStrategyScreener('darvas_box', filter.timeframe || '1D', filter);
    }
    if (filter.preset === 'CONNORS_RSI2' as any) {
      return this.runStrategyScreener('connors_rsi2', filter.timeframe || '1D', filter);
    }
    if (filter.preset === 'ELDER_IMPULSE' as any) {
      return this.runStrategyScreener('elder_impulse', filter.timeframe || '1D', filter);
    }
    if (filter.preset === 'MOMENTUM_FACTOR' as any) {
      return this.runStrategyScreener('momentum_factor', filter.timeframe || '1D', filter);
    }

    const period = filter.rsiPeriod || 14;
    const timeframe: Timeframe = filter.timeframe || '1D';
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.max(1, Math.min(200, filter.pageSize || 50));

    const candidateStocks = this.filterCandidates(filter);
    const items: ExtendedScreenerItem[] = [];

    // If no technical condition/preset or price filter is requested, we can directly sort candidate stocks, paginate, and enrich only the needed slice
    const hasTechnicalFilter = (!!filter.preset && filter.preset !== 'ALL' as any) || !!filter.rsiOperator || filter.minPrice !== undefined || filter.maxPrice !== undefined;

    if (!hasTechnicalFilter) {
      // Sort candidates by requested field (default: marketCap desc)
      const isAsc = filter.sortOrder === 'asc';
      const sortedCandidates = [...candidateStocks].sort((a, b) => {
        const valA = (a as any)[filter.sortBy || 'marketCap'] ?? a.marketCap ?? 0;
        const valB = (b as any)[filter.sortBy || 'marketCap'] ?? b.marketCap ?? 0;
        return isAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });

      const total = sortedCandidates.length;
      const targetSlice = sortedCandidates.slice((page - 1) * pageSize, page * pageSize);

      const quotes = await Promise.all(
        targetSlice.map(async stock => {
          try {
            const quote = await marketDataProvider.getQuote(stock.ticker, period, timeframe);
            return {
              ticker: stock.ticker,
              name: stock.name,
              exchange: stock.exchange,
              sector: stock.sector,
              industry: stock.industry,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              marketCap: stock.marketCap,
              rsi: quote.rsi.value,
              rsiPrevious: quote.rsi.previousValue,
              rsiChange: quote.rsi.change,
              rsiStatus: quote.rsi.status,
              rsiStatusLabel: quote.rsi.statusLabel,
              rsiPeriod: period,
              timeframe: timeframe,
              volume: quote.volume,
              updatedAt: quote.updatedAt
            } as ExtendedScreenerItem;
          } catch {
            return null;
          }
        })
      );

      const validResults = quotes.filter((q): q is ExtendedScreenerItem => q !== null);

      return {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        results: validResults,
        filterApplied: filter,
        scannedCount: total,
        marketStatus: {
          isOpen: true,
          session: 'REGULAR',
          sessionLabel: '常规交易中',
          nyTime: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
          isHoliday: false
        },
        timestamp: new Date().toISOString()
      };
    }

    // When a technical preset or rsiOperator is active, scan with bounded concurrency
    const BATCH_SIZE = 35;
    for (let i = 0; i < candidateStocks.length; i += BATCH_SIZE) {
      if (items.length >= Math.max(page * pageSize, 70)) {
        break;
      }
      const batch = candidateStocks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async stock => {
          try {
            const quote = await marketDataProvider.getQuote(stock.ticker, period, timeframe);
            const rsiVal = quote.rsi.value;
            let matches = true;

            if (filter.rsiOperator) {
              if (filter.rsiOperator === '<=' || filter.rsiOperator === '<') {
                matches = rsiVal <= (filter.rsiValue ?? 30);
              } else if (filter.rsiOperator === '>=' || filter.rsiOperator === '>') {
                matches = rsiVal >= (filter.rsiValue ?? 70);
              } else if (filter.rsiOperator === 'BETWEEN') {
                const min = filter.rsiMin ?? 30;
                const max = filter.rsiMax ?? 70;
                matches = rsiVal >= min && rsiVal <= max;
              }
            } else if (filter.preset) {
              switch (filter.preset) {
                case 'OVERSOLD_20':
                  matches = rsiVal <= 20;
                  break;
                case 'OVERSOLD_25':
                  matches = rsiVal <= 25;
                  break;
                case 'OVERSOLD_30':
                  matches = rsiVal <= 30;
                  break;
                case 'OVERSOLD_35':
                  matches = rsiVal <= 35;
                  break;
                case 'PULLBACK':
                  matches = rsiVal >= 30 && rsiVal <= 55;
                  break;
                case 'BREAKOUT':
                  matches = rsiVal >= 55 && quote.changePercent > 0;
                  break;
                case 'HIGH_REL_VOL':
                  matches = true;
                  break;
                case 'OVERBOUGHT_70':
                  matches = rsiVal >= 70;
                  break;
                case 'OVERBOUGHT_75':
                  matches = rsiVal >= 75;
                  break;
                case 'OVERBOUGHT_80':
                  matches = rsiVal >= 80;
                  break;
                default:
                  matches = true;
              }
            }

            if (filter.minPrice !== undefined && quote.price < filter.minPrice) {
              matches = false;
            }
            if (filter.maxPrice !== undefined && quote.price > filter.maxPrice) {
              matches = false;
            }

            if (!matches) return null;

            return {
              ticker: stock.ticker,
              name: stock.name,
              exchange: stock.exchange,
              sector: stock.sector,
              industry: stock.industry,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              marketCap: stock.marketCap,
              rsi: rsiVal,
              rsiPrevious: quote.rsi.previousValue,
              rsiChange: quote.rsi.change,
              rsiStatus: quote.rsi.status,
              rsiStatusLabel: quote.rsi.statusLabel,
              rsiPeriod: period,
              timeframe: timeframe,
              volume: quote.volume,
              updatedAt: quote.updatedAt
            } as ExtendedScreenerItem;
          } catch {
            return null;
          }
        })
      );

      for (const res of batchResults) {
        if (res) items.push(res);
      }
    }

    // Sort items
    items.sort((a, b) => {
      const field = filter.sortBy || 'marketCap';
      const order = filter.sortOrder || 'desc';
      const valA = (a as any)[field] ?? 0;
      const valB = (b as any)[field] ?? 0;
      return order === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    const total = items.length;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      results: paginatedItems,
      filterApplied: filter,
      scannedCount: candidateStocks.length,
      marketStatus: {
        isOpen: true,
        session: 'REGULAR',
        sessionLabel: '常规交易中',
        nyTime: new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York' }),
        isHoliday: false
      },
      timestamp: new Date().toISOString()
    };
  }
}

export const screenerService = new ScreenerService();
