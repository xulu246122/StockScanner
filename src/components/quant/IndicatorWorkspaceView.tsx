import { useState } from 'react';
import { IndicatorDefinition } from '../../types.ts';
import { MOCK_QUANT_INDICATORS } from '../../mock/quantStrategiesMock.ts';
import {
  Calculator,
  Sliders,
  RotateCcw,
  Sparkles,
  BookOpen,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  Activity,
  BarChart2,
  Check,
  Zap,
  Layers,
  Search
} from 'lucide-react';

export function IndicatorWorkspaceView() {
  const [indicators, setIndicators] = useState<IndicatorDefinition[]>(MOCK_QUANT_INDICATORS);
  const [selectedId, setSelectedSelectedId] = useState<string>('rsi');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const selectedIndicator = indicators.find(i => i.id === selectedId) || indicators[0];

  // Parameter adjustment handler
  const handleParamChange = (indId: string, paramKey: string, newValue: any) => {
    setIndicators(prev =>
      prev.map(ind => {
        if (ind.id !== indId) return ind;
        const currentParams = Array.isArray(ind.parameters) ? {} : ind.parameters || {};
        return {
          ...ind,
          parameters: {
            ...currentParams,
            [paramKey]: {
              ...currentParams[paramKey],
              value: newValue
            }
          }
        };
      })
    );
  };

  const handleResetParams = (indId: string) => {
    setIndicators(prev =>
      prev.map(ind => {
        if (ind.id !== indId) return ind;
        const currentParams = Array.isArray(ind.parameters) ? {} : ind.parameters || {};
        const reset: Record<string, any> = {};
        Object.entries(currentParams).forEach(([k, v]: [string, any]) => {
          reset[k] = { ...v, value: v.default };
        });
        return { ...ind, parameters: reset };
      })
    );
    setToastMsg(`参数已重置为默认值`);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const filteredList = indicators.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.shortName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50/50 text-slate-900 select-none relative">
      
      {/* Toast */}
      {toastMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in duration-150">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* LEFT PANE: INDICATOR ENCYCLOPEDIA SIDEBAR */}
      {/* ==================================================================== */}
      <div className="w-full lg:w-72 bg-white border-r border-slate-200/90 flex flex-col shrink-0 h-full overflow-hidden shadow-2xs">
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                技术指标百科全书 (ENCYCLOPEDIA)
              </h2>
              <p className="text-[10px] text-slate-400">7 核心机构经典量化指标词典</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索指标 (RSI, MACD, EMA)..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Indicator List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar bg-slate-50/30">
          {filteredList.map(ind => {
            const isSelected = ind.id === selectedId;
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => setSelectedSelectedId(ind.id)}
                className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border flex items-center justify-between group ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
                    : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>
                      {ind.shortName}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      {ind.categoryLabel || '趋势与动能'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[180px]">
                    {ind.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* RIGHT PANE: ENCYCLOPEDIA DETAILED VIEWER */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto custom-scrollbar p-5 space-y-5">
        
        {/* Top Header Card */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">{selectedIndicator.name}</h2>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {selectedIndicator.shortName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{selectedIndicator.description}</p>
            </div>

            <button
              type="button"
              onClick={() => handleResetParams(selectedIndicator.id)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
              <span>恢复默认参数</span>
            </button>
          </div>

          {/* SVG Visual Schematic Schematic */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              图形图解与工作原理 (VISUAL DIAGRAM SCHEMATIC):
            </span>

            <div className="h-32 w-full bg-slate-50 rounded-lg border border-slate-200 p-2 relative overflow-hidden flex items-center justify-center">
              {selectedIndicator.id === 'rsi' ? (
                <svg className="w-full h-full" viewBox="0 0 400 80" preserveAspectRatio="none">
                  <line x1="0" y1="20" x2="400" y2="20" stroke="#f43f5e" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="5" y="15" fill="#f43f5e" fontSize="9" fontFamily="monospace">超买 70</text>
                  <line x1="0" y1="60" x2="400" y2="60" stroke="#10b981" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="5" y="75" fill="#10b981" fontSize="9" fontFamily="monospace">超卖 30</text>
                  <path d="M0 65 Q 100 75, 180 25 T 320 62 T 400 35" fill="none" stroke="#2563eb" strokeWidth="2" />
                </svg>
              ) : selectedIndicator.id === 'macd' ? (
                <svg className="w-full h-full" viewBox="0 0 400 80" preserveAspectRatio="none">
                  <line x1="0" y1="40" x2="400" y2="40" stroke="#94a3b8" strokeWidth="1" />
                  {Array.from({ length: 30 }).map((_, i) => {
                    const h = Math.sin(i * 0.3) * 30;
                    return (
                      <rect
                        key={i}
                        x={i * 13 + 5}
                        y={h >= 0 ? 40 - h : 40}
                        width="8"
                        height={Math.abs(h)}
                        fill={h >= 0 ? '#10b981' : '#f43f5e'}
                        opacity="0.8"
                      />
                    );
                  })}
                  <path d="M0 45 Q 100 20, 200 40 T 400 30" fill="none" stroke="#2563eb" strokeWidth="2" />
                  <path d="M0 40 Q 100 30, 200 45 T 400 40" fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="2 2" />
                </svg>
              ) : (
                <div className="text-slate-400 font-mono text-xs">
                  [标准技术指标波形与通道分布图]
                </div>
              )}
            </div>
          </div>

          {/* Mathematical Formula Card */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              底层量化数学计算公式 (MATHEMATICAL DEFINITION):
            </span>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs text-blue-700 font-extrabold select-text">
              {selectedIndicator.mathFormula || 'Indicator = Function(Price, Period)'}
            </div>
          </div>
        </div>

        {/* Dynamic Parameter Tuning Box */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              动态参数调优 (DYNAMIC PARAMETER TUNING)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(selectedIndicator.parameters || {}).map(([key, config]: [string, any]) => {
              const currentVal = config.value !== undefined ? config.value : config.default;
              return (
                <div key={key} className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{config.label || key}</span>
                    <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {currentVal}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={config.min ?? 1}
                    max={config.max ?? 100}
                    step={config.step ?? 1}
                    value={currentVal}
                    onChange={e => handleParamChange(selectedIndicator.id, key, parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />

                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Min: {config.min ?? 1}</span>
                    <span>Default: {config.default}</span>
                    <span>Max: {config.max ?? 100}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Academic Interpretations & Trading Signals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>多头买点信号特征 (BULLISH ENTRY)</span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              {selectedIndicator.bullishSignal || '当指标自下而上穿越关键超卖线或形成底背离金叉时，触发潜在多头右侧介入信号。'}
            </p>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>空头风险预警特征 (BEARISH RISK)</span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              {selectedIndicator.bearishSignal || '当指标进入超买极值或出现顶背离死叉破位时，提示持仓风险并建议执行跟踪止盈。'}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
