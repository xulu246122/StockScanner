import { ActiveTab, MarketStatus } from '../../types.ts';
import { Bell, Plus, ArrowLeft, Star, Settings } from 'lucide-react';

interface StockAlarmHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedTicker?: string;
  onBack?: () => void;
  onOpenCreateAlert: () => void;
  onOpenAddWatchlist: () => void;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (ticker: string) => void;
  marketStatus?: MarketStatus | null;
  unreadAlertCount?: number;
}

/**
 * Google Material 3 极简轻量顶部导航条
 * - 高度压缩至 ~42px (加系统状态栏 safe-area-inset)
 * - 按钮微缩为 28px 圆形微按键
 * - 右上角常驻 M3 齿轮设置按钮，解放底部导航
 */
export function StockAlarmHeader({
  activeTab,
  setActiveTab,
  selectedTicker,
  onBack,
  onOpenCreateAlert,
  onOpenAddWatchlist,
  isWatchlisted = false,
  onToggleWatchlist,
  marketStatus,
  unreadAlertCount = 0
}: StockAlarmHeaderProps) {
  // 1. Stock Detail Header (Special Back Navigation)
  if (activeTab === 'detail') {
    return (
      <header
        className="px-3 py-1.5 bg-[#181b26] border-b border-[#262a38] text-white flex items-center justify-between z-30 shrink-0 select-none"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)'
        }}
      >
        {/* Left: Back & Stock Ticker */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-7.5 h-7.5 rounded-full bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            title="返回列表"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-sm text-white tracking-tight leading-tight">
              {selectedTicker || 'NVDA'}
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              美股实时全息详情
            </span>
          </div>
        </div>

        {/* Right: Watchlist Star, Settings & + Add Alert */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleWatchlist && selectedTicker && (
            <button
              type="button"
              onClick={() => onToggleWatchlist(selectedTicker)}
              className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isWatchlisted
                  ? 'text-[#FBBC04] bg-[#FBBC04]/20 border border-[#FBBC04]/40'
                  : 'text-slate-400 bg-slate-800/60 hover:bg-slate-700'
              }`}
              title={isWatchlisted ? '已在自选股中' : '加入自选股'}
            >
              <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-[#FBBC04] stroke-[#FBBC04]' : 'stroke-[1.8]'}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="w-7.5 h-7.5 rounded-full bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
            title="系统设置"
          >
            <Settings className="w-3.5 h-3.5 stroke-[2]" />
          </button>

          <button
            type="button"
            onClick={onOpenCreateAlert}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1A73E8] hover:bg-blue-600 active:scale-95 text-white font-bold text-[11px] transition-all shadow-sm shadow-[#1A73E8]/30 cursor-pointer"
            title="为此股票新建预警"
          >
            <Plus className="w-3 h-3 stroke-[2.6]" />
            <span>预警</span>
          </button>
        </div>
      </header>
    );
  }

  // 2. Settings Header (With Back Navigation)
  if (activeTab === 'settings') {
    return (
      <header
        className="px-3 py-1.5 bg-[#181b26] border-b border-[#262a38] text-white flex items-center justify-between z-30 shrink-0 select-none"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)'
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-7.5 h-7.5 rounded-full bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            title="返回"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-sm text-white tracking-tight leading-tight">
              系统设置与通道
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              API 密钥 · 数据源 · 保活常驻
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className="relative w-7.5 h-7.5 rounded-full bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
            title="预警通知"
          >
            <Bell className="w-3.5 h-3.5 stroke-[2]" />
            {unreadAlertCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#EA4335] ring-2 ring-[#181b26]" />
            )}
          </button>
        </div>
      </header>
    );
  }

  // 3. Main Navigation Tabs Header
  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'radar':
        return { title: '多因子雷达', subtitle: '4×7 实时因子矩阵扫描' };
      case 'rebound':
        return { title: '暴跌反弹预警', subtitle: '4大经典均值回归模型' };
      case 'quant':
        return { title: '量化策略库', subtitle: '72款专业算法与回测' };
      case 'alerts':
        return { title: '预警触发记录', subtitle: '实时告警历史与日志' };
      case 'watchlist':
      case 'home':
      case 'market':
      default:
        return { title: '自选股大盘', subtitle: '高频自选池 · 全景指数看板' };
    }
  };

  const meta = getHeaderMeta();

  const handleAddClick = () => {
    if (activeTab === 'watchlist' || activeTab === 'home' || activeTab === 'market') {
      onOpenAddWatchlist();
    } else {
      onOpenCreateAlert();
    }
  };

  const getMarketBadge = () => {
    if (!marketStatus) return null;
    const isTrading = marketStatus.isOpen || marketStatus.session === 'REGULAR';
    const isPre = marketStatus.session === 'PRE_MARKET';
    const isPost = marketStatus.session === 'AFTER_HOURS';

    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-[9px] font-mono shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isTrading
              ? 'bg-[#34A853] animate-pulse'
              : isPre || isPost
              ? 'bg-[#FBBC04] animate-pulse'
              : 'bg-slate-400'
          }`}
        />
        <span className={isTrading ? 'text-[#34A853] font-bold' : 'text-slate-300'}>
          {isTrading ? '盘中' : isPre ? '盘前' : isPost ? '盘后' : '休市'}
        </span>
      </div>
    );
  };

  return (
    <header
      className="px-3 py-1.5 bg-[#181b26] border-b border-[#262a38] text-white flex items-center justify-between shrink-0 select-none z-30"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)'
      }}
    >
      {/* Title & Subtitle */}
      <div className="flex flex-col min-w-0 pr-1.5">
        <div className="flex items-center gap-1.5">
          <h1 className="text-sm font-extrabold tracking-tight text-white truncate">
            {meta.title}
          </h1>
          {getMarketBadge()}
        </div>
        <p className="text-[9px] text-slate-400 font-mono truncate">
          {meta.subtitle}
        </p>
      </div>

      {/* Action Icons: [⚙ 设置] + [🔔 预警] + [+ 添加] */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Settings Gear Shortcut */}
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="w-7.5 h-7.5 rounded-full bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
          title="系统设置"
        >
          <Settings className="w-3.5 h-3.5 stroke-[2]" />
        </button>

        {/* Alerts Bell Shortcut */}
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className="relative w-7.5 h-7.5 rounded-full bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
          title="预警通知"
        >
          <Bell className="w-3.5 h-3.5 stroke-[2]" />
          {unreadAlertCount > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#EA4335] ring-2 ring-[#181b26]" />
          )}
        </button>

        {/* Primary Plus Button (Add watchlist or New Alert) */}
        <button
          type="button"
          onClick={handleAddClick}
          className="w-7.5 h-7.5 rounded-full bg-[#1A73E8] hover:bg-blue-600 active:scale-95 text-white flex items-center justify-center transition-all shadow-sm shadow-[#1A73E8]/30 cursor-pointer"
          title={activeTab === 'watchlist' || activeTab === 'home' || activeTab === 'market' ? '添加自选股票' : '新建预警'}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
        </button>
      </div>
    </header>
  );
}
