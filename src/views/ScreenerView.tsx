import { useState, useEffect, useCallback } from 'react';
import {
  ScreenerResponse,
  Timeframe,
  StrategyDefinition,
  ConditionGroup
} from '../types.ts';
import { apiClient } from '../services/apiClient.ts';
import { ScreenerTable } from '../components/screener/ScreenerTable.tsx';
import {
  Search,
  SlidersHorizontal,
  X,
  RefreshCw,
  Sliders,
  Check,
  RotateCcw,
  ArrowUpDown,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  BookOpen,
  Sparkles,
  AlertTriangle,
  Layers,
  Cpu,
  HeartPulse,
  Landmark,
  ShoppingBag,
  Radio,
  Flame,
  Factory,
  Globe
} from 'lucide-react';

interface ScreenerViewProps {
  onSelectStock: (ticker: string) => void;
  onOpenAlertModal: (ticker: string, stockName?: string, currentRsi?: number) => void;
  initialPreset?: string;
}

const SECTORS = [
  { id: 'ALL', label: '全部板块 (All Sectors)', short: '全部板块', icon: Building2, desc: '全市场所有行业标的' },
  { id: 'Technology', label: '科技与半导体 (Tech & Semi)', short: '科技', icon: Cpu, desc: '英伟达、苹果、微软、台积电等' },
  { id: 'Healthcare', label: '医疗与生物医药 (Healthcare)', short: '医疗', icon: HeartPulse, desc: '礼来、联合健康、辉瑞、诺和等' },
  { id: 'Financial Services', label: '金融与银行业 (Financials)', short: '金融', icon: Landmark, desc: '摩根大通、伯克希尔、Visa、万事达' },
  { id: 'Consumer Cyclical', label: '可选消费与汽车 (Consumer)', short: '消费', icon: ShoppingBag, desc: '特斯拉、亚马逊、耐克、家得宝' },
  { id: 'Communication Services', label: '通信与互联网 (Communication)', short: '通信', icon: Radio, desc: '谷歌、Meta、奈飞、迪士尼' },
  { id: 'Energy', label: '石油与天然气能源 (Energy)', short: '能源', icon: Flame, desc: '埃克森美孚、雪佛龙、康菲石油' },
  { id: 'Industrials', label: '航天军工与工业 (Industrials)', short: '工业', icon: Factory, desc: '波音、卡特彼勒、洛克希德马丁' }
];

const MARKET_CAP_TIERS = [
  { val: 0, label: '全部市值 (≥ $200M)', short: '全部市值', desc: '已排除低于2亿美元微盘垃圾股' },
  { val: 100000000000, label: '> $100B 超大盘股 (Mega Cap)', short: '> $100B', desc: '万亿与千亿级行业核心顶流' },
  { val: 10000000000, label: '> $10B 大盘核心股 (Large Cap)', short: '> $10B', desc: '标普500核心权重与各行业领军者' },
  { val: 2000000000, label: '> $2B 中盘成长股 (Mid Cap)', short: '> $2B', desc: '兼具成长性与充足流动性' },
  { val: 500000000, label: '> $500M 小型潜力股 (Small Cap)', short: '> $500M', desc: '活跃的小型高弹性标的' }
];

type QuickSortOption = 'DEFAULT' | 'GAINERS' | 'LOSERS' | 'RSI_LOW' | 'RSI_HIGH' | 'MCAP_DESC';
type ActiveDropdownType = null | 'UNIVERSE' | 'SECTOR' | 'MARKET_CAP' | 'STRATEGY';

