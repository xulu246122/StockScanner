import {
  StrategyAlert,
  StrategyAlertTriggerType,
  StrategyAlertStatus,
  Timeframe
} from '../types.ts';
import { STRATEGY_REGISTRY, getStrategyDefinition } from '../quant/strategies/registry.ts';
import { indicatorCacheService } from './indicatorCache.ts';

export class StrategyAlertService {
  private alerts: Map<string, StrategyAlert> = new Map();

  constructor() {
    this.seedDefaultStrategyAlerts();
  }

  private seedDefaultStrategyAlerts() {
    const defaultAlerts: StrategyAlert[] = [
      {
        id: 'strat_alert_rsi_mean_reversion',
        user_id: 'user_default',
        strategy_id: 'connors_rsi2',
        strategyName: '康纳斯 RSI(2) 均值回归监控',
        parameters: { rsiThreshold: 12 },
        timeframe: '1D',
        symbols: ['NVDA', 'AAPL', 'MSFT', 'AMD', 'PLTR', 'TSLA'],
        status: 'ACTIVE',
        trigger_type: 'CONDITION_TRIGGER',
        triggerTypeLabel: '条件触发 (超卖回归)',
        conditionDescription: 'Wilder RSI(2) < 12 极度超卖区域',
        created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
        last_triggered_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        last_triggered_symbol: 'MRNA',
        triggerCount: 3
      },
      {
        id: 'strat_alert_donchian_breakout',
        user_id: 'user_default',
        strategy_id: 'donchian_breakout',
        strategyName: '唐奇安通道 20 日放量突破监控',
        parameters: { lookback: 20, minRvol: 1.2 },
        timeframe: '1D',
        symbols: ['NVDA', 'PLTR', 'AVAV', 'ARM', 'PANW', 'ISRG'],
        status: 'ACTIVE',
        trigger_type: 'BREAKOUT_TRIGGER',
        triggerTypeLabel: '突破触发 (新高放量)',
        conditionDescription: '突破 20 日高点通道上轨且 RVOL >= 1.2x',
        created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        last_triggered_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        last_triggered_symbol: 'PLTR',
        triggerCount: 7
      },
      {
        id: 'strat_alert_ema_trend_cross',
        user_id: 'user_default',
        strategy_id: 'elder_triple_screen',
        strategyName: '三重大均线多头趋势共振监控',
        parameters: { emaPeriod: 13 },
        timeframe: '1D',
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'],
        status: 'ACTIVE',
        trigger_type: 'TREND_CHANGE',
        triggerTypeLabel: '趋势变化 (EMA/MACD共振)',
        conditionDescription: 'EMA(13) 抬头且 MACD 柱线动能连续递增',
        created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
        last_triggered_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        last_triggered_symbol: 'GOOGL',
        triggerCount: 2
      },
      {
        id: 'strat_alert_volume_spike',
        user_id: 'user_default',
        strategy_id: 'high_rvol_spike',
        strategyName: '机构主力异动暴量建仓监控',
        parameters: { spikeRvol: 2.0 },
        timeframe: '1D',
        symbols: ['NVDA', 'TSLA', 'PLTR', 'AMD', 'COIN', 'MSTR'],
        status: 'ACTIVE',
        trigger_type: 'VOLUME_ANOMALY',
        triggerTypeLabel: '成交量异常 (RVOL > 2.0x)',
        conditionDescription: '盘中成交量超过 20 日均量 2.0 倍巨量异动',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        last_triggered_at: new Date(Date.now() - 3600000 * 1).toISOString(),
        last_triggered_symbol: 'NVDA',
        triggerCount: 5
      }
    ];

    defaultAlerts.forEach(a => this.alerts.set(a.id, a));
  }

