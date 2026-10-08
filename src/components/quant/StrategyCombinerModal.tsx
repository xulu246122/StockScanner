import React, { useState } from 'react';
import { StrategyDefinition } from '../../types.ts';
import { X, Sliders, Layers, Play, Percent, ShieldCheck, Zap } from 'lucide-react';

interface StrategyCombinerModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStrategies: StrategyDefinition[];
  onApplyCompositeStrategy?: (compositeConfig: any) => void;
}

export const StrategyCombinerModal: React.FC<StrategyCombinerModalProps> = ({
  isOpen,
  onClose,
  allStrategies,
  onApplyCompositeStrategy
}) => {
  const [selectedItems, setSelectedItems] = useState<{ id: string; weight: number }[]>([
    { id: allStrategies[0]?.id || 'donchian_breakout', weight: 40 },
    { id: allStrategies[1]?.id || 'darvas_box', weight: 35 },
    { id: allStrategies[2]?.id || 'rsi_2_mean_reversion', weight: 25 }
  ]);

  if (!isOpen) return null;

  const totalWeight = selectedItems.reduce((acc, item) => acc + item.weight, 0);

  const handleWeightChange = (id: string, newWeight: number) => {
    setSelectedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, weight: Math.max(0, Math.min(100, newWeight)) } : item))
    );
  };

  const handleToggleStrategy = (id: string) => {
    const exists = selectedItems.find(item => item.id === id);
    if (exists) {
      if (selectedItems.length > 1) {
        setSelectedItems(prev => prev.filter(item => item.id !== id));
      }
    } else {
      if (selectedItems.length < 5) {
        setSelectedItems(prev => [...prev, { id, weight: 20 }]);
      }
    }
  };

  const handleRunCombination = () => {
    if (onApplyCompositeStrategy) {
      onApplyCompositeStrategy({
        selectedItems,
        totalWeight
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                多策略组合配置器 (STRATEGY COMBINER & ALPHA ENGINE)
              </h2>
              <p className="text-xs text-slate-400">
                按不同权重将趋势、动能、均值回归与因子模型融合成综合 Composite Alpha 评分
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Strategy Weight Allocation Sliders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                1. 组合策略权重分配 (WEIGHT ALLOCATION)
              </span>
              <span className={`text-xs font-mono font-bold ${totalWeight === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                当前总权重: {totalWeight}% {totalWeight !== 100 && '(建议调整至 100%)'}
              </span>
            </div>

            <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              {selectedItems.map(item => {
                const strategy = allStrategies.find(s => s.id === item.id);
                if (!strategy) return null;

                return (
                  <div key={item.id} className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{strategy.shortName || strategy.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {strategy.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.weight}
                          onChange={e => handleWeightChange(item.id, Number(e.target.value))}
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-right font-mono font-bold text-emerald-400 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-xs text-slate-400 font-mono">%</span>
                      </div>
                    </div>

                    {/* Weight Slider */}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={item.weight}
                      onChange={e => handleWeightChange(item.id, Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strategy Selection Toggles */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              2. 添加/移除组合子策略 (MAX 5 STRATEGIES)
            </span>
            <div className="flex flex-wrap gap-2">
              {allStrategies.map(st => {
                const isSelected = selectedItems.some(i => i.id === st.id);
                return (
                  <button
                    key={st.id}
                    onClick={() => handleToggleStrategy(st.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'bg-slate-800/40 text-slate-400 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <span>{st.shortName || st.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Correlation Matrix Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                3. 策略收益相关性矩阵 (CORRELATION MATRIX)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">相关性低 (&lt; 0.3) 具备更优组合对冲效果</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-2 bg-slate-900/40 font-bold text-slate-400">子策略</div>
              {selectedItems.map(item => (
                <div key={item.id} className="p-2 bg-slate-900/80 font-bold text-indigo-300 truncate">
                  {allStrategies.find(s => s.id === item.id)?.shortName || item.id}
                </div>
              ))}

              {selectedItems.map((rowItem, rIdx) => (
                <React.Fragment key={rowItem.id}>
                  <div className="p-2 bg-slate-900/80 font-bold text-indigo-300 text-left truncate">
                    {allStrategies.find(s => s.id === rowItem.id)?.shortName || rowItem.id}
                  </div>
                  {selectedItems.map((colItem, cIdx) => {
                    const corr = rIdx === cIdx ? 1.0 : Number((0.15 + (rIdx + cIdx) * 0.12).toFixed(2));
                    return (
                      <div
                        key={colItem.id}
                        className={`p-2 rounded font-bold ${
                          corr === 1.0
                            ? 'bg-slate-800 text-slate-400'
                            : corr < 0.35
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        {corr.toFixed(2)}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            合成后的 Composite Alpha 信号将自动注入 Screener 选股与预警引擎。
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleRunCombination}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>应用组合策略选股</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
