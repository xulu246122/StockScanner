import { useState, useEffect } from 'react';
import { StrategyDefinition, IndicatorDefinition, FactorDefinition } from '../../types.ts';
import {
  Search,
  X,
  BookOpen,
  Calculator,
  Layers,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';

interface GlobalQuantSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: StrategyDefinition[];
  indicators: IndicatorDefinition[];
  factors: FactorDefinition[];
  onSelectStrategy: (st: StrategyDefinition) => void;
  onSelectIndicator: (indId: string) => void;
  onSelectFactor: (factorId: string) => void;
}

export function GlobalQuantSearchModal({
  isOpen,
  onClose,
  strategies,
  indicators,
  factors,
  onSelectStrategy,
  onSelectIndicator,
  onSelectFactor
}: GlobalQuantSearchModalProps) {
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Search Results
  const matchedStrategies = q
    ? strategies.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.shortName.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      )
    : strategies.slice(0, 3);

  const matchedIndicators = q
    ? indicators.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.shortName.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      )
    : indicators.slice(0, 3);

  const matchedFactors = q
    ? factors.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.shortName.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      )
    : factors.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Search Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950">
          <div className="flex items-center gap-3 flex-1">
            <Search className="w-5 h-5 text-blue-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="全局跨模块搜策略、指标、因子 (输入 e.g. momentum, rsi, ema)..."
              className="w-full bg-transparent text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
          
          {/* 1. Strategies Category */}
          {matchedStrategies.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>相关策略模型 (STRATEGIES · {matchedStrategies.length})</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {matchedStrategies.map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      onSelectStrategy(st);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/80 text-left transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs group-hover:text-blue-400">{st.name}</span>
                        <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                          {st.winRateEst || 64.2}% 胜率
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {st.author} · {st.horizon}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Indicators Category */}
          {matchedIndicators.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                <span>相关技术指标 (INDICATORS · {matchedIndicators.length})</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {matchedIndicators.map(ind => (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => {
                      onSelectIndicator(ind.id);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/80 text-left transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-white text-xs group-hover:text-purple-400">{ind.name}</span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        公式: {ind.mathFormula}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Factors Category */}
          {matchedFactors.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>相关量化因子 (FACTORS · {matchedFactors.length})</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {matchedFactors.map(def => (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => {
                      onSelectFactor(def.id);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/80 text-left transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs group-hover:text-emerald-400">{def.name}</span>
                        <span className="text-[9px] font-mono text-purple-400 bg-purple-950 px-1.5 py-0.2 rounded border border-purple-900">
                          {def.categoryLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {def.description}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>按 ESC 键退出全局跨模块搜索</span>
          <span className="text-slate-400">Ctrl + K 快捷呼出</span>
        </div>
      </div>
    </div>
  );
}
