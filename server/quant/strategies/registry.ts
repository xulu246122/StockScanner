import { StrategyDefinition, StrategyCategory } from '../../types.ts';
import { ensureStrategyModes } from '../../../src/engine/strategyModesHelper.ts';
import { resolveStrategyId } from './strategyMigrationMap.ts';
import {
  ALL_QUANT_CATALOG_MODELS,
  SHORT_TERM_MODELS,
  SWING_MODELS,
  POSITION_MODELS
} from './catalog/index.ts';

export {
  SHORT_TERM_MODELS,
  SWING_MODELS,
  POSITION_MODELS
};

export const RAW_STRATEGY_REGISTRY: StrategyDefinition[] = ALL_QUANT_CATALOG_MODELS;

export const QUANT_STRATEGY_REGISTRY: StrategyDefinition[] = RAW_STRATEGY_REGISTRY.map(s => ensureStrategyModes(s));

/**
 * Retrieves a strategy definition by ID or legacy alias.
 * Automatically resolves legacy IDs via strategyMigrationMap to guarantee zero 404s.
 */
export function getQuantStrategy(id: string): StrategyDefinition | undefined {
  if (!id) return undefined;
  const canonicalId = resolveStrategyId(id);
  const found = QUANT_STRATEGY_REGISTRY.find(s => s.id === canonicalId || s.id === id);
  return found ? ensureStrategyModes(found) : undefined;
}

export function getStrategiesByCategory(category: StrategyCategory | string): StrategyDefinition[] {
  return QUANT_STRATEGY_REGISTRY.filter(s => s.category === category);
}

export function getStrategiesByMode(mode: 'SHORT_TERM' | 'SWING' | 'POSITION' | string): StrategyDefinition[] {
  const normMode = mode.toUpperCase();
  return QUANT_STRATEGY_REGISTRY.filter(s => {
    if (s.mode === normMode) return true;
    if (normMode === 'SHORT_TERM' && (s.family === 'short_term')) return true;
    if (normMode === 'SWING' && (s.family === 'swing')) return true;
    if (normMode === 'POSITION' && (s.family === 'position' || s.family === 'factor')) return true;
    return false;
  });
}

// Backwards-compatible aliases
export const STRATEGY_REGISTRY = QUANT_STRATEGY_REGISTRY;
export const getStrategyDefinition = getQuantStrategy;
