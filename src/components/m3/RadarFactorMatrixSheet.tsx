import React, { useState, useEffect } from 'react';
import {
  Radar,
  SlidersHorizontal,
  RotateCcw,
  Save,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Activity,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';
import { M3ModalBottomSheet } from './M3ModalBottomSheet.tsx';
import { M3SliderStepper } from './M3SliderStepper.tsx';
import { M3SegmentedButton } from './M3SegmentedButton.tsx';

export interface RadarFactorWeights {
  oversoldWeight: number;      // 超卖反转权重
  rsAlphaWeight: number;       // 相对强度 Alpha 权重
  maAlignmentWeight: number;   // 均线多头排列权重
  whaleInflowWeight: number;   // 主力资金异动权重
  patternBreakoutWeight: number; // 形态突破权重
  atrRiskWeight: number;       // ATR 盈亏比风控权重
  volumeSurgeWeight: number;   // 成交量放大权重
}

export const RADAR_PRESETS: {
  id: string;
  nameZh: string;
  descZh: string;
  icon: string;
  weights: RadarFactorWeights;
}[] = [
  {
    id: 'BALANCED_QUANT',
    nameZh: '均衡多因子量化',
    descZh: '全维度量化多因子共振，稳健兼顾趋势与胜率',
    icon: '⚖️',
    weights: {
      oversoldWeight: 70,
      rsAlphaWeight: 65,
      maAlignmentWeight: 80,
      whaleInflowWeight: 75,
      patternBreakoutWeight: 70,
      atrRiskWeight: 75,
      volumeSurgeWeight: 65
    }
  },
  {
    id: 'OVERSOLD_REBOUND',
    nameZh: '超跌极速反转',
    descZh: '极限冰点恐慌抛售，捕捉右侧反抽大阳线',
    icon: '⚡',
    weights: {
      oversoldWeight: 95,
      rsAlphaWeight: 40,
      maAlignmentWeight: 35,
      whaleInflowWeight: 80,
      patternBreakoutWeight: 50,
      atrRiskWeight: 85,
      volumeSurgeWeight: 70
    }
  },
  {
    id: 'MA_BULL_ALIGN',
    nameZh: '均线多头主升浪',
    descZh: 'MA9/20/50 发散多头排列，强势顺势领涨标的',
    icon: '🚀',
    weights: {
      oversoldWeight: 30,
      rsAlphaWeight: 85,
      maAlignmentWeight: 95,
      whaleInflowWeight: 75,
      patternBreakoutWeight: 80,
      atrRiskWeight: 70,
      volumeSurgeWeight: 70
    }
  },
  {
    id: 'WHALE_INFLOW',
    nameZh: '主力隐蔽增仓',
    descZh: '做市商大单吸筹与 Level 2 买卖盘失衡异常',
    icon: '🐋',
    weights: {
      oversoldWeight: 60,
      rsAlphaWeight: 65,
      maAlignmentWeight: 60,
      whaleInflowWeight: 95,
      patternBreakoutWeight: 70,
      atrRiskWeight: 80,
      volumeSurgeWeight: 90
    }
  },
  {
    id: 'PATTERN_BREAKOUT',
    nameZh: '经典形态突破',
    descZh: '双底W底、头肩底、平台整理箱体放量突破',
    icon: '📈',
    weights: {
      oversoldWeight: 45,
      rsAlphaWeight: 80,
      maAlignmentWeight: 75,
      whaleInflowWeight: 70,
      patternBreakoutWeight: 95,
      atrRiskWeight: 65,
      volumeSurgeWeight: 85
    }
  },
  {
    id: 'HIGH_RISK_REWARD',
    nameZh: '高盈亏比防守',
    descZh: '严格要求 ATR 波动止损窄且上方空间达 1:2 以上',
    icon: '🛡️',
    weights: {
      oversoldWeight: 65,
      rsAlphaWeight: 60,
      maAlignmentWeight: 65,
      whaleInflowWeight: 70,
      patternBreakoutWeight: 60,
      atrRiskWeight: 98,
      volumeSurgeWeight: 50
    }
  }
];

export interface RadarFactorMatrixSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activePresetId?: string;
  onSelectPreset?: (presetId: string) => void;
  timeframe: string;
  onTimeframeChange: (tf: any) => void;
  marketCapFilter: string;
  onMarketCapFilterChange: (cap: any) => void;
  customWeights?: RadarFactorWeights;
  onApplyAndScan: (presetId: string, weights: RadarFactorWeights) => Promise<void>;
  totalScanCount: number;
}

