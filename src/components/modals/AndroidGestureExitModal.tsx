import React, { useState, useEffect } from 'react';
import { ShieldCheck, Power, X, Radio, ArrowRight, BellRing } from 'lucide-react';
import { backgroundAlertService } from '../../services/backgroundAlertService.ts';

interface AndroidGestureExitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type AndroidExitMode = 'BACKGROUND' | 'EXIT';

export function AndroidGestureExitModal({ isOpen, onClose }: AndroidGestureExitModalProps) {
  const [selectedMode, setSelectedMode] = useState<AndroidExitMode>('BACKGROUND');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedMode('BACKGROUND');
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async (mode: AndroidExitMode = selectedMode) => {
    setIsProcessing(true);
    if (mode === 'BACKGROUND') {
      onClose();
      await backgroundAlertService.moveToBackground();
      return;
    }

    if (mode === 'EXIT') {
      onClose();
      await backgroundAlertService.exitApplication();
      return;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#131722] border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
          title="取消"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-3 border-b border-slate-800/80">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>手势滑屏返回选项</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                Android 守护
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              检测到手势滑屏操作，请选择运行状态：
            </p>
          </div>
        </div>

        {/* Interactive Option Cards */}
        <div className="space-y-3 mb-5">
          {/* Option 1: 后台运行 (推荐) */}
          <div
            onClick={() => setSelectedMode('BACKGROUND')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative overflow-hidden ${
              selectedMode === 'BACKGROUND'
                ? 'bg-blue-950/40 border-blue-500/90 shadow-md shadow-blue-950/50 ring-1 ring-blue-500/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedMode === 'BACKGROUND'
                    ? 'border-blue-400 bg-blue-600'
                    : 'border-slate-500 bg-transparent'
                }`}
              >
                {selectedMode === 'BACKGROUND' && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
                  <span>后台运行 (推荐)</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold shrink-0">
                  顶部状态栏守护
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                程序转入后台常驻，<strong className="text-blue-300">Android 顶部状态栏显示常驻守护图标</strong>。持续进行美股高频行情扫描与异动弹窗预警，点击状态栏随时无缝切回。
              </p>
            </div>
          </div>

          {/* Option 2: 退出程序 */}
          <div
            onClick={() => setSelectedMode('EXIT')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative overflow-hidden ${
              selectedMode === 'EXIT'
                ? 'bg-rose-950/30 border-rose-500/90 shadow-md shadow-rose-950/50 ring-1 ring-rose-500/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedMode === 'EXIT'
                    ? 'border-rose-400 bg-rose-600'
                    : 'border-slate-500 bg-transparent'
                }`}
              >
                {selectedMode === 'EXIT' && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Power className="w-4 h-4 text-rose-400" />
                  <span>退出程序</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold shrink-0">
                  彻底杀死进程
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                停止所有后台行情扫描任务，清理顶部状态栏常驻守护通知，彻底杀死 StockScanner 应用程序进程。
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 active:scale-[0.98] transition cursor-pointer text-center"
          >
            取消
          </button>

          <button
            type="button"
            onClick={() => handleConfirm(selectedMode)}
            disabled={isProcessing}
            className={`w-full py-3 px-4 rounded-xl text-xs font-black text-white shadow-lg active:scale-[0.98] transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              selectedMode === 'BACKGROUND'
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/50'
            }`}
          >
            {selectedMode === 'BACKGROUND' ? (
              <>
                <BellRing className="w-4 h-4" />
                <span>进入后台运行</span>
              </>
            ) : (
              <>
                <Power className="w-4 h-4" />
                <span>确认退出进程</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
