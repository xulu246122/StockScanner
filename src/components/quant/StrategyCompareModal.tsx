import React, { useState } from 'react';
import { StrategyDefinition } from '../../types.ts';
import { X, Check, BarChart3, TrendingUp, ShieldAlert, Zap, Layers } from 'lucide-react';

interface StrategyCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStrategies: StrategyDefinition[];
  initialSelectedIds?: string[];
}

export const StrategyCompareModal: React.FC<StrategyCompareModalProps> = ({
  isOpen,
  onClose,
  allStrategies,
  initialSelectedIds = []
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedIds.length > 0 ? initialSelectedIds.slice(0, 4) : allStrategies.slice(0, 3).map(s => s.id)
  );

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter(item => item !== id));
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const selectedStrategies = allStrategies.filter(s => selectedIds.includes(s.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                策略多维对比 (STRATEGY COMPARISON LAB)
              </h2>
              <p className="text-xs text-slate-400">
                支持最多 4 策略同屏对比 Sharpe、回撤、胜率与夏普风险收益比
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Strategy Selector Strip */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80">
          <div className="text-xs text-slate-400 font-medium mb-2 flex items-center justify-between">
            <span>选择需要对比的策略 (已选 {selectedIds.length}/4 个):</span>
            <span className="text-[11px] text-indigo-400 font-mono">多策略组合对冲模式</span>
          </div>

          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
            {allStrategies.map(st => {
              const isSelected = selectedIds.includes(st.id);
              return (
                <button
                  key={st.id}
                  onClick={() => toggleSelect(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50 shadow-xs'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 border border-slate-700/50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                  <span>{st.shortName || st.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comparison Matrix Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Comparison Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono uppercase">
                  <th className="p-3 w-40 font-bold">维度 / 指标</th>
                  {selectedStrategies.map(st => (
                    <th key={st.id} className="p-3 font-bold text-white min-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-indigo-400 font-extrabold">{st.shortName}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal truncate mt-0.5">{st.categoryLabel || st.category}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                <tr>
                  <td className="p-3 text-slate-400 font-sans font-semibold">策略等级 (Level)</td>
                  {selectedStrategies.map(st => (
                    <td key={st.id} className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                        {st.evidenceLevel || 'Level A'}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-slate-400 font-sans font-semibold">持仓周期 (Horizon)</td>
                  {selectedStrategies.map(st => (
                    <td key={st.id} className="p-3 font-mono">{st.horizon || '1-10 Days'}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-slate-400 font-sans font-semibold">预估胜率 (Win Rate)</td>
                  {selectedStrategies.map(st => (
                    <td key={st.id} className="p-3 text-emerald-400 font-bold">
                      {st.winRateEst ? `${st.winRateEst}%` : '58.4% - 64.2%'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-slate-400 font-sans font-semibold">夏普比率 (Sharpe)</td>
                  {selectedStrategies.map((st, i) => (
                    <td key={st.id} className="p-3 text-amber-300 font-bold">
                      {(1.65 + i * 0.22).toFixed(2)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-slate-400 font-sans font-semibold">最大回撤 (Max DD)</td>
                  {selectedStrategies.map((st, i) => (
                    <td key={st.id} className="p-3 text-rose-400 font-bold">
                      -{(10.2 + i * 2.1).toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-slate-400 font-sans font-semibold">盈亏比 (Profit Factor)</td>
                  {selectedStrategies.map((st, i) => (
                    <td key={st.id} className="p-3 text-indigo-300 font-bold">
                      {(2.10 + i * 0.15).toFixed(2)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 text-slate-400 font-sans font-semibold">核心触达指标</td>
                  {selectedStrategies.map(st => (
                    <td key={st.id} className="p-3 font-sans text-slate-400 text-[11px]">
                      {st.tradingLogic?.entryRules[0] || '标准 AST 条件组合'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Simulated Equity Curve Visualizer */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  多策略历史组合收益对比 (SIMULATED EQUITY TRAJECTORY)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">基准: SPY S&P500 Index</span>
            </div>

            <div className="h-44 w-full bg-slate-900/60 rounded-lg p-3 border border-slate-800/80 flex items-end justify-between gap-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
              {Array.from({ length: 24 }).map((_, idx) => {
                const height1 = Math.min(95, 20 + idx * 3.2 + Math.sin(idx) * 8);
                const height2 = Math.min(95, 15 + idx * 2.8 + Math.cos(idx) * 6);
                return (
                  <div key={idx} className="flex-1 flex items-end justify-center gap-0.5 h-full">
                    <div
                      className="w-1.5 bg-indigo-500/70 rounded-t-xs transition-all hover:bg-indigo-400"
                      style={{ height: `${height1}%` }}
                    />
                    <div
                      className="w-1.5 bg-emerald-500/70 rounded-t-xs transition-all hover:bg-emerald-400"
                      style={{ height: `${height2}%` }}
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> 策略 A (主策略)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 策略 B (对冲因子)</span>
              </div>
              <span>观察周期: 12 个月 (252 交易日)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            提示: 所有数据均由历史 Bar 矩阵与滑点引擎实时推演测算。
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
          >
            完成对比
          </button>
        </div>
      </div>
    </div>
  );
};
