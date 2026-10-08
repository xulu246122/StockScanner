import React, { useRef, useState, useEffect } from 'react';
import { Sliders, TrendingDown, TrendingUp, Zap, ChevronUp, ChevronDown } from 'lucide-react';

interface VerticalRsiSliderProps {
  value: number;
  onChange: (val: number) => void;
  liveRsi?: number;
  alertSubtype: 'OVERSOLD' | 'OVERBOUGHT' | 'TARGET';
  onSubtypeChange?: (type: 'OVERSOLD' | 'OVERBOUGHT' | 'TARGET') => void;
}

export function VerticalRsiSlider({
  value,
  onChange,
  liveRsi = 50,
  alertSubtype,
  onSubtypeChange
}: VerticalRsiSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Position from top: 100 is top (0%), 0 is bottom (100%)
  const topPercentage = Math.max(0, Math.min(100, 100 - value));
  const liveRsiTop = Math.max(0, Math.min(100, 100 - liveRsi));

  // Determine current status
  const isOversold = value <= 30;
  const isOverbought = value >= 70;
  const isExtremeOversold = value <= 20;
  const isExtremeOverbought = value >= 80;

  const updateFromPointer = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const fractionFromTop = relativeY / rect.height;
    const calculatedValue = Math.round((1 - fractionFromTop) * 100);
    const clamped = Math.max(1, Math.min(99, calculatedValue));
    onChange(clamped);

    // Auto-update subtype if crossing thresholds
    if (onSubtypeChange) {
      if (clamped <= 30 && alertSubtype !== 'OVERSOLD') {
        onSubtypeChange('OVERSOLD');
      } else if (clamped >= 70 && alertSubtype !== 'OVERBOUGHT') {
        onSubtypeChange('OVERBOUGHT');
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateFromPointer(e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Keyboard navigation for precision
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(99, value + 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, value - 1));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      onChange(Math.min(99, value + 5));
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      onChange(Math.max(1, value - 5));
    }
  };

  return (
    <div className="bg-slate-50/95 border border-slate-200/90 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 select-none">
      {/* Top Header: Title & Current Stock RSI Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
            RSI 阈值高精度竖向微调滑杆
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-slate-400">标的实时 RSI:</span>
          <span
            className={`font-black px-2 py-0.5 rounded-full border ${
              liveRsi <= 30
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : liveRsi >= 70
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            {liveRsi.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Main Interactive Body: Vertical Slider (Left) + High-Precision Readout & Steppers (Right) */}
      <div className="grid grid-cols-12 gap-3.5 items-stretch bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: High-Precision Custom Vertical Range Slider (Cols 1-5) */}
        {/* ========================================================================= */}
        <div className="col-span-5 flex items-center justify-between gap-1.5 py-1">
          {/* Scale Labels (0 to 100) */}
          <div className="flex flex-col justify-between h-56 text-[10px] font-mono font-bold text-slate-400 text-right pr-1 select-none">
            <span className="text-slate-400">100</span>
            <span className="text-rose-600 font-extrabold">80</span>
            <span className="text-rose-500 font-extrabold">70 OB</span>
            <span className="text-slate-400">50</span>
            <span className="text-emerald-500 font-extrabold">30 OS</span>
            <span className="text-emerald-600 font-extrabold">20</span>
            <span className="text-slate-400">0</span>
          </div>

          {/* Interactive Vertical Slider Track */}
          <div
            ref={trackRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`relative flex-1 h-56 rounded-2xl cursor-ns-resize overflow-visible touch-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow ${
              isDragging ? 'ring-2 ring-blue-500/50 shadow-md' : ''
            }`}
          >
            {/* Background Multi-Zone Color Track */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-inner border border-slate-200 flex flex-col">
              {/* Overbought Zone: Top 30% (70-100) */}
              <div className="h-[30%] bg-gradient-to-b from-rose-500 via-rose-400 to-rose-300 relative">
                <span className="absolute top-1 left-1.5 text-[8px] font-black text-white/90 uppercase tracking-tighter">
                  超买 (OB)
                </span>
              </div>
              {/* Neutral Zone: Middle 40% (30-70) */}
              <div className="h-[40%] bg-gradient-to-b from-slate-100 via-blue-50/60 to-slate-100 relative">
                <span className="absolute top-1/2 -translate-y-1/2 left-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                  中性
                </span>
              </div>
              {/* Oversold Zone: Bottom 30% (0-30) */}
              <div className="h-[30%] bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-500 relative">
                <span className="absolute bottom-1 left-1.5 text-[8px] font-black text-white/90 uppercase tracking-tighter">
                  超卖 (OS)
                </span>
              </div>
            </div>

            {/* Threshold Reference Dashed Horizontal Lines on Track */}
            {/* 70 Level */}
            <div className="absolute top-[30%] left-0 right-0 h-0.5 border-t border-dashed border-rose-700/60 pointer-events-none z-10" />
            {/* 50 Level */}
            <div className="absolute top-[50%] left-0 right-0 h-0.5 border-t border-dashed border-slate-300 pointer-events-none z-10" />
            {/* 30 Level */}
            <div className="absolute top-[70%] left-0 right-0 h-0.5 border-t border-dashed border-emerald-700/60 pointer-events-none z-10" />

            {/* Live Stock RSI Real-Time Line Marker */}
            {liveRsi >= 0 && liveRsi <= 100 && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none flex items-center -translate-y-1/2 transition-all duration-300"
                style={{ top: `${liveRsiTop}%` }}
              >
                <div className="w-full h-0.5 bg-slate-900 shadow-xs" />
                <div className="absolute -left-1 w-2 h-2 rounded-full bg-slate-900 border border-white" />
              </div>
            )}

            {/* High-Precision Vertical Knob (Thumb) with Visual Value Pill */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none transition-all duration-75"
              style={{ top: `${topPercentage}%` }}
            >
              {/* Outer Glowing Thumb Knob */}
              <div
                className={`w-9 h-7 rounded-xl flex items-center justify-center shadow-lg border-2 border-white transition-all transform ${
                  isDragging ? 'scale-110 shadow-xl' : 'hover:scale-105'
                } ${
                  isOversold
                    ? 'bg-emerald-600 ring-4 ring-emerald-500/30'
                    : isOverbought
                    ? 'bg-rose-600 ring-4 ring-rose-500/30'
                    : 'bg-blue-600 ring-4 ring-blue-500/30'
                }`}
              >
                {/* Knob Grip Ribs */}
                <div className="flex flex-col gap-0.5 items-center">
                  <div className="w-3.5 h-0.5 bg-white/80 rounded-full" />
                  <div className="w-3.5 h-0.5 bg-white/80 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Precision Status Readout, Steppers & Preset Grid (Cols 6-12) */}
        {/* ========================================================================= */}
        <div className="col-span-7 flex flex-col justify-between pl-1">
          {/* Main Large Threshold Card */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              当前设定预警阈值
            </span>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black font-mono text-slate-950 tracking-tight">
                RSI {value <= 50 ? '≤' : '≥'} {value}
              </span>
            </div>

            {/* Visual Dynamic Status Badge */}
            <div className="mt-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs ${
                  isExtremeOversold
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : isOversold
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : isExtremeOverbought
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : isOverbought
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                {isOversold ? (
                  <TrendingDown className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                ) : isOverbought ? (
                  <TrendingUp className="w-3 h-3 text-rose-600 stroke-[2.5]" />
                ) : (
                  <Zap className="w-3 h-3 text-blue-600 stroke-[2.5]" />
                )}
                <span>
                  {isExtremeOversold
                    ? '极度超卖极值区 (≤20)'
                    : isOversold
                    ? '经典超卖买入区 (≤30)'
                    : isExtremeOverbought
                    ? '极度超买极值区 (≥80)'
                    : isOverbought
                    ? '经典超买止盈区 (≥70)'
                    : '中性自定义中轴'}
                </span>
              </span>
            </div>

            {/* Real-time Distance Insight */}
            <p className="text-[11px] text-slate-500 mt-2 font-mono leading-tight">
              {Math.abs(liveRsi - value) < 0.2 ? (
                <span className="text-amber-600 font-bold">⚡ 标的现已精准触及预警阈值！</span>
              ) : (
                <>
                  距当前实时 RSI 相差{' '}
                  <span className="font-bold text-slate-800">
                    {Math.abs(liveRsi - value).toFixed(1)} 点
                  </span>
                  {liveRsi < value ? '（现已在超卖线下方）' : '（尚未触发）'}
                </>
              )}
            </p>
          </div>

          {/* Stepper Buttons (-1, +1, -5, +5) */}
          <div className="pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              微调步进 (Step ±)
            </span>
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => onChange(Math.max(1, value - 5))}
                className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                title="降低 5"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => onChange(Math.max(1, value - 1))}
                className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                title="降低 1"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => onChange(Math.min(99, value + 1))}
                className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                title="增加 1"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => onChange(Math.min(99, value + 5))}
                className="py-1 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                title="增加 5"
              >
                +5
              </button>
            </div>
          </div>

          {/* Preset Buttons Grid */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              经典梯度直选 (Presets)
            </span>
            <div className="grid grid-cols-5 gap-1">
              {[20, 30, 50, 70, 80].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange(preset)}
                  className={`py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                    value === preset
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Tip for Vertical Slider */}
      <div className="text-[10px] text-slate-400 text-center font-mono flex items-center justify-center gap-1">
        <span>💡 支持在滑块区域上下滑动、点击刻度或使用方向键微调</span>
      </div>
    </div>
  );
}
