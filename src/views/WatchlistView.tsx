import { useState, useEffect, useMemo } from 'react';
import { StockQuoteSnapshot } from '../types.ts';
import { apiClient } from '../services/apiClient.ts';
import { StockLogo } from '../components/common/StockLogo.tsx';
import { StockSectorBadge, getSectorZh } from '../utils/stockSectorMapper.tsx';
import {
  Star,
  Trash2,
  Bell,
  RefreshCw,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Activity,
  Sliders
} from 'lucide-react';

interface WatchlistViewProps {
  onSelectStock: (ticker: string) => void;
  onOpenAlertModal: (ticker: string, stockName?: string, currentRsi?: number) => void;
  onOpenAddWatchlist: () => void;
  watchlistTickers: string[];
  onRemoveFromWatchlist: (ticker: string) => void;
}

const POPULAR_RECOMMENDED = [
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'Semiconductors' },
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'Consumer Electronics' },
  { ticker: 'TSLA', name: 'Tesla Inc', sector: 'Automotive & Clean Energy' },
  { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'Cloud & Software' },
  { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'Enterprise AI & Defense' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors' },
  { ticker: 'AMZN', name: 'Amazon.com Inc', sector: 'E-Commerce & Cloud' },
  { ticker: 'META', name: 'Meta Platforms', sector: 'Social Media & AI' }
];

