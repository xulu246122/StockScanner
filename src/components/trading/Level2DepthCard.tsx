import React, { useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient.ts';
import { OrderBookSnapshot, OrderBookImbalanceAnalysis } from '../../types/trading.ts';
import { Layers, ShieldCheck, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';

interface Level2DepthCardProps {
  symbol: string;
  currentPrice: number;
}

export const Level2DepthCard: React.FC<Level2DepthCardProps> = ({ symbol, currentPrice }) => {
  const [snapshot, setSnapshot] = useState<OrderBookSnapshot | null>(null);
  const [imbalance, setImbalance] = useState<OrderBookImbalanceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDepth = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getL2Depth(symbol);
      if (res.success) {
        setSnapshot(res.snapshot);
        setImbalance(res.imbalance);
      }
    } catch (err) {
      console.error('Failed to load L2 depth:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepth();
    const timer = setInterval(fetchDepth, 8000);
    return () => clearInterval(timer);
  }, [symbol]);

  if (!snapshot || !imbalance) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-slate-500">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
        正在连接 Level 2 深度盘口...
      </div>
    );
  }

  const obiPct = (imbalance.obi * 100).toFixed(1);
  const isBullish = imbalance.obi >= 0;
  const maxBidSize = Math.max(...snapshot.bids.map(b => b.size), 1);
  const maxAskSize = Math.max(...snapshot.asks.map(a => a.size), 1);
  const maxTotalSize = Math.max(maxBidSize, maxAskSize);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-900 tracking-tight">
            Level 2 深度买卖盘不平衡度 (OBI)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
            {symbol}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500">
            微观价: <span className="font-bold text-slate-800">${snapshot.microPrice.toFixed(2)}</span>
          </span>
          <button
            type="button"
            onClick={fetchDepth}
            disabled={loading}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
            title="刷新盘口"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* OBI Imbalance Gauge */}
      <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-600">
            盘口买卖失衡率 (OBI):
          </span>
          <span className={`font-mono font-bold ${isBullish ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isBullish ? `+${obiPct}% (买方占优)` : `${obiPct}% (卖方压制)`}
          </span>
        </div>
        
        {/* Progress Bar centered around 50% */}
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${Math.max(5, Math.min(95, ((imbalance.obi + 1) / 2) * 100))}%` }}
          />
          <div
            className="bg-rose-500 transition-all duration-300"
            style={{ width: `${Math.max(5, Math.min(95, (1 - (imbalance.obi + 1) / 2) * 100))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>买方挂单量: {imbalance.bidVolumeSum.toLocaleString()} 股</span>
          <span>卖方挂单量: {imbalance.askVolumeSum.toLocaleString()} 股</span>
        </div>
      </div>

      {/* Wall Detection Alerts */}
      <div className="flex items-center gap-2 flex-wrap">
        {imbalance.bidWall && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              <strong>买盘托盘墙</strong>: ${imbalance.bidWall.price.toFixed(2)} ({imbalance.bidWall.multipleOfAverage}x 均量, {imbalance.bidWall.size.toLocaleString()}股)
            </span>
          </div>
        )}
        {imbalance.askWall && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>
              <strong>卖盘压制墙</strong>: ${imbalance.askWall.price.toFixed(2)} ({imbalance.askWall.multipleOfAverage}x 均量, {imbalance.askWall.size.toLocaleString()}股)
            </span>
          </div>
        )}
        {imbalance.isReboundConfirmed && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold">
            <span>✨ 暴跌反弹微观托底确认</span>
          </div>
        )}
      </div>

      {/* 5-Level Depth Ladder Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        {/* Bids Column */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-emerald-700 flex justify-between px-1 border-b border-emerald-100 pb-0.5">
            <span>买量 (Bids)</span>
            <span>买价</span>
          </div>
          {snapshot.bids.map((b, idx) => {
            const fillWidth = Math.round((b.size / maxTotalSize) * 100);
            return (
              <div
                key={`bid-${idx}`}
                className="relative flex items-center justify-between px-1.5 py-0.5 rounded overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-emerald-50 -z-10 transition-all duration-200"
                  style={{ width: `${fillWidth}%`, right: 0 }}
                />
                <span className="text-slate-600 z-10">{b.size.toLocaleString()}</span>
                <span className="font-bold text-emerald-700 z-10">${b.price.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        {/* Asks Column */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-rose-700 flex justify-between px-1 border-b border-rose-100 pb-0.5">
            <span>卖价</span>
            <span>卖量 (Asks)</span>
          </div>
          {snapshot.asks.map((a, idx) => {
            const fillWidth = Math.round((a.size / maxTotalSize) * 100);
            return (
              <div
                key={`ask-${idx}`}
                className="relative flex items-center justify-between px-1.5 py-0.5 rounded overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-rose-50 -z-10 transition-all duration-200"
                  style={{ width: `${fillWidth}%` }}
                />
                <span className="font-bold text-rose-700 z-10">${a.price.toFixed(2)}</span>
                <span className="text-slate-600 z-10">{a.size.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
