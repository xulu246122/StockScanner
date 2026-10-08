import { StrategyDefinition, Timeframe, StrategyParamConfig, StrategyModeType, StrategyModeConfig } from '../../types.ts';
import { TradingStyleSelector } from './TradingStyleSelector.tsx';
import {
  Play,
  RotateCcw,
  Bookmark,
  Sparkles,
  Layers,
  Clock,
  Filter,
  CheckCircle,
  RefreshCw,
  Sliders,
  DollarSign,
  Building2,
  FolderPlus
} from 'lucide-react';

interface StrategyExecutionPanelProps {
  strategy: StrategyDefinition | null;
  currentTimeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;
  selectedMode?: StrategyModeType;
  onChangeMode?: (mode: StrategyModeType, config: StrategyModeConfig) => void;
  parameterValues: Record<string, any>;
  onChangeParameter: (key: string, value: any) => void;
  onResetParameters: () => void;
  onRunStrategy: () => void;
  isRunning: boolean;
  onOpenSaveModal: () => void;
  onOpenExportModal: () => void;
  matchedCount: number | null;
  executionTimeMs: number | null;
}

export function StrategyExecutionPanel({
  strategy,
  currentTimeframe,
  onChangeTimeframe,
  selectedMode = 'swing',
  onChangeMode,
  parameterValues,
  onChangeParameter,
  onResetParameters,
  onRunStrategy,
  isRunning,
  onOpenSaveModal,
  onOpenExportModal,
  matchedCount,
  executionTimeMs
}: StrategyExecutionPanelProps) {
  if (!strategy) return null;

  const timeframes: Timeframe[] = ['10m', '30m', '1h', '4h', '1D', '1W'];
  const paramsList: StrategyParamConfig[] = Array.isArray(strategy.parameters)
    ? (strategy.parameters as StrategyParamConfig[])
    : (strategy.paramConfigs || []);

  return (
    <aside className="w-full lg:w-80 bg-white border-l border-slate-200/90 flex flex-col h-full shrink-0 select-none shadow-2xs">
      
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-black text-slate-900 tracking-wide">
            执行与参数微调 (EXECUTION)
          </span>
        </div>

        <button
          type="button"
          onClick={onResetParameters}
          className="p-1 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          title="重置为当前模式默认参数"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Execution Form & Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/40">

        {/* 0. Trading Style Mode Selector */}
        {onChangeMode && (
          <TradingStyleSelector
            strategy={strategy}
            selectedMode={selectedMode}
            onChangeMode={onChangeMode}
          />
        )}
        
        {/* 1. Timeframe Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>执行 K 线周期 (Timeframe)</span>
          </label>
          <div className="grid grid-cols-6 gap-1 bg-white p-1 rounded-xl border border-slate-200/80">
            {timeframes.map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => onChangeTimeframe(tf)}
                className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  currentTimeframe === tf
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Dynamic Configurable Parameters */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>策略动态参数 ({paramsList.length})</span>
            <span className="text-[10px] font-mono text-slate-400">DYNAMIC TUNING</span>
          </div>

          {paramsList.length === 0 ? (
            <div className="p-3 text-center rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-500">
              此策略无需微调参数，使用标准量化模型规则
            </div>
          ) : (
            paramsList.map(p => {
              const currentVal = parameterValues[p.id] !== undefined ? parameterValues[p.id] : p.default;
              return (
                <div key={p.id} className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{p.name}</span>
                    <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {currentVal}
                    </span>
                  </div>

                  {p.type === 'number' && (
                    <div className="space-y-1">
                      <input
                        type="range"
                        min={p.min ?? 0}
                        max={p.max ?? 100}
                        step={p.step ?? 1}
                        value={currentVal}
                        onChange={e => onChangeParameter(p.id, parseFloat(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[9px] font-mono text-slate-400">
                        <span>Min: {p.min ?? 0}</span>
                        <span>Default: {p.default}</span>
                        <span>Max: {p.max ?? 100}</span>
                      </div>
                    </div>
                  )}

                  {p.description && (
                    <p className="text-[10px] text-slate-500 leading-normal">
                      {p.description}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 3. Pre-execution Filters (Market Cap & Liquidity) */}
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-2 text-xs">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>流动性硬约束保障</span>
          </div>
          <div className="text-[11px] text-slate-500 space-y-1">
            <p>• 自动过滤低于 $200M 的非流动性微盘</p>
            <p>• 执行全市场 AST 多因子向量化匹配</p>
          </div>
        </div>

        {/* 4. Execution Summary Card */}
        {matchedCount !== null && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-1 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900">上次扫描匹配结果:</span>
              <span className="font-mono font-black text-white bg-blue-600 px-2 py-0.5 rounded">
                {matchedCount} 只标的
              </span>
            </div>
            {executionTimeMs !== null && (
              <div className="text-[10px] font-mono text-blue-700">
                扫描耗时: {executionTimeMs}ms · 内存缓存加速
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Fixed Action Controls */}
      <div className="p-3.5 border-t border-slate-100 bg-white space-y-2">
        
        {/* Primary Load Strategy Button */}
        <button
          type="button"
          onClick={onRunStrategy}
          disabled={isRunning}
          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>正在加载策略模型配置...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white stroke-none" />
              <span>▶ 加载并应用策略 (Load Strategy)</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onOpenSaveModal}
            className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border border-slate-200 transition-colors cursor-pointer"
          >
            <Bookmark className="w-3 h-3 text-amber-600" />
            <span>保存参数模板</span>
          </button>

          <button
            type="button"
            onClick={onOpenExportModal}
            disabled={matchedCount === null || matchedCount === 0}
            className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 border border-slate-200 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3 h-3 text-emerald-600" />
            <span>生成股票池</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
