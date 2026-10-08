import {
  AlertEvent,
  NotificationChannelsConfig,
  DEFAULT_NOTIFICATION_CHANNELS_CONFIG,
  ChannelTestResult
} from '../types.ts';
import { universeDb } from '../db/universeDb.ts';

export interface NotificationProvider {
  name: string;
  send(event: AlertEvent): Promise<boolean>;
}

export interface DispatchChannelResult {
  channel: string;
  success: boolean;
  message?: string;
  latencyMs?: number;
}

export class NotificationDispatcher {
  private config: NotificationChannelsConfig = { ...DEFAULT_NOTIFICATION_CHANNELS_CONFIG };
  private isLoadedFromDb: boolean = false;
  private customProviders: NotificationProvider[] = [];

  constructor() {
    this.ensureConfigLoaded();
  }

  private ensureConfigLoaded(): void {
    if (this.isLoadedFromDb) return;
    try {
      if (universeDb.isInitialized()) {
        const raw = universeDb.getSystemSetting('notification_channels_config');
        if (raw) {
          const parsed = JSON.parse(raw);
          this.config = { ...DEFAULT_NOTIFICATION_CHANNELS_CONFIG, ...parsed };
          this.isLoadedFromDb = true;
        }
      }
    } catch (e) {
      console.warn('[NotificationDispatcher] Failed to load config from DB:', e);
    }
  }

  public getConfig(): NotificationChannelsConfig {
    this.ensureConfigLoaded();
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<NotificationChannelsConfig>): NotificationChannelsConfig {
    this.ensureConfigLoaded();
    this.config = {
      ...this.config,
      ...newConfig
    };
    try {
      if (universeDb.isInitialized()) {
        universeDb.setSystemSetting('notification_channels_config', JSON.stringify(this.config));
      }
    } catch (e) {
      console.warn('[NotificationDispatcher] Failed to save config to DB:', e);
    }
    return { ...this.config };
  }

  public registerProvider(provider: NotificationProvider): void {
    this.customProviders.push(provider);
  }

  /**
   * Dispatches an alert event to all configured and enabled external channels
   */
  public async dispatch(event: AlertEvent): Promise<DispatchChannelResult[]> {
    this.ensureConfigLoaded();
    const results: DispatchChannelResult[] = [];

    // 1. Console Logger (Always active)
    console.log(`[ALERT DISPATCHED] ${event.ticker}: ${event.message} (${event.triggeredAt})`);
    results.push({ channel: 'ConsoleLogger', success: true });

    // 2. Custom Providers
    for (const provider of this.customProviders) {
      try {
        const ok = await provider.send(event);
        results.push({ channel: provider.name, success: ok });
      } catch (err: any) {
        results.push({ channel: provider.name, success: false, message: err?.message });
      }
    }

    // 3. Webhook Channel
    if (this.config.enableWebhook && this.config.webhookUrl) {
      const res = await this.sendWebhook(this.config.webhookUrl, this.config.webhookSecret, event);
      results.push(res);
    }

    // 4. Telegram Bot Channel
    if (this.config.enableTelegram && this.config.telegramBotToken && this.config.telegramChatId) {
      const res = await this.sendTelegram(this.config.telegramBotToken, this.config.telegramChatId, event);
      results.push(res);
    }

    // 5. Bark Channel
    if (this.config.enableBark && this.config.barkDeviceKey) {
      const res = await this.sendBark(this.config.barkServerUrl, this.config.barkDeviceKey, event);
      results.push(res);
    }

    return results;
  }

  /**
   * Generic Webhook (DingTalk, Feishu, WeCom, Discord, Slack, Custom POST)
   */
  public async sendWebhook(
    url: string,
    secret: string | undefined,
    event: AlertEvent
  ): Promise<DispatchChannelResult> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const payload = {
        event: 'STOCK_QUANT_ALERT',
        ticker: event.ticker,
        name: event.name || event.ticker,
        targetDimension: event.targetDimension,
        conditionType: event.conditionType,
        triggeredValue: event.triggeredValue,
        triggeredPrice: event.triggeredPrice,
        threshold: event.threshold,
        message: event.message,
        timeframe: event.timeframe,
        triggeredAt: event.triggeredAt,
        system: 'V6.5 US Stock AI Scanner & Alert'
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'US-Stock-Quant-Terminal/6.5'
      };
      if (secret) {
        headers['X-Webhook-Secret'] = secret;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        return {
          channel: 'Webhook',
          success: false,
          latencyMs,
          message: `Webhook HTTP error ${res.status}: ${res.statusText}`
        };
      }

