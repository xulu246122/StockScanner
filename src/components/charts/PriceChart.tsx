import { useState, useMemo } from 'react';
import { PriceBar } from '../../types.ts';

interface PriceChartProps {
  bars: PriceBar[];
  height?: number;
}

export function PriceChart({ bars, height = 220 }: PriceChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const padding = { top: 20, right: 55, bottom: 25, left: 15 };
  const width = 800;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const { minPrice, maxPrice, isPositiveTrend } = useMemo(() => {
    if (!bars || bars.length === 0) return { minPrice: 0, maxPrice: 100, isPositiveTrend: true };
    const prices = bars.map(b => b.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.1 || 1;
    const isPos = bars[bars.length - 1].close >= bars[0].close;
    return {
      minPrice: Math.max(0, min - pad),
      maxPrice: max + pad,
      isPositiveTrend: isPos
    };
  }, [bars]);

  if (!bars || bars.length === 0) {
    return (
      <div className="w-full flex items-center justify-center bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-slate-500 text-xs font-mono">
        暂无价格走势数据
      </div>
    );
  }

  const getY = (price: number) => {
    const range = maxPrice - minPrice || 1;
    return padding.top + innerHeight - ((price - minPrice) / range) * innerHeight;
  };

  const getX = (index: number) => {
    if (bars.length <= 1) return padding.left;
    return padding.left + (index / (bars.length - 1)) * innerWidth;
  };

  const linePath = bars.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.close);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }, '');

  const areaPath = `${linePath} L ${getX(bars.length - 1)} ${padding.top + innerHeight} L ${getX(0)} ${padding.top + innerHeight} Z`;

  const activeBar = hoverIndex !== null && bars[hoverIndex] ? bars[hoverIndex] : bars[bars.length - 1];

  const strokeColor = isPositiveTrend ? '#10b981' : '#f43f5e';
  const gradientId = isPositiveTrend ? 'pricePositiveGradient' : 'priceNegativeGradient';

  return (
    <div className="relative w-full bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">股价走势 (OHLC/Close)</span>
          <span className="text-[11px] text-slate-400 font-mono">日线</span>
        </div>

        {activeBar && (
          <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
            <span className="text-slate-400">{activeBar.date}</span>
            <span className="font-bold text-slate-100">${activeBar.close.toFixed(2)}</span>
            <span className="text-slate-400 text-[11px]">量: {(activeBar.volume / 1e6).toFixed(1)}M</span>
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
            const idx = Math.round(fraction * (bars.length - 1));
            if (idx >= 0 && idx < bars.length) {
              setHoverIndex(idx);
            }
          }}
        >
          <defs>
            <linearGradient id="pricePositiveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="priceNegativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left + innerWidth}
            y2={padding.top}
            stroke="#334155"
            strokeDasharray="2 2"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <text
            x={padding.left + innerWidth + 6}
            y={padding.top + 4}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            ${maxPrice.toFixed(1)}
          </text>

          <line
            x1={padding.left}
            y1={padding.top + innerHeight / 2}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight / 2}
            stroke="#334155"
            strokeDasharray="2 2"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <text
            x={padding.left + innerWidth + 6}
            y={padding.top + innerHeight / 2 + 4}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            ${((maxPrice + minPrice) / 2).toFixed(1)}
          </text>

          <line
            x1={padding.left}
            y1={padding.top + innerHeight}
            x2={padding.left + innerWidth}
            y2={padding.top + innerHeight}
            stroke="#334155"
            strokeDasharray="2 2"
            strokeWidth="0.8"
            opacity="0.5"
          />
          <text
            x={padding.left + innerWidth + 6}
            y={padding.top + innerHeight + 4}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            ${minPrice.toFixed(1)}
          </text>

          {/* Area under curve */}
          <path d={areaPath} fill={`url(#${gradientId})`} />

          {/* Main Price Line */}
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Crosshair */}
          {hoverIndex !== null && bars[hoverIndex] && (
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
                cy={getY(bars[hoverIndex].close)}
                r="4.5"
                fill={strokeColor}
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Dates */}
          <text
            x={padding.left}
            y={height - 6}
            fill="#64748b"
            fontSize="10"
            fontFamily="monospace"
          >
            {bars[0].date}
          </text>
          <text
            x={padding.left + innerWidth / 2}
            y={height - 6}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontFamily="monospace"
          >
            {bars[Math.floor(bars.length / 2)].date}
          </text>
          <text
            x={padding.left + innerWidth}
            y={height - 6}
            textAnchor="end"
            fill="#64748b"
            fontSize="10"
            fontFamily="monospace"
          >
            {bars[bars.length - 1].date}
          </text>
        </svg>
      </div>
    </div>
  );
}
