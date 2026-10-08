import React, { useState, useEffect } from 'react';
import {
  Zap,
  SlidersHorizontal,
  RotateCcw,
  Save,
  CheckCircle2,
  TrendingDown,
  Shield,
  Activity,
  Layers
} from 'lucide-react';
import {
  ReboundModelType,
  ReboundLookbackWindow,
  ModelParamConfig,
  COMMERCIAL_DEFAULT_MODELS_CONFIG
} from '../../types.ts';
import { M3ModalBottomSheet } from './M3ModalBottomSheet.tsx';
import { M3SliderStepper } from './M3SliderStepper.tsx';
import { M3SegmentedButton } from './M3SegmentedButton.tsx';

export interface ReboundParameterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModelType: ReboundModelType;
  onSelectModelType: (type: ReboundModelType) => void;
  modelsConfig: Record<ReboundModelType, ModelParamConfig>;
  onSaveModelConfig: (modelType: ReboundModelType, config: ModelParamConfig) => Promise<boolean>;
  onResetToCommercialDefaults: (modelType: ReboundModelType) => void;
  onExecuteScan: (customParams?: any) => Promise<void>;
  candidatesCount: number;
  globalEnabled?: boolean;
  onToggleGlobalEnabled?: (enabled: boolean) => Promise<void> | void;
}

/**
 * Google Material Design 3 (M3) 暴跌反弹移动端专属参数配置抽屉
 * 彻底终结“参数黑盒化”，在 Android 手机上完整开放 4+1 模型参数自由微调与保存:
 * - 模型选择器 (Segmented Buttons)
 * - 跌幅门槛 / 止盈止损 / RSI冰点 (M3 Slider + Stepper)
 * - 盈亏比实时试算
 * - 一键恢复商业默认与保存并启动监控扫描
 */
