import { useState, useEffect, useRef } from 'react';
import { X, Bell, ShieldCheck, Zap, Search, Loader2, TrendingUp, TrendingDown, Check } from 'lucide-react';
import { AlertConditionType, StockMeta, StockQuoteSnapshot } from '../../types.ts';
import { apiClient } from '../../services/apiClient.ts';
import { notificationService } from '../../services/notificationService.ts';
import { RsiGauge } from '../common/RsiGauge.tsx';

interface CreateAlertModalProps {
  ticker?: string;
  stockName?: string;
  currentRsi?: number;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const QUICK_STOCKS = ['NVDA', 'AAPL', 'TSLA', 'AMD', 'PLTR', 'MSFT', 'AMZN', 'META', 'GOOGL', 'SOFI'];

export function CreateAlertModal({
  ticker: initialTicker = 'NVDA',
  stockName: initialStockName = '',
  currentRsi: initialRsi = 50,
  isOpen,
  onClose,
  onCreated
}: CreateAlertModalProps) {
  const [selectedTicker, setSelectedTicker] = useState<string>(initialTicker || 'NVDA');
  const [selectedStockName, setSelectedStockName] = useState<string>(initialStockName || '');
  const [period, setPeriod] = useState<number>(14);
  const [conditionType, setConditionType] = useState<AlertConditionType>('RSI_LTE');
  const [thresholdValue, setThresholdValue] = useState<number>(30);
  const [thresholdMax, setThresholdMax] = useState<number>(40);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live stock quote & RSI state
  const [liveQuote, setLiveQuote] = useState<StockQuoteSnapshot | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockMeta[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Reset/sync when modal opens
  useEffect(() => {
    if (isOpen) {
      const activeTicker = initialTicker || 'NVDA';
      setSelectedTicker(activeTicker);
      setSelectedStockName(initialStockName);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearchDropdownOpen(false);
      setErrorMsg(null);
    }
  }, [isOpen, initialTicker, initialStockName]);

  // Fetch live quote and RSI when selectedTicker or period changes
  useEffect(() => {
    if (!isOpen || !selectedTicker) return;

    let isCancelled = false;
    setIsLoadingQuote(true);

    apiClient.getStockQuote(selectedTicker, period)
      .then(quote => {
        if (!isCancelled) {
          setLiveQuote(quote);
          setSelectedStockName(quote.name);
        }
      })
      .catch(err => {
        console.error('Failed to fetch live quote in modal:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingQuote(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, selectedTicker, period]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const list = await apiClient.searchStocks(searchQuery);
        setSearchResults(list.slice(0, 6));
        setIsSearchDropdownOpen(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSelectStock = (stock: StockMeta | string) => {
    const t = typeof stock === 'string' ? stock : stock.ticker;
    const name = typeof stock === 'string' ? '' : stock.name;
    setSelectedTicker(t.toUpperCase());
    if (name) setSelectedStockName(name);
    setSearchQuery('');
    setIsSearchDropdownOpen(false);
  };

  const handleConditionChange = (type: AlertConditionType) => {
    setConditionType(type);
    if (type === 'RSI_LTE' || type === 'CROSS_BELOW_30') {
      setThresholdValue(30);
    } else if (type === 'RSI_GTE' || type === 'CROSS_ABOVE_70') {
      setThresholdValue(70);
    } else if (type === 'RSI_BETWEEN') {
      setThresholdValue(20);
      setThresholdMax(30);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicker) {
      setErrorMsg('请先选择要设置预警的美股标的');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Request notification permission if not yet granted
    if (notificationService.isSupported() && notificationService.getPermission() === 'default') {
      await notificationService.requestPermission();
    }

    try {
      await apiClient.createAlert({
        ticker: selectedTicker.toUpperCase(),
        name: selectedStockName || liveQuote?.name || `${selectedTicker} Corporation`,
        period,
        conditionType,
        thresholdValue,
        thresholdMax: conditionType === 'RSI_BETWEEN' ? thresholdMax : undefined,
        state: 'ARMED',
        triggerFrequency: 'ONCE_PER_BAR_CLOSE',
        isEnabled: true
      });

      // Play alert chime test
      notificationService.playAlertSound();

      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '创建预警失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCalculatedRsi = liveQuote ? liveQuote.rsi.value : initialRsi;
  const isPositive = liveQuote ? liveQuote.changePercent >= 0 : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-6 flex flex-col gap-5 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>新建 RSI 条件预警</span>
              </h3>
              <p className="text-xs text-slate-400">
                实时监控 Wilder RSI 极值点，自动推送到浏览器桌面与提示音
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 1. Stock Selector Section */}
          <div className="flex flex-col gap-2 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>选择监控股票 (Ticker)</span>
              <span className="text-[11px] font-normal text-slate-500">支持搜索 NYSE / NASDAQ 美股</span>
            </label>

            {/* Search Input Box */}
            <div ref={searchContainerRef} className="relative w-full">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="输入代码或公司名 (如 NVDA, AAPL, TSLA, AMD, PLTR)..."
                  className="w-full bg-slate-900 border border-slate-700/90 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-sans"
                />
                {isSearching && (
                  <div className="absolute right-3">
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Search Autocomplete Dropdown */}
              {isSearchDropdownOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-slate-400 bg-slate-950 uppercase tracking-wider">
                    点击选择股票
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {searchResults.map((stock) => (
                      <button
                        key={stock.ticker}
                        type="button"
                        onClick={() => handleSelectStock(stock)}
                        className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-emerald-400">{stock.ticker}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
                            {stock.exchange}
                          </span>
                          <span className="text-xs text-slate-400 truncate max-w-[160px]">{stock.name}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">${(stock.marketCap / 1e9).toFixed(1)}B</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-500 font-medium">热门标的:</span>
              {QUICK_STOCKS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelectStock(t)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedTicker === t
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Current Selected Stock Live Card Preview */}
            <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-extrabold text-sm text-emerald-400">
                  {selectedTicker.slice(0, 3)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-100">{selectedTicker}</span>
                    {liveQuote && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-mono">
                        {liveQuote.exchange}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-[200px]">
                    {selectedStockName || liveQuote?.name || `${selectedTicker} Corporation`}
                  </div>
                </div>
              </div>

              {/* Price & RSI badge */}
              <div className="text-right flex flex-col items-end">
                {isLoadingQuote ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>计算行情与 RSI...</span>
                  </div>
                ) : liveQuote ? (
                  <>
                    <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
                      <span className="font-bold text-slate-100">${liveQuote.price.toFixed(2)}</span>
                      <span className={`text-[11px] font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : ''}{liveQuote.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="mt-0.5">
                      <RsiGauge
                        value={liveQuote.rsi.value}
                        status={liveQuote.rsi.status}
                        statusLabel={liveQuote.rsi.statusLabel}
                        size="sm"
                      />
                    </div>
                  </>
                ) : (
                  <span className="text-xs font-mono text-slate-400">RSI: {currentCalculatedRsi.toFixed(1)}</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. RSI Period Switcher */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">RSI 计算周期</label>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              {[6, 9, 14, 21, 30].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`py-1.5 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                    period === p
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  RSI({p})
                </button>
              ))}
            </div>
          </div>

          {/* 3. Condition Presets */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300">预警触发条件</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleConditionChange('RSI_LTE')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  conditionType === 'RSI_LTE'
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-bold">RSI ≤ 阈值 (超卖)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">当 RSI 低于或触及指定线</div>
              </button>

              <button
                type="button"
                onClick={() => handleConditionChange('RSI_GTE')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  conditionType === 'RSI_GTE'
                    ? 'bg-rose-500/15 border-rose-500/60 text-rose-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-bold">RSI ≥ 阈值 (超买)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">当 RSI 高于或触及指定线</div>
              </button>

              <button
                type="button"
                onClick={() => handleConditionChange('CROSS_BELOW_30')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  conditionType === 'CROSS_BELOW_30'
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-bold">跌破 30 超卖区</div>
                <div className="text-[11px] text-slate-400 mt-0.5">从 &gt;30 下穿进入 ≤30</div>
              </button>

              <button
                type="button"
                onClick={() => handleConditionChange('CROSS_ABOVE_70')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  conditionType === 'CROSS_ABOVE_70'
                    ? 'bg-rose-500/15 border-rose-500/60 text-rose-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-bold">突破 70 超买区</div>
                <div className="text-[11px] text-slate-400 mt-0.5">从 &lt;70 上穿进入 ≥70</div>
              </button>
            </div>
          </div>

          {/* 4. Threshold Slider */}
          {conditionType !== 'CROSS_BELOW_30' && conditionType !== 'CROSS_ABOVE_70' && (
            <div className="flex flex-col gap-2 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">设定 RSI 阈值目标:</span>
                <span className="font-mono font-extrabold text-base text-emerald-400">{thresholdValue}</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                step="1"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>5 (极度超卖)</span>
                <span>30 (经典超卖)</span>
                <span>50 (中轴)</span>
                <span>70 (经典超买)</span>
                <span>95 (极度超买)</span>
              </div>
            </div>
          )}

          {/* 5. Notification Hint */}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>预警达标后将自动触发系统通知、桌面弹窗及提示音，防重冷却 15 分钟。</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedTicker}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? '正在保存...' : `开启 ${selectedTicker} 预警`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
