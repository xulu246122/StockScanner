import { PositionSizeResult } from '../types.ts';

export class RiskEngine {
  public calculatePositionSize(
    accountSize: number = 100000,
    maxRiskPercent: number = 1.0,
    entryPrice: number,
    stopLossPrice: number
  ): PositionSizeResult {
    const riskCapital = Number(((accountSize * maxRiskPercent) / 100).toFixed(2));
    const riskPerShare = Math.abs(entryPrice - stopLossPrice);

    const stopDistancePercent = Number(((riskPerShare / entryPrice) * 100).toFixed(2));
    const isRiskValid = stopDistancePercent <= 5.05;

    if (riskPerShare <= 0) {
      return {
        accountSize,
        maxRiskPercent,
        riskCapital,
        entryPrice,
        stopLossPrice,
        riskPerShare: 0,
        shares: 0,
        positionValue: 0,
        portfolioExposurePercent: 0,
        isRiskValid: false,
        invalidationMessage: '止损价与入场价相同，无法计算风险'
      };
    }

    const calculatedShares = Math.floor(riskCapital / riskPerShare);
    const positionValue = Number((calculatedShares * entryPrice).toFixed(2));
    const portfolioExposurePercent = Number(((positionValue / accountSize) * 100).toFixed(2));

    let invalidationMessage: string | undefined = undefined;
    if (!isRiskValid) {
      invalidationMessage = `结构止损幅度 (${stopDistancePercent}%) 超过了 5.0% 的硬性最大风险上限，严禁执行此交易！`;
    }

    return {
      accountSize,
      maxRiskPercent,
      riskCapital,
      entryPrice,
      stopLossPrice,
      riskPerShare: Number(riskPerShare.toFixed(2)),
      shares: calculatedShares,
      positionValue,
      portfolioExposurePercent,
      isRiskValid,
      invalidationMessage
    };
  }
}

export const riskEngine = new RiskEngine();
