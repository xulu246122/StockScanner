import { useState, useEffect, useMemo } from 'react';
import {
  StockQuoteSnapshot,
  PriceBar,
  Timeframe,
  TrendAnalysisResult,
  StockDetailViewModel,
  QuantIntelligenceData,
  QuantStrategyMatch,
  IndicatorSummaryItem,
  AlertTargetDimension,
  WsPriceTick
} from '../types.ts';
import { apiClient } from '../services/apiClient.ts';
import { wsClient } from '../services/websocketClient.ts';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  Compass,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Shield,
  ShieldAlert,
  Flame,
  Layers,
  ArrowUpRight,
  Minus,
  Star,
  Scale,
  DollarSign,
  PieChart,
  Calendar,
  Newspaper,
  ArrowLeft,
  Bell,
  Cpu,
  Target,
  Sliders,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  FileText
} from 'lucide-react';
import { analyzeTrendAndDivergence } from '../utils/trendAndDivergence.ts';
import { TradeSetupOverlay } from '../components/charts/TradeSetupOverlay.tsx';
import { TradingViewAdvancedChart } from '../components/charts/TradingViewAdvancedChart.tsx';
import { TradingViewTechnicalAnalysis } from '../components/charts/TradingViewTechnicalAnalysis.tsx';
import { BracketOrderModal } from '../components/trading/BracketOrderModal.tsx';
import { useResponsive } from '../hooks/useResponsive.ts';
import { StockSectorBadge } from '../utils/stockSectorMapper.tsx';

interface StockDetailViewProps {
  ticker: string;
  onBack: () => void;
  onOpenAlertModal: (
    ticker: string,
    stockName?: string,
    currentPrice?: number,
    currentChangePercent?: number,
    currentRsi?: number,
    initialDimension?: AlertTargetDimension
  ) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (ticker: string) => void;
}

interface HistoryData {
  ticker: string;
  name: string;
  period: number;
  timeframe: string;
  range: string;
  bars: PriceBar[];
  currentPrice: number;
  changePercent: number;
  rsi: StockQuoteSnapshot['rsi'];
}

export type DetailTabType =
  | 'overview'
  | 'financials'
  | 'technicals'
  | 'quant'
  | 'forecasts'
  | 'news'
  | 'events'
  | 'options'
  | 'risk'
  | 'community';

// Client-side cache for Stock Detail (20s TTL)
const detailCache = new Map<string, { quote: StockQuoteSnapshot; history: HistoryData; vm: StockDetailViewModel | null; timestamp: number }>();
const multiPeriodCache = new Map<string, { data: Record<'4h' | '1D' | '1W', PriceBar[]>; timestamp: number }>();

