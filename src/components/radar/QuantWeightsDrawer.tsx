import React from 'react';
import { RankingWeights } from '../../types.ts';
import { Sliders, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';

interface QuantWeightsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  weights: RankingWeights;
  onChange: (weights: RankingWeights) => void;
  onReset: () => void;
}

export const QuantWeightsDrawer: React.FC<QuantWeightsDrawerProps> = ({
  isOpen,
  onClose,
  weights,
  onChange,
  onReset
}) => {
  if (!isOpen) return null;

  const weightKeys: Array<{ key: keyof RankingWeights; label: string; desc: string }> = [
    { key: 'relativeStrength', label: '相对强弱 Alpha', desc: '跑赢标普SPY与RS Rank排名' },
    { key: 'momentum', label: '动能振荡器', desc: 'RSI区间甜区 + MACD柱状线动量' },
    { key: 'volume', label: '量能与流动性', desc: 'RVOL爆发倍数 + 日均成交额' },
    { key: 'trend', label: '均线群排列', desc: 'EMA20/50/200多头对齐程度' },
    { key: 'sector', label: '行业轮动', desc: '所属行业板块整体相对强弱' },
    { key: 'structure', label: '形态与新高', desc: '距52周新高距离与收盘位置' },
    { key: 'volatility', label: '波动率适配', desc: 'ATR%在1.8%~4.5%最佳交易波幅' }
  ];

  const updateWeight = (key: keyof RankingWeights, value: number) => {
    onChange({
      ...weights,
      [key]: value / 100
    });
  };

  const totalSum = Object.values(weights).reduce((a, b) => (a || 0) + (b || 0), 0) * 100;

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl mb-4 animate-in fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">量化多因子评分权重配置 (Quant Ranking Weights)</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            当前权重总和: <strong className={Math.abs(totalSum - 100) < 1 ? 'text-emerald-400' : 'text-amber-400'}>{Math.round(totalSum)}%</strong>
          </span>
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>默认平衡</span>
          </button>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800"
          >
            收起
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        {weightKeys.map(({ key, label, desc }) => {
          const currentVal = Math.round(((weights[key] ?? 0.15) * 100));
          return (
            <div key={key} className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-1">
                <span>{label}</span>
                <span className="font-mono text-emerald-400">{currentVal}%</span>
              </div>
              <p className="text-[10px] text-slate-500 mb-2">{desc}</p>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={currentVal}
                onChange={(e) => updateWeight(key, Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
