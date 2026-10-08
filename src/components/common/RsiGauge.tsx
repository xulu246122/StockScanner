import { RSIStatus } from '../../types.ts';

interface RsiGaugeProps {
  value: number;
  status: RSIStatus;
  statusLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  showBar?: boolean;
}

export function RsiGauge({ value, status, statusLabel, size = 'md', showBar = false }: RsiGaugeProps) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'OVERSOLD':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'WEAK':
        return 'bg-sky-500/15 text-sky-400 border border-sky-500/30';
      case 'NEUTRAL':
        return 'bg-slate-700/40 text-slate-300 border border-slate-700';
      case 'OVERBOUGHT':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border border-slate-700';
    }
  };

  const getBarColor = () => {
    if (value < 30) return 'bg-emerald-500';
    if (value < 50) return 'bg-sky-500';
    if (value <= 70) return 'bg-slate-400';
    return 'bg-rose-500';
  };

  const textSizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const numSizes = {
    sm: 'text-xs font-semibold',
    md: 'text-sm font-bold',
    lg: 'text-xl font-extrabold'
  };

  const defaultLabels = {
    OVERSOLD: '超卖',
    WEAK: '偏弱',
    NEUTRAL: '中性',
    OVERBOUGHT: '超买'
  };

  const displayLabel = statusLabel || defaultLabels[status];

  return (
    <div className="inline-flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className={`font-mono tabular-nums ${numSizes[size]} ${
          status === 'OVERSOLD' ? 'text-emerald-400' :
          status === 'WEAK' ? 'text-sky-400' :
          status === 'OVERBOUGHT' ? 'text-rose-400' : 'text-slate-200'
        }`}>
          {value.toFixed(1)}
        </span>
        <span className={`rounded-md font-medium tracking-wide ${textSizes[size]} ${getBadgeStyle()}`}>
          {displayLabel}
        </span>
      </div>

      {showBar && (
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex relative">
          {/* Reference marks at 30 and 70 */}
          <div className="absolute left-[30%] top-0 bottom-0 w-0.5 bg-slate-600 z-10"></div>
          <div className="absolute left-[70%] top-0 bottom-0 w-0.5 bg-slate-600 z-10"></div>
          <div
            className={`h-full transition-all duration-300 ${getBarColor()}`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        </div>
      )}
    </div>
  );
}
