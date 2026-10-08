import { useState } from 'react';
import {
  ConditionGroup,
  ConditionNode,
  IndicatorDefinition,
  ConditionOperator,
  Timeframe
} from '../../types.ts';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Bookmark,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface CustomConditionBuilderProps {
  currentRules: ConditionGroup;
  indicators: IndicatorDefinition[];
  onChangeRules: (newRules: ConditionGroup) => void;
  onSaveStrategyPrompt: () => void;
  conflicts: string[];
}

const AVAILABLE_OPERATORS: { id: ConditionOperator; label: string }[] = [
  { id: 'GT', label: '> 大于' },
  { id: 'GTE', label: '>= 大于等于' },
  { id: 'LT', label: '< 小于' },
  { id: 'LTE', label: '<= 小于等于' },
  { id: 'EQ', label: '== 等于' },
  { id: 'CROSS_UP', label: '↗ 上穿 (Cross Up)' },
  { id: 'CROSS_DOWN', label: '↘ 下穿 (Cross Down)' },
  { id: 'SLOPE_UP', label: '📈 斜率向上 (Rising)' },
  { id: 'SLOPE_DOWN', label: '📉 斜率向下 (Falling)' }
];

const TIMEFRAMES: Timeframe[] = ['10m', '30m', '1h', '4h', '1D', '1W'];

export function CustomConditionBuilder({
  currentRules,
  indicators,
  onChangeRules,
  onSaveStrategyPrompt,
  conflicts
}: CustomConditionBuilderProps) {
  const [selectedIndId, setSelectedIndId] = useState<string>('rsi');
  const [selectedOp, setSelectedOp] = useState<ConditionOperator>('LT');
  const [targetValue, setTargetValue] = useState<string>('30');
  const [selectedTf, setSelectedTf] = useState<Timeframe>('1D');

  const handleAddCondition = () => {
    const ind = indicators.find(i => i.id === selectedIndId) || indicators[0];
    const numericVal = parseFloat(targetValue);
    const finalVal = isNaN(numericVal) ? targetValue : numericVal;

    const newNode: ConditionNode = {
      type: 'leaf',
      id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      indicatorId: selectedIndId,
      timeframe: selectedTf,
      operator: selectedOp,
      value: finalVal,
      label: `${ind.name} ${selectedOp} ${finalVal} (${selectedTf})`
    };

    const updatedGroup: ConditionGroup = {
      ...currentRules,
      children: [...currentRules.children, newNode]
    };
    onChangeRules(updatedGroup);
  };

  const handleRemoveCondition = (id: string) => {
    const updatedGroup: ConditionGroup = {
      ...currentRules,
      children: currentRules.children.filter((c: any) => c.id !== id)
    };
    onChangeRules(updatedGroup);
  };

  const handleToggleLogicalOp = () => {
    const nextOp = currentRules.logicalOperator === 'AND' ? 'OR' : 'AND';
    onChangeRules({
      ...currentRules,
      logicalOperator: nextOp
    });
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* Logical Operator Switch */}
      <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold text-slate-700">条件组合逻辑 (Logical Op):</span>
        </div>
        <button
          type="button"
          onClick={handleToggleLogicalOp}
          className={`px-3 py-1 rounded-lg font-mono font-black text-xs transition-all cursor-pointer ${
            currentRules.logicalOperator === 'AND'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-amber-600 text-white shadow-xs'
          }`}
        >
          {currentRules.logicalOperator} (点击切换)
        </button>
      </div>

      {/* Conflict Warning Alert */}
      {conflicts.length > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-800">
          <div className="flex items-center gap-1.5 font-bold text-xs text-rose-900">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>检测到潜在逻辑冲突 (Conflicting Setup)</span>
          </div>
          {conflicts.map((warn, i) => (
            <p key={i} className="text-[11px] text-rose-700 pl-5">
              • {warn}
            </p>
          ))}
        </div>
      )}

      {/* Active Conditions List */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-slate-500 font-bold px-1">
          <span>当前已激活条件 ({currentRules.children.length})</span>
          <button
            type="button"
            onClick={onSaveStrategyPrompt}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 cursor-pointer font-bold"
          >
            <Bookmark className="w-3 h-3" />
            <span>保存为自定义策略</span>
          </button>
        </div>

        {currentRules.children.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
            暂无已激活条件，请在下方选择指标并添加。
          </div>
        ) : (
          <div className="space-y-1.5">
            {currentRules.children.map((child: any, idx: number) => (
              <div
                key={child.id || idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-md bg-slate-100 font-mono text-[10px] font-bold text-slate-600 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-slate-800">{child.label || child.indicatorId}</span>
                    <span className="ml-2 font-mono text-[10px] text-slate-400">
                      [{child.timeframe || '1D'}]
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCondition(child.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0 ml-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Condition Builder Panel */}
      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
        <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-blue-600" />
          <span>添加新交易规则条件</span>
        </div>

        {/* 1. Indicator Selector */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600">选择技术指标 / 因子:</label>
          <select
            value={selectedIndId}
            onChange={e => setSelectedIndId(e.target.value)}
            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-blue-500"
          >
            {indicators.map(ind => (
              <option key={ind.id} value={ind.id}>
                [{ind.category.toUpperCase()}] {ind.name}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Operator & Value */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">比较操作符:</label>
            <select
              value={selectedOp}
              onChange={e => setSelectedOp(e.target.value as ConditionOperator)}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-blue-500"
            >
              {AVAILABLE_OPERATORS.map(op => (
                <option key={op.id} value={op.id}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600">目标阈值 / 参考:</label>
            <input
              type="text"
              value={targetValue}
              onChange={e => setTargetValue(e.target.value)}
              placeholder="如 30, 1.2"
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-blue-500"
            />
          </div>
        </div>

        {/* 3. Timeframe */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600">K 线周期级别 (Timeframe):</label>
          <div className="grid grid-cols-6 gap-1">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => setSelectedTf(tf)}
                className={`py-1 rounded-lg text-center font-mono text-[11px] font-bold border transition-all cursor-pointer ${
                  selectedTf === tf
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddCondition}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>确认加入当前筛选树</span>
        </button>
      </div>
    </div>
  );
}
