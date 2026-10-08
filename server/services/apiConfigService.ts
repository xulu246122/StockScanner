import fs from 'fs';
import path from 'path';
import { ApiProviderConfig, ApiProviderStatus, DEFAULT_API_CONFIG } from '../types.ts';
import { getDataFilePath } from '../utils/pathResolver.ts';

const CONFIG_FILE_PATH = getDataFilePath('api_config.json');

export class ApiConfigService {
  private config: ApiProviderConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load API configuration from local file, fallback to DEFAULT_API_CONFIG
   */
  private loadConfig(): ApiProviderConfig {
    try {
      const dataDir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_API_CONFIG,
          ...parsed,
          providerStatus: {
            ...DEFAULT_API_CONFIG.providerStatus,
            ...(parsed.providerStatus || {})
          }
        };
      }
    } catch (err) {
      console.warn('[ApiConfigService] Failed to load config from disk, using defaults:', err);
    }

    // Default initialization
    this.saveConfig(DEFAULT_API_CONFIG);
    return JSON.parse(JSON.stringify(DEFAULT_API_CONFIG));
  }

  /**
   * Persist API configuration to disk
   */
  private saveConfig(cfg: ApiProviderConfig): void {
    try {
      const dataDir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ApiConfigService] Failed to persist config to disk:', err);
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): ApiProviderConfig {
    return {
      ...this.config,
      providerStatus: { ...this.config.providerStatus }
    };
  }

  /**
   * Update configuration and persist
   */
  public updateConfig(partial: Partial<ApiProviderConfig>): ApiProviderConfig {
    this.config = {
      ...this.config,
      ...partial,
      providerStatus: {
        ...this.config.providerStatus,
        ...(partial.providerStatus || {})
      }
    };
    this.saveConfig(this.config);
    return this.getConfig();
  }

  /**
   * Reset configuration to factory defaults
   */
  public resetToDefaults(): ApiProviderConfig {
    this.config = JSON.parse(JSON.stringify(DEFAULT_API_CONFIG));
    this.saveConfig(this.config);
    return this.getConfig();
  }

  /**
   * Live connectivity test for a specific provider
   */
  public async testProvider(
    provider: 'finnhub' | 'massive' | 'alphaVantage',
    customKey?: string
  ): Promise<ApiProviderStatus> {
    const key = customKey !== undefined ? customKey.trim() : this.getKeyForProvider(provider);

    if (!key) {
      return {
        status: 'OFFLINE',
        message: '未配置 API 密钥 (API Key is Empty)'
      };
    }

    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      if (provider === 'finnhub') {
        // Finnhub Quote API for AAPL
        const url = `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${encodeURIComponent(key)}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        const latencyMs = Date.now() - start;

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            return { status: 'OFFLINE', latencyMs, message: `认证失败 (HTTP ${res.status}: API Key 无效或未授权)` };
          }
          return { status: 'OFFLINE', latencyMs, message: `服务异常 (HTTP ${res.status})` };
        }

        const data = await res.json().catch(() => null);
        if (data && typeof data.c === 'number' && data.c > 0) {
          return {
            status: 'ONLINE',
            latencyMs,
            message: `连接正常 (AAPL 现价 $${data.c.toFixed(2)})`
          };
        }
        return { status: 'OFFLINE', latencyMs, message: '返回数据异常或权限受限' };
      }

      if (provider === 'massive') {
        // Massive / Polygon Aggs API for AAPL
        const url = `https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apiKey=${encodeURIComponent(key)}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        const latencyMs = Date.now() - start;

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            return { status: 'OFFLINE', latencyMs, message: `认证失败 (HTTP ${res.status}: Key 无效)` };
          }
          return { status: 'OFFLINE', latencyMs, message: `服务异常 (HTTP ${res.status})` };
        }

        const data = await res.json().catch(() => null);
        if (data && (data.resultsCount > 0 || data.status === 'OK')) {
          const price = data.results?.[0]?.c;
          return {
            status: 'ONLINE',
            latencyMs,
            message: `连接正常 ${price ? `(前收盘 $${price.toFixed(2)})` : ''}`
          };
        }
        return { status: 'OFFLINE', latencyMs, message: '返回数据为空或调用受限' };
      }

      if (provider === 'alphaVantage') {
        // Alpha Vantage Global Quote API for AAPL
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${encodeURIComponent(key)}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        const latencyMs = Date.now() - start;

        if (!res.ok) {
          return { status: 'OFFLINE', latencyMs, message: `服务异常 (HTTP ${res.status})` };
        }

        const data = await res.json().catch(() => null);
        if (data && data['Global Quote'] && data['Global Quote']['05. price']) {
          const price = parseFloat(data['Global Quote']['05. price']);
          return {
            status: 'ONLINE',
            latencyMs,
            message: `连接正常 (AAPL 报价 $${price.toFixed(2)})`
          };
        }
        if (data && data.Note) {
          return { status: 'ONLINE', latencyMs, message: '密钥有效 (已达免费频率上限 5次/分)' };
        }
        return { status: 'OFFLINE', latencyMs, message: '返回无效数据或 Key 错误' };
      }

      return { status: 'OFFLINE', message: '未知数据源' };
    } catch (err: any) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      if (err.name === 'AbortError') {
        return { status: 'OFFLINE', latencyMs: 6000, message: '请求超时 (连接国际节点耗时 > 6s)' };
      }
      return { status: 'OFFLINE', latencyMs, message: `连接异常: ${err.message || '网络无法访问'}` };
    }
  }

  /**
   * Helper to retrieve key for provider
   */
  public getKeyForProvider(provider: 'finnhub' | 'massive' | 'alphaVantage'): string {
    switch (provider) {
      case 'finnhub':
        return this.config.finnhubApiKey || DEFAULT_API_CONFIG.finnhubApiKey;
      case 'massive':
        return this.config.massiveApiKey || DEFAULT_API_CONFIG.massiveApiKey;
      case 'alphaVantage':
        return this.config.alphaVantageApiKey || DEFAULT_API_CONFIG.alphaVantageApiKey;
    }
  }
}

export const apiConfigService = new ApiConfigService();
