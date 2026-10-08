import {
  StrategyDefinition,
  StrategyCategory,
  ConditionGroup,
  ConditionNode,
  StrategyParamConfig,
  StrategyRiskFramework,
  SavedStrategy,
  Timeframe,
  StrategyModeType,
  StrategyModeConfig,
  StrategyEvaluation,
  BacktestConfig,
  BacktestResult,
  PriceBar
} from '../types.ts';
import { MOCK_QUANT_STRATEGIES } from '../mock/quantStrategiesMock.ts';
import { ensureStrategyModes } from './strategyModesHelper.ts';
import { StrategyAdapter, StrategyValidationResult } from './strategyAdapter.ts';
import { StrategyExecutor } from './strategyExecutor.ts';
import { EvaluatedDataContext } from '../../server/quant/conditions/conditionEngine.ts';

// ============================================================================
// 1. STRATEGY JSON SCHEMA DEFINITION & COMPATIBILITY TYPES
// ============================================================================

export interface StrategyJsonRisk {
  entryReference?: string;
  invalidation?: string;
  stopLossRule?: string;
  profitTargetRule?: string;
  riskWarning?: string;
}

export interface StrategyJsonSchema {
  id?: string;
  name: string;
  author: string;
  category: StrategyCategory;
  timeframe: string | string[];
  rules: ConditionGroup;
  parameters: StrategyParamConfig[];
  risk: StrategyJsonRisk;
  // Optional extended metadata
  shortName?: string;
  description?: string;
  horizon?: string;
  direction?: 'LONG' | 'SHORT' | 'BOTH';
  origin?: string;
  evidenceLevel?: 'LEVEL_A' | 'LEVEL_B' | 'LEVEL_C';
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateStrategySchema(data: any): SchemaValidationResult {
  const res = StrategyAdapter.validate(data);
  return {
    valid: res.valid,
    errors: res.errors
  };
}

// ============================================================================
// 2. STRATEGY ENGINE CORE IMPLEMENTATION (V2.0 QUANT INTEGRATION)
// ============================================================================

class StrategyEngineImpl {
  private builtInStrategies: Map<string, StrategyDefinition> = new Map();
  private userCustomStrategies: Map<string, StrategyDefinition> = new Map();

  constructor() {
    this.initBuiltIns();
    this.loadPersistedCustomStrategies();
  }

  private initBuiltIns() {
    MOCK_QUANT_STRATEGIES.forEach(st => {
      const prepared = ensureStrategyModes(JSON.parse(JSON.stringify(st)));
      this.builtInStrategies.set(prepared.id, prepared);
    });
  }

  private loadPersistedCustomStrategies() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('quant_user_custom_strategies');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: StrategyDefinition) => {
              if (item.id) {
                const prepared = ensureStrategyModes(item);
                this.userCustomStrategies.set(item.id, prepared);
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('StrategyEngine: Could not read custom strategies from localStorage', e);
    }
  }

