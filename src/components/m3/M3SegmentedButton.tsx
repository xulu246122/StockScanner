import React, { ReactNode } from 'react';

export interface M3SegmentedOption<T extends string = string> {
  id: T;
  label: string;
  sublabel?: string;
  icon?: ReactNode;
  badge?: string;
}

export interface M3SegmentedButtonProps<T extends string = string> {
  options: M3SegmentedOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Google Material Design 3 (M3) Segmented Buttons
 * 官方标准分段选择器:
 * - 药丸外框与圆角段落
 * - 触觉明确的激活背景
 * - 40dp 拇指友好触控高
 */
export function M3SegmentedButton<T extends string = string>({
  options,
  selectedId,
  onSelect,
  size = 'md',
  className = ''
}: M3SegmentedButtonProps<T>) {
  const heightClass = size === 'sm' ? 'min-h-[36px]' : 'min-h-[42px]';

  return (
    <div className={`p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 flex items-center gap-1 overflow-x-auto scrollbar-none touch-pan-x ${className}`}>
      {options.map((opt) => {
        const isSelected = opt.id === selectedId;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`flex-1 ${heightClass} px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
              isSelected
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/10 font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span className="truncate">{opt.label}</span>
            {opt.badge && (
              <span className={`text-[9px] font-mono px-1 py-0.2 rounded-md ${
                isSelected ? 'bg-indigo-50 text-indigo-700 font-black' : 'bg-slate-200 text-slate-600'
              }`}>
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