export const ReboundParameterSheet: React.FC<ReboundParameterSheetProps> = ({
  isOpen,
  onClose,
  selectedModelType,
  onSelectModelType,
  modelsConfig,
  onSaveModelConfig,
  onResetToCommercialDefaults,
  onExecuteScan,
  candidatesCount,
  globalEnabled = true,
  onToggleGlobalEnabled
}) => {
  // 当前正在编辑的模型配置草稿
  const activeConfig = modelsConfig[selectedModelType] || COMMERCIAL_DEFAULT_MODELS_CONFIG[selectedModelType];
  const [draft, setDraft] = useState<ModelParamConfig>(JSON.parse(JSON.stringify(activeConfig)));
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // 当切换模型类型或外部配置更新时同步
  useEffect(() => {
    const current = modelsConfig[selectedModelType] || COMMERCIAL_DEFAULT_MODELS_CONFIG[selectedModelType];
    setDraft(JSON.parse(JSON.stringify(current)));
  }, [selectedModelType, modelsConfig]);

  // 模型分段选项
  const modelSegments: { id: ReboundModelType; label: string; icon: string }[] = [
    { id: 'CONNORS_RSI', label: 'Connors', icon: '⚡' },
    { id: 'WYCKOFF_CLIMAX', label: 'Wyckoff', icon: '🏛️' },
    { id: 'VWAP_ZSCORE', label: 'VWAP', icon: '📊' },
    { id: 'BOLLINGER_STOCH', label: '布林', icon: '🎯' },
    { id: 'CUSTOM', label: '自定义', icon: '⚙️' }
  ];

  // 计算当前风险收益比
  const riskRewardRatio = draft.stopLossPercent > 0
    ? parseFloat((draft.targetGainPercent / draft.stopLossPercent).toFixed(2))
    : 1.5;

  const handleSaveAndScan = async () => {
    setIsSaving(true);
    try {
      const configToSave = { ...draft, enabled: true };
      const success = await onSaveModelConfig(selectedModelType, configToSave);
      if (success) {
        if (onToggleGlobalEnabled) {
          await onToggleGlobalEnabled(true);
        }
        setSaveToast('配置已保存生效，监控与扫描已自动启动！');
        setTimeout(() => setSaveToast(null), 2500);
        // 执行扫描并关闭抽屉
        await onExecuteScan();
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    onResetToCommercialDefaults(selectedModelType);
    const defaults = COMMERCIAL_DEFAULT_MODELS_CONFIG[selectedModelType];
    setDraft(JSON.parse(JSON.stringify(defaults)));
    setSaveToast('已恢复商业标准默认参数');
    setTimeout(() => setSaveToast(null), 2500);
  };

  return (
    <M3ModalBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoint="full"
      title={
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              暴跌反弹模型参数配置
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Material 3 原生微调 · 机会池现有 {candidatesCount} 席
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="恢复 Google/华尔街推荐商业默认参数"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复默认</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndScan}
            disabled={isSaving}
            className="flex-1 h-11 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:from-blue-700 hover:to-rose-700 active:scale-98 text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
            title="保存当前模型参数、开启监控并立即触发全市场扫描"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-current stroke-none" />
            )}
            <span>保存并启动监控扫描</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 1. M3 Model Selection Segmented Button */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 flex items-center gap-1">
            <span>选择量化模型 (4+1 核心矩阵)</span>
          </label>
          <M3SegmentedButton
            options={modelSegments}
            selectedId={selectedModelType}
            onSelect={(id) => onSelectModelType(id as ReboundModelType)}
          />
        </div>

        {/* 2. Global Daemon & Model Daemon Switches */}
        <div className="space-y-2">
          {/* 全局巡检守护开关 */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${globalEnabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <div>
                <span className="text-xs font-black text-slate-900 block">
                  全局后台定时巡检监控
                </span>
                <span className="text-[10px] text-slate-500">
                  {globalEnabled ? '定时守护运行中，按设定周期扫描并预警' : '已全局暂停，点击右侧立即启动'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleGlobalEnabled?.(!globalEnabled)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer active:scale-95 ${
                globalEnabled
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border-rose-300 text-rose-700'
              }`}
            >
              {globalEnabled ? '● 运行中' : '○ 启动监控'}
            </button>
          </div>

          {/* 当前模型独立开关 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${draft.enabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <div>
                <span className="text-xs font-extrabold text-slate-900 block">
                  {modelSegments.find(m => m.id === selectedModelType)?.label} 模型独立监控
                </span>
                <span className="text-[10px] text-slate-500">
                  {draft.enabled ? '此模型已参与全局巡检与预警' : '已暂停此模型的信号触发'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDraft(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 ${
                draft.enabled
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-200 border-slate-300 text-slate-600'
              }`}
            >
              {draft.enabled ? '已开启' : '已停用'}
            </button>
          </div>
        </div>

        {/* 3. Lookback Window Timeframe */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800">K线回溯与统计周期</span>
            <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {draft.lookbackWindow} 窗口
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {(['15m', '30m', '1h', '2h', '4h', '1d'] as ReboundLookbackWindow[]).map(tf => {
              const isSelected = draft.lookbackWindow === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setDraft(prev => ({ ...prev, lookbackWindow: tf }))}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer text-center ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs font-black'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Core Quantitative Parameters (Slider + Stepper) */}
        <div className="space-y-3 pt-1">
          {/* 急跌门槛百分比 */}
          <M3SliderStepper
            label="区间急跌门槛"
            sublabel="股票自窗口峰值或日内开盘的最大急跌百分比下限"
            value={draft.minDropPercent}
            onChange={(val) => setDraft(prev => ({ ...prev, minDropPercent: val }))}
            min={1.0}
            max={10.0}
            step={0.1}
            decimals={1}
            unit="%"
            badge="硬性过滤"
            accentColor="rose"
          />

          {/* 止盈与止损联动微调 */}
          <div className="grid grid-cols-1 gap-3">
            <M3SliderStepper
              label="目标反弹止盈"
              sublabel="触碰此涨幅即刻右侧平仓止盈"
              value={draft.targetGainPercent}
              onChange={(val) => setDraft(prev => ({ ...prev, targetGainPercent: val }))}
              min={0.5}
              max={6.0}
              step={0.1}
              decimals={1}
              unit="%"
              badge="获利空间"
              accentColor="emerald"
            />

            <M3SliderStepper
              label="严格硬止损线"
              sublabel="跌破此深度即刻保本/止损离场防飞刀"
              value={draft.stopLossPercent}
              onChange={(val) => setDraft(prev => ({ ...prev, stopLossPercent: val }))}
              min={0.5}
              max={4.0}
              step={0.1}
              decimals={1}
              unit="%"
              badge="风控保护"
              accentColor="amber"
            />
          </div>

          {/* 实时盈亏比试算看板 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-800">当前测算风险报酬比:</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-sm font-black text-blue-700">1 : {riskRewardRatio.toFixed(2)}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                riskRewardRatio >= 1.5 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
              }`}>
                {riskRewardRatio >= 1.5 ? '机构级合规 (≥1:1.5)' : '偏激进 (建议微调)'}
              </span>
            </div>
          </div>

          {/* 模型专属衰竭判定参数 */}
          {selectedModelType === 'CONNORS_RSI' && (
            <M3SliderStepper
              label="Connors RSI(2) 极限恐慌阈值"
              sublabel="华尔街经典极度超跌均值回归冰点线 (通常 ≤ 10)"
              value={draft.exhaustionCriteria?.rsiMax ?? 10}
              onChange={(val) => setDraft(prev => ({
                ...prev,
                exhaustionCriteria: { ...prev.exhaustionCriteria, rsiMax: val }
              }))}
              min={3}
              max={25}
              step={1}
              decimals={0}
              badge="冰点阈值"
              accentColor="indigo"
            />
          )}

          {selectedModelType === 'WYCKOFF_CLIMAX' && (
            <M3SliderStepper
              label="长下影线 Pinbar 最低占比"
              sublabel="K线实体下方长针占全K幅度的比例 (确认主力低吸承接)"
              value={Number(((draft.exhaustionCriteria?.minPinbarRatio ?? 0.40) * 100).toFixed(0))}
              onChange={(val) => setDraft(prev => ({
                ...prev,
                exhaustionCriteria: { ...prev.exhaustionCriteria, minPinbarRatio: val / 100 }
              }))}
              min={20}
              max={70}
              step={5}
              decimals={0}
              unit="%"
              badge="下影承接"
              accentColor="indigo"
            />
          )}

          {selectedModelType === 'VWAP_ZSCORE' && (
            <M3SliderStepper
              label="日内 VWAP 负向极限偏离度"
              sublabel="股价与均量成交价的极端超卖拉锯负偏离空间"
              value={draft.exhaustionCriteria?.vwapDeviationPct ?? -1.8}
              onChange={(val) => setDraft(prev => ({
                ...prev,
                exhaustionCriteria: { ...prev.exhaustionCriteria, vwapDeviationPct: val }
              }))}
              min={-5.0}
              max={-1.0}
              step={0.1}
              decimals={1}
              unit="%"
              badge="均值引力"
              accentColor="indigo"
            />
          )}

          {selectedModelType === 'BOLLINGER_STOCH' && (
            <M3SliderStepper
              label="标准慢线 RSI(14) 超跌上限"
              sublabel="下轨刺透并收回时的标准摆动指标钝化阈值"
              value={draft.exhaustionCriteria?.rsiMax ?? 30}
              onChange={(val) => setDraft(prev => ({
                ...prev,
                exhaustionCriteria: { ...prev.exhaustionCriteria, rsiMax: val }
              }))}
              min={15}
              max={40}
              step={1}
              decimals={0}
              badge="超跌钝化"
              accentColor="indigo"
            />
          )}

          {/* 宏观高波动自适应防飞刀开关 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-xs font-extrabold text-slate-800 block">
                  VIX 恐慌防飞刀自适应状态机
                </span>
                <span className="text-[10px] text-slate-500">
                  市场极端暴跌时，自动加宽 35% 门槛避免接飞刀
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={draft.adaptiveRegimeEnabled !== false}
              onChange={e => setDraft(prev => ({ ...prev, adaptiveRegimeEnabled: e.target.checked }))}
              className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* 提示反馈 Toast */}
        {saveToast && (
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center animate-in fade-in flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>
    </M3ModalBottomSheet>
  );
};