      return {
        channel: 'Webhook',
        success: true,
        latencyMs,
        message: `Webhook 推送成功 (HTTP ${res.status})`
      };
    } catch (err: any) {
      return {
        channel: 'Webhook',
        success: false,
        latencyMs: Date.now() - startTime,
        message: `Webhook 请求失败: ${err?.message || '未知错误'}`
      };
    }
  }

  /**
   * Telegram Bot API
   */
  public async sendTelegram(
    botToken: string,
    chatId: string,
    event: AlertEvent
  ): Promise<DispatchChannelResult> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const text = [
        `🚨 *【美股量化预警触发】*`,
        `• *标的代码*: \`${event.ticker}\``,
        `• *公司名称*: ${event.name || event.ticker}`,
        `• *触发维度*: \`${event.targetDimension || 'PRICE'}\` (${event.conditionType})`,
        `• *触发数值*: \`${event.triggeredValue !== undefined ? event.triggeredValue : event.triggeredPrice || 'N/A'}\``,
        `• *监控周期*: \`${event.timeframe || '1D'}\``,
        `• *预警说明*: ${event.message}`,
        `• *触发时间*: \`${event.triggeredAt}\``
      ].join('\n');

      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown'
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          channel: 'Telegram',
          success: false,
          latencyMs,
          message: `Telegram API 报错: ${errJson.description || res.statusText}`
        };
      }

      return {
        channel: 'Telegram',
        success: true,
        latencyMs,
        message: 'Telegram 消息推送成功'
      };
    } catch (err: any) {
      return {
        channel: 'Telegram',
        success: false,
        latencyMs: Date.now() - startTime,
        message: `Telegram 请求失败: ${err?.message || '未知错误'}`
      };
    }
  }

  /**
   * Bark (iOS 极速通知)
   */
  public async sendBark(
    serverUrl: string | undefined,
    deviceKey: string,
    event: AlertEvent
  ): Promise<DispatchChannelResult> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const baseUrl = (serverUrl || 'https://api.day.app').replace(/\/+$/, '');
      const url = `${baseUrl}/${encodeURIComponent(deviceKey)}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `美股预警: ${event.ticker}`,
          body: event.message,
          sound: 'alarm',
          group: 'US_Stock_Quant',
          level: 'timeSensitive'
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        return {
          channel: 'Bark',
          success: false,
          latencyMs,
          message: `Bark API HTTP 报错 ${res.status}`
        };
      }

      return {
        channel: 'Bark',
        success: true,
        latencyMs,
        message: 'Bark iOS 通知推送成功'
      };
    } catch (err: any) {
      return {
        channel: 'Bark',
        success: false,
        latencyMs: Date.now() - startTime,
        message: `Bark 请求失败: ${err?.message || '未知错误'}`
      };
    }
  }

  /**
   * Diagnostic test method for checking channel credentials & connectivity
   */
  public async testChannel(
    channel: 'WEBHOOK' | 'TELEGRAM' | 'BARK',
    overrideConfig?: Partial<NotificationChannelsConfig>
  ): Promise<ChannelTestResult> {
    const activeCfg = { ...this.getConfig(), ...overrideConfig };

    const mockEvent: AlertEvent = {
      id: 'test-evt-' + Date.now(),
      alertId: 'test-alert',
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      timeframe: '1D',
      targetDimension: 'PRICE',
      triggeredPrice: 128.50,
      triggeredValue: 128.50,
      threshold: 125.00,
      conditionType: 'PRICE_CROSS_UP',
      message: '【连通性测试】这是一条来自美股量化终端 (V6.5) 的预警通道测试消息。通道配置运作正常！',
      triggeredAt: new Date().toISOString(),
      isRead: false
    };

    if (channel === 'WEBHOOK') {
      if (!activeCfg.webhookUrl) {
        return { success: false, message: '请先填写 Webhook URL' };
      }
      const res = await this.sendWebhook(activeCfg.webhookUrl, activeCfg.webhookSecret, mockEvent);
      return {
        success: res.success,
        message: res.message || (res.success ? 'Webhook 测试成功' : 'Webhook 测试失败'),
        latencyMs: res.latencyMs
      };
    }

    if (channel === 'TELEGRAM') {
      if (!activeCfg.telegramBotToken || !activeCfg.telegramChatId) {
        return { success: false, message: '请先填写 Telegram Bot Token 与 Chat ID' };
      }
      const res = await this.sendTelegram(activeCfg.telegramBotToken, activeCfg.telegramChatId, mockEvent);
      return {
        success: res.success,
        message: res.message || (res.success ? 'Telegram 测试成功' : 'Telegram 测试失败'),
        latencyMs: res.latencyMs
      };
    }

    if (channel === 'BARK') {
      if (!activeCfg.barkDeviceKey) {
        return { success: false, message: '请先填写 Bark Device Key' };
      }
      const res = await this.sendBark(activeCfg.barkServerUrl, activeCfg.barkDeviceKey, mockEvent);
      return {
        success: res.success,
        message: res.message || (res.success ? 'Bark 测试成功' : 'Bark 测试失败'),
        latencyMs: res.latencyMs
      };
    }

    return { success: false, message: '不支持的通知通道类型' };
  }
}

export const notificationDispatcher = new NotificationDispatcher();
