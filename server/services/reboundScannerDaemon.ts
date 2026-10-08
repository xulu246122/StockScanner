import {
  ReboundDaemonConfig,
  PlungeReboundCandidate,
  PlungeReboundScanParams,
  ReboundModelType,
  ModelParamConfig,
  COMMERCIAL_DEFAULT_MODELS_CONFIG
} from '../types/rebound.ts';
import { PlungeReboundEngine } from '../quant/rebound/plungeReboundEngine.ts';
import { SessionClock } from './sessionClock.ts';
import { notificationDispatcher } from './notificationDispatcher.ts';
import { AlertEvent } from '../types.ts';
import { marketRegimeService } from './marketRegimeService.ts';

const sessionClock = new SessionClock();

export class ReboundScannerDaemon {
  private config: ReboundDaemonConfig;
  private candidates: PlungeReboundCandidate[] = [];
  private timer: NodeJS.Timeout | null = null;
  private isScanning: boolean = false;
  private alertedTickers = new Map<string, number>(); // ticker -> timestamp
  private recentEvents: AlertEvent[] = [];

  constructor() {
    const defaultModels = JSON.parse(JSON.stringify(COMMERCIAL_DEFAULT_MODELS_CONFIG));
    this.config = {
      enabled: true, // 全局监控默认启动
      intervalMinutes: 15,
      sessionMode: 'REGULAR_ONLY',
      alerts: {
        desktopToast: true,
        audioChime: true,
        inAppModal: true
      },
      activeParams: {
        universe: defaultModels.CONNORS_RSI.universe,
        modelType: 'CONNORS_RSI',
        lookbackWindow: defaultModels.CONNORS_RSI.lookbackWindow,
        minDropPercent: defaultModels.CONNORS_RSI.minDropPercent,
        maxDropPercent: defaultModels.CONNORS_RSI.maxDropPercent,
        targetGainPercent: defaultModels.CONNORS_RSI.targetGainPercent,
        stopLossPercent: defaultModels.CONNORS_RSI.stopLossPercent,
        adaptiveRegimeEnabled: true,
        exhaustionCriteria: defaultModels.CONNORS_RSI.exhaustionCriteria
      },
      modelsConfig: defaultModels,
      adaptiveRegime: {
        enabled: true,
        currentRegime: 'NORMAL',
        regimeLabel: '🟡 均衡常态 (正常波动)',
        vixLevel: 14.85,
        thresholdMultiplier: 1.0,
        antiKnifeProtectionActive: false,
        description: '大盘波动稳定均衡，量化系统维持基准商业敏捷参数。'
      },
      lastScannedAt: undefined,
      lastCandidateCount: 0
    };

    // Auto-start daemon timer unless in unit test environment
    if (process.env.NODE_ENV !== 'test') {
      this.start();
    }
  }

  public getConfig(): ReboundDaemonConfig {
    return {
      ...this.config,
      modelsConfig: { ...this.config.modelsConfig },
      activeParams: { ...this.config.activeParams },
      adaptiveRegime: this.config.adaptiveRegime ? { ...this.config.adaptiveRegime } : undefined
    };
  }

  public getCandidates(): PlungeReboundCandidate[] {
    return [...this.candidates];
  }

  public getRecentEvents(): AlertEvent[] {
    return [...this.recentEvents];
  }

  public updateConfig(partial: Partial<ReboundDaemonConfig>): ReboundDaemonConfig {
    const wasIntervalChanged = partial.intervalMinutes && partial.intervalMinutes !== this.config.intervalMinutes;
    const wasEnabledChanged = partial.enabled !== undefined && partial.enabled !== this.config.enabled;

    this.config = {
      ...this.config,
      ...partial,
      alerts: {
        ...this.config.alerts,
        ...(partial.alerts || {})
      },
      activeParams: {
        ...this.config.activeParams,
        ...(partial.activeParams || {})
      },
      modelsConfig: {
        ...this.config.modelsConfig,
        ...(partial.modelsConfig || {})
      },
      adaptiveRegime: {
        ...(this.config.adaptiveRegime || {
          enabled: true,
          currentRegime: 'NORMAL',
          regimeLabel: '🟡 均衡常态',
          vixLevel: 14.85,
          thresholdMultiplier: 1.0,
          antiKnifeProtectionActive: false
        }),
        ...(partial.adaptiveRegime || {})
      }
    };

    if (wasIntervalChanged || wasEnabledChanged) {
      this.restartTimer();
    }

    return this.getConfig();
  }

  public updateModelConfig(modelType: ReboundModelType, updates: Partial<ModelParamConfig>): ReboundDaemonConfig {
    const current = this.config.modelsConfig[modelType] || { ...COMMERCIAL_DEFAULT_MODELS_CONFIG[modelType] };
    this.config.modelsConfig[modelType] = {
      ...current,
      ...updates
    };

    // If current activeParams matches this model, sync activeParams as well
    if (this.config.activeParams.modelType === modelType) {
      this.config.activeParams = {
        ...this.config.activeParams,
        universe: this.config.modelsConfig[modelType].universe,
        lookbackWindow: this.config.modelsConfig[modelType].lookbackWindow,
        minDropPercent: this.config.modelsConfig[modelType].minDropPercent,
        maxDropPercent: this.config.modelsConfig[modelType].maxDropPercent,
        targetGainPercent: this.config.modelsConfig[modelType].targetGainPercent,
        stopLossPercent: this.config.modelsConfig[modelType].stopLossPercent,
        exhaustionCriteria: this.config.modelsConfig[modelType].exhaustionCriteria
      };
    }

    return this.getConfig();
  }