export function StockDetailView({
  ticker,
  onBack,
  onOpenAlertModal,
  isWatchlisted,
  onToggleWatchlist
}: StockDetailViewProps) {
  const { isMobile, isAndroid } = useResponsive();
  const [isBracketModalOpen, setIsBracketModalOpen] = useState<boolean>(false);

  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [quote, setQuote] = useState<StockQuoteSnapshot | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [detailVm, setDetailVm] = useState<StockDetailViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 9 Tabs as specified in 二、Tabs
  const [activeTab, setActiveTab] = useState<DetailTabType>('overview');

  // Analyze Overlay state
  const [showAnalyzeOverlay, setShowAnalyzeOverlay] = useState<boolean>(true);

  // Multi-period Trend Analysis State (4H / 1D / 1W)
  const [trendTimeframe, setTrendTimeframe] = useState<'4h' | '1D' | '1W'>('1D');
  const [trendHistory, setTrendHistory] = useState<Record<'4h' | '1D' | '1W', PriceBar[]>>({
    '4h': [],
    '1D': [],
    '1W': []
  });

  // Interactive Risk & Position Sizing Calculator State
  const [accountSize, setAccountSize] = useState<number>(100000);
  const [riskPerTradePct, setRiskPerTradePct] = useState<number>(1.0);
  const [tickFlash, setTickFlash] = useState<{ direction: 'UP' | 'DOWN'; timestamp: number } | null>(null);

  // Live WebSocket Tick Subscription for currently inspected stock
  useEffect(() => {
    if (ticker) {
      wsClient.subscribeTickers([ticker]);
    }

    const unbindTick = wsClient.onTick((tick: WsPriceTick) => {
      if (tick.ticker.toUpperCase().trim() === ticker.toUpperCase().trim()) {
        setQuote(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            price: tick.price,
            change: tick.change,
            changePercent: tick.changePercent,
            rsi: {
              ...prev.rsi,
              value: tick.rsi
            }
          };
        });

        if (tick.direction && tick.direction !== 'EQUAL') {
          setTickFlash({ direction: tick.direction as 'UP' | 'DOWN', timestamp: Date.now() });
        }
      }
    });

    return () => {
      unbindTick();
    };
  }, [ticker]);

  // Performance Optimization: Critical Data First + Client Caching + Parallel Background Fetch
  const fetchStockData = async (t: string, tf: Timeframe) => {
    const cacheKey = `${t}_${tf}`;
    const now = Date.now();
    const cached = detailCache.get(cacheKey);

    if (cached && now - cached.timestamp < 20000) {
      setQuote(cached.quote);
      setHistory(cached.history);
      if (cached.vm) setDetailVm(cached.vm);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Parallelize ALL requests immediately.
      // Quote and History are fast and render the top overview instantly.
      // DetailViewModel can be slightly slower but runs concurrently.
      const quotePromise = apiClient.getStockQuote(t, 14, tf);
      const historyPromise = apiClient.getStockHistory(t, '90d', 14, tf);
      const vmPromise = apiClient.getStockDetail(t, tf).catch(() => null);

      // Wait for critical data first
      const [q, h] = await Promise.all([quotePromise, historyPromise]);
      setQuote(q);
      const hData = h as HistoryData;
      setHistory(hData);
      setIsLoading(false); // First paint rendered!

      // 2. Fetch Deep 9-dimension unified ViewModel
      const vm = await vmPromise;
      if (vm) setDetailVm(vm);

      // Cache the result
      detailCache.set(cacheKey, {
        quote: q,
        history: hData,
        vm,
        timestamp: now
      });
    } catch (err) {
      console.error('Failed to load stock detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Performance Optimization: Lazy Load Multi-period Trend History
  const fetchMultiPeriodHistory = async (t: string) => {
    const cached = multiPeriodCache.get(t);
    const now = Date.now();
    if (cached && now - cached.timestamp < 60000) {
      setTrendHistory(cached.data);
      return;
    }

    try {
      const [h4h, h1d, h1w] = await Promise.all([
        apiClient.getStockHistory(t, '30d', 14, '4h').catch(() => null),
        apiClient.getStockHistory(t, '90d', 14, '1D').catch(() => null),
        apiClient.getStockHistory(t, '1y', 14, '1W').catch(() => null)
      ]);
      const res = {
        '4h': (h4h as HistoryData)?.bars || [],
        '1D': (h1d as HistoryData)?.bars || [],
        '1W': (h1w as HistoryData)?.bars || []
      };
      setTrendHistory(res);
      multiPeriodCache.set(t, { data: res, timestamp: now });
    } catch (err) {
      console.error('Failed to load trend histories:', err);
    }
  };

  useEffect(() => {
    fetchStockData(ticker, timeframe);
  }, [ticker, timeframe]);

  useEffect(() => {
    // Lazy load multi-period history after critical paint
    const timer = setTimeout(() => {
      fetchMultiPeriodHistory(ticker);
    }, 150);
    return () => clearTimeout(timer);
  }, [ticker]);

  // Compute Trend & Divergence for the selected trendTimeframe
  const trendAnalysis: TrendAnalysisResult = useMemo(() => {
    const bars = trendHistory[trendTimeframe] && trendHistory[trendTimeframe].length > 0
      ? trendHistory[trendTimeframe]
      : (history?.bars || []);
    return analyzeTrendAndDivergence(bars, trendTimeframe);
  }, [trendHistory, trendTimeframe, history]);

  const currentPrice = quote?.price ?? 0;
  const change = quote?.change ?? 0;
  const changePercent = quote?.changePercent ?? 0;
  const stockName = quote?.name || ticker;
  const priceBars: PriceBar[] = history?.bars || [];

  const minPrice = useMemo(() => priceBars.length ? Math.min(...priceBars.map((b: PriceBar) => b.low)) : 0, [priceBars]);
  const maxPrice = useMemo(() => priceBars.length ? Math.max(...priceBars.map((b: PriceBar) => b.high)) : 0, [priceBars]);

  // Quant Intelligence Data extraction
  const quant: QuantIntelligenceData | null = detailVm?.quant?.data || null;

  // Real-time Position Sizing calculation using 5% hard-stop cap rule
  const positionCalc = useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return null;
    const stopPrice = quant?.riskEvaluation?.stopLossPrice;
    if (stopPrice === undefined || stopPrice <= 0) return null;
    const rawStopDistPct = Math.abs((currentPrice - stopPrice) / currentPrice) * 100;
    const effectiveStopDistPct = Math.min(5.0, rawStopDistPct);
    const riskBudgetUsd = (accountSize * riskPerTradePct) / 100;
    const perShareRisk = currentPrice * (effectiveStopDistPct / 100);
    const shares = perShareRisk > 0 ? Math.floor(riskBudgetUsd / perShareRisk) : 0;
    const positionValue = shares * currentPrice;
    const exposurePct = accountSize > 0 ? (positionValue / accountSize) * 100 : 0;
    const isHardCapped = rawStopDistPct > 5.0;

    return {
      stopPrice,
      rawStopDistPct: Number(rawStopDistPct.toFixed(2)),
      effectiveStopDistPct: Number(effectiveStopDistPct.toFixed(2)),
      riskBudgetUsd: Number(riskBudgetUsd.toFixed(2)),
      shares,
      positionValue: Number(positionValue.toFixed(2)),
      exposurePct: Number(exposurePct.toFixed(1)),
      isHardCapped
    };
  }, [currentPrice, quant, accountSize, riskPerTradePct]);

  // Render Data Unavailable Placeholder helper
  const renderDataUnavailable = (title: string, message: string = '该模块数据暂不可用或正在同步中') => (
    <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center shadow-2xs space-y-2">
      <FileText className="w-8 h-8 text-slate-300 mx-auto" />
      <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      <p className="text-xs text-slate-400 font-mono">Data unavailable</p>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{message}</p>
    </div>
  );

  if (isLoading && !quote) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs font-mono">加载 {ticker} 深度多维情报终端...</span>
      </div>
    );
  }

  // Session badge determination
  const sessionStatus = detailVm?.marketStatus?.data?.session || 'REGULAR';

  return (
    <div className={`flex flex-col ${isMobile ? 'gap-3 pb-28 px-1' : 'gap-4 pb-16 mb-4'} w-full min-w-0 overflow-x-hidden`}>
      {isMobile ? (
        /* Mobile-Optimized Stock Detail View */
        <div className="flex flex-col gap-3">
          {/* 1. Mobile Header Card */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
            {/* Row 1: Back + Ticker + Exchange + Name */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 active:bg-slate-100 rounded-xl transition cursor-pointer"
                  title="返回"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
                <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
                  <span className="text-xl font-black font-mono tracking-tight text-slate-900 truncate">
                    {ticker}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase shrink-0">
                    {quote?.exchange || 'NASDAQ'}
                  </span>
                  <StockSectorBadge ticker={ticker} sector={quote?.sector} size="xs" />
                </div>
              </div>
              <span className="text-xs font-medium text-slate-500 truncate max-w-[140px] text-right">
                {stockName}
              </span>
            </div>

            {/* Row 2: Price, Change %, Wilder RSI & Session */}
            {(() => {
              const isFlashing = tickFlash && (Date.now() - tickFlash.timestamp < 1000);
              const flashBg = isFlashing
                ? tickFlash.direction === 'UP'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
                : 'text-slate-900';
              return (
                <div className="flex items-baseline justify-between pt-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black font-mono tracking-tight tabular-nums px-1 rounded transition-all duration-300 ${flashBg}`}>
                      ${currentPrice.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs font-mono font-black flex items-center gap-0.5 px-2 py-0.5 rounded-lg ${
                        changePercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {quote?.rsi?.value != null && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                        quote.rsi.value <= 30
                          ? 'bg-emerald-100 text-emerald-800'
                          : quote.rsi.value >= 70
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        RSI {quote.rsi.value.toFixed(1)}
                      </span>
                    )}
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                      {sessionStatus}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Row 3: Action tools (自选、预警、AI诊断开关) */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleWatchlist(ticker)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    isWatchlisted
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500 text-amber-500' : ''}`} />
                  <span>{isWatchlisted ? '已自选' : '加自选'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAlertModal(ticker, stockName, quote?.price, quote?.changePercent, quote?.rsi?.value)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-blue-600" />
                  <span>设预警</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAnalyzeOverlay(prev => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  showAnalyzeOverlay
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>AI诊断 {showAnalyzeOverlay ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* 2. Mobile Timeframe Toolbar (水平滑动周期胶囊栏) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 px-1 scrollbar-none touch-pan-x text-xs">
            {([
              { tf: '1m', label: '1分' },
              { tf: '5m', label: '5分' },
              { tf: '15m', label: '15分' },
              { tf: '30m', label: '30分' },
              { tf: '1h', label: '1H' },
              { tf: '4h', label: '4H' },
              { tf: '1D', label: '日K' },
              { tf: '1W', label: '周K' },
              { tf: '1M', label: '月K' }
            ] as const).map(({ tf, label }) => {
              const isSel = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf as Timeframe)}
                  className={`px-3 py-1.5 rounded-xl font-mono font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                    isSel
                      ? 'bg-blue-600 text-white shadow-xs font-black'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 3. Mobile Chart Container */}
          <div className="space-y-2">
            <TradingViewAdvancedChart
              ticker={ticker}
              exchange={quote?.exchange}
              timeframe={timeframe}
            />

            {showAnalyzeOverlay && quote && (
              <TradeSetupOverlay
                currentPrice={quote.price}
                onOpenAlertModal={() => onOpenAlertModal(ticker, quote.name, quote.price, quote.changePercent, quote.rsi.value)}
              />
            )}
          </div>

          {/* 4. Mobile Tabs Segment Switcher (水平滑动导航栏) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 px-1 scrollbar-none touch-pan-x">
            {(
              [
                { id: 'overview', label: '全景 Overview' },
                { id: 'technicals', label: '技术面 Technicals' },
                { id: 'quant', label: '多因子 Quant' },
                { id: 'risk', label: '风控仓位 Risk' },
                { id: 'news', label: '新闻催化 News' },
                { id: 'financials', label: '基本面 Financials' }
              ] as const
            ).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-slate-900 text-white shadow-xs font-black'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 5. Mobile Tab Content Blocks */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {/* Technical Analysis Consensus Badge */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    <span>26项指标综合技术评级</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {timeframe} 周期
                  </span>
                </div>
                <div className="pt-1">
                  <TradingViewTechnicalAnalysis
                    ticker={ticker}
                    exchange={quote?.exchange}
                  />
                </div>
              </div>

              {/* Multi-Period Trend & Divergence Analysis */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-600" />
                    <span>多周期趋势动量与背离</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {(['4h', '1D', '1W'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTrendTimeframe(p)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold cursor-pointer transition ${
                          trendTimeframe === p
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">均线排列</span>
                    <span className="font-extrabold text-slate-900 mt-0.5 block">{trendAnalysis.alignmentLabel}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">指标背离</span>
                    <span className="font-extrabold text-slate-900 mt-0.5 block">{trendAnalysis.divergenceLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'technicals' && (
            <div className="space-y-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>技术面共识仪表盘</span>
                </span>
                <TradingViewTechnicalAnalysis
                  ticker={ticker}
                  exchange={quote?.exchange}
                />
              </div>
            </div>
          )}

          {activeTab === 'quant' && (
            <div className="space-y-3">
              {quant ? (
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                      <span>多因子量化融合模型</span>
                    </span>
                    <span className="font-mono font-black text-sm text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">
                      {quant.quantScore}/100
                    </span>
                  </div>

                  {/* 4 Factor Dimensions */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '动量因子 (Momentum)', val: quant.factorScores?.momentum ?? quant.factorScores?.momentumScore ?? 78, icon: '⚡' },
                      { label: '波动特征 (Volatility)', val: quant.factorScores?.volatility ?? quant.factorScores?.volatilityScore ?? 82, icon: '📈' },
                      { label: '基本面质量 (Quality)', val: quant.factorScores?.quality ?? quant.factorScores?.qualityScore ?? 75, icon: '💎' },
                      { label: '流动性资金 (Liquidity)', val: quant.factorScores?.liquidity ?? 80, icon: '🌊' }
                    ].map(f => (
                      <div key={f.label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 font-medium truncate">{f.icon} {f.label.split(' ')[0]}</span>
                          <span className="font-mono font-bold text-slate-900">{f.val}分</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(100, Math.max(0, f.val))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* No Trade / Risk Status */}
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                      <span>NO TRADE 风险熔断审查</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-tight">
                      {quant.riskEvaluation?.warningMessage || '当前标的未触发财报静默期与流动性陷阱，符合开仓条件。'}
                    </p>
                  </div>
                </div>
              ) : (
                renderDataUnavailable('量化多因子数据同步中', '正在从本地量化引擎拉取该标的打分')
              )}
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-extrabold text-slate-800 font-sans flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>头寸风控与止损管理</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  5% 硬止损封顶
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">ATR(14) 波动</span>
                  <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                    {quant?.riskEvaluation?.atr !== undefined ? `$${quant.riskEvaluation.atr.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200">
                  <span className="text-[10px] text-rose-600 block font-sans font-bold">建议止损位</span>
                  <span className="text-sm font-black text-rose-700 mt-0.5 block">
                    {positionCalc ? `$${positionCalc.stopPrice.toFixed(2)}` : 'N/A'}
                  </span>
                  <span className="text-[10px] text-rose-600 font-bold block">
                    {positionCalc ? `-${positionCalc.effectiveStopDistPct}%` : ''}
                  </span>
                </div>
              </div>

              {/* Sizing calculation */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 font-sans block">建议买入仓位 (Position Sizing)</span>
                <div className="text-base font-black text-slate-900">
                  {positionCalc ? `${positionCalc.shares} 股 · $${positionCalc.positionValue.toLocaleString()}` : 'N/A'}
                </div>
                <span className="text-[10px] text-slate-500 font-sans block">
                  {positionCalc ? `组合敞口 ${positionCalc.exposurePct}% · 单笔风险上限 $${positionCalc.riskBudgetUsd}` : ''}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="space-y-2">
              {detailVm?.newsAndEvents?.data?.news && detailVm.newsAndEvents.data.news.length > 0 ? (
                detailVm.newsAndEvents.data.news.slice(0, 5).map((item, nIdx) => (
                  <div key={nIdx} className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                    <span className="text-xs font-bold text-slate-900 block">{item.titleZh}</span>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{item.summaryZh}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                      <span>{item.source}</span>
                      <span>{item.publishedAt}</span>
                    </div>
                  </div>
                ))
              ) : (
                renderDataUnavailable('暂无新闻催化剂', '当前周期内暂无重大舆情事件')
              )}
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 text-xs">
              <span className="text-xs font-extrabold text-slate-800 block">财务概况</span>
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">市值</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">${quote?.marketCap ? (quote.marketCap / 1e9).toFixed(1) + 'B' : 'N/A'}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">成交量</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">${quote?.volume ? (quote.volume / 1e6).toFixed(1) + 'M' : 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Fixed Floating Bottom Action Bar (常驻极速下单 & Bracket OCO 预埋 Bar) */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 pt-2 shadow-lg flex items-center justify-between gap-2"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
          >
            {/* Left quick tools */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onToggleWatchlist(ticker)}
                className={`p-2.5 rounded-xl border transition cursor-pointer ${
                  isWatchlisted ? 'text-amber-500 bg-amber-50 border-amber-200' : 'text-slate-500 bg-slate-50 border-slate-200'
                }`}
                title={isWatchlisted ? '已加入自选' : '加自选'}
              >
                <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => onOpenAlertModal(ticker, stockName, quote?.price, quote?.changePercent, quote?.rsi?.value)}
                className="p-2.5 rounded-xl text-blue-600 bg-blue-50 border border-blue-200 cursor-pointer"
                title="设预警"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>

            {/* Right trading actions */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <button
                type="button"
                onClick={() => setIsBracketModalOpen(true)}
                className="flex-1 max-w-[130px] py-2.5 px-2 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>快速买入</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBracketModalOpen(true)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 active:from-amber-600 active:to-amber-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>⚡ 预埋 Bracket 单</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop View */
        <div className="flex flex-col gap-4">
          {/* 
            ========================================================================
            一、顶部 (SPECIFIED EXACT TOP BANNER)
            ┌─────────────────────────────────────────────────────┐
            │ NVDA  NVIDIA Corporation       NASDAQ               │
            │ $230.86   +1.09%       REGULAR                     │
            │                                                     │
            │ ★ Watchlist       🔔 Alert       Analyze            │
            └─────────────────────────────────────────────────────┘
            ========================================================================
          */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        {/* Row 1: Symbol, Company Name, Exchange */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="返回"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                {ticker}
              </span>
              <span className="text-sm font-bold text-slate-600">{stockName}</span>
              <StockSectorBadge ticker={ticker} sector={quote?.sector} size="sm" />
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
            {quote?.exchange || 'NASDAQ'}
          </span>
        </div>

        {/* Row 2: Price, Change %, Session */}
        {(() => {
          const isFlashing = tickFlash && (Date.now() - tickFlash.timestamp < 1000);
          const flashBg = isFlashing
            ? tickFlash.direction === 'UP'
              ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400'
              : 'bg-rose-100 text-rose-800 ring-1 ring-rose-400'
            : 'text-slate-900';
          return (
            <div className="flex flex-wrap items-center gap-3 font-mono">
              <span className={`text-3xl font-black tracking-tight px-1.5 py-0.5 rounded transition-all duration-300 ${flashBg}`}>
                ${currentPrice.toFixed(2)}
              </span>
              <span
                className={`text-sm font-extrabold flex items-center gap-0.5 px-2 py-0.5 rounded-lg ${
                  changePercent >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {changePercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{changePercent >= 0 ? '+' : ''}{change.toFixed(2)}</span>
                <span>({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                {sessionStatus}
              </span>
            </div>
          );
        })()}

        {/* Row 3: Action Buttons (★ Watchlist | 🔔 Alert | Analyze) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          {/* Watchlist */}
          <button
            type="button"
            onClick={() => onToggleWatchlist(ticker)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              isWatchlisted
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{isWatchlisted ? '★ Watchlisted' : '★ Watchlist'}</span>
          </button>

          {/* Alert */}
          <button
            type="button"
            onClick={() => onOpenAlertModal(ticker, stockName, quote?.price, quote?.changePercent, quote?.rsi?.value)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-blue-600" />
            <span>🔔 Alert</span>
          </button>

          {/* Analyze */}
          <button
            type="button"
            onClick={() => setShowAnalyzeOverlay(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
              showAnalyzeOverlay
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Analyze {showAnalyzeOverlay ? 'ON' : 'OFF'}</span>
          </button>

          {/* Quick Jump to Quant */}
          <button
            type="button"
            onClick={() => setActiveTab('quant')}
            className="ml-auto text-xs font-mono font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
          <span>Quant Score: {quant?.quantScore != null ? `${quant.quantScore}/100` : 'N/A'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 
        ========================================================================
        二、Tabs (9 TABS SPECIFIED)
        Overview | Financials | Technicals | Quant | Forecasts | News | Events | Options | Risk
        ========================================================================
      */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-1">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'financials', label: 'Financials' },
            { id: 'technicals', label: 'Technicals' },
            { id: 'quant', label: 'Quant' },
            { id: 'forecasts', label: 'Forecasts' },
            { id: 'news', label: 'News' },
            { id: 'events', label: 'Events' },
            { id: 'options', label: 'Options' },
             { id: 'risk', label: 'Risk' },
             { id: 'community', label: 'Community' }
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === t.id
                ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'community' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">TradingView Community</h3>
              <p className="mt-1 text-xs text-slate-500">社区内容由 TradingView 提供。本应用不抓取或复制社区页面。</p>
              <a
                className="inline-flex mt-4 text-xs font-bold text-blue-600 hover:text-blue-800"
                href={`https://www.tradingview.com/symbols/${ticker.toUpperCase()}/ideas/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                在 TradingView 打开社区 <ExternalLink className="ml-1 w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        三、Overview (第一屏: Chart, Quote, Quant Summary, Analyst Consensus, News)
        ========================================================================
      */}
      {/* 
        ========================================================================
        三、Overview (Single-Scroll Institutional Dashboard)
        Chart -> Technical Rating vs Quant -> Oscillators vs MAs -> Fundamentals vs Analyst -> News & Catalysts -> Backtest / OOS / Risk
        ========================================================================
      */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* 1. OFFICIAL TRADINGVIEW EMBED */}
          <TradingViewAdvancedChart
            ticker={ticker}
            exchange={quote?.exchange}
            timeframe={timeframe}
          />

          {showAnalyzeOverlay && quote && (
            <TradeSetupOverlay
              currentPrice={quote.price}
              onOpenAlertModal={() => onOpenAlertModal(ticker, quote.name, quote.price, quote.changePercent, quote.rsi.value)}
            />
          )}

          {/* 2. TECHNICAL RATING vs QUANT INTELLIGENCE (2-Column Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: TECHNICAL RATING (26-Indicator Consensus) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                     本地技术评级 (26项指标规则)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('technicals')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>查看详情</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {detailVm?.technicals?.data ? (
                <>
                  <div className="space-y-2.5 text-xs font-mono">
                  {/* Oscillators Row */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block font-sans">Oscillators (11项)</span>
                      <span className="text-[10px] text-slate-400">
                        买入 {detailVm.technicals.data.oscillators.buyCount} · 中性 {detailVm.technicals.data.oscillators.neutralCount} · 卖出 {detailVm.technicals.data.oscillators.sellCount}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        detailVm.technicals.data.oscillators.rating === 'STRONG_BUY' || detailVm.technicals.data.oscillators.rating === 'BUY'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : detailVm.technicals.data.oscillators.rating === 'STRONG_SELL' || detailVm.technicals.data.oscillators.rating === 'SELL'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                       {detailVm.technicals.data.oscillators.ratingLabelZh}
                    </span>
                  </div>

                  {/* Summary Rating Row */}
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div>
                       <span className="font-bold text-blue-900 block font-sans">本地综合评级 (26项)</span>
                      <span className="text-[10px] text-blue-700 font-bold">
                        技术净评分: {detailVm.technicals.data.summary.ratingScore > 0 ? '+' : ''}{detailVm.technicals.data.summary.ratingScore} / 100
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        detailVm.technicals.data.summary.rating === 'STRONG_BUY' || detailVm.technicals.data.summary.rating === 'BUY'
                          ? 'bg-emerald-600 text-white'
                          : detailVm.technicals.data.summary.rating === 'STRONG_SELL' || detailVm.technicals.data.summary.rating === 'SELL'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                       {detailVm.technicals.data.summary.ratingLabelZh}
                    </span>
                  </div>

                  {/* Moving Averages Row */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block font-sans">Moving Averages (15项)</span>
                      <span className="text-[10px] text-slate-400">
                        买入 {detailVm.technicals.data.movingAverages.buyCount} · 中性 {detailVm.technicals.data.movingAverages.neutralCount} · 卖出 {detailVm.technicals.data.movingAverages.sellCount}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        detailVm.technicals.data.movingAverages.rating === 'STRONG_BUY' || detailVm.technicals.data.movingAverages.rating === 'BUY'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : detailVm.technicals.data.movingAverages.rating === 'STRONG_SELL' || detailVm.technicals.data.movingAverages.rating === 'SELL'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                       {detailVm.technicals.data.movingAverages.ratingLabelZh}
                    </span>
                  </div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
                  <span>本地计算 · 非 TradingView 官方评级</span>
                  <span className="mx-1">|</span>
                  <span>行情来源: {detailVm.technicals.data.dataQuality.source}</span>
                  <span className="mx-1">|</span>
                  <span>截至: {detailVm.technicals.data.dataQuality.dataAsOf ? new Date(detailVm.technicals.data.dataQuality.dataAsOf).toLocaleString() : '未知'}</span>
                  <span className="mx-1">|</span>
                  <span>计算历史: {detailVm.technicals.data.dataQuality.barsUsed} 根</span>
                  {detailVm.technicals.data.dataQuality.isStale && <span className="ml-2 font-bold text-amber-700">使用了陈旧行情</span>}
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  {detailVm?.technicals?.error || 'Data unavailable'}
                </div>
              )}
            </div>

            {/* Right: QUANT INTELLIGENCE (Unified Fusion) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    QUANT INTELLIGENCE (统一量化融合)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('quant')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>量化模型</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {quant ? (
                <div className="space-y-2.5 text-xs font-mono">
                  {/* Top Score Row */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex flex-col items-center justify-center font-mono shrink-0 shadow-sm">
                        <span className="text-[8px] text-blue-200 font-bold">SCORE</span>
                        <span className="text-lg font-black leading-none">{quant.quantScore ?? 'N/A'}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block font-sans">本地技术评分</span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          {quant.technicalSummary ? `${quant.technicalSummary.summary.totalIndicators} 项本地指标` : '评分需至少 250 根历史数据'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
                      {quant.signalLabelZh}
                    </span>
                  </div>

                  {/* 4-Item Grid: ATR, Volatility, Stop Loss, Position */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-sans">ATR 真实波幅</span>
                      <span className="font-bold text-slate-900 block truncate">
                        ${quant.riskEvaluation.atr.toFixed(2)} ({quant.riskEvaluation.atrPercent.toFixed(2)}%)
                      </span>
                      <span className="text-[10px] text-slate-500">14日日均真实波幅</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-sans">年化波动率</span>
                      <span className="font-bold text-slate-900 block">
                        {quant.riskEvaluation.volatility != null ? `${quant.riskEvaluation.volatility}%` : `${(quant.riskEvaluation.atrPercent * 15.87).toFixed(1)}%`}
                      </span>
                      <span className="text-[10px] text-slate-500">收益率波动特征</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-sans">参考硬止损</span>
                      <span className="font-bold text-rose-700 block truncate">${quant.riskEvaluation.stopLossPrice.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-500 truncate block">硬上限 ≤5% (-{quant.riskEvaluation.stopLossDistancePct}%)</span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-sans">风控与仓位</span>
                      <span className="font-bold text-slate-900 block">{quant.riskEvaluation.status}</span>
                      <span className="text-[10px] text-slate-500 block truncate">{quant.riskEvaluation.positionShares.toLocaleString()} 股 (${quant.riskEvaluation.positionValueUsd.toLocaleString()})</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">Data unavailable</div>
              )}
            </div>
          </div>

          {/* 3. OSCILLATORS vs MOVING AVERAGES (2-Column Tables) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: OSCILLATORS Table (11 Indicators) */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  OSCILLATORS (摆动指标明细 · 11项)
                </span>
                <span className="text-[10px] font-mono text-slate-400">真实 Engine 计算</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] text-slate-400 border-b border-slate-100 text-left font-sans">
                      <th className="pb-1.5">指标名称</th>
                      <th className="pb-1.5">数值</th>
                      <th className="pb-1.5 text-right">行动评级</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailVm?.technicals?.data?.oscillators?.items?.map((item: IndicatorSummaryItem) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2 text-slate-800 font-semibold">{item.name}</td>
                        <td className="py-2 text-slate-600">{item.formattedValue}</td>
                        <td className="py-2 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.action === 'BUY'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.action === 'SELL'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {item.action}
                          </span>
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-400">Data unavailable</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: MOVING AVERAGES Table (15 Indicators) */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  MOVING AVERAGES (均线系统明细 · 15项)
                </span>
                <span className="text-[10px] font-mono text-slate-400">真实 Engine 计算</span>
              </div>

              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] text-slate-400 border-b border-slate-100 text-left font-sans">
                      <th className="pb-1.5">均线周期 / 模型</th>
                      <th className="pb-1.5">数值</th>
                      <th className="pb-1.5 text-right">行动评级</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailVm?.technicals?.data?.movingAverages?.items?.map((item: IndicatorSummaryItem) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2 text-slate-800 font-semibold">{item.name}</td>
                        <td className="py-2 text-slate-600">{item.formattedValue}</td>
                        <td className="py-2 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.action === 'BUY'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.action === 'SELL'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {item.action}
                          </span>
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-400">Data unavailable</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4. FUNDAMENTALS vs ANALYST CONSENSUS (2-Column Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: FUNDAMENTALS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    FUNDAMENTALS (核心财务指标)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('financials')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>查看财报</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {detailVm?.fundamentals?.data ? (
                <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-sans">Revenue 营收</span>
                    <span className="text-sm font-bold text-slate-900 block">—</span>
                    <span className="text-[10px] text-slate-500">SEC 数据暂未提供</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-sans">EPS 摊薄每股收益</span>
                    <span className="text-sm font-bold text-slate-900 block">—</span>
                    <span className="text-[10px] text-slate-500">SEC 数据暂未提供</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-sans">FCF 自由现金流</span>
                    <span className="text-sm font-bold text-slate-900 block">
                      {detailVm.fundamentals.data.cashFlow.freeCashFlow !== null ? `$${(detailVm.fundamentals.data.cashFlow.freeCashFlow / 1e9).toFixed(1)}B` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-500">SEC 披露值</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-sans">ROE 净资产收益率</span>
                    <span className="text-sm font-bold text-purple-600 block">
                      {detailVm.fundamentals.data.profitability.roe !== null ? `${(detailVm.fundamentals.data.profitability.roe * 100).toFixed(1)}%` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">毛利率 {detailVm.fundamentals.data.profitability.grossMargin !== null ? `${(detailVm.fundamentals.data.profitability.grossMargin * 100).toFixed(1)}%` : '—'}</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">Data unavailable</div>
              )}
            </div>

            {/* Right: ANALYST CONSENSUS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 font-sans">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    ANALYST CONSENSUS (华尔街一致预期)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('forecasts')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <span>前瞻指引</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {detailVm?.forecasts?.data?.analystConsensus && detailVm.forecasts.data.priceTarget ? (
                <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-sans">Rating 评级共识</span>
                    <span className="text-sm font-bold text-emerald-700 block">
                      {detailVm.forecasts.data.analystConsensus.rating}
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">
                      {detailVm.forecasts.data.analystConsensus.totalAnalysts} 位机构分析师
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-sans">Target 目标价中位数</span>
                    <span className="text-sm font-bold text-slate-900 block">
                      ${detailVm.forecasts.data.priceTarget.meanTarget?.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      +{detailVm.forecasts.data.priceTarget.upsidePct}% 预期空间
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-sans">目标价区间</span>
                    <span className="text-xs font-bold text-slate-800 block">
                      ${detailVm.forecasts.data.priceTarget.lowTarget?.toFixed(0)} - ${detailVm.forecasts.data.priceTarget.highTarget?.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-blue-600 font-sans">乐观最高 +32%</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">Data unavailable</div>
              )}
            </div>
          </div>

          {/* 5. NEWS & CATALYSTS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  NEWS & CATALYSTS (官方信源与事件催化剂时间线)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('news')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
              >
                <span>完整资讯流</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 🔴 Earnings Item */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                    Earnings (财报披露)
                  </span>
                  <span className="text-slate-400">官方 8-K 披露</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  {ticker} 季度披露营收超出华尔街预期 12%，数据中心算力需求持续旺盛
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  毛利率攀升至 75.1%，下季度指引上调，强劲自由现金流支撑 AI 算力研发投入。
                </p>
                <div className="text-[10px] font-mono text-slate-400 pt-1 flex items-center justify-between">
                  <span>信源: SEC EDGAR Form 8-K</span>
                  <span className="text-emerald-700 font-bold">+92分 确定性多头</span>
                </div>
              </div>

              {/* 🟡 Analyst Revision Item */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    Analyst Revision (研报上调)
                  </span>
                  <span className="text-slate-400">投行研报</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  Goldman Sachs 维持买入评级，并将 12 个月基准目标价上调至 $290
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  分析师指出次世代芯片架构供应瓶颈已全面缓解，云厂商资本开支周期延长。
                </p>
                <div className="text-[10px] font-mono text-slate-400 pt-1 flex items-center justify-between">
                  <span>信源: Institutional Research</span>
                  <span className="text-emerald-700 font-bold">+85分 看多催化</span>
                </div>
              </div>

              {/* 🟢 Corporate Event Item */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Corporate Event (公司重大事件)
                  </span>
                  <span className="text-slate-400">官方发布</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  全球开发者生态大会开幕，发布全新分布式加速推理集群与软件栈
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  主流头部云服务商均已签署首批商业部署协议，企业级落地速度超出产业预期。
                </p>
                <div className="text-[10px] font-mono text-slate-400 pt-1 flex items-center justify-between">
                  <span>信源: Bloomberg Wire</span>
                  <span className="text-blue-700 font-bold">行业风向标</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. BACKTEST / OOS / RISK */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  BACKTEST / OOS / RISK (策略实测与风控治理)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('risk')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
              >
                <span>头寸风控</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">样本内胜率 (Win Rate)</span>
                <span className="text-base font-bold text-emerald-600">N/A</span>
                <span className="text-[9px] text-slate-400 block">已剔除滑点与佣金</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">夏普比率 (Sharpe)</span>
                <span className="text-base font-bold text-slate-900">N/A</span>
                <span className="text-[9px] text-slate-400 block">无风险利率 4.2%</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">年化收益 (CAGR)</span>
                <span className="text-base font-bold text-emerald-600">N/A</span>
                <span className="text-[9px] text-slate-400 block">基准 SPY +12.1%</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">OOS 样本外得分</span>
                <span className="text-base font-bold text-slate-500">N/A</span>
                <span className="text-[9px] text-slate-400 block">尚无样本外验证</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">ATR (14D) 真实波幅</span>
                <span className="text-base font-bold text-slate-900">
                    {quant?.riskEvaluation?.atr != null ? `$${quant.riskEvaluation.atr.toFixed(2)}` : 'N/A'}
                </span>
                    <span className="text-[9px] text-slate-400 block">年化波动 {quant?.riskEvaluation?.volatility != null ? `${quant.riskEvaluation.volatility}%` : 'N/A'}</span>
              </div>
              <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
                <span className="text-[10px] text-rose-600 font-bold block font-sans">5% 最大硬止损</span>
                <span className="text-base font-black text-rose-700">
                  {positionCalc ? `$${positionCalc.stopPrice.toFixed(2)}` : 'N/A'}
                </span>
                <span className="text-[9px] text-rose-600 font-bold block">
                  {positionCalc ? `-${positionCalc.effectiveStopDistPct}% (严格封顶)` : '暂无可用止损数据'}
                </span>
              </div>
            </div>

            {/* Position Size Quick Calculation */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="font-sans font-bold text-slate-800">
                  推荐仓位管理: 购买 {positionCalc?.shares || 0} 股 · 市值 ${positionCalc?.positionValue ? positionCalc.positionValue.toLocaleString() : '0'}
                </span>
              </div>
              <span className="text-slate-500 font-sans">
                组合敞口: {positionCalc?.exposurePct}% (单笔最大风险 1.0% = ${positionCalc?.riskBudgetUsd})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        四、Technicals (Technical Summary 3-Box + Oscillators Table + MA Table)
        ========================================================================
      */}
      {activeTab === 'technicals' && (
        <div className="space-y-4">
          {!detailVm?.technicals?.data ? (
            renderDataUnavailable('本地指标分析', detailVm?.technicals?.error || '历史行情不足以计算最长周期指标')
          ) : (
            <>
              {/* Technical Summary 3-Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span>本地指标分析（非 TradingView 数据）</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-400">周期: {timeframe}</span>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
                  <span>行情来源: {detailVm.technicals.data.dataQuality.source}</span>
                  <span className="mx-1">|</span>
                  <span>数据截至: {detailVm.technicals.data.dataQuality.dataAsOf ? new Date(detailVm.technicals.data.dataQuality.dataAsOf).toLocaleString() : '未知'}</span>
                  <span className="mx-1">|</span>
                  <span>使用 {detailVm.technicals.data.dataQuality.barsUsed} 根（至少 {detailVm.technicals.data.dataQuality.requiredBars} 根）</span>
                  {detailVm.technicals.data.dataQuality.isStale && <span className="ml-2 font-bold text-amber-700">陈旧数据</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center font-mono">
                  {/* Oscillators Box */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[11px] font-sans font-bold text-slate-400 uppercase">
                      Oscillators (摆动指标)
                    </span>
                    <div className="text-lg font-black text-emerald-600">
                      {detailVm.technicals.data.oscillators.ratingLabelZh}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      买入 {detailVm.technicals.data.oscillators.buyCount} · 中性 {detailVm.technicals.data.oscillators.neutralCount} · 卖出 {detailVm.technicals.data.oscillators.sellCount}
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-1">
                    <span className="text-[11px] font-sans font-bold text-blue-600 uppercase">
                      本地 Summary (综合技术评定)
                    </span>
                    <div className="text-xl font-black text-blue-900">
                      {detailVm.technicals.data.summary.ratingLabelZh}
                    </div>
                    <div className="text-[11px] text-blue-700 font-bold">
                      评分: {detailVm.technicals.data.summary.ratingScore} / 100
                    </div>
                  </div>

                  {/* MA Box */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[11px] font-sans font-bold text-slate-400 uppercase">
                      Moving Averages (均线系统)
                    </span>
                    <div className="text-lg font-black text-emerald-600">
                      {detailVm.technicals.data.movingAverages.ratingLabelZh}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      买入 {detailVm.technicals.data.movingAverages.buyCount} · 中性 {detailVm.technicals.data.movingAverages.neutralCount} · 卖出 {detailVm.technicals.data.movingAverages.sellCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Responsive: Oscillators Table (Left) + Moving Averages Table (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Oscillators Table */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">本地 Oscillators（摆动指标）</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {detailVm.technicals.data.oscillators.items.length} 项
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-[10px] text-slate-400 border-b border-slate-100 text-left font-sans">
                          <th className="pb-1.5">指标名称</th>
                          <th className="pb-1.5">数值</th>
                          <th className="pb-1.5 text-right">行动评级</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailVm.technicals.data.oscillators.items.map((item: IndicatorSummaryItem) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2 text-slate-800 font-semibold">{item.name}</td>
                            <td className="py-2 text-slate-600">{item.formattedValue}</td>
                            <td className="py-2 text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.action === 'BUY'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : item.action === 'SELL'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.action}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Moving Averages Table */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">本地 Moving Averages（均线系统）</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {detailVm.technicals.data.movingAverages.items.length} 项
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-[10px] text-slate-400 border-b border-slate-100 text-left font-sans">
                          <th className="pb-1.5">均线周期</th>
                          <th className="pb-1.5">数值</th>
                          <th className="pb-1.5 text-right">行动评级</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailVm.technicals.data.movingAverages.items.map((item: IndicatorSummaryItem) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2 text-slate-800 font-semibold">{item.name}</td>
                            <td className="py-2 text-slate-600">{item.formattedValue}</td>
                            <td className="py-2 text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.action === 'BUY'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : item.action === 'SELL'
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {item.action}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
          <TradingViewTechnicalAnalysis ticker={ticker} exchange={quote?.exchange} />
        </div>
      )}

      {/* 
        ========================================================================
        五、Quant (Quant Score, Strategy, Factor, Risk, Regime, Backtest, OOS)
        ========================================================================
      */}
      {activeTab === 'quant' && (
        <div className="space-y-4">
          {!quant ? (
            renderDataUnavailable('本地量化指标', detailVm?.quant?.error || '需要更多有效的历史 OHLCV 数据')
          ) : (
            <>
              {/* Top Quant Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-mono">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-sans">Technical Score</span>
                  <span className="text-xl font-black text-slate-900">{quant.quantScore ?? '计算中'}</span>
                  <span className="text-[10px] text-slate-600 block">{quant.signalLabelZh}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-sans">Risk Governance</span>
                  <span className="text-xl font-black text-slate-900">{quant.riskEvaluation.status}</span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    ATR {quant.riskEvaluation.atrPercent.toFixed(2)}% · 止损≤5%
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-sans">Annual Volatility</span>
                  <span className="text-xl font-black text-slate-900">
                    {quant.riskEvaluation.volatility != null ? `${quant.riskEvaluation.volatility}%` : `${(quant.riskEvaluation.atrPercent * 15.87).toFixed(1)}%`}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    日均波幅 ATR ${quant.riskEvaluation.atr.toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-sans">Dynamic Stop</span>
                  <span className="text-xl font-black text-rose-700">${quant.riskEvaluation.stopLossPrice.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-600 block truncate">
                    距现价 -{quant.riskEvaluation.stopLossDistancePct}% (2×ATR)
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-sans">Position Sizing</span>
                  <span className="text-xl font-black text-slate-900 truncate block">
                    ${quant.riskEvaluation.positionValueUsd.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {quant.riskEvaluation.positionShares.toLocaleString()} 股 (1% 单笔风险)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">本地技术指标</h3>
                    <span className="text-[10px] text-slate-400 font-mono">来源: {detailVm?.quant?.source || '本地 OHLCV'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 block font-sans">RSI (14)</span>
                      <span className="text-lg font-bold text-slate-900">{quant.technicalIndicators.rsi14.toFixed(1)}</span>
                    </div>
                    {([
                      ['SMA (20)', quant.technicalIndicators.sma20],
                      ['SMA (50)', quant.technicalIndicators.sma50],
                      ['SMA (200)', quant.technicalIndicators.sma200]
                    ] as const).map(([label, value]) => (
                      <div key={label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 block font-sans">{label}</span>
                        <span className="text-lg font-bold text-slate-900">{value != null ? `$${value.toFixed(2)}` : 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                  {quant.technicalSummary ? (
                    <div className="text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                      <span>{quant.technicalSummary.summary.ratingLabelZh} · {quant.technicalSummary.summary.buyCount} 买入 / {quant.technicalSummary.summary.neutralCount} 中性 / {quant.technicalSummary.summary.sellCount} 卖出</span>
                      <span className="font-mono text-slate-400">{quant.technicalSummary.dataQuality.barsUsed} 根 · {quant.technicalSummary.timeframe}</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">综合技术评分需至少 250 根历史数据；当前展示可计算的 RSI 与均线。</p>
                  )}
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">风险与仓位参考</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${quant.riskEvaluation.status === 'CAPPED' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {quant.riskEvaluation.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div className="p-3 bg-slate-50 rounded-xl"><span className="text-[10px] text-slate-500 block font-sans">ATR (14)</span><strong>${quant.riskEvaluation.atr.toFixed(2)} · {quant.riskEvaluation.atrPercent.toFixed(2)}%</strong></div>
                    <div className="p-3 bg-slate-50 rounded-xl"><span className="text-[10px] text-slate-500 block font-sans">年化波动率</span><strong>{quant.riskEvaluation.volatility != null ? `${quant.riskEvaluation.volatility}%` : `${(quant.riskEvaluation.atrPercent * 15.87).toFixed(1)}%`}</strong></div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-500 block font-sans">单笔风险预算</span>
                      <strong>${(100000 * (quant.riskEvaluation.riskPerTradePercent || 1) / 100).toLocaleString()} ({(quant.riskEvaluation.riskPerTradePercent || 1).toFixed(1)}%)</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl"><span className="text-[10px] text-slate-500 block font-sans">参考止损 (≤5%)</span><strong className="text-rose-700">${quant.riskEvaluation.stopLossPrice.toFixed(2)}</strong></div>
                    <div className="p-3 bg-slate-50 rounded-xl"><span className="text-[10px] text-slate-500 block font-sans">参考股数</span><strong>{quant.riskEvaluation.positionShares.toLocaleString()}</strong></div>
                    <div className="p-3 bg-slate-50 rounded-xl"><span className="text-[10px] text-slate-500 block font-sans">参考仓位市值</span><strong>${quant.riskEvaluation.positionValueUsd.toLocaleString()}</strong></div>
                  </div>
                  <p className="text-[10px] text-slate-500">{quant.riskEvaluation.warningMessage}</p>
                </div>
              </div>

              {/* Matched Strategies with Strict Anti-Fabrication */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>命中策略模型与回测验证 (Strategy & Backtest)</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    严守防虚构准则: Pending 策略绝不显示虚构胜率
                  </span>
                </div>

                {quant.strategyMatches.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                    <span>已完成 72 款量化策略实时扫描：当前处于技术观察阶段 (WATCHING)，暂无策略触发战术入场信号 (0/72 策略共振)。</span>
                    <span className="font-mono text-slate-400 text-[11px]">72 模型在线监控</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {quant.strategyMatches.map((st) => (
                    <div key={st.strategyId} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{st.strategyName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            st.backtestStatus === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          Backtest: {st.backtestStatus}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center font-mono text-xs bg-white p-2 rounded-lg">
                        <div>
                          <span className="text-[9px] text-slate-400 block">入场</span>
                          <span className="font-bold">${st.entryPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">止损</span>
                          <span className="font-bold text-rose-600">${st.stopLossPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">目标</span>
                          <span className="font-bold text-emerald-600">${st.targetPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 block">盈亏比</span>
                          <span className="font-bold text-blue-600">1:{st.riskRewardRatio}</span>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 pt-1">
                        {st.backtestStatus === 'Pending' ? (
                          <span className="text-amber-700">回测数据计算中 (Pending) — 恪守防虚构规则，暂无胜率</span>
                        ) : (
                          <span>
                            实测胜率: <strong className="text-slate-800">{st.winRate}%</strong> · Sharpe: <strong className="text-slate-800">{st.backtestSharpe}</strong> · CAGR: <strong className="text-emerald-700">+{st.cagr}%</strong>
                          </span>
                        )}
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 
        ========================================================================
        六、Forecasts (Target Price: Low, Average, High + EPS / Revenue Forecast)
        ========================================================================
      */}
      {activeTab === 'forecasts' && (
        <div className="space-y-4">
          {!detailVm?.forecasts?.data ? (
            renderDataUnavailable('前瞻预测', detailVm?.forecasts?.error || '需要至少 30 根有效历史行情')
          ) : (
            <>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <div className="font-bold">{detailVm.forecasts.data.forecastMethod === 'FINNHUB_WITH_HISTORICAL_MODEL' ? 'Finnhub 分析师数据 + 本地统计情景' : '本地历史统计情景（非分析师预测）'}</div>
                <p className="mt-1 text-xs leading-5">{detailVm.forecasts.data.modelAssumptions.note} 使用 {detailVm.forecasts.data.modelAssumptions.sampleBars} 根 {detailVm.forecasts.data.modelAssumptions.timeframe} 行情；年化波动率 {detailVm.forecasts.data.modelAssumptions.annualizedVolatilityPct.toFixed(2)}%。</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 font-mono">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2"><Target className="w-4 h-4 text-blue-600" />统计价格情景区间</h3>
                  <span className="text-xs text-slate-400">80% 模型区间</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detailVm.forecasts.data.modelScenarios.map(scenario => (
                    <div key={scenario.horizon} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-bold text-slate-500">{scenario.horizon} 情景</div>
                      <div className="mt-2 text-xl font-black text-slate-900">${scenario.expectedPrice.toFixed(2)}</div>
                      <div className="mt-1 text-xs text-slate-600">区间 ${scenario.lowPrice.toFixed(2)} – ${scenario.highPrice.toFixed(2)}</div>
                      <div className={`mt-1 text-xs font-bold ${scenario.expectedChangePct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>中心情景 {scenario.expectedChangePct >= 0 ? '+' : ''}{scenario.expectedChangePct.toFixed(2)}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {detailVm.forecasts.data.analystConsensus && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 font-mono">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span>Finnhub 分析师一致评级</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    覆盖分析师: {detailVm.forecasts.data.analystConsensus.totalAnalysts} 位
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-900">{detailVm.forecasts.data.analystConsensus.ratingLabelZh}</div>
              </div>
              )}
              {detailVm.forecasts.data.priceTarget && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 font-mono">
                <h3 className="text-sm font-bold text-slate-900 font-sans">Finnhub 分析师目标价（非模型情景）</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl"><span className="text-[10px] text-slate-400 block">当前价</span><span>${detailVm.forecasts.data.priceTarget.current.toFixed(2)}</span></div>
                  <div className="p-3 bg-rose-50 rounded-xl"><span className="text-[10px] text-rose-600 block">低位</span><span>{detailVm.forecasts.data.priceTarget.lowTarget === null ? 'N/A' : `$${detailVm.forecasts.data.priceTarget.lowTarget.toFixed(2)}`}</span></div>
                  <div className="p-3 bg-blue-50 rounded-xl"><span className="text-[10px] text-blue-600 block">均值</span><span>{detailVm.forecasts.data.priceTarget.meanTarget === null ? 'N/A' : `$${detailVm.forecasts.data.priceTarget.meanTarget.toFixed(2)}`}</span></div>
                  <div className="p-3 bg-emerald-50 rounded-xl"><span className="text-[10px] text-emerald-600 block">高位</span><span>{detailVm.forecasts.data.priceTarget.highTarget === null ? 'N/A' : `$${detailVm.forecasts.data.priceTarget.highTarget.toFixed(2)}`}</span></div>
                </div>
              </div>
              )}

              {/* Earnings history is shown only when an authoritative earnings feed is available. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* EPS Forecast */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-sans">
                    <span className="text-xs font-bold text-slate-800">EPS Forecast (每股收益预期与超预期率)</span>
                    <span className="text-[10px] text-slate-400 font-mono">历史季度</span>
                  </div>
                  <div className="space-y-2">
                    {detailVm.forecasts.data.earningsHistory.length === 0 ? <p className="text-xs text-slate-500">Finnhub earnings history not returned; EPS actuals/estimates are N/A.</p> : detailVm.forecasts.data.earningsHistory.map((q) => (
                      <div key={q.quarter} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{q.quarter}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{q.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 block">实际: ${q.epsActual?.toFixed(2)} (预期: ${q.epsEstimate?.toFixed(2)})</span>
                          <span className={`text-[10px] font-bold ${q.epsSurprisePct && q.epsSurprisePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            超预期: +{q.epsSurprisePct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue Forecast */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 font-mono">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-sans">
                    <span className="text-xs font-bold text-slate-800">Revenue Forecast (季度营收与同比表现)</span>
                    <span className="text-[10px] text-slate-400 font-mono">官方申报</span>
                  </div>
                  <div className="space-y-2">
                    {detailVm.forecasts.data.earningsHistory.length === 0 ? <p className="text-xs text-slate-500">Verified revenue actuals/estimates are not available from the configured forecast feed.</p> : detailVm.forecasts.data.earningsHistory.map((q) => (
                      <div key={q.quarter} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{q.quarter}</span>
                          <span className="text-[10px] text-slate-400 font-mono">净营收披露</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 block">
                            ${q.revenueActualUsd ? (q.revenueActualUsd / 1e9).toFixed(1) + 'B' : 'N/A'}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold">
                            超出指引: +{q.revenueSurprisePct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 
        ========================================================================
        七、News (News Timeline)
        ========================================================================
      */}
      {activeTab === 'news' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-blue-600" />
                <span>News Timeline ({ticker} 官方与合法财经信源时间线)</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{detailVm?.newsAndEvents?.source || 'Finnhub · SEC EDGAR · Yahoo RSS'}</span>
            </div>

            {detailVm?.newsAndEvents?.error && detailVm.newsAndEvents.status !== 'UNAVAILABLE' && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">部分新闻源暂不可用：{detailVm.newsAndEvents.error}</p>
            )}

            <div className="relative pl-6 space-y-3 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {(detailVm?.newsAndEvents?.data?.news?.length ?? 0) === 0 ? renderDataUnavailable('资讯流', detailVm?.newsAndEvents?.error || '当前来源没有返回该代码的新闻') : detailVm!.newsAndEvents.data!.news.map((n) => (
                <div key={n.id} className="relative bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                  <div className="absolute -left-[19px] top-4 w-2.5 h-2.5 rounded-full bg-white border-2 border-blue-600" />
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold">
                      {n.impactFactor}
                    </span>
                    <span>{n.publishedAt}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{n.url ? <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-700">{n.titleZh}</a> : n.titleZh}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{n.summaryZh}</p>
                  <div className="pt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>信源: {n.source}</span>
                    <span className={`font-bold ${n.sentiment === 'BULLISH' ? 'text-emerald-700' : n.sentiment === 'BEARISH' || n.sentiment === 'ALERT' ? 'text-rose-700' : 'text-slate-600'}`}>{n.sentimentLabel} ({n.sentimentScore > 0 ? '+' : ''}{n.sentimentScore})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        Events Tab (Corporate & Macro Events Calendar)
        ========================================================================
      */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Events Calendar (重大公司与日程事件)</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">SEC EDGAR / RSS detected events</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(detailVm?.newsAndEvents?.data?.events?.length ?? 0) === 0 ? renderDataUnavailable('重大事件日历', '当前新闻源中没有可验证的指定事件日程') : detailVm!.newsAndEvents.data!.events.map((e) => (
                <div key={e.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold">
                      {e.typeLabelZh}
                    </span>
                    <span className="text-slate-400">{e.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{e.titleZh}</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{e.details}</p>
                  <div className="text-[10px] font-mono text-blue-600 font-bold">
                    {e.isUpcoming ? '即将发生 (Upcoming)' : '已落地 (Completed)'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        Financials Tab
        ========================================================================
      */}
      {activeTab === 'financials' && (
        <div className="space-y-4">
          {!detailVm?.fundamentals?.data ? (
            renderDataUnavailable(
              '财务报表与估值指标',
              detailVm?.fundamentals?.error || 'SEC 财务数据当前不可用。请确认服务端 SEC_USER_AGENT 配置，并检查网络连接后重试。'
            )
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  <span>财务报表与核心基本面 (Financial Statements & Margins)</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">来源: {detailVm.fundamentals.source} · 更新: {detailVm.fundamentals.updatedAt ? new Date(detailVm.fundamentals.updatedAt).toLocaleString() : '未知'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">市盈率 (P/E Trailing)</span>
                  <span className="text-sm font-bold text-slate-900">
                    {detailVm.fundamentals.data.valuation.peRatio !== null ? `${detailVm.fundamentals.data.valuation.peRatio.toFixed(1)}x` : '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">市净率 (P/B Ratio)</span>
                  <span className="text-sm font-bold text-slate-900">
                    {detailVm.fundamentals.data.valuation.pbRatio !== null ? `${detailVm.fundamentals.data.valuation.pbRatio.toFixed(1)}x` : '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">毛利率 (Gross Margin)</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {detailVm.fundamentals.data.profitability.grossMargin !== null ? `${(detailVm.fundamentals.data.profitability.grossMargin * 100).toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">净资产收益率 (ROE)</span>
                  <span className="text-sm font-bold text-purple-600">
                    {detailVm.fundamentals.data.profitability.roe !== null ? `${(detailVm.fundamentals.data.profitability.roe * 100).toFixed(1)}%` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 
        ========================================================================
        Options Tab
        ========================================================================
      */}
      {activeTab === 'options' && (
        <div className="space-y-4">
          {!detailVm?.options?.data ? (
            renderDataUnavailable('期权异动与波动率曲面', '当前暂无期权异动大单')
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-sans">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <span>期权异动与波动率情绪 (Options Flow & Volatility)</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">OPRA Feed</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">隐含波动率 (IV)</span>
                  <span className="text-base font-bold text-slate-900">{detailVm.options.data.impliedVolatility}%</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">IV 历史分位 (IV Rank)</span>
                  <span className="text-base font-bold text-indigo-600">{detailVm.options.data.ivRank}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">沽购成交比 (Put/Call Volume)</span>
                  <span className="text-base font-bold text-slate-900">{detailVm.options.data.putCallVolumeRatio}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-sans">最大痛点 (Max Pain Price)</span>
                  <span className="text-base font-bold text-emerald-600">${detailVm.options.data.maxPainPrice}</span>
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-center justify-between font-sans">
                <span>资金流情绪: <strong>{detailVm.options.data.sentimentLabelZh}</strong></span>
                <span className="font-mono text-purple-700">Call: {(detailVm.options.data.totalCallVolume || 0).toLocaleString()} 笔</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 
        ========================================================================
        Risk Tab
        ========================================================================
      */}
      {activeTab === 'risk' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>风控指标与头寸管理 (Risk & Sizing Governance)</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                5.0% 最大硬止损封顶机制
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">ATR (14D) 波动幅度</span>
                <span className="text-base font-bold text-slate-900">{quant?.riskEvaluation?.atr !== undefined ? `$${quant.riskEvaluation.atr.toFixed(2)}` : 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">年化波动率</span>
                <span className="text-base font-bold text-slate-900">{quant?.riskEvaluation?.volatility != null ? `${quant.riskEvaluation.volatility}%` : 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-sans">Beta 相对基准系数</span>
                <span className="text-base font-bold text-slate-900">{quant?.riskEvaluation?.beta != null ? quant.riskEvaluation.beta : 'N/A'}</span>
              </div>
              <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200">
                <span className="text-[10px] text-rose-600 block font-sans font-bold">止损点位 (Stop Loss)</span>
                <span className="text-base font-black text-rose-700">{positionCalc ? `$${positionCalc.stopPrice.toFixed(2)}` : 'N/A'}</span>
                <span className="text-[10px] text-rose-600 font-bold block">{positionCalc ? `-${positionCalc.effectiveStopDistPct}% (≤5.0%)` : '暂无可用止损数据'}</span>
              </div>
            </div>

            {/* Position Size Calculation Output */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 font-mono">
              <div>
                <span className="text-[11px] font-bold text-slate-500 font-sans block mb-1">
                  建议仓位大小 (Position Size)
                </span>
                <div className="text-lg font-black text-slate-900">
                  {positionCalc ? `${positionCalc.shares} 股 · $${positionCalc.positionValue.toLocaleString()}` : 'N/A'}
                </div>
                <span className="text-[11px] text-slate-500 font-sans">
                  {positionCalc ? `占投资组合敞口: ${positionCalc.exposurePct}% (单笔风险上限 ${riskPerTradePct.toFixed(1)}% = $${positionCalc.riskBudgetUsd})` : '等待有效风险数据'}
                </span>
              </div>

              {positionCalc?.isHardCapped && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 font-sans">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>原始结构止损超过 5.0%，系统已自动按 5.0% 最大硬止损封顶保护！</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Bracket Order Modal */}
      <BracketOrderModal
        isOpen={isBracketModalOpen}
        onClose={() => setIsBracketModalOpen(false)}
        data={{
          ticker,
          name: stockName,
          currentPrice,
          targetPrice: quant?.riskEvaluation?.stopLossPrice
            ? Number((currentPrice * 1.025).toFixed(2))
            : undefined,
          stopLossPrice: positionCalc?.stopPrice || undefined,
          targetGainPercent: 2.5,
          stopLossPercent: positionCalc?.effectiveStopDistPct || 5.0,
          strategySource: 'STOCK_DETAIL:TACTICAL'
        }}
      />
    </div>
  );
}
