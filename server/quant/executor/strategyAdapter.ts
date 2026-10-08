import {
  StrategyDefinition,
  StrategyModeType,
  StrategyParamConfig,
  ConditionGroup,
  ConditionNode,
  Timeframe
} from '../../types.ts';
import { resolveStrategyId } from '../strategies/strategyMigrationMap.ts';
import { ensureStrategyModes } from '../../../src/engine/strategyModesHelper.ts';

export interface StrategyValidationResult {
  valid: boolean;
  strategyId: string;
  errors: string[];
  warnings: string[];
  signalsValid: boolean;
  parametersValid: boolean;
  rulesValid: boolean;
  antiLookaheadCompliant: boolean;
}

export interface AdaptedExecutionConfig {
  strategy: StrategyDefinition;
  canonicalId: string;
  modeType: StrategyModeType;
  effectiveParameters: Record<string, any>;
  timeframe: Timeframe;
  signals: {
    entry: string[];
    confirmation: string[];
    exit: string[];
    rebalance: string[];
    riskModel: Record<string, any>;
  };
  antiLookaheadRules: string[];
}

export class StrategyAdapter {
  /**
   * Resolves any legacy or alias strategy ID into its canonical V2.0 ID.
   */
  public static resolveCanonicalId(id: string): string {
    return resolveStrategyId(id);
  }

