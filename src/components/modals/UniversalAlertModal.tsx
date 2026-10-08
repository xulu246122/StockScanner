import { useState, useEffect, useRef } from 'react';
import {
  X,
  Bell,
  Search,
  Volume2,
  Play,
  Check,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Percent,
  Sliders,
  ChevronDown,
  Layers,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { StockLogo } from '../common/StockLogo.tsx';
import { apiClient } from '../../services/apiClient.ts';
import { notificationService } from '../../services/notificationService.ts';
import { useResponsive } from '../../hooks/useResponsive.ts';
import { StockSectorBadge } from '../../utils/stockSectorMapper.tsx';
import {
  AlertConditionType,
  AlertRule,
  AlertTargetDimension,
  AlertTriggerFrequency,
  AlertSoundType,
  StockMeta,
  Timeframe
} from '../../types.ts';

export interface UniversalAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker?: string;
  stockName?: string;
  currentPrice?: number;
  currentChangePercent?: number;
  currentRsi?: number;
  initialDimension?: AlertTargetDimension;
  onCreated?: () => void;
}

const TIMEFRAMES: Timeframe[] = ['10m', '30m', '1h', '2h', '4h', '1D', '1W'];

export function UniversalAlertModal({
  isOpen,
  onClose,
  ticker: initialTicker = 'NVDA',
  stockName: initialStockName = '',
  currentPrice: initialPrice,
  currentChangePercent: initialChangePercent,
  currentRsi: initialRsi,
  initialDimension = 'PRICE',
  onCreated
}: UniversalAlertModalProps) {
  const { isMobile } = useResponsive();

  // Target Stock State
  const [selectedTicker, setSelectedTicker] = useState<string>(initialTicker || 'NVDA');
  const [selectedStockName, setSelectedStockName] = useState<string>(initialStockName || '');
  const [livePrice, setLivePrice] = useState<number>(initialPrice ?? 180.0);
  const [liveChangePercent, setLiveChangePercent] = useState<number>(initialChangePercent ?? 0);
  const [liveRsi, setLiveRsi] = useState<number>(initialRsi ?? 50.0);
  const [exchange, setExchange] = useState<string>('NASDAQ');

  // Search Switcher
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockMeta[]>([]);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Dimension: PRICE | CHANGE_PERCENT | RSI | MOVING_AVERAGE
  const [dimension, setDimension] = useState<AlertTargetDimension>(initialDimension);

  // Price Condition Parameters
  const [priceOperator, setPriceOperator] = useState<'CROSS_UP' | 'CROSS_DOWN' | 'GTE' | 'LTE'>('CROSS_UP');
  const [targetPrice, setTargetPrice] = useState<number>(livePrice);

  // Change % Condition Parameters
  const [changeOperator, setChangeOperator] = useState<'GTE' | 'LTE'>('GTE');
  const [targetChangePercent, setTargetChangePercent] = useState<number>(3.0);

  // RSI Condition Parameters
  const [rsiCondition, setRsiCondition] = useState<'RSI_LTE' | 'RSI_GTE' | 'CROSS_BELOW_30' | 'CROSS_ABOVE_70'>('RSI_LTE');
  const [targetRsi, setTargetRsi] = useState<number>(30);
  const [rsiPeriod, setRsiPeriod] = useState<number>(14);

  // MA Cross Condition Parameters
  const [maType, setMaType] = useState<'EMA' | 'SMA'>('EMA');
  const [maPeriod, setMaPeriod] = useState<number>(20);
  const [maOperator, setMaOperator] = useState<'CROSS_UP' | 'CROSS_DOWN'>('CROSS_UP');

  // Timeframe & Frequency & Expiration
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [frequency, setFrequency] = useState<AlertTriggerFrequency>('ONCE_PER_BAR_CLOSE');
  const [hasExpiration, setHasExpiration] = useState<boolean>(false);
  const [expirationDate, setExpirationDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );

  // Actions & Sounds
  const [notifyDesktop, setNotifyDesktop] = useState<boolean>(true);
  const [notifySound, setNotifySound] = useState<boolean>(true);
  const [soundType, setSoundType] = useState<AlertSoundType>('DIGITAL_CHIME');

  // Custom Alert Name
  const [customAlertName, setCustomAlertName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize or sync when modal opens
  useEffect(() => {
    if (isOpen) {
      const t = initialTicker || 'NVDA';
      setSelectedTicker(t);
      setSelectedStockName(initialStockName || '');
      setDimension(initialDimension || 'PRICE');
      setIsSearching(false);
      setSearchQuery('');

      if (initialPrice !== undefined && initialPrice > 0) {
        setLivePrice(initialPrice);
        setTargetPrice(Number((initialPrice * 1.02).toFixed(2)));
      }
      if (initialChangePercent !== undefined) {
        setLiveChangePercent(initialChangePercent);
      }
      if (initialRsi !== undefined) {
        setLiveRsi(initialRsi);
      }

      // Fetch fresh live quote
      apiClient.getStockQuote(t, 14, '1D')
        .then(q => {
          setLivePrice(q.price);
          setLiveChangePercent(q.changePercent);
          setLiveRsi(q.rsi.value);
          setSelectedStockName(q.name);
          setExchange(q.exchange || 'NASDAQ');
          if (initialPrice === undefined) {
            setTargetPrice(Number((q.price * 1.02).toFixed(2)));
          }
        })
        .catch(console.error);
    }
  }, [isOpen, initialTicker, initialStockName, initialPrice, initialChangePercent, initialRsi, initialDimension]);

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await apiClient.searchStocks(searchQuery);
        setSearchResults(results.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auto-generate alert name when parameters change
  useEffect(() => {
    if (!selectedTicker) return;
    let autoName = '';
    if (dimension === 'PRICE') {
      const opLabel = priceOperator === 'CROSS_UP' ? '向上突破' : priceOperator === 'CROSS_DOWN' ? '向下跌破' : priceOperator === 'GTE' ? '达到或高于' : '跌破或低于';
      autoName = `${selectedTicker} 价格${opLabel} $${targetPrice.toFixed(2)}`;
    } else if (dimension === 'CHANGE_PERCENT') {
      const opLabel = changeOperator === 'GTE' ? '日内涨幅 ≥' : '日内跌幅 ≤';
      autoName = `${selectedTicker} ${opLabel} ${targetChangePercent > 0 ? '+' : ''}${targetChangePercent}% 异动预警`;
    } else if (dimension === 'RSI') {
      const rsiLabel = rsiCondition === 'CROSS_BELOW_30' ? '下穿 30 极端超卖' : rsiCondition === 'CROSS_ABOVE_70' ? '上穿 70 极端超买' : rsiCondition === 'RSI_LTE' ? `RSI ≤ ${targetRsi} 超卖` : `RSI ≥ ${targetRsi} 超买`;
      autoName = `${selectedTicker} ${rsiLabel} (${timeframe})`;
    } else if (dimension === 'MOVING_AVERAGE') {
      const opLabel = maOperator === 'CROSS_UP' ? '金叉' : '死叉';
      autoName = `${selectedTicker} 价格${opLabel} ${maType}${maPeriod} (${timeframe})`;
    }
    setCustomAlertName(autoName);
  }, [selectedTicker, dimension, priceOperator, targetPrice, changeOperator, targetChangePercent, rsiCondition, targetRsi, maType, maPeriod, maOperator, timeframe]);

  if (!isOpen) return null;

  const handleSelectStock = (stock: StockMeta) => {
    setSelectedTicker(stock.ticker);
    setSelectedStockName(stock.name);
    setExchange(stock.exchange || 'NASDAQ');
    setIsSearching(false);
    setSearchQuery('');
    apiClient.getStockQuote(stock.ticker, rsiPeriod, timeframe)
      .then(q => {
        setLivePrice(q.price);
        setLiveChangePercent(q.changePercent);
        setLiveRsi(q.rsi.value);
        setTargetPrice(Number((q.price * 1.02).toFixed(2)));
      })
      .catch(console.error);
  };

  // Quick Delta buttons for Price
  const handlePriceDelta = (deltaPercent: number) => {
    const calculated = Number((livePrice * (1 + deltaPercent / 100)).toFixed(2));
    setTargetPrice(calculated);
    if (deltaPercent > 0) {
      setPriceOperator('CROSS_UP');
    } else {
      setPriceOperator('CROSS_DOWN');
    }
  };

  // Sound Preview
  const handleTestSound = () => {
    notificationService.playAlertSound(soundType);
  };

  // Submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let conditionType: AlertConditionType = 'PRICE_CROSS_UP';
      let thresholdValue = targetPrice;

      if (dimension === 'PRICE') {
        if (priceOperator === 'CROSS_UP') conditionType = 'PRICE_CROSS_UP';
        else if (priceOperator === 'CROSS_DOWN') conditionType = 'PRICE_CROSS_DOWN';
        else if (priceOperator === 'GTE') conditionType = 'PRICE_GTE';
        else conditionType = 'PRICE_LTE';
        thresholdValue = targetPrice;
      } else if (dimension === 'CHANGE_PERCENT') {
        conditionType = changeOperator === 'GTE' ? 'CHANGE_PCT_GTE' : 'CHANGE_PCT_LTE';
        thresholdValue = targetChangePercent;
      } else if (dimension === 'RSI') {
        conditionType = rsiCondition;
        thresholdValue = (rsiCondition === 'CROSS_BELOW_30' || rsiCondition === 'CROSS_ABOVE_70') ? (rsiCondition === 'CROSS_BELOW_30' ? 30 : 70) : targetRsi;
      } else if (dimension === 'MOVING_AVERAGE') {
        conditionType = maOperator === 'CROSS_UP' ? 'PRICE_CROSS_UP_MA' : 'PRICE_CROSS_DOWN_MA';
        thresholdValue = livePrice;
      }

      const alertPayload: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'> = {
        ticker: selectedTicker,
        name: selectedStockName || selectedTicker,
        stockName: selectedStockName || selectedTicker,
        targetDimension: dimension,
        conditionType,
        thresholdValue,
        period: rsiPeriod,
        timeframe,
        isEnabled: true,
        state: 'ACTIVE',
        triggerFrequency: frequency,
        notifySound,
        soundType,
        notifyPush: notifyDesktop,
        expireAt: hasExpiration ? `${expirationDate}T23:59:59Z` : null,
        alertName: customAlertName,
        lastCheckedPrice: livePrice,
        lastCheckedRsi: liveRsi,
        triggerCount: 0
      };

      await apiClient.createAlert(alertPayload);

      // Play pleasant confirmation chime
      if (notifySound) {
        notificationService.playAlertSound(soundType);
      }

      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create universal alert:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Price distance calculation
  const priceDiff = targetPrice - livePrice;
  const priceDiffPct = livePrice > 0 ? (priceDiff / livePrice) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[530px] max-h-[90vh] sm:max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom, 0px) + 6px)' : undefined
        }}
      >
        {/* Mobile Top Drag Handle */}
        {isMobile && (
          <div className="pt-2.5 pb-1 flex justify-center bg-slate-50/80 cursor-grab shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-slate-300" />
          </div>
        )}
        {/* ========================================================= */}
        {/* 1. COMPACT TRADINGVIEW HEADER                            */}
        {/* ========================================================= */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                新建量化预警
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                TradingView 级多维监控与防假突破机制
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* 2. LIVE STOCK TICKER STRIP                                */}
        {/* ========================================================= */}
        <div className="px-5 py-3 bg-gradient-to-r from-blue-50/40 via-indigo-50/20 to-slate-50/50 border-b border-slate-100 flex items-center justify-between relative">
          <div className="flex items-center gap-3 min-w-0">
            <StockLogo ticker={selectedTicker} name={selectedStockName} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm text-slate-900 tracking-tight">
                  {selectedTicker}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                  {exchange}
                </span>
                <StockSectorBadge ticker={selectedTicker} size="xs" />
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                {selectedStockName || selectedTicker}
              </p>
            </div>
          </div>

          {/* Price & Change Badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <div className="text-sm font-mono font-black text-slate-900">
                ${livePrice.toFixed(2)}
              </div>
              <div className="flex items-center justify-end gap-1">
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                    liveChangePercent >= 0
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  {liveChangePercent >= 0 ? (
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  ) : (
                    <ArrowDownRight className="w-2.5 h-2.5" />
                  )}
                  {liveChangePercent >= 0 ? '+' : ''}{liveChangePercent.toFixed(2)}%
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  RSI {liveRsi.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Switch Stock Trigger */}
            <button
              type="button"
              onClick={() => setIsSearching(!isSearching)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg border border-blue-200/80 transition-colors cursor-pointer"
            >
              换股
            </button>
          </div>

          {/* Autocomplete dropdown */}
          {isSearching && (
            <div
              ref={searchDropdownRef}
              className="absolute left-5 right-5 top-14 z-30 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 mb-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="输入美股代码或名称 (如 AAPL, TSLA)..."
                  className="w-full bg-transparent text-xs text-slate-900 outline-none placeholder:text-slate-400"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                {searchResults.map(stock => (
                  <button
                    key={stock.ticker}
                    type="button"
                    onClick={() => handleSelectStock(stock)}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-left rounded-xl hover:bg-slate-100 text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">{stock.ticker}</span>
                      <span className="text-slate-400 truncate max-w-[200px]">{stock.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{stock.exchange}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 3. SCROLLABLE FORM BODY                                   */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar text-xs">
          {/* Dimension Segmented Control */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
              监控维度 (Dimension)
            </label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setDimension('PRICE')}
                className={`py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  dimension === 'PRICE'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>价格</span>
              </button>
              <button
                type="button"
                onClick={() => setDimension('CHANGE_PERCENT')}
                className={`py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  dimension === 'CHANGE_PERCENT'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>涨跌幅</span>
              </button>
              <button
                type="button"
                onClick={() => setDimension('RSI')}
                className={`py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  dimension === 'RSI'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>RSI</span>
              </button>
              <button
                type="button"
                onClick={() => setDimension('MOVING_AVERAGE')}
                className={`py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  dimension === 'MOVING_AVERAGE'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>均线</span>
              </button>
            </div>
          </div>

          {/* ======================================================= */}
          {/* CONDITION SPECIFIC BUILDER                              */}
          {/* ======================================================= */}
          {/* DIMENSION 1: PRICE */}
          {dimension === 'PRICE' && (
            <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200/90 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    触发条件 (Condition)
                  </label>
                  <select
                    value={priceOperator}
                    onChange={e => setPriceOperator(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="CROSS_UP">向上穿过 ↑ (Crossing Up)</option>
                    <option value="CROSS_DOWN">向下穿过 ↓ (Crossing Down)</option>
                    <option value="GTE">大于等于 ≥ (Greater or Equal)</option>
                    <option value="LTE">小于等于 ≤ (Less or Equal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    目标价格 ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.05"
                      value={targetPrice}
                      onChange={e => setTargetPrice(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2.5 py-1.5 font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Delta Buttons */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  快捷偏离度一键设定 (基于现价 ${livePrice.toFixed(2)})
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 5, -1, -2, -5].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePriceDelta(pct)}
                      className={`py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                        pct > 0
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50/70 border-rose-200 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distance Info Strip */}
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 font-medium">距离目标差距:</span>
                <span
                  className={`font-bold ${
                    priceDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)} ({priceDiffPct >= 0 ? '+' : ''}{priceDiffPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          {/* DIMENSION 2: CHANGE PERCENT */}
          {dimension === 'CHANGE_PERCENT' && (
            <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200/90 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    异动方向 (Direction)
                  </label>
                  <select
                    value={changeOperator}
                    onChange={e => setChangeOperator(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="GTE">日内涨幅达到或超过 ≥ (Surge)</option>
                    <option value="LTE">日内跌幅达到或超过 ≤ (Dump / Dip)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    涨跌幅阈值 (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      value={targetChangePercent}
                      onChange={e => setTargetChangePercent(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Change Presets */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  经典异动档位预设
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setChangeOperator('GTE');
                      setTargetChangePercent(3.0);
                    }}
                    className="py-1 px-2 rounded-lg bg-white border border-slate-200 font-bold text-emerald-700 hover:bg-emerald-50 text-[11px] transition-colors cursor-pointer text-center"
                  >
                    🚀 主力拉升 (+3%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangeOperator('LTE');
                      setTargetChangePercent(-2.5);
                    }}
                    className="py-1 px-2 rounded-lg bg-white border border-slate-200 font-bold text-rose-700 hover:bg-rose-50 text-[11px] transition-colors cursor-pointer text-center"
                  >
                    ⚡ 暴跌抄底 (-2.5%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangeOperator('LTE');
                      setTargetChangePercent(-5.0);
                    }}
                    className="py-1 px-2 rounded-lg bg-white border border-slate-200 font-bold text-rose-700 hover:bg-rose-50 text-[11px] transition-colors cursor-pointer text-center"
                  >
                    🛑 极端超跌 (-5%)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DIMENSION 3: RSI (CLEAN, COMPACT, PROFESSIONAL) */}
          {dimension === 'RSI' && (
            <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200/90 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    RSI 预警条件
                  </label>
                  <select
                    value={rsiCondition}
                    onChange={e => setRsiCondition(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="RSI_LTE">低于等于 ≤ (超卖抄底)</option>
                    <option value="RSI_GTE">高于等于 ≥ (超买止盈)</option>
                    <option value="CROSS_BELOW_30">下穿 30 (极端超卖入场)</option>
                    <option value="CROSS_ABOVE_70">上穿 70 (极端超买见顶)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    RSI 阈值 (0 - 100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={targetRsi}
                    onChange={e => setTargetRsi(Number(e.target.value))}
                    disabled={rsiCondition === 'CROSS_BELOW_30' || rsiCondition === 'CROSS_ABOVE_70'}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Quick RSI Presets */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  经典梯次预选 (当前 RSI: {liveRsi.toFixed(1)})
                </div>
                <div className="flex items-center gap-1.5">
                  {[20, 30, 50, 70, 80].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setTargetRsi(val);
                        if (val <= 30) setRsiCondition('RSI_LTE');
                        else if (val >= 70) setRsiCondition('RSI_GTE');
                      }}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer text-center ${
                        targetRsi === val
                          ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wilder Period */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                <span className="text-[11px] font-bold text-slate-600">Wilder 平滑周期:</span>
                <div className="flex items-center gap-1">
                  {[6, 9, 14, 21].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRsiPeriod(p)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition-colors cursor-pointer ${
                        rsiPeriod === p
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200/60 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* DIMENSION 4: MOVING AVERAGE */}
          {dimension === 'MOVING_AVERAGE' && (
            <div className="bg-slate-50/70 rounded-2xl p-3.5 border border-slate-200/90 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    均线类型
                  </label>
                  <select
                    value={maType}
                    onChange={e => setMaType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="EMA">指数平滑 (EMA)</option>
                    <option value="SMA">简单均线 (SMA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    周期 (Period)
                  </label>
                  <select
                    value={maPeriod}
                    onChange={e => setMaPeriod(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="9">9 快速线</option>
                    <option value="20">20 生命线</option>
                    <option value="50">50 中期趋势</option>
                    <option value="200">200 牛熊分界</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    交叉方向
                  </label>
                  <select
                    value={maOperator}
                    onChange={e => setMaOperator(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="CROSS_UP">向上金叉 ↑</option>
                    <option value="CROSS_DOWN">向下死叉 ↓</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* TIMEFRAME & TRIGGER FREQUENCY (TRADINGVIEW STANDARDS)   */}
          {/* ======================================================= */}
          <div className="space-y-3">
            {/* Candle Timeframe */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                K线周期 (Candle Timeframe)
              </label>
              <div className="grid grid-cols-7 gap-1">
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`py-1 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${
                      timeframe === tf
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger Frequency */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                触发频率与防假突破 (Trigger Options)
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                <label className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  frequency === 'ONCE_PER_BAR_CLOSE'
                    ? 'bg-blue-50/70 border-blue-400 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="frequency"
                      checked={frequency === 'ONCE_PER_BAR_CLOSE'}
                      onChange={() => setFrequency('ONCE_PER_BAR_CLOSE')}
                      className="accent-blue-600"
                    />
                    <div>
                      <div className="font-extrabold text-xs">每根 K 线收盘确认 (防盘中虚破)</div>
                      <div className="text-[10px] text-slate-400">仅当周期 K 线真正收盘确认达到门槛时报警，过滤盘中影线假动作</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
                    推荐
                  </span>
                </label>

                <label className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  frequency === 'ONLY_ONCE'
                    ? 'bg-blue-50/70 border-blue-400 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="frequency"
                      checked={frequency === 'ONLY_ONCE'}
                      onChange={() => setFrequency('ONLY_ONCE')}
                      className="accent-blue-600"
                    />
                    <div>
                      <div className="font-extrabold text-xs">仅触发一次 (Only Once)</div>
                      <div className="text-[10px] text-slate-400">首次触达条件即刻触发报警，触发后规则自动转入已完成/休眠</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* ACTIONS & SOUNDS                                        */}
          {/* ======================================================= */}
          <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                <span>预警通知与音效 (Alert Actions)</span>
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={notifyDesktop}
                    onChange={e => setNotifyDesktop(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>系统桌面弹窗</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={notifySound}
                    onChange={e => setNotifySound(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>播放音效</span>
                </label>
              </div>
            </div>

            {/* Sound Selector with Preview button */}
            {notifySound && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                <span className="text-[11px] text-slate-500 font-medium">选择音效:</span>
                <select
                  value={soundType}
                  onChange={e => setSoundType(e.target.value as any)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="DIGITAL_CHIME">清脆提示音 (Digital Chime)</option>
                  <option value="RADAR_PING">声呐雷达脉冲 (Radar Ping)</option>
                  <option value="URGENT_BEAT">紧急双击蜂鸣 (Urgent Beat)</option>
                  <option value="ALARM_CLOCK">连续警报钟声 (Alarm Clock)</option>
                </select>
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="px-2.5 py-1 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="试听音效"
                >
                  <Play className="w-3 h-3 fill-blue-700" />
                  <span>试听</span>
                </button>
              </div>
            )}
          </div>

          {/* ======================================================= */}
          {/* CUSTOM ALERT NAME INPUT                                 */}
          {/* ======================================================= */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
              预警名称与描述 (Alert Name)
            </label>
            <input
              type="text"
              value={customAlertName}
              onChange={e => setCustomAlertName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-colors"
              placeholder="输入自定义预警名称..."
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. FOOTER ACTIONS                                         */}
        {/* ========================================================= */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            取消
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{isSubmitting ? '正在创建...' : `保存并启动 ${selectedTicker} 预警`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
