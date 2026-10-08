import React, { ReactNode } from 'react';

export interface M3ExtendedFABProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  badge?: string | number;
  className?: string;
  color?: 'primary' | 'rose' | 'indigo' | 'amber';
}

/**
 * Google Material Design 3 (M3) Extended FAB (浮动操作按钮)
 * 悬浮于移动端右下角 (避开固底 BottomNav)，提供 1 秒大拇指盲操入口:
 * - 48dp 标准高
 * - 高饱和 M3 Primary 容器与阴影
 * - 触觉反馈按压动画
 */
export const M3ExtendedFAB: React.FC<M3ExtendedFABProps> = ({
  icon,
  label,
  onClick,
  badge,
  className = '',
  color = 'primary'
}) => {
  const colorStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30',
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30',
    rose: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/30',
    amber: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/30'
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed z-30 bottom-20 right-4 h-12 px-4 rounded-2xl ${colorStyles} shadow-lg flex items-center gap-2 active:scale-95 transition-all duration-200 cursor-pointer select-none ring-1 ring-white/20 ${className}`}
      title={label}
      aria-label={label}
    >
      <span className="w-5 h-5 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="text-xs font-black tracking-tight">{label}</span>
      {badge !== undefined && badge !== null && (
        <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/25 text-white font-mono text-[10px] font-black">
          {badge}
        </span>
      )}
    </button>
  );
};
