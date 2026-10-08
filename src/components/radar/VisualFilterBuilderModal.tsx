import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  Plus,
  HelpCircle,
  AlertCircle,
  Database,
  Layers,
  Sparkles
} from 'lucide-react';
import { ConditionGroup, ConditionNode, ConditionOperator } from '../../types.ts';
import { apiClient } from '../../services/apiClient.ts';

interface FilterCategory {
  id: string;
  name: string;
  nameZh: string;
  availability: 'AVAILABLE' | 'PARTIAL' | 'DATA_NOT_AVAILABLE';
}

interface FilterDef {
  id: string;
  category: string;
  name: string;
  nameZh?: string;
  description: string;
  valueType: 'number' | 'boolean' | 'text' | 'enum';
  operators: ConditionOperator[];
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  enumOptions?: { label: string; value: any }[];
  availability: 'AVAILABLE' | 'PARTIAL' | 'DATA_NOT_AVAILABLE';
}

interface VisualFilterBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRules: ConditionGroup;
  onAddCondition: (node: ConditionNode) => void;
}

export const VisualFilterBuilderModal: React.FC<VisualFilterBuilderModalProps> = ({
  isOpen,
  onClose,
  currentRules,
  onAddCondition
}) => {
  const [categories, setCategories] = useState<FilterCategory[]>([]);
  const [filters, setFilters] = useState<FilterDef[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('universe');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<FilterDef | null>(null);

  // Form state for new condition
  const [operator, setOperator] = useState<ConditionOperator>('GTE');
  const [targetValue, setTargetValue] = useState<any>('');
  const [period, setPeriod] = useState<number>(14);

  useEffect(() => {
    if (!isOpen) return;
    apiClient.getRadarFilters().then((res) => {
      if (res.success) {
        setCategories(res.categories || []);
        setFilters(res.filters || []);
        if (res.categories && res.categories.length > 0) {
          setSelectedCategory(res.categories[0].id);
        }
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (selectedFilter) {
      setOperator(selectedFilter.operators[0] || 'GTE');
      setTargetValue(selectedFilter.defaultValue ?? (selectedFilter.valueType === 'number' ? 0 : ''));
    }
  }, [selectedFilter]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) =>
    searchQuery
      ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nameZh.includes(searchQuery)
      : true
  );

  const displayedFilters = filters.filter((f) => {
    const matchesCategory = searchQuery ? true : f.category === selectedCategory;
    const matchesSearch = searchQuery
      ? f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.nameZh && f.nameZh.includes(searchQuery)) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesSearch;
  });

  const handleApply = () => {
    if (!selectedFilter) return;

    let parsedVal = targetValue;
    if (selectedFilter.valueType === 'number') {
      parsedVal = Number(targetValue);
    }

    const newNode: ConditionNode = {
      type: 'leaf',
      id: `leaf_${selectedFilter.id}_${Date.now()}`,
      indicatorId: selectedFilter.id,
      operator,
      value: parsedVal,
      parameter: selectedFilter.id === 'rsi' || selectedFilter.id === 'sma' || selectedFilter.id === 'ema' ? { period } : undefined,
      label: `${selectedFilter.nameZh || selectedFilter.name} ${operator} ${parsedVal}`
    };

    onAddCondition(newNode);
    setSelectedFilter(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl h-[650px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">专业多因子指标库 (Professional Filter Builder)</h2>
              <p className="text-xs text-slate-400">28 大核心量化维度 · 覆盖价格/流动性/技术形态/估值/宏观机制</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索指标名称、因子代码或中文描述 (例如: RSI, RVOL, ATR, 市值, 52周新高)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Content layout: Categories list (left) + Filter cards (right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: 28 Categories */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/20 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearchQuery('');
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                  selectedCategory === cat.id && !searchQuery
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-200">{cat.nameZh}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{cat.name}</div>
                </div>
                {cat.availability === 'DATA_NOT_AVAILABLE' && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                    规划中
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right: Filters & Detail */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
            {displayedFilters.map((filter) => {
              const isSelected = selectedFilter?.id === filter.id;
              const isUnavailable = filter.availability === 'DATA_NOT_AVAILABLE';

              return (
                <div
                  key={filter.id}
                  onClick={() => !isUnavailable && setSelectedFilter(filter)}
                  className={`p-4 rounded-xl border transition-all ${
                    isUnavailable
                      ? 'bg-slate-950/40 border-slate-800/50 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-indigo-950/30 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30 cursor-pointer'
                      : 'bg-slate-850/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">
                          {filter.nameZh || filter.name}
                        </span>
                        <span className="font-mono text-xs text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-800/50">
                          {filter.id}
                        </span>
                        {filter.availability === 'DATA_NOT_AVAILABLE' && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded border border-amber-500/20 font-medium">
                            官方未开放实时源
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{filter.description}</p>
                    </div>

                    {!isUnavailable && (
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'border-slate-700 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Inline Parameter Configurator if selected */}
                  {isSelected && (
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-3">
                      {(filter.id === 'rsi' || filter.id === 'sma' || filter.id === 'ema') && (
                        <div className="flex items-center gap-1.5">
                          <label className="text-xs text-slate-400">周期:</label>
                          <input
                            type="number"
                            value={period}
                            onChange={(e) => setPeriod(Number(e.target.value))}
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <label className="text-xs text-slate-400">逻辑:</label>
                        <select
                          value={operator}
                          onChange={(e) => setOperator(e.target.value as ConditionOperator)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                        >
                          {filter.operators.map((op) => (
                            <option key={op} value={op}>
                              {op === 'GTE' ? '>= 大于等于' : op === 'LTE' ? '<= 小于等于' : op === 'GT' ? '> 大于' : op === 'LT' ? '< 小于' : op === 'EQ' ? '= 等于' : op}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 flex-1">
                        <label className="text-xs text-slate-400">目标阈值:</label>
                        {filter.enumOptions ? (
                          <select
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white flex-1"
                          >
                            {filter.enumOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={filter.valueType === 'number' ? 'number' : 'text'}
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white flex-1"
                            step={filter.step || 1}
                          />
                        )}
                        {filter.unit && <span className="text-xs text-slate-400">{filter.unit}</span>}
                      </div>

                      <button
                        onClick={handleApply}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>加入规则</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>支持多条件组合与自适应 AST 树结构解析</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
