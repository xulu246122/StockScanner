import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Search, Bell, Activity, Zap, TrendingUp, TrendingDown, Sliders } from 'lucide-react';
import { StockLogo } from '../common/StockLogo.tsx';
import { VerticalRsiSlider } from '../common/VerticalRsiSlider.tsx';
import { apiClient } from '../../services/apiClient.ts';
import { notificationService } from '../../services/notificationService.ts';
import { StockMeta, Timeframe, AlertConditionType } from '../../types.ts';

interface StockAlarmAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker?: string;
  stockName?: string;
  currentPrice?: number;
  currentRsi?: number;
  onCreated?: () => void;
}

type ModalStep = 'SELECT_TYPE' | 'TECHNICALS' | 'RSI_OPTIONS' | 'RSI_CONFIG';

export function StockAlarmAlertModal({
  isOpen,
  onClose,
  ticker: initialTicker = 'NVDA',
  stockName: initialName = 'NVIDIA Corporation',
  currentPrice: initialPrice = 227.21,
  currentRsi: initialRsi = 28.6,
  onCreated
}: StockAlarmAlertModalProps) {
  const [step, setStep] = useState<ModalStep>('SELECT_TYPE');
  const [selectedTicker, setSelectedTicker] = useState<string>(initialTicker);
  const [selectedName, setSelectedName] = useState<string>(initialName);
  const [livePrice, setLivePrice] = useState<number>(initialPrice);
  const [liveRsi, setLiveRsi] = useState<number>(initialRsi);

  // Stock Search inside modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockMeta[]>([]);

  // Alert configuration
  const [alertSubtype, setAlertSubtype] = useState<'OVERSOLD' | 'OVERBOUGHT' | 'TARGET'>('OVERSOLD');
  const [rsiPeriod, setRsiPeriod] = useState<number>(14);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');
  const [thresholdValue, setThresholdValue] = useState<number>(30);
  const [isActiveToggle, setIsActiveToggle] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setStep(initialTicker ? 'RSI_CONFIG' : 'SELECT_TYPE');
      setSelectedTicker(initialTicker || 'NVDA');
      setSelectedName(initialName || 'NVIDIA Corporation');
      setLivePrice(initialPrice || 227.21);
      setLiveRsi(initialRsi || 28.6);
      setSelectedTimeframe('1D');
      setThresholdValue(30);
      setAlertSubtype('OVERSOLD');
      setIsActiveToggle(true);
    }
  }, [isOpen, initialTicker, initialName, initialPrice, initialRsi]);

  // Fetch live price & Wilder RSI when stock, period or timeframe changes
  useEffect(() => {
    if (!isOpen || !selectedTicker) return;
    apiClient.getStockQuote(selectedTicker, rsiPeriod, selectedTimeframe).then(q => {
      setLivePrice(q.price);
      setLiveRsi(q.rsi.value);
    }).catch(console.error);
  }, [selectedTicker, rsiPeriod, selectedTimeframe, isOpen]);

  // Stock search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const list = await apiClient.searchStocks(searchQuery);
        setSearchResults(list.slice(0, 6));
      } catch (err) {
        console.error(err);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectSubtype = (type: 'OVERSOLD' | 'OVERBOUGHT' | 'TARGET') => {
    setAlertSubtype(type);
    if (type === 'OVERSOLD') setThresholdValue(30);
    else if (type === 'OVERBOUGHT') setThresholdValue(70);
    else setThresholdValue(50);
    setStep('RSI_CONFIG');
  };

  const handleCreateAlert = async () => {
    setIsSubmitting(true);
    try {
      if (notificationService.isSupported() && notificationService.getPermission() === 'default') {
        await notificationService.requestPermission();
      }

      let conditionType: AlertConditionType;
      if (alertSubtype === 'OVERSOLD') {
        conditionType = 'RSI_OVERSOLD';
      } else if (alertSubtype === 'OVERBOUGHT') {
        conditionType = 'RSI_OVERBOUGHT';
      } else {
        conditionType = thresholdValue <= 50 ? 'RSI_LTE' : 'RSI_GTE';
      }

      await apiClient.createAlert({
        ticker: selectedTicker,
        name: selectedName,
        conditionType,
        timeframe: selectedTimeframe,
        period: rsiPeriod,
        thresholdValue: thresholdValue,
        state: isActiveToggle ? 'ARMED' : 'DISABLED',
        triggerFrequency: 'ONCE_PER_BAR_CLOSE',
        isEnabled: isActiveToggle
      });

      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create alert:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeframes: Timeframe[] = ['10m', '30m', '1h', '2h', '4h', '1D', '1W', '1M'];
  const rsiPeriods = [6, 9, 14, 21];
  const presetLevels = [20, 30, 50, 70, 80];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 p-0 sm:p-4">
      <div 
        className="alert-modal-container bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] border border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            {step !== 'SELECT_TYPE' && (
              <button
                type="button"
                onClick={() => {
                  if (step === 'RSI_CONFIG') setStep('RSI_OPTIONS');
                  else if (step === 'RSI_OPTIONS') setStep('TECHNICALS');
                  else if (step === 'TECHNICALS') setStep('SELECT_TYPE');
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600 fill-blue-600" />
                {step === 'SELECT_TYPE' && 'Select Alert Category'}
                {step === 'TECHNICALS' && 'Technical Indicators'}
                {step === 'RSI_OPTIONS' && 'RSI Alert Options'}
                {step === 'RSI_CONFIG' && 'Configure RSI Alert'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stock Selector Pill (if on config screen) */}
        {step === 'RSI_CONFIG' && (
          <div className="px-6 py-3 bg-gradient-to-r from-blue-50/60 via-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StockLogo ticker={selectedTicker} name={selectedName} size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">{selectedTicker}</span>
                  <span className="text-xs text-slate-500 truncate max-w-[140px]">{selectedName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-800">${livePrice.toFixed(2)}</span>
                  <span className="text-slate-300">·</span>
                  <span className={`font-semibold ${liveRsi <= 30 ? 'text-emerald-600' : liveRsi >= 70 ? 'text-rose-600' : 'text-blue-600'}`}>
                    Wilder RSI: {liveRsi.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep('SELECT_TYPE')}
              className="text-xs font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors shadow-2xs"
            >
              Switch Stock
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          
          {/* STEP 1: Select Type */}
          {step === 'SELECT_TYPE' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search stock (e.g. NVDA, RTX, AAPL)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-lg p-2 space-y-1">
                  {searchResults.map((stock) => (
                    <button
                      key={stock.ticker}
                      type="button"
                      onClick={() => {
                        setSelectedTicker(stock.ticker);
                        setSelectedName(stock.name);
                        setSearchQuery('');
                        setSearchResults([]);
                        setStep('TECHNICALS');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <StockLogo ticker={stock.ticker} name={stock.name} size="sm" />
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{stock.ticker}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[180px]">{stock.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-500">{stock.exchange}</div>
                        <div className="text-xs text-slate-400">{stock.sector}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Category Buttons */}
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setStep('TECHNICALS')}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/50 to-white border border-blue-200 rounded-2xl hover:border-blue-500 hover:shadow-xs transition-all group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-2">
                        Technicals
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          Wilder RSI
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Oversold dips, overbought peaks & custom threshold crosses</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSubtype('OVERSOLD')}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-xs transition-all group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
                        Oversold Dip-Buying (RSI ≤ 30)
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Notify immediately when price enters extreme undervaluation</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectSubtype('OVERBOUGHT')}
                  className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-rose-500 hover:shadow-xs transition-all group text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm group-hover:text-rose-600 transition-colors">
                        Overbought Top Take-Profit (RSI ≥ 70)
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Alert on excessive momentum or pullback risk</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 transition-colors" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Technicals Indicator selection */}
          {step === 'TECHNICALS' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep('RSI_OPTIONS')}
                className="w-full flex items-center justify-between p-4.5 bg-gradient-to-r from-blue-50/60 to-white border-2 border-blue-500 rounded-2xl shadow-xs text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                      Wilder's RSI
                      <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Smoothed Relative Strength Index with exponential Wilder smoothing
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-600" />
              </button>
            </div>
          )}

          {/* STEP 3: RSI Options */}
          {step === 'RSI_OPTIONS' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleSelectSubtype('OVERSOLD')}
                className="w-full p-4.5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/20 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-600">
                    Oversold Bounce (RSI ≤ 30)
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Dip Buy
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Triggers when RSI enters the oversold zone (≤ 30), indicating high probability of mean-reversion rebound.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSubtype('OVERBOUGHT')}
                className="w-full p-4.5 bg-white border border-slate-200 rounded-2xl hover:border-rose-500 hover:bg-rose-50/20 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm group-hover:text-rose-600">
                    Overbought Exhaustion (RSI ≥ 70)
                  </div>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Take Profit
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Triggers when RSI crosses above 70, signaling buyer exhaustion and possible near-term top.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectSubtype('TARGET')}
                className="w-full p-4.5 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50/20 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600">
                    Custom Threshold Level
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Custom
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Set any precise RSI target value (0 - 100) and alert direction.
                </p>
              </button>
            </div>
          )}

          {/* STEP 4: High-Fidelity RSI Config with Pill-Shaped Groups & Vertical Slider */}
          {step === 'RSI_CONFIG' && (
            <div className="space-y-4.5">
              
              {/* 1. Selection Modes: Clean Pill-Shaped Button Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Alert Mode
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-full">
                  <button
                    type="button"
                    onClick={() => {
                      setAlertSubtype('OVERSOLD');
                      setThresholdValue(30);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-full transition-all text-center ${
                      alertSubtype === 'OVERSOLD'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Oversold (≤30)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAlertSubtype('OVERBOUGHT');
                      setThresholdValue(70);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-full transition-all text-center ${
                      alertSubtype === 'OVERBOUGHT'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Overbought (≥70)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAlertSubtype('TARGET');
                      if (thresholdValue === 30 || thresholdValue === 70) setThresholdValue(50);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-full transition-all text-center ${
                      alertSubtype === 'TARGET'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Custom Target
                  </button>
                </div>
              </div>

              {/* 2. Timeframe: Clean Pill-Shaped Button Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Candle Timeframe
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {timeframes.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setSelectedTimeframe(tf)}
                      className={`py-1.5 text-xs font-bold rounded-full border transition-all text-center ${
                        selectedTimeframe === tf
                          ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Custom High-Precision Vertical Range Slider for RSI Threshold */}
              <VerticalRsiSlider
                value={thresholdValue}
                onChange={setThresholdValue}
                liveRsi={liveRsi}
                alertSubtype={alertSubtype}
                onSubtypeChange={setAlertSubtype}
              />

              {/* 4. Wilder Period: Pill-Shaped Button Group */}
              <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl">
                <div>
                  <div className="text-xs font-bold text-slate-800">Wilder Period</div>
                  <div className="text-[11px] text-slate-500">Standard 14 periods with Wilder's MA</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {rsiPeriods.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setRsiPeriod(p)}
                      className={`w-8 h-8 text-xs font-bold rounded-full transition-all flex items-center justify-center ${
                        rsiPeriod === p
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Toggle Switch with Blue Accent Color to Activate/Deactivate */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white border border-blue-200/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                    isActiveToggle ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-400'
                  }`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      Enable Live Monitoring
                      {isActiveToggle && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {isActiveToggle ? 'Instant push notifications & audio alarm activated' : 'Alert saved as paused'}
                    </div>
                  </div>
                </div>

                {/* Blue Accent Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setIsActiveToggle(!isActiveToggle)}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    isActiveToggle ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={isActiveToggle}
                  aria-label="Toggle Alert Active"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isActiveToggle ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-full hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Cancel
          </button>
          
          {step === 'RSI_CONFIG' ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCreateAlert}
              className="flex-2 py-3 px-5 bg-blue-600 text-white font-bold text-sm rounded-full hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Bell className="w-4 h-4 fill-white" />
              {isSubmitting ? 'Creating Alarm...' : `Create ${selectedTicker} Alert`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (step === 'SELECT_TYPE') setStep('TECHNICALS');
                else if (step === 'TECHNICALS') setStep('RSI_OPTIONS');
                else if (step === 'RSI_OPTIONS') handleSelectSubtype('OVERSOLD');
              }}
              className="flex-2 py-3 px-5 bg-blue-600 text-white font-bold text-sm rounded-full hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
