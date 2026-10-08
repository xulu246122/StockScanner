import { backgroundAlertService } from './backgroundAlertService.ts';

export interface AlertMetadata {
  ticker: string;
  stockName?: string;
  view?: 'rebound' | 'watchlist' | 'radar' | 'detail' | 'alerts';
  modelType?: string;
  modelNameZh?: string;
  price?: number;
  changePercent?: number;
  dropPercent?: number;
  targetPrice?: number;
  targetGainPercent?: number;
  stopLossPercent?: number;
  timestamp?: number;
  source?: 'REBOUND' | 'WATCHLIST' | 'RADAR' | 'MANUAL';
  message?: string;
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  metadata?: AlertMetadata;
}

export class NotificationService {
  private static instance: NotificationService;
  private audioCtx: AudioContext | null = null;
  private recentAlerts: AlertMetadata[] = [];
  private listeners: Array<(alert: AlertMetadata) => void> = [];

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public getRecentAlerts(): AlertMetadata[] {
    return [...this.recentAlerts];
  }

  public getLatestAlert(): AlertMetadata | null {
    return this.recentAlerts[0] || null;
  }

  public onAlertTriggered(callback: (alert: AlertMetadata) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public focusStock(meta: AlertMetadata | { ticker: string; view?: string }): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:focus-alert-stock', { detail: meta }));
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return 'denied';
    }
  }

  public playAlertSound(type: 'DIGITAL_CHIME' | 'RADAR_PING' | 'URGENT_BEAT' | 'ALARM_CLOCK' | string = 'DIGITAL_CHIME'): void {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (!this.audioCtx) return;
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'RADAR_PING') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now); // C6
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.35);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'URGENT_BEAT') {
        // Double fast beep
        [0, 0.12].forEach(offset => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(784, now + offset); // G5
          gain.gain.setValueAtTime(0.18, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.08);
        });
      } else if (type === 'ALARM_CLOCK') {
        // 3 rapid chimes
        [0, 0.1, 0.2].forEach(offset => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(880, now + offset); // A5
          gain.gain.setValueAtTime(0.2, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.08);
        });
      } else {
        // DIGITAL_CHIME default
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      // Ignore audio autoplay restrictions
    }
  }

  public showNotification(title: string, options?: ExtendedNotificationOptions): boolean {
    this.playAlertSound();

    // 0. Register in Recent Alert History & Dispatch Event
    if (options?.metadata) {
      const meta = {
        ...options.metadata,
        timestamp: options.metadata.timestamp || Date.now()
      };
      // Keep unique latest or prepend
      this.recentAlerts = [meta, ...this.recentAlerts.filter(a => a.ticker !== meta.ticker)].slice(0, 30);
      this.listeners.forEach(fn => {
        try { fn(meta); } catch {}
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:alert-triggered', { detail: meta }));
      }
    }

    // 1. Electron Native Windows Notification (Action Center / Toast)
    try {
      const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (electronAPI && typeof electronAPI.showNativeNotification === 'function') {
        electronAPI.showNativeNotification({
          title,
          body: options?.body || '',
          metadata: options?.metadata
        });
        return true;
      }
    } catch (e) {
      console.warn('Native electron notification failed:', e);
    }

    // 1.5 Android Native Heads-Up Floating Alert (WeChat-style top popup banner)
    try {
      if (backgroundAlertService.isNativeAndroid()) {
        backgroundAlertService.showHeadsUpAlert({
          title,
          message: options?.body || title,
          ticker: options?.metadata?.ticker
        });
        return true;
      }
    } catch (e) {
      console.warn('Native Android heads-up notification failed:', e);
    }

    // 2. Fallback to HTML5 Web Notification API
    if (this.isSupported()) {
      if (Notification.permission === 'granted') {
        try {
          const notif = new Notification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'rsi-alert-' + Date.now(),
            ...options
          });

          notif.onclick = () => {
            window.focus();
            if (options?.metadata) {
              this.focusStock(options.metadata);
            }
            try { notif.close(); } catch {}
          };
          return true;
        } catch (err) {
          console.warn('Notification construction error:', err);
        }
      } else if (Notification.permission === 'default') {
        this.requestPermission().then((perm) => {
          if (perm === 'granted') {
            try {
              const notif = new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'rsi-alert-' + Date.now(),
                ...options
              });
              notif.onclick = () => {
                window.focus();
                if (options?.metadata) {
                  this.focusStock(options.metadata);
                }
                try { notif.close(); } catch {}
              };
            } catch {}
          }
        });
      }
    }
    return false;
  }
}

export const notificationService = NotificationService.getInstance();
