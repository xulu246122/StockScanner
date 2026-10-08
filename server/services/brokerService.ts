import fs from 'fs';
import path from 'path';
import {
  BrokerConfig,
  BrokerAccountSummary,
  BrokerPosition,
  BrokerOrder,
  SubmitOrderRequest,
  DEFAULT_BROKER_CONFIG
} from '../types/trading.ts';
import { TrailingStopEngine } from '../quant/risk/trailingStopEngine.ts';
import { marketDataProvider } from './marketDataProvider.ts';
import { universeDb } from '../db/universeDb.ts';
import { getDataFilePath } from '../utils/pathResolver.ts';

const CONFIG_FILE_PATH = getDataFilePath('broker_config.json');
const ACCOUNT_FILE_PATH = getDataFilePath('paper_account.json');

interface PaperAccountStorage {
  cash: number;
  initialBalance: number;
  realizedPnL: number;
  positions: Record<string, BrokerPosition>;
  orders: BrokerOrder[];
}

export class BrokerService {
  private config: BrokerConfig;
  private paperAccount: PaperAccountStorage;
  private dbSynced: boolean = false;

  constructor() {
    this.config = this.loadConfig();
    this.paperAccount = this.loadPaperAccount();
  }

  // -------------------------------------------------------------
  // Configuration Persistence
  // -------------------------------------------------------------
  private loadConfig(): BrokerConfig {
    try {
      const dataDir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        return {
          ...DEFAULT_BROKER_CONFIG,
          ...JSON.parse(raw)
        };
      }
    } catch (err) {
      console.warn('[BrokerService] Failed to load config from disk, using defaults:', err);
    }
    this.saveConfig(DEFAULT_BROKER_CONFIG);
    return { ...DEFAULT_BROKER_CONFIG };
  }

  private saveConfig(cfg: BrokerConfig): void {
    try {
      const dataDir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
    } catch (err) {
      console.error('[BrokerService] Failed to persist broker config:', err);
    }
  }

  public getConfig(): BrokerConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<BrokerConfig>): BrokerConfig {
    this.config = {
      ...this.config,
      ...partial
    };
    this.saveConfig(this.config);
    return this.getConfig();
  }

  // -------------------------------------------------------------
  // Paper Trading Storage Persistence
  // -------------------------------------------------------------
  private loadPaperAccount(): PaperAccountStorage {
    try {
      const dataDir = path.dirname(ACCOUNT_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(ACCOUNT_FILE_PATH)) {
        const raw = fs.readFileSync(ACCOUNT_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          cash: typeof parsed.cash === 'number' ? parsed.cash : 100000.0,
          initialBalance: typeof parsed.initialBalance === 'number' ? parsed.initialBalance : 100000.0,
          realizedPnL: typeof parsed.realizedPnL === 'number' ? parsed.realizedPnL : 0,
          positions: parsed.positions || {},
          orders: Array.isArray(parsed.orders) ? parsed.orders : []
        };
      }
    } catch (err) {
      console.warn('[BrokerService] Failed to load paper account, initializing fresh:', err);
    }

    const defaultAcc: PaperAccountStorage = {
      cash: this.config.paperBalance || 100000.0,
      initialBalance: this.config.paperBalance || 100000.0,
      realizedPnL: 0,
      positions: {},
      orders: []
    };
    this.savePaperAccount(defaultAcc);
    return defaultAcc;
  }

  private savePaperAccount(acc: PaperAccountStorage): void {
    try {
      const dataDir = path.dirname(ACCOUNT_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(ACCOUNT_FILE_PATH, JSON.stringify(acc, null, 2), 'utf-8');
    } catch (err) {
      console.error('[BrokerService] Failed to persist paper account:', err);
    }
  }

  public syncWithUniverseDb(): void {
    if (!universeDb.isInitialized()) return;
    try {
      const summary = universeDb.getPaperAccountSummary(this.config.paperBalance || 100000.0);
      const positionsList = universeDb.getAllPaperPositions();
      const ordersList = universeDb.getAllPaperOrders();

      const posMap: Record<string, BrokerPosition> = {};
      for (const p of positionsList) {
        posMap[p.symbol] = p;
      }

      this.paperAccount = {
        cash: summary.cash,
        initialBalance: summary.initialBalance,
        realizedPnL: summary.realizedPnL,
        positions: posMap,
        orders: ordersList
      };
      this.dbSynced = true;
    } catch (e) {
      console.warn('[BrokerService] Failed to sync with universeDb:', e);
    }
  }

  public resetPaperAccount(newBalance = 100000.0): BrokerAccountSummary {
    this.paperAccount = {
      cash: newBalance,
      initialBalance: newBalance,
      realizedPnL: 0,
      positions: {},
      orders: []
    };
    this.savePaperAccount(this.paperAccount);
    if (universeDb.isInitialized()) {
      try {
        universeDb.resetPaperAccountData(newBalance);
        universeDb.save(true);
      } catch (e) {
        console.warn('[BrokerService] Failed to reset paper data in universeDb:', e);
      }
    }
    return this.getAccountSummary();
  }

  // -------------------------------------------------------------
  // Account Summary & Valuation
  // -------------------------------------------------------------
  public getAccountSummary(): BrokerAccountSummary {
    if (universeDb.isInitialized()) {
      if (!this.dbSynced) {
        this.syncWithUniverseDb();
      } else {
        try {
          const summary = universeDb.getPaperAccountSummary(this.config.paperBalance || 100000.0);
          this.paperAccount.cash = summary.cash;
          this.paperAccount.initialBalance = summary.initialBalance;
          this.paperAccount.realizedPnL = summary.realizedPnL;
        } catch {}
      }
    }

    let positionsValue = 0;
    let unrealizedPnL = 0;
    const positionsList = Object.values(this.paperAccount.positions);

    for (const pos of positionsList) {
      positionsValue += pos.marketValue || 0;
      unrealizedPnL += pos.unrealizedPnL || 0;
    }

    const portfolioValue = Number((this.paperAccount.cash + positionsValue).toFixed(2));
    const dayPnL = unrealizedPnL + this.paperAccount.realizedPnL;
    const dayPnLPercent = this.paperAccount.initialBalance > 0
      ? Number(((dayPnL / this.paperAccount.initialBalance) * 100).toFixed(2))
      : 0;

    return {
      provider: this.config.activeProvider,
      mode: this.config.activeProvider === 'PAPER_SANDBOX' ? 'PAPER' : this.config.alpacaMode,
      status: 'CONNECTED',
      currency: 'USD',
      cash: Number(this.paperAccount.cash.toFixed(2)),
      portfolioValue,
      buyingPower: Number((this.paperAccount.cash * 2.0).toFixed(2)), // 2x Day Trading Buying Power
      unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
      realizedPnL: Number(this.paperAccount.realizedPnL.toFixed(2)),
      dayPnLPercent,
      openPositionsCount: positionsList.length,
      lastUpdatedAt: new Date().toISOString()
    };
  }

  public getPositions(): BrokerPosition[] {
    if (universeDb.isInitialized()) {
      if (!this.dbSynced) {
        this.syncWithUniverseDb();
      }
      try {
        const dbPos = universeDb.getAllPaperPositions();
        const map: Record<string, BrokerPosition> = {};
        for (const p of dbPos) map[p.symbol] = p;
        this.paperAccount.positions = map;
        return dbPos;
      } catch {}
    }
    return Object.values(this.paperAccount.positions);
  }

  public getOrders(): BrokerOrder[] {
    if (universeDb.isInitialized()) {
      if (!this.dbSynced) {
        this.syncWithUniverseDb();
      }
      try {
        const dbOrders = universeDb.getAllPaperOrders();
        this.paperAccount.orders = dbOrders;
        return dbOrders;
      } catch {}
    }
    // Return sorted orders by createdAt descending
    return [...this.paperAccount.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // -------------------------------------------------------------
  // Order Submission & Bracket Execution
  // -------------------------------------------------------------
  public async submitOrder(req: SubmitOrderRequest): Promise<{
    success: boolean;
    order: BrokerOrder;
    message: string;
    position?: BrokerPosition;
  }> {
    const symbol = req.symbol.toUpperCase().trim();
    const qty = Math.max(1, Math.floor(req.qty));
    const side = req.side;
    const orderType = req.orderType || 'LIMIT';
    const orderClass = req.orderClass || (req.takeProfitPrice || req.stopLossPrice ? 'BRACKET' : 'SIMPLE');

    // Fetch latest market quote if limitPrice not explicitly provided
    let executionPrice = req.limitPrice;
    if (!executionPrice) {
      try {
        const quote = await marketDataProvider.getQuote(symbol);
        executionPrice = quote.price;
      } catch {
        executionPrice = 100.0;
      }
    }

    const requiredCapital = Number((executionPrice * qty).toFixed(2));

    if (side === 'BUY') {
      if (this.paperAccount.cash < requiredCapital) {
        throw new Error(`账户购买力不足: 需要 $${requiredCapital.toLocaleString()}，当前现金可用 $${this.paperAccount.cash.toLocaleString()}`);
      }
    }

    // Generate Order Record
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const order: BrokerOrder = {
      id: orderId,
      symbol,
      side,
      orderType,
      orderClass,
      qty,
      limitPrice: req.limitPrice,
      stopLossPrice: req.stopLossPrice,
      takeProfitPrice: req.takeProfitPrice,
      filledPrice: executionPrice,
      status: 'FILLED', // Instant fill for paper sandbox
      strategySource: req.strategySource || 'FLASH_REBOUND',
      createdAt: nowIso,
      filledAt: nowIso,
      notes: orderClass === 'BRACKET'
        ? `Bracket OCO 单: 止盈 $${req.takeProfitPrice || '未设'}, 止损 $${req.stopLossPrice || '未设'}`
        : '普通限价单'
    };

    let resultPosition: BrokerPosition | undefined;

    if (side === 'BUY') {
      // Deduct cash
      this.paperAccount.cash -= requiredCapital;

      const existingPos = this.paperAccount.positions[symbol];
      if (existingPos) {
        // Average up / down
        const totalQty = existingPos.qty + qty;
        const totalCost = (existingPos.avgEntryPrice * existingPos.qty) + requiredCapital;
        const newAvg = Number((totalCost / totalQty).toFixed(2));

        existingPos.qty = totalQty;
        existingPos.avgEntryPrice = newAvg;
        existingPos.currentPrice = executionPrice;
        existingPos.marketValue = Number((totalQty * executionPrice).toFixed(2));
        existingPos.costBasis = Number(totalCost.toFixed(2));
        existingPos.takeProfitPrice = req.takeProfitPrice || existingPos.takeProfitPrice;
        existingPos.stopLossPrice = req.stopLossPrice || existingPos.stopLossPrice;
        resultPosition = existingPos;
      } else {
        const newPos: BrokerPosition = {
          symbol,
          qty,
          avgEntryPrice: executionPrice,
          currentPrice: executionPrice,
          marketValue: requiredCapital,
          costBasis: requiredCapital,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          takeProfitPrice: req.takeProfitPrice,
          stopLossPrice: req.stopLossPrice,
          trailingStopPrice: req.stopLossPrice,
          highestPriceSinceEntry: executionPrice,
          breakEvenActive: false,
          openedAt: nowIso
        };
        this.paperAccount.positions[symbol] = newPos;
        resultPosition = newPos;
      }
    } else {
      // SELL / Close Position
      const existingPos = this.paperAccount.positions[symbol];
      if (!existingPos) {
        throw new Error(`未找到持仓 ${symbol}，无法执行卖出委托`);
      }

      const sellQty = Math.min(qty, existingPos.qty);
      const proceeds = Number((executionPrice * sellQty).toFixed(2));
      const costOfSold = Number((existingPos.avgEntryPrice * sellQty).toFixed(2));
      const tradePnL = Number((proceeds - costOfSold).toFixed(2));

      this.paperAccount.cash += proceeds;
      this.paperAccount.realizedPnL += tradePnL;

      if (existingPos.qty <= sellQty) {
        delete this.paperAccount.positions[symbol];
      } else {
        existingPos.qty -= sellQty;
        existingPos.marketValue = Number((existingPos.qty * executionPrice).toFixed(2));
        existingPos.costBasis = Number((existingPos.qty * existingPos.avgEntryPrice).toFixed(2));
        resultPosition = existingPos;
      }
    }

    this.paperAccount.orders.unshift(order);
    this.savePaperAccount(this.paperAccount);

    if (universeDb.isInitialized()) {
      try {
        universeDb.savePaperOrder(order);
        if (resultPosition) {
          universeDb.savePaperPosition(resultPosition);
        } else if (side === 'SELL') {
          universeDb.deletePaperPosition(symbol);
        }
        universeDb.savePaperAccountSummary({
          cash: this.paperAccount.cash,
          initialBalance: this.paperAccount.initialBalance,
          realizedPnL: this.paperAccount.realizedPnL
        });
        universeDb.scheduleSave();
      } catch (e) {
        console.warn('[BrokerService] Failed to persist order/position to universeDb:', e);
      }
    }

    return {
      success: true,
      order,
      message: `[${orderClass}] ${side} ${qty} 股 ${symbol} 已成交 @ $${executionPrice}`,
      position: resultPosition
    };
  }

  // -------------------------------------------------------------
  // Cancel Order
  // -------------------------------------------------------------
  public cancelOrder(orderId: string): BrokerOrder {
    const order = this.paperAccount.orders.find(o => o.id === orderId);
    if (!order) {
      throw new Error(`未找到订单 ${orderId}`);
    }
    if (order.status === 'FILLED') {
      throw new Error(`订单 ${orderId} 已全部成交，不可撤销`);
    }
    order.status = 'CANCELLED';
    order.cancelledAt = new Date().toISOString();
    this.savePaperAccount(this.paperAccount);

    if (universeDb.isInitialized()) {
      try {
        universeDb.savePaperOrder(order);
        universeDb.scheduleSave();
      } catch (e) {
        console.warn('[BrokerService] Failed to persist cancelled order to universeDb:', e);
      }
    }

    return order;
  }

  // -------------------------------------------------------------
  // Real-time Tick Price Sync & Trailing Stop Updates
  // -------------------------------------------------------------
  public async syncPositionsMarketPrice(): Promise<{
    updatedPositions: BrokerPosition[];
    triggeredEvents: Array<{ symbol: string; message: string; type: string }>;
  }> {
    const positions = Object.values(this.paperAccount.positions);
    if (positions.length === 0) {
      return { updatedPositions: [], triggeredEvents: [] };
    }

    const updatedPositions: BrokerPosition[] = [];
    const triggeredEvents: Array<{ symbol: string; message: string; type: string }> = [];

    for (const pos of positions) {
      try {
        const quote = await marketDataProvider.getQuote(pos.symbol);
        const evalResult = TrailingStopEngine.evaluatePosition(
          pos,
          quote.price,
          this.config.trailingStopPercent,
          this.config.breakEvenStepTriggerPercent
        );

        this.paperAccount.positions[pos.symbol] = evalResult.updatedPosition;
        updatedPositions.push(evalResult.updatedPosition);

        if (universeDb.isInitialized()) {
          try {
            universeDb.savePaperPosition(evalResult.updatedPosition);
          } catch {}
        }

        if (evalResult.isTriggered && evalResult.message) {
          triggeredEvents.push({
            symbol: pos.symbol,
            message: evalResult.message,
            type: evalResult.triggerType || 'EXIT'
          });

          // Automatically execute closing sell order if stopped out or profit target hit
          const closeOrder: BrokerOrder = {
            id: `TRIG-${Date.now().toString(36).toUpperCase()}`,
            symbol: pos.symbol,
            side: 'SELL',
            orderType: 'MARKET',
            orderClass: 'SIMPLE',
            qty: pos.qty,
            filledPrice: quote.price,
            status: 'FILLED',
            strategySource: `AUTO_${evalResult.triggerType}`,
            createdAt: new Date().toISOString(),
            filledAt: new Date().toISOString(),
            notes: evalResult.message
          };

          const proceeds = Number((quote.price * pos.qty).toFixed(2));
          const cost = Number((pos.avgEntryPrice * pos.qty).toFixed(2));
          this.paperAccount.cash += proceeds;
          this.paperAccount.realizedPnL += Number((proceeds - cost).toFixed(2));
          delete this.paperAccount.positions[pos.symbol];
          this.paperAccount.orders.unshift(closeOrder);

          if (universeDb.isInitialized()) {
            try {
              universeDb.deletePaperPosition(pos.symbol);
              universeDb.savePaperOrder(closeOrder);
              universeDb.savePaperAccountSummary({
                cash: this.paperAccount.cash,
                initialBalance: this.paperAccount.initialBalance,
                realizedPnL: this.paperAccount.realizedPnL
              });
            } catch {}
          }
        }
      } catch (err) {
        console.warn(`[BrokerService] Failed to sync price for ${pos.symbol}:`, err);
      }
    }

    this.savePaperAccount(this.paperAccount);
    if (universeDb.isInitialized()) {
      universeDb.scheduleSave();
    }
    return { updatedPositions, triggeredEvents };
  }
}

export const brokerService = new BrokerService();
