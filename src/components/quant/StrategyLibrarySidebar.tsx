import { useState, useMemo } from 'react';
import { StrategyDefinition, StrategyCategory, SavedStrategy } from '../../types.ts';
import {
  computeStrategyScoreV2,
  computeStrategyScore,
  StrategyScoreV2
} from '../../engine/strategyScoringEngine.ts';
import {
  Search,
  SlidersHorizontal,
  X,
  Bookmark,
  CheckCircle2,
  Clock,
  ChevronDown,
  TrendingUp,
  Sliders,
  Zap,
  BarChart3,
  ShieldCheck,
  Cpu,
  Globe,
  FlaskConical,
  Layers
} from 'lucide-react';

export { computeStrategyScoreV2, computeStrategyScore };
export type { StrategyScoreV2 };

interface StrategyLibrarySidebarProps {
  strategies: StrategyDefinition[];
  savedStrategies: SavedStrategy[];
  selectedStrategyId: string;
  onSelectStrategy: (strategy: StrategyDefinition) => void;
  onSelectSavedStrategy: (saved: SavedStrategy) => void;
}

export type ModelMode = 'ALL' | 'SHORT' | 'SWING' | 'LONG';

export function getStrategyModelMode(st: StrategyDefinition): 'SHORT' | 'SWING' | 'LONG' {
  if (st.mode === 'SHORT_TERM' || (st.mode as any) === 'SHORT') return 'SHORT';
  if (st.mode === 'SWING') return 'SWING';
  if (st.mode === 'POSITION' || (st.mode as any) === 'LONG') return 'LONG';

  const f = (st.family || '').toLowerCase();
  const l = (st.holdingPeriodLabel || '').toLowerCase();
  const h = (st.horizon || '').toLowerCase();
  if (f === 'short_term' || l.includes('短线')) return 'SHORT';
  if (f === 'position' || f === 'factor' || l.includes('长线') || l.includes('中期') || h.includes('month') || h.includes('year')) return 'LONG';
  if (f === 'swing' || l.includes('波段') || h.includes('week')) return 'SWING';
  if (h.includes('day') && !l.includes('中期')) return 'SHORT';
  return 'SWING';
}

export const NINE_QUANT_SCHOOLS: { id: 'ALL' | StrategyCategory; label: string; icon: any }[] = [
  { id: 'ALL', label: '全部流派', icon: Layers },
  { id: 'TREND', label: '趋势跟踪', icon: TrendingUp },
  { id: 'MEAN_REVERSION', label: '均值回归', icon: SlidersHorizontal },
  { id: 'BREAKOUT', label: '通道突破', icon: Zap },
  { id: 'FACTOR', label: '多因子', icon: BarChart3 },
  { id: 'SMART_MONEY', label: '机构资金', icon: ShieldCheck },
  { id: 'AI_ML', label: 'AI/ML', icon: Cpu },
  { id: 'STAT_ARB', label: '统计套利', icon: Sliders },
  { id: 'MACRO_REGIME', label: '宏观/Regime', icon: Globe },
  { id: 'EVENT_DRIVEN', label: '事件驱动', icon: FlaskConical }
];

