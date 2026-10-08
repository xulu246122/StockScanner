import { useState, useEffect } from 'react';
import {
  Power,
  X,
  Minimize2,
  CheckCircle2,
  Circle,
  BellRing,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type CloseAction = 'MINIMIZE_TO_TRAY' | 'QUIT';

export function ExitConfirmModal({ isOpen, onClose }: ExitConfirmModalProps) {
  const [selectedAction, setSelectedAction] = useState<CloseAction>('MINIMIZE_TO_TRAY');
  const [rememberChoice, setRememberChoice] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      // Load any existing preference from localStorage
      const savedAction = localStorage.getItem('v65_close_action_preference') as CloseAction | null;
      if (savedAction === 'MINIMIZE_TO_TRAY' || savedAction === 'QUIT') {
        setSelectedAction(savedAction);
      } else {
        setSelectedAction('MINIMIZE_TO_TRAY');
      }
      setRememberChoice(localStorage.getItem('v65_remember_close_action') === 'true');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExecute = (actionToExecute: CloseAction = selectedAction) => {
    // 1. Save remember preference if user checked it
    if (rememberChoice) {
      localStorage.setItem('v65_remember_close_action', 'true');
      localStorage.setItem('v65_close_action_preference', actionToExecute);
    } else {
      localStorage.removeItem('v65_remember_close_action');
      localStorage.removeItem('v65_close_action_preference');
    }

    const electronAPI = (window as any).electronAPI;

    // 2. Perform the selected action
    if (actionToExecute === 'MINIMIZE_TO_TRAY') {
      onClose();
      if (electronAPI?.minimizeToTray) {
        electronAPI.minimizeToTray();
      } else if (electronAPI?.minimize) {
        electronAPI.minimize();
      }
      return;
    }

    if (actionToExecute === 'QUIT') {
      onClose();
      if (electronAPI?.quit) {
        electronAPI.quit();
      } else {
        try { window.close(); } catch {}
      }
      return;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#1b1f2b] border border-slate-700/90 rounded-2xl p-6 shadow-2xl max-w-md w-full mx-auto text-slate-100 animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close icon top-right (Cancel) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="取消"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-tight">
              关闭程序提示 (Close Window)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              请选择点击右上角关闭按钮时的执行逻辑：
            </p>
          </div>
        </div>

        {/* 2 Interactive Option Cards (Commercial Standard) */}
        <div className="space-y-3">
          
          {/* Card 1: 最小化到系统托盘 (推荐) */}
          <div
            onClick={() => setSelectedAction('MINIMIZE_TO_TRAY')}
            onDoubleClick={() => handleExecute('MINIMIZE_TO_TRAY')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
              selectedAction === 'MINIMIZE_TO_TRAY'
                ? 'bg-indigo-950/40 border-indigo-500/90 shadow-sm shadow-indigo-950/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {selectedAction === 'MINIMIZE_TO_TRAY' ? (
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>最小化到系统托盘 (保留进程)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0">
                  推荐 · 持续监控
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                窗口将缩至 Windows 桌面右下角常驻图标，后台持续进行美股高频行情扫描与声音/桌面即时预警推送。
              </p>
            </div>
          </div>

          {/* Card 2: 退出应用程序 */}
          <div
            onClick={() => setSelectedAction('QUIT')}
            onDoubleClick={() => handleExecute('QUIT')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
              selectedAction === 'QUIT'
                ? 'bg-rose-950/30 border-rose-500/80 shadow-sm shadow-rose-950/40'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {selectedAction === 'QUIT' ? (
                <CheckCircle2 className="w-4 h-4 text-rose-400" />
              ) : (
                <Circle className="w-4 h-4 text-slate-500" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Power className="w-3.5 h-3.5 text-rose-400" />
                  <span>完全退出程序 (关闭所有服务)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold shrink-0">
                  停止全部服务
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                彻底停止所有后台量化微服务、行情推送、即时预警与纸盘模拟撮合，安全退出应用程序进程。
              </p>
            </div>
          </div>

        </div>

        {/* Checkbox: 记住我的选择，下次不再提示 */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <span>记住我的选择，下次不再提示</span>
          </label>
          <span className="text-[10px] text-slate-500">可在系统设置随时更改</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer text-center"
          >
            取消
          </button>

          <button
            type="button"
            onClick={() => handleExecute(selectedAction)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              selectedAction === 'MINIMIZE_TO_TRAY'
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/40'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
            }`}
          >
            {selectedAction === 'MINIMIZE_TO_TRAY' ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>最小化至系统托盘</span>
              </>
            ) : (
              <>
                <Power className="w-3.5 h-3.5" />
                <span>确认退出程序</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
