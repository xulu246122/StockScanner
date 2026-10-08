export interface RiskLimits {
  maxPositionSizePercent: number; // e.g. 10%
  maxPortfolioHeatPercent: number; // e.g. 25%
  maxDailyLossPercent: number;     // e.g. 3%
  maxSectorExposurePercent: number;// e.g. 30%
  stopLossDefaultPercent: number;  // e.g. 2.5%
}

export interface TradeRiskCheckRequest {
  ticker: string;
  sector: string;
  proposedPositionValue: number;
  portfolioTotalEquity: number;
  currentSectorExposureValue: number;
  currentOpenPositionsCount: number;
  dailyRealizedPnlPercent: number;
}

export interface RiskCheckResult {
  passed: boolean;
  allowedPositionValue: number;
  maxContractsOrShares: number;
  recommendedStopLossPrice: number;
  warnings: string[];
  invalidationReason?: string;
}

export class RiskManagementEngine {
  private defaultLimits: RiskLimits = {
    maxPositionSizePercent: 10,
    maxPortfolioHeatPercent: 25,
    maxDailyLossPercent: 3.0,
    maxSectorExposurePercent: 30,
    stopLossDefaultPercent: 2.5
  };

  /**
   * Validates whether a proposed trade complies with risk governance bounds.
   */
  public evaluateTradeRisk(
    req: TradeRiskCheckRequest,
    currentPrice: number,
    limits?: Partial<RiskLimits>
  ): RiskCheckResult {
    const activeLimits = { ...this.defaultLimits, ...limits };
    const warnings: string[] = [];

    // 1. Daily Loss Limit Check
    if (req.dailyRealizedPnlPercent <= -activeLimits.maxDailyLossPercent) {
      return {
        passed: false,
        allowedPositionValue: 0,
        maxContractsOrShares: 0,
        recommendedStopLossPrice: currentPrice * (1 - activeLimits.stopLossDefaultPercent / 100),
        warnings: [`Daily loss limit (${activeLimits.maxDailyLossPercent}%) exceeded`],
        invalidationReason: 'DAILY_LOSS_LIMIT_EXCEEDED'
      };
    }

    // 2. Max Position Size Check
    const maxAllowedPositionVal = (req.portfolioTotalEquity * activeLimits.maxPositionSizePercent) / 100;
    let allowedVal = Math.min(req.proposedPositionValue, maxAllowedPositionVal);

    if (req.proposedPositionValue > maxAllowedPositionVal) {
      warnings.push(`Position scaled down from $${req.proposedPositionValue.toFixed(0)} to $${maxAllowedPositionVal.toFixed(0)} (Max ${activeLimits.maxPositionSizePercent}%)`);
    }

    // 3. Sector Exposure Check
    const maxAllowedSectorVal = (req.portfolioTotalEquity * activeLimits.maxSectorExposurePercent) / 100;
    const projectSectorVal = req.currentSectorExposureValue + allowedVal;

    if (projectSectorVal > maxAllowedSectorVal) {
      const roomInSector = Math.max(0, maxAllowedSectorVal - req.currentSectorExposureValue);
      allowedVal = Math.min(allowedVal, roomInSector);
      warnings.push(`Position reduced due to sector concentration limit in ${req.sector}`);
    }

    const shares = Math.floor(allowedVal / (currentPrice || 1));
    const recommendedStopLossPrice = Number((currentPrice * (1 - activeLimits.stopLossDefaultPercent / 100)).toFixed(2));

    return {
      passed: shares > 0,
      allowedPositionValue: Number((shares * currentPrice).toFixed(2)),
      maxContractsOrShares: shares,
      recommendedStopLossPrice,
      warnings
    };
  }
}

export const riskManagementEngine = new RiskManagementEngine();
