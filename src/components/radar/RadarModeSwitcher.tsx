import React from 'react';
import { Zap, Sliders, Cpu } from 'lucide-react';

export type RadarDisplayMode = 'QUICK' | 'PRO' | 'QUANT';

interface RadarModeSwitcherProps {
  currentMode: RadarDisplayMode;
  onModeChange: (mode: RadarDisplayMode) => void;
  activeFiltersCount?: number;
}

export const RadarModeSwitcher: React.FC<RadarModeSwitcherProps> = ({
  currentMode,
  onModeChange,
  activeFiltersCount = 0
}) => {
  return (
    <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-xl shadow-inner">
      <button
        onClick={() => onModeChange('QUICK')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          currentMode === 'QUICK'
            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <Zap className="w-3.5 h-3.5" />
        <span>极速模式 (Quick)</span>
      </button>

      <button
        onClick={() => onModeChange('PRO')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          currentMode === 'PRO'
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <Sliders className="w-3.5 h-3.5" />
        <span>专业模式 (Pro)</span>
        {activeFiltersCount > 0 && (
          <span className="px-1.5 py-0.2 bg-indigo-400/30 text-indigo-200 text-[10px] rounded-full font-bold">
            {activeFiltersCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onModeChange('QUANT')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          currentMode === 'QUANT'
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400/50'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
        }`}
      >
        <Cpu className="w-3.5 h-3.5" />
        <span>量化定制 (Quant)</span>
      </button>
    </div>
  );
};