export function WatchlistView({
  onSelectStock,
  onOpenAlertModal,
  onOpenAddWatchlist,
  watchlistTickers,
  onRemoveFromWatchlist
}: WatchlistViewProps) {
  const [items, setItems] = useState<StockQuoteSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRsiFilter, setSelectedRsiFilter] = useState<'ALL' | 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL'>('ALL');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  const fetchWatchlist = async () => {
    setIsRefreshing(true);
    try {
      const data = await apiClient.getWatchlist(14);
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [watchlistTickers]);

  // Derived sectors
  const availableSectors = useMemo(() => {
    const s = new Set<string>();
    items.forEach(it => {
      const zh = getSectorZh(it.ticker, it.sector);
      if (zh) s.add(zh);
    });
    return Array.from(s);
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(stock => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTicker = stock.ticker.toLowerCase().includes(q);
        const matchName = stock.name.toLowerCase().includes(q);
        if (!matchTicker && !matchName) return false;
      }

      // RSI filter
      if (selectedRsiFilter === 'OVERSOLD' && stock.rsi.value >= 30) return false;
      if (selectedRsiFilter === 'OVERBOUGHT' && stock.rsi.value <= 70) return false;
      if (selectedRsiFilter === 'NEUTRAL' && (stock.rsi.value < 30 || stock.rsi.value > 70)) return false;

      // Sector filter
      if (selectedSectorFilter !== 'ALL') {
        const stockZh = getSectorZh(stock.ticker, stock.sector);
        if (stockZh !== selectedSectorFilter && stock.sector !== selectedSectorFilter) return false;
      }

      return true;
    });
  }, [items, searchQuery, selectedRsiFilter, selectedSectorFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    if (items.length === 0) return { oversold: 0, overbought: 0, gainers: 0, losers: 0, avgRsi: 50 };
    let oversold = 0;
    let overbought = 0;
    let gainers = 0;
    let losers = 0;
    let totalRsi = 0;

    items.forEach(i => {
      if (i.rsi.value < 30) oversold++;
      if (i.rsi.value > 70) overbought++;
      if (i.changePercent > 0) gainers++;
      else if (i.changePercent < 0) losers++;
      totalRsi += i.rsi.value;
    });

    return {
      oversold,
      overbought,
      gainers,
      losers,
      avgRsi: totalRsi / items.length
    };
  }, [items]);

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* 1. Header Banner & Metric Cards */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Star className="w-4 h-4 fill-blue-600 stroke-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                自选监控与多因子预警中心 (Watchlist & Monitor)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                深度监控自选核心持仓的报价波动、Wilder RSI 极值与多维度量化信号
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddWatchlist}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>添加自选</span>
            </button>

            <button
              type="button"
              onClick={fetchWatchlist}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="刷新自选行情"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">关注总数</span>
              <span className="font-mono text-[10px] text-slate-400">WATCHED</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-slate-900">{items.length}</span>
              <span className="text-xs font-bold text-slate-500 font-mono">标的</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">实时多周期监控</div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">超卖极值标的</span>
              <span className="font-mono text-[10px] text-emerald-600 font-bold">RSI &lt; 30</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-emerald-600">{metrics.oversold}</span>
              <span className="text-xs font-bold text-emerald-600 font-mono">潜在反弹</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">均值回归多头买点</div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">超买过热标的</span>
              <span className="font-mono text-[10px] text-rose-600 font-bold">RSI &gt; 70</span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-rose-600">{metrics.overbought}</span>
              <span className="text-xs font-bold text-rose-600 font-mono">过热预警</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">高位滞涨风险关注</div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">涨跌对比 / 平均RSI</span>
              <span className="font-mono text-[10px] text-slate-400">HEALTH</span>
            </div>
            <div className="flex items-baseline justify-between mt-2 font-mono">
              <span className="text-xs font-bold text-emerald-600">▲{metrics.gainers} / <span className="text-rose-600">▼{metrics.losers}</span></span>
              <span className="text-base font-black text-slate-900">{metrics.avgRsi.toFixed(1)}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">整体处于合理估值区间</div>
          </div>
        </div>
      </div>

      {/* 2. Filter & View Switcher Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索自选代码、公司名称或行业..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filter Badges & View Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {/* RSI Condition Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-[11px] font-bold shrink-0">
            {(['ALL', 'OVERSOLD', 'OVERBOUGHT', 'NEUTRAL'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedRsiFilter(tab)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedRsiFilter === tab
                    ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? '全部' : tab === 'OVERSOLD' ? '超卖 (<30)' : tab === 'OVERBOUGHT' ? '超买 (>70)' : '中性'}
              </button>
            ))}
          </div>

          {/* Sector Filter if available */}
          {availableSectors.length > 0 && (
            <select
              value={selectedSectorFilter}
              onChange={e => setSelectedSectorFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl text-xs py-1.5 px-2.5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="ALL">全部板块 ({availableSectors.length})</option>
              {availableSectors.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="卡片网格视图"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="数据表格视图"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Content: Grid / Table / Empty State */}
      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-slate-100 shadow-xs">
          <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
          <span className="text-xs font-mono font-bold text-slate-500">正在同步自选标的实时报价、多周期 RSI 与量化信号...</span>
        </div>
      ) : items.length === 0 ? (
        /* Empty State with Quick Recommendations */
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Star className="w-8 h-8 fill-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">暂无自选监控标的</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              将您关注的美股核心标的加入监控中心，系统将实时计算其 Wilder RSI 均值回归点位与技术指标形态。
            </p>
          </div>

          <div>
            <span className="text-xs font-mono font-bold text-slate-400 block mb-3 uppercase">一键添加热门核心标的：</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl mx-auto">
              {POPULAR_RECOMMENDED.map(pop => (
                <button
                  key={pop.ticker}
                  type="button"
                  onClick={async () => {
                    await apiClient.addToWatchlist(pop.ticker).catch(console.error);
                    fetchWatchlist();
                  }}
                  className="p-3 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 rounded-2xl text-left transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600">{pop.ticker}</span>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block mt-0.5">{pop.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center">
          <p className="text-xs font-bold text-slate-500">未找到符合当前搜索或筛选条件的标的</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedRsiFilter('ALL'); setSelectedSectorFilter('ALL'); }}
            className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            重置筛选条件
          </button>
        </div>
      ) : viewMode === 'GRID' ? (
        /* Rich Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map(stock => {
            const isOversold = stock.rsi.value < 30;
            const isOverbought = stock.rsi.value > 70;
            const isPositive = stock.changePercent >= 0;

            // Compute a quantitative signal label
            let quantSignal = '均线中性震荡';
            let quantSignalColor = 'bg-slate-100 text-slate-600 border-slate-200';
            if (isOversold) {
              quantSignal = '超卖反弹买点触发';
              quantSignalColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            } else if (isOverbought) {
              quantSignal = '高位过热超买预警';
              quantSignalColor = 'bg-rose-50 text-rose-700 border-rose-200';
            } else if (stock.changePercent > 2.5) {
              quantSignal = '放量强势多头突破';
              quantSignalColor = 'bg-blue-50 text-blue-700 border-blue-200';
            } else if (stock.changePercent < -2.5) {
              quantSignal = '空头调整破位测试';
              quantSignalColor = 'bg-amber-50 text-amber-700 border-amber-200';
            }

            return (
              <div
                key={stock.ticker}
                onClick={() => onSelectStock(stock.ticker)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-3"
              >
                {/* Header: Logo, Ticker, Sector, Trash */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <StockLogo ticker={stock.ticker} name={stock.name} size="md" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                          {stock.ticker}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {stock.exchange || 'US'}
                        </span>
                        <StockSectorBadge ticker={stock.ticker} sector={stock.sector} size="xs" />
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium truncate block max-w-[140px]">
                        {stock.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAlertModal(stock.ticker, stock.name, stock.rsi.value);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="为此股票设置预警"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromWatchlist(stock.ticker);
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="从自选移除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Price & Change */}
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 font-mono">
                  <div>
                    <span className="text-xl font-black text-slate-900">${stock.price.toFixed(2)}</span>
                  </div>
                  <div className={`text-xs font-black flex items-center gap-0.5 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span>{isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                  </div>
                </div>

                {/* RSI Gauge Strip */}
                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500 font-semibold">Wilder RSI(14)</span>
                    <span className={`font-black ${
                      isOversold ? 'text-emerald-600' : isOverbought ? 'text-rose-600' : 'text-slate-800'
                    }`}>
                      {stock.rsi.value.toFixed(1)}
                    </span>
                  </div>

                  {/* Progress bar visual */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOversold ? 'bg-emerald-500' : isOverbought ? 'bg-rose-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(Math.max(stock.rsi.value, 0), 100)}%` }}
                    />
                  </div>
                </div>

                {/* Signal Badge & Sector footer */}
                <div className="flex items-center justify-between text-[10px] pt-1">
                  <span className={`px-2 py-0.5 rounded-full font-bold border ${quantSignalColor}`}>
                    {quantSignal}
                  </span>
                  <span className="font-mono text-slate-500 font-bold">
                    {getSectorZh(stock.ticker, stock.sector)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Pro Table View */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-4 font-extrabold">标的代码 / 公司名称</th>
                  <th className="py-3 px-4 font-extrabold text-right">最新现价</th>
                  <th className="py-3 px-4 font-extrabold text-right">今日涨跌幅</th>
                  <th className="py-3 px-4 font-extrabold text-center">Wilder RSI(14)</th>
                  <th className="py-3 px-4 font-extrabold">量化状态与板块</th>
                  <th className="py-3 px-4 font-extrabold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {filteredItems.map(stock => {
                  const isOversold = stock.rsi.value < 30;
                  const isOverbought = stock.rsi.value > 70;
                  const isPositive = stock.changePercent >= 0;

                  return (
                    <tr
                      key={stock.ticker}
                      onClick={() => onSelectStock(stock.ticker)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <StockLogo ticker={stock.ticker} name={stock.name} size="sm" />
                          <div>
                            <span className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors font-sans block text-xs">
                              {stock.ticker}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[160px]">
                              {stock.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm">
                        ${stock.price.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className={`font-extrabold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`font-extrabold px-2 py-0.5 rounded-full text-xs ${
                          isOversold ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          isOverbought ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {stock.rsi.value.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans text-[11px]">
                        <StockSectorBadge ticker={stock.ticker} sector={stock.sector} size="xs" />
                      </td>

                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenAlertModal(stock.ticker, stock.name, stock.rsi.value)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="设置预警"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveFromWatchlist(stock.ticker)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="移除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}
    </div>
  );
}
