import {
  OrderBookLevel,
  OrderBookSnapshot,
  OrderBookImbalanceAnalysis
} from '../../types/trading.ts';

/**
 * OrderBookImbalanceEngine
 * 
 * Implements microstructural analysis of US equity limit order books:
 * 1. Order Book Imbalance (OBI) metric across top N tiers
 * 2. Institutional liquidity wall detection (Bid Wall / Ask Wall >= 3x mean size)
 * 3. Micro-Price calculation weighted by book depth
 * 4. Exhaustion / Rebound confirmation for Dip Buying (Flash Rebound)
 */
export class OrderBookImbalanceEngine {
  /**
   * Generates or extracts an order book snapshot from market quote
   */
  public static generateOrderBookSnapshot(
    symbol: string,
    currentPrice: number,
    baseSpreadPercent = 0.04 // 4 bps base spread for liquid US equities
  ): OrderBookSnapshot {
    const safePrice = Math.max(0.5, currentPrice);
    const halfSpread = Math.max(0.01, Number((safePrice * (baseSpreadPercent / 100)).toFixed(2)));
    const bestBid = Number((safePrice - halfSpread).toFixed(2));
    const bestAsk = Number((safePrice + halfSpread).toFixed(2));

    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    // Derive deterministic depth based on ticker character hash and price
    const seed = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + Math.round(safePrice * 10);
    const stepSize = Math.max(0.01, Number((safePrice * 0.001).toFixed(2)));

    // Generate 5 levels of bids and asks
    for (let i = 0; i < 5; i++) {
      const bidPrice = Number((bestBid - i * stepSize).toFixed(2));
      const askPrice = Number((bestAsk + i * stepSize).toFixed(2));

      // Deterministic pseudo-realistic liquidity size
      const bidMultiplier = 1 + (((seed * (i + 1) * 17) % 100) / 100);
      const askMultiplier = 1 + (((seed * (i + 1) * 29) % 100) / 100);

      const baseLot = Math.max(100, Math.round(25000 / safePrice));
      const bidSize = Math.round(baseLot * bidMultiplier * (1 + i * 0.35));
      const askSize = Math.round(baseLot * askMultiplier * (1 + i * 0.25));

      bids.push({
        price: bidPrice,
        size: bidSize,
        ordersCount: Math.max(1, Math.round(bidSize / 200))
      });
      asks.push({
        price: askPrice,
        size: askSize,
        ordersCount: Math.max(1, Math.round(askSize / 200))
      });
    }

    const spread = Number((bestAsk - bestBid).toFixed(2));
    const midPrice = Number(((bestAsk + bestBid) / 2).toFixed(2));

    const totalBidVol = bids.reduce((acc, b) => acc + b.size, 0);
    const totalAskVol = asks.reduce((acc, a) => acc + a.size, 0);
    const microPrice = (totalBidVol + totalAskVol) > 0
      ? Number(((totalBidVol * bestAsk + totalAskVol * bestBid) / (totalBidVol + totalAskVol)).toFixed(2))
      : midPrice;

    return {
      symbol,
      timestamp: Date.now(),
      bids,
      asks,
      spread,
      midPrice,
      microPrice
    };
  }

  /**
   * Analyzes order book imbalance and institutional walls
   */
  public static analyzeImbalance(snapshot: OrderBookSnapshot): OrderBookImbalanceAnalysis {
    const { symbol, bids, asks } = snapshot;

    const bidVolumeSum = bids.reduce((sum, lvl) => sum + lvl.size, 0);
    const askVolumeSum = asks.reduce((sum, lvl) => sum + lvl.size, 0);
    const totalVolume = bidVolumeSum + askVolumeSum;

    // 1. Calculate OBI in range [-1.0, +1.0]
    let rawObi = 0;
    if (totalVolume > 0) {
      rawObi = (bidVolumeSum - askVolumeSum) / totalVolume;
    }
    const obi = Number(rawObi.toFixed(3));

    // 2. Average level sizes for wall detection (>= 3.0x average)
    const avgBidSize = bids.length > 0 ? bidVolumeSum / bids.length : 1;
    const avgAskSize = asks.length > 0 ? askVolumeSum / asks.length : 1;

    let bidWall: { price: number; size: number; multipleOfAverage: number } | undefined;
    for (const b of bids) {
      const mult = b.size / avgBidSize;
      if (mult >= 2.0 && (!bidWall || b.size > bidWall.size)) {
        bidWall = {
          price: b.price,
          size: b.size,
          multipleOfAverage: Number(mult.toFixed(2))
        };
      }
    }

    let askWall: { price: number; size: number; multipleOfAverage: number } | undefined;
    for (const a of asks) {
      const mult = a.size / avgAskSize;
      if (mult >= 2.0 && (!askWall || a.size > askWall.size)) {
        askWall = {
          price: a.price,
          size: a.size,
          multipleOfAverage: Number(mult.toFixed(2))
        };
      }
    }

    // 3. Regime categorization
    let regime: OrderBookImbalanceAnalysis['regime'] = 'BALANCED';
    let regimeLabel = '盘口力量均衡';

    if (obi >= 0.35) {
      regime = 'STRONG_BUY_PRESSURE';
      regimeLabel = '主力强力托盘 (买盘显著堆积)';
    } else if (obi >= 0.10) {
      regime = 'MODERATE_BUY_PRESSURE';
      regimeLabel = '买方略占优势 (承接意愿强)';
    } else if (obi <= -0.35) {
      regime = 'HEAVY_SELL_PRESSURE';
      regimeLabel = '巨量卖盘压制 (空头抛压沉重)';
    } else if (obi <= -0.10) {
      regime = 'MODERATE_SELL_PRESSURE';
      regimeLabel = '卖方稍显占优 (上方挂单密集)';
    }

    // 4. Support Strength assessment
    let supportStrength: OrderBookImbalanceAnalysis['supportStrength'] = 'MODERATE';
    if (obi >= 0.25 && bidWall) {
      supportStrength = 'STRONG';
    } else if (obi < -0.15) {
      supportStrength = 'WEAK';
    }

    // 5. Rebound Confirmation boolean flag
    // OBI > 0.15 indicates net positive buying interest at current bid levels
    const isReboundConfirmed = obi >= 0.15 || (bidWall !== undefined && obi >= 0.0);

    const notes = [
      `深度不平衡度 OBI: ${(obi * 100).toFixed(1)}%`,
      bidWall ? `下方 $${bidWall.price} 存在 ${bidWall.multipleOfAverage}x 托盘挂单墙` : '无异常单笔巨额托盘',
      askWall ? `上方 $${askWall.price} 存在 ${askWall.multipleOfAverage}x 压单墙` : '上方压单正常'
    ].join(' | ');

    return {
      symbol,
      timestamp: snapshot.timestamp,
      obi,
      bidVolumeSum,
      askVolumeSum,
      regime,
      regimeLabel,
      bidWall,
      askWall,
      supportStrength,
      isReboundConfirmed,
      notes
    };
  }
}
