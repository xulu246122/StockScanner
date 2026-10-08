import { BrokerPosition } from '../../types/trading.ts';

export interface TrailingStopEvaluationResult {
  updatedPosition: BrokerPosition;
  isTriggered: boolean;
  triggerType?: 'TAKE_PROFIT' | 'HARD_STOP_LOSS' | 'TRAILING_STOP' | 'BREAK_EVEN_STOP';
  triggerPrice?: number;
  message?: string;
}

export class TrailingStopEngine {
  /**
   * Evaluate and update a position with dynamic trailing stop and break-even logic
   */
  public static evaluatePosition(
    position: BrokerPosition,
    newCurrentPrice: number,
    trailingStopPercent = 1.5,
    breakEvenTriggerPercent = 50.0
  ): TrailingStopEvaluationResult {
    const updated: BrokerPosition = { ...position };
    updated.currentPrice = newCurrentPrice;
    updated.marketValue = Number((updated.qty * newCurrentPrice).toFixed(2));
    updated.unrealizedPnL = Number(((newCurrentPrice - updated.avgEntryPrice) * updated.qty).toFixed(2));
    updated.unrealizedPnLPercent = Number((((newCurrentPrice - updated.avgEntryPrice) / updated.avgEntryPrice) * 100).toFixed(2));

    // Update highest price seen since entry
    const prevHigh = updated.highestPriceSinceEntry || updated.avgEntryPrice;
    if (newCurrentPrice > prevHigh) {
      updated.highestPriceSinceEntry = newCurrentPrice;
    }
    const currentHigh = updated.highestPriceSinceEntry || newCurrentPrice;

    // 1. Check Take Profit Hit
    if (updated.takeProfitPrice && newCurrentPrice >= updated.takeProfitPrice) {
      return {
        updatedPosition: updated,
        isTriggered: true,
        triggerType: 'TAKE_PROFIT',
        triggerPrice: newCurrentPrice,
        message: `🎯 [达成目标止盈] 现价 $${newCurrentPrice} 触及或突破目标止盈价 $${updated.takeProfitPrice}`
      };
    }

    // 2. Check Break-Even Step Logic
    // If unrealized gain reaches >= breakEvenTriggerPercent% of distance to target profit
    if (updated.takeProfitPrice && !updated.breakEvenActive) {
      const totalTargetSpread = updated.takeProfitPrice - updated.avgEntryPrice;
      const currentSpread = newCurrentPrice - updated.avgEntryPrice;
      if (totalTargetSpread > 0 && (currentSpread / totalTargetSpread) * 100 >= breakEvenTriggerPercent) {
        // Raise stop loss to breakeven (entry price + small cushion 0.1%)
        const breakEvenPrice = Number((updated.avgEntryPrice * 1.001).toFixed(2));
        if (!updated.stopLossPrice || breakEvenPrice > updated.stopLossPrice) {
          updated.stopLossPrice = breakEvenPrice;
          updated.breakEvenActive = true;
        }
      }
    }

    // 3. Dynamic Trailing Stop calculation
    const trailingStep = Math.max(0.2, trailingStopPercent) / 100;
    const computedTrailingStop = Number((currentHigh * (1 - trailingStep)).toFixed(2));

    // Trailing stop can only ratchet upward
    if (!updated.trailingStopPrice || computedTrailingStop > updated.trailingStopPrice) {
      updated.trailingStopPrice = computedTrailingStop;
    }

    // Determine active effective floor
    const activeFloor = Math.max(
      updated.stopLossPrice || 0,
      updated.trailingStopPrice || 0
    );

    // 4. Check Stop Hit
    if (activeFloor > 0 && newCurrentPrice <= activeFloor) {
      const isTrailing = updated.trailingStopPrice && activeFloor === updated.trailingStopPrice;
      const isBreakEven = updated.breakEvenActive && activeFloor >= updated.avgEntryPrice;

      const triggerType = isTrailing
        ? 'TRAILING_STOP'
        : isBreakEven
        ? 'BREAK_EVEN_STOP'
        : 'HARD_STOP_LOSS';

      return {
        updatedPosition: updated,
        isTriggered: true,
        triggerType,
        triggerPrice: newCurrentPrice,
        message: isTrailing
          ? `🛡️ [触发动态追踪止损] 现价 $${newCurrentPrice} 跌破峰值回撤保护线 $${activeFloor} (历史高点 $${currentHigh})`
          : isBreakEven
          ? `🛡️ [触发保本平仓] 现价 $${newCurrentPrice} 触及保本止损线 $${activeFloor}`
          : `⚠️ [触发硬止损] 现价 $${newCurrentPrice} 跌破止损防线 $${activeFloor}`
      };
    }

    return {
      updatedPosition: updated,
      isTriggered: false
    };
  }
}
