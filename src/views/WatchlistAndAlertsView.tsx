import { useState, useEffect, useMemo } from 'react';
import {
  StockQuoteSnapshot,
  AlertRule,
  AlertEvent,
  StrategyAlert,
  StrategyAlertStatus,
  AlertTargetDimension,
  WsPriceTick,
  MarketStatus
} from '../types.ts';
import { apiClient } from '../services/apiClient.ts';
import { notificationService } from '../services/notificationService.ts';
import { wsClient } from '../services/websocketClient.ts';
import { StockLogo } from '../components/common/StockLogo.tsx';
import { useResponsive } from '../hooks/useResponsive.ts';
import { StockSectorBadge, getSectorZh } from '../utils/stockSectorMapper.tsx';
import { MarketDashboardView } from './MarketDashboardView.tsx';
import {
  Star,
  Trash2,
  Bell,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Activity,
  Sliders,
  CheckCircle2,
  Volume2,
  Clock,
  Sparkles,
  Layers,
  Check,
  Play,
  Compass
} from 'lucide-react';

interface WatchlistAndAlertsViewProps {
  onSelectStock: (ticker: string) => void;
  onOpenAlertModal: (
    ticker: string,
    stockName?: string,
    currentPrice?: number,
    currentChangePercent?: number,
    currentRsi?: number,
    initialDimension?: AlertTargetDimension
  ) => void;
  onOpenAddWatchlist: () => void;
  watchlistTickers: string[];
  onRemoveFromWatchlist: (ticker: string) => void;
  initialSubTab?: 'WATCHLIST' | 'MARKET' | 'ALERT_RULES' | 'HISTORY';
  unreadAlertCount?: number;
  onRefreshAlertCount?: () => void;
  marketStatus?: MarketStatus | null;
  onOpenRsiRadar?: () => void;
  onNavigateRadar?: () => void;
  onNavigateTab?: (tab: any) => void;
}

