import { ShieldAlert, Clock } from 'lucide-react';

export function DisclaimerBanner({ marketTime, isDelayed = true }: { marketTime?: string; isDelayed?: boolean }) {
  return (
    <aside aria-label="金融信息与免责声明" className="bg-slate-900/80 border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-400 text-center sm:text-left">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong className="font-medium text-slate-300">免责声明：</strong>
            本应用提供的市场数据与 Wilder RSI 技术指标仅供行情参考，不构成任何投资或买卖建议。
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-500 shrink-0 font-mono text-[11px] tabular-nums">
          {isDelayed && (
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse"></span>
              Delayed Data
            </span>
          )}
          {marketTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{marketTime}</span>
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