  public resetModelToCommercialDefaults(modelType?: ReboundModelType): ReboundDaemonConfig {
    if (modelType) {
      this.config.modelsConfig[modelType] = JSON.parse(JSON.stringify(COMMERCIAL_DEFAULT_MODELS_CONFIG[modelType]));
      if (this.config.activeParams.modelType === modelType) {
        const resetItem = this.config.modelsConfig[modelType];
        this.config.activeParams = {
          ...this.config.activeParams,
          ...resetItem
        };
      }
    } else {
      this.config.modelsConfig = JSON.parse(JSON.stringify(COMMERCIAL_DEFAULT_MODELS_CONFIG));
    }
    return this.getConfig();
  }

  public start(): void {
    if (this.timer) clearInterval(this.timer);
    const ms = Math.max(1, this.config.intervalMinutes) * 60 * 1000;
    this.timer = setInterval(() => {
      this.performScheduledScan();
    }, ms);
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }

    // Initial background tick after 3 seconds
    if (process.env.NODE_ENV !== 'test') {
      const initTimer = setTimeout(() => {
        this.performScheduledScan();
      }, 3000);
      if (initTimer && typeof initTimer.unref === 'function') {
        initTimer.unref();
      }
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private restartTimer(): void {
    this.stop();
    if (this.config.enabled) {
      this.start();
    }
  }

  /**
   * Main scan routine executed either automatically on schedule or on-demand
   */
  public async executeScan(paramsOverride?: PlungeReboundScanParams): Promise<PlungeReboundCandidate[]> {
    if (this.isScanning) {
      return this.candidates;
    }

    this.isScanning = true;
    try {
      // Refresh real-time macro volatility regime & dynamic multiplier
      try {
        const liveAdaptive = await marketRegimeService.getAdaptiveVolatilityMetrics();
        if (this.config.adaptiveRegime) {
          this.config.adaptiveRegime = {
            ...this.config.adaptiveRegime,
            ...liveAdaptive,
            enabled: this.config.adaptiveRegime.enabled // preserve user toggle
          };
        }
      } catch {}

      let results: PlungeReboundCandidate[] = [];

      if (paramsOverride) {
        // Specific on-demand single model scan
        results = await PlungeReboundEngine.scanReboundOpportunities(paramsOverride);
      } else {
        // Automatic scheduled scan: Concurrently scan all active enabled models
        results = await PlungeReboundEngine.scanActiveModelsOpportunities(this.config.modelsConfig);
      }

      this.candidates = results;
      this.config.lastScannedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      this.config.lastCandidateCount = results.length;

      // Check for newly alerted candidates with 30-minute anti-flood debounce
      const now = Date.now();
      const DEBOUNCE_MS = 30 * 60 * 1000;

      for (const cand of results.slice(0, 3)) { // Alert on top 3 highest confidence opportunities
        const lastAlerted = this.alertedTickers.get(cand.ticker) || 0;
        if (now - lastAlerted > DEBOUNCE_MS) {
          this.alertedTickers.set(cand.ticker, now);

          const event: AlertEvent = {
            id: `rebound_${cand.ticker}_${now}`,
            alertId: `rebound_${cand.modelType}`,
            ticker: cand.ticker,
            name: cand.name,
            triggeredRsi: Math.round(cand.reboundScore) || 20,
            threshold: cand.dropPercent,
            conditionType: 'RSI_LTE',
            message: `[暴跌反弹预警] ${cand.ticker} (${cand.name}) [${cand.modelNameZh}] 急跌 ${cand.dropPercent}% 卖方衰竭，建议现价 $${cand.price.toFixed(2)} 买入，目标 +${cand.targetGainPercent}% ($${cand.targetPrice.toFixed(2)})，止损 -${cand.stopLossPercent}%`,
            triggeredAt: new Date().toISOString(),
            isRead: false
          };

          this.recentEvents.unshift(event);
          if (this.recentEvents.length > 50) this.recentEvents.pop();

          // Dispatch notification
          if (this.config.alerts.desktopToast || this.config.alerts.inAppModal) {
            notificationDispatcher.dispatch(event);
          }
        }
      }

      return results;
    } catch (err) {
      console.error('[ReboundScannerDaemon] Scan execution failed:', err);
      return this.candidates;
    } finally {
      this.isScanning = false;
    }
  }

  private async performScheduledScan(): Promise<void> {
    if (!this.config.enabled) return;

    // Check market session if REGULAR_ONLY is selected
    if (this.config.sessionMode === 'REGULAR_ONLY') {
      const status = sessionClock.getMarketStatus();
      if (!status.isOpen && status.session !== 'REGULAR') {
        return; // Skip outside regular trading hours
      }
    }

    await this.executeScan();
  }
}

export const reboundScannerDaemon = new ReboundScannerDaemon();

