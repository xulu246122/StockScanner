export type BrokerProviderType = 'PAPER_SANDBOX' | 'ALPACA' | 'IBKR';

export type BrokerAccountMode = 'PAPER' | 'LIVE';

export interface BrokerConfig {
  activeProvider: BrokerProviderType;
  alpacaKeyId: string;
  alpacaSecretKey: string;
  alpacaMode: BrokerAccountMode;
  ibkrHost: string;
  ibkrPort: number;
  paperBalance: number;              // 虚拟沙盒初始本金，默认 $100,000
  defaultPositionSizePercent: number;// 默认单笔仓位占比（%），默认 5.0%
  maxRiskPerTradePercent: number;    // 单笔硬风控损失上限（%），默认 1.0%
  autoBracketEnabled: boolean;       // 是否默认开启复合 Bracket (OCO) 挂单，默认 true
  trailingStopEnabled: boolean;      // 是否开启动态追踪止损，默认 true
  trailingStopPercent: number;       // 动态追踪回撤步长（%），默认 1.5%
  breakEvenStepTriggerPercent: number;// 浮盈达到目标百分比时上提止损至保本，默认 50%
}

export const DEFAULT_BROKER_CONFIG: BrokerConfig = {
  activeProvider: 'PAPER_SANDBOX',
  alpacaKeyId: '',
  alpacaSecretKey: '',
  alpacaMode: 'PAPER',
  ibkrHost: '127.0.0.1',
  ibkrPort: 5000,
  paperBalance: 100000.0,
  defaultPositionSizePercent: 5.0,
  maxRiskPerTradePercent: 1.0,
  autoBracketEnabled: true,
  trailingStopEnabled: true,
  trailingStopPercent: 1.5,
  breakEvenStepTriggerPercent: 50.0
};

export interface BrokerAccountSummary {
  provider: BrokerProviderType;
  mode: BrokerAccountMode;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  currency: string;
  cash: number;
  portfolioValue: number;
  buyingPower: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dayPnLPercent: number;
  openPositionsCount: number;
  lastUpdatedAt: string;
}

export interface BrokerPosition {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  trailingStopPrice?: number;
  highestPriceSinceEntry?: number;
  breakEvenActive?: boolean;
  openedAt: string;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'TRIGGERED' | 'CANCELLED' | 'REJECTED';
export type OrderClass = 'SIMPLE' | 'BRACKET' | 'OCO';

export interface BrokerOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  orderClass: OrderClass;
  qty: number;
  limitPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  filledPrice?: number;
  status: OrderStatus;
  strategySource?: string;
  createdAt: string;
  filledAt?: string;
  cancelledAt?: string;
  notes?: string;
}

export interface SubmitOrderRequest {
  symbol: string;
  side: OrderSide;
  qty: number;
  orderType?: OrderType;
  limitPrice?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  trailingStopPercent?: number;
  orderClass?: OrderClass;
  strategySource?: string;
}

export type PositionSizingMethod = 'HALF_KELLY' | 'FIXED_RISK' | 'VOLATILITY_PARITY' | 'CUSTOM_SHARES';

export interface PositionSizingParams {
  method: PositionSizingMethod;
  accountEquity: number;
  entryPrice: number;
  stopLossPrice: number;
  targetPrice?: number;
  winRate?: number;             // 历史胜率 (如 0.65)
  riskRewardRatio?: number;     // 盈亏比 (如 1.8)
  atr?: number;                 // 真实波动幅度
  fixedRiskPercent?: number;    // 单笔固定承担损失比例 (如 1.0 代表 1%)
  customShares?: number;
}

export interface PositionSizingResult {
  method: PositionSizingMethod;
  recommendedShares: number;
  notionalValue: number;
  accountRiskAmount: number;
  accountRiskPercent: number;
  kellyFraction?: number;
  rationale: string;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  ordersCount?: number;
}

export interface OrderBookSnapshot {
  symbol: string;
  timestamp: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  midPrice: number;
  microPrice: number;
}

export interface OrderBookImbalanceAnalysis {
  symbol: string;
  timestamp: number;
  obi: number;                  // [-1.0, +1.0]
  bidVolumeSum: number;
  askVolumeSum: number;
  regime: 'STRONG_BUY_PRESSURE' | 'MODERATE_BUY_PRESSURE' | 'BALANCED' | 'MODERATE_SELL_PRESSURE' | 'HEAVY_SELL_PRESSURE';
  regimeLabel: string;
  bidWall?: { price: number; size: number; multipleOfAverage: number };
  askWall?: { price: number; size: number; multipleOfAverage: number };
  supportStrength: 'WEAK' | 'MODERATE' | 'STRONG';
  isReboundConfirmed: boolean;
  notes: string;
}
