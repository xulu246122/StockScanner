import React from 'react';
import { X, Sparkles, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { ConditionGroup, ConditionNode } from '../../types.ts';

interface ActiveFilterBadgesProps {
  rules: ConditionGroup;
  presetName?: string;
  previewCount?: number;
  totalUniverseCount?: number;
  onRemoveLeaf: (conditionId: string) => void;
  onClearAll: () => void;
  onOpenBuilder: () => void;
}

export const ActiveFilterBadges: React.FC<ActiveFilterBadgesProps> = ({
  rules,
  presetName,
  previewCount,
  totalUniverseCount,
  onRemoveLeaf,
  onClearAll,
  onOpenBuilder
}) => {
  const leaves: ConditionNode[] = [];
  const collectLeaves = (group: ConditionGroup) => {
    if (!group.children) return;
    for (const item of group.children) {
      if (item.type === 'leaf') leaves.push(item);
      else collectLeaves(item);
    }
  };
  collectLeaves(rules);

  if (leaves.length === 0 && !presetName) {
    return null;
  }

  const formatOperator = (op: string) => {
    switch (op) {
      case 'GT': return '>';
      case 'GTE': return '>=';
      case 'LT': return '<';
      case 'LTE': return '<=';
      case 'EQ': return '=';
      case 'NEQ': return '!=';
      case 'BETWEEN': return '区间';
      case 'IN_SET': return '包含于';
      default: return op;
    }
  };

  const formatValue = (val: any) => {
    if (typeof val === 'number') {
      if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(0)}B`;
      if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(0)}M`;
      return val.toString();
    }
    if (Array.isArray(val)) return `[${val.join(', ')}]`;
    return String(val);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-900/60 border border-slate-800 rounded-xl my-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mr-1">
        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
        <span>激活条件 ({leaves.length}):</span>
      </div>

      {presetName && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs rounded-lg font-medium">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>模板: {presetName}</span>
        </span>
      )}

      {leaves.map((leaf) => (
        <span
          key={leaf.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 border border-slate-700/80 text-slate-200 text-xs rounded-lg group hover:border-slate-600 transition-colors"
        >
          <span className="text-slate-400 font-mono text-[11px]">{leaf.indicatorId}</span>
          <span className="text-indigo-400 font-bold">{formatOperator(leaf.operator)}</span>
          <span className="font-semibold text-slate-100">{formatValue(leaf.value)}</span>
          <button
            onClick={() => onRemoveLeaf(leaf.id)}
            className="text-slate-500 hover:text-rose-400 ml-1 p-0.5 rounded transition-colors"
            title="移除此条件"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <div className="ml-auto flex items-center gap-2">
        {previewCount !== undefined && totalUniverseCount !== undefined && (
          <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs rounded-lg font-mono font-medium">
            🎯 匹配: <strong className="text-emerald-400">{previewCount}</strong> / {totalUniverseCount} 标的
          </span>
        )}

        <button
          onClick={onOpenBuilder}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1 hover:bg-indigo-950/40 rounded transition-colors"
        >
          + 增加过滤
        </button>

        <button
          onClick={onClearAll}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-400 px-2 py-1 hover:bg-rose-950/30 rounded transition-colors"
          title="清空全部条件"
        >
          <RotateCcw className="w-3 h-3" />
          <span>重置</span>
        </button>
      </div>
    </div>
  );
};
