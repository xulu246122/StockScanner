import { StrategyDefinition } from '../../../types.ts';
import { SHORT_TERM_MODELS } from './shortTermModels.ts';
import { SWING_MODELS } from './swingModels.ts';
import { POSITION_MODELS } from './positionModels.ts';

export {
  SHORT_TERM_MODELS,
  SWING_MODELS,
  POSITION_MODELS
};

/**
 * STRATEGY LIBRARY V2.0 - MASTER CATALOG
 * Total Verified Strategies: 72 Models
 * - SHORT_TERM (1-10 Trading Days): 24 Models
 * - SWING (5-20 Trading Days): 24 Models
 * - POSITION (1-12 Months): 24 Models
 */
export const ALL_QUANT_CATALOG_MODELS: StrategyDefinition[] = [
  ...SHORT_TERM_MODELS,
  ...SWING_MODELS,
  ...POSITION_MODELS
];