  /**
   * Determine Trigger Type based on strategy & parameters
   */
  public inferTriggerType(strategyId: string, params: Record<string, any>): {
    trigger_type: StrategyAlertTriggerType;
    triggerTypeLabel: string;
    conditionDescription: string;
  } {
    const strat = getStrategyDefinition(strategyId);
    const sid = (strategyId || '').toLowerCase();

    if (sid.includes('rvol') || sid.includes('volume') || params.spikeRvol || params.minRvol >= 2.0) {
      return {
        trigger_type: 'VOLUME_ANOMALY',
        triggerTypeLabel: '成交量异常 (Volume Anomaly)',
        conditionDescription: `成交量 > 20日均量 ${params.spikeRvol || params.minRvol || 2.0} 倍`
      };
    }

    if (sid.includes('break') || sid.includes('donchian') || sid.includes('darvas') || sid.includes('stage2')) {
      return {
        trigger_type: 'BREAKOUT_TRIGGER',
        triggerTypeLabel: '突破触发 (Breakout Trigger)',
        conditionDescription: `价格突破 ${strat?.name || '通道阻力位'} 关键位`
      };
    }

    if (sid.includes('ema') || sid.includes('sma') || sid.includes('cross') || sid.includes('impulse') || sid.includes('trend')) {
      return {
        trigger_type: 'TREND_CHANGE',
        triggerTypeLabel: '趋势变化 (Trend Change)',
        conditionDescription: `均线系统产生金叉或动能共振转向`
      };
    }

    return {
      trigger_type: 'CONDITION_TRIGGER',
      triggerTypeLabel: '条件触发 (Condition Trigger)',
      conditionDescription: `指标触碰阈值条件 (${strat?.name || '策略条件'})`
    };
  }

  /**
   * POST /strategy-alert/create
   */
  public createAlert(payload: {
    user_id?: string;
    strategy_id: string;
    strategyName?: string;
    parameters?: Record<string, any>;
    timeframe?: Timeframe;
    symbols: string[];
    trigger_type?: StrategyAlertTriggerType;
    conditionDescription?: string;
  }): StrategyAlert {
    const id = `strat_alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const strat = getStrategyDefinition(payload.strategy_id);
    const params = payload.parameters || {};

    const inferred = this.inferTriggerType(payload.strategy_id, params);

    const alert: StrategyAlert = {
      id,
      user_id: payload.user_id || 'user_default',
      strategy_id: payload.strategy_id,
      strategyName: payload.strategyName || strat?.name || payload.strategy_id,
      parameters: params,
      timeframe: payload.timeframe || '1D',
      symbols: Array.isArray(payload.symbols) && payload.symbols.length > 0 ? payload.symbols : ['NVDA', 'AAPL', 'MSFT'],
      status: 'ACTIVE',
      trigger_type: payload.trigger_type || inferred.trigger_type,
      triggerTypeLabel: inferred.triggerTypeLabel,
      conditionDescription: payload.conditionDescription || inferred.conditionDescription,
      created_at: new Date().toISOString(),
      last_triggered_at: null,
      last_triggered_symbol: null,
      triggerCount: 0
    };

    this.alerts.set(id, alert);
    return alert;
  }

  /**
   * GET /strategy-alert/list
   */
  public listAlerts(userId?: string): StrategyAlert[] {
    const all = Array.from(this.alerts.values());
    if (userId) {
      return all.filter(a => a.user_id === userId);
    }
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getActiveAlerts(): StrategyAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.status === 'ACTIVE');
  }

  /**
   * PUT /strategy-alert/update
   */
  public updateAlert(id: string, updates: Partial<StrategyAlert>): StrategyAlert | null {
    const existing = this.alerts.get(id);
    if (!existing) return null;

    const updated: StrategyAlert = {
      ...existing,
      ...updates,
      id: existing.id,
      created_at: existing.created_at
    };

    this.alerts.set(id, updated);
    return updated;
  }

  /**
   * DELETE /strategy-alert/delete
   */
  public deleteAlert(id: string): boolean {
    if (this.alerts.has(id)) {
      this.alerts.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Evaluate Active Strategy Alerts against symbols
   */
  public async evaluateAllActiveAlerts(): Promise<{ evaluatedCount: number; triggeredCount: number }> {
    const activeAlerts = Array.from(this.alerts.values()).filter(a => a.status === 'ACTIVE');
    let triggeredCount = 0;

    for (const alert of activeAlerts) {
      const strat = getStrategyDefinition(alert.strategy_id);
      if (!strat) continue;

      for (const sym of alert.symbols) {
        try {
          const evalRes = await indicatorCacheService.evaluateStrategyForStock(sym, strat, alert.timeframe);
          if (evalRes.state === 'TRIGGERED') {
            alert.last_triggered_at = new Date().toISOString();
            alert.last_triggered_symbol = sym;
            alert.triggerCount = (alert.triggerCount || 0) + 1;
            triggeredCount++;
            break;
          }
        } catch (e) {
          // ignore error per symbol
        }
      }
    }

    return { evaluatedCount: activeAlerts.length, triggeredCount };
  }
}

export const strategyAlertService = new StrategyAlertService();
