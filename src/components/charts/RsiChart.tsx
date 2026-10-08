import { useState, useMemo } from 'react';
import { PriceBar } from '../../types.ts';

interface RsiChartProps {
  bars: PriceBar[];
  period: number;
  height?: number;
}

export function RsiChart({ bars, period, height = 240 }: RsiChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter bars that have valid RSI values
  const validData = useMemo(() => {
    return bars.filter(b => b.rsi !== undefined && b.rsi !== null && !isNaN(b.rsi));
  }, [bars]);

  if (validData.length === 0) {
    return (
      <div className="w-full flex items-center justify-center bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-slate-500 text-xs font-mono">
        历史数据不足以计算 RSI({period})（需要至少 {period + 1} 个交易日数据）
      </div>
    );
  }

  const padding = { top: 20, right: 45, bottom: 25, left: 15 };
  const width = 800; // SVG coordinate width
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Y Scale: 0 to 100
  const getY = (rsi: number) => {
    const clamped = Math.max(0, Math.min(100, rsi));
    return padding.top + innerHeight - (clamped / 100) * innerHeight;
  };

  // X Scale
  const getX = (index: number) => {
    if (validData.length <= 1) return padding.left;
    return padding.left + (index / (validData.length - 1)) * innerWidth;
  };

  // Build SVG path
  const linePath = validData.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.rsi!);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }, '');

  // 30, 50, 70 line Y positions
  const y70 = getY(70);
  const y50 = getY(50);
  const y30 = getY(30);

  // Hovered item
  const activeItem = hoverIndex !== null && validData[hoverIndex] ? validData[hoverIndex] : validData[validData.length - 1];

  return (
    <div className="relative w-full bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">Wilder RSI ({period}) 历史走势</span>
          <span className="text-[11px] text-slate-400 font-mono">日线平滑</span>
        </div>

        {activeItem && (
          <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
            <span className="text-slate-400">{activeItem.date}</span>
            <span className={`font-bold ${
              activeItem.rsi! < 30 ? 'text-emerald-400' :
              activeItem.rsi! > 70 ? 'text-rose-400' : 'text-sky-400'
            }`}>
              RSI: {activeItem.rsi?.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            const relativeX = mouseX - padding.left;
            const fraction = Math.max(0, Math.min(1, relativeX / innerWidth));
            const idx = Math.round(fraction * (validData.length - 1));
            if (idx >= 0 && idx < validData.length) {
              setHoverIndex(idx);
            }
          }}
        >
          <defs>
            <linearGradient id="rsiOverboughtZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="rsiOversoldZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.18" />
            </linearGradient>
            <linearGradient id="rsiLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {/* Overbought Shaded Area (70 - 100) */}
          <rect
            x={padding.left}
            y={getY(100)}
            width={innerWidth}
            height={getY(70) - getY(100)}
            fill="url(#rsiOverboughtZone)"
          />

          {/* Oversold Shaded Area (0 - 30) */}
          <rect
            x={padding.left}
            y={getY(30)}
            width={innerWidth}
            height={getY(0) - getY(30)}
            fill="url(#rsiOversoldZone)"
          />

          {/* Reference Lines: 70, 50, 30 */}
          <line
            x1={padding.left}
            y1={y70}
            x2={padding.left + innerWidth}
            y2={y70}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeWidth="1.2"
            opacity="0.65"
          />
          <text
            x={padding.left + innerWidth + 6}
            y={y70 + 4}
            fill="#ef4444"
            fontSize="10"
            fontFamily="monospace"
            className="font-mono font-medium"
          >
            70 超买
          </text>

          <line
            x1={padding.left}
            y1={y50}
            x2={padding.left + innerWidth}
            y2={y50}
            stroke="#64748b"
            strokeDasharray="2 2"
            strokeWidth="1"
            opacity="0.4"
          />
          <text
            x={padding.left + innerWidth + 6}
            y={y50 + 4}
            fill="#64748b"
            fontSize="10"
            fontFamily="monospace"
            className="font-mono"
          >
            50
          </text>

          <line
            x1={padding.left}
            y1={y30}
            x2={padding.left + innerWidth}
            y2={y30}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth="1.2"
            opacity="0.65"
          />
          <text
            x={padding.left + innerWidth + 6}
            y={y30 + 4}
            fill="#10b981"
            fontSize="10"
            fontFamily="monospace"
            className="font-mono font-medium"
          >
            30 超卖
          </text>

          {/* RSI Curve */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#rsiLineGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Crosshair & Indicator */}
          {hoverIndex !== null && validData[hoverIndex] && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + innerHeight}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
                opacity="0.75"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(validData[hoverIndex].rsi!)}
                r="4.5"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Bottom Date Ticks */}
          {validData.length > 0 && (
            <>
              <text
                x={padding.left}
                y={height - 6}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {validData[0].date}
              </text>
              <text
                x={padding.left + innerWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {validData[Math.floor(validData.length / 2)].date}
              </text>
              <text
                x={padding.left + innerWidth}
                y={height - 6}
                textAnchor="end"
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {validData[validData.length - 1].date}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
