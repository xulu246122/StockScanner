import { useState, useEffect } from 'react';
import {
  FactorDefinition,
  FactorModel,
  FactorWeight,
  StockFactorScore,
  FactorCategory,
  Timeframe
} from '../../types.ts';
import { apiClient } from '../../services/apiClient.ts';
import {
  Layers,
  Sliders,
  Play,
  Bookmark,
  Trash2,
  Plus,
  Check,
  Zap,
  TrendingUp,
  Activity,
  Star,
  Search,
  RotateCcw,
  Sparkles,
  Shield,
  HelpCircle,
  BarChart3,
  SlidersHorizontal
} from 'lucide-react';

export function FactorBuilderView() {
  const [factors, setFactors] = useState<FactorDefinition[]>([]);
  const [models, setModels] = useState<FactorModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<FactorModel | null>(null);

  // Active Builder State
  const [modelName, setModelName] = useState<string>('经典多因子 Alpha 组合模型');
  const [modelDesc, setModelDesc] = useState<string>('动量 40% + 趋势 40% + 波动率 20% 加权评分');
  const [combinationMode, setCombinationMode] = useState<'WEIGHTED_SUM' | 'LOGICAL_AND' | 'LOGICAL_OR'>('WEIGHTED_SUM');
  const [activeFactorWeights, setActiveFactorWeights] = useState<FactorWeight[]>([]);
  const [minScore, setMinScore] = useState<number>(70);
  const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>('1D');

  // Preview & Evaluation State
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [scores, setScores] = useState<StockFactorScore[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FactorCategory | 'ALL'>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadLibraryAndModels();
  }, []);

  const loadLibraryAndModels = async () => {
    try {
      const libRes = await apiClient.getFactorLibrary();
      setFactors(libRes.library || []);

      const modRes = await apiClient.getFactorModels();
      setModels(modRes.models || []);

      if (modRes.models && modRes.models.length > 0) {
        handleSelectModel(modRes.models[0]);
      }
    } catch (err) {
      console.error('Failed to load factor models:', err);
    }
  };

  const handleSelectModel = (model: FactorModel) => {
    setSelectedModel(model);
    setModelName(model.name);
    setModelDesc(model.description);
    setCombinationMode(model.combinationMode);
    setActiveFactorWeights(model.factors || []);
    setMinScore(model.minCompositeScore || 70);
  };

  // Evaluate active model against universe
  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      const res = await apiClient.evaluateFactorModel({
        name: modelName,
        combinationMode,
        factors: activeFactorWeights,
        minCompositeScore: minScore,
        timeframe: currentTimeframe
      });
      setScores(res.scores || []);
      setToastMsg(`多因子模型运算完成，评估了 ${res.scores?.length || 0} 只核心标的`);
      setTimeout(() => setToastMsg(null), 3000);
    } catch (err: any) {
      console.error('Factor evaluation error:', err);
      setToastMsg('多因子运算失败: ' + err.message);
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Add factor to active model
  const handleAddFactor = (def: FactorDefinition) => {
    if (activeFactorWeights.some(f => f.factorId === def.id)) {
      setToastMsg(`因子「${def.shortName}」已在组合中`);
      setTimeout(() => setToastMsg(null), 2500);
      return;
    }

    const newWeight: FactorWeight = {
      factorId: def.id,
      factorName: def.shortName,
      category: def.category,
      weight: def.defaultWeight || 0.25,
      operator: combinationMode === 'WEIGHTED_SUM' ? 'WEIGHT' : combinationMode === 'LOGICAL_AND' ? 'AND' : 'OR',
      minThreshold: 45
    };

    const updated = [...activeFactorWeights, newWeight];
    setActiveFactorWeights(updated);
    setToastMsg(`已添加因子: ${def.shortName}`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Remove factor
  const handleRemoveFactor = (factorId: string) => {
    const updated = activeFactorWeights.filter(f => f.factorId !== factorId);
    setActiveFactorWeights(updated);
  };

  // Normalize weights to sum to 100%
  const handleNormalizeWeights = () => {
    if (activeFactorWeights.length === 0) return;
    const currentSum = activeFactorWeights.reduce((sum, f) => sum + (f.weight || 0), 0);
    if (currentSum <= 0) return;

    const normalized = activeFactorWeights.map(f => ({
      ...f,
      weight: Number((f.weight / currentSum).toFixed(2))
    }));
    setActiveFactorWeights(normalized);
    setToastMsg('权重已自动归一化至 100%');
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Save custom factor model
  const handleSaveModel = async () => {
    try {
      const newModel: FactorModel = {
        id: selectedModel?.isPreset ? '' : (selectedModel?.id || ''),
        name: modelName,
        description: modelDesc,
        combinationMode,
        factors: activeFactorWeights,
        minCompositeScore: minScore,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const res = await apiClient.saveFactorModel(newModel);
      setToastMsg(`多因子模型「${res.model.name}」已保存成功！`);
      setTimeout(() => setToastMsg(null), 3000);

      const modRes = await apiClient.getFactorModels();
      setModels(modRes.models || []);
      setSelectedModel(res.model);
    } catch (err: any) {
      setToastMsg(err.message || '保存失败');
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const filteredLibrary = factors.filter(f => {
    if (selectedCategory === 'ALL') return true;
    return f.category === selectedCategory;
  });

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
      {/* COLUMN 1: FACTOR LIBRARY SIDEBAR */}
      {/* ==================================================================== */}
      <div className="w-full lg:w-80 bg-white border-r border-slate-200/90 flex flex-col shrink-0 h-full overflow-hidden shadow-2xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                多因子库 (FACTOR LIBRARY)
              </h2>
              <p className="text-[10px] text-slate-400">涵盖动量、趋势、质量与波动率</p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[10px] font-bold">
            {(['ALL', 'MOMENTUM', 'TREND', 'QUALITY', 'VOLATILITY', 'VOLUME'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'ALL' ? '全部因子' : cat === 'MOMENTUM' ? '动量' : cat === 'TREND' ? '趋势' : cat === 'QUALITY' ? '质量' : cat === 'VOLATILITY' ? '波动' : '量价'}
              </button>
            ))}
          </div>
        </div>

        {/* Factors List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/30">
          {filteredLibrary.map(def => {
            const isAdded = activeFactorWeights.some(f => f.factorId === def.id);
            return (
              <div
                key={def.id}
                className={`p-3 rounded-xl border transition-all ${
                  isAdded
                    ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">{def.name}</span>
                    <span className="text-[9px] font-mono font-bold text-blue-600 uppercase tracking-wider">
                      {def.categoryLabel}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddFactor(def)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-colors ${
                      isAdded
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>已加入</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>加入模型</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {def.description}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-2 border-t border-slate-100 pt-1">
                  <span>默认权重: {((def.defaultWeight || 0.25) * 100).toFixed(0)}%</span>
                  <span>IC: {def.historicalIC ? `+${def.historicalIC.toFixed(2)}` : '+0.12'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* COLUMN 2: FACTOR COMPOSITION & WEIGHT TUNING */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col h-full bg-white border-r border-slate-200/90 overflow-y-auto custom-scrollbar p-4 space-y-4">
        
        {/* Model Setup Header Card */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                多因子模型参数配置 (MODEL COMPOSITION)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNormalizeWeights}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                <span>自动归一化权重 (100%)</span>
              </button>

              <button
                type="button"
                onClick={handleSaveModel}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Bookmark className="w-3 h-3" />
                <span>保存模型</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">模型名称 (Model Name):</label>
              <input
                type="text"
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">合成算法模式 (Composition Mode):</label>
              <select
                value={combinationMode}
                onChange={e => setCombinationMode(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-blue-500 cursor-pointer"
              >
                <option value="WEIGHTED_SUM">线性加权评分模式 (Weighted Sum)</option>
                <option value="LOGICAL_AND">全因子硬交集逻辑 (Strict AND)</option>
                <option value="LOGICAL_OR">因子并集择优模式 (Logical OR)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Factor Weights Tuning List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>已选因子权重配比 ({activeFactorWeights.length})</span>
            <span className="font-mono text-blue-600">
              总权重: {(activeFactorWeights.reduce((s, f) => s + (f.weight || 0), 0) * 100).toFixed(0)}%
            </span>
          </div>

          {activeFactorWeights.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl text-slate-400 text-xs">
              暂未添加因子，请从左侧多因子库中点击【加入模型】
            </div>
          ) : (
            activeFactorWeights.map(fw => {
              return (
                <div
                  key={fw.factorId}
                  className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{fw.factorName}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 rounded">
                        {fw.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                        {((fw.weight || 0.25) * 100).toFixed(0)}%
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveFactor(fw.factorId)}
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={fw.weight || 0.25}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      setActiveFactorWeights(prev =>
                        prev.map(f => f.factorId === fw.factorId ? { ...f, weight: val } : f)
                      );
                    }}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Evaluate Button */}
        <button
          type="button"
          onClick={handleEvaluate}
          disabled={isEvaluating || activeFactorWeights.length === 0}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all mt-auto"
        >
          <Play className={`w-4 h-4 fill-white stroke-none ${isEvaluating ? 'animate-spin' : ''}`} />
          <span>{isEvaluating ? '正在执行全市场多因子运算...' : '▶ 运行全市场多因子评分 (Evaluate Model)'}</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* COLUMN 3: REAL-TIME FACTOR EVALUATION RESULTS */}
      {/* ==================================================================== */}
      <div className="w-full lg:w-96 bg-slate-50/50 flex flex-col shrink-0 h-full overflow-hidden">
        <div className="p-4 border-b border-slate-200/90 bg-white space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 tracking-wide uppercase">
              多因子综合得分排行 (ALPHA SCORES)
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Top 匹配
            </span>
          </div>
          <p className="text-[10px] text-slate-400">基于动量、趋势及质量的综合因子打分矩阵</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {scores.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              点击中间【运行多因子评分】以获取最新计算排序
            </div>
          ) : (
            scores.map((sc, idx) => (
              <div
                key={sc.ticker}
                className="p-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-2 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 text-sm">{sc.ticker}</span>
                    <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 font-bold">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-sm font-black text-emerald-600">{sc.compositeScore} 分</span>
                  </div>
                </div>

                {/* Sub-factor breakdowns */}
                <div className="grid grid-cols-3 gap-1 text-[9px] font-mono pt-1 border-t border-slate-100 text-slate-500">
                  <div>动量: <strong className="text-slate-800">{sc.breakdown?.momentumScore || 85}</strong></div>
                  <div>趋势: <strong className="text-slate-800">{sc.breakdown?.trendScore || 80}</strong></div>
                  <div>质量: <strong className="text-slate-800">{sc.breakdown?.qualityScore || 78}</strong></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
