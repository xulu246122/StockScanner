import {
  WsClientMessage,
  WsServerMessage,
  WsPriceTick,
  AlertEvent,
  MarketStatus,
  WsConnectionStatus
} from '../types.ts';
import { getServerBaseUrl, isNativeMobile } from './directMarketProvider.ts';

type TickListener = (tick: WsPriceTick) => void;
type TicksBatchListener = (ticks: WsPriceTick[]) => void;
type AlertListener = (event: AlertEvent) => void;
type MarketStatusListener = (status: MarketStatus) => void;
type StatusListener = (status: WsConnectionStatus) => void;

export class WebSocketClientService {
  private ws: WebSocket | null = null;
  private status: WsConnectionStatus = 'DISCONNECTED';
  private reconnectAttempts: number = 0;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private isExplicitlyClosed: boolean = false;

  // Tracked subscriptions to re-apply upon reconnect
  private subscribedTickers: Set<string> = new Set();
  private isSubscribedAlerts: boolean = true;
  private isSubscribedMarket: boolean = true;

  // In-memory cache of latest ticks
  private latestTicks: Map<string, WsPriceTick> = new Map();

  // High-frequency backpressure throttling buffer for mobile and desktop
  private pendingTickMap: Map<string, WsPriceTick> = new Map();
  private tickFlushTimer: any = null;
  private throttleIntervalMs: number = 50;

  // Listeners
  private tickListeners: Set<TickListener> = new Set();
  private batchListeners: Set<TicksBatchListener> = new Set();
  private alertListeners: Set<AlertListener> = new Set();
  private marketStatusListeners: Set<MarketStatusListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  /**
   * Set dynamic throttle interval (e.g. 50ms on mobile, 25ms on desktop)
   */
  public setThrottleInterval(ms: number): void {
    this.throttleIntervalMs = Math.max(10, Math.min(ms, 500));
  }

  /**
   * Coalesce high-frequency ticks into batched frame updates
   */
  private queueThrottledTick(tick: WsPriceTick): void {
    this.pendingTickMap.set(tick.ticker.toUpperCase().trim(), tick);
    if (!this.tickFlushTimer) {
      this.tickFlushTimer = setTimeout(() => {
        this.flushPendingTicks();
      }, this.throttleIntervalMs);
    }
  }

  /**
   * Flush coalesced tick updates to listeners
   */
  private flushPendingTicks(): void {
    this.tickFlushTimer = null;
    if (this.pendingTickMap.size === 0) return;

    const ticks = Array.from(this.pendingTickMap.values());
    this.pendingTickMap.clear();

    // Notify batch listeners first
    this.batchListeners.forEach(listener => {
      try { listener(ticks); } catch (e) { console.error(e); }
    });

    // Notify individual tick listeners with deduplicated latest ticks
    ticks.forEach(t => {
      this.tickListeners.forEach(listener => {
        try { listener(t); } catch (e) { console.error(e); }
      });
    });
  }

  constructor() {
    // Auto-connect if in browser environment
    if (typeof window !== 'undefined') {
      // Lazy auto-connect after current event loop
      setTimeout(() => {
        this.connect();
      }, 100);
    }
  }

