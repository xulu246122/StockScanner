import React from 'react';
import { StrategyDefinition, StrategyModeType, StrategyModeConfig } from '../../types.ts';
import { ensureStrategyModes } from '../../engine/strategyModesHelper.ts';
import {
  Zap,
  TrendingUp,
  Anchor,
  Clock,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface TradingStyleSelectorProps {
  strategy: StrategyDefinition;
  selectedMode: StrategyModeType;
  onChangeMode: (mode: StrategyModeType, defaultConfig: StrategyModeConfig) => void;
}

export const TradingStyleSelector: React.FC<TradingStyleSelectorProps> = ({
  strategy,
  selectedMode,
  onChangeMode
}) => {
  const preparedStrategy = ensureStrategyModes(strategy);
  const modes = preparedStrategy.modes || generateDefaultModes(preparedStrategy);
  const nativeDefaultMode = preparedStrategy.defaultMode || 'swing';

  const modeOptions: { id: StrategyModeType; label: string; shortLabel: string; icon: any; color: string; bg: string; border: string }[] = [
    {
      id: 'short_term',
      label: '超短线 (Short Term)',
      shortLabel: '超短线',
      icon: Zap,
      color: 'text-amber-600',
      bg: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
      border: 'border-amber-300'
    },
    {
      id: 'swing',
      label: '波段交易 (Swing)',
      shortLabel: '波段交易',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50 text-blue-900 border-blue-300 font-bold',
      border: 'border-blue-300'
    },
    {
      id: 'position',
      label: '趋势持仓 (Position)',
      shortLabel: '趋势持仓',
      icon: Anchor,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold',
      border: 'border-emerald-300'
    }
  ];

  const activeModeConfig = modes[selectedMode] || modes.swing;

  return (
    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
      {/* Header Title */}
      <div className="space-y-2 border-b border-slate-200/70 pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-3 h-3" />
            </div>
            <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
              交易模式架构 (TRADING STYLE)
            </span>
          </div>

          <span className="text-[10px] font-mono text-slate-400 font-semibold">
            3 MODES
          </span>
        </div>

        {/* 3 Mode Selection Buttons (Full Width Stack) */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-slate-200/80 w-full">
          {modeOptions.map(opt => {
            const Icon = opt.icon;
            const isSelected = selectedMode === opt.id;
            const isNative = nativeDefaultMode === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeMode(opt.id, modes[opt.id])}
                className={`relative py-2 px-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
                  isSelected
                    ? `${opt.bg} border shadow-2xs`
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent font-medium'
                }`}
                title={`${opt.label}${isNative ? ' (策略原生推荐)' : ''}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? opt.color : 'text-slate-400'}`} />
                <span>{opt.shortLabel}</span>

                {isNative && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Mode Dynamic Metadata Box */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/80 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900">{activeModeConfig.name}</span>
            {selectedMode === nativeDefaultMode && (
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                ★ 官方原生推荐
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{activeModeConfig.defaultTimeframe} / {activeModeConfig.holdingPeriod}</span>
          </div>
        </div>

        <p className="text-slate-600 text-[11px] leading-relaxed">
          {activeModeConfig.description}
        </p>

        {/* Dynamic Mode Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 font-mono text-[10px]">
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center">
            <span className="text-slate-400 block">推荐周期</span>
            <span className="font-bold text-slate-900 mt-0.5 block">{activeModeConfig.defaultTimeframe}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center">
            <span className="text-slate-400 block">止损幅度</span>
            <span className="font-bold text-rose-600 mt-0.5 block">-{activeModeConfig.stopLossPercent || 5}%</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-center">
            <span className="text-slate-400 block">止盈目标</span>
            <span className="font-bold text-emerald-600 mt-0.5 block">+{activeModeConfig.takeProfitPercent || 15}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function generateDefaultModes(strategy: StrategyDefinition): Record<StrategyModeType, StrategyModeConfig> {
  return {
    short_term: {
      name: '超短线日内模式 (Short Term)',
      description: '适应日内或次日高频波动，抓取超短线脉冲。',
      defaultTimeframe: '1h',
      holdingPeriod: '1-3个交易日',
      stopLossPercent: 3,
      takeProfitPercent: 6,
      parameters: {}
    },
    swing: {
      name: '经典波段模式 (Swing Trade)',
      description: '标准波段趋势跟踪，平衡持仓周期与收益回撤比。',
      defaultTimeframe: '1D',
      holdingPeriod: '1-4周',
      stopLossPercent: 6,
      takeProfitPercent: 18,
      parameters: {}
    },
    position: {
      name: '趋势大波段模式 (Position Trade)',
      description: '中长线大趋势持仓，过滤日线级别随机噪音。',
      defaultTimeframe: '1W',
      holdingPeriod: '1-6个月',
      stopLossPercent: 10,
      takeProfitPercent: 35,
      parameters: {}
    }
  };
}
