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
  ChevronUp,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { StrategyRuleModal } from './StrategyRuleModal.tsx';
import { CustomConditionBuilder } from './CustomConditionBuilder.tsx';

interface StrategyMatrixWorkbenchProps {
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

type MainCategory = 'STRATEGIES' | 'INDICATORS' | 'CUSTOM' | 'SAVED';

export function StrategyMatrixWorkbench({
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
}: StrategyMatrixWorkbenchProps) {
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

  const handleUseStrategy = (strategy: StrategyDefinition) => {
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

  const timeframes: Timeframe[] = ['10m', '30m', '1h', '4h', '1D', '1W'];

  return (
    <>
      {/* INLINE FULL-WIDTH WORKBENCH (In-Canvas Institutional Container) */}
      <div className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
        
        {/* Workbench Header Strip */}
        <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white tracking-wide">
                  量化策略与多因子工作台 (Strategy & Factor Workbench)
                </span>
                <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-800/80">
                  Institutional Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                三层架构：11大类基础指标 · 7套学术与经典策略 · AST 规则树可视化调优
              </p>
            </div>
          </div>

          {/* Timeframe Quick Selector & Action Controls */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 px-2">周期:</span>
              {timeframes.map(tf => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onChangeTimeframe(tf)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    currentTimeframe === tf
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClearAllRules}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-rose-400 hover:bg-slate-800/70 rounded-lg transition-all cursor-pointer flex items-center gap-1"
              title="清空当前所有筛选条件"
            >
              <RotateCcw className="w-3 h-3" />
              <span>清空条件</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
              title="收起工作台"
            >
              <span>收起工作台</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3-Column Balanced Inline Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 min-h-[380px] max-h-[500px]">
          
          {/* COLUMN 1: CATEGORY NAVIGATION (lg:col-span-2) */}
          <div className="lg:col-span-2 bg-slate-950/40 p-2.5 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto shrink-0">
            <div className="hidden lg:block px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              模块导航
            </div>

            <button
              type="button"
              onClick={() => setActiveCategory('STRATEGIES')}
              className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer text-left shrink-0 ${
                activeCategory === 'STRATEGIES'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">经典与学术策略</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                activeCategory === 'STRATEGIES' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {strategies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('INDICATORS')}
              className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer text-left shrink-0 ${
                activeCategory === 'INDICATORS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">技术指标分类库</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                activeCategory === 'INDICATORS' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {indicators.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('CUSTOM')}
              className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer text-left shrink-0 ${
                activeCategory === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">自定义规则构建</span>
              </div>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('SAVED')}
              className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer text-left shrink-0 ${
                activeCategory === 'SAVED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Bookmark className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">我的已存策略</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                activeCategory === 'SAVED' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {savedStrategies.length}
              </span>
            </button>
          </div>

          {/* COLUMN 2: SEARCHABLE REPOSITORY & CARDS (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col overflow-hidden bg-slate-900/60">
            {/* Search & Sub-Filter Bar */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索策略名、指标或作者 (如 Donchian, Darvas, Connors, RSI, 均线)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950/70 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-blue-500 font-medium transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sub-Filters */}
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
                      className={`px-2 py-0.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                        strategySubFilter === sub.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
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
                      className={`px-2 py-0.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                        indicatorSubFilter === sub.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable Items Grid */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {activeCategory === 'STRATEGIES' && (
                <div className="grid grid-cols-1 gap-2">
                  {filteredStrategies.map(st => (
                    <div
                      key={st.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/80 transition-all flex flex-col justify-between gap-2 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-xs text-white">{st.name}</h4>
                              <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-950 px-1.5 py-0.2 rounded border border-blue-800">
                                {st.evidenceLevel}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                              {st.author} · {st.horizon}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {st.family}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                          {st.description}
                        </p>
                      </div>

                      {/* Rules preview chips */}
                      <div className="flex flex-wrap gap-1">
                        {st.rules.children.map((c: any, i: number) => (
                          <span
                            key={c.id || i}
                            className="text-[10px] font-mono text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded"
                          >
                            {c.label || c.indicatorId}
                          </span>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStrategyForModal(st);
                            setIsRuleModalOpen(true);
                          }}
                          className="text-xs font-bold text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>查看规则与出处</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUseStrategy(st)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        >
                          <span>载入此策略 (Use)</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeCategory === 'INDICATORS' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredIndicators.map(ind => (
                    <div
                      key={ind.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-1.5"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-white">{ind.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">{ind.category}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {ind.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddIndicatorLeaf(ind)}
                        className="w-full py-1 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>加入筛选条件</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeCategory === 'CUSTOM' && (
                <div className="bg-slate-950/40 p-2 rounded-xl">
                  <CustomConditionBuilder
                    currentRules={activeRules}
                    indicators={indicators}
                    onChangeRules={onChangeRules}
                    onSaveStrategyPrompt={() => setIsSavePromptOpen(true)}
                    conflicts={conflicts}
                  />
                </div>
              )}

              {activeCategory === 'SAVED' && (
                <div className="space-y-2">
                  {savedStrategies.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      暂无已保存的自定义策略，在自定义规则构建器中配置后可保存。
                    </div>
                  ) : (
                    savedStrategies.map(saved => (
                      <div
                        key={saved.id}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-extrabold text-xs text-white">{saved.name}</div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{saved.description}</p>
                          <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                            包含 {saved.rules?.children?.length || 0} 个条件 · 逻辑 {saved.rules?.logicalOperator || 'AND'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onChangeRules(JSON.parse(JSON.stringify(saved.rules)))}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0"
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

          {/* COLUMN 3: ACTIVE CONDITIONS & IMMEDIATE DOCK (lg:col-span-3) */}
          <div className="lg:col-span-3 bg-slate-950/70 p-3 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-black text-white">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>当前激活条件 ({activeRules.children.length})</span>
                </div>
                <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-950 px-1.5 py-0.2 rounded border border-blue-900">
                  {activeRules.logicalOperator}
                </span>
              </div>

              {/* Conflict Warnings */}
              {conflicts.length > 0 && (
                <div className="p-2 bg-rose-950/60 border border-rose-800 rounded-xl space-y-0.5 text-rose-200">
                  <div className="flex items-center gap-1 font-bold text-[10px] text-rose-300">
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>检测到逻辑冲突</span>
                  </div>
                  {conflicts.map((c, idx) => (
                    <p key={idx} className="text-[10px] text-rose-300 pl-3">
                      • {c}
                    </p>
                  ))}
                </div>
              )}

              {/* Active Conditions Chips List */}
              <div className="space-y-1.5">
                {activeRules.children.length === 0 ? (
                  <div className="p-5 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                    未加载任何过滤条件。请在中栏点击策略或指标添加。
                  </div>
                ) : (
                  activeRules.children.map((child: any, idx: number) => (
                    <div
                      key={child.id || idx}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-1.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="truncate">
                        <div className="font-bold text-[11px] text-white truncate">
                          {child.label || child.indicatorId}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {child.operator} · {JSON.stringify(child.value)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(child.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
              <button
                type="button"
                onClick={() => setIsSavePromptOpen(true)}
                disabled={activeRules.children.length === 0}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-700"
              >
                <Bookmark className="w-3 h-3" />
                <span>保存为自定义策略</span>
              </button>

              <button
                type="button"
                onClick={() => onApplyScreen()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>立即应用并筛选标的</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-slate-800 space-y-3">
            <h3 className="font-extrabold text-sm text-white">保存为自定义交易策略</h3>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">策略名称:</label>
              <input
                type="text"
                value={newStrategyName}
                onChange={e => setNewStrategyName(e.target.value)}
                placeholder="例如: 突破箱体 + RVOL放量模型"
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">描述备注 (选填):</label>
              <input
                type="text"
                value={newStrategyDesc}
                onChange={e => setNewStrategyDesc(e.target.value)}
                placeholder="适用于大盘 Risk-on 动量环境..."
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSavePromptOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveSubmit}
                disabled={!newStrategyName.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl shadow-xs cursor-pointer"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
