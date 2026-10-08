import { useState, useEffect } from 'react';
import { AlertRule, AlertEvent, StrategyAlert, StrategyAlertStatus } from '../types.ts';
import { apiClient } from '../services/apiClient.ts';
import { notificationService } from '../services/notificationService.ts';
import { StockLogo } from '../components/common/StockLogo.tsx';
import {
  Bell,
  BellRing,
  Trash2,
  Zap,
  CheckCircle2,
  Volume2,
  Search,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  Play,
  Plus
} from 'lucide-react';

interface AlertsViewProps {
  onSelectStock: (ticker: string) => void;
  onOpenCreateAlert: () => void;
  onNavigateSearch: () => void;
}

export function AlertsView({ onSelectStock, onOpenCreateAlert, onNavigateSearch }: AlertsViewProps) {
  const [activeTab, setActiveTab] = useState<'STOCK_ALERTS' | 'STRATEGY_ALERTS'>('STOCK_ALERTS');

  // Stock Alerts state
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);

  // Strategy Alerts state (Phase 6)
  const [strategyAlerts, setStrategyAlerts] = useState<StrategyAlert[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [evaluatingStrategyAlerts, setEvaluatingStrategyAlerts] = useState(false);
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>('default');

  const fetchAlertsAndEvents = async () => {
    setIsLoading(true);
    try {
      const [alertList, eventList, stratAlertRes] = await Promise.all([
        apiClient.getAlerts().catch(() => []),
        apiClient.getAlertEvents().catch(() => []),
        apiClient.listStrategyAlerts().catch(() => ({ alerts: [], total: 0 }))
      ]);
      setAlerts(alertList || []);
      setEvents(eventList || []);
      setStrategyAlerts(stratAlertRes?.alerts || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsAndEvents();
    if (notificationService.isSupported()) {
      setNotificationPerm(notificationService.getPermission());
    }
  }, []);

  // Stock alert handlers
  const handleToggleEnable = async (alert: AlertRule) => {
    try {
      const updated = await apiClient.updateAlert(alert.id, {
        isEnabled: !alert.isEnabled
      });
      setAlerts(prev => prev.map(a => a.id === alert.id ? updated : a));
    } catch (err) {
      console.error('Failed to toggle alert:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  // Strategy alert handlers (Phase 6)
  const handleToggleStrategyAlertStatus = async (alert: StrategyAlert) => {
    const nextStatus: StrategyAlertStatus = alert.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await apiClient.updateStrategyAlert(alert.id, { status: nextStatus });
      setStrategyAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status: nextStatus } : a));
    } catch (err) {
      console.error('Failed to toggle strategy alert status:', err);
    }
  };

  const handleDeleteStrategyAlert = async (id: string) => {
    try {
      await apiClient.deleteStrategyAlert(id);
      setStrategyAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to delete strategy alert:', err);
    }
  };

  const handleEvaluateStrategyAlerts = async () => {
    setEvaluatingStrategyAlerts(true);
    try {
      await apiClient.evaluateStrategyAlerts();
      const updated = await apiClient.listStrategyAlerts();
      setStrategyAlerts(updated.alerts || []);
    } catch (err) {
      console.error('Failed to evaluate strategy alerts:', err);
    } finally {
      setEvaluatingStrategyAlerts(false);
    }
  };

  const handleTriggerScan = async () => {
    setIsScanning(true);
    try {
      const res = await apiClient.triggerAlertScan();
      if (res.newEvents && res.newEvents.length > 0) {
        res.newEvents.forEach((evt: AlertEvent) => {
          notificationService.showNotification(`StockAlarm RSI 预警: ${evt.ticker}`, {
            body: evt.message
          });
        });
      }
      await fetchAlertsAndEvents();
    } catch (err) {
      console.error('Alert scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const formatCondition = (alert: AlertRule) => {
    const tf = alert.timeframe || '1D';
    switch (alert.conditionType) {
      case 'RSI_LTE':
        return `RSI(${alert.period}, ${tf}) ≤ ${alert.thresholdValue} · 超卖买点`;
      case 'RSI_GTE':
        return `RSI(${alert.period}, ${tf}) ≥ ${alert.thresholdValue} · 超买过热`;
      case 'CROSS_BELOW_30':
        return `RSI(${alert.period}, ${tf}) 跌破 30 极值区`;
      case 'CROSS_ABOVE_70':
        return `RSI(${alert.period}, ${tf}) 突破 70 过热区`;
      default:
        return `RSI(${alert.period}, ${tf}) ≤ ${alert.thresholdValue}`;
    }
  };

  const formatTimeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return '尚未触发';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚触发';
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  };

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* 1. Header Banner & Summary Stats */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                量化预警与自动化监控中心 (Alerts & Triggers)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                支持个股 8 态多因子阈值条件与 AST 量化模型策略全自动盘中扫描
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCreateAlert}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>新建预警</span>
            </button>

            {activeTab === 'STOCK_ALERTS' ? (
              <button
                type="button"
                onClick={handleTriggerScan}
                disabled={isScanning}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="即时扫描个股预警"
              >
                <Zap className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEvaluateStrategyAlerts}
                disabled={evaluatingStrategyAlerts}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="即时评估全部策略监控"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${evaluatingStrategyAlerts ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Metric Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">活跃个股预警</span>
              <span className="font-mono text-[10px] text-blue-600 font-bold">RULES</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-slate-900">{alerts.filter(a => a.isEnabled).length}</span>
              <span className="text-xs font-bold text-slate-500 font-mono">/ {alerts.length} 总计</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">自动 60s 周期轮询</div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">自动化策略监控</span>
              <span className="font-mono text-[10px] text-amber-600 font-bold">AST STRATEGY</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-amber-600">{strategyAlerts.filter(s => s.status === 'ACTIVE').length}</span>
              <span className="text-xs font-bold text-slate-500 font-mono">/ {strategyAlerts.length} 任务</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">全市场标的 AST 规则树</div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">近期触发事件</span>
              <span className="font-mono text-[10px] text-rose-600 font-bold">EVENTS</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-rose-600">{events.length}</span>
              <span className="text-xs font-bold text-rose-600 font-mono">已记录</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">含声光与桌面通知推送</div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">桌面通知权限</span>
              <span className="font-mono text-[10px] text-slate-400">STATUS</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
                notificationPerm === 'granted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {notificationPerm === 'granted' ? '已授权推送' : '未授权'}
              </span>
              {notificationPerm !== 'granted' && (
                <button
                  type="button"
                  onClick={async () => {
                    const p = await notificationService.requestPermission();
                    setNotificationPerm(p);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  去开启
                </button>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">实时弹窗预警提醒</div>
          </div>
        </div>
      </div>

      {/* 2. Top Navigation Tabs: Stock Alerts vs Strategy Alerts */}
      <div className="bg-white rounded-2xl p-2 border border-slate-100 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('STOCK_ALERTS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'STOCK_ALERTS'
                ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>个股指标预警 ({alerts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STRATEGY_ALERTS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'STRATEGY_ALERTS'
                ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>量化策略自动化监控 ({strategyAlerts.length})</span>
          </button>
        </div>

        {activeTab === 'STOCK_ALERTS' ? (
          <button
            onClick={handleTriggerScan}
            disabled={isScanning}
            className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1.5 cursor-pointer text-xs bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Zap className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? '扫描中...' : '立即扫描个股'}</span>
          </button>
        ) : (
          <button
            onClick={handleEvaluateStrategyAlerts}
            disabled={evaluatingStrategyAlerts}
            className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1.5 cursor-pointer text-xs bg-blue-50 border border-blue-200/80 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluatingStrategyAlerts ? 'animate-spin text-blue-600' : ''}`} />
            <span>{evaluatingStrategyAlerts ? '评估中...' : '一键评估全部策略'}</span>
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: STOCK ALERTS */}
      {/* ==================================================================== */}
      {activeTab === 'STOCK_ALERTS' && (
        <div className="space-y-5">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Bell className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">暂无个股预警规则</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  在个股详情页、自选中心或选股器中，点击“设置预警”即可创建 8 态 Wilder RSI 与价格极值监控。
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateSearch}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>前往全市场筛选标的</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-blue-400 hover:shadow-xs transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => onSelectStock(alert.ticker)}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <StockLogo ticker={alert.ticker} size="md" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                            {alert.ticker}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {alert.timeframe || '1D'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium truncate block max-w-[160px]">
                          {alert.stockName || alert.ticker}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleEnable(alert)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          alert.isEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {alert.isEnabled ? '监控中' : '已暂停'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(alert.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="删除预警"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Trigger Condition Box */}
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-800">{formatCondition(alert)}</span>
                    <span className="text-[10px] text-slate-400">
                      上次: {formatTimeAgo(alert.lastTriggeredAt)}
                    </span>
                  </div>

                  {/* Notification Channels */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <div className="flex items-center gap-2">
                      {alert.notifySound && (
                        <span className="flex items-center gap-0.5 text-slate-600 font-medium">
                          <Volume2 className="w-3 h-3 text-blue-600" /> 声音提醒
                        </span>
                      )}
                      {alert.notifyPush && (
                        <span className="flex items-center gap-0.5 text-slate-600 font-medium">
                          <Bell className="w-3 h-3 text-indigo-600" /> 桌面通知
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      触发次数: {alert.triggerCount || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Triggered Events Trail */}
          {events.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-blue-600" />
                  <span className="font-extrabold text-xs text-slate-900">
                    预警触发历史记录 ({events.length})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {events.slice(0, 10).map((evt: AlertEvent) => (
                  <div
                    key={evt.id}
                    onClick={() => onSelectStock(evt.ticker)}
                    className="p-3 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-slate-200/80 transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <StockLogo ticker={evt.ticker} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900">{evt.ticker}</span>
                          <span className="text-[10px] font-mono text-slate-400">· {formatTimeAgo(evt.triggeredAt)}</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{evt.message}</p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: STRATEGY ALERTS */}
      {/* ==================================================================== */}
      {activeTab === 'STRATEGY_ALERTS' && (
        <div className="space-y-5">
          {strategyAlerts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">暂无量化策略自动化监控任务</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  在【量化模型库】执行任一模型筛选后，点击“创建策略提醒”即可将整个 AST 规则树部署为后台自动化监控。
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {strategyAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-blue-400 hover:shadow-xs transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900">
                          {alert.strategyName}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {alert.timeframe}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                        标的池: {alert.universe} · 周期: {alert.intervalMinutes}m
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStrategyAlertStatus(alert)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          alert.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {alert.status === 'ACTIVE' ? '运行中' : '已暂停'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStrategyAlert(alert.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="删除策略监控"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* AST Trigger Logic Details */}
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500 font-mono text-[10px]">
                      <span>最新匹配命中:</span>
                      <span className="font-extrabold text-slate-900">{alert.lastMatchCount || 0} 只标的</span>
                    </div>
                    {alert.lastMatchedTickers && alert.lastMatchedTickers.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {alert.lastMatchedTickers.slice(0, 6).map(tick => (
                          <span
                            key={tick}
                            onClick={() => onSelectStock(tick)}
                            className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-[10px] text-blue-600 hover:border-blue-400 cursor-pointer"
                          >
                            {tick}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
