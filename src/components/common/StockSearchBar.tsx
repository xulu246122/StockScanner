import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp, Building2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import { StockMeta } from '../../types.ts';
import { getSectorZh } from '../../utils/stockSectorMapper.tsx';

interface StockSearchBarProps {
  onSelectStock: (ticker: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function StockSearchBar({ onSelectStock, placeholder = '输入股票代码或公司名称 (如 NVDA, AAPL, TSLA)...', autoFocus = false }: StockSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const list = await apiClient.searchStocks(query);
        setResults(list.slice(0, 8));
        setIsOpen(true);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (ticker: string) => {
    onSelectStock(ticker);
    setQuery('');
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (results.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % (results.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex].ticker);
      } else if (query.trim()) {
        handleSelect(query.trim().toUpperCase());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-24 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-sans"
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          ) : (
            <button
              onClick={() => {
                if (query.trim()) handleSelect(query.trim().toUpperCase());
              }}
              className="px-2.5 py-1 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              查询
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800">
          <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400 bg-slate-950/60 uppercase tracking-wider flex items-center justify-between">
            <span>匹配美股</span>
            <span>按 Enter 直接打开</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {results.map((stock, idx) => (
              <button
                key={stock.ticker}
                type="button"
                onClick={() => handleSelect(stock.ticker)}
                className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                  idx === selectedIndex ? 'bg-emerald-500/15 text-white' : 'hover:bg-slate-800/80 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-emerald-400">
                    {stock.ticker.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm tracking-tight text-slate-100">{stock.ticker}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
                        {stock.exchange}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[220px] sm:max-w-md">
                      {stock.name}
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="text-slate-400 font-mono text-[11px]">
                    ${(stock.marketCap / 1e9).toFixed(1)}B
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    {getSectorZh(stock.ticker, stock.sector)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