  private persistCustomStrategies() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const arr = Array.from(this.userCustomStrategies.values());
        localStorage.setItem('quant_user_custom_strategies', JSON.stringify(arr));
      }
    } catch (e) {
      console.warn('StrategyEngine: Could not persist custom strategies', e);
    }
  }

  // --------------------------------------------------------------------------
  // Method 1: Load Strategy (Loads canonical ID or resolves legacy alias)
  // --------------------------------------------------------------------------
  public loadStrategy(id: string): StrategyDefinition | null {
    if (!id) return null;
    const canonicalId = StrategyAdapter.resolveCanonicalId(id);

    if (this.userCustomStrategies.has(id)) {
      return ensureStrategyModes(JSON.parse(JSON.stringify(this.userCustomStrategies.get(id))));
    }
    if (this.builtInStrategies.has(canonicalId)) {
      return ensureStrategyModes(JSON.parse(JSON.stringify(this.builtInStrategies.get(canonicalId))));
    }
    if (this.builtInStrategies.has(id)) {
      return ensureStrategyModes(JSON.parse(JSON.stringify(this.builtInStrategies.get(id))));
    }
    return null;
  }

  public getAllStrategies(filter?: { category?: StrategyCategory | string; search?: string; mode?: string }): StrategyDefinition[] {
    const all = [
      ...Array.from(this.builtInStrategies.values()),
      ...Array.from(this.userCustomStrategies.values())
    ].map(st => ensureStrategyModes(st));

    return all.filter(st => {
      if (filter?.category && filter.category !== 'ALL' && st.category !== filter.category) return false;
      if (filter?.mode && filter.mode !== 'ALL') {
        const target = filter.mode.toUpperCase();
        if (st.mode !== target && st.family !== filter.mode.toLowerCase()) return false;
      }
      if (filter?.search) {
        const q = filter.search.toLowerCase();
        return (
          st.name.toLowerCase().includes(q) ||
          st.shortName.toLowerCase().includes(q) ||
          st.author.toLowerCase().includes(q) ||
          st.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  // --------------------------------------------------------------------------
  // Method 2: Modify Parameters (Dynamic AST Injection via StrategyAdapter)
  // --------------------------------------------------------------------------
  public modifyParameters(
    strategy: StrategyDefinition,
    newParams: Record<string, any>,
    modeType?: StrategyModeType
  ): StrategyDefinition {
    const adapted = StrategyAdapter.adapt(strategy, {
      modeType,
      parameters: newParams
    });
    return adapted.strategy;
  }

  // --------------------------------------------------------------------------
  // Method 3: Validate Strategy
  // --------------------------------------------------------------------------
  public validate(strategy: StrategyDefinition): StrategyValidationResult {
    return StrategyAdapter.validate(strategy);
  }

  // --------------------------------------------------------------------------
  // Method 4: Execute Strategy on Stock Context
  // --------------------------------------------------------------------------
  public executeStrategy(
    strategy: StrategyDefinition,
    ctx: EvaluatedDataContext,
    options?: { modeType?: StrategyModeType; parameters?: Record<string, any> }
  ): StrategyEvaluation {
    return StrategyExecutor.execute(strategy, ctx, options);
  }

  // --------------------------------------------------------------------------
  // Method 5: Vectorized Backtest Simulation
  // --------------------------------------------------------------------------
  public runSimulation(
    strategy: StrategyDefinition,
    config: BacktestConfig,
    bars: PriceBar[] = []
  ): BacktestResult {
    return StrategyExecutor.runBacktest(strategy, config, bars);
  }

  // --------------------------------------------------------------------------
  // Method 6: Save User Custom Strategy
  // --------------------------------------------------------------------------
  public saveStrategy(input: Partial<StrategyJsonSchema> & { baseStrategyId?: string }): {
    success: boolean;
    saved?: StrategyDefinition;
    errors?: string[];
  } {
    const id = input.id || `custom_strategy_${Date.now()}`;
    const fullStrategyData: StrategyDefinition = {
      id,
      name: input.name || '未命名自建量化策略',
      shortName: input.shortName || input.name || '自建策略',
      author: input.author || 'Custom Quant User',
      category: input.category || 'CLASSIC',
      categoryLabel: input.category === 'MULTI_FACTOR' ? '多因子模型 (Custom)' : input.category === 'TECHNICAL' ? '技术指标策略 (Custom)' : '经典交易策略 (Custom)',
      family: 'swing',
      horizon: input.horizon || '1-10 Trading Days',
      direction: input.direction || 'LONG',
      origin: input.origin || 'User-defined parameter model',
      sourceReference: input.origin || 'Custom Strategy Reference',
      sourceType: 'ESTABLISHED_PRACTITIONER',
      evidenceLevel: input.evidenceLevel || 'LEVEL_B',
      description: input.description || '基于量化策略引擎微调的自建策略规则。',
      rules: input.rules || {
        type: 'group',
        id: `${id}_root`,
        logicalOperator: 'AND',
        children: [
          { type: 'leaf', id: 'leaf_rvol', indicatorId: 'relative_volume', operator: 'GTE', value: 1.2, label: '放量' }
        ]
      },
      parameters: input.parameters || [
        { id: 'minRvol', name: '最低放量倍数', type: 'number', default: 1.2, min: 1.0, max: 3.0, step: 0.1, description: 'RVOL' }
      ],
      entry: ['触发 AST 入场规则'],
      confirmation: ['次日开盘确认'],
      exit: ['达到目标收益或触发止损平仓'],
      rebalance: ['按账户净值 1% 风险计算头寸'],
      riskModel: {
        maxRiskPerTradePercent: 1.0,
        stopLossRule: input.risk?.stopLossRule || '4.0% - 6.0% 严格止损',
        profitTargetRule: input.risk?.profitTargetRule || '移动止盈 trailing stop',
        invalidationThreshold: input.risk?.invalidation || '跌破入场最低价',
        maxHoldingPeriodBars: 10
      },
      antiLookaheadRules: ['基于已收盘的历史数据计算，无未来函数'],
      defaultTimeframes: (Array.isArray(input.timeframe) ? input.timeframe : [input.timeframe || '1D']) as Timeframe[],
      tags: input.tags || ['自建策略', '参数微调', '自定义'],
      version: '2.0.0'
    };

    // Validate using StrategyAdapter
    const validation = StrategyAdapter.validate(fullStrategyData);
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    // Persist to engine map & storage
    const prepared = ensureStrategyModes(fullStrategyData);
    this.userCustomStrategies.set(id, prepared);
    this.persistCustomStrategies();

    return {
      success: true,
      saved: prepared
    };
  }

  // --------------------------------------------------------------------------
  // Delete Custom Strategy
  // --------------------------------------------------------------------------
  public deleteCustomStrategy(id: string): boolean {
    if (this.userCustomStrategies.has(id)) {
      this.userCustomStrategies.delete(id);
      this.persistCustomStrategies();
      return true;
    }
    return false;
  }
}

export const strategyEngine = new StrategyEngineImpl();
