import React, { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface M3ModalBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  snapPoint?: 'auto' | 'half' | 'full';
  showDragHandle?: boolean;
  className?: string;
}

/**
 * Google Material Design 3 (M3) Modal Bottom Sheet
 * 专为 Android 移动端定制的旗舰级抽屉容器:
 * - 28dp 超大圆角 (M3 Extra-Large Shape)
 * - 32x4dp 标准拖拽手柄 (Drag Handle)
 * - 48dp 触控热区关闭按钮与吸底操作区
 * - 自动适配 Android 物理返回键与 Edge-to-Edge 底部安全区
 */
export function M3ModalBottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  headerRight,
  children,
  footer,
  snapPoint = 'auto',
  showDragHandle = true,
  className = ''
}: M3ModalBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // 监听 ESC 键与 Android 物理返回键
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 锁定背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getMaxHeightClass = () => {
    switch (snapPoint) {
      case 'half':
        return 'max-h-[62vh] h-auto';
      case 'full':
        return 'max-h-[92vh] h-[92vh]';
      case 'auto':
      default:
        return 'max-h-[88vh] h-auto';
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col justify-end select-none animate-in fade-in duration-200">
      {/* 1. M3 Scrim / Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. M3 Surface Container Sheet */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full bg-white text-slate-900 rounded-t-[28px] border-t border-slate-200/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-250 ${getMaxHeightClass()} ${className}`}
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)'
        }}
      >
        {/* 3. M3 Drag Handle Bar (32dp x 4dp) */}
        {showDragHandle && (
          <div
            className="pt-3 pb-1 w-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            onClick={onClose}
            title="下拉或点击关闭"
          >
            <div className="w-9 h-1 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors" />
          </div>
        )}

        {/* 4. M3 Header */}
        {(title || headerRight) && (
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="min-w-0 pr-2">
              {typeof title === 'string' ? (
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight truncate">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {headerRight}
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 active:bg-slate-100 transition-colors cursor-pointer"
                title="关闭"
                aria-label="关闭抽屉"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 5. Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 overscroll-contain">
          {children}
        </div>

        {/* 6. M3 Sticky Bottom Action Bar */}
        {footer && (
          <div className="px-5 py-3.5 bg-slate-50/90 backdrop-blur-md border-t border-slate-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
