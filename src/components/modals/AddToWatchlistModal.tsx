import { useState, useEffect } from 'react';
import { X, Search, Check, Plus, Loader2, Star } from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import { StockMeta } from '../../types.ts';
import { StockLogo } from '../common/StockLogo.tsx';
import { useResponsive } from '../../hooks/useResponsive.ts';

interface AddToWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlistTickers: string[];
  onToggleWatchlist: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
}

const POPULAR_TICKERS = [
  'NVDA', 'AAPL', 'TSLA', 'AMD', 'PLTR',
  'MSFT', 'AMZN', 'META', 'GOOGL', 'SOFI',
  'NOC', 'AVAV', 'RTX', 'GD', 'MCD', 'BAC'
];

export function AddToWatchlistModal({
  isOpen,
  onClose,
  watchlistTickers,
  onToggleWatchlist,
  onSelectStock
}: AddToWatchlistModalProps) {
  const { isMobile } = useResponsive();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await apiClient.searchStocks(query);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[750px] overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{
          paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 8px)' : undefined
        }}
      >
        {/* Mobile Top Drag Handle */}
        {isMobile && (
          <div className="pt-2.5 pb-1 flex justify-center bg-slate-50/80 cursor-grab shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-slate-300" />
          </div>
        )}
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Star className="w-4 h-4 fill-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">添加自选股票</h3>
              <p className="text-[11px] text-slate-400">关注标的实时报价与 Wilder RSI 动态</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Box */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入代码或公司名 (如 NVDA, AAPL, TSLA)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-sans"
            />
            {isLoading && (
              <Loader2 className="absolute right-3.5 w-4 h-4 text-blue-600 animate-spin" />
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {query.trim() ? (
            searchResults.length === 0 && !isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                未找到相关股票代码，请检查输入
              </div>
            ) : (
              searchResults.map(stock => {
                const isAdded = watchlistTickers.includes(stock.ticker);
                const rawStock = stock as any;
                const isADR = rawStock.isADR || rawStock.securityType === 'ADR';
                const isREIT = rawStock.isREIT || rawStock.securityType === 'REIT';
                const isETF = rawStock.isETF || rawStock.securityType === 'ETF';
                const secTypeLabel = isADR ? 'ADR' : isREIT ? 'REIT' : isETF ? 'ETF' : rawStock.securityType || 'Common Stock';

                return (
                  <div
                    key={stock.ticker}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                    onClick={() => {
                      onSelectStock(stock.ticker);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <StockLogo ticker={stock.ticker} name={stock.name} size="md" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{stock.ticker}</span>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1 py-0.2 rounded uppercase">
                            {stock.exchange || 'NASDAQ'}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isADR ? 'bg-amber-100 text-amber-800' :
                            isREIT ? 'bg-emerald-100 text-emerald-800' :
                            isETF ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {secTypeLabel}
                          </span>
                          {stock.isActive !== false && (
                            <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-600 px-1 py-0.2 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[200px] sm:max-w-[240px] font-medium mt-0.5">
                          {stock.name}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                          SEC Market Master • {stock.sector || 'US Equity'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWatchlist(stock.ticker);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>已自选</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>自选</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )
          ) : (
            <div>
              <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                热门关注美股标的
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {POPULAR_TICKERS.map(ticker => {
                  const isAdded = watchlistTickers.includes(ticker);
                  return (
                    <div
                      key={ticker}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                      onClick={() => {
                        onSelectStock(ticker);
                        onClose();
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <StockLogo ticker={ticker} name={ticker} size="md" />
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-slate-900">{ticker}</span>
                          <div className="text-[11px] text-slate-400">美股活跃个股</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(ticker);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>已添加</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>添加</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
