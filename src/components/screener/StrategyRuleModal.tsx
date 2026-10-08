import { useState } from 'react';
import { StrategyDefinition } from '../../types.ts';
import { X, BookOpen, ShieldCheck, AlertTriangle, Sliders, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';

interface StrategyRuleModalProps {
  strategy: StrategyDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onUseStrategy: (strategy: StrategyDefinition, customizedParams?: Record<string, any>) => void;
}

export function StrategyRuleModal({
  strategy,
  isOpen,
  onClose,
  onUseStrategy
}: StrategyRuleModalProps) {
  if (!isOpen || !strategy) return null;

  const [params, setParams] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    if (strategy.parameters) {
      Object.entries(strategy.parameters).forEach(([k, v]) => {
        initial[k] = v.value ?? v.default;
      });
    }
    return initial;
  });

  const handleParamChange = (key: string, val: any) => {
    setParams(prev => ({ ...prev, [key]: val }));
  };

  const handleResetParams = () => {
    const initial: Record<string, any> = {};
    if (strategy.parameters) {
      Object.entries(strategy.parameters).forEach(([k, v]) => {
        initial[k] = v.default;
      });
    }
    setParams(initial);
  };

  const getEvidenceBadge = (level: string) => {
    switch (level) {
      case 'LEVEL_A':
        return {
          label: 'Evidence Level A (学术验证 / 严格原始规则)',
          desc: '有明确原始作者公开规则，并具备学术文献独立复现验证'
        };
      case 'LEVEL_B':
        return {
          label: 'Evidence Level B (著作公开 / 经典规则体系)',
          desc: '有明确原著者专著与公开规则定义，属成熟经典交易体系'
        };
      default:
        return {
          label: 'Evidence Level C (行业经验范式)',
          desc: '行业通行技术分析范式，具备一定主观与经验成分'
        };
    }
  };

  const evidence = getEvidenceBadge(strategy.evidenceLevel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">{strategy.name}</h3>
                <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                  {strategy.evidenceLevel}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {strategy.author} · {strategy.origin}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Strategy Meta & Citation */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-semibold text-slate-700">文献来源 / 出处参考:</span>
              <span className="text-slate-500">{strategy.sourceType}</span>
            </div>
            <div className="text-slate-800 font-mono text-[11px] leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/60">
              {strategy.sourceReference}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-blue-700 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>{evidence.label} — {evidence.desc}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
              <span>策略核心思想与逻辑</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
              {strategy.description}
            </p>
          </div>

          {/* Strategy Rules AST List */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
              <span>入场与确认条件清单 (Rule AST)</span>
              <span className="text-[11px] font-mono text-slate-400">
                逻辑组合: {strategy.rules.logicalOperator}
              </span>
            </h4>
            <div className="space-y-1.5">
              {strategy.rules.children.map((child: any, idx: number) => (
                <div
                  key={child.id || idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold">{child.label || child.indicatorId}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Indicator: {child.indicatorId} · Op: {child.operator} · Value: {JSON.stringify(child.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Framework & Invalidation */}
          {strategy.riskFramework && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2 text-xs">
              <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>风控纪律与失效界定 (Risk & Invalidation)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-white/80 rounded-lg border border-amber-100">
                  <span className="font-bold text-slate-700">入场锚点:</span>
                  <div className="text-slate-600 mt-0.5">{strategy.riskFramework.entryReference}</div>
                </div>
                <div className="p-2 bg-white/80 rounded-lg border border-amber-100">
                  <span className="font-bold text-rose-700">硬性失效/止损:</span>
                  <div className="text-slate-600 mt-0.5">{strategy.riskFramework.stopLossRule}</div>
                </div>
              </div>
            </div>
          )}

          {/* Strategy Parameter Configurator */}
          {strategy.parameters && Object.keys(strategy.parameters).length > 0 && (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>策略参数微调 (Strategy Parameters)</span>
                </h4>
                <button
                  type="button"
                  onClick={handleResetParams}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置默认</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(strategy.parameters).map(([key, pConfig]) => (
                  <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">{pConfig.label}</span>
                      <span className="font-mono font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {params[key]}
                      </span>
                    </div>
                    {pConfig.min !== undefined && pConfig.max !== undefined && (
                      <input
                        type="range"
                        min={pConfig.min}
                        max={pConfig.max}
                        step={pConfig.step || 1}
                        value={params[key]}
                        onChange={e => handleParamChange(key, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Disclaimer Banner */}
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200/90 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700">量化合规声明：</span>
            本系统策略为公开学术文献及经典著作整理之量化规则模板，不包含任何未来收益保障或胜率承诺。金融市场具备本金亏损风险，请自主进行风险管理。
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            关闭详情
          </button>
          <button
            type="button"
            onClick={() => {
              onUseStrategy(strategy, params);
              onClose();
            }}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>使用此策略筛选 (Use Strategy)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
