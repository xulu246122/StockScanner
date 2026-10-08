import { AlertEvent, MarketStatus } from '../types.ts';

export interface WsPriceTick {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  rsi: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  direction?: 'UP' | 'DOWN' | 'EQUAL';
  timestamp: number;
  source: string;
}

export type WsClientMessage =
  | { type: 'SUBSCRIBE_TICKERS'; tickers: string[] }
  | { type: 'UNSUBSCRIBE_TICKERS'; tickers: string[] }
  | { type: 'SUBSCRIBE_WATCHLIST' }
  | { type: 'SUBSCRIBE_ALERTS' }
  | { type: 'SUBSCRIBE_MARKET' }
  | { type: 'PING'; timestamp: number };

export type WsServerMessage =
  | { type: 'CONNECTED'; clientId: string; serverTime: number; subscribedTickers: string[] }
  | { type: 'PONG'; timestamp: number }
  | { type: 'TICK'; tick: WsPriceTick }
  | { type: 'TICKS_BATCH'; ticks: WsPriceTick[] }
  | { type: 'ALERT_TRIGGERED'; event: AlertEvent }
  | { type: 'MARKET_STATUS'; status: MarketStatus }
  | { type: 'SUBSCRIPTION_ACK'; tickers: string[] };

export type WsConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
