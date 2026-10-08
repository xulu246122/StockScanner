import { ScreenerResultItem } from '../../types.ts';
import { StockLogo } from '../common/StockLogo.tsx';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Bell,
  Star,
  BarChart2
} from 'lucide-react';

interface ScreenerTableProps {
  items: ScreenerResultItem[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  rsiPeriod?: number;
  onSortChange: (column: any) => void;
  onSelectStock: (ticker: string) => void;
  onOpenAlertModal: (ticker: string, name: string, rsi: number) => void;
  watchlistTickers?: string[];
  onToggleWatchlist?: (ticker: string) => void;
}

export function ScreenerTable({
  items,
  sortBy,
  sortOrder,
  rsiPeriod = 14,
  onSortChange,
  onSelectStock,
  onOpenAlertModal,
  watchlistTickers = [],
  onToggleWatchlist
}: ScreenerTableProps) {
  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return (
      <span className="ml-1 text-blue-600 font-bold">
        {sortOrder === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return (
    <div className="w-full">
      {/* DESKTOP VIEW: High-Density Institutional Table (Hidden on Mobile) */}
      <div className="hidden lg:block bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden mb-6">
        <div className="overflow-x-auto max-h-[calc(100vh-270px)] min-h-[460px] overflow-y-auto">
          <table className="w-full text-left border-collapse select-none">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200">
              <tr className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th
                  onClick={() => onSortChange('ticker')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 group"
                >
                  <div className="flex items-center">
                    <span>标的 (Ticker)</span>
                    {renderSortIcon('ticker')}
                  </div>
                </th>

                <th
                  onClick={() => onSortChange('price')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 text-right group"
                >
                  <div className="flex items-center justify-end">
                    <span>现价 (Price)</span>
                    {renderSortIcon('price')}
                  </div>
                </th>

                <th
                  onClick={() => onSortChange('changePercent')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 text-right group"
                >
                  <div className="flex items-center justify-end">
                    <span>涨跌幅 (Chg%)</span>
                    {renderSortIcon('changePercent')}
                  </div>
                </th>

                <th
                  onClick={() => onSortChange('rsi')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 group"
                >
                  <div className="flex items-center">
                    <span>Wilder RSI({rsiPeriod})</span>
                    {renderSortIcon('rsi')}
                  </div>
                </th>

                <th
                  onClick={() => onSortChange('relativeVolume')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 text-right group"
                >
                  <div className="flex items-center justify-end">
                    <span>相对量比 (RelVol)</span>
                    {renderSortIcon('relativeVolume')}
                  </div>
                </th>

                <th className="py-3 px-3 text-right">
                  <span>ATR (14) 波动</span>
                </th>

                <th
                  onClick={() => onSortChange('marketCap')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 text-right group"
                >
                  <div className="flex items-center justify-end">
                    <span>总市值 (Mkt Cap)</span>
                    {renderSortIcon('marketCap')}
                  </div>
                </th>

                <th className="py-3 px-3">
                  <span>多周期趋势</span>
                </th>

                <th className="py-3 px-3">
                  <span>当前交易形态</span>
                </th>

                <th className="py-3 px-4 text-right">
                  <span>快捷操作</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {items.map((stock) => {
                const isWatchlisted = watchlistTickers.includes(stock.ticker);
                const isPositive = stock.changePercent >= 0;

                return (
                  <tr
                    key={stock.ticker}
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                    onClick={() => onSelectStock(stock.ticker)}
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <StockLogo ticker={stock.ticker} name={stock.name} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {stock.ticker}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-500 font-mono">
                              {stock.exchange}
                            </span>
                          </div>
                          <span className="block text-[11px] text-slate-400 truncate max-w-[130px]">
                            {stock.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                      ${stock.price.toFixed(2)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-black">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`font-mono font-black text-xs px-2 py-0.5 rounded-full border ${
                            stock.rsi <= 30
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : stock.rsi >= 70
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {stock.rsi.toFixed(1)}
                        </span>

                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden relative hidden xl:block">
                          <div
                            className={`h-full rounded-full ${
                              stock.rsi <= 30
                                ? 'bg-emerald-500'
                                : stock.rsi >= 70
                                ? 'bg-rose-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, stock.rsi))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">
                      <span className={`${(stock.relativeVolume ?? 1) >= 1.4 ? 'text-blue-600 font-extrabold' : ''}`}>
                        {(stock.relativeVolume ?? 1.0).toFixed(1)}x
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                      {stock.atrPercent ? `${stock.atrPercent.toFixed(1)}%` : '--'}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-bold">
                      ${formatNumber(stock.marketCap)}
                    </td>

                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          stock.trend === 'BULLISH'
                            ? 'bg-emerald-50 text-emerald-700'
                            : stock.trend === 'BEARISH'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {stock.trend === 'BULLISH' ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-rose-600" />}
                        {stock.trend === 'BULLISH' ? '多头排列' : stock.trend === 'BEARISH' ? '空头下行' : '中性震荡'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      {stock.strategyState ? (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md inline-block whitespace-nowrap ${
                              stock.strategyState === 'TRIGGERED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : stock.strategyState === 'NEAR_TRIGGER'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {stock.strategyEvaluation?.stateLabel || stock.strategyState}
                          </span>
                          {stock.confluenceScore !== undefined && (
                            <span className="text-[10px] font-mono text-slate-400">
                              一致性: {stock.confluenceScore}/100
                            </span>
                          )}
                        </div>
                      ) : stock.activeSetup ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {stock.activeSetup}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px]">观察蓄势</span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {onToggleWatchlist && (
                          <button
                            type="button"
                            onClick={() => onToggleWatchlist(stock.ticker)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isWatchlisted
                                ? 'text-amber-500 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                : 'text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                            title={isWatchlisted ? '从自选移除' : '加入自选'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.rsi)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                          title="设定智能预警"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectStock(stock.ticker)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="打开 K 线图表"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE VIEW: Compact Interactive Cards (Hidden on Desktop) */}
      <div className="lg:hidden space-y-2.5">
        {items.map((stock) => {
          const isWatchlisted = watchlistTickers.includes(stock.ticker);
          const isPositive = stock.changePercent >= 0;

          return (
            <div
              key={stock.ticker}
              onClick={() => onSelectStock(stock.ticker)}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all cursor-pointer flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <StockLogo ticker={stock.ticker} name={stock.name} size="sm" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 text-sm">{stock.ticker}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                        {stock.exchange}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 truncate max-w-[150px] block">{stock.name}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-black text-slate-900 text-sm">
                    ${stock.price.toFixed(2)}
                  </div>
                  <span
                    className={`inline-block font-mono text-xs font-bold ${
                      isPositive ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-black px-2.5 py-0.5 rounded-full border text-[11px] flex items-center gap-1 ${
                      stock.rsi <= 30
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : stock.rsi >= 70
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] opacity-70 font-semibold">RSI({rsiPeriod})</span>
                    <span>{stock.rsi.toFixed(1)}</span>
                  </span>
                  {stock.strategyState && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {stock.strategyState}
                    </span>
                  )}
                  <span className="text-slate-400 text-[11px]">
                    量比: <span className="text-slate-700 font-bold">{(stock.relativeVolume ?? stock.rvol ?? 1.0).toFixed(1)}x</span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {onToggleWatchlist && (
                    <button
                      type="button"
                      onClick={() => onToggleWatchlist(stock.ticker)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500"
                    >
                      <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500 text-amber-500' : ''}`} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.rsi)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
