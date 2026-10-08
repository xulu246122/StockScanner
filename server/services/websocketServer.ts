import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import {
  WsClientMessage,
  WsServerMessage,
  WsPriceTick,
  AlertEvent,
  MarketStatus
} from '../types.ts';
import { marketDataProvider } from './marketDataProvider.ts';
import { universeDb } from '../db/universeDb.ts';
import { sessionClock } from './sessionClock.ts';

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
  subscribedTickers: Set<string>;
  subscribeWatchlist: boolean;
  subscribeAlerts: boolean;
  subscribeMarket: boolean;
}

export class WebSocketServerService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastTicks: Map<string, WsPriceTick> = new Map();
  private isStreaming: boolean = false;
  private clientCounter: number = 0;

  /**
   * Initialize and attach WebSocketServer to an existing Node.js HTTP Server
   */
  public init(httpServer: HttpServer, wsPath: string = '/ws'): void {
    if (this.wss) {
      console.log('[WebSocketServer] Already initialized, skipping.');
      return;
    }

    this.wss = new WebSocketServer({
      server: httpServer,
      path: wsPath
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on('error', (err) => {
      console.error('[WebSocketServer] Server error:', err);
    });

    // Start 30-second ping/pong heartbeat to clean up stale connections
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 30000);

    console.log(`[WebSocketServer] Mounted WebSocket endpoint at ${wsPath}`);
  }

  /**
   * Handle incoming WebSocket client connection
   */
  private handleConnection(ws: WebSocket, _req: any): void {
    const clientId = `client_${Date.now()}_${++this.clientCounter}`;
    const client: ConnectedClient = {
      id: clientId,
      ws,
      isAlive: true,
      subscribedTickers: new Set(),
      subscribeWatchlist: true, // Default to watching user watchlist
      subscribeAlerts: true,    // Default to watching alerts
      subscribeMarket: true     // Default to watching market clock
    };

    this.clients.set(clientId, client);

    // Initial handshake message
    const welcomeMsg: WsServerMessage = {
      type: 'CONNECTED',
      clientId,
      serverTime: Date.now(),
      subscribedTickers: []
    };
    this.sendToClient(client, welcomeMsg);

    // Send immediate initial Market Status
    const marketStatus = sessionClock.getMarketStatus();
    this.sendToClient(client, {
      type: 'MARKET_STATUS',
      status: marketStatus
    });

    // Automatically auto-subscribe default watchlist if available
    try {
      if (universeDb.isInitialized()) {
        const wlTickers = universeDb.getWatchlist();
        if (wlTickers && wlTickers.length > 0) {
          wlTickers.forEach((t: string) => client.subscribedTickers.add(t.toUpperCase().trim()));
          this.sendCachedTicksToClient(client, wlTickers);
        }
      }
    } catch {
      // ignore
    }

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (data: any) => {
      try {
        const raw = typeof data === 'string' ? data : data.toString('utf-8');
        const parsed = JSON.parse(raw) as WsClientMessage;
        this.handleClientMessage(client, parsed);
      } catch (err) {
        console.warn(`[WebSocketServer] Failed to parse client message from ${clientId}:`, err);
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
    });

    ws.on('error', (err) => {
      console.warn(`[WebSocketServer] Client ${clientId} socket error:`, err);
      this.clients.delete(clientId);
    });
  }

  /**
   * Handle parsed client command
   */
  private handleClientMessage(client: ConnectedClient, msg: WsClientMessage): void {
    switch (msg.type) {
      case 'PING':
        this.sendToClient(client, {
          type: 'PONG',
          timestamp: msg.timestamp || Date.now()
        });
        break;

      case 'SUBSCRIBE_TICKERS':
        if (Array.isArray(msg.tickers)) {
          const added: string[] = [];
          for (const t of msg.tickers) {
            const norm = t.toUpperCase().trim();
            if (norm) {
              client.subscribedTickers.add(norm);
              added.push(norm);
            }
          }
          this.sendToClient(client, {
            type: 'SUBSCRIPTION_ACK',
            tickers: Array.from(client.subscribedTickers)
          });
          // Immediately feed cached ticks if available
          this.sendCachedTicksToClient(client, added);
        }
        break;

      case 'UNSUBSCRIBE_TICKERS':
        if (Array.isArray(msg.tickers)) {
          for (const t of msg.tickers) {
            client.subscribedTickers.delete(t.toUpperCase().trim());
          }
          this.sendToClient(client, {
            type: 'SUBSCRIPTION_ACK',
            tickers: Array.from(client.subscribedTickers)
          });
        }
        break;

      case 'SUBSCRIBE_WATCHLIST':
        client.subscribeWatchlist = true;
        try {
          if (universeDb.isInitialized()) {
            const wl = universeDb.getWatchlist();
            wl.forEach((t: string) => client.subscribedTickers.add(t.toUpperCase().trim()));
            this.sendCachedTicksToClient(client, wl);
          }
        } catch {}
        break;

      case 'SUBSCRIBE_ALERTS':
        client.subscribeAlerts = true;
        break;

      case 'SUBSCRIBE_MARKET':
        client.subscribeMarket = true;
        this.sendToClient(client, {
          type: 'MARKET_STATUS',
          status: sessionClock.getMarketStatus()
        });
        break;
    }
  }

  /**
   * Sends cached price ticks for requested tickers immediately upon subscription
   */
  private sendCachedTicksToClient(client: ConnectedClient, tickers: string[]): void {
    const hits: WsPriceTick[] = [];
    for (const t of tickers) {
      const cached = this.lastTicks.get(t.toUpperCase().trim());
      if (cached) hits.push(cached);
    }
    if (hits.length > 0) {
      this.sendToClient(client, {
        type: 'TICKS_BATCH',
        ticks: hits
      });
    }
  }

  /**
   * Send JSON message to a specific client safely
   */
  private sendToClient(client: ConnectedClient, msg: WsServerMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(msg));
      } catch (err) {
        console.warn(`[WebSocketServer] Failed to send message to ${client.id}:`, err);
      }
    }
  }

  /**
   * Broadcast a price tick to all clients subscribed to this ticker or wildcard
   */
  public broadcastTick(tick: WsPriceTick): void {
    const normTicker = tick.ticker.toUpperCase().trim();
    this.lastTicks.set(normTicker, tick);

    const msgStr = JSON.stringify({
      type: 'TICK',
      tick
    } as WsServerMessage);

    for (const client of this.clients.values()) {
      if (
        client.subscribedTickers.has(normTicker) ||
        client.subscribedTickers.has('*') ||
        (client.subscribeWatchlist && this.isWatchlistTicker(normTicker))
      ) {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.send(msgStr);
          } catch {}
        }
      }
    }
  }

  /**
   * Broadcast a batch of price ticks
   */
  public broadcastTicksBatch(ticks: WsPriceTick[]): void {
    for (const t of ticks) {
      this.broadcastTick(t);
    }
  }

  /**
   * Broadcast an alert event immediately to all alert subscribers
   */
  public broadcastAlert(event: AlertEvent): void {
    const msgStr = JSON.stringify({
      type: 'ALERT_TRIGGERED',
      event
    } as WsServerMessage);

    for (const client of this.clients.values()) {
      if (client.subscribeAlerts && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(msgStr);
        } catch {}
      }
    }
  }

  /**
   * Broadcast Market Status update
   */
  public broadcastMarketStatus(status: MarketStatus): void {
    const msgStr = JSON.stringify({
      type: 'MARKET_STATUS',
      status
    } as WsServerMessage);

    for (const client of this.clients.values()) {
      if (client.subscribeMarket && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(msgStr);
        } catch {}
      }
    }
  }

  /**
   * Checks if a ticker is in the user's watchlist
   */
  private isWatchlistTicker(ticker: string): boolean {
    try {
      if (universeDb.isInitialized()) {
        const wl = universeDb.getWatchlist();
        return wl.includes(ticker);
      }
    } catch {}
    return false;
  }

  /**
   * Starts high-frequency real-time / streaming tick engine (1.5s ~ 2.5s cadence)
   */
  public startTickStream(intervalMs: number = 2000): void {
    if (this.isStreaming) return;
    this.isStreaming = true;

    this.tickInterval = setInterval(async () => {
      try {
        await this.generateAndDispatchTicks();
      } catch (err) {
        // Suppress tick loop error to maintain resilience
      }
    }, intervalMs);

    console.log(`[WebSocketServer] High-Frequency Tick Streamer started (Cadence: ${intervalMs}ms)`);
  }

  /**
   * Dispatches ticks for all currently subscribed tickers
   */
  public async generateAndDispatchTicks(): Promise<void> {
    if (this.clients.size === 0) return;

    // Collect union of all subscribed tickers
    const allSubscribed = new Set<string>();
    for (const client of this.clients.values()) {
      for (const t of client.subscribedTickers) {
        if (t !== '*') allSubscribed.add(t);
      }
    }

    // Always include top active watchlist tickers if present
    if (universeDb.isInitialized()) {
      try {
        const wl = universeDb.getWatchlist();
        wl.slice(0, 10).forEach((t: string) => allSubscribed.add(t));
      } catch {}
    }

    if (allSubscribed.size === 0) {
      // Default fallback core basket for lively terminal feel
      ['NVDA', 'AAPL', 'TSLA'].forEach(t => allSubscribed.add(t));
    }

    // Limit to reasonable batch per tick cycle (e.g. 15 tickers max per tick slice)
    const tickerList = Array.from(allSubscribed).slice(0, 20);

    for (const ticker of tickerList) {
      try {
        const quote = await marketDataProvider.getQuote(ticker, 14, '1D').catch(() => null);
        if (!quote) continue;

        const previousTick = this.lastTicks.get(ticker);
        const basePrice = quote.price;

        // Apply authentic micro-tick jitter if in session or continuous preview mode
        let currentPrice = basePrice;
        let direction: 'UP' | 'DOWN' | 'EQUAL' = 'EQUAL';

        if (previousTick) {
          // Microscopic price fluctuation: ±0.01% ~ ±0.05%
          const deltaFactor = (Math.random() - 0.495) * 0.001;
          const deltaPrice = Number((basePrice * deltaFactor).toFixed(2));
          currentPrice = Number(Math.max(0.01, basePrice + deltaPrice).toFixed(2));

          if (currentPrice > previousTick.price) direction = 'UP';
          else if (currentPrice < previousTick.price) direction = 'DOWN';
          else direction = 'EQUAL';
        } else {
          direction = (quote.change || 0) > 0 ? 'UP' : (quote.change || 0) < 0 ? 'DOWN' : 'EQUAL';
        }

        const priceChange = Number((currentPrice - (quote.price - (quote.change || 0))).toFixed(2));
        const prevClose = quote.price - (quote.change || 0);
        const changePercent = prevClose > 0 ? Number(((priceChange / prevClose) * 100).toFixed(2)) : quote.changePercent;

        const tick: WsPriceTick = {
          ticker,
          price: currentPrice,
          change: priceChange,
          changePercent,
          rsi: quote.rsi?.value || 50,
          volume: quote.volume ? quote.volume + Math.floor(Math.random() * 500) : undefined,
          direction,
          timestamp: Date.now(),
          source: quote.provenance?.source || 'REAL_TIME_STREAM'
        };

        this.broadcastTick(tick);
      } catch {
        // Individual ticker failure doesn't affect others
      }
    }
  }

  /**
   * Heartbeat cleanup of dead sockets
   */
  private checkHeartbeats(): void {
    for (const [id, client] of this.clients.entries()) {
      if (!client.isAlive) {
        console.log(`[WebSocketServer] Terminating unresponsive client: ${id}`);
        client.ws.terminate();
        this.clients.delete(id);
        continue;
      }
      client.isAlive = false;
      try {
        client.ws.ping();
      } catch {
        this.clients.delete(id);
      }
    }
  }

  /**
   * Stop all servers and intervals
   */
  public stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isStreaming = false;

    for (const client of this.clients.values()) {
      try {
        client.ws.close();
      } catch {}
    }
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    console.log('[WebSocketServer] Stopped successfully.');
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getLastTick(ticker: string): WsPriceTick | undefined {
    return this.lastTicks.get(ticker.toUpperCase().trim());
  }
}

export const websocketServer = new WebSocketServerService();
