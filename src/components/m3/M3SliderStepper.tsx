import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface M3SliderStepperProps {
  label: string;
  sublabel?: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  decimals?: number;
  unit?: string;
  badge?: string;
  accentColor?: 'blue' | 'indigo' | 'rose' | 'amber' | 'emerald';
}

/**
 * Google Material Design 3 (M3) Slider + Stepper 微调器
 * 专为量化参数设计:
 * - 左右 40dp 大拇指防误触步进按钮 ([-] / [+])
 * - 连续平滑可拖拽滑动条
 * - 等宽字体实时数值展示
 */
export const M3SliderStepper: React.FC<M3SliderStepperProps> = ({
  label,
  sublabel,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  decimals = 1,
  unit = '',
  badge,
  accentColor = 'blue'
}) => {
  const handleDecrement = () => {
    const next = Math.max(min, Number((value - step).toFixed(decimals)));
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, Number((value + step).toFixed(decimals)));
    onChange(next);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(parseFloat(e.target.value).toFixed(decimals));
    onChange(num);
  };

  // 轨道填充比例
  const progressPercent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const accentStyles = {
    blue: {
      text: 'text-blue-700',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      fill: 'bg-blue-600',
      thumbRing: 'accent-blue-600'
    },
    indigo: {
      text: 'text-indigo-700',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      fill: 'bg-indigo-600',
      thumbRing: 'accent-indigo-600'
    },
    rose: {
      text: 'text-rose-700',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      fill: 'bg-rose-600',
      thumbRing: 'accent-rose-600'
    },
    amber: {
      text: 'text-amber-800',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      fill: 'bg-amber-600',
      thumbRing: 'accent-amber-600'
    },
    emerald: {
      text: 'text-emerald-700',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      fill: 'bg-emerald-600',
      thumbRing: 'accent-emerald-600'
    }
  }[accentColor];

  return (
    <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 transition-all">
      {/* 1. Header: Label + Badges + Number Value */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-extrabold text-slate-800">{label}</span>
            {badge && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-bold ${accentStyles.badge}`}>
                {badge}
              </span>
            )}
          </div>
          {sublabel && (
            <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
              {sublabel}
            </p>
          )}
        </div>

        {/* 动态数字高亮 */}
        <div className="flex items-baseline shrink-0 font-mono font-black text-sm tracking-tight">
          <span className={accentStyles.text}>
            {value.toFixed(decimals)}
          </span>
          {unit && <span className="text-slate-500 text-xs ml-0.5">{unit}</span>}
        </div>
      </div>

      {/* 2. Interactive Stepper & Slider Track */}
      <div className="flex items-center gap-2.5 pt-0.5">
        {/* Minus Button (40dp 热区) */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-2xs shrink-0"
          title={`减少 ${step}`}
          aria-label={`减少 ${label}`}
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* M3 Custom Slider Track */}
        <div className="flex-1 relative flex items-center py-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            className={`w-full h-2 rounded-full bg-slate-200 cursor-pointer appearance-none ${accentStyles.thumbRing}`}
            style={{
              background: `linear-gradient(to right, var(--tw-color-${accentColor}-600, #2563eb) ${progressPercent}%, #e2e8f0 ${progressPercent}%)`
            }}
          />
        </div>

        {/* Plus Button (40dp 热区) */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-100 active:bg-slate-200 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-2xs shrink-0"
          title={`增加 ${step}`}
          aria-label={`增加 ${label}`}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* 3. Range Ticks Preview */}
      <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1 pt-0.5">
        <span>极小: {min}{unit}</span>
        <span>极大: {max}{unit}</span>
      </div>
    </div>
  );
};
