import { ActiveTab, MarketStatus } from '../../types.ts';
import {
  Compass,
  Star,
  SlidersHorizontal,
  Activity,
  Plus,
  Clock,
  Radar,
  Zap,
  Settings
} from 'lucide-react';

interface TerminalSidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadAlertCount?: number;
  marketStatus?: MarketStatus | null;
  selectedTicker?: string;
  onOpenCreateAlert: () => void;
}

export function TerminalSidebar({
  activeTab,
  setActiveTab,
  unreadAlertCount = 0,
  marketStatus,
  onOpenCreateAlert
}: TerminalSidebarProps) {
  const navItems = [
    { id: 'quant' as ActiveTab, label: '策略模型', enLabel: 'STRATEGY', desc: '学术实证量化模型', icon: SlidersHorizontal },
    { id: 'radar' as ActiveTab, label: '多模态雷达', enLabel: 'RADAR', desc: 'RSI与超卖扫描预警', icon: Radar },
    { id: 'rebound' as ActiveTab, label: '暴跌反弹预警', enLabel: 'FLASH REBOUND', desc: '日内急跌与卖方衰竭抄底', icon: Zap },
    { id: 'market' as ActiveTab, label: '全景大盘', enLabel: 'MARKETS', desc: '宏观与行业板块看板', icon: Compass },
    { id: 'watchlist' as ActiveTab, label: '自选与预警', enLabel: 'WATCHLIST', desc: '个股监控与规则告警', icon: Star, badge: unreadAlertCount },
    { id: 'settings' as ActiveTab, label: '软件设置', enLabel: 'SETTINGS', desc: '美股数据源与API密钥配置', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-60 bg-[#f0f4f9] text-[#1f1f1f] shrink-0 h-full border-r border-[#e0e2ec] select-none z-30 justify-between">
      {/* 1. Google M3 Brand Header */}
      <div>
        <div className="px-4 py-3.5 border-b border-[#e0e2ec] flex items-center justify-between bg-[#f0f4f9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0b57d0] flex items-center justify-center shadow-xs">
              <Activity className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-[13px] tracking-tight text-slate-900 block">
                STOCK TERMINAL
              </span>
              <span className="text-[10px] text-[#0b57d0] font-mono font-bold tracking-wider uppercase block">
                QUANT PRO · M3
              </span>
            </div>
          </div>
        </div>

        {/* 2. Google M3 Extended FAB: New Alert Action */}
        <div className="p-3">
          <button
            type="button"
            onClick={onOpenCreateAlert}
            className="w-full py-2.5 px-3.5 bg-[#0b57d0] hover:bg-[#0842a0] active:scale-[0.98] text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>新建量化预警</span>
          </button>
        </div>

        {/* 3. Google M3 Navigation Pill List */}
        <nav className="px-3 py-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected =
              activeTab === item.id ||
              (item.id === 'market' && activeTab === 'home') ||
              (item.id === 'watchlist' && activeTab === 'alerts') ||
              (item.id === 'radar' && activeTab === 'detail');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full transition-all cursor-pointer text-left group ${
                  isSelected
                    ? 'bg-[#d3e3fd] text-[#041e49] font-bold shadow-2xs'
                    : 'text-[#444746] hover:text-[#1f1f1f] hover:bg-[#e2e7ef] font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isSelected
                        ? 'text-[#0b57d0] stroke-[2.4]'
                        : 'text-[#444746] group-hover:text-[#1f1f1f] stroke-[2]'
                    }`}
                  />
                  <div>
                    <span className="text-xs tracking-tight block leading-tight">
                      {item.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono tracking-wider block ${
                        isSelected ? 'text-[#0b57d0]/80 font-semibold' : 'text-[#747775]'
                      }`}
                    >
                      {item.enLabel}
                    </span>
                  </div>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#b3261e] text-white font-mono leading-tight">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 4. Google M3 Bottom Session & Market Status Footer */}
      <div className="p-3 border-t border-[#e0e2ec] bg-[#f8fafd] text-[11px] font-mono text-[#444746] space-y-2">
        <div className="p-2.5 rounded-xl bg-white border border-[#e0e2ec] space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[#747775] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#747775]" />
              美东时间
            </span>
            <span className="text-[#1f1f1f] font-bold">
              {marketStatus?.nyTime?.split(' ')[1] || '09:30:00'} ET
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#747775]">市场状态</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                marketStatus?.isOpen
                  ? 'bg-[#c4eed0] text-[#0f5223] border border-[#a8dab5]'
                  : 'bg-[#e2e7ef] text-[#444746] border border-[#c4c7c5]'
              }`}
            >
              {marketStatus?.sessionLabel || '休市'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
