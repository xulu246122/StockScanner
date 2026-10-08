import { useState, useMemo, useEffect } from 'react';
import {
  StrategyDefinition,
  IndicatorDefinition,
  ConditionGroup,
  ConditionNode,
  SavedStrategy,
  Timeframe
} from '../../types.ts';
import {
  X,
  Search,
  BookOpen,
  Sliders,
  SlidersHorizontal,
  Check,
  Plus,
  Trash2,
  Bookmark,
  Zap,
  Layers,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Activity,
  BarChart2,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { StrategyRuleModal } from './StrategyRuleModal.tsx';
import { CustomConditionBuilder } from './CustomConditionBuilder.tsx';

interface StrategyMatrixDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: StrategyDefinition[];
  indicators: IndicatorDefinition[];
  savedStrategies: SavedStrategy[];
  activeRules: ConditionGroup;
  onChangeRules: (rules: ConditionGroup) => void;
  onApplyScreen: (selectedStrategyId?: string) => void;
  onSaveCurrentAsStrategy: (name: string, description: string) => void;
  currentTimeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;
}

type MainCategory = 'QUICK' | 'STRATEGIES' | 'INDICATORS' | 'CUSTOM' | 'SAVED';

export function StrategyMatrixDrawer({
  isOpen,
  onClose,
  strategies,
  indicators,
  savedStrategies,
  activeRules,
  onChangeRules,
  onApplyScreen,
  onSaveCurrentAsStrategy,
  currentTimeframe,
  onChangeTimeframe
}: StrategyMatrixDrawerProps) {
  if (!isOpen) return null;

  const [activeCategory, setActiveCategory] = useState<MainCategory>('STRATEGIES');
  const [strategySubFilter, setStrategySubFilter] = useState<'ALL' | 'short_term' | 'swing' | 'factor'>('ALL');
  const [indicatorSubFilter, setIndicatorSubFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected strategy for detail modal
  const [selectedStrategyForModal, setSelectedStrategyForModal] = useState<StrategyDefinition | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  // Save strategy modal prompt
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [newStrategyDesc, setNewStrategyDesc] = useState('');

  // Conflict warnings
  const [conflicts, setConflicts] = useState<string[]>([]);

  // Local conflict check
  useEffect(() => {
    const warns: string[] = [];
    const leaves: ConditionNode[] = [];
    const walk = (g: ConditionGroup) => {
      for (const c of g.children) {
        if (c.type === 'leaf') leaves.push(c);
        else walk(c);
      }
    };
    walk(activeRules);

    const rsiLeaves = leaves.filter(l => l.indicatorId === 'rsi');
    const rsiLt = rsiLeaves.find(l => (l.operator === 'LT' || l.operator === 'LTE') && typeof l.value === 'number');
    const rsiGt = rsiLeaves.find(l => (l.operator === 'GT' || l.operator === 'GTE') && typeof l.value === 'number');

    if (rsiLt && rsiGt && Number(rsiLt.value) < Number(rsiGt.value)) {
      warns.push(`互斥冲突：要求 RSI < ${rsiLt.value} 与 RSI > ${rsiGt.value} 同时成立`);
    }

    setConflicts(warns);
  }, [activeRules]);

  // Filtered strategies
  const filteredStrategies = useMemo(() => {
    return strategies.filter(st => {
      if (strategySubFilter !== 'ALL' && st.family !== strategySubFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        st.shortName.toLowerCase().includes(q) ||
        st.author.toLowerCase().includes(q) ||
        st.description.toLowerCase().includes(q) ||
        st.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [strategies, strategySubFilter, searchQuery]);

  // Filtered indicators
  const filteredIndicators = useMemo(() => {
    return indicators.filter(ind => {
      if (indicatorSubFilter !== 'ALL' && ind.category !== indicatorSubFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        ind.name.toLowerCase().includes(q) ||
        ind.shortName.toLowerCase().includes(q) ||
        ind.category.toLowerCase().includes(q) ||
        ind.description.toLowerCase().includes(q)
      );
    });
  }, [indicators, indicatorSubFilter, searchQuery]);

  const handleUseStrategy = (strategy: StrategyDefinition, customizedParams?: Record<string, any>) => {
    // Clone strategy rules into activeRules
    const clonedRules: ConditionGroup = JSON.parse(JSON.stringify(strategy.rules));
    onChangeRules(clonedRules);
  };

  const handleAddIndicatorLeaf = (ind: IndicatorDefinition) => {
    const defaultOp = ind.operators[0] || 'GT';
    let defaultValue: any = 30;
    if (ind.id === 'rsi') defaultValue = 30;
    else if (ind.id === 'relative_volume') defaultValue = 1.2;
    else if (ind.id === 'changePercent') defaultValue = 0;
    else if (ind.id === 'distFrom52wHigh') defaultValue = -15;

    const newNode: ConditionNode = {
      type: 'leaf',
      id: `leaf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      indicatorId: ind.id,
      operator: defaultOp,
      value: defaultValue,
      timeframe: currentTimeframe,
      label: `${ind.name} ${defaultOp} ${defaultValue}`
    };

    onChangeRules({
      ...activeRules,
      children: [...activeRules.children, newNode]
    });
  };

  const handleRemoveRule = (id: string) => {
    onChangeRules({
      ...activeRules,
      children: activeRules.children.filter((c: any) => c.id !== id)
    });
  };

  const handleClearAllRules = () => {
    onChangeRules({
      type: 'group',
      id: 'root_empty',
      logicalOperator: 'AND',
      children: []
    });
  };

  const handleSaveSubmit = () => {
    if (!newStrategyName.trim()) return;
    onSaveCurrentAsStrategy(newStrategyName.trim(), newStrategyDesc.trim());
    setIsSavePromptOpen(false);
    setNewStrategyName('');
    setNewStrategyDesc('');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div 
          className="w-full max-w-6xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 border-l border-slate-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>策略与多因子筛选矩阵 (Strategy & Factor Matrix)</span>
                  <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    Pro Engine
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  3 层架构：指标层 · 经典与学术策略层 · 自定义规则树 (AND/OR AST)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearAllRules}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>清空条件</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 3-Column Desktop Matrix (Collapsible & Responsive) */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
            
            {/* COLUMN 1: CATEGORY NAVIGATION (Width ~210px) */}
            <div className="w-full md:w-56 bg-slate-50/70 p-3 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0">
              <div className="hidden md:block px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                导航分类 (Categories)
              </div>

              <button
                type="button"
                onClick={() => setActiveCategory('STRATEGIES')}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer text-left shrink-0 ${
                  activeCategory === 'STRATEGIES'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>经典与学术策略</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  activeCategory === 'STRATEGIES' ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {strategies.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('INDICATORS')}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer text-left shrink-0 ${
                  activeCategory === 'INDICATORS'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 shrink-0" />
                  <span>技术指标分类库</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  activeCategory === 'INDICATORS' ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {indicators.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('CUSTOM')}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer text-left shrink-0 ${
                  activeCategory === 'CUSTOM'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>自定义规则构建器</span>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('SAVED')}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer text-left shrink-0 ${
                  activeCategory === 'SAVED'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 shrink-0" />
                  <span>我的已存策略</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                  activeCategory === 'SAVED' ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {savedStrategies.length}
                </span>
              </button>
            </div>

            {/* COLUMN 2: REPOSITORY & AVAILABLE ITEMS (Width ~450px) */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Search Bar & Sub-Filters */}
              <div className="p-3.5 border-b border-slate-100 bg-white space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="搜索策略名、指标、作者 (如 Donchian, Darvas, RSI, 突破)..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-blue-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Subcategory Pills */}
                {activeCategory === 'STRATEGIES' && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                    {[
                      { id: 'ALL', label: '全部策略' },
                      { id: 'short_term', label: '短线突破与反弹 (1-10D)' },
                      { id: 'swing', label: '波段趋势模板 (SEPA/动量)' },
                      { id: 'factor', label: '长期因子与价值' }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setStrategySubFilter(sub.id as any)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                          strategySubFilter === sub.id
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}

                {activeCategory === 'INDICATORS' && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                    {[
                      { id: 'ALL', label: '全部指标' },
                      { id: 'momentum', label: '动量' },
                      { id: 'moving_averages', label: '均线' },
                      { id: 'trend', label: '趋势' },
                      { id: 'volume', label: '成交量' },
                      { id: 'volatility', label: '波动率' },
                      { id: 'structure', label: '形态结构' },
                      { id: 'fundamental', label: '基本面' }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setIndicatorSubFilter(sub.id)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                          indicatorSubFilter === sub.id
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {activeCategory === 'STRATEGIES' && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredStrategies.map(st => (
                      <div
                        key={st.id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between gap-2.5"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-xs text-slate-900">{st.name}</h4>
                                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                                  {st.evidenceLevel}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {st.author} · {st.horizon}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {st.family}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                            {st.description}
                          </p>
                        </div>

                        {/* Rules preview chips */}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {st.rules.children.map((c: any, i: number) => (
                            <span
                              key={c.id || i}
                              className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                            >
                              {c.label || c.indicatorId}
                            </span>
                          ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStrategyForModal(st);
                              setIsRuleModalOpen(true);
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>查看规则与出处 (View Rules)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUseStrategy(st)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                          >
                            <span>使用此策略 (Use)</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeCategory === 'INDICATORS' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredIndicators.map(ind => (
                      <div
                        key={ind.id}
                        className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-slate-900">{ind.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{ind.category}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {ind.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddIndicatorLeaf(ind)}
                          className="w-full py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>加入筛选条件</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeCategory === 'CUSTOM' && (
                  <CustomConditionBuilder
                    currentRules={activeRules}
                    indicators={indicators}
                    onChangeRules={onChangeRules}
                    onSaveStrategyPrompt={() => setIsSavePromptOpen(true)}
                    conflicts={conflicts}
                  />
                )}

                {activeCategory === 'SAVED' && (
                  <div className="space-y-2">
                    {savedStrategies.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        暂无已保存的自定义策略，在自定义规则构建器中配置后可保存。
                      </div>
                    ) : (
                      savedStrategies.map(saved => (
                        <div
                          key={saved.id}
                          className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-extrabold text-xs text-slate-900">{saved.name}</div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{saved.description}</p>
                            <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                              包含 {saved.rules?.children?.length || 0} 个条件 · 逻辑 {saved.rules?.logicalOperator || 'AND'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onChangeRules(JSON.parse(JSON.stringify(saved.rules)))}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
                          >
                            载入应用
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: SELECTED / ACTIVE CONDITIONS PANEL (Width ~340px) */}
            <div className="w-full md:w-80 bg-slate-50/80 p-4 flex flex-col justify-between overflow-hidden shrink-0">
              <div className="flex-1 overflow-y-auto space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>已激活筛选条件 ({activeRules.children.length})</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    {activeRules.logicalOperator}
                  </span>
                </div>

                {/* Conflict Warnings in Col 3 */}
                {conflicts.length > 0 && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-800">
                    <div className="flex items-center gap-1 font-bold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>规则冲突警示</span>
                    </div>
                    {conflicts.map((c, idx) => (
                      <p key={idx} className="text-[10px] text-rose-700 pl-4">
                        • {c}
                      </p>
                    ))}
                  </div>
                )}

                {/* Active Rules List */}
                <div className="space-y-1.5">
                  {activeRules.children.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-xs">
                      目前未加载任何过滤条件。请在中间栏选择策略或技术指标加入。
                    </div>
                  ) : (
                    activeRules.children.map((child: any, idx: number) => (
                      <div
                        key={child.id || idx}
                        className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <div className="font-bold text-xs text-slate-800 truncate">
                            {child.label || child.indicatorId}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {child.operator} · {JSON.stringify(child.value)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(child.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Sticky Action Area */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsSavePromptOpen(true)}
                  disabled={activeRules.children.length === 0}
                  className="w-full py-2 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>保存当前条件为策略</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onApplyScreen();
                    onClose();
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>应用并执行全市场筛选</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Rule Detail Modal */}
      <StrategyRuleModal
        strategy={selectedStrategyForModal}
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        onUseStrategy={handleUseStrategy}
      />

      {/* Save Custom Strategy Prompt Modal */}
      {isSavePromptOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900">保存为自定义交易策略</h3>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">策略名称:</label>
              <input
                type="text"
                value={newStrategyName}
                onChange={e => setNewStrategyName(e.target.value)}
                placeholder="例如: 强势多头突破模型"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">描述备注 (选填):</label>
              <input
                type="text"
                value={newStrategyDesc}
                onChange={e => setNewStrategyDesc(e.target.value)}
                placeholder="适用大盘 Risk-on 环境..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSavePromptOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveSubmit}
                disabled={!newStrategyName.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
              >
                保存策略
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