export function StrategyLibrarySidebar({
  strategies,
  savedStrategies,
  selectedStrategyId,
  onSelectStrategy,
  onSelectSavedStrategy
}: StrategyLibrarySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeHorizonFilter, setActiveHorizonFilter] = useState<ModelMode>('ALL');
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | StrategyCategory | 'SAVED'>('ALL');
  const [sortBy, setSortBy] = useState<
    'COMPOSITE' | 'EVIDENCE' | 'BACKTEST' | 'SHARPE' | 'WIN_RATE' | 'RISK'
  >('COMPOSITE');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'BACKTESTED_ONLY' | 'RESEARCH_ONLY'>('ALL');

  // Filtered & Sorted Strategies
  const filteredAndSortedStrategies = useMemo(() => {
    const list = strategies.filter(st => {
      // Category filter
      if (activeCategoryTab !== 'ALL' && activeCategoryTab !== 'SAVED') {
        if (st.category !== activeCategoryTab) {
          return false;
        }
      }

      // Horizon filter
      if (activeHorizonFilter !== 'ALL') {
        if (getStrategyModelMode(st) !== activeHorizonFilter) {
          return false;
        }
      }

      // Data source filter
      const score = computeStrategyScoreV2(st);
      if (sourceFilter === 'BACKTESTED_ONLY' && !score.hasBacktest) return false;
      if (sourceFilter === 'RESEARCH_ONLY' && score.hasBacktest) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        (st.nameZh && st.nameZh.toLowerCase().includes(q)) ||
        (st.nameEn && st.nameEn.toLowerCase().includes(q)) ||
        st.shortName.toLowerCase().includes(q) ||
        st.author.toLowerCase().includes(q) ||
        st.description.toLowerCase().includes(q) ||
        (st.tags && st.tags.some(t => t.toLowerCase().includes(q)))
      );
    });

    return list.sort((a, b) => {
      const scoreA = computeStrategyScoreV2(a);
      const scoreB = computeStrategyScoreV2(b);

      if (sortBy === 'COMPOSITE') {
        return scoreB.totalScore - scoreA.totalScore;
      } else if (sortBy === 'EVIDENCE') {
        return scoreB.evidenceScore - scoreA.evidenceScore;
      } else if (sortBy === 'BACKTEST' || sortBy === 'SHARPE') {
        if (scoreA.hasBacktest !== scoreB.hasBacktest) {
          return scoreA.hasBacktest ? -1 : 1;
        }
        return (scoreB.oosSharpe || scoreB.sharpe || 0) - (scoreA.oosSharpe || scoreA.sharpe || 0);
      } else if (sortBy === 'WIN_RATE') {
        if (scoreA.hasBacktest !== scoreB.hasBacktest) {
          return scoreA.hasBacktest ? -1 : 1;
        }
        return (scoreB.oosWinRate || scoreB.winRate || 0) - (scoreA.oosWinRate || scoreA.winRate || 0);
      } else if (sortBy === 'RISK') {
        return scoreB.riskScore - scoreA.riskScore;
      }
      return scoreB.totalScore - scoreA.totalScore;
    });
  }, [strategies, activeCategoryTab, activeHorizonFilter, searchQuery, sortBy, sourceFilter]);

  return (
    <aside className="w-full lg:w-88 xl:w-96 bg-white border-r border-[#e0e2ec] flex flex-col h-full shrink-0 select-none">
      
      {/* 1. Google M3 Search Header */}
      <div className="p-3 border-b border-[#e0e2ec] space-y-2.5 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xs text-slate-900 tracking-tight">
              策略筛选列表
            </span>
            <span className="text-[10px] font-mono text-[#747775] bg-[#f0f4f9] px-2 py-0.5 rounded-full border border-[#e0e2ec]">
              {filteredAndSortedStrategies.length}/{strategies.length}
            </span>
          </div>

          {/* Quick Source Pill */}
          <div className="flex items-center bg-[#f0f4f9] p-0.5 rounded-full border border-[#e0e2ec]">
            <button
              type="button"
              onClick={() => setSourceFilter('ALL')}
              className={`px-2 py-0.5 rounded-full cursor-pointer text-[10px] transition-all ${sourceFilter === 'ALL' ? 'bg-white font-bold text-slate-900 shadow-2xs' : 'text-[#747775]'}`}
            >
              全部
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('BACKTESTED_ONLY')}
              className={`px-2 py-0.5 rounded-full cursor-pointer text-[10px] transition-all ${sourceFilter === 'BACKTESTED_ONLY' ? 'bg-white font-bold text-[#0f5223] shadow-2xs' : 'text-[#747775]'}`}
            >
              实测
            </button>
          </div>
        </div>

        {/* Google Pill Search Box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#747775]" />
          <input
            type="text"
            placeholder="搜索策略名称、理论作者、模型代码..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-7 py-1.5 text-xs bg-[#f0f4f9] hover:bg-[#e9eef6] focus:bg-white border border-[#e0e2ec] rounded-full focus:outline-none focus:border-[#0b57d0] focus:ring-1 focus:ring-[#0b57d0] transition-all text-slate-900 placeholder-[#747775] font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#747775] hover:text-slate-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Google M3 Clean Segmented Filter Bar */}
      <div className="p-2.5 border-b border-[#e0e2ec] bg-[#f8fafd] space-y-2 shrink-0">
        {/* Row A: Trading Horizon Segmented Pills */}
        <div className="grid grid-cols-4 gap-1 bg-[#f0f4f9] p-0.5 rounded-xl border border-[#e0e2ec] text-[11px] font-medium text-center">
          {(['ALL', 'SHORT', 'SWING', 'LONG'] as ModelMode[]).map(mode => {
            const label = mode === 'ALL' ? '全部周期' : mode === 'SHORT' ? '短线' : mode === 'SWING' ? '波段' : '中长线';
            const isSelected = activeHorizonFilter === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveHorizonFilter(mode)}
                className={`py-1 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#0b57d0] text-white font-bold shadow-2xs'
                    : 'text-[#444746] hover:text-[#1f1f1f] hover:bg-white/60'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Row B: Category & Sort Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Category Dropdown */}
          <div className="relative flex-1">
            <select
              value={activeCategoryTab}
              onChange={e => setActiveCategoryTab(e.target.value as any)}
              className="w-full appearance-none bg-white border border-[#e0e2ec] rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium cursor-pointer focus:outline-none focus:border-[#0b57d0] pr-6"
            >
              {NINE_QUANT_SCHOOLS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-[#747775] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex-1">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full appearance-none bg-white border border-[#e0e2ec] rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium cursor-pointer focus:outline-none focus:border-[#0b57d0] pr-6"
            >
              <option value="COMPOSITE">排序: 综合评分</option>
              <option value="EVIDENCE">排序: 学术权威</option>
              <option value="WIN_RATE">排序: 胜率优先</option>
              <option value="SHARPE">排序: 夏普比率</option>
              <option value="RISK">排序: 风险控制</option>
            </select>
            <ChevronDown className="w-3 h-3 text-[#747775] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Google M3 Strategy List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f0f4f9] bg-white">
        {savedStrategies.length > 0 && (
          <div className="bg-amber-50/40 p-2 border-b border-amber-200/60">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1 mb-1 px-1">
              <Bookmark className="w-3 h-3" />
              <span>自建策略 ({savedStrategies.length})</span>
            </div>
            <div className="space-y-1">
              {savedStrategies.map(saved => (
                <button
                  key={saved.id}
                  type="button"
                  onClick={() => onSelectSavedStrategy(saved)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white border border-amber-200/80 hover:border-amber-400 transition-colors cursor-pointer"
                >
                  <div className="text-xs font-bold text-slate-900 truncate">{saved.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{saved.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredAndSortedStrategies.length === 0 ? (
          <div className="p-8 text-center text-[#747775] text-xs">
            无符合条件的量化策略
          </div>
        ) : (
          filteredAndSortedStrategies.map((st) => {
            const isSelected = st.id === selectedStrategyId;
            const scoreV2 = computeStrategyScoreV2(st);
            const modelMode = getStrategyModelMode(st);

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSelectStrategy(st)}
                className={`w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer flex items-center justify-between group relative border-b border-[#f0f4f9] ${
                  isSelected
                    ? 'bg-[#e8f0fe] text-slate-900'
                    : 'hover:bg-[#f8fafd] text-slate-700'
                }`}
              >
                {/* Active Google Blue Left Stripe */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0b57d0]" />
                )}

                {/* Left: Info */}
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#0b57d0]' : 'text-slate-900 group-hover:text-[#0b57d0]'}`}>
                      {st.nameZh || st.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                    <span className="truncate max-w-[120px] font-mono text-slate-500">
                      {st.shortName || st.author}
                    </span>
                    <span>·</span>
                    <span className={`px-1.5 py-0.2 rounded-full font-mono font-medium ${
                      modelMode === 'SHORT'
                        ? 'text-[#0b57d0] bg-[#d3e3fd]/60'
                        : modelMode === 'SWING'
                        ? 'text-[#0f5223] bg-[#c4eed0]/60'
                        : 'text-[#5a2489] bg-[#eedcfc]/60'
                    }`}>
                      {modelMode === 'SHORT' ? '短线' : modelMode === 'SWING' ? '波段' : '长线'}
                    </span>
                  </div>
                </div>

                {/* Right: Score Badge & Verification Dot */}
                <div className="flex flex-col items-end shrink-0 pl-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-mono font-extrabold px-1.5 py-0.5 rounded-lg ${
                      isSelected
                        ? 'bg-[#0b57d0] text-white'
                        : 'bg-[#f0f4f9] text-slate-800'
                    }`}>
                      {scoreV2.totalScore.toFixed(1)}
                    </span>
                  </div>

                  <span className="text-[9px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${scoreV2.hasBacktest ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <span>{scoreV2.hasBacktest ? '实测' : '待验'}</span>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
