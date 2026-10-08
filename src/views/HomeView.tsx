import { useState, useEffect } from 'react';
import { StockLogo } from '../components/common/StockLogo.tsx';
import { apiClient } from '../services/apiClient.ts';
import { ScreenerResultItem, MarketStatus } from '../types.ts';
import { Zap, TrendingDown, ArrowRight, Flame, Compass, Radar } from 'lucide-react';

interface HomeViewProps {
  onSelectStock: (ticker: string) => void;
  onNavigateScreenerPreset: (preset: 'OVERSOLD_20' | 'OVERSOLD_25' | 'OVERSOLD_30' | 'OVERSOLD_35' | 'OVERBOUGHT_70') => void;
  onNavigateTab: (tab: 'screener' | 'watchlist' | 'alerts') => void;
  onOpenRsiRadar: () => void;
  marketStatus?: MarketStatus | null;
}

export function HomeView({
  onSelectStock,
  onNavigateScreenerPreset,
  onNavigateTab,
  onOpenRsiRadar
}: HomeViewProps) {
  const [oversoldStocks, setOversoldStocks] = useState<ScreenerResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.runScreener({
      market: 'ALL',
      preset: 'OVERSOLD_35',
      pageSize: 8,
      sortBy: 'rsi',
      sortOrder: 'asc'
    }).then(res => {
      setOversoldStocks(res.results || []);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-5 px-4 pt-2 pb-6 bg-white min-h-screen">
      {/* 整合后的统一 RSI RADAR 核心功能主入口按钮 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radar className="w-3.5 h-3.5 text-indigo-500" />
            <span>RSI RADAR 全息扫描雷达</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/60">
            多周期矩阵
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenRsiRadar}
          className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl hover:shadow-2xl transition-all group cursor-pointer text-left border border-indigo-500/30"
        >
          {/* Background glowing radar circles */}
          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-indigo-500/10 pointer-events-none border border-indigo-400/20 group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute -right-14 -bottom-14 w-56 h-56 rounded-full bg-blue-500/5 pointer-events-none border border-blue-400/10" />

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner group-hover:scale-105 transition-transform">
                <Radar className="w-6 h-6 animate-pulse text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-wide text-white">RSI RADAR</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                    LIVE SCAN
                  </span>
                </div>
                <span className="text-xs text-indigo-200/90 font-medium mt-0.5">
                  点击启动全息超买超卖雷达矩阵
                </span>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-indigo-500 group-hover:text-white flex items-center justify-center text-indigo-300 transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Feature Specs Badges */}
          <div className="relative z-10 mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
            <div className="px-2.5 py-1 rounded-xl bg-white/10 text-[11px] font-mono text-slate-200 border border-white/10">
              <span className="text-indigo-300 font-bold">RSI参数: </span> 6 / 14 / 24
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-white/10 text-[11px] font-mono text-slate-200 border border-white/10">
              <span className="text-blue-300 font-bold">周期: </span> 30m / 1h / 2h / 4h / 1D / 1W
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-[11px] font-bold text-emerald-300 border border-emerald-500/30">
              超买超卖与背离实时筛选
            </div>
          </div>
        </button>
      </div>

      {/* Oversold Movers List */}
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            OVERSOLD MOVERS (RSI &lt; 35)
          </span>
          <button
            onClick={() => onNavigateTab('screener')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            View All
          </button>
        </div>

        <div className="flex flex-col divide-y divide-slate-100">
          {oversoldStocks.map(stock => (
            <div
              key={stock.ticker}
              onClick={() => onSelectStock(stock.ticker)}
              className="py-3.5 px-1 flex items-center justify-between hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <StockLogo ticker={stock.ticker} size="md" />
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                    {stock.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {stock.exchange}:{stock.ticker}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-600">
                      · RSI {stock.rsi.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="font-mono font-extrabold text-base text-slate-950 tabular-nums">
                  ${stock.price.toFixed(2)}
                </span>
                <span className={`text-xs font-mono font-bold tabular-nums mt-0.5 ${
                  stock.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
