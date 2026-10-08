/**
 * backgroundAlertService.ts
 * Android Native Foreground Service & WeChat-style Heads-Up Floating Alert Bridge
 * Provides persistent background scanning and high-priority heads-up popup notifications.
 */

export interface BackgroundDaemonConfig {
  enabled: boolean;
  intervalSeconds: number;
  headsUpToast: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
}

const STORAGE_KEY = 'stockscanner_bg_daemon_config';

export const DEFAULT_BG_DAEMON_CONFIG: BackgroundDaemonConfig = {
  enabled: true,
  intervalSeconds: 30,
  headsUpToast: true,
  soundEnabled: true,
  vibrateEnabled: true
};

class BackgroundAlertService {
  private static instance: BackgroundAlertService;
  private config: BackgroundDaemonConfig = { ...DEFAULT_BG_DAEMON_CONFIG };

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): BackgroundAlertService {
    if (!BackgroundAlertService.instance) {
      BackgroundAlertService.instance = new BackgroundAlertService();
    }
    return BackgroundAlertService.instance;
  }

  public isNativeAndroid(): boolean {
    if (typeof window === 'undefined') return false;
    const cap = (window as any).Capacitor;
    return !!(cap && cap.getPlatform && cap.getPlatform() === 'android');
  }

  public getConfig(): BackgroundDaemonConfig {
    return { ...this.config };
  }

  public async saveConfig(partial: Partial<BackgroundDaemonConfig>): Promise<BackgroundDaemonConfig> {
    this.config = {
      ...this.config,
      ...partial
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      }
    } catch {}

    // Sync state with native Foreground Service
    if (this.config.enabled) {
      await this.startForegroundService(this.config.intervalSeconds);
    } else {
      await this.stopForegroundService();
    }

    return { ...this.config };
  }

  private loadConfig(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.config = { ...DEFAULT_BG_DAEMON_CONFIG, ...parsed };
        }
      }
    } catch {}
  }

  /**
   * 启动 Android 原生前台保活服务 (Foreground Service)
   */
  public async startForegroundService(intervalSeconds = 30): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const plugin = (window as any).Capacitor?.Plugins?.BackgroundAlert;
      if (plugin?.startForegroundService) {
        const res = await plugin.startForegroundService({ intervalSeconds });
        return !!res?.success;
      }
    } catch (e) {
      console.warn('[BackgroundAlertService] Failed to start native foreground service:', e);
    }
    return false;
  }

  /**
   * 停止 Android 原生前台保活服务
   */
  public async stopForegroundService(): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const plugin = (window as any).Capacitor?.Plugins?.BackgroundAlert;
      if (plugin?.stopForegroundService) {
        const res = await plugin.stopForegroundService();
        return !!res?.success;
      }
    } catch (e) {
      console.warn('[BackgroundAlertService] Failed to stop native foreground service:', e);
    }
    return false;
  }

  /**
   * 检查原生前台服务运行状态
   */
  public async isServiceRunning(): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const plugin = (window as any).Capacitor?.Plugins?.BackgroundAlert;
      if (plugin?.isServiceRunning) {
        const res = await plugin.isServiceRunning();
        return !!res?.running;
      }
    } catch {}
    return false;
  }

  /**
   * 发送类似微信消息的顶端悬浮横幅弹窗 (Heads-Up Floating Notification)
   */
  public async showHeadsUpAlert(payload: {
    title: string;
    message: string;
    ticker?: string;
  }): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const plugin = (window as any).Capacitor?.Plugins?.BackgroundAlert;
      if (plugin?.showHeadsUpAlert) {
        const res = await plugin.showHeadsUpAlert({
          title: payload.title,
          message: payload.message,
          ticker: payload.ticker || ''
        });
        return !!res?.success;
      }
    } catch (e) {
      console.warn('[BackgroundAlertService] Failed to show heads-up alert:', e);
    }
    return false;
  }

  /**
   * 引导用户加入系统“忽略电池优化 / 允许后台自启与高耗电运行”白名单
   */
  public async requestBatteryOptimizationExemption(): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const plugin = (window as any).Capacitor?.Plugins?.BackgroundAlert;
      if (plugin?.requestBatteryOptimizationExemption) {
        const res = await plugin.requestBatteryOptimizationExemption();
        return !!res?.success;
      }
    } catch (e) {
      console.warn('[BackgroundAlertService] Failed to request battery exemption:', e);
    }
    return false;
  }

  /**
   * 检查 Android 13+ 通知权限
   */
  public async checkNotificationPermission(): Promise<boolean> {
    if (!this.isNativeAndroid()) return true;
    try {
      const plugin = (window as any).Capacitor?.Plugins?.BackgroundAlert;
      if (plugin?.checkNotificationPermission) {
        const res = await plugin.checkNotificationPermission();
        return !!res?.granted;
      }
    } catch {}
    return true;
  }
}

export const backgroundAlertService = BackgroundAlertService.getInstance();
