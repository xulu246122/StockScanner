import { useState, useMemo } from 'react';
import { X, ShieldAlert, CheckCircle2, DollarSign, Calculator, Percent } from 'lucide-react';

interface PositionSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  currentPrice: number;
}

export function PositionSizeModal({
  isOpen,
  onClose,
  ticker,
  currentPrice
}: PositionSizeModalProps) {
  const [accountSize, setAccountSize] = useState<number>(100000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<number>(currentPrice || 100);
  const [stopLossPrice, setStopLossPrice] = useState<number>(
    Number(((currentPrice || 100) * 0.98).toFixed(2))
  );

  // Sync if currentPrice changes when opened
  useMemo(() => {
    if (currentPrice > 0) {
      setEntryPrice(currentPrice);
      setStopLossPrice(Number((currentPrice * 0.98).toFixed(2)));
    }
  }, [currentPrice]);

  if (!isOpen) return null;

  const riskCapital = (accountSize * riskPercent) / 100;
  const riskPerShare = Math.max(0.01, Math.abs(entryPrice - stopLossPrice));
  const stopDistancePercent = Number(((riskPerShare / entryPrice) * 100).toFixed(2));
  const isRiskExceeded = stopDistancePercent > 5.0;

  const shares = Math.floor(riskCapital / riskPerShare);
  const positionValue = shares * entryPrice;
  const exposurePercent = Number(((positionValue / accountSize) * 100).toFixed(1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-5 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                仓位与风控计算器 ({ticker})
              </h3>
              <p className="text-[10px] text-slate-400">基于账户总额与单笔固定风险比率精确计算持股数</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              账户总资产 (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-mono">$</span>
              <input
                type="number"
                value={accountSize}
                onChange={(e) => setAccountSize(Math.max(100, Number(e.target.value)))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              单笔最大承受风险 (%)
            </label>
            <div className="flex items-center gap-1">
              {[0.5, 1.0, 1.5, 2.0].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setRiskPercent(pct)}
                  className={`flex-1 py-1 rounded-lg font-mono text-[11px] font-bold border transition-all cursor-pointer ${
                    riskPercent === pct
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              拟入场价 (Entry Price)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-mono">$</span>
              <input
                type="number"
                step="0.01"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Math.max(0.01, Number(e.target.value)))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">
              防守止损价 (Stop Loss)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-mono">$</span>
              <input
                type="number"
                step="0.01"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(Math.max(0.01, Number(e.target.value)))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-1.5 font-mono font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* 5% Rule Warning */}
        {isRiskExceeded ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">风控违规：止损幅度已达 {stopDistancePercent}%</span>
              <span className="text-[11px] text-rose-700">
                本终端强制执行 5.0% 最大硬止损保护，当前止损距离过远，建议缩小仓位或等待更好结构。
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-center gap-2 text-xs text-emerald-800 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>结构止损幅度 {stopDistancePercent}%，在 5.0% 安全风控阈值内</span>
          </div>
        )}

        {/* Result Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center font-mono">
          <div>
            <span className="text-[10px] font-sans text-slate-400 block uppercase">建议建仓股数</span>
            <span className="text-base font-black text-blue-600 block mt-0.5">
              {shares.toLocaleString()} 股
            </span>
          </div>

          <div>
            <span className="text-[10px] font-sans text-slate-400 block uppercase">建仓占用资金</span>
            <span className="text-base font-black text-slate-900 block mt-0.5">
              ${positionValue.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-sans text-slate-400 block uppercase">最大风险亏损</span>
            <span className="text-base font-black text-rose-600 block mt-0.5">
              ${riskCapital.toFixed(0)}
            </span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between px-1">
          <span>总仓位资金暴露率: <strong className="text-slate-700">{exposurePercent}%</strong></span>
          <span>每股风险差价: <strong className="text-slate-700">${riskPerShare.toFixed(2)}</strong></span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          确定并返回技术分析
        </button>
      </div>
    </div>
  );
}
