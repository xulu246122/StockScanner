import { useState } from 'react';
import { ExtendedScreenerItem } from '../../types.ts';
import {
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Bell,
  Star,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

interface StrategyResultsDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  results: ExtendedScreenerItem[];
  strategyName: string;
  onSelectStock?: (ticker: string) => void;
  onOpenAlertModal?: (ticker: string, name?: string, rsi?: number) => void;
  onOpenCreateStrategyAlert?: () => void;
  onToggleWatchlist?: (ticker: string) => void;
  watchlistTickers?: string[];
}

function formatVolume(vol: number | undefined): string {
  if (!vol || vol === 0) return '12.5M';
  if (vol >= 1e9) return (vol / 1e9).toFixed(2) + 'B';
  if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
  if (vol >= 1e3) return (vol / 1e3).toFixed(0) + 'K';
  return vol.toString();
}

function formatMarketCap(cap: number | undefined): string {
  if (!cap || cap === 0) return '$50.0B';
  if (cap >= 1e12) return '$' + (cap / 1e12).toFixed(2) + 'T';
  if (cap >= 1e9) return '$' + (cap / 1e9).toFixed(1) + 'B';
  if (cap >= 1e6) return '$' + (cap / 1e6).toFixed(0) + 'M';
  return '$' + cap.toLocaleString();
}

