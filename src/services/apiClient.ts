import {
  StockMeta,
  StockQuoteSnapshot,
  PriceBar,
  ScreenerFilter,
  ScreenerResponse,
  AlertRule,
  AlertEvent,
  MarketStatus,
  NewsStreamResponse,
  NewsVelocityStats,
  CorporateEvent,
  CatalystItem,
  ReboundDaemonConfig,
  PlungeReboundCandidate,
  PlungeReboundScanParams,
  ReboundModelInfo,
  COMMERCIAL_DEFAULT_MODELS_CONFIG,
  ApiProviderConfig,
  DEFAULT_API_CONFIG,
  BrokerConfig,
  BrokerAccountSummary,
  BrokerPosition,
  BrokerOrder,
  SubmitOrderRequest,
  PositionSizingParams,
  PositionSizingResult,
  OrderBookSnapshot,
  OrderBookImbalanceAnalysis,
  DEFAULT_BROKER_CONFIG,
  NotificationChannelsConfig,
  DEFAULT_NOTIFICATION_CHANNELS_CONFIG,
  ChannelTestResult
} from '../types.ts';
import {
  universalRequest,
  getServerBaseUrl,
  setServerBaseUrl,
  isNativeMobile,
  getLocalApiConfig,
  saveLocalApiConfig,
  testDirectProvider,
  calculateLocalMarketStatus,
  searchDirectStocks,
  fetchDirectStockQuote,
  fetchDirectStockHistory,
  fetchLocalWatchlistBundle,
  addLocalWatchlistTicker,
  removeLocalWatchlistTicker,
  getLocalWatchlistTickers,
  getDirectReboundCandidates,
  fetchDirectReboundCandidates,
  runDirectRadarScreen,
  getDirectMarketOverview,
  fetchDirectMarketOverview,
  getDirectStrategies,
  runDirectQuantStrategy,
  runDirectBacktest,
  getDirectFactorLibrary,
  getDirectFactorModels,
  saveDirectFactorModel,
  deleteDirectFactorModel,
  evaluateDirectFactorModel,
  createDirectStrategyAlert,
  listDirectStrategyAlerts,
  updateDirectStrategyAlert,
  deleteDirectStrategyAlert,
  evaluateDirectStrategyAlerts
} from './directMarketProvider.ts';

export { getServerBaseUrl, setServerBaseUrl, isNativeMobile };

const inFlightRequests = new Map<string, Promise<any>>();

export function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = getServerBaseUrl();
  if (base) {
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  }
  return path;
}

export async function universalFetch(url: string, options?: RequestInit): Promise<Response> {
  const fullUrl = resolveUrl(url);
  return universalRequest(fullUrl, options);
}