export function ScreenerView({
  onSelectStock,
  onOpenAlertModal,
  initialPreset
}: ScreenerViewProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  
  // Dropdowns
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdownType>(null);

  // Universe Filter State
  const [universes, setUniverses] = useState<any[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<string>('ALL');

  // Sector and Market Cap filters
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedMinCap, setSelectedMinCap] = useState<number>(0);
  const [quickSort, setQuickSort] = useState<QuickSortOption>('MCAP_DESC');

  // Technical filter state
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');
  const [exchangeFilter, setExchangeFilter] = useState<'ALL' | 'NYSE' | 'NASDAQ'>('ALL');

  // Strategies list for quick-load
  const [strategies, setStrategies] = useState<StrategyDefinition[]>([]);
  const [loadedStrategy, setLoadedStrategy] = useState<StrategyDefinition | null>(null);
  const [strategySearchQuery, setStrategySearchQuery] = useState('');
  const [strategyCategoryFilter, setStrategyCategoryFilter] = useState<string>('ALL');
  const [activeRules, setActiveRules] = useState<ConditionGroup>({
    type: 'group',
    id: 'root',
    logicalOperator: 'AND',
    children: []
  });

  // Load Universes & Strategies from Backend
  useEffect(() => {
    apiClient.getUniverseList().then(res => {
      if (res.universes && res.universes.length > 0) {
        setUniverses(res.universes);
      }
    }).catch(console.error);

    apiClient.getQuantStrategies().then(res => {
      if (res.strategies) setStrategies(res.strategies);
    }).catch(console.error);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Derive sort fields
  const getSortParams = (): { sortBy: 'rsi' | 'marketCap' | 'changePercent' | 'price' | 'ticker'; sortOrder: 'asc' | 'desc' } => {
    switch (quickSort) {
      case 'MCAP_DESC':
        return { sortBy: 'marketCap', sortOrder: 'desc' };
      case 'GAINERS':
        return { sortBy: 'changePercent', sortOrder: 'desc' };
      case 'LOSERS':
        return { sortBy: 'changePercent', sortOrder: 'asc' };
      case 'RSI_LOW':
        return { sortBy: 'rsi', sortOrder: 'asc' };
      case 'RSI_HIGH':
        return { sortBy: 'rsi', sortOrder: 'desc' };
      case 'DEFAULT':
      default:
        return { sortBy: 'marketCap', sortOrder: 'desc' };
    }
  };

  const [data, setData] = useState<ScreenerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScreener = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { sortBy, sortOrder } = getSortParams();
    try {
      if (activeRules.children && activeRules.children.length > 0) {
        const res = await apiClient.runCustomASTScreener(activeRules, selectedTimeframe, {
          universe: selectedUniverse !== 'ALL' ? selectedUniverse : undefined,
          market: exchangeFilter,
          sector: selectedSector !== 'ALL' ? selectedSector : undefined,
          minMarketCap: selectedMinCap > 0 ? selectedMinCap : 200000000,
          sortBy,
          sortOrder,
          searchQuery: debouncedQuery.trim() || undefined,
          page: 1,
          pageSize: 100
        });
        setData(res);
      } else {
        const res = await apiClient.runScreener({
          universe: selectedUniverse !== 'ALL' ? selectedUniverse : undefined,
          market: exchangeFilter,
          sector: selectedSector !== 'ALL' ? selectedSector : undefined,
          minMarketCap: selectedMinCap > 0 ? selectedMinCap : 200000000,
          timeframe: selectedTimeframe,
          preset: initialPreset as any,
          sortBy,
          sortOrder,
          searchQuery: debouncedQuery.trim() || undefined,
          page: 1,
          pageSize: 100
        });
        setData(res);
      }
    } catch (err: any) {
      console.error('Screener fetch error:', err);
      setError(err.message || '获取筛选数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [
    activeRules,
    selectedUniverse,
    selectedSector,
    selectedMinCap,
    quickSort,
    selectedTimeframe,
    exchangeFilter,
    debouncedQuery,
    initialPreset
  ]);

  useEffect(() => {
    fetchScreener();
  }, [fetchScreener]);

  const handleSelectStrategyModel = (st: StrategyDefinition) => {
    setLoadedStrategy(st);
    setActiveRules(JSON.parse(JSON.stringify(st.rules)));
    setActiveDropdown(null);
  };

  const handleClearStrategy = () => {
    setLoadedStrategy(null);
    setActiveRules({
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: []
    });
  };

  const handleResetAll = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedSector('ALL');
    setSelectedMinCap(0);
    setQuickSort('MCAP_DESC');
    setSelectedTimeframe('1D');
    setExchangeFilter('ALL');
    setActiveDropdown(null);
    handleClearStrategy();
  };

  const displayedStocks = data?.results || [];
  const currentUniverseObj = universes.find(u => u.code === selectedUniverse);
  const currentSectorObj = SECTORS.find(s => s.id === selectedSector);
  const currentMcapObj = MARKET_CAP_TIERS.find(m => m.val === selectedMinCap);

  return (
    <div className="flex flex-col min-h-full relative space-y-3">
      {/* 
        ========================================================================
        1. UNIFIED INSTITUTIONAL COMMAND BAR (精简多因子选股控制栏)
        ========================================================================
      */}
      <div className="sticky top-0 z-30 bg-white/98 backdrop-blur-md pt-2.5 pb-2 px-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
        {/* Row 1: Search + Dropdowns */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
          
          {/* Left: Search input */}
          <div className="relative flex-1 min-w-[200px] max-w-xl flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标的、代码或公司 (如 NVDA, AAPL, 微软)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
                title="清空搜索"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Quick Action Controls + Strategy Model Dropdown */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
            
            {/* 16-Universe Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'UNIVERSE' ? null : 'UNIVERSE')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  selectedUniverse !== 'ALL'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {selectedUniverse === 'ALL'
                    ? '全部标的池'
                    : (universes.find(u => u.code === selectedUniverse)?.name || selectedUniverse)}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeDropdown === 'UNIVERSE' ? 'rotate-180 text-emerald-600' : ''}`} />
              </button>

              {activeDropdown === 'UNIVERSE' && (
                <div 
                  className="absolute left-0 lg:right-0 lg:left-auto top-full mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold text-slate-400 px-2.5 py-1 uppercase tracking-wider flex items-center justify-between">
                    <span>美股标的股票池 (16 Universes)</span>
                    <span className="text-[9px] font-mono text-emerald-600">SQLite Engine</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUniverse('ALL');
                        setActiveDropdown(null);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-bold text-left cursor-pointer transition-colors ${
                        selectedUniverse === 'ALL'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-700 hover:bg-emerald-50'
                      }`}
                    >
                      <span>全市场标的 (All Market)</span>
                      {selectedUniverse === 'ALL' && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    {universes.map(u => {
                      const isSelected = selectedUniverse === u.code;
                      const isIncomplete = u.expectedCount && u.expectedCount > u.memberCount;
                      return (
                        <button
                          key={u.code}
                          type="button"
                          onClick={() => {
                            setSelectedUniverse(u.code);
                            setActiveDropdown(null);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-bold text-left cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-700 hover:bg-emerald-50'
                          }`}
                        >
                          <span className="truncate pr-2">{u.name}</span>
                          <span className={`text-[10px] font-mono font-normal px-1.5 py-0.2 rounded shrink-0 ${
                            isSelected
                              ? 'bg-emerald-700 text-emerald-100'
                              : isIncomplete
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {isIncomplete ? `Loaded ${u.memberCount} / Expected ${u.expectedCount}` : `${u.memberCount} 支`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Sector Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'SECTOR' ? null : 'SECTOR')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  selectedSector !== 'ALL'
                    ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>{selectedSector === 'ALL' ? '全行业板块' : currentSectorObj?.short}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeDropdown === 'SECTOR' ? 'rotate-180 text-purple-600' : ''}`} />
              </button>

              {activeDropdown === 'SECTOR' && (
                <div 
                  className="absolute left-0 lg:right-0 lg:left-auto top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold text-slate-400 px-2.5 py-1 uppercase tracking-wider">
                    选择行业板块
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {SECTORS.map(sec => {
                      const isSelected = selectedSector === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => {
                            setSelectedSector(sec.id);
                            setActiveDropdown(null);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-bold text-left cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'text-slate-700 hover:bg-purple-50'
                          }`}
                        >
                          <span>{sec.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Market Cap Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'MARKET_CAP' ? null : 'MARKET_CAP')}
                className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  selectedMinCap > 0
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{selectedMinCap === 0 ? '全部市值' : currentMcapObj?.short}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${activeDropdown === 'MARKET_CAP' ? 'rotate-180 text-blue-600' : ''}`} />
              </button>

              {activeDropdown === 'MARKET_CAP' && (
                <div 
                  className="absolute left-0 lg:right-0 lg:left-auto top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold text-slate-400 px-2.5 py-1 uppercase tracking-wider">
                    选择最低市值门槛
                  </div>
                  <div className="space-y-0.5">
                    {MARKET_CAP_TIERS.map(tier => {
                      const isSelected = selectedMinCap === tier.val;
                      return (
                        <button
                          key={tier.val}
                          type="button"
                          onClick={() => {
                            setSelectedMinCap(tier.val);
                            setActiveDropdown(null);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-bold text-left cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700 hover:bg-blue-50'
                          }`}
                        >
                          <span>{tier.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Sort Toggles */}
            <button
              type="button"
              onClick={() => {
                if (quickSort === 'GAINERS') setQuickSort('LOSERS');
                else if (quickSort === 'LOSERS') setQuickSort('DEFAULT');
                else setQuickSort('GAINERS');
              }}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                quickSort === 'GAINERS'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs'
                  : quickSort === 'LOSERS'
                  ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="切换涨幅榜 / 跌幅榜 / 正常综合排序"
            >
              {quickSort === 'GAINERS' ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 stroke-[2.4]" />
              ) : quickSort === 'LOSERS' ? (
                <TrendingDown className="w-3.5 h-3.5 text-rose-600 stroke-[2.4]" />
              ) : (
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 stroke-[2]" />
              )}
              <span>{quickSort === 'GAINERS' ? '涨幅榜' : quickSort === 'LOSERS' ? '跌幅榜' : '涨跌榜'}</span>
            </button>

            {/* Strategy Model Quick Load Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'STRATEGY' ? null : 'STRATEGY')}
                className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  loadedStrategy
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
                title="快速载入经典量化策略模型"
              >
                <BookOpen className="w-3.5 h-3.5 stroke-[2.4]" />
                <span>{loadedStrategy ? loadedStrategy.shortName : '载入量化策略'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === 'STRATEGY' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'STRATEGY' && (
                <div 
                  className="absolute right-0 top-full mt-1.5 w-88 sm:w-96 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-2.5 z-40 animate-in fade-in zoom-in-95 duration-100 select-none"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-800">
                    <span className="text-[11px] font-black text-white">量化交易模型库 ({strategies.length})</span>
                    <span className="text-[9px] text-blue-400 font-mono font-bold">QUANT MODEL HUB</span>
                  </div>

                  {/* Dropdown Search Bar */}
                  <div className="pt-2 pb-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={strategySearchQuery}
                        onChange={e => setStrategySearchQuery(e.target.value)}
                        placeholder="在 60+ 顶级模型中快速检索..."
                        className="w-full pl-7 pr-3 py-1 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1.5 custom-scrollbar text-[10px] font-bold">
                    {[
                      { id: 'ALL', label: '全部' },
                      { id: 'TREND', label: '趋势' },
                      { id: 'MEAN_REVERSION', label: '回归' },
                      { id: 'BREAKOUT', label: '突破' },
                      { id: 'FACTOR', label: '多因子' },
                      { id: 'SMART_MONEY', label: '资金流' },
                      { id: 'STAT_ARB', label: '套利' },
                      { id: 'AI_ML', label: 'AI量化' },
                      { id: 'MACRO_REGIME', label: '宏观' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setStrategyCategoryFilter(cat.id)}
                        className={`px-2 py-0.5 rounded-md shrink-0 transition-colors cursor-pointer ${
                          strategyCategoryFilter === cat.id
                            ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                            : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1 custom-scrollbar pt-1">
                    {strategies
                      .filter(st => {
                        if (strategyCategoryFilter !== 'ALL' && st.category !== strategyCategoryFilter) {
                          return false;
                        }
                        if (!strategySearchQuery.trim()) return true;
                        const q = strategySearchQuery.toLowerCase();
                        return (
                          st.name.toLowerCase().includes(q) ||
                          st.shortName.toLowerCase().includes(q) ||
                          st.author.toLowerCase().includes(q) ||
                          (st.tags && st.tags.some(t => t.toLowerCase().includes(q)))
                        );
                      })
                      .map(st => {
                        const isSelected = loadedStrategy?.id === st.id;
                        const level = st.evidenceLevel || 'LEVEL_A';
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              handleSelectStrategyModel(st);
                              setActiveDropdown(null);
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer flex items-center justify-between text-xs group ${
                              isSelected
                                ? 'bg-blue-600 text-white font-bold'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold truncate">{st.shortName}</span>
                                <span
                                  className={`text-[8px] font-mono px-1 py-0.1 rounded border ${
                                    isSelected
                                      ? 'bg-blue-700 text-white border-blue-400'
                                      : level === 'LEVEL_S'
                                      ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                      : 'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}
                                >
                                  {level.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate font-normal mt-0.5 flex items-center gap-1.5">
                                <span className={isSelected ? 'text-blue-100' : 'text-slate-300'}>{st.author}</span>
                                <span>·</span>
                                <span className={isSelected ? 'text-blue-100' : 'text-blue-300'}>{st.holdingPeriodLabel || st.horizon}</span>
                                {st.winRateEst && (
                                  <>
                                    <span>·</span>
                                    <span className="text-emerald-400 font-mono font-bold">{st.winRateEst}% 胜率</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 stroke-[2.5] shrink-0" />}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Reset All */}
            <button
              type="button"
              onClick={handleResetAll}
              className="px-2.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="重置全部筛选条件"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Status Summary Strip */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
          <div className="flex items-center gap-2 truncate">
            <span className="font-extrabold text-slate-800">
              匹配 {data?.total !== undefined ? data.total : displayedStocks.length} 只标的
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-sans">
              {currentUniverseObj ? `池容量: ${currentUniverseObj.memberCount}` : '全市场'}
            </span>
            <span>·</span>
            <span className="text-purple-700 font-bold">{currentSectorObj?.short}</span>
            <span>·</span>
            <span className="text-blue-600 font-bold">
              {quickSort === 'GAINERS' ? '涨幅优先' : quickSort === 'LOSERS' ? '跌幅优先' : quickSort === 'RSI_LOW' ? 'RSI低值优先' : quickSort === 'RSI_HIGH' ? 'RSI高值优先' : '市值综合权重'}
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-sans hidden sm:inline">
              已排除 &lt; $200M 微盘
            </span>
          </div>
          <button
            onClick={fetchScreener}
            className="hover:text-blue-600 flex items-center gap-1 cursor-pointer transition-colors shrink-0 ml-2"
            title="刷新筛选数据"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>刷新</span>
          </button>
        </div>

        {/* Row 3: Loaded Strategy Notification Strip */}
        {loadedStrategy && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-200 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2 truncate text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold truncate">
                已载入策略模型: [{loadedStrategy.shortName}] · {loadedStrategy.author} · 周期 {selectedTimeframe}
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearStrategy}
              className="px-2 py-0.5 text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
              title="清除策略筛选"
            >
              <X className="w-3.5 h-3.5" />
              <span>清除策略</span>
            </button>
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        2. FULL-HEIGHT SCREENER TABLE AREA
        ========================================================================
      */}
      <div className="flex-1 space-y-2.5">
        {error ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-slate-500 bg-white rounded-3xl border border-rose-200/80 p-8 shadow-2xs max-w-lg mx-auto mt-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-1">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">搜索请求失败</h3>
            <div className="text-xs text-slate-500 leading-relaxed text-center">
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchScreener}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2 flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重新尝试
            </button>
          </div>
        ) : isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-mono">正在扫描全市场标的并执行多因子匹配...</span>
          </div>
        ) : displayedStocks.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3 text-slate-500 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs max-w-lg mx-auto mt-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">0 RESULTS / 未匹配到合适标的</h3>
            <div className="text-xs text-slate-500 leading-relaxed max-w-sm space-y-1 text-center">
              <p>• 当前筛选条件或策略门槛较为严苛</p>
              <p>• 当前市场行情下暂无触发该形态的个股</p>
            </div>
            <button
              type="button"
              onClick={handleResetAll}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2"
            >
              重置全部条件
            </button>
          </div>
        ) : (
          <ScreenerTable
            items={displayedStocks}
            sortBy={quickSort === 'RSI_LOW' || quickSort === 'RSI_HIGH' ? 'rsi' : quickSort === 'GAINERS' || quickSort === 'LOSERS' ? 'changePercent' : 'marketCap'}
            sortOrder={quickSort === 'RSI_LOW' ? 'asc' : 'desc'}
            rsiPeriod={14}
            onSortChange={(col) => {
              if (col === 'rsi') setQuickSort(quickSort === 'RSI_LOW' ? 'RSI_HIGH' : 'RSI_LOW');
              else if (col === 'changePercent') setQuickSort(quickSort === 'GAINERS' ? 'LOSERS' : 'GAINERS');
              else setQuickSort('MCAP_DESC');
            }}
            onSelectStock={onSelectStock}
            onOpenAlertModal={onOpenAlertModal}
          />
        )}
      </div>
    </div>
  );
}