  /**
   * Comprehensive validation of a StrategyDefinition across Schema, Parameters,
   * AST Rules, Signal Engine, Risk Framework, and Anti-Lookahead rules.
   */
  public static validate(strategy: StrategyDefinition): StrategyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!strategy || typeof strategy !== 'object') {
      return {
        valid: false,
        strategyId: 'unknown',
        errors: ['策略对象不能为空'],
        warnings: [],
        signalsValid: false,
        parametersValid: false,
        rulesValid: false,
        antiLookaheadCompliant: false
      };
    }

    const stratId = strategy.id || 'unknown';

    // 1. Core Metadata
    if (!strategy.id || typeof strategy.id !== 'string') errors.push('缺少策略唯一标识 id');
    if (!strategy.name || typeof strategy.name !== 'string') errors.push('缺少策略名称 name');
    if (!strategy.category) errors.push('缺少策略分类 category');
    if (!strategy.author) errors.push('缺少策略作者 author');

    // 2. Parameters Validation
    let parametersValid = true;
    if (!Array.isArray(strategy.parameters)) {
      errors.push('策略参数 parameters 必须为数组');
      parametersValid = false;
    } else {
      strategy.parameters.forEach((p, idx) => {
        if (!p.id) {
          errors.push(`第 ${idx + 1} 个参数缺少 id`);
          parametersValid = false;
        }
        if (p.default === undefined) {
          errors.push(`参数 [${p.id || idx}] 缺少默认值 default`);
          parametersValid = false;
        }
      });
    }

    // 3. AST Rules Validation
    let rulesValid = true;
    if (!strategy.rules || typeof strategy.rules !== 'object') {
      errors.push('缺少 AST 条件规则树 rules');
      rulesValid = false;
    } else {
      if (strategy.rules.type !== 'group') {
        errors.push('rules 根节点必须为 type="group"');
        rulesValid = false;
      }
      if (!Array.isArray(strategy.rules.children) || strategy.rules.children.length === 0) {
        errors.push('rules 规则树必须包含至少一个子条件');
        rulesValid = false;
      }
    }

    // 4. Signal Engine Validation
    let signalsValid = true;
    if (!Array.isArray(strategy.entry) || strategy.entry.length === 0) {
      errors.push('Signal Engine: 缺少 Entry (买入/做多入场信号定义)');
      signalsValid = false;
    }
    if (!Array.isArray(strategy.confirmation) || strategy.confirmation.length === 0) {
      errors.push('Signal Engine: 缺少 Confirmation (确认信号定义)');
      signalsValid = false;
    }
    if (!Array.isArray(strategy.exit) || strategy.exit.length === 0) {
      errors.push('Signal Engine: 缺少 Exit (出场/止盈止损离场信号定义)');
      signalsValid = false;
    }
    if (!Array.isArray(strategy.rebalance) || strategy.rebalance.length === 0) {
      errors.push('Signal Engine: 缺少 Rebalance (再平衡/仓位管理定义)');
      signalsValid = false;
    }
    if (!strategy.riskModel || typeof strategy.riskModel !== 'object') {
      errors.push('Signal Engine: 缺少 Risk Model (风控模型定义)');
      signalsValid = false;
    }

    // 5. Anti-Lookahead Bias Check
    let antiLookaheadCompliant = true;
    if (!Array.isArray(strategy.antiLookaheadRules) || strategy.antiLookaheadRules.length === 0) {
      errors.push('反未来函数检查: 缺少 antiLookaheadRules 定义');
      antiLookaheadCompliant = false;
    }

    return {
      valid: errors.length === 0,
      strategyId: stratId,
      errors,
      warnings,
      signalsValid,
      parametersValid,
      rulesValid,
      antiLookaheadCompliant
    };
  }

  /**
   * Extracts default parameter key-value pairs directly from StrategyDefinition.parameters.
   */
  public static extractParameters(strategy: StrategyDefinition): Record<string, any> {
    const params: Record<string, any> = {};
    if (Array.isArray(strategy.parameters)) {
      strategy.parameters.forEach(p => {
        params[p.id] = p.value !== undefined ? p.value : p.default;
      });
    }
    return params;
  }

  /**
   * Injects user parameters dynamically into AST condition leaves.
   */
  public static mapParametersIntoAST(node: ConditionGroup | ConditionNode, params: Record<string, any>): void {
    if (!node || !params) return;

    if (node.type === 'leaf') {
      const p = params;

      // 1. Special handling for BETWEEN range operator: NEVER overwrite object with scalar!
      if (node.operator === 'BETWEEN') {
        if (typeof node.value === 'object' && node.value !== null) {
          const curr = node.value as { min?: number; max?: number };
          if (node.indicatorId === 'rsi') {
            if (p.rsiMin !== undefined || p.rsiMax !== undefined) {
              node.value = {
                min: p.rsiMin !== undefined ? Number(p.rsiMin) : (curr.min ?? 30),
                max: p.rsiMax !== undefined ? Number(p.rsiMax) : (curr.max ?? 70)
              };
            } else if (p.rsiMid !== undefined) {
              const mid = Number(p.rsiMid);
              node.value = {
                min: Math.max(10, mid - 10),
                max: Math.min(90, mid + 15)
              };
            } else if (p.rsiBound !== undefined) {
              const bound = Number(p.rsiBound);
              node.value = {
                min: curr.min !== undefined ? Math.min(curr.min, bound - 5) : 30,
                max: Math.max(bound + 15, curr.max ?? 65)
              };
            }
          }
        }
        return;
      }

      // 2. Relative Volume
      if (node.indicatorId === 'relative_volume') {
        const rvolVal = p.minRvol ?? p.spikeRvol ?? p.rvolMin ?? p.rvolThreshold;
        if (rvolVal !== undefined) {
          node.value = Number(rvolVal);
        }
      }

      // 3. RSI (supports rsiThreshold, rsiOversold, rsiFilter, rsiBound, rsiLow, rsiLimit, rsiGate, rsiMid)
      if (node.indicatorId === 'rsi') {
        const rsiVal =
          p.rsiThreshold ??
          p.rsiOversold ??
          p.rsiFilter ??
          p.rsiBound ??
          p.rsiLow ??
          p.rsiLimit ??
          p.rsiGate ??
          p.rsiMid;
        if (rsiVal !== undefined) {
          node.value = Number(rsiVal);
        }
      }

      // 4. Distance from 52-week High
      if (node.indicatorId === 'distFrom52wHigh') {
        const distVal = p.distFromHigh ?? p.distTolerance;
        if (distVal !== undefined) {
          node.value = Number(distVal);
        }
      }

      // 5. ATR Percent
      if (node.indicatorId === 'atr_percent') {
        const atrVal = p.maxAtr ?? p.atrLimit ?? p.atrPercent;
        if (atrVal !== undefined) {
          node.value = Number(atrVal);
        }
      }

      // 6. Range ATR Multiple
      if (node.indicatorId === 'range_atr_multiple') {
        const mulVal = p.atrMultiplier ?? p.atrMultiple;
        if (mulVal !== undefined) {
          node.value = Number(mulVal);
        }
      }

      // 7. Price Change Percent (supports minChg, minGap, priceChange, minReturn)
      if (node.indicatorId === 'changePercent') {
        const chgVal = p.minChg ?? p.minGap ?? p.priceChange ?? p.minReturn;
        if (chgVal !== undefined) {
          node.value = Number(chgVal);
        }
      }

      // 8. ADX
      if (node.indicatorId === 'adx') {
        const adxVal = p.adxThreshold ?? p.adxMin;
        if (adxVal !== undefined) {
          node.value = Number(adxVal);
        }
      }

      // 9. Price Floor
      if (node.indicatorId === 'price') {
        const priceVal = p.minPrice ?? p.priceFloor;
        if (priceVal !== undefined) {
          node.value = Number(priceVal);
        }
      }

      // 10. Relative Strength vs SPY
      if (node.indicatorId === 'rs_vs_spy' || node.indicatorId === 'relative_strength') {
        const rsVal = p.minRs ?? p.minAlpha;
        if (rsVal !== undefined) {
          node.value = Number(rsVal);
        }
      }

      // 11. Market Cap
      if (node.indicatorId === 'marketCap' || node.indicatorId === 'market_cap') {
        if (p.minCap !== undefined) {
          const cap = Number(p.minCap);
          node.value = cap >= 1e6 ? cap : cap * 1e9;
        }
      }

      // 12. P/E Ratio
      if (node.indicatorId === 'peRatio' || node.indicatorId === 'pe_ratio') {
        const peVal = p.peFilter ?? p.maxPe;
        if (peVal !== undefined) {
          node.value = Number(peVal);
        }
      }

      // 13. Piotroski F-Score / Factor Score
      if (node.indicatorId === 'piotroskiScore' || node.indicatorId === 'piotroski_f_score' || node.indicatorId === 'f_score') {
        if (p.minScore !== undefined) {
          node.value = Number(p.minScore);
        }
      }

      // 14. Beta
      if (node.indicatorId === 'beta') {
        if (p.maxBeta !== undefined) {
          node.value = Number(p.maxBeta);
        }
      }
    } else if (node.type === 'group' && Array.isArray(node.children)) {
      node.children.forEach(child => this.mapParametersIntoAST(child, params));
    }
  }

  /**
   * Adapts a strategy into an executable configuration, applying mode, parameters, and AST mappings.
   */
  public static adapt(
    rawStrategy: StrategyDefinition,
    options?: {
      modeType?: StrategyModeType;
      parameters?: Record<string, any>;
      timeframe?: Timeframe;
    }
  ): AdaptedExecutionConfig {
    const canonicalId = this.resolveCanonicalId(rawStrategy.id);
    const prepared = ensureStrategyModes(JSON.parse(JSON.stringify(rawStrategy)));
    const targetMode: StrategyModeType = options?.modeType || prepared.defaultMode || 'swing';

    // 1. Merge Parameters (Base defaults -> Mode defaults -> User overrides)
    const baseParams = this.extractParameters(prepared);
    let modeParams: Record<string, any> = {};
    if (prepared.modes && prepared.modes[targetMode]) {
      modeParams = prepared.modes[targetMode].parameters || {};
    }
    const effectiveParameters = {
      ...baseParams,
      ...modeParams,
      ...(options?.parameters || {})
    };

    // 2. Clone and update Strategy parameters array
    if (Array.isArray(prepared.parameters)) {
      prepared.parameters = (prepared.parameters as StrategyParamConfig[]).map(p => ({
        ...p,
        value: effectiveParameters[p.id] !== undefined ? effectiveParameters[p.id] : p.default
      }));
    }

    // 3. Inject into AST
    this.mapParametersIntoAST(prepared.rules, effectiveParameters);

    // 4. Determine effective timeframe
    const effectiveTimeframe: Timeframe =
      options?.timeframe ||
      prepared.modes?.[targetMode]?.defaultTimeframe ||
      prepared.defaultTimeframes?.[0] ||
      '1D';

    return {
      strategy: prepared,
      canonicalId,
      modeType: targetMode,
      effectiveParameters,
      timeframe: effectiveTimeframe,
      signals: {
        entry: prepared.entry || ['触发 AST 入场条件'],
        confirmation: prepared.confirmation || ['次日开盘确认'],
        exit: prepared.exit || ['触及止损止盈或时间截止'],
        rebalance: prepared.rebalance || ['按标准头寸比例再平衡'],
        riskModel: prepared.riskModel || {}
      },
      antiLookaheadRules: prepared.antiLookaheadRules || ['严格基于历史封板数据计算']
    };
  }
}