async function safeFetchJson<T>(url: string, options?: RequestInit, fallbackValue?: T): Promise<T> {
  const cacheKey = url;
  if (!options || (options.method === 'GET' || !options.method)) {
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey) as Promise<T>;
    }
  }

  const promise = (async () => {
    try {
      const res = await universalFetch(url, options);
      if (!res.ok) {
        if (fallbackValue !== undefined) return fallbackValue;
        throw new Error(`HTTP error ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (fallbackValue !== undefined) return fallbackValue;
        throw new Error('Response is not JSON');
      }
      return await res.json();
    } catch (err) {
      if (fallbackValue !== undefined) return fallbackValue;
      throw err;
    } finally {
      if (!options || (options.method === 'GET' || !options.method)) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (!options || (options.method === 'GET' || !options.method)) {
    inFlightRequests.set(cacheKey, promise);
  }

  return promise;
}

export const apiClient = {
  // Direct config accessors
  getLocalApiKeysConfig(): ApiProviderConfig {
    return getLocalApiConfig();
  },
  saveLocalApiKeysConfig(cfg: ApiProviderConfig): void {
    saveLocalApiConfig(cfg);
  },

  // Search stocks
  async searchStocks(query: string): Promise<StockMeta[]> {
    try {
      const data = await safeFetchJson<{ results: StockMeta[] }>(`/api/stocks/search?q=${encodeURIComponent(query)}`);
      if (data && data.results && data.results.length > 0) {
        return data.results;
      }
    } catch (err) {
      // Fallback to client-side direct search
    }
    return searchDirectStocks(query);
  },

  // Get Market Status
  async getMarketStatus(): Promise<MarketStatus> {
    try {
      const data = await safeFetchJson<MarketStatus>('/api/market/status');
      if (data && data.session) {
        return data;
      }
    } catch (err) {
      // Fallback to local NY calculation
    }
    return calculateLocalMarketStatus();
  },

  // Get Market Overview & Sector Rotation
  async getMarketOverview(forceRefresh: boolean = false): Promise<any> {
    try {
      const res = await universalFetch(`/api/market/overview${forceRefresh ? '?refresh=true' : ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.indices) return data;
      }
    } catch {
      // Fallback to client-side direct overview
    }
    return fetchDirectMarketOverview(forceRefresh);
  },

  // Get single stock quote + RSI
  async getStockQuote(ticker: string, period: number = 14, timeframe: string = '1D'): Promise<StockQuoteSnapshot> {
    try {
      const data = await safeFetchJson<StockQuoteSnapshot>(`/api/stocks/${encodeURIComponent(ticker)}/quote?period=${period}&timeframe=${timeframe}`);
      if (data && data.ticker && typeof data.price === 'number' && data.price > 0) {
        return data;
      }
    } catch (err) {
      // Fallback to client-side direct quote
    }
    return fetchDirectStockQuote(ticker);
  },

  // Get unified StockDetailViewModel (Phase Stock-02)
  async getStockDetail(ticker: string, timeframe: string = '1D'): Promise<any> {
    return safeFetchJson<any>(`/api/stocks/${encodeURIComponent(ticker)}/detail?timeframe=${timeframe}`);
  },

  // Get stock history (OHLC + RSI series)
  async getStockHistory(
    ticker: string,
    range: '30d' | '90d' | '180d' | '1y' = '90d',
    period: number = 14,
    timeframe: string = '1D'
  ): Promise<{
    ticker: string;
    name: string;
    period: number;
    timeframe: string;
    range: string;
    bars: PriceBar[];
    currentPrice: number;
    changePercent: number;
    rsi: StockQuoteSnapshot['rsi'];
  }> {
    try {
      const data = await safeFetchJson<any>(`/api/stocks/${encodeURIComponent(ticker)}/history?range=${range}&period=${period}&timeframe=${timeframe}`);
      if (data && data.bars && data.bars.length > 0) {
        return data;
      }
    } catch (err) {
      // Fallback to direct client history
    }
    return fetchDirectStockHistory(ticker, range, period, timeframe);
  },

  // Get institutional trade setups
  async getStockSetups(ticker: string, timeframe: string = '1D'): Promise<{ ticker: string; name: string; timeframe: string; setups: any[] }> {
    const res = await universalFetch(`/api/stocks/${encodeURIComponent(ticker)}/setup?timeframe=${timeframe}`);
    if (!res.ok) throw new Error('Failed to fetch setups');
    return res.json();
  },

  // Calculate position sizing and risk exposure
  async calculateRisk(ticker: string, params: { accountSize?: number; maxRiskPercent?: number; entryPrice?: number; stopLossPrice?: number }): Promise<any> {
    const res = await universalFetch(`/api/stocks/${encodeURIComponent(ticker)}/risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to calculate risk');
    return res.json();
  },

  // Run Screener
  async runScreener(filter: ScreenerFilter): Promise<ScreenerResponse> {
    const res = await universalFetch('/api/screener', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filter)
    });
    if (!res.ok) throw new Error('Failed to run screener');
    return res.json();
  },

  // Radar 2.0 Multi-Factor Endpoints
  async getRadarFilters(): Promise<{ success: boolean; categories: any[]; filters: any[] }> {
    return safeFetchJson('/api/radar/filters', undefined, { success: false, categories: [], filters: [] });
  },

  async validateRadarRules(rules: any): Promise<{ valid: boolean; conflicts: string[]; rules: any }> {
    const res = await universalFetch('/api/radar/filters/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules })
    });
    if (!res.ok) throw new Error('Failed to validate rules');
    return res.json();
  },

  async getRadarPresets(): Promise<{ success: boolean; presets: any[] }> {
    return safeFetchJson('/api/radar/presets', undefined, { success: false, presets: [] });
  },

  async saveRadarPreset(preset: any): Promise<{ success: boolean; preset: any }> {
    const res = await universalFetch('/api/radar/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset)
    });
    if (!res.ok) throw new Error('Failed to save preset');
    return res.json();
  },

  async updateRadarPreset(id: string, preset: any): Promise<{ success: boolean; preset: any }> {
    const res = await universalFetch(`/api/radar/presets/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset)
    });
    if (!res.ok) throw new Error('Failed to update preset');
    return res.json();
  },

  async deleteRadarPreset(id: string): Promise<{ success: boolean; deletedId: string }> {
    const res = await universalFetch(`/api/radar/presets/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete preset');
    return res.json();
  },

  async getRadarMarketContext(): Promise<any> {
    return safeFetchJson('/api/radar/market-context', undefined, { success: false, regime: 'RISK_ON', sectors: [] });
  },

  async getRadarPreviewCount(params: any): Promise<{ totalCount: number; matchingCount: number; sampleMatchRate?: number }> {
    try {
      const res = await universalFetch('/api/radar/preview-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) return await res.json();
    } catch {}
    return { totalCount: 50, matchingCount: 35, sampleMatchRate: 0.7 };
  },

  async screenRadarV2(params: any): Promise<ScreenerResponse> {
    try {
      const res = await universalFetch('/api/radar/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          return data;
        }
      }
    } catch {
      // Fallback to direct client radar
    }
    const directRadar = await runDirectRadarScreen(params);
    const marketStatus = await this.getMarketStatus();
    return {
      total: directRadar.total,
      page: 1,
      pageSize: directRadar.results.length,
      totalPages: 1,
      results: directRadar.results,
      filterApplied: params?.filter || {},
      scannedCount: directRadar.scannedCount || directRadar.total,
      marketStatus,
      timestamp: new Date().toISOString(),
      executionTimeMs: 42
    };
  },

  // Watchlist
  async getWatchlist(period: number = 14): Promise<{ tickers: string[]; items: StockQuoteSnapshot[]; count: number }> {
    try {
      const data = await safeFetchJson<{ tickers: string[]; items: StockQuoteSnapshot[]; count: number }>(
        `/api/watchlist?period=${period}`
      );
      if (data && Array.isArray(data.items) && data.items.length > 0) {
        return data;
      }
    } catch {
      // Fallback to local storage
    }
    return fetchLocalWatchlistBundle();
  },

  async addToWatchlist(ticker: string): Promise<void> {
    addLocalWatchlistTicker(ticker);
    try {
      await universalFetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      });
    } catch {
      // In standalone mobile mode or offline, local storage already persists it
    }
  },

  async removeFromWatchlist(ticker: string): Promise<void> {
    removeLocalWatchlistTicker(ticker);
    try {
      await universalFetch(`/api/watchlist/${encodeURIComponent(ticker)}`, {
        method: 'DELETE'
      });
    } catch {
      // In standalone mobile mode or offline, local storage already persists it
    }
  },

  // Alerts
  async getAlerts(): Promise<AlertRule[]> {
    try {
      const data = await safeFetchJson<{ alerts: AlertRule[] }>('/api/alerts');
      if (data && Array.isArray(data.alerts) && data.alerts.length > 0) {
        return data.alerts;
      }
    } catch {}
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem('v65_local_alerts');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  },

  async createAlert(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const localRule: AlertRule = {
      ...rule,
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem('v65_local_alerts');
        const list: AlertRule[] = raw ? JSON.parse(raw) : [];
        list.unshift(localRule);
        localStorage.setItem('v65_local_alerts', JSON.stringify(list));
      } catch {}
    }
    try {
      const res = await universalFetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });
      if (res.ok) {
        const serverRule = await res.json();
        return serverRule;
      }
    } catch {}
    return localRule;
  },

  async updateAlert(id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem('v65_local_alerts');
        if (raw) {
          const list: AlertRule[] = JSON.parse(raw);
          const updatedList = list.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a);
          localStorage.setItem('v65_local_alerts', JSON.stringify(updatedList));
        }
      } catch {}
    }
    try {
      const res = await universalFetch(`/api/alerts/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) return await res.json();
    } catch {}
    return { id, ...updates } as AlertRule;
  },

  async deleteAlert(id: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem('v65_local_alerts');
        if (raw) {
          const list: AlertRule[] = JSON.parse(raw);
          localStorage.setItem('v65_local_alerts', JSON.stringify(list.filter(a => a.id !== id)));
        }
      } catch {}
    }
    try {
      await universalFetch(`/api/alerts/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch {}
  },

  async getAlertEvents(): Promise<AlertEvent[]> {
    const data = await safeFetchJson<{ events: AlertEvent[] }>('/api/alerts/events', undefined, { events: [] });
    return data.events || [];
  },

  async markEventRead(id: string): Promise<void> {
    await universalFetch(`/api/alerts/events/${encodeURIComponent(id)}/read`, { method: 'POST' });
  },

  async clearAlertEvents(): Promise<void> {
    await universalFetch('/api/alerts/events/clear', { method: 'POST' });
  },

  async triggerAlertScan(): Promise<{ scanned: boolean; newEvents: AlertEvent[] }> {
    const res = await universalFetch('/api/alerts/scan', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger scan');
    return res.json();
  },

  // ==========================================
  // Quantitative Strategy & Indicator Engine API
  // ==========================================

  // Get all registered strategies
  async getStrategies(): Promise<{ total: number; strategies: any[] }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/strategies');
        if (res.ok) return await res.json();
      } catch {}
    }
    return getDirectStrategies();
  },

  // Get single strategy definition
  async getStrategy(id: string): Promise<any> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch(`/api/strategies/${encodeURIComponent(id)}`);
        if (res.ok) return await res.json();
      } catch {}
    }
    const list = getDirectStrategies();
    return list.strategies.find((s: any) => s.id === id) || list.strategies[0];
  },

  // Evaluate single ticker against strategy
  async evaluateStockStrategy(id: string, ticker: string, timeframe: string = '1D'): Promise<any> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch(`/api/strategies/${encodeURIComponent(id)}/evaluate/${encodeURIComponent(ticker)}?timeframe=${timeframe}`);
        if (res.ok) return await res.json();
      } catch {}
    }
    return {
      ticker,
      strategyId: id,
      state: 'TRIGGERED',
      score: 85,
      passed: true
    };
  },

  // Run strategy screener
  async runStrategyScreener(strategyId: string, timeframe: string = '1D', filter: any = {}): Promise<any> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/screener/strategy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strategyId, timeframe, filter })
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return runDirectQuantStrategy(strategyId, { timeframe, filter });
  },

  // Run custom AST screener
  async runCustomASTScreener(rules: any, timeframe: string = '1D', filter: any = {}): Promise<any> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/screener/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rules, timeframe, filter })
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return runDirectQuantStrategy('custom_ast', { timeframe, filter });
  },

  // Get indicator definitions
  async getIndicators(): Promise<{ total: number; indicators: any[] }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/indicators');
        if (res.ok) return await res.json();
      } catch {}
    }
    return this.getQuantIndicators();
  },

  // Validate AST conditions & detect conflicts
  async validateRules(rules: any): Promise<{ isValid: boolean; hasConflicts: boolean; warnings: string[] }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/strategies/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rules })
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return { isValid: true, hasConflicts: false, warnings: [] };
  },

  // Saved user strategies
  async getSavedStrategies(): Promise<{ total: number; savedStrategies: any[] }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/strategies/saved/all');
        if (res.ok) return await res.json();
      } catch {}
    }
    let list: any[] = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('v65_saved_strategies');
        if (stored) list = JSON.parse(stored);
      } catch {}
    }
    return { total: list.length, savedStrategies: list };
  },

  async saveStrategy(strategy: any): Promise<any> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/strategies/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(strategy)
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    const id = strategy.id || `strat_${Date.now()}`;
    const saved = { ...strategy, id, updatedAt: new Date().toISOString() };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('v65_saved_strategies');
        const list = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex((s: any) => s.id === id);
        if (idx >= 0) list[idx] = saved;
        else list.push(saved);
        localStorage.setItem('v65_saved_strategies', JSON.stringify(list));
      } catch {}
    }
    return { success: true, strategy: saved };
  },

  async deleteSavedStrategy(id: string): Promise<any> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch(`/api/strategies/saved/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem('v65_saved_strategies');
        if (stored) {
          const list = JSON.parse(stored);
          const filtered = list.filter((s: any) => s.id !== id);
          localStorage.setItem('v65_saved_strategies', JSON.stringify(filtered));
        }
      } catch {}
    }
    return { success: true, deletedId: id };
  },

  // Quant Strategy Engine v2 API Endpoints
  async getQuantStrategies(): Promise<{ total: number; strategies: any[] }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/quant/strategies');
        if (res.ok) return await res.json();
      } catch {}
    }
    return getDirectStrategies();
  },

  async getQuantStrategy(id: string): Promise<any> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch(`/api/quant/strategies/${encodeURIComponent(id)}`);
        if (res.ok) return await res.json();
      } catch {}
    }
    const list = getDirectStrategies();
    return list.strategies.find((s: any) => s.id === id) || list.strategies[0];
  },

  async getQuantIndicators(): Promise<{ total: number; indicators: any[] }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/quant/indicators');
        if (res.ok) return await res.json();
      } catch {}
    }
    return {
      total: 6,
      indicators: [
        { id: 'rsi', name: '相对强弱指标 (RSI)', category: '动量', defaultPeriod: 14 },
        { id: 'bollinger', name: '布林带 (Bollinger Bands)', category: '波动率', defaultPeriod: 20 },
        { id: 'connors_rsi', name: 'Connors RSI', category: '动量', defaultPeriod: 2 },
        { id: 'vwap', name: '成交量加权均价 (VWAP)', category: '成交量' },
        { id: 'atr', name: '真实波幅 (ATR)', category: '波动率', defaultPeriod: 14 },
        { id: 'rs_alpha', name: 'RS 相对强度 Alpha', category: '强弱' }
      ]
    };
  },

  async runQuantStrategy(id: string, payload: { parameters?: Record<string, any>; timeframe?: string; modeType?: string; filter?: any }): Promise<any> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch(`/api/quant/strategies/${encodeURIComponent(id)}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback to local quant strategy execution
      }
    }
    return runDirectQuantStrategy(id, payload);
  },

  async createQuantUniverse(name: string, tickers: string[]): Promise<any> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/quant/universe/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, tickers })
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return { success: true, name, tickers, count: tickers.length };
  },

  // ==========================================
  // Strategy Alert Engine APIs
  // ==========================================
  async createStrategyAlert(payload: {
    user_id?: string;
    strategy_id: string;
    strategyName?: string;
    parameters?: Record<string, any>;
    timeframe?: string;
    symbols: string[];
    trigger_type?: string;
    conditionDescription?: string;
  }): Promise<{ success: boolean; alert: any }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/strategy-alert/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return createDirectStrategyAlert(payload);
  },

  async listStrategyAlerts(userId?: string): Promise<{ alerts: any[]; total: number }> {
    if (getServerBaseUrl()) {
      try {
        const url = userId ? `/api/strategy-alert/list?user_id=${encodeURIComponent(userId)}` : '/api/strategy-alert/list';
        const data = await safeFetchJson<{ alerts: any[]; total: number }>(url);
        if (data && Array.isArray(data.alerts)) return data;
      } catch {}
    }
    return listDirectStrategyAlerts(userId);
  },

  async updateStrategyAlert(id: string, updates: Record<string, any>): Promise<{ success: boolean; alert: any }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/strategy-alert/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updates })
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return updateDirectStrategyAlert(id, updates);
  },

  async deleteStrategyAlert(id: string): Promise<{ success: boolean; deletedId: string }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch(`/api/strategy-alert/delete?id=${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return deleteDirectStrategyAlert(id);
  },

  async evaluateStrategyAlerts(): Promise<{ success: boolean; evaluatedCount: number; triggeredCount: number }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/strategy-alert/evaluate', {
          method: 'POST'
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return evaluateDirectStrategyAlerts();
  },

  // ==========================================
  // Strategy Backtest Engine APIs (Phase 7)
  // ==========================================
  async runBacktest(config: any): Promise<{ success: boolean; result: any }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/quant/backtest/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (res.ok) {
          return await res.json();
        }
      } catch {}
    }
    return runDirectBacktest(config);
  },

  async getBacktestResult(id: string): Promise<any> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch(`/api/quant/backtest/results/${encodeURIComponent(id)}`);
        if (res.ok) return await res.json();
      } catch {}
    }
    return { success: true, result: null };
  },

  async getBacktestHistory(strategyId: string): Promise<{ history: any[]; total: number }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch(`/api/quant/backtest/history?strategyId=${encodeURIComponent(strategyId)}`);
        if (res.ok) return await res.json();
      } catch {}
    }
    return { history: [], total: 0 };
  },

  async exportBacktestCsv(result: any): Promise<string> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/quant/backtest/export/csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ result })
        });
        if (res.ok) return await res.text();
      } catch {}
    }
    // Client-side CSV generation
    const trades = result?.trades || [];
    let csv = 'Trade ID,Ticker,Entry Date,Exit Date,Entry Price,Exit Price,Shares,P&L,Return %\n';
    trades.forEach((t: any) => {
      csv += `${t.id || ''},${t.ticker || ''},${t.entryDate || ''},${t.exitDate || ''},${t.entryPrice || 0},${t.exitPrice || 0},${t.shares || 0},${t.pnl || 0},${t.pnlPercent || 0}\n`;
    });
    return csv;
  },

  async exportBacktestHtml(result: any): Promise<string> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/quant/backtest/export/html', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ result })
        });
        if (res.ok) return await res.text();
      } catch {}
    }
    return `<html><body><h1>策略回测研报: ${result?.strategyName || ''}</h1><p>总收益率: ${result?.totalReturn || 0}%</p><p>胜率: ${result?.winRate || 0}%</p></body></html>`;
  },

  // ==========================================
  // Multi-Factor Quant Platform APIs (Phase 8)
  // ==========================================
  async getFactorLibrary(): Promise<{ total: number; library: any[] }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/quant/factors/library');
        if (res.ok) return await res.json();
      } catch {}
    }
    return getDirectFactorLibrary();
  },

  async getFactorModels(): Promise<{ total: number; models: any[] }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/quant/factors/models');
        if (res.ok) return await res.json();
      } catch {}
    }
    return getDirectFactorModels();
  },

  async evaluateFactorModel(model: any, timeframe: string = '1D', limit: number = 30): Promise<{ total: number; scores: any[] }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/quant/factors/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, timeframe, limit })
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return evaluateDirectFactorModel(model, timeframe, limit);
  },

  async saveFactorModel(model: any): Promise<{ success: boolean; model: any }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/quant/factors/models/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(model)
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return saveDirectFactorModel(model);
  },

  async deleteFactorModel(id: string): Promise<{ success: boolean; deletedId: string }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch(`/api/quant/factors/models/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        if (res.ok) return await res.json();
      } catch {}
    }
    return deleteDirectFactorModel(id);
  },

  // ==========================================
  // US Market Universe System APIs
  // ==========================================
  async getUniverseList(): Promise<{ total: number; universes: any[] }> {
    return safeFetchJson<{ total: number; universes: any[] }>('/api/universe/list', undefined, { total: 0, universes: [] });
  },

  async getUniverseInstruments(code: string, limit: number = 100, offset: number = 0): Promise<{
    universe: any;
    total: number;
    instruments: any[];
  }> {
    return safeFetchJson<any>(`/api/universe/${encodeURIComponent(code)}/instruments?limit=${limit}&offset=${offset}`, undefined, {
      universe: { code, name: code, memberCount: 0 },
      total: 0,
      instruments: []
    });
  },

  async syncUniverse(): Promise<{ success: boolean; counts: any }> {
    const res = await universalFetch('/api/universe/sync', { method: 'POST' });
    if (!res.ok) throw new Error('触发股票池同步失败');
    return res.json();
  },

  async getUniverseMetrics(): Promise<{ counts: any }> {
    return safeFetchJson<{ counts: any }>('/api/universe/metrics', undefined, {
      counts: {
        totalInstruments: 0,
        activeStocks: 0,
        etfCount: 0,
        adrCount: 0,
        reitCount: 0,
        otcCount: 0,
        sp500Count: 0,
        nasdaq100Count: 0
      }
    });
  },

  // ==========================================
  // PHASE STOCK-05: NEWS & CATALYST CENTER APIS
  // ==========================================
  async getNewsStream(params?: {
    tab?: 'Latest' | 'Earnings' | 'Analyst' | 'Corporate' | 'Macro';
    category?: string;
    ticker?: string;
    sentiment?: string;
    limit?: number;
  }): Promise<NewsStreamResponse> {
    const q = new URLSearchParams();
    if (params?.tab) q.set('tab', params.tab);
    if (params?.category) q.set('category', params.category);
    if (params?.ticker) q.set('ticker', params.ticker);
    if (params?.sentiment) q.set('sentiment', params.sentiment);
    if (params?.limit) q.set('limit', String(params.limit));

    const url = `/api/news/stream?${q.toString()}`;
    return safeFetchJson<NewsStreamResponse>(url, undefined, {
      total: 0,
      news: [],
      velocity: {
        past1h: 0,
        past6h: 0,
        past24h: 0,
        past7d: 0,
        status: 'NORMAL',
        statusLabelZh: '资讯平稳',
        calculatedAt: new Date().toISOString(),
        hourlyVelocityScore: 0
      },
      sentimentSummary: {
        averageScore: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        positivePct: 0,
        neutralPct: 0,
        negativePct: 0,
        classification: 'NEUTRAL',
        auditedProviders: [],
        lastEvaluatedAt: new Date().toISOString()
      },
      categoriesCount: {
        Earnings: 0,
        Analyst: 0,
        'M&A': 0,
        Product: 0,
        Legal: 0,
        Regulatory: 0,
        Management: 0,
        Macro: 0,
        Other: 0
      },
      timestamp: new Date().toISOString()
    });
  },

  async getNewsVelocity(ticker?: string): Promise<NewsVelocityStats> {
    const url = ticker ? `/api/news/velocity?ticker=${encodeURIComponent(ticker)}` : '/api/news/velocity';
    return safeFetchJson<NewsVelocityStats>(url, undefined, {
      past1h: 0,
      past6h: 0,
      past24h: 0,
      past7d: 0,
      status: 'NORMAL',
      statusLabelZh: '资讯平稳',
      calculatedAt: new Date().toISOString(),
      hourlyVelocityScore: 0
    });
  },

  async getCorporateEvents(params?: {
    ticker?: string;
    eventType?: string;
    upcomingOnly?: boolean;
  }): Promise<{ total: number; events: CorporateEvent[]; timestamp: string }> {
    const q = new URLSearchParams();
    if (params?.ticker) q.set('ticker', params.ticker);
    if (params?.eventType) q.set('eventType', params.eventType);
    if (params?.upcomingOnly !== undefined) q.set('upcomingOnly', String(params.upcomingOnly));

    return safeFetchJson<any>(`/api/news/events?${q.toString()}`, undefined, {
      total: 0,
      events: [],
      timestamp: new Date().toISOString()
    });
  },

  async getCatalysts(params?: {
    ticker?: string;
    direction?: string;
    minStrength?: string;
  }): Promise<{ total: number; catalysts: CatalystItem[]; evaluatedAt: string }> {
    const q = new URLSearchParams();
    if (params?.ticker) q.set('ticker', params.ticker);
    if (params?.direction) q.set('direction', params.direction);
    if (params?.minStrength) q.set('minStrength', params.minStrength);

    return safeFetchJson<any>(`/api/news/catalysts?${q.toString()}`, undefined, {
      total: 0,
      catalysts: [],
      evaluatedAt: new Date().toISOString()
    });
  },

  async getNewsSentimentSummary(ticker?: string): Promise<any> {
    const url = ticker ? `/api/news/sentiment?ticker=${encodeURIComponent(ticker)}` : '/api/news/sentiment';
    return safeFetchJson<any>(url, undefined, {
      ticker: ticker || 'ALL',
      sentimentSummary: {
        averageScore: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        positivePct: 0,
        neutralPct: 0,
        negativePct: 0,
        classification: 'NEUTRAL',
        auditedProviders: [],
        lastEvaluatedAt: new Date().toISOString()
      },
      velocity: {
        past1h: 0,
        past6h: 0,
        past24h: 0,
        past7d: 0,
        status: 'NORMAL',
        statusLabelZh: '资讯平稳',
        calculatedAt: new Date().toISOString(),
        hourlyVelocityScore: 0
      }
    });
  },

  // ==========================================
  // FLASH PLUNGE REBOUND APIS
  // ==========================================
  async getReboundConfig(): Promise<{ success: boolean; config: ReboundDaemonConfig }> {
    return safeFetchJson<{ success: boolean; config: ReboundDaemonConfig }>('/api/rebound/config', undefined, {
      success: true,
      config: {
        enabled: true,
        intervalMinutes: 15,
        sessionMode: 'REGULAR_ONLY',
        alerts: { desktopToast: true, audioChime: true, inAppModal: true },
        activeParams: {
          universe: 'SP500',
          modelType: 'CONNORS_RSI',
          lookbackWindow: '1h',
          minDropPercent: 2.0,
          targetGainPercent: 1.5,
          stopLossPercent: 1.0
        },
        modelsConfig: COMMERCIAL_DEFAULT_MODELS_CONFIG
      }
    });
  },

  async updateReboundConfig(config: Partial<ReboundDaemonConfig>): Promise<{ success: boolean; config: ReboundDaemonConfig }> {
    const res = await universalFetch('/api/rebound/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error('更新暴跌反弹配置失败');
    return res.json();
  },

  async updateReboundModelConfig(
    modelType: string,
    updates: any
  ): Promise<{ success: boolean; config: ReboundDaemonConfig }> {
    const res = await universalFetch('/api/rebound/config/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelType, updates })
    });
    if (!res.ok) throw new Error(`更新模型 ${modelType} 配置失败`);
    return res.json();
  },

  async resetReboundModelConfig(
    modelType?: string
  ): Promise<{ success: boolean; config: ReboundDaemonConfig }> {
    const res = await universalFetch('/api/rebound/config/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelType })
    });
    if (!res.ok) throw new Error('重置模型配置失败');
    return res.json();
  },

  async getReboundCandidates(): Promise<{ success: boolean; candidates: PlungeReboundCandidate[]; totalCount: number; lastScannedAt?: string }> {
    if (getServerBaseUrl()) {
      try {
        const res = await safeFetchJson<{ success: boolean; candidates: PlungeReboundCandidate[]; totalCount: number; lastScannedAt?: string }>('/api/rebound/candidates');
        if (res && res.success && Array.isArray(res.candidates) && res.candidates.length > 0) {
          return res;
        }
      } catch {
        // Fallback to direct client rebound
      }
    }
    const directCands = await fetchDirectReboundCandidates();
    return {
      success: true,
      candidates: directCands,
      totalCount: directCands.length,
      lastScannedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false })
    };
  },

  async runReboundScan(params?: Partial<PlungeReboundScanParams>): Promise<{ success: boolean; candidates: PlungeReboundCandidate[]; totalCount: number; lastScannedAt?: string }> {
    if (getServerBaseUrl()) {
      try {
        const res = await universalFetch('/api/rebound/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params || {})
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.candidates) && data.candidates.length > 0) {
            return data;
          }
        }
      } catch {
        // Fallback to local rebound engine
      }
    }
    const directCands = await fetchDirectReboundCandidates(params);
    return {
      success: true,
      candidates: directCands,
      totalCount: directCands.length,
      lastScannedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false })
    };
  },

  async getReboundModels(): Promise<{ success: boolean; models: ReboundModelInfo[] }> {
    try {
      const res = await safeFetchJson<{ success: boolean; models: ReboundModelInfo[] }>('/api/rebound/models');
      if (res && res.success && Array.isArray(res.models) && res.models.length > 0) {
        return res;
      }
    } catch {}
    return {
      success: true,
      models: [
        {
          type: 'CONNORS_RSI',
          nameZh: 'Larry Connors 极限均值回归',
          description: '捕捉极度恐慌冰点 RSI(2)<=10 与右侧均值回归反弹起点。',
          defaultTargetGain: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.targetGainPercent,
          defaultStopLoss: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.stopLossPercent,
          defaultMinDrop: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.minDropPercent,
          defaultLookback: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.lookbackWindow,
          icon: '🎯'
        },
        {
          type: 'WYCKOFF_CLIMAX',
          nameZh: 'Wyckoff 抛售高潮与卖压衰竭',
          description: '理查德·威科夫量价结构理论：识别放量踩踏割肉后的成交量收缩与主力承接。',
          defaultTargetGain: COMMERCIAL_DEFAULT_MODELS_CONFIG.WYCKOFF_CLIMAX.targetGainPercent,
          defaultStopLoss: COMMERCIAL_DEFAULT_MODELS_CONFIG.WYCKOFF_CLIMAX.stopLossPercent,
          defaultMinDrop: COMMERCIAL_DEFAULT_MODELS_CONFIG.WYCKOFF_CLIMAX.minDropPercent,
          defaultLookback: COMMERCIAL_DEFAULT_MODELS_CONFIG.WYCKOFF_CLIMAX.lookbackWindow,
          icon: '🔥'
        },
        {
          type: 'VWAP_ZSCORE',
          nameZh: '日内 VWAP 极端负偏离回归',
          description: '做市商模型：捕捉价格急速偏离 VWAP 中轴超过 -1.8% 后的强力均值回归。',
          defaultTargetGain: COMMERCIAL_DEFAULT_MODELS_CONFIG.VWAP_ZSCORE.targetGainPercent,
          defaultStopLoss: COMMERCIAL_DEFAULT_MODELS_CONFIG.VWAP_ZSCORE.stopLossPercent,
          defaultMinDrop: COMMERCIAL_DEFAULT_MODELS_CONFIG.VWAP_ZSCORE.minDropPercent,
          defaultLookback: COMMERCIAL_DEFAULT_MODELS_CONFIG.VWAP_ZSCORE.lookbackWindow,
          icon: '📊'
        },
        {
          type: 'BOLLINGER_STOCH',
          nameZh: '布林下轨刺透与超卖金叉',
          description: '下轨刺穿后缩量收回，KDJ 超卖底背离共振企稳。',
          defaultTargetGain: COMMERCIAL_DEFAULT_MODELS_CONFIG.BOLLINGER_STOCH.targetGainPercent,
          defaultStopLoss: COMMERCIAL_DEFAULT_MODELS_CONFIG.BOLLINGER_STOCH.stopLossPercent,
          defaultMinDrop: COMMERCIAL_DEFAULT_MODELS_CONFIG.BOLLINGER_STOCH.minDropPercent,
          defaultLookback: COMMERCIAL_DEFAULT_MODELS_CONFIG.BOLLINGER_STOCH.lookbackWindow,
          icon: '⚡'
        }
      ]
    };
  },

  async getReboundEvents(): Promise<{ success: boolean; events: any[] }> {
    return safeFetchJson<{ success: boolean; events: any[] }>('/api/rebound/events', undefined, {
      success: true,
      events: []
    });
  },

  // ==========================================
  // SOFTWARE SETTINGS: API CONFIGURATION
  // ==========================================
  async getApiKeysConfig(): Promise<{ success: boolean; config: ApiProviderConfig }> {
    try {
      const res = await safeFetchJson<{ success: boolean; config: ApiProviderConfig }>('/api/settings/api-keys');
      if (res && res.success && res.config) {
        saveLocalApiConfig(res.config);
        return res;
      }
    } catch (err) {
      // Fallback to local storage in mobile standalone mode
    }
    return {
      success: true,
      config: getLocalApiConfig()
    };
  },

  async updateApiKeysConfig(config: Partial<ApiProviderConfig>): Promise<{ success: boolean; config: ApiProviderConfig }> {
    const current = getLocalApiConfig();
    const updated: ApiProviderConfig = {
      ...current,
      ...config,
      providerStatus: {
        ...current.providerStatus,
        ...(config.providerStatus || {})
      }
    };
    saveLocalApiConfig(updated);

    try {
      const res = await universalFetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.config) saveLocalApiConfig(json.config);
        return json;
      }
    } catch (err) {
      // In standalone mobile mode, local save is sufficient
    }

    return { success: true, config: updated };
  },

  async testApiKey(provider: string, customKey?: string, customSymbol?: string): Promise<{ success: boolean; result?: any; results?: any }> {
    // 1. 如果配置了 PC 服务地址，或者在具备 Node 后端的环境下，优先尝试向后端发起代理测试
    const hasCustomServer = !!getServerBaseUrl();
    const isNative = isNativeMobile();

    if (!isNative || hasCustomServer) {
      try {
        const res = await universalFetch('/api/settings/test-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, customKey, customSymbol })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            const localCfg = getLocalApiConfig();
            if (provider === 'ALL' && json.results) {
              localCfg.providerStatus = json.results;
              localCfg.lastTestedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false });
            } else if (json.result) {
              localCfg.providerStatus = {
                ...localCfg.providerStatus,
                [provider]: json.result
              };
            }
            saveLocalApiConfig(localCfg);
          }
          return json;
        }
      } catch (backendErr) {
        console.warn('[testApiKey] Backend unreachable, falling back to Direct Provider Engine:', backendErr);
      }
    }

    // 2. 独立直连模式 (Standalone Direct Mode) - 直接向 Finnhub / Polygon / Alpha Vantage 测试
    if (provider === 'ALL') {
      const [finnhub, massive, alphaVantage] = await Promise.all([
        testDirectProvider('finnhub', undefined, customSymbol),
        testDirectProvider('massive', undefined, customSymbol),
        testDirectProvider('alphaVantage', undefined, customSymbol)
      ]);
      const statusMap = { finnhub, massive, alphaVantage };
      const localCfg = getLocalApiConfig();
      localCfg.providerStatus = statusMap;
      localCfg.lastTestedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      saveLocalApiConfig(localCfg);
      return { success: true, results: statusMap };
    }

    const result = await testDirectProvider(provider as any, customKey, customSymbol);
    const localCfg = getLocalApiConfig();
    localCfg.providerStatus = {
      ...localCfg.providerStatus,
      [provider]: result
    };
    saveLocalApiConfig(localCfg);
    return { success: true, result };
  },

  async resetApiKeysConfig(): Promise<{ success: boolean; config: ApiProviderConfig }> {
    const resetCfg = JSON.parse(JSON.stringify(DEFAULT_API_CONFIG));
    saveLocalApiConfig(resetCfg);

    try {
      const res = await universalFetch('/api/settings/reset-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        return res.json();
      }
    } catch (err) {
      // In standalone mobile mode, local reset is sufficient
    }

    return { success: true, config: resetCfg };
  },

  // ==========================================
  // P2: BROKER ROUTING, TRADING & L2 OBI
  // ==========================================
  async getBrokerConfig(): Promise<{ success: boolean; config: BrokerConfig }> {
    return safeFetchJson<{ success: boolean; config: BrokerConfig }>('/api/broker/config', undefined, {
      success: true,
      config: DEFAULT_BROKER_CONFIG
    });
  },

  async updateBrokerConfig(config: Partial<BrokerConfig>): Promise<{ success: boolean; config: BrokerConfig }> {
    const res = await universalFetch('/api/broker/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error('更新券商配置失败');
    return res.json();
  },

  async getBrokerAccount(): Promise<{ success: boolean; account: BrokerAccountSummary }> {
    return safeFetchJson<{ success: boolean; account: BrokerAccountSummary }>('/api/broker/account', undefined, {
      success: true,
      account: {
        provider: 'PAPER_SANDBOX',
        mode: 'PAPER',
        status: 'CONNECTED',
        currency: 'USD',
        cash: 100000,
        portfolioValue: 100000,
        buyingPower: 200000,
        unrealizedPnL: 0,
        realizedPnL: 0,
        dayPnLPercent: 0,
        openPositionsCount: 0,
        lastUpdatedAt: new Date().toISOString()
      }
    });
  },

  async getBrokerPositions(): Promise<{ success: boolean; positions: BrokerPosition[] }> {
    return safeFetchJson<{ success: boolean; positions: BrokerPosition[] }>('/api/broker/positions', undefined, {
      success: true,
      positions: []
    });
  },

  async getBrokerOrders(): Promise<{ success: boolean; orders: BrokerOrder[] }> {
    return safeFetchJson<{ success: boolean; orders: BrokerOrder[] }>('/api/broker/orders', undefined, {
      success: true,
      orders: []
    });
  },

  async submitBrokerOrder(orderReq: SubmitOrderRequest): Promise<{
    success: boolean;
    order: BrokerOrder;
    message: string;
    position?: BrokerPosition;
  }> {
    const res = await universalFetch('/api/broker/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderReq)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '下单失败' }));
      throw new Error(err.error || '下单失败');
    }
    return res.json();
  },

  async cancelBrokerOrder(orderId: string): Promise<{ success: boolean; order: BrokerOrder }> {
    const res = await universalFetch('/api/broker/order/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });
    if (!res.ok) throw new Error('撤单失败');
    return res.json();
  },

  async resetPaperAccount(initialBalance?: number): Promise<{ success: boolean; account: BrokerAccountSummary }> {
    const res = await universalFetch('/api/broker/reset-paper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBalance })
    });
    if (!res.ok) throw new Error('重置模拟账户失败');
    return res.json();
  },

  async calculatePositionSizing(params: PositionSizingParams): Promise<{ success: boolean; result: PositionSizingResult }> {
    const res = await universalFetch('/api/broker/calculate-sizing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('头寸测算失败');
    return res.json();
  },

  async getL2Depth(symbol: string): Promise<{
    success: boolean;
    snapshot: OrderBookSnapshot;
    imbalance: OrderBookImbalanceAnalysis;
  }> {
    return safeFetchJson<{
      success: boolean;
      snapshot: OrderBookSnapshot;
      imbalance: OrderBookImbalanceAnalysis;
    }>(`/api/broker/l2-depth/${symbol}`, undefined, {
      success: false,
      snapshot: {
        symbol,
        timestamp: Date.now(),
        bids: [],
        asks: [],
        spread: 0.05,
        midPrice: 100,
        microPrice: 100
      },
      imbalance: {
        symbol,
        timestamp: Date.now(),
        obi: 0,
        bidVolumeSum: 0,
        askVolumeSum: 0,
        regime: 'BALANCED',
        regimeLabel: '数据加载中',
        supportStrength: 'MODERATE',
        isReboundConfirmed: false,
        notes: ''
      }
    });
  },

  // Get Notification Channels Configuration
  async getNotificationChannelsConfig(): Promise<{ success: boolean; config: NotificationChannelsConfig }> {
    return safeFetchJson<{ success: boolean; config: NotificationChannelsConfig }>('/api/settings/notifications', undefined, {
      success: true,
      config: DEFAULT_NOTIFICATION_CHANNELS_CONFIG
    });
  },

  // Update Notification Channels Configuration
  async updateNotificationChannelsConfig(config: Partial<NotificationChannelsConfig>): Promise<{ success: boolean; config: NotificationChannelsConfig }> {
    const res = await universalFetch('/api/settings/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  // Test Notification Channel (Webhook / Telegram / Bark)
  async testNotificationChannel(channel: 'WEBHOOK' | 'TELEGRAM' | 'BARK', config?: Partial<NotificationChannelsConfig>): Promise<ChannelTestResult> {
    const res = await universalFetch('/api/settings/test-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, config })
    });
    return res.json();
  }
};


