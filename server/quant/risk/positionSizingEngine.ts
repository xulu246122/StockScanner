import {
  PositionSizingParams,
  PositionSizingResult
} from '../../types/trading.ts';

/**
 * PositionSizingEngine
 * 
 * Implements institutional quantitative capital allocation and position sizing models:
 * 1. Half-Kelly Criterion (半凯利公式) - mathematically optimal long-term growth with drawdown dampening
 * 2. Fixed Risk % (固定单笔风控额度) - capital loss strictly bounded to 1-2% of total equity
 * 3. Volatility Parity / ATR Sizing (波动率平价) - normalize risk exposure across volatile vs quiet assets
 */
export class PositionSizingEngine {
  /**
   * Calculate position sizing based on chosen quantitative model
   */
  public static calculate(params: PositionSizingParams): PositionSizingResult {
    const {
      method,
      accountEquity,
      entryPrice,
      stopLossPrice,
      targetPrice,
      winRate = 0.60,
      riskRewardRatio = 1.8,
      atr,
      fixedRiskPercent = 1.0,
      customShares
    } = params;

    const safeEquity = Math.max(1000, accountEquity);
    const safeEntry = Math.max(0.1, entryPrice);
    const perShareRisk = Math.max(0.01, Math.abs(safeEntry - stopLossPrice));

    switch (method) {
      case 'HALF_KELLY': {
        // Kelly formula: f = (p * b - q) / b
        // Half-Kelly: f_half = 0.5 * f
        const p = Math.min(0.95, Math.max(0.05, winRate));
        const q = 1 - p;
        const b = Math.max(0.2, riskRewardRatio);

        const rawKelly = (p * b - q) / b;
        // Dampen with Half-Kelly and clamp between 0.02 and 0.20 (2% to 20% max portfolio allocation)
        const halfKelly = Math.max(0.02, Math.min(0.20, (rawKelly > 0 ? rawKelly * 0.5 : 0.02)));
        const targetNotional = safeEquity * halfKelly;
        const recommendedShares = Math.max(1, Math.floor(targetNotional / safeEntry));
        const notionalValue = Number((recommendedShares * safeEntry).toFixed(2));
        const accountRiskAmount = Number((recommendedShares * perShareRisk).toFixed(2));
        const accountRiskPercent = Number(((accountRiskAmount / safeEquity) * 100).toFixed(2));

        return {
          method: 'HALF_KELLY',
          recommendedShares,
          notionalValue,
          accountRiskAmount,
          accountRiskPercent,
          kellyFraction: Number(halfKelly.toFixed(4)),
          rationale: `基于半凯利公式 (胜率 ${(p * 100).toFixed(0)}%, 盈亏比 1:${b.toFixed(1)}), 最优建议仓位占比 ${(halfKelly * 100).toFixed(1)}%, 分配资金 $${notionalValue.toLocaleString()}。`
        };
      }

      case 'FIXED_RISK': {
        // Risk dollars = Equity * fixedRiskPercent
        const riskFraction = Math.max(0.001, Math.min(0.05, fixedRiskPercent / 100));
        const maxDollarRisk = safeEquity * riskFraction;
        const recommendedShares = Math.max(1, Math.floor(maxDollarRisk / perShareRisk));
        const notionalValue = Number((recommendedShares * safeEntry).toFixed(2));
        const accountRiskAmount = Number((recommendedShares * perShareRisk).toFixed(2));
        const accountRiskPercent = Number(((accountRiskAmount / safeEquity) * 100).toFixed(2));

        return {
          method: 'FIXED_RISK',
          recommendedShares,
          notionalValue,
          accountRiskAmount,
          accountRiskPercent,
          rationale: `硬风控严格控制单笔最大亏损不超过账户净值的 ${fixedRiskPercent.toFixed(1)}% ($${maxDollarRisk.toFixed(0)}), 按每股止损空间 $${perShareRisk.toFixed(2)} 自动倒算买入 ${recommendedShares} 股。`
        };
      }

      case 'VOLATILITY_PARITY': {
        // Volatility Parity uses 1.5 * ATR as unit stop distance
        const effectiveUnitRisk = atr && atr > 0 ? atr * 1.5 : perShareRisk;
        const riskFraction = Math.max(0.001, Math.min(0.05, fixedRiskPercent / 100));
        const maxDollarRisk = safeEquity * riskFraction;
        const recommendedShares = Math.max(1, Math.floor(maxDollarRisk / effectiveUnitRisk));
        const notionalValue = Number((recommendedShares * safeEntry).toFixed(2));
        const accountRiskAmount = Number((recommendedShares * perShareRisk).toFixed(2));
        const accountRiskPercent = Number(((accountRiskAmount / safeEquity) * 100).toFixed(2));

        return {
          method: 'VOLATILITY_PARITY',
          recommendedShares,
          notionalValue,
          accountRiskAmount,
          accountRiskPercent,
          rationale: `波动率平价 (ATR=${atr ? atr.toFixed(2) : perShareRisk.toFixed(2)}), 标准化单笔波动风险敞口为账户净值的 ${fixedRiskPercent.toFixed(1)}%。`
        };
      }

      case 'CUSTOM_SHARES':
      default: {
        const shares = Math.max(1, customShares || Math.floor((safeEquity * 0.05) / safeEntry));
        const notionalValue = Number((shares * safeEntry).toFixed(2));
        const accountRiskAmount = Number((shares * perShareRisk).toFixed(2));
        const accountRiskPercent = Number(((accountRiskAmount / safeEquity) * 100).toFixed(2));

        return {
          method: 'CUSTOM_SHARES',
          recommendedShares: shares,
          notionalValue,
          accountRiskAmount,
          accountRiskPercent,
          rationale: `自定义交易股数 ${shares} 股, 名义本金 $${notionalValue.toLocaleString()}, 触发止损时账户实际风险 $${accountRiskAmount.toFixed(0)} (${accountRiskPercent}%)。`
        };
      }
    }
  }
}