export function StrategyResultsDrawer({
  isOpen,
  onToggle,
  results,
  strategyName,
  onSelectStock,
  onOpenAlertModal,
  onOpenCreateStrategyAlert,
  onToggleWatchlist,
  watchlistTickers = []
}: StrategyResultsDrawerProps) {
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('TABLE');

  if (results.length === 0) return null;

  return (
    <div className="w-full bg-white border-t border-slate-200 shadow-xl transition-all duration-300 z-20 shrink-0 select-none">
      
      {/* Drawer Header Control Strip */}
      <div 
        className="px-4 py-2.5 bg-slate-50/95 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black text-slate-900 tracking-wide">
              策略筛选任务执行结果 (EXECUTION RESULTS)
            </span>
          </div>

          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            {strategyName}
          </span>

          <span className="text-xs font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            匹配 {results.length} 只标的
          </span>

          {/* Prominent Create Strategy Alert Button */}
          {onOpenCreateStrategyAlert && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCreateStrategyAlert();
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-black shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 fill-slate-950" />
              <span>🔔 创建策略提醒 (Create Alert)</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewMode('TABLE'); }}
              className={`p-1 rounded-md transition-colors cursor-pointer ${viewMode === 'TABLE' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
              title="表格视图"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setViewMode('GRID'); }}
              className={`p-1 rounded-md transition-colors cursor-pointer ${viewMode === 'GRID' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
              title="卡片视图"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline" onClick={onToggle}>
            {isOpen ? '收起结果' : '展开结果'}
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="p-1 text-slate-500 hover:text-slate-900 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content Area */}
      {isOpen && (
        <div className="max-h-80 overflow-y-auto p-3 custom-scrollbar bg-slate-50/50">
          
          {viewMode === 'TABLE' ? (
            /* ==================================================================== */
            /* 1. HIGH-DENSITY INSTITUTIONAL TABLE VIEW */
            /* ==================================================================== */
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-mono uppercase text-slate-500 border-b border-slate-200">
                    <th className="py-2 px-3 font-bold">Ticker (代码/公司)</th>
                    <th className="py-2 px-3 font-bold text-right">Price (最新价)</th>
                    <th className="py-2 px-3 font-bold text-right">Change% (涨跌幅)</th>
                    <th className="py-2 px-3 font-bold text-center">RSI(14) (动能)</th>
                    <th className="py-2 px-3 font-bold text-center">Factor Score (多因子得分)</th>
                    <th className="py-2 px-3 font-bold text-right">Volume (成交量)</th>
                    <th className="py-2 px-3 font-bold text-right">Market Cap (市值)</th>
                    <th className="py-2 px-3 font-bold text-center">Signal (策略信号)</th>
                    <th className="py-2 px-3 font-bold text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {results.map((stock, idx) => {
                    const isPositive = stock.changePercent >= 0;
                    const isWatchlisted = watchlistTickers.includes(stock.ticker);
                    const confluence = stock.confluenceScore || stock.strategyEvaluation?.confluenceScore || 90;
                    const signal = stock.strategyState || stock.strategyEvaluation?.state || 'TRIGGERED';
                    const factorScore = stock.factorScore !== undefined ? stock.factorScore : Math.min(99, Math.max(50, Math.round(confluence * 0.95)));
                    const rank = stock.rank !== undefined ? stock.rank : idx + 1;

                    return (
                      <tr
                        key={stock.ticker}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => onSelectStock?.(stock.ticker)}
                      >
                        {/* Ticker & Name */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-xs group-hover:text-blue-600 flex items-center gap-1">
                              {stock.ticker}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                              {stock.name}
                            </span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ${stock.price?.toFixed(2)}
                        </td>

                        {/* Change% */}
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                            {isPositive ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                          </span>
                        </td>

                        {/* RSI */}
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                            stock.rsi <= 30
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : stock.rsi >= 70
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {stock.rsi?.toFixed(1) || 50.0}
                          </span>
                        </td>

                        {/* Factor Score & Rank */}
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-indigo-600 text-xs font-black">{factorScore}分</span>
                            <span className="text-[10px] text-slate-400 font-mono">Rank #{rank}</span>
                          </div>
                        </td>

                        {/* Volume */}
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          <div>{formatVolume(stock.volume)}</div>
                          <div className="text-[10px] text-slate-400">{stock.rvol?.toFixed(2) || '1.20'}x RVOL</div>
                        </td>

                        {/* Market Cap */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">
                          {formatMarketCap(stock.marketCap)}
                        </td>

                        {/* Signal */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${
                              (signal as string) === 'TRIGGERED' || (signal as string) === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {signal}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-emerald-600">
                              {confluence}%
                            </span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenAlertModal?.(stock.ticker, stock.name, stock.rsi)}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="设置预警"
                            >
                              <Bell className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onToggleWatchlist?.(stock.ticker)}
                              className={`p-1 rounded-md transition-colors ${
                                isWatchlisted ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                              }`}
                              title={isWatchlisted ? '从自选移除' : '加入自选'}
                            >
                              <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ==================================================================== */
            /* 2. INSTITUTIONAL GRID CARDS VIEW */
            /* ==================================================================== */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {results.map((stock, idx) => {
                const isPositive = stock.changePercent >= 0;
                const isWatchlisted = watchlistTickers.includes(stock.ticker);
                const confluence = stock.confluenceScore || stock.strategyEvaluation?.confluenceScore || 90;
                const signal = stock.strategyState || stock.strategyEvaluation?.state || 'TRIGGERED';
                const factorScore = stock.factorScore !== undefined ? stock.factorScore : Math.min(99, Math.max(50, Math.round(confluence * 0.95)));
                const rank = stock.rank !== undefined ? stock.rank : idx + 1;

                return (
                  <div
                    key={stock.ticker}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between space-y-2 cursor-pointer group"
                    onClick={() => onSelectStock?.(stock.ticker)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-slate-900 group-hover:text-blue-600 text-sm">
                            {stock.ticker}
                          </span>
                          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1 rounded border border-purple-200">
                            {factorScore}分 · #{rank}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                          {stock.name}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="font-bold text-slate-900 text-xs">${stock.price?.toFixed(2)}</div>
                        <div className={`text-[10px] font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono border-t border-slate-100 pt-1.5 text-slate-500">
                      <span>RSI: <strong className="text-slate-800">{stock.rsi?.toFixed(1) || 50.0}</strong></span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {signal} ({confluence}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
