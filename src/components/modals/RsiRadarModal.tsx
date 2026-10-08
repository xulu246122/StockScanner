import { useState, useEffect } from 'react';
import { 
  X, 
  Radar, 
  Search, 
  RefreshCw, 
  Star, 
  Bell, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingDown,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { StockLogo } from '../common/StockLogo.tsx';
import { apiClient } from '../../services/apiClient.ts';
import { ScreenerResultItem, Timeframe } from '../../types.ts';

interface RsiRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock: (ticker: string) => void;
  onOpenAlertModal: (ticker: string, stockName?: string, currentRsi?: number) => void;
  watchlistTickers: string[];
  onToggleWatchlist: (ticker: string) => void;
}

type RadarSignalFilter = 'ALL' | 'OVERSOLD_20' | 'OVERSOLD_30' | 'NEUTRAL' | 'OVERBOUGHT_70' | 'OVERBOUGHT_80';

export function RsiRadarModal({
  isOpen,
  onClose,
  onSelectStock,
  onOpenAlertModal,
  watchlistTickers,
  onToggleWatchlist
}: RsiRadarModalProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<6 | 14 | 24>(14);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');
  const [selectedSignal, setSelectedSignal] = useState<RadarSignalFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [stocks, setStocks] = useState<ScreenerResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRadarData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      let presetParam: any = undefined;
      let rsiOperator: any = undefined;
      let rsiValue: number | undefined = undefined;
      let rsiMin: number | undefined = undefined;
      let rsiMax: number | undefined = undefined;

      if (selectedSignal === 'OVERSOLD_20') {
        presetParam = 'OVERSOLD_20';
        rsiOperator = '<=';
        rsiValue = 20;
      } else if (selectedSignal === 'OVERSOLD_30') {
        presetParam = 'OVERSOLD_30';
        rsiOperator = '<=';
        rsiValue = 30;
      } else if (selectedSignal === 'NEUTRAL') {
        rsiOperator = 'BETWEEN';
        rsiMin = 30;
        rsiMax = 70;
      } else if (selectedSignal === 'OVERBOUGHT_70') {
        presetParam = 'OVERBOUGHT_70';
        rsiOperator = '>=';
        rsiValue = 70;
      } else if (selectedSignal === 'OVERBOUGHT_80') {
        presetParam = 'OVERBOUGHT_80';
        rsiOperator = '>=';
        rsiValue = 80;
      }

      const res = await apiClient.runScreener({
        market: 'ALL',
        sector: 'ALL',
        timeframe: selectedTimeframe,
        rsiPeriod: selectedPeriod,
        preset: presetParam,
        rsiOperator,
        rsiValue,
        rsiMin,
        rsiMax,
        pageSize: 100,
        sortBy: selectedSignal.includes('OVERBOUGHT') ? 'rsi' : 'rsi',
        sortOrder: selectedSignal.includes('OVERBOUGHT') ? 'desc' : 'asc'
      });

      setStocks(res.results || []);
    } catch (err) {
      console.error('RSI Radar scan failed:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRadarData();
    }
  }, [isOpen, selectedPeriod, selectedTimeframe, selectedSignal]);

  if (!isOpen) return null;

  const filteredStocks = stocks.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  });

  const getRsiColor = (rsi: number) => {
    if (rsi <= 20) return 'text-emerald-700 bg-emerald-500';
    if (rsi <= 30) return 'text-emerald-600 bg-emerald-400';
    if (rsi >= 80) return 'text-rose-700 bg-rose-500';
    if (rsi >= 70) return 'text-rose-600 bg-rose-400';
    return 'text-slate-600 bg-slate-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden">
        
        {/* 1. Header with dynamic radar theme */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Radar className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-ping" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide">RSI RADAR 全息扫描</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono font-bold">
                  Wilder RSI
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                美股超买超卖极值 · 多周期雷达矩阵
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Interactive Control Bar */}
        <div className="bg-slate-50/95 border-b border-slate-200 p-3 space-y-2.5">
          {/* Row A: RSI 周期选择 (RSI 6 / 14 / 24) */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">RSI 指标周期:</span>
            <div className="flex items-center gap-1.5 flex-1 justify-end">
              {([
                { period: 6, label: 'RSI 6 (敏锐短线)' },
                { period: 14, label: 'RSI 14 (标准经典)' },
                { period: 24, label: 'RSI 24 (波段趋势)' }
              ] as const).map(item => (
                <button
                  key={item.period}
                  type="button"
                  onClick={() => setSelectedPeriod(item.period)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedPeriod === item.period
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row B: 时间级别 (Timeframe: 30m / 1h / 2h / 4h / 1D / 1W) */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">时间K线周期:</span>
            <div className="grid grid-cols-6 gap-1 flex-1">
              {(['30m', '1h', '2h', '4h', '1D', '1W'] as Timeframe[]).map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`py-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedTimeframe === tf
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-black'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Row C: 信号模式过滤 */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {([
              { id: 'ALL', label: '全部标的' },
              { id: 'OVERSOLD_20', label: '极度超卖 ≤20' },
              { id: 'OVERSOLD_30', label: '经典超卖 ≤30' },
              { id: 'NEUTRAL', label: '中性蓄势 30-70' },
              { id: 'OVERBOUGHT_70', label: '经典超买 ≥70' },
              { id: 'OVERBOUGHT_80', label: '极度超买 ≥80' }
            ] as const).map(sig => (
              <button
                key={sig.id}
                type="button"
                onClick={() => setSelectedSignal(sig.id)}
                className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedSignal === sig.id
                    ? sig.id.includes('OVERSOLD')
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : sig.id.includes('OVERBOUGHT')
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {sig.label}
              </button>
            ))}
          </div>

          {/* Row D: 快速搜索与实时刷新状态 */}
          <div className="flex items-center gap-2 pt-0.5">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="在雷达中筛选股票代码或名称..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-7 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-xs font-mono text-slate-500">
              <span className="font-bold text-slate-800">匹配 {filteredStocks.length} 只</span>
              <button
                type="button"
                onClick={() => fetchRadarData(true)}
                disabled={isRefreshing}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
                title="重新扫描"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Stock List with Visual RSI Bar */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
          {isLoading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-mono">全息扫描美股 RSI 指标 ({selectedPeriod}) · 周期 {selectedTimeframe}...</span>
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-2xl border border-slate-200/80 p-6">
              <Sliders className="w-8 h-8 text-slate-300" />
              <span className="text-sm font-bold text-slate-700">未发现符合当前雷达条件的标的</span>
              <p className="text-xs text-slate-400">
                可尝试切换 RSI 周期 (6/14/24)、时间级别或将信号筛选改为「全部标的」。
              </p>
            </div>
          ) : (
            filteredStocks.map((stock) => {
              const isWatchlisted = watchlistTickers.includes(stock.ticker);
              const rsiVal = stock.rsi;
              const isOversold = rsiVal <= 30;
              const isOverbought = rsiVal >= 70;

              return (
                <div
                  key={stock.ticker}
                  className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs hover:shadow-sm transition-all flex flex-col gap-2 hover:border-indigo-300 group cursor-pointer"
                  onClick={() => {
                    onSelectStock(stock.ticker);
                    onClose();
                  }}
                >
                  {/* Top info line */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <StockLogo ticker={stock.ticker} size="sm" />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {stock.ticker}
                          </span>
                          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                            {stock.exchange}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 truncate max-w-[170px]">
                          {stock.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-extrabold text-sm text-slate-950">
                          ${stock.price.toFixed(2)}
                        </div>
                        <div className={`text-[11px] font-mono font-bold flex items-center justify-end gap-0.5 ${
                          stock.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {stock.changePercent >= 0 ? (
                            <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
                          )}
                          <span>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                        </div>
                      </div>

                      {/* Watchlist Star */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(stock.ticker);
                        }}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                          isWatchlisted
                            ? 'bg-amber-50 border-amber-300 text-amber-500'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                        title={isWatchlisted ? '从自选移除' : '添加至自选'}
                      >
                        <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-400' : ''}`} />
                      </button>

                      {/* Alert Bell */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAlertModal(stock.ticker, stock.name, stock.rsi);
                        }}
                        className="p-1.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                        title="为此标的创建 RSI 预警"
                      >
                        <Bell className="w-3.5 h-3.5 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom: Visual RSI Gauge & Status */}
                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-slate-400">
                        RSI({selectedPeriod} · {selectedTimeframe}):
                      </span>
                      <span className={`text-xs font-mono font-black ${
                        isOversold ? 'text-emerald-600' : isOverbought ? 'text-rose-600' : 'text-slate-700'
                      }`}>
                        {rsiVal.toFixed(1)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        rsiVal <= 20 
                          ? 'bg-emerald-100 text-emerald-800'
                          : rsiVal <= 30
                          ? 'bg-emerald-50 text-emerald-700'
                          : rsiVal >= 80
                          ? 'bg-rose-100 text-rose-800'
                          : rsiVal >= 70
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {rsiVal <= 20 ? '极度超卖' : rsiVal <= 30 ? '超卖' : rsiVal >= 80 ? '极度超买' : rsiVal >= 70 ? '超买' : '中性'}
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-28 relative flex items-center">
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
                        {/* 30 marker */}
                        <div className="absolute top-0 bottom-0 left-[30%] w-0.5 bg-slate-300 z-10" />
                        {/* 70 marker */}
                        <div className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-slate-300 z-10" />
                        <div
                          className={`h-full transition-all rounded-full ${
                            isOversold ? 'bg-emerald-500' : isOverbought ? 'bg-rose-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, rsiVal))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Footer */}
        <div className="p-3 bg-white border-t border-slate-150 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">
            ⚡ 自动应用 Wilder's Smoothing 计算法则
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all cursor-pointer text-xs"
          >
            完成查看
          </button>
        </div>

      </div>
    </div>
  );
}
