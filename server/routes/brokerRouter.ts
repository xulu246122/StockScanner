import { Router, Request, Response } from 'express';
import { brokerService } from '../services/brokerService.ts';
import { PositionSizingEngine } from '../quant/risk/positionSizingEngine.ts';
import { OrderBookImbalanceEngine } from '../quant/microstructure/orderBookImbalanceEngine.ts';
import { marketDataProvider } from '../services/marketDataProvider.ts';
import { SubmitOrderRequest, PositionSizingParams } from '../types/trading.ts';

export const brokerRouter = Router();

// 1. Get Broker Configuration
brokerRouter.get('/config', (_req: Request, res: Response) => {
  try {
    const config = brokerService.getConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Update Broker Configuration
brokerRouter.post('/config', (req: Request, res: Response) => {
  try {
    const updated = brokerService.updateConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Account Summary
brokerRouter.get('/account', async (_req: Request, res: Response) => {
  try {
    // Sync market price first for fresh valuation
    await brokerService.syncPositionsMarketPrice();
    const account = brokerService.getAccountSummary();
    res.json({ success: true, account });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Get Positions
brokerRouter.get('/positions', async (_req: Request, res: Response) => {
  try {
    await brokerService.syncPositionsMarketPrice();
    const positions = brokerService.getPositions();
    res.json({ success: true, positions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Get Orders
brokerRouter.get('/orders', (_req: Request, res: Response) => {
  try {
    const orders = brokerService.getOrders();
    res.json({ success: true, orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Submit Order (Supports Bracket / OCO)
brokerRouter.post('/order', async (req: Request, res: Response) => {
  try {
    const orderReq: SubmitOrderRequest = req.body;
    if (!orderReq.symbol || !orderReq.qty || !orderReq.side) {
      return res.status(400).json({ success: false, error: '缺少必需的订单参数 (symbol, qty, side)' });
    }

    const result = await brokerService.submitOrder(orderReq);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. Cancel Order
brokerRouter.post('/order/cancel', (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: '请提供 orderId' });
    }
    const cancelled = brokerService.cancelOrder(orderId);
    res.json({ success: true, order: cancelled });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 8. Reset Paper Account
brokerRouter.post('/reset-paper', (req: Request, res: Response) => {
  try {
    const balance = typeof req.body.initialBalance === 'number' ? req.body.initialBalance : 100000.0;
    const account = brokerService.resetPaperAccount(balance);
    res.json({ success: true, account });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Calculate Intelligent Position Sizing
brokerRouter.post('/calculate-sizing', (req: Request, res: Response) => {
  try {
    const params: PositionSizingParams = req.body;
    if (!params.entryPrice || !params.stopLossPrice) {
      return res.status(400).json({ success: false, error: '必须提供 entryPrice 与 stopLossPrice' });
    }
    const result = PositionSizingEngine.calculate(params);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 10. Level 2 Order Book & Order Book Imbalance (OBI) Analysis
brokerRouter.get('/l2-depth/:symbol', async (req: Request, res: Response) => {
  try {
    const symbol = (req.params.symbol || 'AAPL').toUpperCase();
    let currentPrice = 100.0;
    try {
      const quote = await marketDataProvider.getQuote(symbol);
      currentPrice = quote.price;
    } catch {
      // fallback safe price
    }

    const snapshot = OrderBookImbalanceEngine.generateOrderBookSnapshot(symbol, currentPrice);
    const imbalance = OrderBookImbalanceEngine.analyzeImbalance(snapshot);

    res.json({
      success: true,
      snapshot,
      imbalance
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