/**
 * Google Material Design 3 (M3) 多模态雷达因子权重与策略抽屉
 * 彻底解决移动端雷达面板缺乏高级配置与因子权重的缺陷:
 * - 8 大经典形态策略一键装载
 * - 7 维量化因子权重滑块微调
 * - K线周期与市值门槛
 * - 实时保存并刷新雷达
 */
export const RadarFactorMatrixSheet: React.FC<RadarFactorMatrixSheetProps> = ({
  isOpen,
  onClose,
  activePresetId = 'BALANCED_QUANT',
  onSelectPreset,
  timeframe,
  onTimeframeChange,
  marketCapFilter,
  onMarketCapFilterChange,
  customWeights,
  onApplyAndScan,
  totalScanCount
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(activePresetId);
  const initialWeights = customWeights || (RADAR_PRESETS.find(p => p.id === activePresetId)?.weights || RADAR_PRESETS[0].weights);
  const [weights, setWeights] = useState<RadarFactorWeights>(initialWeights);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPreset(activePresetId);
    const target = RADAR_PRESETS.find(p => p.id === activePresetId);
    if (target) {
      setWeights(target.weights);
    }
  }, [activePresetId]);

  const handleSelectPresetCard = (presetId: string) => {
    setSelectedPreset(presetId);
    const target = RADAR_PRESETS.find(p => p.id === presetId);
    if (target) {
      setWeights(target.weights);
    }
    if (onSelectPreset) {
      onSelectPreset(presetId);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApplyAndScan(selectedPreset, weights);
      setToastMessage('雷达多因子策略已生效！');
      setTimeout(() => setToastMessage(null), 2500);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetDefault = () => {
    const def = RADAR_PRESETS[0];
    setSelectedPreset(def.id);
    setWeights(def.weights);
    setToastMessage('已恢复官方推荐均衡量化权重');
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <M3ModalBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoint="full"
      title={
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Radar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              多模态雷达因子与策略配置
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Material 3 策略中心 · 覆盖全市场 {totalScanCount} 标的
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefault}
            className="h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="恢复 Google/华尔街推荐官方权重"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复默认</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="flex-1 h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20 disabled:opacity-50"
          >
            {isApplying ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>应用策略并扫描雷达</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 1. 8大经典买入形态预设 (横向卡片流) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>经典买入形态预设 (一键装载权重)</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-indigo-700">
              {RADAR_PRESETS.length} 策略
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {RADAR_PRESETS.map((p) => {
              const isSelected = selectedPreset === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPresetCard(p.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-1 select-none ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-400/40 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{p.icon}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <span className={`text-xs font-extrabold truncate ${
                    isSelected ? 'text-indigo-900' : 'text-slate-800'
                  }`}>
                    {p.nameZh}
                  </span>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                    {p.descZh}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. K线周期与市值规模选择器 */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3 space-y-2.5">
          {/* Timeframe */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>分析K线周期:</span>
              <span className="text-indigo-600 font-mono">{timeframe}</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(['30m', '1h', '2h', '4h', '1D', '1W', '1M']).map(tf => {
                const isSelected = timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => onTimeframeChange(tf)}
                    className={`py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer text-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-black shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    {tf}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Market Cap */}
          <div className="space-y-1 pt-1 border-t border-slate-200/60">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>公司市值规模门槛:</span>
              <span className="text-indigo-600 font-mono">{marketCapFilter}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: '1B', label: '> $10亿' },
                { id: '5B', label: '> $50亿' },
                { id: '10B', label: '> $100亿' },
                { id: 'ALL', label: '不限规模' }
              ].map(({ id, label }) => {
                const isSelected = marketCapFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onMarketCapFilterChange(id)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-black shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. 7 维量化因子权重滑块微调矩阵 (M3 Sliders) */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs font-black text-slate-800">
            <span>7 维度量化因子权重配置 (0 ~ 100)</span>
            <span className="text-[10px] text-slate-400 font-medium">支持单手自由微调</span>
          </div>

          {/* 超卖反转 */}
          <M3SliderStepper
            label="超卖反转因子 (Oversold Reversal)"
            sublabel="RSI/布林带超跌触底，探底企稳反抽概率"
            value={weights.oversoldWeight}
            onChange={(val) => setWeights(prev => ({ ...prev, oversoldWeight: val }))}
            min={0}
            max={100}
            step={5}
            decimals={0}
            unit="分"
            badge="超卖反弹"
            accentColor="rose"
          />

          {/* RS Alpha */}
          <M3SliderStepper
            label="相对强度 Alpha (Relative Strength)"
            sublabel="相对于标普500 (SPY) 跑赢指数的超额超强动能"
            value={weights.rsAlphaWeight}
            onChange={(val) => setWeights(prev => ({ ...prev, rsAlphaWeight: val }))}
            min={0}
            max={100}
            step={5}
            decimals={0}
            unit="分"
            badge="Alpha领涨"
            accentColor="indigo"
          />

          {/* 均线多头 */}
          <M3SliderStepper
            label="均线多头共振 (MA Alignment)"
            sublabel="MA9/20/50 均线有序顺排，趋势发散向好"
            value={weights.maAlignmentWeight}
            onChange={(val) => setWeights(prev => ({ ...prev, maAlignmentWeight: val }))}
            min={0}
            max={100}
            step={5}
            decimals={0}
            unit="分"
            badge="顺势而为"
            accentColor="blue"
          />

          {/* 主力异动 */}
          <M3SliderStepper
            label="主力增仓异动 (Whale / Institutional)"
            sublabel="做市商深度买卖盘失衡度 (OBI) 与大单异动"
            value={weights.whaleInflowWeight}
            onChange={(val) => setWeights(prev => ({ ...prev, whaleInflowWeight: val }))}
            min={0}
            max={100}
            step={5}
            decimals={0}
            unit="分"
            badge="主力护盘"
            accentColor="amber"
          />

          {/* 形态突破 */}
          <M3SliderStepper
            label="形态突破动能 (Pattern Breakout)"
            sublabel="底背离、双底W底、突破平台箱体动能确认"
            value={weights.patternBreakoutWeight}
            onChange={(val) => setWeights(prev => ({ ...prev, patternBreakoutWeight: val }))}
            min={0}
            max={100}
            step={5}
            decimals={0}
            unit="分"
            badge="形态识别"
            accentColor="indigo"
          />

          {/* ATR风控 */}
          <M3SliderStepper
            label="优质 ATR 波动风控 (Risk / Reward)"
            sublabel="ATR 止损安全边际，确保风险收益比达标"
            value={weights.atrRiskWeight}
            onChange={(val) => setWeights(prev => ({ ...prev, atrRiskWeight: val }))}
            min={0}
            max={100}
            step={5}
            decimals={0}
            unit="分"
            badge="风控保护"
            accentColor="emerald"
          />

          {/* 成交量放大 */}
          <M3SliderStepper
            label="量比脉冲放大 (Volume Surge)"
            sublabel="突破时成交量相对20日均量显著放大 (RVOL ≥ 1.5x)"
            value={weights.volumeSurgeWeight}
            onChange={(val) => setWeights(prev => ({ ...prev, volumeSurgeWeight: val }))}
            min={0}
            max={100}
            step={5}
            decimals={0}
            unit="分"
            badge="成交量确认"
            accentColor="blue"
          />
        </div>

        {/* 提示反馈 Toast */}
        {toastMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center animate-in fade-in flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </M3ModalBottomSheet>
  );
};