  /**
   * Determine WebSocket URL based on current environment
   */
  private getWsUrl(): string {
    const customBase = getServerBaseUrl();
    if (customBase) {
      const clean = customBase.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://');
      return `${clean}/ws`;
    }

    if (typeof window === 'undefined') return 'ws://127.0.0.1:3000/ws';

    const loc = window.location;
    if (loc && loc.host && loc.protocol.startsWith('http') && !isNativeMobile()) {
      const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${loc.host}/ws`;
    }
    // Electron file:// or standalone preview fallback
    return 'ws://127.0.0.1:3000/ws';
  }

  /**
   * Initiate WebSocket connection
   */
  public connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Android 原生模式未配置电脑端中继时，跳过连接不存在的 127.0.0.1:3000
    if (isNativeMobile() && !getServerBaseUrl()) {
      this.setStatus('DISCONNECTED');
      return;
    }

    this.isExplicitlyClosed = false;
    this.setStatus('CONNECTING');

    const url = this.getWsUrl();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
        this.startHeartbeat();
        this.resubscribeAll();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.cleanupSocket();
        this.setStatus('DISCONNECTED');
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        // Socket error will trigger onclose automatically
        console.warn('[WebSocketClient] Connection error:', err);
      };
    } catch (err) {
      this.cleanupSocket();
      this.setStatus('DISCONNECTED');
      if (!this.isExplicitlyClosed) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Handle incoming server message
   */
  private handleMessage(rawData: any): void {
    try {
      const msg: WsServerMessage = JSON.parse(typeof rawData === 'string' ? rawData : rawData.toString());

      switch (msg.type) {
        case 'CONNECTED':
          // Connected confirmation
          break;

        case 'TICK':
          if (msg.tick) {
            this.latestTicks.set(msg.tick.ticker.toUpperCase().trim(), msg.tick);
            this.queueThrottledTick(msg.tick);
          }
          break;

        case 'TICKS_BATCH':
          if (Array.isArray(msg.ticks)) {
            msg.ticks.forEach(t => {
              this.latestTicks.set(t.ticker.toUpperCase().trim(), t);
              this.queueThrottledTick(t);
            });
          }
          break;

        case 'ALERT_TRIGGERED':
          if (msg.event) {
            this.alertListeners.forEach(listener => {
              try { listener(msg.event); } catch (e) { console.error(e); }
            });
          }
          break;

        case 'MARKET_STATUS':
          if (msg.status) {
            this.marketStatusListeners.forEach(listener => {
              try { listener(msg.status); } catch (e) { console.error(e); }
            });
          }
          break;

        case 'PONG':
          // Heartbeat pong received
          break;
      }
    } catch (err) {
      console.warn('[WebSocketClient] Failed to parse message:', err);
    }
  }

  /**
   * Resubscribe all active subscriptions upon reconnect
   */
  private resubscribeAll(): void {
    if (this.subscribedTickers.size > 0) {
      this.send({
        type: 'SUBSCRIBE_TICKERS',
        tickers: Array.from(this.subscribedTickers)
      });
    }

    if (this.isSubscribedAlerts) {
      this.send({ type: 'SUBSCRIBE_ALERTS' });
    }

    if (this.isSubscribedMarket) {
      this.send({ type: 'SUBSCRIBE_MARKET' });
    }
  }

  /**
   * Exponential backoff reconnect
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    this.reconnectAttempts++;
    this.setStatus('RECONNECTING');

    // Backoff: 1s, 2s, 4s, 8s, max 10s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.isOpen()) {
        this.send({ type: 'PING', timestamp: Date.now() });
      }
    }, 25000);
  }

  private cleanupSocket(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.tickFlushTimer) {
      clearTimeout(this.tickFlushTimer);
      this.tickFlushTimer = null;
    }
    this.pendingTickMap.clear();
    this.ws = null;
  }

  private setStatus(newStatus: WsConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach(listener => {
        try { listener(newStatus); } catch {}
      });
    }
  }

  /**
   * Send client command safely
   */
  public send(msg: WsClientMessage): void {
    if (this.isOpen()) {
      try {
        this.ws!.send(JSON.stringify(msg));
      } catch (err) {
        console.warn('[WebSocketClient] Send failed:', err);
      }
    }
  }

  public isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getStatus(): WsConnectionStatus {
    return this.status;
  }

  public getLatestTick(ticker: string): WsPriceTick | undefined {
    return this.latestTicks.get(ticker.toUpperCase().trim());
  }

  // --- Subscription API ---

  public subscribeTickers(tickers: string[]): void {
    const norm = tickers.map(t => t.toUpperCase().trim()).filter(Boolean);
    norm.forEach(t => this.subscribedTickers.add(t));

    this.send({
      type: 'SUBSCRIBE_TICKERS',
      tickers: norm
    });
  }

  public unsubscribeTickers(tickers: string[]): void {
    const norm = tickers.map(t => t.toUpperCase().trim()).filter(Boolean);
    norm.forEach(t => this.subscribedTickers.delete(t));

    this.send({
      type: 'UNSUBSCRIBE_TICKERS',
      tickers: norm
    });
  }

  public subscribeAlerts(): void {
    this.isSubscribedAlerts = true;
    this.send({ type: 'SUBSCRIBE_ALERTS' });
  }

  public subscribeMarket(): void {
    this.isSubscribedMarket = true;
    this.send({ type: 'SUBSCRIBE_MARKET' });
  }

  // --- Listener Subscriptions (returns cleanup function) ---

  public onTick(listener: TickListener): () => void {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  public onTicksBatch(listener: TicksBatchListener): () => void {
    this.batchListeners.add(listener);
    return () => this.batchListeners.delete(listener);
  }

  public onAlert(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  public onMarketStatus(listener: MarketStatusListener): () => void {
    this.marketStatusListeners.add(listener);
    return () => this.marketStatusListeners.delete(listener);
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // Call immediately with current status
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.cleanupSocket();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }

  public reconnect(): void {
    this.disconnect();
    this.isExplicitlyClosed = false;
    this.reconnectAttempts = 0;
    this.connect();
  }
}

export const wsClient = new WebSocketClientService();
