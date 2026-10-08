import { ScreenerResultItem } from '../types.ts';

export interface AlphaFeatureConfig {
  id: string;
  name: string;
  category: 'PRICE_VOLUME' | 'VOLATILITY' | 'FUNDAMENTAL' | 'EARNINGS';
  weight: number; // e.g. 0.25 (25%)
  direction: 'ASCENDING' | 'DESCENDING'; // Higher is better vs Lower is better
}

export interface AlphaScoreResult {
  ticker: string;
  name: string;
  compositeScore: number; // Normalized 0 - 100
  zScoreComposite: number;
  rank: number;
  factorScores: Record<string, number>;
}

export class AlphaFactoryEngine {
  /**
   * Evaluates a cross-sectional universe of stock items using specified Alpha Feature weights
   * Returns normalized Z-Scores, percentiles, and unified composite ranks.
   */
  public calculateCrossSectionalAlpha(
    items: ScreenerResultItem[],
    features: AlphaFeatureConfig[]
  ): AlphaScoreResult[] {
    if (!items || items.length === 0) return [];

    const totalWeight = features.reduce((acc, f) => acc + f.weight, 0) || 1;
    const normalizedFeatures = features.map(f => ({ ...f, weight: f.weight / totalWeight }));

    // Extract raw feature vectors
    const featureVectors: Record<string, number[]> = {};

    normalizedFeatures.forEach(f => {
      featureVectors[f.id] = items.map(item => this.getRawValueForFeature(item, f.id));
    });

    // Compute mean and standard deviation for Z-Score calculation
    const featureStats: Record<string, { mean: number; std: number }> = {};

    normalizedFeatures.forEach(f => {
      const vals = featureVectors[f.id];
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
      const std = Math.sqrt(variance) || 1e-6;

      featureStats[f.id] = { mean, std };
    });

    // Compute composite score per stock item
    const rawScored = items.map((item, idx) => {
      let compositeZ = 0;
      const factorScores: Record<string, number> = {};

      normalizedFeatures.forEach(f => {
        const rawVal = featureVectors[f.id][idx];
        const stats = featureStats[f.id];
        let zScore = (rawVal - stats.mean) / stats.std;

        if (f.direction === 'DESCENDING') {
          zScore = -zScore;
        }

        compositeZ += zScore * f.weight;
        factorScores[f.id] = Number(zScore.toFixed(2));
      });

      return {
        ticker: item.ticker,
        name: item.name,
        compositeZ,
        factorScores
      };
    });

    // Sort descending by Composite Z-Score
    rawScored.sort((a, b) => b.compositeZ - a.compositeZ);

    const minZ = rawScored[rawScored.length - 1]?.compositeZ || -2;
    const maxZ = rawScored[0]?.compositeZ || 2;
    const zRange = Math.max(0.001, maxZ - minZ);

    return rawScored.map((item, index) => {
      const normalizedScore = ((item.compositeZ - minZ) / zRange) * 100;

      return {
        ticker: item.ticker,
        name: item.name,
        compositeScore: Number(normalizedScore.toFixed(1)),
        zScoreComposite: Number(item.compositeZ.toFixed(2)),
        rank: index + 1,
        factorScores: item.factorScores
      };
    });
  }

  private getRawValueForFeature(item: ScreenerResultItem, featureId: string): number {
    switch (featureId) {
      case 'rsi':
        return item.rsi || 50;
      case 'rvol':
        return item.rvol || item.relativeVolume || 1.0;
      case 'changePercent':
        return item.changePercent || 0;
      case 'marketCap':
        return item.marketCap || 1e9;
      case 'atrPercent':
        return item.atrPercent || 2.0;
      case 'confluenceScore':
        return item.confluenceScore || 50;
      default:
        return item.price || 100;
    }
  }
}

export const alphaFactoryEngine = new AlphaFactoryEngine();