const POPULAR_RECOMMENDED = [
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Semiconductors' },
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'Consumer Electronics' },
  { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Automotive & Clean Energy' },
  { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'Cloud & Software' },
  { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'Enterprise AI & Defense' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors' },
  { ticker: 'AMZN', name: 'Amazon.com Inc', sector: 'E-Commerce & Cloud' },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Social Media & AI' }
];

export function WatchlistAndAlertsView({
  onSelectStock,
  onOpenAlertModal,
  onOpenAddWatchlist,
  watchlistTickers,
  onRemoveFromWatchlist,
  initialSubTab = 'WATCHLIST',
  unreadAlertCount = 0,
  onRefreshAlertCount,
  marketStatus,
  onOpenRsiRadar,
  onNavigateRadar,
  onNavigateTab
}: WatchlistAndAlertsViewProps) {
  const { isMobile, isAndroid } = useResponsive();

  // Master sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'WATCHLIST' | 'MARKET' | 'ALERT_RULES' | 'HISTORY'>(initialSubTab);
  const [overviewData, setOverviewData] = useState<any>(null);

  // Watchlist states
  const [watchlistItems, setWatchlistItems] = useState<StockQuoteSnapshot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRsiFilter, setSelectedRsiFilter] = useState<'ALL' | 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL'>('ALL');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Alert Rules & Events states
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [strategyAlerts, setStrategyAlerts] = useState<StrategyAlert[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [rulesTypeTab, setRulesTypeTab] = useState<'STOCK' | 'STRATEGY'>('STOCK');

  // Loading & Action states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>('default');
  const [tickFlashMap, setTickFlashMap] = useState<Record<string, { direction: 'UP' | 'DOWN'; timestamp: number }>>({});
  const [focusedTicker, setFocusedTicker] = useState<string | null>(null);

  useEffect(() => {
    const handleFocus = (e: any) => {
      const ticker = e.detail?.ticker;
      if (ticker) {
        const norm = ticker.toUpperCase();
        setFocusedTicker(norm);
        setTimeout(() => {
          const el = document.getElementById(`watchlist-card-${norm}`) || document.getElementById(`watchlist-card-mobile-${norm}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        setTimeout(() => {
          setFocusedTicker(prev => (prev === norm ? null : prev));
        }, 8000);
      }
    };
    window.addEventListener('app:focus-card-ticker', handleFocus);
    return () => window.removeEventListener('app:focus-card-ticker', handleFocus);
  }, []);

  // Real-time WebSocket High-Frequency Ticks Subscription
  useEffect(() => {
    if (watchlistTickers && watchlistTickers.length > 0) {
      wsClient.subscribeTickers(watchlistTickers);
    }

    const unbindTick = wsClient.onTick((tick: WsPriceTick) => {
      const norm = tick.ticker.toUpperCase().trim();

      setWatchlistItems(prev => {
        const idx = prev.findIndex(item => item.ticker.toUpperCase().trim() === norm);
        if (idx === -1) return prev;
        const updated = [...prev];
        const old = updated[idx];
        updated[idx] = {
          ...old,
          price: tick.price,
          change: tick.change,
          changePercent: tick.changePercent,
          rsi: {
            ...old.rsi,
            value: tick.rsi
          }
        };
        return updated;
      });

      if (tick.direction && tick.direction !== 'EQUAL') {
        setTickFlashMap(prev => ({
          ...prev,
          [norm]: { direction: tick.direction as 'UP' | 'DOWN', timestamp: Date.now() }
        }));
      }
    });

    return () => {
      unbindTick();
    };
  }, [watchlistTickers]);

  // Load all consolidated data
  const loadAllData = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [wlData, alertList, eventList, stratAlertRes, ovData] = await Promise.all([
        apiClient.getWatchlist(14).catch(() => ({ items: [] })),
        apiClient.getAlerts().catch(() => []),
        apiClient.getAlertEvents().catch(() => []),
        apiClient.listStrategyAlerts().catch(() => ({ alerts: [], total: 0 })),
        apiClient.getMarketOverview().catch(() => null)
      ]);

      setWatchlistItems(wlData.items || []);
      setAlerts(alertList || []);
      setEvents(eventList || []);
      setStrategyAlerts(stratAlertRes?.alerts || []);
      if (ovData) setOverviewData(ovData);
    } catch (err) {
      console.error('Failed to load watchlist & alerts data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    if (notificationService.isSupported()) {
      setNotificationPerm(notificationService.getPermission());
    }
  }, [watchlistTickers]);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Handle instant full scan
  const handleTriggerInstantScan = async () => {
    setIsScanning(true);
    try {
      const res = await apiClient.triggerAlertScan();
      await apiClient.evaluateStrategyAlerts().catch(() => null);

      if (res.newEvents && res.newEvents.length > 0) {
        res.newEvents.forEach((evt: AlertEvent) => {
          notificationService.showNotification(`US Stock Alert: ${evt.ticker}`, {
            body: evt.message,
            metadata: {
              ticker: evt.ticker,
              view: 'watchlist',
              source: 'WATCHLIST',
              message: evt.message,
              timestamp: Date.now()
            }
          });
        });
      }

      await loadAllData(true);
      if (onRefreshAlertCount) onRefreshAlertCount();
    } catch (err) {
      console.error('Instant alert scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle alert active
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

  const handleDeleteAlert = async (id: string) => {
    try {
      await apiClient.deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      setWatchlistItems(prev =>
        prev.map(item => {
          if (item.activeAlertRule?.id === id) {
            return { ...item, hasActiveAlert: false, activeAlertRule: undefined };
          }
          return item;
        })
      );
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

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

  const handleRequestNotification = async () => {
    const perm = await notificationService.requestPermission();
    setNotificationPerm(perm);
  };

  // Derived sectors
  const availableSectors = useMemo(() => {
    const s = new Set<string>();
    watchlistItems.forEach(it => {
      const zh = getSectorZh(it.ticker, it.sector);
      if (zh) s.add(zh);
    });
    return Array.from(s);
  }, [watchlistItems]);

  // Filtered Watchlist items
  const filteredWatchlist = useMemo(() => {
    return watchlistItems.filter(stock => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTicker = stock.ticker.toLowerCase().includes(q);
        const matchName = stock.name.toLowerCase().includes(q);
        if (!matchTicker && !matchName) return false;
      }

      if (selectedRsiFilter === 'OVERSOLD' && stock.rsi.value >= 30) return false;
      if (selectedRsiFilter === 'OVERBOUGHT' && stock.rsi.value <= 70) return false;
      if (selectedRsiFilter === 'NEUTRAL' && (stock.rsi.value < 30 || stock.rsi.value > 70)) return false;

      if (selectedSectorFilter !== 'ALL') {
        const stockZh = getSectorZh(stock.ticker, stock.sector);
        if (stockZh !== selectedSectorFilter && stock.sector !== selectedSectorFilter) return false;
      }

      return true;
    });
  }, [watchlistItems, searchQuery, selectedRsiFilter, selectedSectorFilter]);

  // KPI Metrics (Unified across watchlist & alerts)
  const metrics = useMemo(() => {
    let oversold = 0;
    let overbought = 0;
    let gainers = 0;
    let losers = 0;
    let totalRsi = 0;

    watchlistItems.forEach(i => {
      if (i.rsi.value < 30) oversold++;
      if (i.rsi.value > 70) overbought++;
      if (i.changePercent > 0) gainers++;
      else if (i.changePercent < 0) losers++;
      totalRsi += i.rsi.value;
    });

    const activeRulesCount = alerts.filter(a => a.isEnabled).length;
    const activeStrategiesCount = strategyAlerts.filter(s => s.status === 'ACTIVE').length;
    const totalEventsCount = events.length;

    return {
      totalWatched: watchlistItems.length,
      oversold,
      overbought,
      gainers,
      losers,
      avgRsi: watchlistItems.length > 0 ? totalRsi / watchlistItems.length : 50,
      activeRulesCount,
      totalRulesCount: alerts.length,
      activeStrategiesCount,
      totalStrategiesCount: strategyAlerts.length,
      totalEventsCount
    };
  }, [watchlistItems, alerts, strategyAlerts, events]);

  // Formatter for price & RSI helpers
  const getRsiColor = (rsi: number) => {
    if (rsi <= 20) return 'text-emerald-700 bg-emerald-500';
    if (rsi <= 30) return 'text-emerald-600 bg-emerald-400';
    if (rsi >= 80) return 'text-rose-700 bg-rose-500';
    if (rsi >= 70) return 'text-rose-600 bg-rose-400';
    return 'text-slate-600 bg-blue-500';
  };

  const formatCondition = (alert: AlertRule) => {
    const tf = alert.timeframe || '1D';
    switch (alert.conditionType) {
      case 'PRICE_GTE':
        return `价格 ≥ $${alert.thresholdValue.toFixed(2)} (突破监控)`;
      case 'PRICE_LTE':
        return `价格 ≤ $${alert.thresholdValue.toFixed(2)} (跌破监控)`;
      case 'PRICE_CROSS_UP':
        return `价格向上穿过 $${alert.thresholdValue.toFixed(2)} (${tf} 阻力突破)`;
      case 'PRICE_CROSS_DOWN':
        return `价格向下穿过 $${alert.thresholdValue.toFixed(2)} (${tf} 支撑跌破)`;
      case 'CHANGE_PCT_GTE':
        return `日内涨幅 ≥ +${alert.thresholdValue.toFixed(2)}% (主力脉冲)`;
      case 'CHANGE_PCT_LTE':
        return `日内跌幅 ≤ ${alert.thresholdValue.toFixed(2)}% (急跌暴跌)`;
      case 'PRICE_CROSS_UP_MA':
        return `价格向上金叉均线 (${tf})`;
      case 'PRICE_CROSS_DOWN_MA':
        return `价格向下死叉均线 (${tf})`;
      case 'RSI_LTE':
      case 'RSI_OVERSOLD':
        return `RSI(${alert.period || 14}, ${tf}) ≤ ${alert.thresholdValue} · 超卖抄底`;
      case 'RSI_GTE':
      case 'RSI_OVERBOUGHT':
        return `RSI(${alert.period || 14}, ${tf}) ≥ ${alert.thresholdValue} · 超买止盈`;
      case 'CROSS_BELOW_30':
        return `RSI(${alert.period || 14}, ${tf}) 跌破 30 极值区`;
      case 'CROSS_ABOVE_70':
        return `RSI(${alert.period || 14}, ${tf}) 突破 70 过热区`;
      case 'RSI_BETWEEN':
        return `RSI(${alert.period || 14}, ${tf}) 区间 [${alert.thresholdValue}, ${alert.thresholdMax ?? ''}]`;
      default:
        return alert.alertName || `预警阈值: ${alert.thresholdValue}`;
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
      {/* 1. Master Header & KPI Matrix (Responsive: Mobile vs Desktop) */}
      {isMobile ? (
        /* Mobile Compact Header & Micro Chips */
        <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs space-y-3">
          {/* Title & Instant Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Star className="w-4 h-4 fill-white stroke-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight truncate">
                    自选与预警
                  </h1>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono shrink-0">
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  美股行情 · Wilder RSI · 量化预警
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onOpenAddWatchlist}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>添加</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAlertModal('NVDA')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>预警</span>
              </button>

              <button
                type="button"
                onClick={() => loadAllData(true)}
                disabled={isRefreshing}
                className="p-1.5 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-700 cursor-pointer"
                title="刷新"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mobile KPI Micro Chips (Horizontal Scrollable) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none text-xs font-mono select-none">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shrink-0">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="font-extrabold text-slate-800">{metrics.totalWatched} 只</span>
              <span className="text-[10px] text-slate-400">▲{metrics.gainers}/<span className="text-rose-600">▼{metrics.losers}</span></span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shrink-0">
              <Activity className="w-3 h-3 text-blue-600" />
              <span className="font-bold text-slate-700">RSI: {metrics.avgRsi.toFixed(1)}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shrink-0">
              <span className="text-[10px] font-bold text-emerald-600">超卖 {metrics.oversold}</span>
              <span className="text-slate-300">·</span>
              <span className="text-[10px] font-bold text-rose-600">超买 {metrics.overbought}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shrink-0">
              <Bell className="w-3 h-3 text-indigo-600" />
              <span className="font-bold text-indigo-700">{metrics.activeRulesCount}/{metrics.totalRulesCount} 规则</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shrink-0">
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="font-bold text-slate-700">{metrics.totalEventsCount} 次触发</span>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop Unified Master Header & 4 Key KPI Matrix Cards */
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/15">
                <Star className="w-4 h-4 fill-white stroke-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    自选持仓与智能预警监控中心 (Watchlist & Alert Hub)
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                    REAL-TIME
                  </span>
                  {metrics.activeRulesCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      {metrics.activeRulesCount} 条预警监控中
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  一站式深度追踪自选核心持仓报价异动、Wilder RSI 极值点与 8 态量化条件全自动云端轮询
                </p>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenAddWatchlist}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>添加自选</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAlertModal('NVDA')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>新建预警</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerInstantScan}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 text-blue-600 ${isScanning ? 'animate-bounce' : ''}`} />
                <span>{isScanning ? '扫描中...' : '立即扫描'}</span>
              </button>

              <button
                type="button"
                onClick={() => loadAllData(true)}
                disabled={isRefreshing}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="刷新自选与预警数据"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* 4 Consolidated Institutional Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: 自选持仓概览 */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  自选持仓组合
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-bold">PORTFOLIO</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-black font-mono text-slate-900">
                  {metrics.totalWatched}
                  <span className="text-xs font-medium text-slate-400 ml-1">只标的</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">
                  ▲{metrics.gainers} / <span className="text-rose-600">▼{metrics.losers}</span>
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center justify-between">
                <span>组合均值 RSI:</span>
                <span className="font-bold text-slate-700">{metrics.avgRsi.toFixed(1)}</span>
              </div>
            </div>

            {/* Card 2: 极值买卖异动 */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  均值回归极值
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-bold">REVERSAL</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-xl font-black font-mono text-emerald-600">
                    {metrics.oversold}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold">超卖</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xl font-black font-mono text-rose-600">
                    {metrics.overbought}
                  </span>
                  <span className="text-[10px] text-rose-700 font-bold">超买</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>极度买点 (≤30): {metrics.oversold} 只</span>
                <span>高位风险 (≥70): {metrics.overbought} 只</span>
              </div>
            </div>

            {/* Card 3: 自动化监控规则 */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-indigo-600" />
                  量化预警中枢
                </span>
                <span className="font-mono text-[10px] text-indigo-600 font-bold">RULES</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-black font-mono text-indigo-600">
                  {metrics.activeRulesCount}
                  <span className="text-xs text-slate-400 ml-1 font-normal">/ {metrics.totalRulesCount} 个股</span>
                </span>
                <span className="text-xs font-mono font-bold text-indigo-700">
                  {metrics.activeStrategiesCount} 策略任务
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                <span>60s 周期云端自动轮询</span>
                <span className="text-emerald-600 font-bold">运行正常</span>
              </div>
            </div>

            {/* Card 4: 触发事件与推送 */}
            <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  预警事件 & 通知
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-bold">TRIGGERS</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-black font-mono text-slate-900">
                  {metrics.totalEventsCount}
                  <span className="text-xs text-slate-400 ml-1 font-normal">次触发</span>
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    notificationPerm === 'granted'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer'
                  }`}
                  onClick={notificationPerm !== 'granted' ? handleRequestNotification : undefined}
                  title={notificationPerm !== 'granted' ? '点击开启桌面通知' : '已授权桌面弹窗通知'}
                >
                  {notificationPerm === 'granted' ? '✓ 通知已开启' : '开启推送'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">含声光、浏览器弹窗及应用内警报</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Master Navigation Pill Bar / 4-Segment Switcher (Responsive) */}
      {isMobile ? (
        <div className="space-y-2">
          {/* Google M3 Live Macro Capsule (32px Micro Banner) */}
          <div
            onClick={() => setActiveSubTab('MARKET')}
            className="h-8 px-2.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200/70 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-2xs"
            title="点击切换到宏观全景大盘"
          >
            <div className="flex items-center gap-2 overflow-hidden text-[10px] font-mono">
              <span className="flex items-center gap-1 font-bold text-slate-800 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                SPY <strong className="text-slate-900">${overviewData?.indices?.spy?.price ? Number(overviewData.indices.spy.price).toFixed(2) : '580.12'}</strong>
                <span className={overviewData?.indices?.spy?.changePercent >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {overviewData?.indices?.spy?.changePercent >= 0 ? '+' : ''}{Number(overviewData?.indices?.spy?.changePercent || 0).toFixed(2)}%
                </span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 font-bold text-slate-800 shrink-0">
                QQQ <strong className="text-slate-900">${overviewData?.indices?.qqq?.price ? Number(overviewData.indices.qqq.price).toFixed(2) : '495.20'}</strong>
                <span className={overviewData?.indices?.qqq?.changePercent >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                  {overviewData?.indices?.qqq?.changePercent >= 0 ? '+' : ''}{Number(overviewData?.indices?.qqq?.changePercent || 0).toFixed(2)}%
                </span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 font-bold text-slate-800 shrink-0">
                VIX <strong className="text-slate-900">{overviewData?.vix?.value ? Number(overviewData.vix.value).toFixed(2) : '15.08'}</strong>
              </span>
            </div>
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 shrink-0">
              <span>全景大盘</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Full-Width 4-Segment Thumb Switcher (Google M3 Token) */}
          <div className="grid grid-cols-4 gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveSubTab('WATCHLIST')}
              className={`py-1.5 px-0.5 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeSubTab === 'WATCHLIST'
                  ? 'bg-white text-[#1a73e8] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current shrink-0" />
              <span className="truncate">自选 ({watchlistItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('MARKET')}
              className={`py-1.5 px-0.5 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeSubTab === 'MARKET'
                  ? 'bg-white text-[#1a73e8] shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">大盘</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('ALERT_RULES')}
              className={`py-1.5 px-0.5 rounded-xl text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeSubTab === 'ALERT_RULES'
                  ? 'bg-white text-indigo-600 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">规则 ({alerts.length + strategyAlerts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('HISTORY')}
              className={`py-1.5 px-0.5 rounded-xl text-center transition-all cursor-pointer relative flex items-center justify-center gap-1 ${
                activeSubTab === 'HISTORY'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">流水 ({events.length})</span>
              {unreadAlertCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse ml-0.5" />
              )}
            </button>
          </div>

          {/* Contextual Toolbar for Mobile */}
          {activeSubTab === 'WATCHLIST' && (
            <div className="flex flex-col gap-2">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索自选代码/名称..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px] font-bold">
                {(['ALL', 'OVERSOLD', 'OVERBOUGHT', 'NEUTRAL'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedRsiFilter(tab)}
                    className={`px-2.5 py-1 rounded-xl transition-colors cursor-pointer shrink-0 ${
                      selectedRsiFilter === tab
                        ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'ALL' ? '全部' : tab === 'OVERSOLD' ? '超卖<30' : tab === 'OVERBOUGHT' ? '超买>70' : '中性'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'ALERT_RULES' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRulesTypeTab('STOCK')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-colors cursor-pointer ${
                  rulesTypeTab === 'STOCK' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                个股预警 ({alerts.length})
              </button>
              <button
                type="button"
                onClick={() => setRulesTypeTab('STRATEGY')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-colors cursor-pointer ${
                  rulesTypeTab === 'STRATEGY' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600'
                }`}
              >
                策略监控 ({strategyAlerts.length})
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Desktop Unified Master Navigation Pill Bar */
        <div className="bg-white rounded-2xl p-2.5 border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
          {/* Sub-Tab Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('WATCHLIST')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'WATCHLIST'
                  ? 'bg-white text-blue-600 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>自选持仓标的 ({watchlistItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('MARKET')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'MARKET'
                  ? 'bg-white text-blue-600 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>全景宏观大盘</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('ALERT_RULES')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'ALERT_RULES'
                  ? 'bg-white text-indigo-600 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>活跃预警规则 ({alerts.length + strategyAlerts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('HISTORY')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                activeSubTab === 'HISTORY'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>预警触发流水 ({events.length})</span>
              {unreadAlertCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Dynamic Contextual Toolbar: Filters when in WATCHLIST mode */}
          {activeSubTab === 'WATCHLIST' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索自选代码/名称..."
                  className="w-48 sm:w-56 pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>

              {/* RSI Filter Pills */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                {(['ALL', 'OVERSOLD', 'OVERBOUGHT', 'NEUTRAL'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedRsiFilter(tab)}
                    className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                      selectedRsiFilter === tab
                        ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'ALL' ? '全部' : tab === 'OVERSOLD' ? '超卖<30' : tab === 'OVERBOUGHT' ? '超买>70' : '中性'}
                  </button>
                ))}
              </div>

              {/* View Mode */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('GRID')}
                  className={`p-1 rounded-lg cursor-pointer transition-colors ${
                    viewMode === 'GRID' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="网格卡片视图"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`p-1 rounded-lg cursor-pointer transition-colors ${
                    viewMode === 'TABLE' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="高密度表格视图"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Contextual Toolbar: Switcher when in ALERT_RULES mode */}
          {activeSubTab === 'ALERT_RULES' && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRulesTypeTab('STOCK')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  rulesTypeTab === 'STOCK' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                个股阈值预警 ({alerts.length})
              </button>
              <button
                type="button"
                onClick={() => setRulesTypeTab('STRATEGY')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  rulesTypeTab === 'STRATEGY' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全市场 AST 策略监控 ({strategyAlerts.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. Main Workspace Display based on active sub-tab */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-mono">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>正在同步最新自选行情与云端预警规则...</span>
        </div>
      ) : activeSubTab === 'WATCHLIST' ? (
        /* ================= SUB-TAB 1: WATCHLIST ================= */
        <div className="space-y-4">
          {filteredWatchlist.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">暂无自选监控标的</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  您还没有添加自选股票，可以从下方热门推荐股票中一键添加，或使用顶部搜索栏。
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-md mx-auto">
                {POPULAR_RECOMMENDED.map(rec => (
                  <button
                    key={rec.ticker}
                    type="button"
                    onClick={() => apiClient.addToWatchlist(rec.ticker).then(() => loadAllData())}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-blue-600" />
                    <span>{rec.ticker}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{rec.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : isMobile ? (
            /* ================= MOBILE VIEW: FUTU / TRADINGVIEW SINGLE-COLUMN CARDS ================= */
            <div className="space-y-2">
              {filteredWatchlist.map(stock => {
                const isPositive = stock.changePercent >= 0;
                const flash = tickFlashMap[stock.ticker.toUpperCase().trim()];
                const isFlashing = flash && (Date.now() - flash.timestamp < 1000);
                const flashBg = isFlashing
                  ? flash.direction === 'UP'
                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400'
                    : 'bg-rose-100 text-rose-800 ring-1 ring-rose-400'
                  : 'text-slate-900';

                return (
                  <div
                    key={stock.ticker}
                    id={`watchlist-card-mobile-${stock.ticker}`}
                    className={`bg-white rounded-xl p-2.5 border shadow-2xs transition-all flex flex-col gap-2 ${
                      focusedTicker === stock.ticker
                        ? 'border-rose-500 ring-3 ring-rose-500/70 shadow-lg shadow-rose-500/20 scale-[1.01] bg-rose-50/20 z-10 animate-pulse'
                        : 'border-slate-200/90 active:bg-slate-50'
                    }`}
                  >
                    {/* Main Interactive Row */}
                    <div
                      onClick={() => onSelectStock(stock.ticker)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      {/* Left: Logo + Symbol & Name */}
                      <div className="flex items-center gap-2 min-w-0 max-w-[44%]">
                        <StockLogo ticker={stock.ticker} name={stock.name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-[13px] text-slate-900 tracking-tight font-mono">
                              {stock.ticker}
                            </span>
                            <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase">
                              {stock.exchange || 'US'}
                            </span>
                            <StockSectorBadge ticker={stock.ticker} sector={stock.sector} size="xs" />
                          </div>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {stock.name}
                          </span>
                        </div>
                      </div>

                      {/* Center: RSI Badge */}
                      <div className="flex flex-col items-center shrink-0 px-1">
                        <span className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full border ${
                          stock.rsi.value <= 30
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : stock.rsi.value >= 70
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          RSI {stock.rsi.value.toFixed(1)}
                        </span>
                        <span className="text-[8.5px] font-mono text-slate-400 mt-0.5">
                          {stock.rsi.value <= 30 ? '超卖' : stock.rsi.value >= 70 ? '超买' : '中性'}
                        </span>
                      </div>

                      {/* Right: Live Price & Change Percent */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className={`text-sm font-black font-mono px-1 py-0.2 rounded transition-all duration-300 ${flashBg}`}>
                          ${stock.price.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5 mt-0.5 ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                          {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Quick Alert Status & Direct Actions */}
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {stock.hasActiveAlert ? (
                          <span
                            onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.price, stock.changePercent, stock.rsi.value)}
                            className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-bold font-mono flex items-center gap-1 cursor-pointer"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            已设预警
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.price, stock.changePercent, stock.rsi.value)}
                            className="text-[9px] font-bold text-slate-500 bg-slate-100 active:bg-blue-50 hover:text-blue-600 px-1.5 py-0.5 rounded-full cursor-pointer flex items-center gap-0.5"
                          >
                            <Bell className="w-2.5 h-2.5" />
                            <span>设预警</span>
                          </button>
                        )}
                        {stock.sector && (
                          <span className="text-[9px] text-slate-500 font-mono font-bold truncate max-w-[100px]">
                            {getSectorZh(stock.ticker, stock.sector)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.price, stock.changePercent, stock.rsi.value)}
                          className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                            stock.hasActiveAlert
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200 active:bg-blue-50 hover:text-blue-600'
                          }`}
                          title="预警设置"
                        >
                          <Bell className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveFromWatchlist(stock.ticker)}
                          className="p-1 rounded-lg bg-slate-50 text-slate-400 hover:text-rose-600 border border-slate-200 active:bg-rose-50 transition-colors cursor-pointer"
                          title="移出自选"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectStock(stock.ticker)}
                          className="h-6 px-2 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold active:bg-blue-100 transition-colors cursor-pointer flex items-center gap-0.5"
                        >
                          <span>详情</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'GRID' ? (
            /* GRID VIEW (Wrapped in Institutional Rounded-3xl Card) */
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 mb-4 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[calc(100vh-310px)] min-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredWatchlist.map(stock => {
                const isPositive = stock.changePercent >= 0;
                const rsiColor = getRsiColor(stock.rsi.value);

                return (
                  <div
                    key={stock.ticker}
                    id={`watchlist-card-${stock.ticker}`}
                    className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 group ${
                      focusedTicker === stock.ticker
                        ? 'border-rose-500 ring-4 ring-rose-500/70 shadow-2xl shadow-rose-500/30 scale-[1.02] bg-rose-50/20 z-10 animate-pulse'
                        : 'border-slate-200/80 hover:border-blue-400 hover:shadow-xs'
                    }`}
                  >
                    {/* Header: Logo, Ticker, Exchange & Actions */}
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => onSelectStock(stock.ticker)}
                        className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                      >
                        <StockLogo ticker={stock.ticker} name={stock.name} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {stock.ticker}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-semibold">
                              {stock.exchange}
                            </span>
                            <StockSectorBadge ticker={stock.ticker} sector={stock.sector} size="xs" />
                          </div>
                          <span className="text-[11px] text-slate-400 truncate block max-w-[150px]">
                            {stock.name}
                          </span>
                        </div>
                      </div>

                      {/* Integrated Alert & Remove Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.price, stock.changePercent, stock.rsi.value)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            stock.hasActiveAlert
                              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 ring-1 ring-blue-400/40'
                              : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                          }`}
                          title={stock.hasActiveAlert ? '已绑定活跃预警 (点击管理/新增)' : '为该股票新建量化预警'}
                        >
                          <Bell className={`w-3.5 h-3.5 ${stock.hasActiveAlert ? 'fill-blue-600' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onRemoveFromWatchlist(stock.ticker)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="移出自选"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price & Change */}
                    {(() => {
                      const flash = tickFlashMap[stock.ticker.toUpperCase().trim()];
                      const isFlashing = flash && (Date.now() - flash.timestamp < 1000);
                      const flashBg = isFlashing
                        ? flash.direction === 'UP'
                          ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400'
                          : 'bg-rose-100 text-rose-800 ring-1 ring-rose-400'
                        : 'text-slate-900';
                      return (
                        <div
                          onClick={() => onSelectStock(stock.ticker)}
                          className="cursor-pointer flex items-baseline justify-between"
                        >
                          <span className={`text-xl font-black font-mono px-1 py-0.5 rounded transition-all duration-300 ${flashBg}`}>
                            ${stock.price.toFixed(2)}
                          </span>
                          <span
                            className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })()}

                    {/* Wilder RSI Bar */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Wilder RSI(14)</span>
                        <span className={`font-black ${stock.rsi.value <= 30 ? 'text-emerald-600' : stock.rsi.value >= 70 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {stock.rsi.value.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            stock.rsi.value <= 30 ? 'bg-emerald-500' : stock.rsi.value >= 70 ? 'bg-rose-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, stock.rsi.value))}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer: Setup Status & Alert State Pill */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        {stock.hasActiveAlert ? (
                          <span
                            onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.price, stock.changePercent, stock.rsi.value)}
                            className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold font-mono flex items-center gap-1 cursor-pointer hover:bg-blue-100 transition-colors"
                            title="已设置预警，点击查看或新增"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            预警监控中
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.price, stock.changePercent, stock.rsi.value)}
                            className="text-[10px] font-bold text-slate-400 hover:text-blue-600 flex items-center gap-0.5 cursor-pointer"
                          >
                            + 设预警
                          </button>
                        )}
                        {stock.sector && (
                          <span className="text-[10px] text-slate-500 font-bold truncate max-w-[100px]">
                            {getSectorZh(stock.ticker, stock.sector)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectStock(stock.ticker)}
                        className="text-blue-600 font-bold hover:translate-x-0.5 transition-transform flex items-center gap-0.5 cursor-pointer text-xs"
                      >
                        <span>分析</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          ) : (
            /* TABLE VIEW (Institutional Rounded-3xl Card with Inner Scroll) */
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden mb-4">
              <div className="overflow-x-auto max-h-[calc(100vh-310px)] min-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs select-none">
                  <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs text-slate-500 font-mono text-[11px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-bold">标的代码</th>
                      <th className="py-3 px-4 font-bold">最新价</th>
                      <th className="py-3 px-4 font-bold">涨跌幅</th>
                      <th className="py-3 px-4 font-bold">Wilder RSI(14)</th>
                      <th className="py-3 px-4 font-bold">预警状态</th>
                      <th className="py-3 px-4 font-bold">行业板块</th>
                      <th className="py-3 px-4 font-bold text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWatchlist.map(stock => {
                      const isPositive = stock.changePercent >= 0;
                      return (
                        <tr
                          key={stock.ticker}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div
                              onClick={() => onSelectStock(stock.ticker)}
                              className="flex items-center gap-2.5 cursor-pointer"
                            >
                              <StockLogo ticker={stock.ticker} name={stock.name} size="sm" />
                              <div>
                                <span className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {stock.ticker}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                                  {stock.name}
                                </span>
                              </div>
                            </div>
                          </td>

                          {(() => {
                            const flash = tickFlashMap[stock.ticker.toUpperCase().trim()];
                            const isFlashing = flash && (Date.now() - flash.timestamp < 1000);
                            const flashClass = isFlashing
                              ? flash.direction === 'UP'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                              : 'text-slate-900';
                            return (
                              <td className={`py-3 px-4 font-mono font-black transition-colors duration-300 ${flashClass}`}>
                                ${stock.price.toFixed(2)}
                              </td>
                            );
                          })()}

                          <td className={`py-3 px-4 font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </td>

                          <td className="py-3 px-4 font-mono">
                            <span className={`font-black px-2 py-0.5 rounded-full border text-[10px] ${
                              stock.rsi.value <= 30
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : stock.rsi.value >= 70
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {stock.rsi.value.toFixed(1)}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {stock.hasActiveAlert ? (
                              <span
                                onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.price, stock.changePercent, stock.rsi.value)}
                                className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold font-mono flex items-center gap-1 w-fit cursor-pointer hover:bg-blue-100 transition-colors"
                                title="点击查看/新增预警"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                监控中
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.price, stock.changePercent, stock.rsi.value)}
                                className="text-[11px] font-bold text-slate-400 hover:text-blue-600 cursor-pointer"
                              >
                                + 设预警
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            <StockSectorBadge ticker={stock.ticker} sector={stock.sector} size="xs" />
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onSelectStock(stock.ticker)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                              >
                                查看 K 线
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveFromWatchlist(stock.ticker)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Embedded Recent Trigger Activity Strip */}
          {events.length > 0 && (
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  最新自选预警触发动态 (近 24 小时)
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('HISTORY')}
                  className="text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  查看全部 {events.length} 条记录 →
                </button>
              </div>
              <div className="space-y-1.5">
                {events.slice(0, 3).map((evt, idx) => (
                  <div
                    key={`${evt.id}-${idx}`}
                    onClick={() => onSelectStock(evt.ticker)}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/60 hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div className="flex flex-col gap-1 w-full max-w-[80%]">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 font-mono">{evt.ticker}</span>
                        <span className="text-slate-600 truncate">{evt.message}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          触发值: {evt.triggeredRsi ? evt.triggeredRsi.toFixed(2) : '--'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          阈值: {evt.threshold || '--'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          周期: {evt.timeframe || '1D'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          规则: {evt.conditionType}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {evt.triggeredAt ? new Date(evt.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '刚刚'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeSubTab === 'MARKET' ? (
        /* ================= SUB-TAB: MARKET DASHBOARD ================= */
        <div className="w-full">
          <MarketDashboardView
            onSelectStock={onSelectStock}
            onNavigateScreenerPreset={onNavigateRadar}
            onNavigateTab={onNavigateTab || (() => {})}
            onOpenRsiRadar={onOpenRsiRadar || (() => {})}
            onNavigateRadar={onNavigateRadar}
            marketStatus={marketStatus}
          />
        </div>
      ) : activeSubTab === 'ALERT_RULES' ? (
        /* ================= SUB-TAB 2: ALERT RULES ================= */
        <div className="space-y-4">
          {rulesTypeTab === 'STOCK' ? (
            /* Stock Alerts List */
            alerts.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-xs space-y-3">
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-sm font-extrabold text-slate-800">暂无活跃的个股指标预警</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  您可以为任意美股设置 RSI 超卖超买、均线交叉等预警条件。
                </p>
                <button
                  type="button"
                  onClick={() => onOpenAlertModal('NVDA')}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  + 新建个股预警
                </button>
              </div>
            ) : isMobile ? (
              /* Mobile Stock Alerts */
              <div className="space-y-2.5">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => onSelectStock(alert.ticker)}
                        className="flex items-center gap-2.5 cursor-pointer min-w-0"
                      >
                        <StockLogo ticker={alert.ticker} name={alert.ticker} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-slate-900 font-mono">{alert.ticker}</span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">{alert.timeframe || '1D'}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                              alert.targetDimension === 'PRICE' || alert.conditionType?.startsWith('PRICE')
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : alert.targetDimension === 'CHANGE_PERCENT' || alert.conditionType?.startsWith('CHANGE')
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : alert.targetDimension === 'MOVING_AVERAGE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {alert.targetDimension === 'PRICE' || alert.conditionType?.startsWith('PRICE')
                                ? '价格'
                                : alert.targetDimension === 'CHANGE_PERCENT' || alert.conditionType?.startsWith('CHANGE')
                                ? '涨跌幅'
                                : alert.targetDimension === 'MOVING_AVERAGE'
                                ? '均线'
                                : 'RSI'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium truncate block">{alert.alertName || alert.stockName || alert.ticker}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleEnable(alert)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                            alert.isEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {alert.isEnabled ? '监控中' : '已暂停'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 border border-slate-200 active:bg-slate-100 transition-colors cursor-pointer"
                          title="删除规则"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-mono text-slate-700 flex items-center justify-between">
                      <span className="truncate">{formatCondition(alert)}</span>
                      {alert.triggerFrequency === 'ONCE_PER_BAR_CLOSE' && (
                        <span className="text-[9px] bg-blue-100/70 text-blue-700 px-1.5 py-0.5 rounded font-sans font-bold shrink-0 ml-1">
                          收盘确认
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100">
                      <span>上次触发: {formatTimeAgo(alert.lastTriggeredAt)}</span>
                      <span>触发次数: {alert.triggerCount || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 mb-4 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[calc(100vh-310px)] min-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-indigo-400 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => onSelectStock(alert.ticker)}
                        className="flex items-center gap-2.5 cursor-pointer"
                      >
                        <StockLogo ticker={alert.ticker} name={alert.ticker} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-slate-900">{alert.ticker}</span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">{alert.timeframe || '1D'}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                              alert.targetDimension === 'PRICE' || alert.conditionType?.startsWith('PRICE')
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : alert.targetDimension === 'CHANGE_PERCENT' || alert.conditionType?.startsWith('CHANGE')
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : alert.targetDimension === 'MOVING_AVERAGE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {alert.targetDimension === 'PRICE' || alert.conditionType?.startsWith('PRICE')
                                ? '价格'
                                : alert.targetDimension === 'CHANGE_PERCENT' || alert.conditionType?.startsWith('CHANGE')
                                ? '涨跌幅'
                                : alert.targetDimension === 'MOVING_AVERAGE'
                                ? '均线'
                                : 'RSI'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">{alert.alertName || alert.stockName || alert.ticker}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleEnable(alert)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                            alert.isEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {alert.isEnabled ? '监控中' : '已暂停'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="删除规则"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-mono text-slate-700 flex items-center justify-between">
                      <span>{formatCondition(alert)}</span>
                      {alert.triggerFrequency === 'ONCE_PER_BAR_CLOSE' && (
                        <span className="text-[10px] bg-blue-100/70 text-blue-700 px-1.5 py-0.5 rounded font-sans font-bold">
                          收盘确认
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100">
                      <span>上次触发: {formatTimeAgo(alert.lastTriggeredAt)}</span>
                      <span>触发次数: {alert.triggerCount || 0}</span>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )
          ) : (
            /* Strategy Alerts List */
            strategyAlerts.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-xs space-y-3">
                <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-sm font-extrabold text-slate-800">暂无自动化策略监控任务</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  可前往量化交易模型库（Model Hub），将唐奇安通道、康纳斯 RSI 或双均线策略添加到自动化监控。
                </p>
              </div>
            ) : isMobile ? (
              /* Mobile Strategy Alerts */
              <div className="space-y-2.5">
                {strategyAlerts.map(strat => (
                  <div
                    key={strat.id}
                    className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-sm text-slate-900">{strat.strategyName}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                            {strat.timeframe}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 mt-0.5 block font-mono truncate">
                          股票池: {strat.universe || 'ALL'} · 规则: {strat.conditionDescription || '多因子聚合'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleStrategyAlertStatus(strat)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                            strat.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {strat.status === 'ACTIVE' ? '监控中' : '已暂停'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteStrategyAlert(strat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 border border-slate-200 active:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                      <span>上次触发: {strat.last_triggered_at ? formatTimeAgo(strat.last_triggered_at) : '尚未触发'}</span>
                      <span>已触发标的: {strat.lastMatchCount || 0} 只</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 mb-4 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[calc(100vh-310px)] min-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {strategyAlerts.map(strat => (
                    <div
                      key={strat.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-indigo-400 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-900">{strat.strategyName}</h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                              {strat.timeframe}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">
                            股票池: {strat.universe || 'ALL'} · 规则: {strat.conditionDescription || '多因子聚合'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleStrategyAlertStatus(strat)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                              strat.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {strat.status === 'ACTIVE' ? '监控中' : '已暂停'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStrategyAlert(strat.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100">
                        <span>上次触发: {strat.last_triggered_at ? formatTimeAgo(strat.last_triggered_at) : '尚未触发'}</span>
                        <span>已触发标的: {strat.lastMatchCount || 0} 只</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        /* ================= SUB-TAB 3: HISTORY ================= */
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4 mb-6 overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">
              预警触发历史记录 ({events.length})
            </h3>
            {events.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  await apiClient.clearAlertEvents().catch(() => null);
                  const updated = await apiClient.getAlertEvents();
                  setEvents(updated);
                  if (onRefreshAlertCount) onRefreshAlertCount();
                }}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                清空全部历史记录
              </button>
            )}
          </div>

          {events.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-mono space-y-1">
              <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto" />
              <p>暂无任何历史触发预警</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-2">
              {events.map((evt, idx) => (
                <div
                  key={`${evt.id}-${idx}`}
                  onClick={() => onSelectStock(evt.ticker)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    evt.isRead
                      ? 'bg-white border-slate-200/80 text-slate-600 shadow-2xs'
                      : 'bg-blue-50/40 border-blue-200 text-slate-900 font-medium shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StockLogo ticker={evt.ticker} name={evt.ticker} size="sm" />
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs font-mono">{evt.ticker}</span>
                        {!evt.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {evt.triggeredAt ? new Date(evt.triggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '刚刚'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-snug">{evt.message}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        触发: {evt.triggeredRsi ? evt.triggeredRsi.toFixed(1) : '--'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        周期: {evt.timeframe || '1D'}
                      </span>
                    </div>
                    <span className="text-blue-600 font-bold flex items-center">
                      查看详情 →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-320px)] min-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {events.map((evt, idx) => (
                <div
                  key={`${evt.id}-${idx}`}
                  onClick={() => onSelectStock(evt.ticker)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    evt.isRead
                      ? 'bg-slate-50/70 border-slate-200/70 text-slate-600'
                      : 'bg-blue-50/40 border-blue-200 text-slate-900 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StockLogo ticker={evt.ticker} name={evt.ticker} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs font-mono">{evt.ticker}</span>
                        {!evt.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          {evt.triggeredAt ? new Date(evt.triggeredAt).toLocaleString() : '刚刚'}
                        </span>
                      </div>
                      <p className="text-xs truncate text-slate-700 mt-0.5">{evt.message}</p>
                      
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/50 text-slate-600 border border-slate-300/50">
                          触发值: {evt.triggeredRsi ? evt.triggeredRsi.toFixed(2) : '--'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/50 text-slate-600 border border-slate-300/50">
                          阈值: {evt.threshold || '--'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/50 text-slate-600 border border-slate-300/50">
                          周期: {evt.timeframe || '1D'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/50 text-slate-600 border border-slate-300/50">
                          规则: {evt.conditionType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-blue-600 text-xs font-bold hover:translate-x-0.5 transition-transform shrink-0">
                    查看 K 线 →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
