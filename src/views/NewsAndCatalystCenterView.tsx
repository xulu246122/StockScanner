import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  NewsItem,
  NewsCategory,
  NewsSentimentLabel,
  NewsVelocityStats,
  CorporateEvent,
  CorporateEventCategory,
  CatalystItem,
  CatalystDirection,
  CatalystStrength
} from '../types/newsCatalyst.ts';
import { apiClient } from '../services/apiClient.ts';
import {
  Newspaper,
  Flame,
  Calendar,
  Clock,
  ExternalLink,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldAlert,
  Building2,
  BarChart3,
  Layers,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Award
} from 'lucide-react';

interface NewsAndCatalystCenterViewProps {
  onSelectStock: (ticker: string) => void;
  onOpenAlertModal?: (ticker: string, stockName?: string) => void;
  selectedTicker?: string;
}

export function NewsAndCatalystCenterView({
  onSelectStock,
  onOpenAlertModal,
  selectedTicker
}: NewsAndCatalystCenterViewProps) {
  // Main view layer: 'stream' (Timeline News), 'catalysts' (Catalyst Engine), 'events' (Events Calendar)
  const [activeLayer, setActiveLayer] = useState<'stream' | 'catalysts' | 'events'>('stream');

  // Stream Tab: Latest | Earnings | Analyst | Corporate | Macro
  const [newsTab, setNewsTab] = useState<'Latest' | 'Earnings' | 'Analyst' | 'Corporate' | 'Macro'>('Latest');

  // Secondary filters
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tickerFilter, setTickerFilter] = useState<string>(selectedTicker || 'ALL');
  const [sentimentFilter, setSentimentFilter] = useState<NewsSentimentLabel | 'ALL'>('ALL');

  // Catalyst filters
  const [catalystDirectionFilter, setCatalystDirectionFilter] = useState<CatalystDirection | 'ALL'>('ALL');
  const [catalystStrengthFilter, setCatalystStrengthFilter] = useState<CatalystStrength | 'ALL'>('ALL');

  // Events filters
  const [eventTypeFilter, setEventTypeFilter] = useState<CorporateEventCategory | 'ALL'>('ALL');
  const [upcomingOnlyFilter, setUpcomingOnlyFilter] = useState<boolean>(false);

  // Data states
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [velocity, setVelocity] = useState<NewsVelocityStats | null>(null);
  const [sentimentSummary, setSentimentSummary] = useState<any>(null);
  const [categoriesCount, setCategoriesCount] = useState<Record<string, number>>({});
  const [catalysts, setCatalysts] = useState<CatalystItem[]>([]);
  const [events, setEvents] = useState<CorporateEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Available Category labels and mappings
  const allCategories: { id: NewsCategory; labelZh: string; color: string }[] = [
    { id: 'Earnings', labelZh: '财报与指引', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'Analyst', labelZh: '大行评级', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'M&A', labelZh: '并购重组', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'Product', labelZh: '产品与技术', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'Legal', labelZh: '法律合规', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'Regulatory', labelZh: '监管裁决', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { id: 'Management', labelZh: '高管人事', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { id: 'Macro', labelZh: '宏观政策', color: 'bg-slate-100 text-slate-800 border-slate-300' },
    { id: 'Other', labelZh: '其他动态', color: 'bg-gray-100 text-gray-700 border-gray-200' }
  ];

  const allEventTypes: CorporateEventCategory[] = [
    'Earnings',
    'Dividend',
    'Split',
    'FDA/Regulatory',
    'Investor Day',
    'Conference',
    '重大公司事件'
  ];

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setIsRefreshing(true);
    try {
      // 1. Fetch News Stream
      const streamRes = await apiClient.getNewsStream({
        tab: newsTab,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        ticker: tickerFilter !== 'ALL' ? tickerFilter : undefined,
        sentiment: sentimentFilter !== 'ALL' ? sentimentFilter : undefined,
        limit: 50
      });

      setNewsItems(streamRes.news);
      setVelocity(streamRes.velocity);
      setSentimentSummary(streamRes.sentimentSummary);
      setCategoriesCount(streamRes.categoriesCount);

      // 2. Fetch Catalysts
      const catRes = await apiClient.getCatalysts({
        ticker: tickerFilter !== 'ALL' ? tickerFilter : undefined,
        direction: catalystDirectionFilter !== 'ALL' ? catalystDirectionFilter : undefined,
        minStrength: catalystStrengthFilter !== 'ALL' ? catalystStrengthFilter : undefined
      });
      setCatalysts(catRes.catalysts || []);

      // 3. Fetch Events
      const evtRes = await apiClient.getCorporateEvents({
        ticker: tickerFilter !== 'ALL' ? tickerFilter : undefined,
        eventType: eventTypeFilter !== 'ALL' ? eventTypeFilter : undefined,
        upcomingOnly: upcomingOnlyFilter
      });
      setEvents(evtRes.events || []);
    } catch (err) {
      console.error('Failed to load news & catalyst center data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [newsTab, selectedCategory, tickerFilter, sentimentFilter, catalystDirectionFilter, catalystStrengthFilter, eventTypeFilter, upcomingOnlyFilter]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 45000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Client-side search filter
  const filteredNews = useMemo(() => {
    if (!searchQuery.trim()) return newsItems;
    const q = searchQuery.toLowerCase().trim();
    return newsItems.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        (item.summary && item.summary.toLowerCase().includes(q)) ||
        item.ticker.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [newsItems, searchQuery]);

  const filteredCatalysts = useMemo(() => {
    if (!searchQuery.trim()) return catalysts;
    const q = searchQuery.toLowerCase().trim();
    return catalysts.filter(
      cat =>
        cat.title.toLowerCase().includes(q) ||
        cat.summary.toLowerCase().includes(q) ||
        cat.ticker.toLowerCase().includes(q) ||
        cat.catalystType.toLowerCase().includes(q) ||
        cat.empiricalBasis.toLowerCase().includes(q)
    );
  }, [catalysts, searchQuery]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase().trim();
    return events.filter(
      evt =>
        evt.title.toLowerCase().includes(q) ||
        evt.details.toLowerCase().includes(q) ||
        evt.ticker.toLowerCase().includes(q) ||
        evt.eventType.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分钟前`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`;
  };

  const getSentimentBadge = (sentiment: NewsSentimentLabel, score: number) => {
    if (sentiment === 'Positive') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          <span>利好</span>
          <span className="font-mono text-[10px] text-emerald-800">+{score.toFixed(2)}</span>
        </span>
      );
    }
    if (sentiment === 'Negative') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <TrendingDown className="w-3 h-3 text-rose-600" />
          <span>偏空</span>
          <span className="font-mono text-[10px] text-rose-800">{score.toFixed(2)}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Minus className="w-3 h-3 text-slate-500" />
        <span>中性</span>
        <span className="font-mono text-[10px] text-slate-600">{score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}</span>
      </span>
    );
  };

  const getCategoryBadge = (cat: NewsCategory) => {
    const item = allCategories.find(c => c.id === cat);
    return (
      <span
        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
          item ? item.color : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        {cat}
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Header & Institutional Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase rounded bg-blue-50 text-blue-700 border border-blue-200 tracking-wider">
              PHASE STOCK-05 · CATALYST CORE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              SEC 8-K / 10-Q · PR WIRE · BLS · FDA REGISTER
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Newspaper className="w-6 h-6 text-blue-600" />
            <span>资讯与催化剂中心</span>
            <span className="text-sm font-semibold text-slate-400 font-mono">
              NEWS, EVENTS & CATALYSTS
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            全维度资讯时间线、客观事实驱动的催化剂引擎（非LLM虚构）与全美股关键公司/宏观事件日历。
          </p>
        </div>

        {/* Global Controls & Refresh */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadData()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>刷新数据</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Row: News Velocity & Sentiment Audit Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* News Velocity Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              资讯发布速率 (Velocity)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                velocity?.status === 'SURGE'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                  : velocity?.status === 'ELEVATED'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {velocity?.statusLabelZh || '资讯平稳'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-mono">1h 内</span>
              <span className="text-base font-black font-mono text-slate-900">{velocity?.past1h ?? 0}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-mono">6h 内</span>
              <span className="text-base font-black font-mono text-slate-900">{velocity?.past6h ?? 0}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-mono">24h 内</span>
              <span className="text-base font-black font-mono text-slate-900">{velocity?.past24h ?? 0}</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-mono">7d 内</span>
              <span className="text-base font-black font-mono text-slate-900">{velocity?.past7d ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Sentiment Score & Distribution */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              新闻情绪评分 (Sentiment)
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                (sentimentSummary?.averageScore ?? 0) > 0.2
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : (sentimentSummary?.averageScore ?? 0) < -0.2
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              指数: {sentimentSummary?.averageScore !== undefined && sentimentSummary.averageScore > 0 ? `+${sentimentSummary.averageScore}` : sentimentSummary?.averageScore ?? '0.00'}
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="w-full h-2.5 bg-slate-100 rounded-full flex overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${sentimentSummary?.positivePct ?? 50}%` }}
                title={`利好: ${sentimentSummary?.positivePct ?? 0}%`}
              />
              <div
                className="bg-slate-300 h-full transition-all"
                style={{ width: `${sentimentSummary?.neutralPct ?? 30}%` }}
                title={`中性: ${sentimentSummary?.neutralPct ?? 0}%`}
              />
              <div
                className="bg-rose-500 h-full transition-all"
                style={{ width: `${sentimentSummary?.negativePct ?? 20}%` }}
                title={`利空: ${sentimentSummary?.negativePct ?? 0}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span className="text-emerald-600 font-bold">利好 {sentimentSummary?.positivePct ?? 0}% ({sentimentSummary?.positiveCount ?? 0})</span>
              <span className="text-slate-500">中性 {sentimentSummary?.neutralPct ?? 0}% ({sentimentSummary?.neutralCount ?? 0})</span>
              <span className="text-rose-600 font-bold">利空 {sentimentSummary?.negativePct ?? 0}% ({sentimentSummary?.negativeCount ?? 0})</span>
            </div>
          </div>
        </div>

        {/* Active Catalysts Quick Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              催化剂雷达 (Catalysts)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {catalysts.length} 项有效催化
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-600 block">看多 (Bull)</span>
              <span className="text-base font-black text-emerald-700">
                {catalysts.filter(c => c.catalystDirection === 'Bullish').length}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 block">中性 (Neu)</span>
              <span className="text-base font-black text-slate-700">
                {catalysts.filter(c => c.catalystDirection === 'Neutral').length}
              </span>
            </div>
            <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100">
              <span className="text-[10px] text-rose-600 block">看空 (Bear)</span>
              <span className="text-base font-black text-rose-700">
                {catalysts.filter(c => c.catalystDirection === 'Bearish').length}
              </span>
            </div>
          </div>
        </div>

        {/* Audited Provider Tracking */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              情绪溯源记录 (Provider Audit)
            </span>
            <span className="text-[10px] font-mono text-slate-400">必须溯源</span>
          </div>
          <p className="text-[11px] text-slate-500 line-clamp-2">
            每条资讯与情绪均绑定合规信源，拒绝虚假或未授权抓取：
          </p>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {sentimentSummary?.auditedProviders?.slice(0, 4).map((p: string, idx: number) => (
              <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
                {p}
              </span>
            )) || (
              <span className="text-[10px] text-slate-400 font-mono">SEC EDGAR / BLS / PR Wire</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Three-Layer Navigation & Switcher */}
      {/* Layer 1: News Timeline | Layer 2: Catalyst Engine | Layer 3: Events Calendar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveLayer('stream')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeLayer === 'stream'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>资讯时间线 (News Stream)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700">
              {newsItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLayer('catalysts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeLayer === 'catalysts'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>催化剂雷达 (Catalyst Engine)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-700">
              {catalysts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLayer('events')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeLayer === 'events'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>重大事件日历 (Events Calendar)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {events.length}
            </span>
          </button>
        </div>

        {/* Global Keyword / Ticker Search Input */}
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索代码、标题、宏观事件或分析师..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. Layer 1: News Stream View */}
      {activeLayer === 'stream' && (
        <div className="space-y-4">
          {/* Sub Navigation Tabs: Latest | Earnings | Analyst | Corporate | Macro */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['Latest', 'Earnings', 'Analyst', 'Corporate', 'Macro'] as const).map(tab => {
                const isActive = newsTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setNewsTab(tab);
                      setSelectedCategory('ALL');
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab === 'Latest' && '最新全部 (Latest)'}
                    {tab === 'Earnings' && '业绩财报 (Earnings)'}
                    {tab === 'Analyst' && '大行研报 (Analyst)'}
                    {tab === 'Corporate' && '企业重大动向 (Corporate)'}
                    {tab === 'Macro' && '宏观央行 (Macro)'}
                  </button>
                );
              })}
            </div>

            {/* Secondary Filter dropdowns: Category (9 categories), Sentiment */}
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as any)}
                aria-label="选择新闻分类"
                className="text-xs bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="ALL">全部分类 (9 Categories)</option>
                <option value="Earnings">Earnings (财报)</option>
                <option value="Analyst">Analyst (分析师)</option>
                <option value="M&A">M&A (并购重组)</option>
                <option value="Product">Product (产品技术)</option>
                <option value="Legal">Legal (法律诉讼)</option>
                <option value="Regulatory">Regulatory (监管合规)</option>
                <option value="Management">Management (高管层)</option>
                <option value="Macro">Macro (宏观经济)</option>
                <option value="Other">Other (其他)</option>
              </select>

              <select
                value={sentimentFilter}
                onChange={e => setSentimentFilter(e.target.value as any)}
                aria-label="选择情绪过滤"
                className="text-xs bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="ALL">全部情绪 (All Sentiment)</option>
                <option value="Positive">利好 (Positive)</option>
                <option value="Neutral">中性 (Neutral)</option>
                <option value="Negative">偏空 (Negative)</option>
              </select>
            </div>
          </div>

          {/* Timeline Feed */}
          {isLoading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">正在从合规资讯与官方文件源同步数据...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
              <Newspaper className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">暂无符合当前筛选条件的资讯</p>
              <p className="text-xs text-slate-400 mt-1">请尝试切换分类标签或重置搜索关键词</p>
            </div>
          ) : (
            <div className="relative pl-6 md:pl-8 space-y-4 before:content-[''] before:absolute before:left-3 md:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {filteredNews.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="relative group bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-blue-200 transition"
                >
                  {/* Timeline Node Circle */}
                  <div className="absolute -left-[27px] md:-left-[31px] top-6 w-3 h-3 rounded-full bg-white border-2 border-blue-600 ring-4 ring-slate-100 group-hover:scale-110 transition" />

                  {/* Header Row: Category Badge, Ticker, Sentiment Badge, Relative Time */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {/* Ticker Chip */}
                      <button
                        type="button"
                        onClick={() => onSelectStock(item.ticker)}
                        className="px-2 py-0.5 rounded-md text-xs font-black font-mono bg-slate-900 text-white hover:bg-blue-600 transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>{item.ticker}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>

                      {/* 9 Category Badge */}
                      {getCategoryBadge(item.category)}

                      {/* Sentiment Badge with Audited Score */}
                      {getSentimentBadge(item.sentiment, item.sentimentScore)}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(item.timestamp)}</span>
                      <span>·</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* News Title */}
                  <h3 className="text-sm md:text-base font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition mb-1.5">
                    {item.title}
                  </h3>

                  {/* Summary */}
                  {item.summary && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mb-3">
                      {item.summary}
                    </p>
                  )}

                  {/* Audited Metadata Footer (必须记录 source, timestamp, provider) */}
                  <div className="pt-2.5 mt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>
                        信源: <strong className="text-slate-600 font-medium">{item.source}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        合规接口: <strong className="text-slate-600 font-mono font-medium">{item.sentimentAudit?.provider || 'Verified API'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onOpenAlertModal && item.ticker !== 'MACRO' && (
                        <button
                          type="button"
                          onClick={() => onOpenAlertModal(item.ticker)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Zap className="w-3 h-3" />
                          <span>追踪预警</span>
                        </button>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                      >
                        <span>原文链接</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Layer 2: Catalyst Engine View */}
      {activeLayer === 'catalysts' && (
        <div className="space-y-4">
          {/* Catalyst Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                催化方向:
              </span>
              <div className="flex items-center gap-1">
                {(['ALL', 'Bullish', 'Bearish', 'Neutral'] as const).map(dir => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => setCatalystDirectionFilter(dir)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      catalystDirectionFilter === dir
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {dir === 'ALL' && '全部'}
                    {dir === 'Bullish' && '🟢 看多 (Bull)'}
                    {dir === 'Bearish' && '🔴 看空 (Bear)'}
                    {dir === 'Neutral' && '⚪ 中性'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">催化强度:</span>
              <div className="flex items-center gap-1">
                {(['ALL', 'High', 'Medium', 'Low'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCatalystStrengthFilter(st)}
                    className={`px-2 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      catalystStrengthFilter === st
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {st === 'ALL' && '全部'}
                    {st === 'High' && 'High (强力)'}
                    {st === 'Medium' && 'Medium (中等)'}
                    {st === 'Low' && 'Low (常规)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Catalyst Grid */}
          {filteredCatalysts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
              <Flame className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">未发现符合条件的催化剂事件</p>
              <p className="text-xs text-slate-400 mt-1">当前没有触发对应强度或方向的客观重大事件</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCatalysts.map(cat => {
                const isBull = cat.catalystDirection === 'Bullish';
                const isBear = cat.catalystDirection === 'Bearish';
                return (
                  <div
                    key={cat.id}
                    className={`p-5 rounded-2xl border bg-white shadow-2xs hover:shadow-xs transition relative flex flex-col justify-between ${
                      isBull
                        ? 'border-emerald-200/80'
                        : isBear
                        ? 'border-rose-200/80'
                        : 'border-slate-200/80'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectStock(cat.ticker)}
                            className="px-2 py-0.5 rounded text-xs font-black font-mono bg-slate-900 text-white hover:bg-blue-600 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{cat.ticker}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-slate-600">{cat.companyName}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Direction Pill */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isBull
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isBear
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isBull ? '🟢 看多 (Bullish)' : isBear ? '🔴 看空 (Bearish)' : '⚪ 中性观察'}
                          </span>

                          {/* Strength Pill */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              cat.catalystStrength === 'High'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {cat.catalystStrength} · {cat.strengthScore}分
                          </span>
                        </div>
                      </div>

                      {/* Catalyst Type & Title */}
                      <div className="mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
                          {cat.catalystTypeLabelZh} · [{cat.catalystType}]
                        </span>
                        <h4 className="text-base font-bold text-slate-900 leading-snug">{cat.title}</h4>
                      </div>

                      {/* Summary */}
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">{cat.summary}</p>

                      {/* Fact-based Empirical Grounding Box (客观事件与财务数据支撑，非LLM虚构) */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 mb-3 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>客观事实与数据依据 (Empirical Fact Grounding)</span>
                        </div>
                        <p className="text-xs font-mono text-slate-700 leading-relaxed">
                          {cat.empiricalBasis}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Metadata */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>生效/披露日: {cat.effectiveDate}</span>
                      <span>影响周期: {cat.impactHorizon}</span>
                      <span>信源: {cat.provider}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Layer 3: Events Calendar View */}
      {activeLayer === 'events' && (
        <div className="space-y-4">
          {/* Events Filter Chips */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEventTypeFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  eventTypeFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                全部事件 (All)
              </button>
              {allEventTypes.map(et => (
                <button
                  key={et}
                  type="button"
                  onClick={() => setEventTypeFilter(et)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    eventTypeFilter === et
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {et}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={upcomingOnlyFilter}
                onChange={e => setUpcomingOnlyFilter(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>仅看即将发生 (Upcoming Only)</span>
            </label>
          </div>

          {/* Events List */}
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">暂无对应日程事件</p>
              <p className="text-xs text-slate-400 mt-1">请重置事件分类筛选项</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredEvents.map(evt => (
                <div
                  key={evt.id}
                  className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectStock(evt.ticker)}
                          className="px-2 py-0.5 rounded text-xs font-black font-mono bg-slate-900 text-white hover:bg-blue-600 transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>{evt.ticker}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                        <span className="text-[11px] font-semibold text-slate-500">{evt.companyName}</span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          evt.isUpcoming
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {evt.isUpcoming ? '即将发生' : '已落地'}
                      </span>
                    </div>

                    {/* Event Type & Date */}
                    <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-slate-400">
                      <span className="font-bold text-blue-600 px-1.5 py-0.2 rounded bg-blue-50">
                        {evt.eventType}
                      </span>
                      <span>{evt.date}</span>
                      {evt.time && <span>({evt.time})</span>}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug mb-1.5">{evt.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{evt.details}</p>

                    {/* Specific Metrics Box */}
                    {evt.metrics && Object.keys(evt.metrics).length > 0 && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs font-mono space-y-1 mb-3">
                        {evt.metrics.epsActual !== undefined && evt.metrics.epsActual !== null && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">实际公布 EPS:</span>
                            <span className="font-bold text-slate-900">${evt.metrics.epsActual.toFixed(2)}</span>
                          </div>
                        )}
                        {evt.metrics.epsEstimate !== undefined && evt.metrics.epsEstimate !== null && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">分析师预期 EPS:</span>
                            <span className="font-bold text-slate-600">${evt.metrics.epsEstimate.toFixed(2)}</span>
                          </div>
                        )}
                        {evt.metrics.surprisePct !== undefined && evt.metrics.surprisePct !== null && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">超预期幅度:</span>
                            <span className={`font-bold ${evt.metrics.surprisePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {evt.metrics.surprisePct > 0 ? `+${evt.metrics.surprisePct}%` : `${evt.metrics.surprisePct}%`}
                            </span>
                          </div>
                        )}
                        {evt.metrics.dividendAmount && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">派息金额:</span>
                            <span className="font-bold text-slate-900">${evt.metrics.dividendAmount}</span>
                          </div>
                        )}
                        {evt.metrics.splitRatio && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">拆股比例:</span>
                            <span className="font-bold text-blue-600">{evt.metrics.splitRatio}</span>
                          </div>
                        )}
                        {evt.metrics.regulatoryAgency && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">监管机构:</span>
                            <span className="font-bold text-slate-900">{evt.metrics.regulatoryAgency}</span>
                          </div>
                        )}
                        {evt.metrics.dealValueUsd && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">涉及规模:</span>
                            <span className="font-bold text-slate-900">${(evt.metrics.dealValueUsd / 1e9).toFixed(1)}B</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>信源: {evt.source}</span>
                    {evt.url && (
                      <a
                        href={evt.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold"
                      >
                        <span>官方日历</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
