import { ActiveTab } from '../../types.ts';
import { Activity, Filter, Star, Bell } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  unreadAlertCount?: number;
}

export function BottomNav({ activeTab, setActiveTab, unreadAlertCount = 0 }: BottomNavProps) {
  const tabs = [
    { id: 'home' as ActiveTab, label: '首页', icon: Activity },
    { id: 'screener' as ActiveTab, label: '筛选', icon: Filter },
    { id: 'watchlist' as ActiveTab, label: '自选', icon: Star },
    { id: 'alerts' as ActiveTab, label: '预警', icon: Bell, badge: unreadAlertCount }
  ];

  return (
    <nav aria-label="移动端主导航" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[64px] min-h-[48px] rounded-xl transition-all cursor-pointer relative ${
              isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-950"></span>
              )}
            </div>
            <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
