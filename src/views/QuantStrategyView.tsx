import { useState, useEffect, useMemo } from 'react';
import {
  StrategyDefinition,
  IndicatorDefinition,
  SavedStrategy,
  Timeframe,
  ExtendedScreenerItem,
  StrategyModeType,
  StrategyModeConfig,
  FactorDefinition
} from '../types.ts';
import { apiClient } from '../services/apiClient.ts';
import { MOCK_QUANT_INDICATORS } from '../mock/quantStrategiesMock.ts';
import { strategyEngine, validateStrategySchema } from '../engine/strategyEngine.ts';
import { resolveStrategyDisplayMetrics, getAuthoritativeBenchmark } from '../engine/authoritativeBenchmarks.ts';
import { StrategyLibrarySidebar, computeStrategyScore } from '../components/quant/StrategyLibrarySidebar.tsx';
import { StrategyWorkspaceMain } from '../components/quant/StrategyWorkspaceMain.tsx';
import { IndicatorWorkspaceView } from '../components/quant/IndicatorWorkspaceView.tsx';
import { CreateStrategyAlertModal } from '../components/quant/CreateStrategyAlertModal.tsx';
import { FactorBuilderView } from '../components/quant/FactorBuilderView.tsx';
import { GlobalQuantSearchModal } from '../components/quant/GlobalQuantSearchModal.tsx';
import { StrategyCompareModal } from '../components/quant/StrategyCompareModal.tsx';
import { StrategyCombinerModal } from '../components/quant/StrategyCombinerModal.tsx';
import { useResponsive } from '../hooks/useResponsive.ts';
import { BottomSheetModal } from '../components/common/BottomSheetModal.tsx';
import { PerformancePanel } from '../components/quant/PerformancePanel.tsx';
import {
  Sliders,
  CheckCircle,
  X,
  Bookmark,
  Sparkles,
  FolderPlus,
  Play,
  RotateCcw,
  Check,
  AlertCircle,
  Calculator,
  BookOpen,
  Layers,
  Search,
  ChevronDown,
  ChevronRight,
  Star,
  Bell,
  BarChart3,
  Clock,
  ShieldCheck,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface QuantStrategyViewProps {
  onSelectStock?: (ticker: string) => void;
  onOpenAlertModal?: (ticker: string, stockName?: string, currentRsi?: number) => void;
  onToggleWatchlist?: (ticker: string) => void;
  watchlistTickers?: string[];
}

export function QuantStrategyView({
  onSelectStock,
  onOpenAlertModal,
  onToggleWatchlist,
  watchlistTickers = []
}: QuantStrategyViewProps) {
  // Mode switcher: 'STRATEGIES' | 'FACTORS' | 'INDICATORS'
  const [quantMode, setQuantMode] = useState<'STRATEGIES' | 'FACTORS' | 'INDICATORS'>('STRATEGIES');

  // Strategy Engine state
  const [strategies, setStrategies] = useState<StrategyDefinition[]>([]);
  const [indicators] = useState<IndicatorDefinition[]>(MOCK_QUANT_INDICATORS);
  const [savedStrategies, setSavedStrategies] = useState<SavedStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyDefinition | null>(null);
  const [selectedMode, setSelectedMode] = useState<StrategyModeType>('swing');

  // Execution & UI state
  const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>('1D');
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [loadToastMessage, setLoadToastMessage] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<ExtendedScreenerItem[]>([]);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const [scanDiagnostics, setScanDiagnostics] = useState<{ scannedCount: number; evaluatedCount: number; dataErrorCount: number; dataErrorSamples: Array<{ ticker: string; message: string }> } | null>(null);
  const [lastScanInfo, setLastScanInfo] = useState<{
    timestamp: string;
    dataSource: string;
    matchedCount: number;
    evaluatedCount: number;
    scannedCount: number;
    executionTimeMs: number;
    strategyName: string;
  } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Mobile responsive state
  const { isMobile } = useResponsive();
  const [mobileTab, setMobileTab] = useState<'SCREENER' | 'BACKTEST' | 'PARAMS' | 'LOGIC'>('SCREENER');
  const [isMobileStrategySelectorOpen, setIsMobileStrategySelectorOpen] = useState(false);
  const [strategySearchQuery, setStrategySearchQuery] = useState('');

  // Modals
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveStrategyName, setSaveStrategyName] = useState('');
  const [saveStrategyDesc, setSaveStrategyDesc] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [isCreateStrategyAlertOpen, setIsCreateStrategyAlertOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isCombinerModalOpen, setIsCombinerModalOpen] = useState(false);
  const [factorDefs, setFactorDefs] = useState<FactorDefinition[]>([]);

  // 1. Initial Load of Strategies via Strategy Engine (Sorted by Composite Win Rate & Authority Score)
  useEffect(() => {
    const all = [...strategyEngine.getAllStrategies()].sort(
      (a, b) => computeStrategyScore(b).compositeScore - computeStrategyScore(a).compositeScore
    );
    setStrategies(all);
    if (all.length > 0) {
      const first = all[0];
      const defaultMode = first.defaultMode || 'swing';
      setSelectedMode(defaultMode);
      const modeConfig = first.modes?.[defaultMode];
      const initialParams = modeConfig ? { ...modeConfig.parameters } : {};
      setParameterValues(initialParams);
      setCurrentTimeframe(modeConfig?.defaultTimeframe || (first.defaultTimeframes?.[0] as Timeframe) || '1D');
      const prepared = strategyEngine.modifyParameters(first, initialParams, defaultMode);
      setSelectedStrategy(prepared);
    }
  }, []);

  // 2. Select Strategy handler (Loading strategy via StrategyEngine)
  const handleSelectStrategy = (st: StrategyDefinition) => {
    const loaded = strategyEngine.loadStrategy(st.id) || st;
    const nativeMode = loaded.defaultMode || 'swing';
    setSelectedMode(nativeMode);

    const modeConfig = loaded.modes?.[nativeMode];
    const initialParams = modeConfig ? { ...modeConfig.parameters } : {};
    setParameterValues(initialParams);
    setCurrentTimeframe(modeConfig?.defaultTimeframe || (loaded.defaultTimeframes?.[0] as Timeframe) || '1D');
    
    const updated = strategyEngine.modifyParameters(loaded, initialParams, nativeMode);
    setSelectedStrategy(updated);
    setExecutionResults([]);
    setExecutionTimeMs(null);
    setLastScanInfo(null);
  };

  const handleSelectSavedStrategy = (saved: SavedStrategy) => {
    const loaded = strategyEngine.loadStrategy(saved.id);
    if (loaded) {
      const nativeMode = loaded.defaultMode || 'swing';
      setSelectedMode(nativeMode);
      setSelectedStrategy(loaded);
      setParameterValues(saved.parameters || {});
      setExecutionResults([]);
      setLastScanInfo(null);
    }
  };

  // Switch Trading Style Mode
  const handleChangeMode = (mode: StrategyModeType, modeConfig: StrategyModeConfig) => {
    setSelectedMode(mode);
    if (modeConfig.defaultTimeframe) {
      setCurrentTimeframe(modeConfig.defaultTimeframe);
    }
    const newParams = { ...modeConfig.parameters };
    setParameterValues(newParams);

    if (selectedStrategy) {
      const updated = strategyEngine.modifyParameters(selectedStrategy, newParams, mode);
      setSelectedStrategy(updated);
    }
  };

  // 3. Parameter modification via Strategy Engine
  const handleChangeParameter = (key: string, value: any) => {
    const nextParams = {
      ...parameterValues,
      [key]: value
    };
    setParameterValues(nextParams);

    if (selectedStrategy) {
      const updated = strategyEngine.modifyParameters(selectedStrategy, nextParams, selectedMode);
      setSelectedStrategy(updated);
    }
  };

  const handleResetParameters = () => {
    if (!selectedStrategy) return;
    const modeConfig = selectedStrategy.modes?.[selectedMode];
    const initialParams = modeConfig ? { ...modeConfig.parameters } : {};
    setParameterValues(initialParams);
    const resetStrategy = strategyEngine.modifyParameters(selectedStrategy, initialParams, selectedMode);
    setSelectedStrategy(resetStrategy);
  };

  // 4. Generate screening task & execute strategy
  const handleRunStrategy = async () => {
    if (!selectedStrategy) return;
    setIsRunning(true);
    const startTime = performance.now();
    try {
      const res = await apiClient.runQuantStrategy(selectedStrategy.id, {
        parameters: parameterValues,
        timeframe: currentTimeframe,
        modeType: selectedMode
      });
      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTimeMs(elapsed);
      setExecutionResults(res.results || []);
      setScanDiagnostics({
        scannedCount: res.scannedCount ?? 0,
        evaluatedCount: res.evaluatedCount ?? 0,
        dataErrorCount: res.dataErrorCount ?? 0,
        dataErrorSamples: res.dataErrorSamples ?? []
      });
      setIsDrawerOpen(true);
      const failed = res.dataErrorCount ?? 0;
      const trigCount = res.results?.filter((r: any) => r.strategyState === 'TRIGGERED').length ?? 0;
      const nearCount = res.results?.filter((r: any) => r.strategyState === 'NEAR_TRIGGER').length ?? 0;
      const statsDetail = trigCount > 0 ? `已触发 ${trigCount}，临界 ${nearCount}` : nearCount > 0 ? `临界 ${nearCount}，形态构筑 ${res.results?.length - nearCount}` : `匹配 ${res.totalMatches ?? res.results?.length ?? 0}`;
      
      const dataSourceStr = res.dataSource
        || (res.results?.[0]?.strategyEvaluation?.signals?.find((s: string) => s.includes('来源:'))?.replace('来源: ', '') || 'Finnhub实时API');

      setLastScanInfo({
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        dataSource: dataSourceStr,
        matchedCount: res.results?.length ?? 0,
        evaluatedCount: res.evaluatedCount ?? (res.results?.length ?? 0),
        scannedCount: res.scannedCount ?? 503,
        executionTimeMs: elapsed,
        strategyName: selectedStrategy.nameZh || selectedStrategy.name || selectedStrategy.shortName
      });

      setLoadToastMessage(`策略「${selectedStrategy.shortName}」扫描完成：${statsDetail}，已评估 ${res.evaluatedCount ?? 0}/${res.scannedCount ?? 0}${failed ? `，行情失败 ${failed}` : ''}`);
      setTimeout(() => setLoadToastMessage(null), 3000);
    } catch (err) {
      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTimeMs(elapsed);
      setExecutionResults([]);
      setScanDiagnostics(null);
      setLastScanInfo(null);
      setIsDrawerOpen(true);
      setLoadToastMessage(`策略「${selectedStrategy.shortName}」扫描失败或无匹配标的`);
      setTimeout(() => setLoadToastMessage(null), 3000);
    } finally {
      setIsRunning(false);
    }
  };

  // 5. Save Strategy via Strategy Engine
  const handleSaveStrategy = () => {
    if (!saveStrategyName.trim() || !selectedStrategy) return;
    setSaveErrorMsg(null);

    const result = strategyEngine.saveStrategy({
      name: saveStrategyName.trim(),
      shortName: saveStrategyName.trim(),
      author: selectedStrategy.author,
      category: selectedStrategy.category || 'CLASSIC',
      timeframe: currentTimeframe,
      description: saveStrategyDesc.trim() || '用户基于策略引擎微调的定制策略',
      rules: selectedStrategy.rules,
      parameters: (selectedStrategy.parameters as any[]) || [],
      risk: {
        entryReference: selectedStrategy.riskFramework?.entryReference || 'Entry breakout line',
        invalidation: selectedStrategy.riskFramework?.invalidation || 'Break of stop level',
        stopLossRule: selectedStrategy.riskFramework?.stopLossRule || 'Strict 4-6% stop',
        riskWarning: selectedStrategy.riskWarning || '自建策略请注意仓位风控'
      }
    });

    if (!result.success) {
      setSaveErrorMsg(result.errors?.join('; ') || '保存策略验证失败');
      return;
    }

    if (result.saved) {
      setStrategies(strategyEngine.getAllStrategies());
      setSavedStrategies(prev => [
        {
          id: result.saved!.id,
          name: result.saved!.name,
          description: result.saved!.description,
          baseStrategyId: selectedStrategy.id,
          rules: result.saved!.rules,
          parameters: parameterValues,
          timeframes: [currentTimeframe],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ...prev
      ]);
      setIsSaveModalOpen(false);
      setSaveStrategyName('');
      setSaveStrategyDesc('');
      setLoadToastMessage(`自建策略「${result.saved.name}」已通过校验并成功保存！`);
      setTimeout(() => setLoadToastMessage(null), 3500);
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 text-slate-900 overflow-hidden relative">
      {/* Toast Notification */}
      {loadToastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-[#0f5223] text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-150">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{loadToastMessage}</span>
        </div>
      )}

      {isMobile ? (
        /* Mobile Quant Screener & Backtest Studio */
        <div
          className="flex-1 flex flex-col gap-2 w-full min-h-0 overflow-y-auto"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 52px)' }}
        >
          {/* 1. Mobile Header: Current Strategy Card & Selector Button */}
          <div className="bg-white rounded-xl p-2.5 border border-[#e0e2ec] shadow-2xs space-y-1.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#e9eef6] text-[#041e49]">
                    {selectedStrategy?.shortName || 'QUANT'}
                  </span>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    String(selectedStrategy?.evidenceLevel || '').toUpperCase().includes('A')
                      ? 'text-[#0f5223] bg-[#c4eed0]/60'
                      : 'text-[#0b57d0] bg-[#d3e3fd]/60'
                  }`}>
                    Evidence {String(selectedStrategy?.evidenceLevel || 'A').toUpperCase().replace('LEVEL_', '')}
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                    {(() => {
                      if (!selectedStrategy) return '胜率待测';
                      const s = computeStrategyScore(selectedStrategy);
                      const m = resolveStrategyDisplayMetrics(selectedStrategy, s);
                      return `${m.winRate}% 胜率 (${m.label}) · 盈亏比 ${m.payoffRatio}:1`;
                    })()}
                  </span>
                </div>
                <h1 className="text-xs font-black text-slate-900 mt-0.5 truncate">
                  {selectedStrategy?.nameZh || selectedStrategy?.name || '量化策略'}
                </h1>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileStrategySelectorOpen(true)}
                  className="px-2 py-1 rounded-lg bg-[#1a73e8] active:bg-[#1557b0] text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <span>切换策略</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="p-1 rounded-lg border border-slate-200 text-slate-600 active:bg-slate-100 cursor-pointer"
                  title="搜索模型"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Mobile 4-Segment Thumb Switcher */}
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#e9eef6] rounded-xl border border-[#e0e2ec] shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab('SCREENER')}
              className={`py-1.5 text-[10.5px] font-bold rounded-lg text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                mobileTab === 'SCREENER'
                  ? 'bg-white text-[#041e49] shadow-2xs font-black'
                  : 'text-[#444746]'
              }`}
            >
              <span>标的扫描</span>
              <span className="text-[9px] font-mono opacity-80">({executionResults.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab('BACKTEST')}
              className={`py-1.5 text-[10.5px] font-bold rounded-lg text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                mobileTab === 'BACKTEST'
                  ? 'bg-white text-[#041e49] shadow-2xs font-black'
                  : 'text-[#444746]'
              }`}
            >
              <span>历史回测</span>
              <span className="text-[9px] font-mono opacity-80">Monte Carlo</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab('PARAMS')}
              className={`py-1.5 text-[10.5px] font-bold rounded-lg text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                mobileTab === 'PARAMS'
                  ? 'bg-white text-[#041e49] shadow-2xs font-black'
                  : 'text-[#444746]'
              }`}
            >
              <span>参数调优</span>
              <span className="text-[9px] font-mono opacity-80">Params</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab('LOGIC')}
              className={`py-1.5 text-[10.5px] font-bold rounded-lg text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                mobileTab === 'LOGIC'
                  ? 'bg-white text-[#041e49] shadow-2xs font-black'
                  : 'text-[#444746]'
              }`}
            >
              <span>风控逻辑</span>
              <span className="text-[9px] font-mono opacity-80">5% Stop</span>
            </button>
          </div>

          {/* 3. Sub-Tab Content */}
          {mobileTab === 'SCREENER' && (
            <div className="space-y-2">
              {/* Top Action & Diagnostics */}
              <div className="bg-white rounded-xl p-2.5 border border-[#e0e2ec] shadow-2xs space-y-2">
                <button
                  type="button"
                  onClick={handleRunStrategy}
                  disabled={isRunning || !selectedStrategy}
                  className="w-full h-8.5 py-1 px-3 rounded-lg bg-[#1a73e8] active:bg-[#1557b0] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>美股实时量化运算中...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>扫描美股</span>
                    </>
                  )}
                </button>

                {/* 实时状态确认与诊断面板 */}
                {isRunning ? (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2 flex items-center gap-2 text-[11px] text-blue-900 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">
                        <span>正在直连 Finnhub/Massive API 扫描标的池...</span>
                      </div>
                      <div className="text-[9.5px] text-blue-700 truncate mt-0.5">
                        实时拉取美股盘口行情，计算多因子阿尔法与技术面指标
                      </div>
                    </div>
                  </div>
                ) : lastScanInfo ? (
                  <div className="bg-[#f0fbf4] border border-[#c4eed0] rounded-lg p-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1 font-bold text-[#0f5223]">
                        <CheckCircle className="w-3.5 h-3.5 fill-[#0f5223] text-white shrink-0" />
                        <span>扫描完成 ({lastScanInfo.dataSource})</span>
                      </div>
                      <span className="text-[9.5px] font-mono text-[#0f5223]/90 bg-[#c4eed0]/50 px-1 py-0.5 rounded font-bold">
                        {lastScanInfo.timestamp}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#c4eed0]/60 text-[9.5px] font-mono text-[#0f5223]">
                      <div className="bg-white/80 rounded p-1 text-center">
                        <span className="text-slate-500 block text-[8.5px]">命中标的</span>
                        <span className="font-bold text-[11px]">{lastScanInfo.matchedCount} 只</span>
                      </div>
                      <div className="bg-white/80 rounded p-1 text-center">
                        <span className="text-slate-500 block text-[8.5px]">已评估标的</span>
                        <span className="font-bold text-[11px]">{lastScanInfo.evaluatedCount}/{lastScanInfo.scannedCount}</span>
                      </div>
                      <div className="bg-white/80 rounded p-1 text-center">
                        <span className="text-slate-500 block text-[8.5px]">扫描耗时</span>
                        <span className="font-bold text-[11px]">{lastScanInfo.executionTimeMs}ms</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-0.5">
                    <span>标的池: 核心标的 503 只</span>
                    <span className="text-blue-600 font-sans font-bold">就绪，点击上方「扫描美股」</span>
                  </div>
                )}
              </div>

              {/* Results Cards List */}
              {executionResults.length === 0 ? (
                <div className="bg-white rounded-xl p-6 border border-[#e0e2ec] text-center text-slate-400 space-y-2">
                  <BookOpen className="w-7 h-7 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">暂无筛选结果</p>
                  <p className="text-[10px]">点击上方“扫描美股”按钮以运行模型</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {executionResults.map((stock, idx) => {
                    const isPositive = stock.changePercent >= 0;
                    const isWatchlisted = watchlistTickers.includes(stock.ticker);
                    const confluence = stock.confluenceScore || stock.strategyEvaluation?.confluenceScore || 90;

                    return (
                      <div
                        key={stock.ticker}
                        onClick={() => onSelectStock?.(stock.ticker)}
                        className="bg-white rounded-xl p-2.5 border border-[#e0e2ec] shadow-2xs active:bg-slate-50 transition-all cursor-pointer space-y-1.5"
                      >
                        {/* Top Row: Rank, Ticker, Exchange, State, Price & Chg */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-mono font-black ${
                              idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-500'
                            }`}>
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-black text-[13px] text-slate-900">{stock.ticker}</span>
                                <span className="text-[8.5px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">{stock.exchange || 'US'}</span>
                              </div>
                              <span className="text-[9.5px] text-slate-500 truncate block max-w-[120px]">{stock.name}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[13px] font-mono font-black text-slate-900">${stock.price?.toFixed(2)}</div>
                            <span className={`inline-block font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {isPositive ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: State Pill, RSI Pill, Confluence */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              stock.strategyState === 'TRIGGERED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : stock.strategyState === 'NEAR_TRIGGER'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {stock.strategyState === 'TRIGGERED' ? '● 触发买点' : stock.strategyState === 'NEAR_TRIGGER' ? '● 临界触发' : '○ 形态构筑'}
                            </span>

                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              stock.rsi <= 30
                                ? 'bg-emerald-100 text-emerald-800'
                                : stock.rsi >= 70
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              RSI {stock.rsi?.toFixed(1) || '50.0'}
                            </span>
                          </div>

                          <span className="text-[9.5px] font-mono font-bold text-[#1a73e8]">
                            {confluence}% 因子共振
                          </span>
                        </div>

                        {/* Matching Rationale Pill */}
                        {stock.whyMatched?.summary && (
                          <div className="text-[10px] text-slate-600 bg-slate-50/90 rounded-lg p-1.5 border border-slate-100 leading-snug font-sans">
                            {stock.whyMatched.summary}
                          </div>
                        )}

                        {/* Bottom Row: Actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100/60" onClick={e => e.stopPropagation()}>
                          <span className="text-[9px] text-slate-400">点击查看全息详情</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onToggleWatchlist?.(stock.ticker)}
                              className={`p-1 rounded-lg border text-[10px] flex items-center gap-1 cursor-pointer ${
                                isWatchlisted ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <Star className={`w-3 h-3 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
                              <span>{isWatchlisted ? '已自选' : '加自选'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenAlertModal?.(stock.ticker, stock.name, stock.rsi)}
                              className="p-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <Bell className="w-3 h-3" />
                              <span>设预警</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: BACKTEST */}
          {mobileTab === 'BACKTEST' && (
            <div className="bg-white rounded-2xl border border-[#e0e2ec] shadow-2xs overflow-hidden">
              <PerformancePanel
                strategy={selectedStrategy}
                currentTimeframe={currentTimeframe}
                parameterValues={parameterValues}
              />
            </div>
          )}

          {/* Tab 3: PARAMS */}
          {mobileTab === 'PARAMS' && selectedStrategy && (
            <div className="bg-white rounded-2xl p-4 border border-[#e0e2ec] shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">交易风格与周期</span>
                <button
                  type="button"
                  onClick={handleResetParameters}
                  className="text-[11px] text-blue-600 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置默认参数</span>
                </button>
              </div>

              {/* Trading Style Pills */}
              <div className="grid grid-cols-3 gap-2">
                {(['short_term', 'swing', 'position'] as StrategyModeType[]).map(mode => {
                  const cfg = selectedStrategy.modes?.[mode];
                  const isSelected = selectedMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => cfg && handleChangeMode(mode, cfg)}
                      className={`py-2 px-2 rounded-xl text-center border text-xs font-bold cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>{mode === 'short_term' ? '超短线' : mode === 'swing' ? '波段稳健' : '趋势长线'}</span>
                    </button>
                  );
                })}
              </div>

              {/* Timeframe Selector */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500">K线监控周期</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['10m', '30m', '1h', '4h', '1D', '1W'] as Timeframe[]).map(tf => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setCurrentTimeframe(tf)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                        currentTimeframe === tf
                          ? 'bg-[#041e49] text-white border-[#041e49]'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Param Inputs */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800">核心量化指标参数</span>
                {Object.entries(parameterValues).map(([key, val]) => (
                  <div key={key} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-700">{key}</span>
                      <span className="font-mono font-black text-blue-600">{val}</span>
                    </div>
                    {typeof val === 'number' && (
                      <input
                        type="range"
                        min={0}
                        max={Math.max(100, val * 2)}
                        step={val <= 5 ? 0.1 : 1}
                        value={val}
                        onChange={e => handleChangeParameter(key, parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Save Custom Button */}
              <button
                type="button"
                onClick={() => {
                  setSaveStrategyName(`${selectedStrategy?.shortName} - 定制版`);
                  setSaveErrorMsg(null);
                  setIsSaveModalOpen(true);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Bookmark className="w-4 h-4" />
                <span>保存为自定义策略</span>
              </button>
            </div>
          )}

          {/* Tab 4: LOGIC */}
          {mobileTab === 'LOGIC' && selectedStrategy && (
            <div className="bg-white rounded-2xl p-4 border border-[#e0e2ec] shadow-2xs space-y-4 text-xs">
              <div className="space-y-1.5">
                <span className="font-bold text-slate-900 block text-sm">模型设计理念</span>
                <p className="text-slate-600 leading-relaxed">{selectedStrategy.description}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-900 block">入场与失效规则</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono">入场信号</span>
                  <p className="font-bold text-slate-800">{selectedStrategy.riskFramework?.entryReference || '满足策略多因子共振条件'}</p>
                  <div className="text-rose-600 text-[11px] pt-1">
                    失效判定: {selectedStrategy.riskFramework?.invalidation || '回踩跌破防守线'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-900 block flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                  <span>5% 硬止损风控框架约束</span>
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  依据工业级量化风控准则，不论策略计算的理论止损为何，系统均施加 5.0% 最大硬止损封顶拦截，严格防范黑天鹅巨幅下挫。
                </p>
              </div>
            </div>
          )}

          {/* Mobile Strategy Selector BottomSheet */}
          <BottomSheetModal
            isOpen={isMobileStrategySelectorOpen}
            onClose={() => setIsMobileStrategySelectorOpen(false)}
            title="选择量化模型策略"
            subtitle={`全美股共 ${strategies.length} 套核心量化模型`}
            snapPoint="full"
          >
            <div className="p-3 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={strategySearchQuery}
                  onChange={e => setStrategySearchQuery(e.target.value)}
                  placeholder="搜索模型名称或作者..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-blue-500"
                />
              </div>

              {/* Strategy List */}
              <div className="space-y-2">
                {strategies
                  .filter(st => {
                    if (!strategySearchQuery.trim()) return true;
                    const q = strategySearchQuery.toLowerCase();
                    return st.name.toLowerCase().includes(q) || (st.nameZh && st.nameZh.toLowerCase().includes(q)) || (st.author && st.author.toLowerCase().includes(q));
                  })
                  .map(st => {
                    const isSelected = selectedStrategy?.id === st.id;
                    const score = computeStrategyScore(st);
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          handleSelectStrategy(st);
                          setIsMobileStrategySelectorOpen(false);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                            : 'bg-white border-slate-200 active:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <span className="font-black text-xs text-slate-900 truncate">{st.nameZh || st.name}</span>
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">{st.shortName}</span>
                          </div>
                          {(() => {
                            const m = resolveStrategyDisplayMetrics(st, score);
                            return (
                              <div className="text-right shrink-0">
                                <div className="text-xs font-mono font-black text-[#0b57d0]">
                                  {m.winRate}% 胜率
                                </div>
                                <div className="text-[9px] font-mono text-slate-400">
                                  盈亏比 {m.payoffRatio}:1
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate max-w-[180px]">作者: {st.author}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold">
                              {st.evidenceLevel ? `Tier ${String(st.evidenceLevel).replace('LEVEL_', '')}` : 'A级'}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-bold">
                              {st.holdingPeriodLabel || '波段'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </BottomSheetModal>
        </div>
      ) : (
        /* Desktop Mode (100% Zero Regression) */
        <>
          {/* Top Filter & Tools Control Bar (Google M3 Style) */}
          <div className="p-2.5 bg-white rounded-2xl border border-[#e0e2ec] flex items-center justify-between shrink-0 select-none shadow-2xs">
            {/* Left: Google M3 Segmented Tabs */}
            <div className="flex items-center gap-1 bg-[#e9eef6] p-1 rounded-xl border border-[#e0e2ec]">
              <button
                type="button"
                onClick={() => setQuantMode('STRATEGIES')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  quantMode === 'STRATEGIES'
                    ? 'bg-white text-[#041e49] font-bold shadow-2xs'
                    : 'text-[#444746] hover:text-[#1f1f1f]'
                }`}
              >
                策略模型选股 (Strategies)
              </button>

              <button
                type="button"
                onClick={() => setQuantMode('FACTORS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  quantMode === 'FACTORS'
                    ? 'bg-white text-[#041e49] font-bold shadow-2xs'
                    : 'text-[#444746] hover:text-[#1f1f1f]'
                }`}
              >
                多因子库 (Factors)
              </button>

              <button
                type="button"
                onClick={() => setQuantMode('INDICATORS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  quantMode === 'INDICATORS'
                    ? 'bg-white text-[#041e49] font-bold shadow-2xs'
                    : 'text-[#444746] hover:text-[#1f1f1f]'
                }`}
              >
                指标参数 (Indicators)
              </button>
            </div>

            {/* Right: Google M3 Tools Toolbar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-[#f0f4f9] border border-[#e0e2ec] rounded-full text-xs font-medium text-[#444746] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Search className="w-3.5 h-3.5 text-[#0b57d0]" />
                <span className="hidden sm:inline">搜索模型</span>
                <span className="text-[10px] text-[#747775] bg-[#f0f4f9] px-1.5 py-0.2 rounded font-mono border border-[#e0e2ec]">Ctrl+K</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="px-3 py-1.5 hover:bg-[#f0f4f9] bg-white text-[#444746] rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-[#e0e2ec] shadow-2xs"
                title="策略多维对比"
              >
                <Layers className="w-3.5 h-3.5 text-[#0b57d0]" />
                <span className="hidden md:inline">策略对比</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCombinerModalOpen(true)}
                className="px-3 py-1.5 hover:bg-[#f0f4f9] bg-white text-[#444746] rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-[#e0e2ec] shadow-2xs"
                title="组合策略生成"
              >
                <Sliders className="w-3.5 h-3.5 text-[#0f5223]" />
                <span className="hidden md:inline">组合策略</span>
              </button>

              <div className="h-4 w-px bg-[#e0e2ec] mx-1 hidden sm:block" />

              <span className="text-[11px] font-mono text-[#444746] bg-[#f0f4f9] px-3 py-1 rounded-full border border-[#e0e2ec] font-semibold hidden sm:inline">
                {strategies.length} 模型在库
              </span>
            </div>
          </div>

          {/* Main Mode View */}
          {quantMode === 'FACTORS' ? (
            <div className="flex-1 bg-white rounded-2xl border border-[#e0e2ec] shadow-sm overflow-hidden min-h-0 p-4">
              <FactorBuilderView />
            </div>
          ) : quantMode === 'INDICATORS' ? (
            <div className="flex-1 bg-white rounded-2xl border border-[#e0e2ec] shadow-sm overflow-hidden min-h-0 p-4">
              <IndicatorWorkspaceView />
            </div>
          ) : (
            /* Modern 2-Pane Quantitative Screener Studio (Google M3 Harmonious Frame) */
            <div className="flex-1 flex flex-col lg:flex-row bg-white rounded-2xl border border-[#e0e2ec] shadow-sm overflow-hidden min-h-0">
              {/* Left Column: Strategy Library Sidebar */}
              <StrategyLibrarySidebar
                strategies={strategies}
                savedStrategies={savedStrategies}
                selectedStrategyId={selectedStrategy?.id || ''}
                onSelectStrategy={handleSelectStrategy}
                onSelectSavedStrategy={handleSelectSavedStrategy}
              />

              {/* Right Column: Strategy Workspace Studio Main */}
              <StrategyWorkspaceMain
                strategy={selectedStrategy}
                indicators={indicators}
                currentTimeframe={currentTimeframe}
                onChangeTimeframe={setCurrentTimeframe}
                selectedMode={selectedMode}
                onChangeMode={handleChangeMode}
                parameterValues={parameterValues}
                onChangeParameter={handleChangeParameter}
                onResetParameters={handleResetParameters}
                onRunStrategy={handleRunStrategy}
                isRunning={isRunning}
                executionResults={executionResults}
                executionTimeMs={executionTimeMs}
                scanDiagnostics={scanDiagnostics}
                onSelectStock={onSelectStock}
                onOpenAlertModal={onOpenAlertModal}
                onOpenCreateStrategyAlert={() => setIsCreateStrategyAlertOpen(true)}
                onOpenSaveModal={() => {
                  setSaveStrategyName(`${selectedStrategy?.shortName} - 定制版`);
                  setSaveErrorMsg(null);
                  setIsSaveModalOpen(true);
                }}
                onToggleWatchlist={onToggleWatchlist}
                watchlistTickers={watchlistTickers}
              />
            </div>
          )}
        </>
      )}

      {/* Create Strategy Alert Modal */}
      {selectedStrategy && (
        <CreateStrategyAlertModal
          isOpen={isCreateStrategyAlertOpen}
          onClose={() => setIsCreateStrategyAlertOpen(false)}
          strategyId={selectedStrategy.id}
          strategyName={selectedStrategy.shortName}
          parameters={parameterValues}
          timeframe={currentTimeframe}
          symbols={executionResults.length > 0 ? executionResults.map(r => r.ticker) : ['NVDA', 'PLTR', 'AAPL', 'MSFT']}
          onSuccess={(msg) => {
            setLoadToastMessage(msg || '策略监控已成功创建');
            setTimeout(() => setLoadToastMessage(null), 3500);
          }}
        />
      )}

      {/* Save Custom Strategy Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-500" />
                <h3 className="font-extrabold text-sm text-slate-900">保存为自建量化策略 (JSON Schema 校验)</h3>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveErrorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">策略名称 (name):</label>
                <input
                  type="text"
                  value={saveStrategyName}
                  onChange={e => setSaveStrategyName(e.target.value)}
                  placeholder="例如: 唐奇安20日放量突破模型 (定制版)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-blue-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">策略描述与实盘备注 (选填):</label>
                <textarea
                  rows={2}
                  value={saveStrategyDesc}
                  onChange={e => setSaveStrategyDesc(e.target.value)}
                  placeholder="适合大盘处于上升通道的放量买点..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-blue-500 font-medium"
                />
              </div>

              {/* JSON Schema preview details */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-500 space-y-1">
                <div className="text-slate-700 font-bold">Schema 包含核心字段:</div>
                <div>• author: {selectedStrategy?.author}</div>
                <div>• category: {selectedStrategy?.category}</div>
                <div>• timeframe: {currentTimeframe}</div>
                <div>• parameters: {JSON.stringify(parameterValues)}</div>
                <div>• rules: {selectedStrategy?.rules?.children?.length || 0} 项 AST 条件</div>
                <div>• risk: {selectedStrategy?.riskFramework?.stopLossRule}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveStrategy}
                disabled={!saveStrategyName.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                校验并保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Omni Search Modal */}
      <GlobalQuantSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        strategies={strategies}
        indicators={indicators}
        factors={factorDefs}
        onSelectStrategy={(st: StrategyDefinition) => {
          setQuantMode('STRATEGIES');
          handleSelectStrategy(st);
        }}
        onSelectIndicator={() => {
          setQuantMode('INDICATORS');
        }}
        onSelectFactor={() => {
          setQuantMode('FACTORS');
        }}
      />

      {/* Strategy Compare Modal */}
      <StrategyCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        allStrategies={strategies}
      />

      {/* Strategy Combiner Modal */}
      <StrategyCombinerModal
        isOpen={isCombinerModalOpen}
        onClose={() => setIsCombinerModalOpen(false)}
        allStrategies={strategies}
        onApplyCompositeStrategy={() => {
          setLoadToastMessage('多因子组合策略配置完成，选股引擎已更新算法！');
          setTimeout(() => setLoadToastMessage(null), 3000);
        }}
      />
    </div>
  );
}
