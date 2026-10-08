import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StockLogo } from '../components/common/StockLogo.tsx';
import { apiClient } from '../services/apiClient.ts';
import { notificationService } from '../services/notificationService.ts';
import { BracketOrderModal } from '../components/trading/BracketOrderModal.tsx';
import { StockSectorBadge, getSectorZh } from '../utils/stockSectorMapper.tsx';
import { ReboundParameterSheet } from '../components/m3/ReboundParameterSheet.tsx';
import { ReboundCandidateDetailSheet } from '../components/m3/ReboundCandidateDetailSheet.tsx';
import { M3ExtendedFAB } from '../components/m3/M3ExtendedFAB.tsx';
import {
  PlungeReboundCandidate,
  ReboundDaemonConfig,
  ReboundModelType,
  ReboundLookbackWindow,
  ReboundModelInfo,
  ModelParamConfig,
  COMMERCIAL_DEFAULT_MODELS_CONFIG
} from '../types.ts';
import { useResponsive } from '../hooks/useResponsive.ts';
import {
  Zap,
  Flame,
  Activity,
  Compass,
  SlidersHorizontal,
  RefreshCw,
  Bell,
  Star,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Volume2,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Edit3,
  Save,
  RotateCcw,
  Check,
  X,
  Power,
  Info,
  Crosshair,
  Search,
  ShieldCheck,
  BatteryCharging
} from 'lucide-react';
import { backgroundAlertService, BackgroundDaemonConfig } from '../services/backgroundAlertService.ts';

interface PlungeReboundViewProps {
  onSelectStock: (ticker: string) => void;
  onOpenAlertModal: (ticker: string, stockName?: string, currentRsi?: number) => void;
  onToggleWatchlist: (ticker: string) => void;
  watchlistTickers: string[];
  focusedAlertTicker?: string | null;
}

