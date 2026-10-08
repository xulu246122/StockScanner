import { useState, useMemo } from 'react';
import {
  StrategyDefinition,
  IndicatorDefinition,
  Timeframe,
  StrategyModeType,
  StrategyModeConfig,
  ExtendedScreenerItem,
  StrategyParamConfig
} from '../../types.ts';
import { ensureStrategyModes } from '../../engine/strategyModesHelper.ts';
import { getStrategyModelMode } from './StrategyLibrarySidebar.tsx';
import {
  BookOpen,
  Terminal,
  ShieldCheck,
  Clock,
  Play,
  RotateCcw,
  Bell,
  Bookmark,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Star,
  RefreshCw,
  Sparkles,
  Info,
  BarChart3
} from 'lucide-react';
import { PerformancePanel } from './PerformancePanel.tsx';

interface StrategyWorkspaceMainProps {
  strategy: StrategyDefinition | null;
  indicators: IndicatorDefinition[];
  currentTimeframe?: Timeframe;
  onChangeTimeframe?: (tf: Timeframe) => void;
  selectedMode?: StrategyModeType;
  onChangeMode?: (mode: StrategyModeType, config: StrategyModeConfig) => void;
  parameterValues?: Record<string, any>;
  onChangeParameter?: (key: string, value: any) => void;
  onResetParameters?: () => void;
  onRunStrategy?: () => void;
  isRunning?: boolean;
  executionResults?: ExtendedScreenerItem[];
  executionTimeMs?: number | null;
  scanDiagnostics?: { scannedCount: number; evaluatedCount: number; dataErrorCount: number; dataErrorSamples: Array<{ ticker: string; message: string }> } | null;
  onSelectStock?: (ticker: string) => void;
  onOpenAlertModal?: (ticker: string, name?: string, rsi?: number) => void;
  onOpenCreateStrategyAlert?: () => void;
  onOpenSaveModal?: () => void;
  onToggleWatchlist?: (ticker: string) => void;
  watchlistTickers?: string[];
}

export type DetailSubTab = 'RESULTS' | 'BACKTEST' | 'LOGIC' | 'RISK';

function formatVolume(vol: number | undefined): string {
  if (!vol || vol === 0) return '12.5M';
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(0) + 'K';
  return vol.toString();
}

function formatMarketCap(cap: number | undefined): string {
  if (!cap || cap === 0) return '$50.0B';
  if (cap >= 1e12) return '$' + (cap / 1e12).toFixed(2) + 'T';
  if (cap >= 1e9) return '$' + (cap / 1e9).toFixed(1) + 'B';
  if (cap >= 1e6) return '$' + (cap / 1e6).toFixed(0) + 'M';
  return '$' + cap.toLocaleString();
}

