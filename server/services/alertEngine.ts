import { AlertRule, AlertEvent, AlertConditionType, Timeframe } from '../types.ts';
import { marketDataProvider } from './marketDataProvider.ts';
import { universeDb } from '../db/universeDb.ts';
import { websocketServer } from './websocketServer.ts';
import { notificationDispatcher } from './notificationDispatcher.ts';

export class AlertEngine {
  private alerts: AlertRule[] = [
    {
      id: 'alert-default-1',
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      period: 14,
      timeframe: '1D',
      conditionType: 'RSI_LTE',
      thresholdValue: 30,
      isEnabled: true,
      lastCheckedRsi: 28.6,
      lastTriggeredAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'alert-default-2',
      ticker: 'TSLA',
      name: 'Tesla Inc.',
      period: 14,
      timeframe: '1h',
      conditionType: 'CROSS_BELOW_30',
      thresholdValue: 30,
      isEnabled: true,
      lastCheckedRsi: 32.4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  private events: AlertEvent[] = [
    {
      id: 'evt-sample-1',
      alertId: 'alert-default-1',
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      timeframe: '1D',
      triggeredRsi: 28.6,
      threshold: 30,
      conditionType: 'RSI_LTE',
      message: 'NVDA RSI(14, 1D) 达到 28.6，触发 RSI <= 30 超卖预警！',
      triggeredAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      isRead: false
    }
  ];

  private readonly TRIGGER_COOLDOWN_MS = 15 * 60 * 1000; // 15 mins
  private dbSynced: boolean = false;

  private ensureDbSync(): void {
    if (universeDb.isInitialized()) {
      try {
        const dbAlerts = universeDb.getAllAlertRules();
        if (dbAlerts && dbAlerts.length > 0) {
          this.alerts = dbAlerts;
        } else {
          universeDb.seedDefaultAlertRules(this.alerts);
        }
        const dbEvents = universeDb.getAllAlertEvents();
        if (dbEvents && dbEvents.length > 0) {
          this.events = dbEvents;
        } else {
          universeDb.seedDefaultAlertEvents(this.events);
        }
        this.dbSynced = true;
      } catch (err) {
        console.warn('[AlertEngine] DB sync error:', err);
      }
    }
  }

  public getAlerts(): AlertRule[] {
    if (universeDb.isInitialized()) {
      try {
        if (!this.dbSynced) {
          universeDb.seedDefaultAlertRules(this.alerts);
          this.dbSynced = true;
        }
        this.alerts = universeDb.getAllAlertRules();
      } catch {}
    }
    return [...this.alerts];
  }

  public getAlertEvents(): AlertEvent[] {
    if (universeDb.isInitialized()) {
      try {
        if (!this.dbSynced) {
          universeDb.seedDefaultAlertEvents(this.events);
          this.dbSynced = true;
        }
        this.events = universeDb.getAllAlertEvents();
      } catch {}
    }
    return [...this.events].sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  }

  public createAlert(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      timeframe: rule.timeframe || '1D',
      id: 'alert-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      isEnabled: rule.isEnabled !== undefined ? rule.isEnabled : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.alerts.push(newRule);
    if (universeDb.isInitialized()) {
      try {
        universeDb.saveAlertRule(newRule);
      } catch (e) {
        console.warn('[AlertEngine] Failed to persist new rule:', e);
      }
    }
    return newRule;
  }

  public updateAlert(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const idx = this.alerts.findIndex(a => a.id === id);
    if (idx === -1) return null;

    this.alerts[idx] = {
      ...this.alerts[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    if (universeDb.isInitialized()) {
      try {
        universeDb.saveAlertRule(this.alerts[idx]);
      } catch (e) {
        console.warn('[AlertEngine] Failed to persist update rule:', e);
      }
    }
    return this.alerts[idx];
  }

  public deleteAlert(id: string): boolean {
    const initialLen = this.alerts.length;
    this.alerts = this.alerts.filter(a => a.id !== id);
    if (universeDb.isInitialized()) {
      try {
        universeDb.deleteAlertRule(id);
      } catch (e) {
        console.warn('[AlertEngine] Failed to persist delete rule:', e);
      }
    }
    return this.alerts.length < initialLen;
  }

  public markEventAsRead(id: string): boolean {
    const evt = this.events.find(e => e.id === id);
    if (evt) {
      evt.isRead = true;
      if (universeDb.isInitialized()) {
        try {
          universeDb.markAlertEventAsRead(id);
        } catch (e) {
          console.warn('[AlertEngine] Failed to persist mark read:', e);
        }
      }
      return true;
    }
    return false;
  }

  public clearAllEvents(): void {
    this.events = [];
    if (universeDb.isInitialized()) {
      try {
        universeDb.clearAllAlertEvents();
      } catch (e) {
        console.warn('[AlertEngine] Failed to persist clear events:', e);
      }
    }
  }

  /**
   * Scans all enabled alerts and creates events if threshold conditions are met
   */
  public async scanAlerts(): Promise<AlertEvent[]> {
    const newEvents: AlertEvent[] = [];
    const now = Date.now();

    for (const alert of this.alerts) {
      if (!alert.isEnabled) continue;

      // Check expiration
      if (alert.expireAt && new Date(alert.expireAt).getTime() < now) {
        alert.isEnabled = false;
        alert.state = 'EXPIRED';
        if (universeDb.isInitialized()) {
          try { universeDb.saveAlertRule(alert); } catch {}
        }
        continue;
      }

      try {
        const tf = alert.timeframe || '1D';
        const quote = await marketDataProvider.getQuote(alert.ticker, alert.period || 14, tf);
        const currentPrice = quote.price;
        const prevPrice = quote.price - (quote.change ?? 0);
        const changePercent = quote.changePercent;
        const currentRsi = quote.rsi.value;
        const prevRsi = quote.rsi.previousValue ?? currentRsi;

        alert.lastCheckedRsi = currentRsi;
        alert.lastCheckedPrice = currentPrice;

        let isTriggered = false;
        let message = '';
        let triggeredPrice = currentPrice;
        let triggeredRsi = currentRsi;
        let triggeredVal = currentPrice;

        const dim = alert.targetDimension || (
          alert.conditionType.startsWith('PRICE') ? 'PRICE' :
          alert.conditionType.startsWith('CHANGE') ? 'CHANGE_PERCENT' : 'RSI'
        );

        switch (alert.conditionType) {
          // --- 1. PRICE DIMENSION ---
          case 'PRICE_GTE':
            if (currentPrice >= alert.thresholdValue) {
              isTriggered = true;
              triggeredVal = currentPrice;
              message = `${alert.ticker} (${alert.name}) 当前价格 $${currentPrice.toFixed(2)} 已突破或触及预警线 $${alert.thresholdValue.toFixed(2)} (≥ 预警)`;
            }
            break;

          case 'PRICE_LTE':
            if (currentPrice <= alert.thresholdValue) {
              isTriggered = true;
              triggeredVal = currentPrice;
              message = `${alert.ticker} (${alert.name}) 当前价格 $${currentPrice.toFixed(2)} 已跌破或触及预警线 $${alert.thresholdValue.toFixed(2)} (≤ 预警)`;
            }
            break;

          case 'PRICE_CROSS_UP':
            if (currentPrice >= alert.thresholdValue && prevPrice < alert.thresholdValue) {
              isTriggered = true;
              triggeredVal = currentPrice;
              message = `${alert.ticker} (${alert.name}) 价格从 $${prevPrice.toFixed(2)} 向上突破阻力位 $${alert.thresholdValue.toFixed(2)} (现价 $${currentPrice.toFixed(2)})`;
            }
            break;

          case 'PRICE_CROSS_DOWN':
            if (currentPrice <= alert.thresholdValue && prevPrice > alert.thresholdValue) {
              isTriggered = true;
              triggeredVal = currentPrice;
              message = `${alert.ticker} (${alert.name}) 价格从 $${prevPrice.toFixed(2)} 向下跌破支撑位 $${alert.thresholdValue.toFixed(2)} (现价 $${currentPrice.toFixed(2)})`;
            }
            break;

          // --- 2. CHANGE PERCENT DIMENSION ---
          case 'CHANGE_PCT_GTE':
            if (changePercent >= alert.thresholdValue) {
              isTriggered = true;
              triggeredVal = changePercent;
              message = `${alert.ticker} (${alert.name}) 日内涨幅达 ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%，已突破设定涨幅阈值 +${alert.thresholdValue.toFixed(2)}%！`;
            }
            break;

          case 'CHANGE_PCT_LTE':
            if (changePercent <= alert.thresholdValue) {
              isTriggered = true;
              triggeredVal = changePercent;
              message = `${alert.ticker} (${alert.name}) 日内跌幅达 ${changePercent.toFixed(2)}%，已触发急跌预警门槛 ${alert.thresholdValue.toFixed(2)}%！`;
            }
            break;

          // --- 3. RSI DIMENSION ---
          case 'RSI_LTE':
          case 'RSI_OVERSOLD':
            if (currentRsi <= alert.thresholdValue) {
              isTriggered = true;
              triggeredVal = currentRsi;
              message = `${alert.ticker} (${alert.name}) RSI(${alert.period || 14}, ${tf}) 达到 ${currentRsi.toFixed(1)}，已触及超卖线 ${alert.thresholdValue} (超卖抄底监控)`;
            }
            break;

          case 'RSI_GTE':
          case 'RSI_OVERBOUGHT':
            if (currentRsi >= alert.thresholdValue) {
              isTriggered = true;
              triggeredVal = currentRsi;
              message = `${alert.ticker} (${alert.name}) RSI(${alert.period || 14}, ${tf}) 达到 ${currentRsi.toFixed(1)}，已触及超买线 ${alert.thresholdValue} (超买止盈监控)`;
            }
            break;

          case 'CROSS_BELOW_30':
            if (currentRsi <= 30 && prevRsi > 30) {
              isTriggered = true;
              triggeredVal = currentRsi;
              message = `${alert.ticker} (${alert.name}) RSI 从 ${prevRsi.toFixed(1)} 下穿 30 进入极端超卖区域 (现值 ${currentRsi.toFixed(1)})`;
            }
            break;

          case 'CROSS_ABOVE_70':
            if (currentRsi >= 70 && prevRsi < 70) {
              isTriggered = true;
              triggeredVal = currentRsi;
              message = `${alert.ticker} (${alert.name}) RSI 从 ${prevRsi.toFixed(1)} 上穿 70 进入极端超买区域 (现值 ${currentRsi.toFixed(1)})`;
            }
            break;

          case 'RSI_BETWEEN':
            if (alert.thresholdMax !== undefined && currentRsi >= alert.thresholdValue && currentRsi <= alert.thresholdMax) {
              isTriggered = true;
              triggeredVal = currentRsi;
              message = `${alert.ticker} (${alert.name}) RSI 位于目标区间 [${alert.thresholdValue}, ${alert.thresholdMax}] (现值 ${currentRsi.toFixed(1)})`;
            }
            break;
        }

        if (isTriggered) {
          const lastTriggeredTime = alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt).getTime() : 0;
          const isCoolingDown = now - lastTriggeredTime < this.TRIGGER_COOLDOWN_MS;

          if (!isCoolingDown) {
            alert.lastTriggeredAt = new Date().toISOString();
            alert.triggerCount = (alert.triggerCount || 0) + 1;

            // Handle ONLY_ONCE: auto-pause after first trigger
            if (alert.triggerFrequency === 'ONLY_ONCE') {
              alert.isEnabled = false;
              alert.state = 'TRIGGERED';
            }

            const event: AlertEvent = {
              id: 'evt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              alertId: alert.id,
              ticker: alert.ticker,
              name: alert.name,
              timeframe: tf,
              targetDimension: dim,
              triggeredRsi,
              triggeredPrice,
              triggeredValue: triggeredVal,
              threshold: alert.thresholdValue,
              conditionType: alert.conditionType,
              message,
              triggeredAt: new Date().toISOString(),
              isRead: false
            };

            this.events.unshift(event);
            newEvents.push(event);
            try {
              websocketServer.broadcastAlert(event);
              notificationDispatcher.dispatch(event).catch(() => {});
            } catch {}
            if (universeDb.isInitialized()) {
              try {
                universeDb.saveAlertEvent(event);
                universeDb.saveAlertRule(alert);
              } catch (e) {
                console.warn('[AlertEngine] Failed to persist scan alert trigger:', e);
              }
            }
          }
        }
      } catch (err) {
        console.error(`Error scanning alert for ${alert.ticker}:`, err);
      }
    }

    return newEvents;
  }
}

export const alertEngine = new AlertEngine();
