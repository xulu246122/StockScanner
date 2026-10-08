import React, { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetModalProps {
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
 * High-Density Mobile Bottom Sheet Modal for Android
 * Provides smooth drawer interaction, drag handle, safe area inset handling, and thumb ergonomics.
 */
export function BottomSheetModal({
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
}: BottomSheetModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on ESC or Android Hardware Back Button
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

  // Lock body scroll when sheet is open
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
        return 'max-h-[55vh] h-auto';
      case 'full':
        return 'max-h-[92vh] h-[92vh]';
      case 'auto':
      default:
        return 'max-h-[85vh] h-auto';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end select-none animate-in fade-in duration-200">
      {/* 1. Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Sheet Container */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full bg-[#181c27] text-slate-100 rounded-t-3xl border-t border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 ${getMaxHeightClass()} ${className}`}
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)'
        }}
      >
        {/* Drag Handle Bar */}
        {showDragHandle && (
          <div className="pt-3 pb-1 w-full flex items-center justify-center cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1.5 rounded-full bg-slate-600/70 hover:bg-slate-500 transition-colors" />
          </div>
        )}

        {/* Sheet Header */}
        {(title || subtitle || headerRight) && (
          <div className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              {title && (
                <div className="text-sm font-extrabold text-white tracking-tight truncate">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                  {subtitle}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title="关闭抽屉"
              >
                <X className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </div>
        )}

        {/* Sheet Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain text-xs space-y-3">
          {children}
        </div>

        {/* Optional Sticky Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-slate-800/90 bg-[#141721] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