export function StrategyWorkspaceMain({
  strategy,
  indicators,
  currentTimeframe = '1D',
  onChangeTimeframe,
  selectedMode = 'swing',
  onChangeMode,
  parameterValues = {},
  onChangeParameter,
  onResetParameters,
  onRunStrategy,
  isRunning = false,
  executionResults = [],
  executionTimeMs = null,
  scanDiagnostics = null,
  onSelectStock,
  onOpenAlertModal,
  onOpenCreateStrategyAlert,
  onOpenSaveModal,
  onToggleWatchlist,
  watchlistTickers = []
}: StrategyWorkspaceMainProps) {
  const [detailTab, setDetailTab] = useState<DetailSubTab>('RESULTS');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [resultSearchQuery, setResultSearchQuery] = useState('');

  const timeframes: Timeframe[] = ['10m', '30m', '1h', '4h', '1D', '1W'];

  const filteredResults = useMemo(() => {
    if (!resultSearchQuery.trim()) return executionResults;
    const q = resultSearchQuery.toLowerCase().trim();
    return executionResults.filter(
      r => r.ticker.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [executionResults, resultSearchQuery]);

  if (!strategy) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 bg-white">
        <BookOpen className="w-10 h-10 text-slate-300 mb-2.5" />
        <h3 className="font-bold text-sm text-slate-700">请选择量化模型</h3>
        <p className="text-xs text-slate-400 mt-1">从左侧目录选择策略以加载参数与执行全美股扫描</p>
      </div>
    );
  }

  const paramsList: StrategyParamConfig[] = Array.isArray(strategy.parameters)
    ? (strategy.parameters as StrategyParamConfig[])
    : (strategy.paramConfigs || []);

  const modelMode = getStrategyModelMode(strategy);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafd]">
      
      {/* 1. Google M3 Header */}
      <div className="bg-white border-b border-[#e0e2ec] px-4 py-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Left: Strategy Identity */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                {strategy.nameZh || strategy.name}
              </h1>
              <span className="text-[11px] font-mono text-[#444746] bg-[#f0f4f9] px-2 py-0.5 rounded-full border border-[#e0e2ec]">
                {strategy.shortName || strategy.nameEn}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                String(strategy.evidenceLevel || '').toUpperCase().includes('A')
                  ? 'text-[#0f5223] bg-[#c4eed0]/60 border-[#a8dab5]'
                  : 'text-[#0b57d0] bg-[#d3e3fd]/60 border-[#b0ccf7]'
              }`}>
                Evidence {String(strategy.evidenceLevel || 'A').toUpperCase().replace('LEVEL_', '')}
              </span>
              <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${
                modelMode === 'SHORT' ? 'bg-[#d3e3fd]/60 text-[#0b57d0]' : modelMode === 'SWING' ? 'bg-[#c4eed0]/60 text-[#0f5223]' : 'bg-[#eedcfc]/60 text-[#5a2489]'
              }`}>
                {strategy.holdingPeriodLabel || (modelMode === 'SHORT' ? '短线 1-5D' : modelMode === 'SWING' ? '波段 1-4W' : '长线')}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#444746] font-medium mt-1 truncate">
              <span className="truncate">
                {strategy.description || '经典量化模型策略'}
              </span>
              {strategy.sourceReference && (
                <span className="text-[#747775] text-[11px] flex items-center gap-0.5 shrink-0" title={strategy.sourceReference}>
                  <Info className="w-3 h-3 text-[#747775]" />
                  <span>{strategy.author}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Key Actions Group */}
          <div className="flex items-center gap-2 shrink-0">
            {onRunStrategy && (
              <button
                type="button"
                onClick={onRunStrategy}
                disabled={isRunning}
                className="px-4 py-2 rounded-full bg-[#0b57d0] hover:bg-[#0842a0] active:scale-[0.98] text-white text-xs font-semibold flex items-center gap-2 shadow-xs hover:shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>美股量化运算中...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>扫描美股</span>
                  </>
                )}
              </button>
            )}

            {onOpenCreateStrategyAlert && (
              <button
                type="button"
                onClick={onOpenCreateStrategyAlert}
                className="p-2 rounded-full text-[#444746] hover:text-[#1f1f1f] hover:bg-[#f0f4f9] border border-[#e0e2ec] text-xs font-medium transition-colors cursor-pointer"
                title="创建策略自动监控预警"
              >
                <Bell className="w-4 h-4 text-[#444746]" />
              </button>
            )}

            {onOpenSaveModal && (
              <button
                type="button"
                onClick={onOpenSaveModal}
                className="p-2 rounded-full text-[#444746] hover:text-[#1f1f1f] hover:bg-[#f0f4f9] border border-[#e0e2ec] text-xs font-medium transition-colors cursor-pointer"
                title="保存为自定义参数配置"
              >
                <Bookmark className="w-4 h-4 text-[#444746]" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Google M3 Inline Controls Strip */}
        <div className="mt-2.5 pt-2 border-t border-[#f0f4f9] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Timeframe Buttons Group */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#747775] font-mono">TF:</span>
            <div className="flex items-center bg-[#f0f4f9] p-0.5 rounded-full border border-[#e0e2ec]">
              {timeframes.map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onChangeTimeframe && onChangeTimeframe(tf)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    currentTimeframe === tf
                      ? 'bg-white text-[#041e49] shadow-2xs font-extrabold'
                      : 'text-[#444746] hover:text-[#1f1f1f]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Parameters Adjusters */}
          {paramsList.length > 0 && onChangeParameter && (
            <div className="flex items-center gap-2.5">
              {paramsList.slice(0, 2).map(param => {
                const paramKey = (param as any).id || (param as any).key;
                const paramName = (param as any).name || (param as any).label || paramKey;
                const val = parameterValues[paramKey] ?? param.default;
                return (
                  <div key={paramKey} className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-slate-500 font-sans">{paramName}:</span>
                    <input
                      type="range"
                      min={param.min || 1}
                      max={param.max || 100}
                      step={param.step || 1}
                      value={val}
                      onChange={e => onChangeParameter(paramKey, Number(e.target.value))}
                      className="w-16 h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-[#2962ff]"
                    />
                    <span className="font-bold text-[#2962ff] bg-white px-1.5 py-0.2 rounded border border-[#e0e3eb] shadow-2xs min-w-[24px] text-center">
                      {val}
                    </span>
                  </div>
                );
              })}

              {onResetParameters && (
                <button
                  type="button"
                  onClick={onResetParameters}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="恢复默认参数"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Execution Time badge */}
          {executionTimeMs !== null && (
            <span className="text-[10px] font-mono text-slate-400 ml-auto">
              耗时: {executionTimeMs}ms{scanDiagnostics ? ` · 已评估 ${scanDiagnostics.evaluatedCount}/${scanDiagnostics.scannedCount} · 数据失败 ${scanDiagnostics.dataErrorCount}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* 3. Google M3 Underline Tabs */}
      <div className="px-4 bg-white border-b border-[#e0e2ec] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setDetailTab('RESULTS')}
            className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              detailTab === 'RESULTS'
                ? 'border-[#0b57d0] text-[#0b57d0] font-bold'
                : 'border-transparent text-[#444746] hover:text-[#1f1f1f]'
            }`}
          >
            <span>筛选结果</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              detailTab === 'RESULTS' ? 'bg-[#d3e3fd] text-[#041e49]' : 'bg-[#f0f4f9] text-[#444746]'
            }`}>
              {executionResults.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('BACKTEST')}
            className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              detailTab === 'BACKTEST'
                ? 'border-[#0b57d0] text-[#0b57d0] font-bold'
                : 'border-transparent text-[#444746] hover:text-[#1f1f1f]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>历史回测与蒙特卡洛</span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('LOGIC')}
            className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              detailTab === 'LOGIC'
                ? 'border-[#0b57d0] text-[#0b57d0] font-bold'
                : 'border-transparent text-[#444746] hover:text-[#1f1f1f]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>量化逻辑与因子</span>
          </button>

          <button
            type="button"
            onClick={() => setDetailTab('RISK')}
            className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              detailTab === 'RISK'
                ? 'border-[#0b57d0] text-[#0b57d0] font-bold'
                : 'border-transparent text-[#444746] hover:text-[#1f1f1f]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>风控与执行框架</span>
          </button>
        </div>
      </div>

      {/* 4. Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {detailTab === 'RESULTS' && (
          <div className="space-y-3">
            {/* Table Search & View Switcher */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-xs text-slate-800">
                  选股结果池 ({filteredResults.length} / {executionResults.length} 标的
                  {executionResults.length > 0 && (
                    <span className="ml-1 text-[11px] font-normal text-[#747775]">
                      · 触发 {executionResults.filter(r => r.strategyState === 'TRIGGERED').length} · 临界 {executionResults.filter(r => r.strategyState === 'NEAR_TRIGGER').length}
                    </span>
                  )})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#747775]" />
                  <input
                    type="text"
                    value={resultSearchQuery}
                    onChange={e => setResultSearchQuery(e.target.value)}
                    placeholder="过滤代码/名称..."
                    className="pl-8.5 pr-3 py-1 bg-[#f0f4f9] hover:bg-[#e9eef6] focus:bg-white border border-[#e0e2ec] rounded-full text-xs text-slate-900 placeholder:text-[#747775] focus:outline-none focus:border-[#0b57d0]"
                  />
                </div>

                <div className="flex items-center bg-[#f0f4f9] p-0.5 rounded-lg border border-[#e0e2ec]">
                  <button
                    type="button"
                    onClick={() => setViewMode('TABLE')}
                    className={`p-1 rounded-md cursor-pointer ${viewMode === 'TABLE' ? 'bg-white text-[#0b57d0] shadow-2xs' : 'text-[#747775] hover:text-[#1f1f1f]'}`}
                    title="表格视图"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('GRID')}
                    className={`p-1 rounded-md cursor-pointer ${viewMode === 'GRID' ? 'bg-white text-[#0b57d0] shadow-2xs' : 'text-[#747775] hover:text-[#1f1f1f]'}`}
                    title="卡片网格"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Table or Empty State */}
            {filteredResults.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-white border border-[#e0e2ec] shadow-2xs space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#d3e3fd]/50 flex items-center justify-center mx-auto text-[#0b57d0]">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">
                    {executionResults.length === 0 ? '尚未执行策略筛选' : '无匹配过滤标的'}
                  </h3>
                  <p className="text-xs text-[#747775] mt-1.5 max-w-sm mx-auto leading-relaxed">
                    {scanDiagnostics && scanDiagnostics.scannedCount > 0 && scanDiagnostics.dataErrorCount === scanDiagnostics.scannedCount
                      ? `全部 ${scanDiagnostics.scannedCount} 个标的行情加载失败，未能执行模型条件。请检查网络/行情源后重试。`
                      : executionResults.length === 0 && scanDiagnostics
                        ? `已评估 ${scanDiagnostics.evaluatedCount}/${scanDiagnostics.scannedCount} 个标的，数据加载失败 ${scanDiagnostics.dataErrorCount} 个；其余标的均未满足策略条件。`
                        : executionResults.length === 0
                      ? '点击右上方「扫描美股」即可基于全美股数据库即时计算此模型'
                      : '请清空搜索框以查看所有筛选结果'}
                  </p>
                  {scanDiagnostics?.dataErrorSamples && scanDiagnostics.dataErrorSamples.length > 0 && (
                    <p className="text-[10px] text-amber-600 mt-2 max-w-lg mx-auto">
                      行情错误示例：{scanDiagnostics.dataErrorSamples.map(error => `${error.ticker}: ${error.message}`).join('；')}
                    </p>
                  )}
                </div>
                {executionResults.length === 0 && onRunStrategy && (
                  <button
                    type="button"
                    onClick={onRunStrategy}
                    disabled={isRunning}
                    className="px-6 py-2.5 rounded-full bg-[#0b57d0] hover:bg-[#0842a0] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>扫描美股</span>
                  </button>
                )}
              </div>
            ) : viewMode === 'TABLE' ? (
              <div className="bg-white rounded-xl border border-[#e0e2ec] shadow-2xs overflow-hidden">
                <div className="overflow-x-auto max-h-[calc(100vh-340px)] min-h-[380px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs select-none">
                    <thead className="sticky top-0 z-20 bg-[#f8fafd] backdrop-blur-xs border-b border-[#e0e2ec]">
                      <tr className="text-[11px] font-mono uppercase text-[#747775]">
                      <th className="py-2 px-3 font-semibold">标的代码 / 名称</th>
                      <th className="py-2 px-3 font-semibold text-right">最新价</th>
                      <th className="py-2 px-3 font-semibold text-right">涨跌幅</th>
                      <th className="py-2 px-3 font-semibold text-center">RSI(14)</th>
                      <th className="py-2 px-3 font-semibold text-center">共振评分</th>
                      <th className="py-2 px-3 font-semibold text-right">成交量</th>
                      <th className="py-2 px-3 font-semibold text-right">总市值</th>
                      <th className="py-2 px-3 font-semibold text-center">状态</th>
                      <th className="py-2 px-3 font-semibold text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f3fa]">
                    {filteredResults.map((stock) => {
                      const isPositive = stock.changePercent >= 0;
                      const isWatchlisted = watchlistTickers.includes(stock.ticker);
                      const confluence = stock.confluenceScore || stock.strategyEvaluation?.confluenceScore || 90;
                      const factorScore = stock.factorScore !== undefined ? stock.factorScore : Math.min(99, Math.max(50, Math.round(confluence * 0.95)));

                      return (
                        <tr
                          key={stock.ticker}
                          className="hover:bg-[#f0f3fa]/70 transition-colors group cursor-pointer"
                          onClick={() => onSelectStock?.(stock.ticker)}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 group-hover:text-[#0b57d0]">
                                {stock.ticker}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {stock.exchange}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate max-w-[130px]">
                                {stock.name}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                            ${stock.price?.toFixed(2)}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={isPositive ? 'text-[#089981]' : 'text-[#f23645]'}>
                              {isPositive ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                              stock.rsi <= 30
                                ? 'bg-emerald-50 text-emerald-700'
                                : stock.rsi >= 70
                                ? 'bg-rose-50 text-rose-700'
                                : 'text-slate-700'
                            }`}>
                              {stock.rsi?.toFixed(1) || '50.0'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[#0b57d0]">
                            {confluence}%
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatVolume(stock.volume)}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatMarketCap(stock.marketCap)}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              stock.strategyState === 'TRIGGERED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : stock.strategyState === 'NEAR_TRIGGER'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {stock.strategyState === 'TRIGGERED' ? 'TRIGGERED' : stock.strategyState === 'NEAR_TRIGGER' ? 'NEAR TRIGGER' : 'SETUP'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => onToggleWatchlist?.(stock.ticker)}
                                className={`p-1 rounded cursor-pointer ${
                                  isWatchlisted ? 'text-amber-500' : 'text-slate-300 hover:text-slate-600'
                                }`}
                                title={isWatchlisted ? '已在自选' : '加入自选'}
                              >
                                <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenAlertModal?.(stock.ticker, stock.name, stock.rsi)}
                                className="p-1 rounded text-slate-300 hover:text-[#0b57d0] cursor-pointer"
                                title="设置预警"
                              >
                                <Bell className="w-3.5 h-3.5" />
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
            ) : (
              /* Grid View with Rounded-2xl Frame & Inner Scroll */
              <div className="bg-white rounded-xl border border-[#e0e2ec] shadow-2xs p-3.5 overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[calc(100vh-340px)] min-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredResults.map((stock) => {
                    const isPositive = stock.changePercent >= 0;
                    const isWatchlisted = watchlistTickers.includes(stock.ticker);
                    const confluence = stock.confluenceScore || stock.strategyEvaluation?.confluenceScore || 90;
                    return (
                      <div
                        key={stock.ticker}
                        onClick={() => onSelectStock?.(stock.ticker)}
                        className="bg-[#f8fafd] hover:bg-slate-100 p-3.5 rounded-xl border border-slate-200/80 hover:border-[#0b57d0]/50 transition-all cursor-pointer flex flex-col justify-between gap-2.5 shadow-2xs group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-sm text-slate-900 group-hover:text-[#0b57d0]">
                              {stock.ticker}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{stock.exchange}</span>
                            <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded border ${
                              stock.strategyState === 'TRIGGERED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : stock.strategyState === 'NEAR_TRIGGER'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {stock.strategyState === 'TRIGGERED' ? 'TRIGGER' : stock.strategyState === 'NEAR_TRIGGER' ? 'NEAR' : 'SETUP'}
                            </span>
                          </div>
                          <span className={`font-mono text-xs font-bold ${isPositive ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                            {isPositive ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 truncate">{stock.name}</div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#f0f3fa] text-xs font-mono">
                          <span className="font-bold text-slate-900">${stock.price?.toFixed(2)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#0b57d0]">{confluence}%共振</span>
                            <div className="flex items-center gap-0.5 text-slate-500">
                              <span className="text-[10px] text-slate-400">RSI:</span>
                              <span className="font-semibold text-slate-700">{stock.rsi?.toFixed(1) || 50}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Backtest & Monte Carlo Performance Panel */}
        {detailTab === 'BACKTEST' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden min-h-[500px]">
            <PerformancePanel
              strategy={strategy}
              currentTimeframe={currentTimeframe}
              parameterValues={parameterValues}
            />
          </div>
        )}

        {/* Tab 2: Quant Logic & Factor Details */}
        {detailTab === 'LOGIC' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-[#2962ff]" />
              <span>策略量化逻辑与核心公式</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {strategy.description}
            </p>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 block">执行规则清单 (Rules):</span>
              <div className="space-y-1.5">
                {(strategy.tradingLogic?.entryRules || strategy.entry || (Array.isArray((strategy.rules as any)?.conditions) ? (strategy.rules as any).conditions : [])).map((rule: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#f8fafd] border border-slate-200/80 text-xs font-mono text-slate-700 flex items-start gap-2">
                    <span className="text-[#2962ff] font-bold shrink-0">#{idx + 1}</span>
                    <span>{typeof rule === 'string' ? rule : rule.description || `${rule.indicator || rule.field || 'Condition'} ${rule.operator || '='} ${rule.value ?? ''}`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Risk Framework */}
        {detailTab === 'RISK' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>严格风控与仓位管理框架 (5% 最大止损约束)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#f8fafd] rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-slate-400 font-mono">入场与失效位</span>
                <div className="font-bold text-slate-800">
                  {strategy.riskFramework?.entryReference || '突破关键均线或通道上轨'}
                </div>
                <div className="text-rose-600 text-[11px]">
                  失效逻辑: {strategy.riskFramework?.invalidation || '跌破止损阈值 (硬止损 5%)'}
                </div>
              </div>

              <div className="p-3.5 bg-[#f8fafd] rounded-xl border border-slate-200/80 space-y-1">
                <span className="text-slate-400 font-mono">仓位风险预算</span>
                <div className="font-bold text-slate-800">
                  单笔交易风险 ≤ 1.0% 总资产组合
                </div>
                <div className="text-emerald-700 text-[11px]">
                  {strategy.riskWarning || '严格执行仓位硬止损管控'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
