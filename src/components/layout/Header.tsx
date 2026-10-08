import { ActiveTab, MarketStatus } from '../../types.ts';
import { Activity, Filter, Star, Bell, Search, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  marketStatus?: MarketStatus | null;
  unreadAlertCount?: number;
  onOpenSearch?: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  marketStatus,
  unreadAlertCount = 0,
  onOpenSearch
}: HeaderProps) {
  const getSessionBadge = () => {
    if (!marketStatus) return null;
    const { session, sessionLabel } = marketStatus;

    if (session === 'REGULAR') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{sessionLabel}</span>
        </span>
      );
    }
    if (session === 'PRE_MARKET' || session === 'AFTER_HOURS') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          <span>{sessionLabel}</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
        <span>{sessionLabel}</span>
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="w-full flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white font-sans">
                US RSI <span className="text-emerald-400">SCANNER</span>
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/90">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'home'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>首页概览</span>
          </button>

          <button
            onClick={() => setActiveTab('screener')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'screener'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>RSI 筛选器</span>
          </button>

          <button
            onClick={() => setActiveTab('watchlist')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'watchlist'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>我的自选</span>
          </button>

          <button
            onClick={() => setActiveTab('quant')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'quant'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>策略模型筛选</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'alerts'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>预警监控</span>
            {unreadAlertCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900 absolute top-1.5 right-1.5"></span>
            )}
          </button>
        </nav>

        {/* Zone 3: Market Clock & Quick Actions */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center">
            {getSessionBadge()}
          </div>

          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="md:hidden p-2 text-slate-400 hover:text-slate-100 bg-slate-900 border border-slate-800 rounded-xl transition-colors cursor-pointer"
              title="搜索股票"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setActiveTab('alerts')}
            className="relative p-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="预警通知"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold font-mono">
                {unreadAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
