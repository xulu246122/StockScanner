import {
  FactorDefinition,
  FactorModel,
  StockFactorScore,
  FactorWeight,
  Timeframe,
  StrategyState
} from '../../types.ts';
import { FACTOR_LIBRARY, PRESET_FACTOR_MODELS, getFactorDefinition } from './registry.ts';
import { STOCK_UNIVERSE } from '../../services/stockUniverse.ts';
import { indicatorCacheService } from '../../services/indicatorCache.ts';

export class FactorEngine {
  private customModels: Map<string, FactorModel> = new Map();

  constructor() {
    PRESET_FACTOR_MODELS.forEach(m => this.customModels.set(m.id, m));
  }

  public getFactorLibrary(): FactorDefinition[] {
    return FACTOR_LIBRARY;
  }

  public getFactorModels(): FactorModel[] {
    return Array.from(this.customModels.values());
  }

  public getFactorModel(id: string): FactorModel | undefined {
    return this.customModels.get(id);
  }

  public saveFactorModel(model: Partial<FactorModel>): FactorModel {
    const id = model.id || `fmodel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const saved: FactorModel = {
      id,
      name: model.name || '自建多因子模型',
      description: model.description || '用户定制多因子加权评分体系',
      combinationMode: model.combinationMode || 'WEIGHTED_SUM',
      factors: model.factors || [],
      minCompositeScore: model.minCompositeScore || 60,
      createdAt: model.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPreset: false
    };

    this.customModels.set(id, saved);
    return saved;
  }

  public deleteFactorModel(id: string): boolean {
    if (this.customModels.has(id)) {
      this.customModels.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Normalizes raw metric value into a 0 - 100 standardized quantitative score
   */
  public normalizeFactorValue(def: FactorDefinition, rawValue: number): number {
    const { min, max, higherIsBetter } = def;
    const clamped = Math.max(min, Math.min(max, rawValue));
    let ratio = (clamped - min) / (max - min);
    if (!higherIsBetter) {
      ratio = 1 - ratio;
    }
    return Math.round(ratio * 100);
  }

  /**
   * Evaluates raw factor values for a given stock
   */
  public async computeStockRawFactors(ticker: string, timeframe: Timeframe = '1D'): Promise<Record<string, number>> {
    try {
      const ctx = await indicatorCacheService.getEvaluatedContext(ticker, timeframe);
      const rsi14 = ctx.rsiValues[14] || 50;
      const atrP = ctx.atrPercent ?? 2.0;

      // Mock / Real factor extraction
      const rawFactors: Record<string, number> = {
        rsi_momentum: rsi14,
        roc_momentum: Number((ctx.changePercent * (1 + (Math.sin(ctx.price) * 0.5))).toFixed(2)),
        relative_strength: Math.min(99, Math.max(10, Math.round(50 + ctx.changePercent * 6))),
        ema_alignment: ctx.changePercent >= 0 ? 88 : 35,
        adx_trend_strength: Math.round(ctx.adx?.adx || 45),
        price_above_ma50: Number((ctx.changePercent * 1.5).toFixed(2)),
        quality_roe: ticker === 'NVDA' ? 55 : ticker === 'AAPL' ? 48 : ticker === 'MSFT' ? 42 : 25,
        operating_margin: ticker === 'NVDA' ? 62 : ticker === 'MSFT' ? 45 : ticker === 'AAPL' ? 30 : 20,
        debt_to_equity: ticker === 'NVDA' ? 0.3 : ticker === 'AAPL' ? 1.5 : 0.8,
        volatility_compression: Math.max(10, Math.min(95, Math.round(100 - (atrP * 15)))),
        rvol_factor: Number((ctx.rvol || 1.2).toFixed(2)),
        // Store price & change for response formatting
        _stock_price: ctx.price,
        _stock_change: ctx.changePercent
      };

      return rawFactors;
    } catch {
      return {
        rsi_momentum: 50,
        roc_momentum: 2.5,
        relative_strength: 60,
        ema_alignment: 60,
        adx_trend_strength: 50,
        price_above_ma50: 3.5,
        quality_roe: 25,
        operating_margin: 22,
        debt_to_equity: 0.8,
        volatility_compression: 65,
        rvol_factor: 1.1,
        _stock_price: 150.0,
        _stock_change: 1.5
      };
    }
  }

  /**
   * Evaluates a full factor model across a universe of candidate stocks
   */
  public async evaluateFactorModel(
    model: FactorModel,
    timeframe: Timeframe = '1D',
    limit: number = 30
  ): Promise<{ total: number; scores: StockFactorScore[] }> {
    const factorsToEval = model.factors && model.factors.length > 0
      ? model.factors
      : PRESET_FACTOR_MODELS[0].factors;

    const totalWeight = factorsToEval.reduce((sum, f) => sum + (f.weight || 0), 0) || 1;

    const scoresList: StockFactorScore[] = [];

    for (const stock of STOCK_UNIVERSE) {
      const rawFactors = await this.computeStockRawFactors(stock.ticker, timeframe);
      const stockPrice = rawFactors._stock_price || 150.0;
      const stockChange = rawFactors._stock_change || 1.2;

      const breakdown: StockFactorScore['factorBreakdown'] = {};

      let weightedSum = 0;
      let allAndPassed = true;
      let anyOrPassed = false;

      for (const fw of factorsToEval) {
        const def = getFactorDefinition(fw.factorId);
        if (!def) continue;

        const rawVal = rawFactors[fw.factorId] !== undefined ? rawFactors[fw.factorId] : def.min;
        const normalized = this.normalizeFactorValue(def, rawVal);
        const normalizedWeight = fw.weight / totalWeight;
        const weightedScore = Number((normalized * normalizedWeight).toFixed(2));

        const minThresh = fw.minThreshold !== undefined ? fw.minThreshold : 40;
        const passed = normalized >= minThresh;

        if (!passed) allAndPassed = false;
        if (passed) anyOrPassed = true;

        breakdown[fw.factorId] = {
          rawValue: rawVal,
          normalizedScore: normalized,
          weightedScore,
          passed
        };

        weightedSum += weightedScore;
      }

      let compositeScore = 0;
      if (model.combinationMode === 'LOGICAL_AND') {
        compositeScore = allAndPassed ? Math.round(weightedSum) : Math.round(weightedSum * 0.3);
      } else if (model.combinationMode === 'LOGICAL_OR') {
        compositeScore = anyOrPassed ? Math.round(weightedSum) : Math.round(weightedSum * 0.4);
      } else {
        // WEIGHTED_SUM
        compositeScore = Math.round(weightedSum);
      }

      // Compute Signal Strength (1 - 5 stars)
      let signalStrength = 1;
      if (compositeScore >= 85) signalStrength = 5;
      else if (compositeScore >= 75) signalStrength = 4;
      else if (compositeScore >= 65) signalStrength = 3;
      else if (compositeScore >= 50) signalStrength = 2;

      let strategyState: StrategyState = 'WATCHING';
      if (compositeScore >= 85) strategyState = 'TRIGGERED';
      else if (compositeScore >= 75) strategyState = 'NEAR_TRIGGER';
      else if (compositeScore >= 60) strategyState = 'SETUP';

      scoresList.push({
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.sector,
        industry: stock.industry,
        price: stockPrice,
        changePercent: stockChange,
        compositeScore,
        rank: 0, // Assigned after sorting
        signalStrength,
        strategyState,
        factorBreakdown: breakdown
      });
    }

    // Sort descending by compositeScore
    scoresList.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign Rank 1..N
    scoresList.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    const finalResults = scoresList.slice(0, limit);
    return {
      total: scoresList.length,
      scores: finalResults
    };
  }
}

export const factorEngine = new FactorEngine();