export function PlungeReboundView({
  onSelectStock,
  onOpenAlertModal,
  onToggleWatchlist,
  watchlistTickers,
  focusedAlertTicker
}: PlungeReboundViewProps) {
  const { isMobile, isAndroid } = useResponsive();

  // 1. Data States
  const [candidates, setCandidates] = useState<PlungeReboundCandidate[]>([]);
  const [modelsList, setModelsList] = useState<ReboundModelInfo[]>([]);
  
  // Default config initialized with commercial defaults across all models
  const [config, setConfig] = useState<ReboundDaemonConfig>({
    enabled: true, // 全局监控默认启动
    intervalMinutes: 15,
    sessionMode: 'REGULAR_ONLY',
    alerts: { desktopToast: true, audioChime: true, inAppModal: true },
    activeParams: {
      universe: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.universe,
      modelType: 'CONNORS_RSI',
      lookbackWindow: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.lookbackWindow,
      minDropPercent: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.minDropPercent,
      maxDropPercent: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.maxDropPercent,
      targetGainPercent: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.targetGainPercent,
      stopLossPercent: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.stopLossPercent,
      exhaustionCriteria: COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI.exhaustionCriteria
    },
    modelsConfig: JSON.parse(JSON.stringify(COMMERCIAL_DEFAULT_MODELS_CONFIG))
  });

  // Android Native Foreground Service & WeChat Heads-Up Config
  const [bgDaemonConfig, setBgDaemonConfig] = useState<BackgroundDaemonConfig>(() =>
    backgroundAlertService.getConfig()
  );

  const handleToggleBgService = async (enabled: boolean) => {
    const updated = await backgroundAlertService.saveConfig({ enabled });
    setBgDaemonConfig(updated);
  };

  const handleUpdateBgInterval = async (intervalSeconds: number) => {
    const updated = await backgroundAlertService.saveConfig({ intervalSeconds });
    setBgDaemonConfig(updated);
  };

  // Selected Active Tab Model
  const [selectedModelType, setSelectedModelType] = useState<ReboundModelType>('CONNORS_RSI');
  
  // Model Parameters Editing Mode
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftParams, setDraftParams] = useState<ModelParamConfig>(
    JSON.parse(JSON.stringify(COMMERCIAL_DEFAULT_MODELS_CONFIG.CONNORS_RSI))
  );
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Model Filter for Candidate Matrix
  const [filterModel, setFilterModel] = useState<'ALL' | ReboundModelType>('ALL');
  // Sector Filter for Secondary Candidate Matrix Classification (板块筛选)
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('ALL');

  // P0 Recent Alert Tracking & Card Focus States
  const [recentAlertsMap, setRecentAlertsMap] = useState<Map<string, {
    ticker: string;
    name: string;
    modelType: string;
    modelNameZh: string;
    price: number;
    dropPercent: number;
    targetPrice: number;
    targetGainPercent: number;
    stopLossPercent: number;
    timestamp: number;
    timeStr: string;
  }>>(new Map());
  const [focusedTicker, setFocusedTicker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showOnlyAlerted, setShowOnlyAlerted] = useState<boolean>(false);
  const [isMobileParamSheetOpen, setIsMobileParamSheetOpen] = useState<boolean>(false);
  
  // 暴跌反弹分析与建议详情抽屉状态 (图2专属)
  const [selectedDetailCandidate, setSelectedDetailCandidate] = useState<PlungeReboundCandidate | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [expandedCardTickers, setExpandedCardTickers] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastScannedAt, setLastScannedAt] = useState<string | null>(null);
  const isScanningRef = useRef<boolean>(false);

  // Sync initial recent alerts from NotificationService
  useEffect(() => {
    const list = notificationService.getRecentAlerts().filter(a => a.source === 'REBOUND' || a.view === 'rebound');
    if (list.length > 0) {
      setRecentAlertsMap(prev => {
        const next = new Map(prev);
        list.forEach(a => {
          if (!next.has(a.ticker)) {
            next.set(a.ticker, {
              ticker: a.ticker,
              name: a.stockName || a.ticker,
              modelType: a.modelType || 'CONNORS_RSI',
              modelNameZh: a.modelNameZh || '暴跌反弹',
              price: a.price || 0,
              dropPercent: a.dropPercent || 0,
              targetPrice: a.targetPrice || 0,
              targetGainPercent: a.targetGainPercent || 0,
              stopLossPercent: a.stopLossPercent || 0,
              timestamp: a.timestamp || Date.now(),
              timeStr: a.timestamp ? new Date(a.timestamp).toLocaleTimeString('zh-CN', { hour12: false }) : '刚刚'
            });
          }
        });
        return next;
      });
    }
  }, []);

  // 1-Click Smooth Scroll & Pulsing Glow Focus on Target Stock Card
  const focusAndScrollToTicker = useCallback((ticker: string) => {
    if (!ticker) return;
    const norm = ticker.toUpperCase();

    // Ensure target card is included in active DOM filter
    const cand = candidates.find(c => c.ticker === norm);
    if (cand) {
      if (filterModel !== 'ALL' && cand.modelType !== filterModel) {
        setFilterModel('ALL');
      }
      const candSector = getSectorZh(cand.ticker, cand.sector);
      if (selectedSectorFilter !== 'ALL' && candSector !== selectedSectorFilter) {
        setSelectedSectorFilter('ALL');
      }
      if (isMobile) {
        setSelectedDetailCandidate(cand);
        setIsDetailDrawerOpen(true);
      }
    }
    setSearchQuery('');
    setShowOnlyAlerted(false);
    setFocusedTicker(norm);

    setTimeout(() => {
      const desktopCard = document.getElementById(`rebound-card-${norm}`);
      const mobileCard = document.getElementById(`rebound-card-mobile-${norm}`);
      const targetCard = desktopCard || mobileCard;
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);

    setTimeout(() => {
      setFocusedTicker(prev => (prev === norm ? null : prev));
    }, 10000);
  }, [candidates, filterModel, selectedSectorFilter]);

  useEffect(() => {
    if (focusedAlertTicker) {
      focusAndScrollToTicker(focusedAlertTicker);
    }
  }, [focusedAlertTicker, focusAndScrollToTicker]);

  useEffect(() => {
    const handleFocusCard = (e: any) => {
      if (e.detail?.ticker) {
        focusAndScrollToTicker(e.detail.ticker);
      }
    };
    window.addEventListener('app:focus-card-ticker', handleFocusCard);
    return () => window.removeEventListener('app:focus-card-ticker', handleFocusCard);
  }, [focusAndScrollToTicker]);

  // P2: One-Click Bracket Order Modal State
  const [selectedOrderCandidate, setSelectedOrderCandidate] = useState<PlungeReboundCandidate | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);

  // 2. Fetch Initial Config & Models on Mount
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const [cfgRes, modelsRes, candsRes] = await Promise.all([
          apiClient.getReboundConfig(),
          apiClient.getReboundModels(),
          apiClient.getReboundCandidates()
        ]);

        if (!isMounted) return;
        if (cfgRes.success && cfgRes.config) {
          // Merge with commercial defaults if modelsConfig is missing
          const safeModelsConfig = {
            ...COMMERCIAL_DEFAULT_MODELS_CONFIG,
            ...(cfgRes.config.modelsConfig || {})
          };
          const fullCfg = { ...cfgRes.config, modelsConfig: safeModelsConfig };
          setConfig(fullCfg);
          const initialModelType = cfgRes.config.activeParams?.modelType || 'CONNORS_RSI';
          setSelectedModelType(initialModelType);
          setDraftParams(JSON.parse(JSON.stringify(safeModelsConfig[initialModelType])));
        }
        if (modelsRes.success) setModelsList(modelsRes.models);
        if (candsRes.success && candsRes.candidates) {
          setCandidates(candsRes.candidates);
          if (candsRes.lastScannedAt) setLastScannedAt(candsRes.lastScannedAt);
        }

        // Trigger live dynamic scan on mount to ensure real-time plunge candidates
        executeScan();
      } catch (err) {
        console.error('Failed to init plunge rebound view:', err);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const lastAlertedTickersRef = useRef<Map<string, number>>(new Map());

  // Dispatch Audio Chime and Windows Native Toast for high-confidence candidates
  const notifyCandidates = (newCandidates: PlungeReboundCandidate[]) => {
    const now = Date.now();
    const DEBOUNCE_MS = 15 * 60 * 1000; // 15 min debounce per ticker

    const topOpportunities = newCandidates.filter(c => c.reboundScore >= 60).slice(0, 3);
    for (const cand of topOpportunities) {
      const last = lastAlertedTickersRef.current.get(cand.ticker) || 0;
      if (now - last > DEBOUNCE_MS) {
        lastAlertedTickersRef.current.set(cand.ticker, now);

        // Record in recentAlertsMap
        setRecentAlertsMap(prev => {
          const next = new Map(prev);
          next.set(cand.ticker, {
            ticker: cand.ticker,
            name: cand.name,
            modelType: cand.modelType,
            modelNameZh: cand.modelNameZh,
            price: cand.price,
            dropPercent: cand.dropPercent,
            targetPrice: cand.targetPrice,
            targetGainPercent: cand.targetGainPercent,
            stopLossPercent: cand.stopLossPercent,
            timestamp: now,
            timeStr: new Date(now).toLocaleTimeString('zh-CN', { hour12: false })
          });
          return next;
        });

        if (config.alerts.audioChime) {
          notificationService.playAlertSound();
        }
        if (config.alerts.desktopToast || bgDaemonConfig.headsUpToast || isAndroid) {
          notificationService.showNotification(
            `[暴跌反弹预警] ${cand.ticker} 触发抄底`,
            {
              body: `${cand.name} [${cand.modelNameZh}] 急跌 ${cand.dropPercent}% 卖方衰竭，建议现价 $${cand.price.toFixed(2)} 买入，目标 +${cand.targetGainPercent}% ($${cand.targetPrice.toFixed(2)})，止损 -${cand.stopLossPercent}%`,
              metadata: {
                ticker: cand.ticker,
                stockName: cand.name,
                view: 'rebound',
                modelType: cand.modelType,
                modelNameZh: cand.modelNameZh,
                price: cand.price,
                dropPercent: cand.dropPercent,
                targetPrice: cand.targetPrice,
                targetGainPercent: cand.targetGainPercent,
                stopLossPercent: cand.stopLossPercent,
                timestamp: now,
                source: 'REBOUND',
                message: `${cand.modelNameZh} 急跌 ${cand.dropPercent}% 卖方衰竭，建议买入`
              }
            }
          );
        }
      }
    }
  };

  // Client-Side Active Daemon Timer: Runs pure client-side every intervalMinutes
  useEffect(() => {
    if (!config.enabled) return;
    const intervalMs = Math.max(1, config.intervalMinutes) * 60 * 1000;
    const timer = setInterval(() => {
      executeScan();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [config.enabled, config.intervalMinutes, config.modelsConfig]);

  // 3. Scan Trigger (Scans all active models by default)
  const executeScan = async (paramsOverride?: any) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setIsLoading(true);
    try {
      const res = await apiClient.runReboundScan(paramsOverride);
      if (res.success) {
        const cands = res.candidates || [];
        setCandidates(cands);
        setLastScannedAt(res.lastScannedAt || new Date().toLocaleTimeString('zh-CN', { hour12: false }));
        notifyCandidates(cands);
      }
    } catch (err) {
      console.error('Rebound scan failed:', err);
    } finally {
      isScanningRef.current = false;
      setIsLoading(false);
    }
  };

  // 4. Update Global Config Helper
  const handleUpdateGlobalConfig = async (partial: Partial<ReboundDaemonConfig>) => {
    try {
      const updated = await apiClient.updateReboundConfig(partial);
      if (updated.success) {
        setConfig(prev => ({
          ...prev,
          ...updated.config,
          modelsConfig: {
            ...prev.modelsConfig,
            ...(updated.config.modelsConfig || {})
          }
        }));
      }
    } catch (err) {
      console.error('Failed to update global config:', err);
    }
  };

  // Current Model Configuration Helper
  const currentModelConfig: ModelParamConfig = 
    config.modelsConfig?.[selectedModelType] || COMMERCIAL_DEFAULT_MODELS_CONFIG[selectedModelType];

  const commercialDefault = COMMERCIAL_DEFAULT_MODELS_CONFIG[selectedModelType];

  // Tab Switch: Sets selected model and syncs draft params
  const handleSelectModelTab = (modelType: ReboundModelType) => {
    setSelectedModelType(modelType);
    setIsEditing(false);
    const targetModelCfg = config.modelsConfig?.[modelType] || COMMERCIAL_DEFAULT_MODELS_CONFIG[modelType];
    setDraftParams(JSON.parse(JSON.stringify(targetModelCfg)));
  };

  // Toggle Single Model Monitoring Switch (启动监控 / 暂停监控)
  const handleToggleModelEnabled = async (modelType: ReboundModelType, targetState?: boolean) => {
    const current = config.modelsConfig?.[modelType] || COMMERCIAL_DEFAULT_MODELS_CONFIG[modelType];
    const newEnabled = targetState !== undefined ? targetState : !current.enabled;
    
    try {
      const res = await apiClient.updateReboundModelConfig(modelType, { enabled: newEnabled });
      if (res.success) {
        setConfig(prev => ({
          ...prev,
          modelsConfig: {
            ...prev.modelsConfig,
            [modelType]: {
              ...prev.modelsConfig[modelType],
              enabled: newEnabled
            }
          }
        }));
        if (modelType === selectedModelType) {
          setDraftParams(prev => ({ ...prev, enabled: newEnabled }));
        }
        
        // Show feedback message
        const modelInfo = modelsList.find(m => m.type === modelType);
        const name = modelInfo?.nameZh || modelType;
        setSaveSuccessMessage(`${name} 监控状态已切换为: ${newEnabled ? '【已启动 🟢】' : '【已暂停 ⚪】'}`);
        setTimeout(() => setSaveSuccessMessage(null), 3000);

        // Run updated scan
        executeScan();
      }
    } catch (err) {
      console.error('Failed to toggle model enabled:', err);
    }
  };

  // Start Editing Parameters
  const handleStartEditing = () => {
    setIsEditing(true);
    setDraftParams(JSON.parse(JSON.stringify(currentModelConfig)));
  };

  // Cancel Editing Parameters
  const handleCancelEditing = () => {
    setIsEditing(false);
    setDraftParams(JSON.parse(JSON.stringify(currentModelConfig)));
  };

  // Save Configuration (保存配置)
  const handleSaveModelConfig = async () => {
    try {
      const res = await apiClient.updateReboundModelConfig(selectedModelType, draftParams);
      if (res.success) {
        setConfig(prev => ({
          ...prev,
          modelsConfig: {
            ...prev.modelsConfig,
            [selectedModelType]: { ...draftParams }
          }
        }));
        setIsEditing(false);
        const activeModel = modelsList.find(m => m.type === selectedModelType);
        setSaveSuccessMessage(`${activeModel?.nameZh || selectedModelType} 参数配置已成功保存！点击「启动监控」生效`);
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save model config:', err);
    }
  };

  // Reset to Commercial Defaults (恢复商业默认)
  const handleResetToCommercialDefaults = async () => {
    try {
      const res = await apiClient.resetReboundModelConfig(selectedModelType);
      if (res.success) {
        const freshDefault = COMMERCIAL_DEFAULT_MODELS_CONFIG[selectedModelType];
        setConfig(prev => ({
          ...prev,
          modelsConfig: {
            ...prev.modelsConfig,
            [selectedModelType]: JSON.parse(JSON.stringify(freshDefault))
          }
        }));
        setDraftParams(JSON.parse(JSON.stringify(freshDefault)));
        setIsEditing(false);
        const activeModel = modelsList.find(m => m.type === selectedModelType);
        setSaveSuccessMessage(`${activeModel?.nameZh || selectedModelType} 已成功恢复华尔街商业标准参数！`);
        setTimeout(() => setSaveSuccessMessage(null), 3500);
        executeScan();
      }
    } catch (err) {
      console.error('Failed to reset model config:', err);
    }
  };

  const activeModelMeta = modelsList.find(m => m.type === selectedModelType);
  const activeParamsDisplay = isEditing ? draftParams : currentModelConfig;

  // Derived unique sectors and candidate count for secondary sector classification
  const availableSectorsWithCount = useMemo(() => {
    const countMap = new Map<string, number>();
    candidates.forEach(cand => {
      const sectorZh = getSectorZh(cand.ticker, cand.sector);
      countMap.set(sectorZh, (countMap.get(sectorZh) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([sectorZh, count]) => ({ sectorZh, count }));
  }, [candidates]);

  // Filter candidates with Model, Sector, Alerted-Only & Search Query support
  const filteredCandidates = candidates.filter(c => {
    if (showOnlyAlerted && !recentAlertsMap.has(c.ticker)) {
      return false;
    }
    if (!showOnlyAlerted && filterModel !== 'ALL' && c.modelType !== filterModel) {
      return false;
    }
    if (selectedSectorFilter !== 'ALL') {
      const sectorZh = getSectorZh(c.ticker, c.sector);
      if (sectorZh !== selectedSectorFilter && c.sector !== selectedSectorFilter) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      const matchTicker = c.ticker.toUpperCase().includes(q);
      const matchName = c.name.toUpperCase().includes(q);
      const matchSector = getSectorZh(c.ticker, c.sector).toUpperCase().includes(q);
      if (!matchTicker && !matchName && !matchSector) return false;
    }
    return true;
  });

  const latestAlertItem = Array.from(recentAlertsMap.values())[0] || null;

  // Calculate active models count
  const activeModelsCount = Object.values(config.modelsConfig || {}).filter(m => m.enabled).length;

  return (
    <div className={`flex flex-col ${isMobile ? 'gap-3 pb-24 px-1' : 'gap-4 pb-16'}`}>
      {isMobile ? (
        /* Mobile-Optimized Plunge Rebound View */
        <div className="flex flex-col gap-3">
          {/* 1. Mobile Compact Header Deck (Consolidated Google M3) */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Zap className="w-3.5 h-3.5 animate-pulse stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-xs font-black text-slate-900 tracking-tight truncate">
                      暴跌反弹预警
                    </h1>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold shrink-0">
                      {activeModelsCount}/4 在线
                    </span>
                  </div>
                  <span className="text-[9.5px] font-mono text-slate-400 block truncate">
                    {lastScannedAt ? `于 ${lastScannedAt} 捕获 ${candidates.length} 标的` : '日内做市商衰竭模型'}
                  </span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => executeScan()}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white shadow-xs active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  title="立即扫描美股暴跌反弹"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>{isLoading ? '扫描中' : '扫描'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMobileParamSheetOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black border border-blue-200 bg-blue-50 text-blue-700 active:bg-blue-100 transition cursor-pointer shadow-2xs"
                  title="打开暴跌反弹模型参数配置抽屉"
                >
                  <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                  <span>调参</span>
                </button>
              </div>
            </div>

            {/* Row 2: Controls Chip Strip (Interval, Anti-Knife, Background Daemon) */}
            <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100 text-[10.5px]">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shrink-0">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>间隔:</span>
                  <select
                    value={config.intervalMinutes}
                    onChange={e => handleUpdateGlobalConfig({ intervalMinutes: Number(e.target.value) })}
                    className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer text-[10px]"
                  >
                    <option value={1}>1分</option>
                    <option value={3}>3分</option>
                    <option value={5}>5分</option>
                    <option value={15}>15分</option>
                    <option value={30}>30分</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50/80 rounded-lg border border-amber-200/60 text-amber-900 font-bold shrink-0">
                  <Shield className="w-3 h-3 text-amber-600" />
                  <span>防飞刀 {config.adaptiveRegime?.thresholdMultiplier || 1.0}x</span>
                </div>
              </div>

              {/* Background Daemon Toggle */}
              <div className="flex items-center gap-1 bg-blue-50/80 px-2 py-0.5 rounded-lg border border-blue-200/60 shrink-0">
                <ShieldCheck className="w-3 h-3 text-[#1a73e8]" />
                <span className="text-[10px] font-bold text-slate-700">常驻:</span>
                <button
                  type="button"
                  onClick={() => handleToggleBgService(!bgDaemonConfig.enabled)}
                  className={`relative inline-flex h-4 w-7.5 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    bgDaemonConfig.enabled ? 'bg-[#1a73e8]' : 'bg-slate-300'
                  }`}
                  title="开启/关闭后台前台保活服务"
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      bgDaemonConfig.enabled ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Row 3 (Collapsible when bg enabled): Frequency & Battery White-list */}
            {bgDaemonConfig.enabled && (
              <div className="pt-1.5 border-t border-blue-100 flex items-center justify-between gap-1 text-[10px] flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-600">频率:</span>
                  {[
                    { label: '15秒', sec: 15 },
                    { label: '30秒', sec: 30 },
                    { label: '1分', sec: 60 },
                    { label: '5分', sec: 300 }
                  ].map(item => (
                    <button
                      key={item.sec}
                      type="button"
                      onClick={() => handleUpdateBgInterval(item.sec)}
                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold transition cursor-pointer border ${
                        bgDaemonConfig.intervalSeconds === item.sec
                          ? 'bg-[#1a73e8] border-[#1a73e8] text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => backgroundAlertService.requestBatteryOptimizationExemption()}
                  className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 cursor-pointer shrink-0"
                  title="跳转至系统电池设置，勾选无限制运行"
                >
                  <BatteryCharging className="w-2.5 h-2.5 text-amber-500" />
                  <span>电池无限制</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Horizontal Scrolling 4+1 Core Models Capsule Tabs */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-extrabold text-slate-700 flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-600" />
                <span>4 大核心反弹模型</span>
              </span>
              <span className="text-[9.5px] text-slate-400 font-mono">
                左右滑动切换
              </span>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none touch-pan-x">
              {[
                { type: 'CONNORS_RSI', label: 'Connors RSI(2)', icon: '🎯' },
                { type: 'WYCKOFF_CLIMAX', label: 'Wyckoff 抛售高潮', icon: '🔥' },
                { type: 'VWAP_ZSCORE', label: 'VWAP 负偏离', icon: '📉' },
                { type: 'BOLLINGER_STOCH', label: '布林下轨刺透', icon: '📊' },
                { type: 'CUSTOM', label: '自定义模型', icon: '⚙️' }
              ].map(m => {
                const isSelected = selectedModelType === m.type;
                const modelCfg = config.modelsConfig?.[m.type as ReboundModelType] || COMMERCIAL_DEFAULT_MODELS_CONFIG[m.type as ReboundModelType];
                const isModelEnabled = modelCfg?.enabled ?? true;

                return (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => handleSelectModelTab(m.type as ReboundModelType)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 transition cursor-pointer border ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white border-amber-600 shadow-xs font-black'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 active:bg-slate-100'
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${isModelEnabled ? (isSelected ? 'bg-emerald-300' : 'bg-emerald-500') : 'bg-slate-400'}`} />
                  </button>
                );
              })}
            </div>

            {/* Active Model Description & Quick Control Shelf */}
            <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800 truncate">
                  {activeModelMeta?.nameZh || selectedModelType}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleModelEnabled(selectedModelType)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold cursor-pointer transition ${
                    currentModelConfig.enabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {currentModelConfig.enabled ? '● 监控中 (点击暂停)' : '○ 已暂停 (点击启动)'}
                </button>
              </div>

              {/* Parameters info bar */}
              <div className="bg-slate-50 rounded-xl p-2 border border-slate-200/70 text-[11px] font-mono text-slate-600 flex items-center justify-between flex-wrap gap-1">
                <span>窗口 {activeParamsDisplay.lookbackWindow}</span>
                <span>跌幅 ≥{activeParamsDisplay.minDropPercent}%</span>
                <span className="text-emerald-700 font-bold">止盈 +{activeParamsDisplay.targetGainPercent}%</span>
                <span className="text-rose-700 font-bold">止损 -{activeParamsDisplay.stopLossPercent}%</span>
              </div>

              <div className="flex items-center justify-between gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsMobileParamSheetOpen(true)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>微调此模型参数 ›</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToCommercialDefaults}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    恢复默认
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const relaxed = { ...currentModelConfig, minDropPercent: 1.0, universe: 'ALL' as any, modelType: selectedModelType };
                      executeScan(relaxed);
                    }}
                    className="text-[11px] text-amber-700 font-bold cursor-pointer"
                  >
                    一键放宽 (≥1.0%) ›
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Candidates Matrix Stream Header & Filter Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-extrabold text-sm text-slate-900">
                  暴跌反弹机会 ({filteredCandidates.length} / {candidates.length} 席)
                </span>
              </div>
              {/* Mobile Quick Search Input */}
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索 (如 TMO)..."
                  className="pl-6 pr-5 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 w-28 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Model & Sector & Alerted Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-1 scrollbar-none touch-pan-x">
              {/* 二次分类筛选: 板块筛选 (移动端) */}
              <div className="flex items-center gap-1 shrink-0">
                <select
                  value={selectedSectorFilter}
                  onChange={e => setSelectedSectorFilter(e.target.value)}
                  className={`py-1 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs focus:outline-none shrink-0 ${
                    selectedSectorFilter !== 'ALL'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                  title="按美股所属板块进行二次分类筛选"
                >
                  <option value="ALL">全部板块 ({candidates.length})</option>
                  {availableSectorsWithCount.map(sec => (
                    <option key={sec.sectorZh} value={sec.sectorZh}>
                      {sec.sectorZh} ({sec.count})
                    </option>
                  ))}
                </select>
                {selectedSectorFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setSelectedSectorFilter('ALL')}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 shrink-0"
                    title="清空板块筛选"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {recentAlertsMap.size > 0 && (
                <button
                  type="button"
                  onClick={() => setShowOnlyAlerted(!showOnlyAlerted)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 cursor-pointer transition flex items-center gap-1 ${
                    showOnlyAlerted
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-700 border border-rose-300'
                  }`}
                >
                  <Bell className="w-3 h-3 animate-pulse" />
                  <span>刚刚预警 ({recentAlertsMap.size})</span>
                </button>
              )}

              {(['ALL', 'CONNORS_RSI', 'WYCKOFF_CLIMAX', 'VWAP_ZSCORE', 'BOLLINGER_STOCH', 'CUSTOM'] as const).map(f => {
                const labelMap: Record<string, string> = {
                  ALL: '全部',
                  CONNORS_RSI: 'Connors',
                  WYCKOFF_CLIMAX: 'Wyckoff',
                  VWAP_ZSCORE: 'VWAP',
                  BOLLINGER_STOCH: '布林',
                  CUSTOM: '自定义'
                };
                const isSel = filterModel === f && !showOnlyAlerted;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setFilterModel(f);
                      setShowOnlyAlerted(false);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition ${
                      isSel
                        ? 'bg-slate-900 text-white shadow-2xs font-black'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {labelMap[f]}
                  </button>
                );
              })}
            </div>

            {/* Mobile Latest Alert Jump Bar */}
            {latestAlertItem && (
              <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-300 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="p-1 bg-rose-600 text-white rounded-md shrink-0">
                    <Bell className="w-3 h-3 animate-bounce" />
                  </span>
                  <div className="min-w-0 text-xs">
                    <div className="flex items-center gap-1.5 font-black text-slate-900">
                      <span>{latestAlertItem.ticker}</span>
                      <span className="text-[10px] text-rose-600 font-mono">${(latestAlertItem.price ?? 0).toFixed(2)} (-{latestAlertItem.dropPercent ?? 0}%)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {latestAlertItem.modelNameZh} · {latestAlertItem.timeStr}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => focusAndScrollToTicker(latestAlertItem.ticker)}
                  className="px-2.5 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>定位</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Single-Column High Density Candidates Feed */}
          {isLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-mono">
              <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
              <span className="text-slate-700 font-bold">正在巡检做市商暴跌反弹机会...</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="py-12 px-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2.5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                {selectedSectorFilter !== 'ALL' || filterModel !== 'ALL' || searchQuery.trim()
                  ? `当前筛选 (板块: ${selectedSectorFilter !== 'ALL' ? selectedSectorFilter : '全部'} · 模型: ${filterModel !== 'ALL' ? filterModel : '全部'}) 暂无匹配标的`
                  : '当前监控时段内暂无严重暴跌标的'}
              </p>
              <div className="flex flex-col gap-2 pt-1 max-w-xs mx-auto">
                {(selectedSectorFilter !== 'ALL' || filterModel !== 'ALL' || searchQuery.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSectorFilter('ALL');
                      setFilterModel('ALL');
                      setSearchQuery('');
                      setShowOnlyAlerted(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重置所有筛选 (恢复全部 {candidates.length} 席)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const relaxed = { ...currentModelConfig, minDropPercent: 1.0, universe: 'ALL' as any, modelType: selectedModelType };
                    executeScan(relaxed);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
                >
                  一键放宽至 ≥1.0% 跌幅全市场扫描
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredCandidates.map((cand, idx) => {
                const isWatchlisted = watchlistTickers.includes(cand.ticker);
                const rank = idx + 1;
                const isFocused = focusedTicker === cand.ticker;
                const alertInfo = recentAlertsMap.get(cand.ticker);
                const isInlineExpanded = expandedCardTickers.has(cand.ticker);

                const handleCardClick = () => {
                  setSelectedDetailCandidate(cand);
                  setIsDetailDrawerOpen(true);
                };

                const toggleInlineExpand = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  setExpandedCardTickers(prev => {
                    const next = new Set(prev);
                    if (next.has(cand.ticker)) next.delete(cand.ticker);
                    else next.add(cand.ticker);
                    return next;
                  });
                };

                return (
                  <div
                    key={`${cand.ticker}-${cand.modelType}-${idx}`}
                    id={`rebound-card-mobile-${cand.ticker}`}
                    onClick={handleCardClick}
                    className={`bg-white rounded-xl p-2.5 border transition-all flex flex-col gap-1.5 relative cursor-pointer active:bg-slate-50/80 shadow-2xs ${
                      isFocused
                        ? 'border-rose-500 ring-3 ring-rose-500/70 shadow-lg shadow-rose-500/30 bg-gradient-to-b from-rose-50/40 via-white to-white z-20 animate-pulse'
                        : alertInfo
                        ? 'border-amber-400 shadow-sm ring-1 ring-amber-300'
                        : 'border-slate-200/90'
                    }`}
                  >
                    {/* Focus Alert Banner */}
                    {isFocused && (
                      <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center justify-between -mt-0.5 mb-0.5 animate-bounce">
                        <span className="flex items-center gap-1">
                          <Bell className="w-2.5 h-2.5" />
                          <span>刚刚预警触发 · 点击查看分析详情</span>
                        </span>
                        <span className="font-mono text-[8.5px] bg-black/20 px-1 rounded text-white">
                          {alertInfo?.timeStr || '刚刚'}
                        </span>
                      </div>
                    )}
                    {!isFocused && alertInfo && (
                      <div className="bg-amber-100 text-amber-900 border border-amber-300 text-[8.5px] font-bold px-1.5 py-0.5 rounded flex items-center justify-between -mt-0.5 mb-0.5">
                        <span className="flex items-center gap-1">
                          <Bell className="w-2 h-2 text-amber-700" />
                          <span>盘中触发预警标的</span>
                        </span>
                        <span className="font-mono text-amber-800">{alertInfo.timeStr}</span>
                      </div>
                    )}

                    {/* Header: Rank + Logo + Ticker + Name + Quick Actions */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span
                          className={`text-[9px] font-black font-mono px-1 py-0.2 rounded-md shrink-0 ${
                            rank <= 3
                              ? 'bg-rose-600 text-white'
                              : rank <= 10
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{rank}
                        </span>
                        <StockLogo ticker={cand.ticker} name={cand.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-[13px] tracking-tight truncate">
                              {cand.ticker}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {cand.exchange}
                            </span>
                            <StockSectorBadge ticker={cand.ticker} sector={cand.sector} size="xs" />
                          </div>
                          <span className="text-[10px] text-slate-500 truncate block leading-tight font-medium">
                            {cand.name}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onToggleWatchlist(cand.ticker)}
                          className={`p-1 rounded-lg transition cursor-pointer ${
                            isWatchlisted
                              ? 'text-amber-500 bg-amber-50'
                              : 'text-slate-400 bg-slate-100 active:bg-slate-200'
                          }`}
                          title={isWatchlisted ? '已在自选' : '加入自选'}
                        >
                          <Star className={`w-3 h-3 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenAlertModal(cand.ticker, cand.name)}
                          className="p-1 rounded-lg text-rose-600 bg-rose-50 active:bg-rose-100 transition cursor-pointer"
                          title="设置预警"
                        >
                          <Bell className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={toggleInlineExpand}
                          className="p-1 rounded-lg text-slate-400 bg-slate-50 active:bg-slate-200 transition cursor-pointer"
                          title={isInlineExpanded ? '收起卡片' : '展开卡片'}
                        >
                          {isInlineExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Model Tag & Window & Win Score */}
                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-rose-700 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded-md font-bold truncate">
                          {cand.modelNameZh}
                        </span>
                        <span className="font-mono text-slate-400 text-[10px] shrink-0">
                          窗口 {cand.dropDurationMinutes}m
                        </span>
                      </div>
                      <span className="font-mono font-black text-[11px] text-amber-900 bg-amber-100/80 border border-amber-200 px-1.5 py-0.5 rounded-md shrink-0">
                        胜率 {cand.reboundScore ?? 85}分
                      </span>
                    </div>

                    {/* Bottom Row: Price, Day Change, Drop Magnitude & Drawer Trigger Button */}
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono font-black text-slate-900 text-lg tabular-nums">
                          ${(cand.price ?? 0).toFixed(2)}
                        </span>
                        <span className="text-xs font-mono font-black px-1.5 py-0.5 rounded-md text-rose-700 bg-rose-50 border border-rose-200">
                          {(cand.changePercent ?? cand.dropPercent ?? 0) >= 0 ? '+' : ''}{(cand.changePercent ?? cand.dropPercent ?? 0).toFixed(2)}%
                        </span>
                        <span className="font-mono font-black px-1.5 py-0.5 rounded-md text-[11px] bg-rose-600 text-white shadow-2xs">
                          急跌 {cand.dropPercent}%
                        </span>
                      </div>

                      {/* 弹出抽屉提示按钮 */}
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-black shadow-2xs transition">
                        <span>分析详情</span>
                        <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                    </div>

                    {/* 可选内联折叠区 (若用户点击右上角 Chevron 展开) */}
                    {isInlineExpanded && (
                      <div className="pt-2 border-t border-slate-100 space-y-2 mt-1" onClick={e => e.stopPropagation()}>
                        {/* Exhaustion Signals */}
                        <div className="bg-amber-50/60 rounded-xl p-2.5 space-y-1.5 border border-amber-200/70">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-amber-950 flex items-center gap-1">
                              <Shield className="w-3 h-3 text-amber-600" />
                              <span>卖方衰竭判定信号</span>
                            </span>
                            <span className="font-mono font-black text-xs text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                              胜率 {cand.reboundScore ?? 85}分
                            </span>
                          </div>
                          <div className="space-y-1">
                            {(Array.isArray(cand.exhaustionSignals) ? cand.exhaustionSignals : []).map((sig, sIdx) => (
                              <div key={sIdx} className="flex items-center gap-1.5 text-[11px] text-amber-900 font-medium">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate">{sig}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Entry, Target & Stop Loss */}
                        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-xs font-mono space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">买入参考现价:</span>
                            <span className="font-bold text-slate-900">${(cand.entryPrice ?? cand.price ?? 0).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-emerald-700 font-bold">目标止盈 (+{cand.targetGainPercent}%):</span>
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              ${(cand.targetPrice ?? 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-rose-700 font-bold">硬性止损 (-{cand.stopLossPercent}%):</span>
                            <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              ${(cand.stopLossPrice ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* L2 OBI */}
                        {cand.obiAnalysis && (
                          <div className="flex items-center justify-between text-[10px] font-mono px-2.5 py-1 rounded-lg bg-indigo-50/70 border border-indigo-200/60 text-indigo-900">
                            <span className="flex items-center gap-1 font-bold">
                              <Layers className="w-3 h-3 text-indigo-600" />
                              <span>L2 盘口 OBI:</span>
                            </span>
                            <span className="font-bold">
                              {((cand.obiAnalysis.obi ?? 0.42) * 100 >= 0 ? '+' : '')}{((cand.obiAnalysis.obi ?? 0.42) * 100).toFixed(0)}% ({cand.obiAnalysis.regimeLabel || '主力承接'})
                            </span>
                          </div>
                        )}

                        {/* One-Click Bracket Order Trigger Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderCandidate(cand);
                            setIsOrderModalOpen(true);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 transition cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>⚡ 一键预埋 Bracket (OCO) 复合单</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Desktop View */
        <div className="flex flex-col gap-4">
          {/* 1. Header Command Deck */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Zap className="w-4 h-4 animate-pulse stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  暴跌反弹预警终端 (FLASH REBOUND)
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                  日内高频做市商模型
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  {config.enabled ? `全局监控已启动 (${activeModelsCount}/4 核心在线)` : '全局监控已暂停'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                实时侦测卖方衰竭与恐慌盘抛售高潮，商业量化标准参数标定，高胜率捕捉 +1.0% ~ +2.5% 急速均值回归反弹。
              </p>
            </div>
          </div>

          {/* Controls: Global Daemon Switch, Interval, Sound & Status */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Global Daemon Toggle Pill */}
            <button
              type="button"
              onClick={() => handleUpdateGlobalConfig({ enabled: !config.enabled })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                config.enabled
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                  : 'bg-slate-100 border-slate-300 text-slate-500'
              }`}
              title={config.enabled ? '点击暂停全局后台扫描' : '点击启动全局后台扫描'}
            >
              <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <span>{config.enabled ? `每${config.intervalMinutes}分全模巡检中` : '全局监控已暂停'}</span>
              {config.enabled ? <Pause className="w-3 h-3 ml-0.5 text-emerald-600" /> : <Play className="w-3 h-3 ml-0.5 text-slate-600" />}
            </button>

            {/* Interval Selector */}
            <div className="flex items-center gap-1 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={config.intervalMinutes}
                onChange={e => handleUpdateGlobalConfig({ intervalMinutes: Number(e.target.value) })}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                title="设置开盘期间自动扫描间隔"
              >
                <option value={1}>1 分钟极速</option>
                <option value={3}>3 分钟高频</option>
                <option value={5}>5 分钟</option>
                <option value={15}>15 分钟 (默认推荐)</option>
                <option value={30}>30 分钟</option>
                <option value={60}>60 分钟</option>
              </select>
            </div>

            {/* Alert Channels Toggles */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={config.alerts.desktopToast}
                  onChange={e => handleUpdateGlobalConfig({ alerts: { ...config.alerts, desktopToast: e.target.checked } })}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>系统Toast</span>
              </label>

              <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={config.alerts.audioChime}
                  onChange={e => handleUpdateGlobalConfig({ alerts: { ...config.alerts, audioChime: e.target.checked } })}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <Volume2 className="w-3 h-3 text-slate-500" />
                <span>提示音</span>
              </label>

              {/* Android/后台保活驻留开关 */}
              <button
                type="button"
                onClick={() => handleToggleBgService(!bgDaemonConfig.enabled)}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                  bgDaemonConfig.enabled
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
                title="开启后程序在后台（切到微信或锁屏）保持持续扫描并弹出微信级横幅"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{bgDaemonConfig.enabled ? '后台常驻守护' : '后台守护关闭'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const testCand = candidates[0] || {
                    ticker: 'BB',
                    name: 'BlackBerry Limited',
                    price: 8.77,
                    dropPercent: -8.46,
                    modelNameZh: 'Wyckoff 抛售高潮与卖压衰竭',
                    modelType: 'WYCKOFF_CLIMAX',
                    targetGainPercent: 1.5,
                    targetPrice: 8.90,
                    stopLossPercent: 1.0
                  };
                  notificationService.playAlertSound();
                  notificationService.showNotification(`[暴跌反弹预警] ${testCand.ticker} 触发抄底`, {
                    body: `${testCand.name} [${testCand.modelNameZh}] 急跌 ${testCand.dropPercent}% 卖方衰竭，建议现价 $${testCand.price.toFixed(2)} 买入`,
                    metadata: {
                      ticker: testCand.ticker,
                      stockName: testCand.name,
                      view: 'rebound',
                      modelType: testCand.modelType,
                      modelNameZh: testCand.modelNameZh,
                      price: testCand.price,
                      dropPercent: testCand.dropPercent,
                      targetPrice: testCand.targetPrice,
                      targetGainPercent: testCand.targetGainPercent,
                      stopLossPercent: testCand.stopLossPercent,
                      timestamp: Date.now(),
                      source: 'REBOUND',
                      message: `${testCand.modelNameZh} 测试预警`
                    }
                  });
                  focusAndScrollToTicker(testCand.ticker);
                }}
                className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 transition-colors cursor-pointer"
                title="点击测试系统 Toast 弹窗与预警定位聚焦"
              >
                测试通知 & 标的定位
              </button>
            </div>

            {/* P1 Macro Volatility Adaptive Control Pill */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shadow-2xs ${
              config.adaptiveRegime?.currentRegime === 'HIGH_VOL'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <Shield className={`w-3.5 h-3.5 ${config.adaptiveRegime?.antiKnifeProtectionActive ? 'text-amber-600 animate-pulse' : 'text-emerald-600'}`} />
              <span className="font-bold text-[11px]">
                {config.adaptiveRegime?.regimeLabel || '🟢 宏观自适应稳定'}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                (动态门槛 {config.adaptiveRegime?.thresholdMultiplier || 1.0}x)
              </span>
              <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] font-bold text-slate-700 ml-1 border-l pl-1.5 border-slate-200">
                <input
                  type="checkbox"
                  checked={config.adaptiveRegime?.enabled !== false}
                  onChange={e => handleUpdateGlobalConfig({
                    adaptiveRegime: {
                      ...(config.adaptiveRegime || {
                        enabled: true,
                        currentRegime: 'NORMAL',
                        regimeLabel: '🟡 均衡常态',
                        vixLevel: 14.85,
                        thresholdMultiplier: 1.0,
                        antiKnifeProtectionActive: false
                      }),
                      enabled: e.target.checked
                    }
                  })}
                  className="rounded text-amber-600 focus:ring-0"
                />
                <span>自适应防飞刀</span>
              </label>
            </div>
          </div>
        </div>

        {/* 2. Authoritative Strategy Models Segmented Bar with Individual Switch Indicators */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-700 shrink-0 text-xs font-extrabold w-20">
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            <span>核心模型</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-1.5 flex-1">
            {[
              { type: 'CONNORS_RSI', label: 'Larry Connors 极限均值回归', icon: '🎯', desc: '华尔街经典超跌模型：RSI(2)<=10 极度冰点' },
              { type: 'WYCKOFF_CLIMAX', label: 'Wyckoff 抛售高潮与卖压衰竭', icon: '🔥', desc: '巨量割肉后成交量骤缩，长下影锤头线主力承接' },
              { type: 'VWAP_ZSCORE', label: '日内 VWAP 极端负偏离回归', icon: '📉', desc: '偏离 VWAP 均线超过 -1.8% 后的强力均值回归' },
              { type: 'BOLLINGER_STOCH', label: '布林下轨刺透与超卖金叉', icon: '📊', desc: '跌破布林下轨 2σ 后收回轨道内，叠加随机指标超卖' },
              { type: 'CUSTOM', label: '用户自定义暴跌参数模型', icon: '⚙️', desc: '自由设定急跌幅度、统计窗口、止盈目标与防套硬止损' }
            ].map(m => {
              const isSelected = selectedModelType === m.type;
              const modelCfg = config.modelsConfig?.[m.type as ReboundModelType] || COMMERCIAL_DEFAULT_MODELS_CONFIG[m.type as ReboundModelType];
              const isModelEnabled = modelCfg?.enabled ?? true;

              return (
                <div
                  key={m.type}
                  onClick={() => handleSelectModelTab(m.type as ReboundModelType)}
                  className={`flex items-center justify-between gap-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white border-amber-600 shadow-xs font-black'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
                  }`}
                  title={`${m.label}: ${m.desc}`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs shrink-0">{m.icon}</span>
                    <span className="truncate">{m.label}</span>
                  </div>

                  {/* Per-model monitoring status badge & quick toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleModelEnabled(m.type as ReboundModelType);
                    }}
                    title={isModelEnabled ? '该模型正在监控中，点击暂停' : '该模型已暂停，点击启动监控'}
                    className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      isSelected
                        ? isModelEnabled
                          ? 'bg-emerald-500/30 text-emerald-100 hover:bg-emerald-500/40'
                          : 'bg-black/20 text-slate-200 hover:bg-black/30'
                        : isModelEnabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-200/80 text-slate-500 hover:bg-slate-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isModelEnabled ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                    <span>{isModelEnabled ? '监控中' : '已暂停'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Model Description & Commercial Defaults Summary Banner */}
        {activeModelMeta && (
          <div className="px-3 py-1.5 bg-amber-50/60 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 flex items-center justify-between gap-2 flex-wrap">
            <span className="font-medium">
              💡 <strong>{activeModelMeta.nameZh}</strong>: {activeModelMeta.description}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-800 text-[10px] font-bold">
                商业标准默认: 窗口 {commercialDefault.lookbackWindow} │ 跌幅 ≥{commercialDefault.minDropPercent}% │ 止盈 +{commercialDefault.targetGainPercent}% │ 止损 -{commercialDefault.stopLossPercent}%
              </span>
            </div>
          </div>
        )}

        {/* Save/Action Notification Alert Toast */}
        {saveSuccessMessage && (
          <div className="p-2 px-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold flex items-center justify-between animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 3. Tactical Parameter Shelf & Operations Command Deck */}
        <div className={`rounded-xl p-3 border transition-all text-xs space-y-3 ${
          isEditing 
            ? 'bg-amber-50/40 border-amber-300 shadow-2xs' 
            : 'bg-slate-50/70 border-slate-200/70'
        }`}>
          {/* Action Buttons Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span className="font-extrabold text-slate-800 text-xs">
                模型量化参数调控架: <strong className="text-rose-700">{activeModelMeta?.nameZh}</strong>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                currentModelConfig.enabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {currentModelConfig.enabled ? '● 监控中 (Active)' : '○ 已暂停 (Paused)'}
              </span>
              {isEditing && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                  正在修改配置中...
                </span>
              )}
            </div>

            {/* Operations Button Group: 修改配置 / 保存配置 / 启动监控独立开关 / 恢复默认 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {!isEditing ? (
                <>
                  {/* Button 1: 修改配置 */}
                  <button
                    type="button"
                    onClick={handleStartEditing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-extrabold border border-slate-300 shadow-2xs transition-all cursor-pointer"
                    title="点击修改统计窗口期、跌幅门槛、止盈与止损"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>修改配置</span>
                  </button>

                  {/* Button 2: 独立启动监控开关 */}
                  <button
                    type="button"
                    onClick={() => handleToggleModelEnabled(selectedModelType)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-2xs transition-all cursor-pointer ${
                      currentModelConfig.enabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                    title={currentModelConfig.enabled ? '点击暂停此模型监控' : '点击启动此模型监控'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{currentModelConfig.enabled ? '监控中 (点击暂停)' : '启动监控'}</span>
                  </button>

                  {/* Button 3: 恢复商业默认 */}
                  <button
                    type="button"
                    onClick={handleResetToCommercialDefaults}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium border border-slate-200 transition-all cursor-pointer"
                    title="一键重置为华尔街商业标准参数"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>恢复商业默认</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Button 4: 保存配置 */}
                  <button
                    type="button"
                    onClick={handleSaveModelConfig}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                    title="保存修改后的模型参数并写入持久化存储"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>保存配置</span>
                  </button>

                  {/* Button 5: 保存并立即启动监控 */}
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveModelConfig();
                      if (!draftParams.enabled) {
                        await handleToggleModelEnabled(selectedModelType, true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                    title="保存参数并立即启动该模型的监控扫描"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>保存并启动监控</span>
                  </button>

                  {/* Button 6: 取消修改 */}
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300 transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" />
                    <span>取消修改</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Parameters Interactive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-center">
            {/* 1. Universe Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-700 shrink-0 font-bold w-16">股票池:</span>
              {isEditing ? (
                <select
                  value={draftParams.universe}
                  onChange={e => setDraftParams({ ...draftParams, universe: e.target.value as any })}
                  className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs flex-1 cursor-pointer"
                >
                  <option value="SP500">标普 500 (SP500 核心蓝筹)</option>
                  <option value="NDX100">纳斯达克 100 (科技成长龙头)</option>
                  <option value="ALL">全美股高流动性池</option>
                  <option value="WATCHLIST">我的自选监控池</option>
                </select>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-bold flex-1 shadow-2xs">
                  {currentModelConfig.universe === 'SP500' && '标普 500 (SP500)'}
                  {currentModelConfig.universe === 'NDX100' && '纳斯达克 100 (NDX100)'}
                  {currentModelConfig.universe === 'ALL' && '全美股高流动性池'}
                  {currentModelConfig.universe === 'WATCHLIST' && '我的自选监控池'}
                </div>
              )}
            </div>

            {/* 2. Lookback Window */}
            <div className="flex items-center gap-2">
              <span className="text-slate-700 shrink-0 font-bold w-16">统计窗口:</span>
              <div className="flex items-center gap-1 flex-1 flex-wrap">
                {(['15m', '30m', '1h', '2h', '4h', '1d'] as const).map(win => {
                  const isSelected = activeParamsDisplay.lookbackWindow === win;
                  return (
                    <button
                      key={win}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => setDraftParams({ ...draftParams, lookbackWindow: win })}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        isSelected
                          ? 'bg-rose-600 text-white font-black shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      } ${!isEditing ? 'cursor-default opacity-90' : 'cursor-pointer hover:border-amber-400'}`}
                    >
                      {win}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Min Drop Percent */}
            <div className="flex items-center gap-2">
              <span className="text-slate-700 shrink-0 font-bold w-16">跌幅门槛:</span>
              <div className="flex items-center gap-1 flex-1 flex-wrap">
                {([1.0, 1.8, 2.0, 2.5, 4.0, 6.0] as const).map(drop => {
                  const isSelected = activeParamsDisplay.minDropPercent === drop;
                  return (
                    <button
                      key={drop}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => setDraftParams({ ...draftParams, minDropPercent: drop })}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-white font-black shadow-2xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      } ${!isEditing ? 'cursor-default opacity-90' : 'cursor-pointer hover:border-amber-400'}`}
                    >
                      ≥{drop}%
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Target Gain, Stop Loss Pair & Single Scan Action */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 font-mono text-xs">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-700 font-bold">目标+</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="10.0"
                      value={draftParams.targetGainPercent}
                      onChange={e => setDraftParams({ ...draftParams, targetGainPercent: Number(e.target.value) })}
                      className="w-12 bg-white border border-emerald-300 rounded px-1 py-0.5 text-center font-bold text-emerald-800 text-xs"
                    />
                    <span className="text-emerald-700">%</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-600 font-bold">止损-</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="5.0"
                      value={draftParams.stopLossPercent}
                      onChange={e => setDraftParams({ ...draftParams, stopLossPercent: Number(e.target.value) })}
                      className="w-12 bg-white border border-rose-300 rounded px-1 py-0.5 text-center font-bold text-rose-800 text-xs"
                    />
                    <span className="text-rose-600">%</span>
                  </div>
                ) : (
                  <>
                    <span className="text-emerald-700 font-bold">目标+{currentModelConfig.targetGainPercent}%</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-600 font-bold">止损-{currentModelConfig.stopLossPercent}%</span>
                  </>
                )}
              </div>

              {/* Dedicated Scan Button for This Model */}
              <button
                type="button"
                onClick={() => executeScan({
                  ...activeParamsDisplay,
                  modelType: selectedModelType
                })}
                disabled={isLoading}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer shrink-0"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>扫描中...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>立即扫描</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 4. Active Rules Summary Bar */}
        <div className="flex items-center justify-between gap-2 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-xs flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Activity className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="font-extrabold text-slate-800 shrink-0">当前展示模型配置:</span>
            <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
              <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-rose-200 text-rose-900 font-bold">
                模型: {activeModelMeta?.nameZh || selectedModelType}
              </span>
              <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-slate-200 font-mono">
                窗口: {currentModelConfig.lookbackWindow} (跌幅 ≥ {currentModelConfig.minDropPercent}%)
              </span>
              <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-emerald-200 text-emerald-800 font-bold font-mono">
                目标反弹: +{currentModelConfig.targetGainPercent}%
              </span>
              <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-rose-200 text-rose-800 font-bold font-mono">
                硬止损: -{currentModelConfig.stopLossPercent}% (盈亏比 1:{(currentModelConfig.targetGainPercent / currentModelConfig.stopLossPercent).toFixed(2)})
              </span>
              <span className={`px-2 py-0.5 rounded shadow-2xs border font-bold ${
                currentModelConfig.enabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                状态: {currentModelConfig.enabled ? '监控运行中 ⚡' : '已暂停 ⏸️'}
              </span>
            </div>
          </div>

          {lastScannedAt && (
            <span className="text-[10px] font-mono text-slate-400">
              (已于 {lastScannedAt} 全模计算 · 捕获 {candidates.length} 标的)
            </span>
          )}
        </div>
      </div>

      {/* 5. Candidates Matrix Feed & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingDown className="w-4 h-4 text-rose-600" />
          <span className="font-extrabold text-sm text-slate-900">
            今日捕获暴跌反弹机会池 ({filteredCandidates.length} / {candidates.length} 席)
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">
            卖方衰竭 · 右侧买入推荐
          </span>
          <button
            type="button"
            onClick={() => executeScan()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white shadow-2xs hover:shadow-xs active:scale-95 transition disabled:opacity-50 cursor-pointer ml-1"
            title="立即执行全美股暴跌反弹多模型扫描"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? '扫描中...' : '立即扫描'}</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Ticker Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索标的/板块..."
              className="pl-8 pr-6 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500 w-32 sm:w-40 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 二次分类筛选: 板块筛选 (美股行业分类) */}
          <div className="flex items-center gap-1">
            <div className="relative flex items-center">
              <Layers className={`w-3.5 h-3.5 absolute left-2 pointer-events-none ${
                selectedSectorFilter !== 'ALL' ? 'text-indigo-600' : 'text-slate-400'
              }`} />
              <select
                value={selectedSectorFilter}
                onChange={e => setSelectedSectorFilter(e.target.value)}
                className={`pl-6.5 pr-2 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs focus:outline-none ${
                  selectedSectorFilter !== 'ALL'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 ring-1 ring-indigo-200'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
                title="按美股所属板块进行二次分类筛选"
              >
                <option value="ALL">全部板块 ({candidates.length})</option>
                {availableSectorsWithCount.map(sec => (
                  <option key={sec.sectorZh} value={sec.sectorZh}>
                    {sec.sectorZh} ({sec.count})
                  </option>
                ))}
              </select>
            </div>
            {selectedSectorFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedSectorFilter('ALL')}
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="清空板块筛选，恢复全部板块"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter by Model & Alerted Only */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {recentAlertsMap.size > 0 && (
              <button
                type="button"
                onClick={() => setShowOnlyAlerted(!showOnlyAlerted)}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 shadow-2xs shrink-0 ${
                  showOnlyAlerted
                    ? 'bg-rose-600 text-white ring-2 ring-rose-400/50'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                }`}
                title="点击仅查看刚刚触发预警的标的"
              >
                <Bell className="w-3 h-3 animate-pulse" />
                <span>刚刚预警 ({recentAlertsMap.size})</span>
              </button>
            )}

            {(['ALL', 'CONNORS_RSI', 'WYCKOFF_CLIMAX', 'VWAP_ZSCORE', 'BOLLINGER_STOCH', 'CUSTOM'] as const).map(f => {
              const labelMap: Record<string, string> = {
                ALL: '全部机会',
                CONNORS_RSI: 'Connors',
                WYCKOFF_CLIMAX: 'Wyckoff',
                VWAP_ZSCORE: 'VWAP偏离',
                BOLLINGER_STOCH: '布林刺透',
                CUSTOM: '自定义'
              };
              const isSel = filterModel === f && !showOnlyAlerted;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFilterModel(f);
                    setShowOnlyAlerted(false);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
                    isSel
                      ? 'bg-slate-900 text-white font-bold shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {labelMap[f]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Latest Alert Jump Bar (Desktop) */}
      {latestAlertItem && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-400/70 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white">
                  刚刚预警 · {latestAlertItem.timeStr}
                </span>
                <span className="font-black text-sm text-slate-900">{latestAlertItem.ticker}</span>
                <span className="text-xs text-slate-600 font-medium truncate">{latestAlertItem.name}</span>
                <span className="text-xs font-mono font-extrabold text-rose-600">
                  ${(latestAlertItem.price ?? 0).toFixed(2)} (-{latestAlertItem.dropPercent ?? 0}%)
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                  {latestAlertItem.modelNameZh}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                建议现价 <strong>${(latestAlertItem.price ?? 0).toFixed(2)}</strong> 买入 · 目标价 <strong>${(latestAlertItem.targetPrice ?? 0).toFixed(2)}</strong> (+{latestAlertItem.targetGainPercent ?? 0}%) · 止损 -{latestAlertItem.stopLossPercent ?? 0}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => focusAndScrollToTicker(latestAlertItem.ticker)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>🎯 立即定位此卡片</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectStock(latestAlertItem.ticker)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer"
            >
              查看K线
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-2.5 text-slate-400 text-xs font-mono">
          <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
          <span className="text-slate-600 font-bold">
            正在并发巡检已启用的暴跌反弹模型...
          </span>
          <span className="text-[11px] text-slate-400">
            执行 Connors RSI(2) 极值、Wyckoff 抛售高潮、VWAP 极端偏离与布林刺透多因子计算
          </span>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="py-16 px-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2.5">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-sm font-bold text-slate-800">
            {selectedSectorFilter !== 'ALL' || filterModel !== 'ALL' || searchQuery.trim()
              ? `当前筛选条件 (板块: ${selectedSectorFilter !== 'ALL' ? selectedSectorFilter : '全部'} · 模型: ${filterModel !== 'ALL' ? filterModel : '全部'}) 下暂无匹配标的`
              : '当前监控时段内暂无严重暴跌且卖方衰竭的标的'}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {selectedSectorFilter !== 'ALL' || filterModel !== 'ALL' || searchQuery.trim()
              ? `总机会池中现有 ${candidates.length} 只标的，您可以一键重置筛选条件或放宽阈值。`
              : `说明当前市场环境较为稳健，或者急跌股票尚未出现企稳买盘。系统后台每 ${config.intervalMinutes} 分钟将自动巡检，发现机会将即刻弹窗提醒！`}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            {(selectedSectorFilter !== 'ALL' || filterModel !== 'ALL' || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSectorFilter('ALL');
                  setFilterModel('ALL');
                  setSearchQuery('');
                  setShowOnlyAlerted(false);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置所有筛选 (恢复全部 {candidates.length} 席)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const relaxed = { ...currentModelConfig, minDropPercent: 1.0, universe: 'ALL' as any, modelType: selectedModelType };
                executeScan(relaxed);
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>一键放宽至 ≥1.0% 跌幅全市场扫描</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredCandidates.map((cand, idx) => {
            const isWatchlisted = watchlistTickers.includes(cand.ticker);
            const rank = idx + 1;
            const isFocused = focusedTicker === cand.ticker;
            const alertInfo = recentAlertsMap.get(cand.ticker);

            return (
              <div
                key={`${cand.ticker}-${cand.modelType}-${idx}`}
                id={`rebound-card-${cand.ticker}`}
                onClick={() => onSelectStock(cand.ticker)}
                className={`bg-white hover:bg-slate-50/50 rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between gap-3 group relative cursor-pointer ${
                  isFocused
                    ? 'border-rose-500 ring-4 ring-rose-500/70 shadow-2xl shadow-rose-500/40 scale-[1.02] bg-gradient-to-b from-rose-50/40 via-white to-white z-20 animate-pulse'
                    : alertInfo
                    ? 'border-amber-400 shadow-md ring-2 ring-amber-300/40 bg-amber-50/20'
                    : 'border-slate-200/80 hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* 🔔 刚刚触发预警横幅 (Focused Pulse Badge) */}
                {isFocused && (
                  <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center justify-between -mt-1 mb-0.5 animate-bounce">
                    <span className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5" />
                      <span>刚刚预警触发 · 抄底买入标的</span>
                    </span>
                    <span className="font-mono text-[10px] bg-black/25 px-1.5 py-0.5 rounded text-white">
                      {alertInfo?.timeStr || '刚刚'}
                    </span>
                  </div>
                )}

                {/* ⚡ 盘中预警历史微标 (Recent Alert Indicator) */}
                {!isFocused && alertInfo && (
                  <div className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center justify-between -mt-1 mb-0.5">
                    <span className="flex items-center gap-1">
                      <Bell className="w-3 h-3 text-amber-700" />
                      <span>盘中触发预警标的</span>
                    </span>
                    <span className="font-mono text-amber-800">
                      {alertInfo.timeStr}
                    </span>
                  </div>
                )}
                {/* Row 1: Header - Rank, Logo, Ticker, Exchange & Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md shrink-0 shadow-2xs ${
                        rank <= 3
                          ? 'bg-rose-600 text-white'
                          : rank <= 10
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      #{rank}
                    </span>

                    <StockLogo ticker={cand.ticker} name={cand.name} size="sm" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 group-hover:text-rose-600 transition-colors text-sm tracking-tight truncate">
                          {cand.ticker}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                          {cand.exchange}
                        </span>
                        <StockSectorBadge ticker={cand.ticker} sector={cand.sector} size="xs" />
                      </div>
                      <span className="text-[11px] text-slate-500 truncate block leading-tight font-medium">
                        {cand.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(cand.ticker);
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isWatchlisted
                          ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                          : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title={isWatchlisted ? '已加入自选' : '加入自选'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAlertModal(cand.ticker, cand.name);
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="设置暴跌反弹预警"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Model Attribution Badge & P1 Adaptive Pill */}
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-rose-700 bg-rose-50 border border-rose-200/70 px-2 py-0.5 rounded-md font-bold truncate">
                      {cand.modelNameZh}
                    </span>
                    {cand.adaptiveAdjusted && (
                      <span className="font-mono text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0" title={cand.adaptiveNote}>
                        防飞刀自适应
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-400 text-[10px] shrink-0">
                    窗口 {cand.dropDurationMinutes}m
                  </span>
                </div>

                {/* Row 2: Price & Plunge Magnitude Drop Badge */}
                <div className="flex items-baseline justify-between pt-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono font-black text-slate-900 text-lg tracking-tight tabular-nums">
                      ${(cand.price ?? 0).toFixed(2)}
                    </span>
                    <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg text-rose-700 bg-rose-50 border border-rose-200">
                      日内 {(cand.changePercent ?? cand.dropPercent ?? 0) >= 0 ? '+' : ''}{(cand.changePercent ?? cand.dropPercent ?? 0).toFixed(2)}%
                    </span>
                  </div>

                  {/* Drop Badge */}
                  <div className="flex items-center gap-1">
                    <span
                      className="font-mono font-black px-2 py-0.5 rounded-lg text-xs bg-rose-600 text-white shadow-2xs"
                      title={`区间急跌 ${cand.dropPercent}% (统计时长 ${cand.dropDurationMinutes} 分钟)`}
                    >
                      急跌 {cand.dropPercent}%
                    </span>
                  </div>
                </div>

                {/* Row 3: Exhaustion Signals Block */}
                <div className="bg-amber-50/60 rounded-xl p-2.5 space-y-1.5 border border-amber-200/70">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-amber-950 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-amber-600" />
                      <span>卖方衰竭判定信号</span>
                    </span>
                    <span className="font-mono font-black text-xs text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                      胜率 {cand.reboundScore ?? 85}分
                    </span>
                  </div>

                  <div className="space-y-1">
                    {(Array.isArray(cand.exhaustionSignals) ? cand.exhaustionSignals : []).map((sig, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-1.5 text-[11px] text-amber-900 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{sig}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 4: Trading Action Plan (Entry, Target Profit & Stop Loss) */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">买入参考现价:</span>
                    <span className="font-bold text-slate-900">${(cand.entryPrice ?? cand.price ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 font-bold">目标止盈 (+{cand.targetGainPercent}%):</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      ${(cand.targetPrice ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-rose-700 font-bold">硬性止损 (-{cand.stopLossPercent}%):</span>
                    <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                      ${(cand.stopLossPrice ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* P2: Level 2 OBI Microstructure Badge */}
                {cand.obiAnalysis && (
                  <div className="flex items-center justify-between text-[10px] font-mono px-2.5 py-1 rounded-lg bg-indigo-50/70 border border-indigo-200/60 text-indigo-900">
                    <span className="flex items-center gap-1 font-bold">
                      <Layers className="w-3 h-3 text-indigo-600" />
                      <span>L2 盘口 OBI:</span>
                    </span>
                    <span className="font-bold">
                      {((cand.obiAnalysis.obi ?? 0.42) * 100 >= 0 ? '+' : '')}{((cand.obiAnalysis.obi ?? 0.42) * 100).toFixed(0)}% ({cand.obiAnalysis.regimeLabel || '主力承接'})
                    </span>
                  </div>
                )}

                {/* P2: One-Click Bracket Order Trigger Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrderCandidate(cand);
                    setIsOrderModalOpen(true);
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-98 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>⚡ 一键预埋 Bracket (OCO) 复合单</span>
                </button>

                {/* Row 5: Footer */}
                <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-100 text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-700 font-bold">{getSectorZh(cand.ticker, cand.sector)}</span>
                    <span>·</span>
                    <span>量比 {cand.rvol.toFixed(1)}x</span>
                  </div>
                  <span className="text-indigo-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>详情分析</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>
      )}

      {/* Google M3: Rebound Parameter Modal Bottom Sheet */}
      <ReboundParameterSheet
        isOpen={isMobileParamSheetOpen}
        onClose={() => setIsMobileParamSheetOpen(false)}
        selectedModelType={selectedModelType}
        onSelectModelType={handleSelectModelTab}
        modelsConfig={config.modelsConfig || COMMERCIAL_DEFAULT_MODELS_CONFIG}
        globalEnabled={config.enabled}
        onToggleGlobalEnabled={async (en) => {
          await handleUpdateGlobalConfig({ enabled: en });
          if (en) {
            executeScan();
          }
        }}
        onSaveModelConfig={async (modelType, cfg) => {
          const res = await apiClient.updateReboundModelConfig(modelType, cfg);
          if (res.success) {
            setConfig(prev => ({
              ...prev,
              modelsConfig: {
                ...prev.modelsConfig,
                [modelType]: cfg
              }
            }));
            return true;
          }
          return false;
        }}
        onResetToCommercialDefaults={(_modelType) => {
          handleResetToCommercialDefaults();
        }}
        onExecuteScan={async (customParams) => {
          await executeScan(customParams);
        }}
        candidatesCount={candidates.length}
      />

      {/* 暴跌反弹分析与建议专属 M3 抽屉 (图2核心规范 - 点击股票卡片弹出) */}
      <ReboundCandidateDetailSheet
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedDetailCandidate(null);
        }}
        candidate={selectedDetailCandidate}
        onOpenBracketOrder={(cand) => {
          setSelectedOrderCandidate(cand);
          setIsOrderModalOpen(true);
        }}
        onSelectStock={onSelectStock}
        isWatchlisted={selectedDetailCandidate ? watchlistTickers.includes(selectedDetailCandidate.ticker) : false}
        onToggleWatchlist={onToggleWatchlist}
        onOpenAlertModal={(ticker, name) => onOpenAlertModal(ticker, name)}
      />

      {/* Google M3: Extended FAB for Thumb Zone Ergonomics (移动端常驻调参入口) */}
      {isMobile && (
        <M3ExtendedFAB
          icon={<SlidersHorizontal className="w-5 h-5 stroke-[2.5]" />}
          label="调整参数"
          onClick={() => setIsMobileParamSheetOpen(true)}
          badge={`${activeModelsCount}模型`}
          color="primary"
        />
      )}

      {/* P2: Bracket Order Placement Modal */}
      <BracketOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setSelectedOrderCandidate(null);
        }}
        data={selectedOrderCandidate ? {
          ticker: selectedOrderCandidate.ticker,
          name: selectedOrderCandidate.name,
          currentPrice: selectedOrderCandidate.price,
          targetPrice: selectedOrderCandidate.targetPrice,
          stopLossPrice: selectedOrderCandidate.stopLossPrice,
          targetGainPercent: selectedOrderCandidate.targetGainPercent,
          stopLossPercent: selectedOrderCandidate.stopLossPercent,
          strategySource: `FLASH_REBOUND:${selectedOrderCandidate.modelType}`,
          obiAnalysis: selectedOrderCandidate.obiAnalysis
        } : null}
      />
    </div>
  );
}
