import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PriceBar, Timeframe } from '../../types.ts';
import { calculateSMA, calculateWilderRSIArray } from '../../utils/trendAndDivergence.ts';
import {
  CandlestickChart,
  LineChart,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown
} from 'lucide-react';

export interface BinanceTradingChartProps {
  ticker: string;
  stockName?: string;
  exchange?: string;
  bars: PriceBar[];
  currentPrice: number;
  change: number;
  changePercent: number;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  isLoading?: boolean;
  defaultTheme?: 'light' | 'dark';
}

export const BinanceTradingChart: React.FC<BinanceTradingChartProps> = ({
  ticker,
  stockName,
  exchange = 'NASDAQ',
  bars,
  currentPrice,
  change,
  changePercent,
  timeframe,
  onTimeframeChange,
  isLoading = false,
  defaultTheme = 'light'
}) => {
  // Theme & display controls (Defaults to light mode as requested)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (defaultTheme === 'dark') return true;
    try {
      const saved = localStorage.getItem('stock_chart_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {
      // ignore
    }
    return false; // Default to Light theme
  });

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('stock_chart_theme', next ? 'dark' : 'light');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [mainIndicator, setMainIndicator] = useState<'MA' | 'BOLL' | 'OFF'>('MA');
  const [subIndicator, setSubIndicator] = useState<'DUAL' | 'VOL' | 'RSI'>('DUAL');
  const [isMoreTimeframesOpen, setIsMoreTimeframesOpen] = useState(false);

  // Crosshair state
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Dimensions state
  const [dimensions, setDimensions] = useState({ width: 900, height: 520 });

  // Update canvas dimensions on container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          const calculatedHeight = subIndicator === 'DUAL' ? 520 : 440;
          setDimensions({ width: Math.max(320, width), height: calculatedHeight });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [subIndicator]);

  // Data series calculations
  const closes = useMemo(() => bars.map((b) => b.close), [bars]);
  const volumes = useMemo(() => bars.map((b) => b.volume || 100000), [bars]);

  // Main Indicators: MA 7, 25, 99
  const ma7Values = useMemo(() => calculateSMA(closes, 7), [closes]);
  const ma25Values = useMemo(() => calculateSMA(closes, 25), [closes]);
  const ma99Values = useMemo(() => calculateSMA(closes, 99), [closes]);

  // Main Indicators: BOLL (20, 2)
  const bollValues = useMemo(() => {
    const period = 20;
    const mb = calculateSMA(closes, period);
    const up: (number | null)[] = [];
    const dn: (number | null)[] = [];
    for (let i = 0; i < closes.length; i++) {
      const m = mb[i];
      if (m === null || i < period - 1) {
        up.push(null);
        dn.push(null);
        continue;
      }
      const slice = closes.slice(i - period + 1, i + 1);
      const variance = slice.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / period;
      const sd = Math.sqrt(variance);
      up.push(m + 2 * sd);
      dn.push(m - 2 * sd);
    }
    return { mb, up, dn };
  }, [closes]);

  // Sub Indicators: Volume MA 5, 10
  const volMa5 = useMemo(() => calculateSMA(volumes, 5), [volumes]);
  const volMa10 = useMemo(() => calculateSMA(volumes, 10), [volumes]);

  // Sub Indicators: RSI 6, 14, 24
  const rsi6 = useMemo(() => calculateWilderRSIArray(bars, 6), [bars]);
  const rsi14 = useMemo(() => calculateWilderRSIArray(bars, 14), [bars]);
  const rsi24 = useMemo(() => calculateWilderRSIArray(bars, 24), [bars]);

  // Active bar for HUD readout
  const activeIndex = hoveredIndex !== null ? hoveredIndex : bars.length - 1;
  const activeBar = bars[activeIndex] || null;

  // 24H High & Low from bars
  const stats24h = useMemo(() => {
    if (!bars.length) return { high: currentPrice, low: currentPrice, vol: 0, turnover: 0 };
    const highs = bars.map((b) => b.high);
    const lows = bars.map((b) => b.low);
    const totalVol = bars.reduce((acc, b) => acc + (b.volume || 0), 0);
    const totalTurnover = bars.reduce((acc, b) => acc + (b.close * (b.volume || 0)), 0);
    return {
      high: Math.max(...highs),
      low: Math.min(...lows),
      vol: totalVol,
      turnover: totalTurnover
    };
  }, [bars, currentPrice]);

  // Helper formatter for large numbers
  const formatVol = (val: number | null | undefined) => {
    if (!val || isNaN(val)) return '--';
    if (val >= 1e9) return (val / 1e9).toFixed(2) + 'B';
    if (val >= 1e6) return (val / 1e6).toFixed(2) + 'M';
    if (val >= 1e3) return (val / 1e3).toFixed(1) + 'K';
    return val.toFixed(0);
  };

  // Binance Theme Colors
  const theme = useMemo(() => {
    if (isDark) {
      return {
        bg: '#181a20',
        panelBg: '#1e2329',
        border: '#2b313a',
        gridLine: '#262932',
        textPrimary: '#eaecef',
        textSecondary: '#848e9c',
        textMuted: '#5e6673',
        green: '#0ecb81',
        greenAlpha: 'rgba(14, 203, 129, 0.15)',
        red: '#f6465d',
        redAlpha: 'rgba(246, 70, 93, 0.15)',
        gold: '#f0b90b',
        purple: '#8f5ae8',
        blue: '#00c0f9',
        crosshair: '#848e9c',
        tagBg: '#2b313a',
        tagText: '#ffffff'
      };
    } else {
      return {
        bg: '#ffffff',
        panelBg: '#f8fafc',
        border: '#e2e8f0',
        gridLine: '#f1f5f9',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        textMuted: '#94a3b8',
        green: '#0ecb81',
        greenAlpha: 'rgba(14, 203, 129, 0.12)',
        red: '#f6465d',
        redAlpha: 'rgba(246, 70, 93, 0.12)',
        gold: '#d97706',
        purple: '#7c3aed',
        blue: '#0284c7',
        crosshair: '#64748b',
        tagBg: '#0f172a',
        tagText: '#ffffff'
      };
    }
  }, [isDark]);

  // High-DPI Canvas Rendering Routine
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bars.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = dimensions;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Layout configuration
    const rightAxisWidth = 64;
    const bottomTimeAxisHeight = 22;
    const plotWidth = width - rightAxisWidth;

    // Sub-chart height calculations
    let mainHeight = height - bottomTimeAxisHeight;
    let volHeight = 0;
    let rsiHeight = 0;
    let volTop = 0;
    let rsiTop = 0;

    if (subIndicator === 'DUAL') {
      mainHeight = Math.round(height * 0.58);
      volHeight = Math.round(height * 0.18);
      rsiHeight = height - bottomTimeAxisHeight - mainHeight - volHeight;
      volTop = mainHeight;
      rsiTop = mainHeight + volHeight;
    } else if (subIndicator === 'VOL') {
      mainHeight = Math.round(height * 0.72);
      volHeight = height - bottomTimeAxisHeight - mainHeight;
      volTop = mainHeight;
    } else if (subIndicator === 'RSI') {
      mainHeight = Math.round(height * 0.72);
      rsiHeight = height - bottomTimeAxisHeight - mainHeight;
      rsiTop = mainHeight;
    }

    // Clear background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    // 1. Compute price range
    let minPrice = Math.min(...bars.map((b) => b.low));
    let maxPrice = Math.max(...bars.map((b) => b.high));

    // Incorporate indicators into price bounds if active
    if (mainIndicator === 'MA') {
      ma7Values.forEach((v) => { if (v !== null) { minPrice = Math.min(minPrice, v); maxPrice = Math.max(maxPrice, v); } });
      ma25Values.forEach((v) => { if (v !== null) { minPrice = Math.min(minPrice, v); maxPrice = Math.max(maxPrice, v); } });
      ma99Values.forEach((v) => { if (v !== null) { minPrice = Math.min(minPrice, v); maxPrice = Math.max(maxPrice, v); } });
    } else if (mainIndicator === 'BOLL') {
      bollValues.up.forEach((v) => { if (v !== null) maxPrice = Math.max(maxPrice, v); });
      bollValues.dn.forEach((v) => { if (v !== null) minPrice = Math.min(minPrice, v); });
    }

    const pricePadding = (maxPrice - minPrice) * 0.08 || 1;
    minPrice = Math.max(0.01, minPrice - pricePadding);
    maxPrice = maxPrice + pricePadding;
    const priceRange = maxPrice - minPrice;

    const getPriceY = (val: number) => {
      const availableHeight = mainHeight - 20;
      return 10 + availableHeight - ((val - minPrice) / priceRange) * availableHeight;
    };

    const getX = (index: number) => {
      if (bars.length <= 1) return plotWidth / 2;
      return (index / (bars.length - 1)) * (plotWidth - 16) + 8;
    };

    // 2. Draw Horizontal Grid Lines & Price Axis Labels (Main Chart)
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const priceGridSteps = 5;
    for (let i = 0; i <= priceGridSteps; i++) {
      const priceVal = maxPrice - (priceRange / priceGridSteps) * i;
      const y = Math.round(getPriceY(priceVal)) + 0.5;

      ctx.strokeStyle = theme.gridLine;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right axis text
      ctx.fillStyle = theme.textMuted;
      ctx.fillText(priceVal.toFixed(2), plotWidth + 6, y);
    }

    // 3. Draw Vertical Time Grid Lines
    const timeStep = Math.max(1, Math.floor(bars.length / 5));
    for (let i = 0; i < bars.length; i += timeStep) {
      const x = Math.round(getX(i)) + 0.5;
      ctx.strokeStyle = theme.gridLine;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - bottomTimeAxisHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // Date label on bottom axis
      ctx.fillStyle = theme.textMuted;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const dateText = bars[i]?.date || '';
      ctx.fillText(dateText, x, height - bottomTimeAxisHeight + 5);
    }

    // Right-hand divider border
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(plotWidth) + 0.5, 0);
    ctx.lineTo(Math.round(plotWidth) + 0.5, height);
    ctx.stroke();

    // 4. Draw Main Chart: Candlesticks or Area Line
    const candleWidth = Math.max(2, Math.min(8, (plotWidth / Math.max(1, bars.length)) * 0.7));

    let highestBarIdx = 0;
    let lowestBarIdx = 0;

    bars.forEach((b, i) => {
      if (b.high > bars[highestBarIdx].high) highestBarIdx = i;
      if (b.low < bars[lowestBarIdx].low) lowestBarIdx = i;
    });

    if (chartType === 'candle') {
      bars.forEach((b, i) => {
        const x = Math.round(getX(i));
        const isUp = b.close >= b.open;
        const color = isUp ? theme.green : theme.red;

        const yHigh = Math.round(getPriceY(b.high));
        const yLow = Math.round(getPriceY(b.low));
        const yOpen = Math.round(getPriceY(b.open));
        const yClose = Math.round(getPriceY(b.close));

        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));

        // Draw Wick (1px hairline)
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, yHigh);
        ctx.lineTo(x + 0.5, yLow);
        ctx.stroke();

        // Draw Body
        ctx.fillStyle = color;
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      });
    } else {
      // Area Line Mode
      ctx.beginPath();
      bars.forEach((b, i) => {
        const x = getX(i);
        const y = getPriceY(b.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      // Gradient Fill
      const grad = ctx.createLinearGradient(0, 0, 0, mainHeight);
      const isOverallUp = (bars[bars.length - 1]?.close || 0) >= (bars[0]?.close || 0);
      grad.addColorStop(0, isOverallUp ? theme.greenAlpha : theme.redAlpha);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.save();
      ctx.lineTo(getX(bars.length - 1), mainHeight);
      ctx.lineTo(getX(0), mainHeight);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // Main line stroke
      ctx.strokeStyle = isOverallUp ? theme.green : theme.red;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 5. Draw Indicator Curves (MA / BOLL)
    const drawCurve = (values: (number | null)[], color: string, lineWidth: number = 1.2) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      let started = false;
      values.forEach((v, i) => {
        if (v !== null) {
          const x = getX(i);
          const y = getPriceY(v);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    };

    if (mainIndicator === 'MA') {
      drawCurve(ma99Values, theme.blue, 1.2);
      drawCurve(ma25Values, theme.purple, 1.4);
      drawCurve(ma7Values, theme.gold, 1.6);
    } else if (mainIndicator === 'BOLL') {
      drawCurve(bollValues.up, theme.blue, 1.2);
      drawCurve(bollValues.mb, theme.gold, 1.4);
      drawCurve(bollValues.dn, theme.purple, 1.2);
    }

    // 6. Binance-style Highest / Lowest Price Ticks
    if (bars.length > 0) {
      // High tick
      const hBar = bars[highestBarIdx];
      const hX = getX(highestBarIdx);
      const hY = getPriceY(hBar.high);
      const isLeft = highestBarIdx < bars.length / 2;

      ctx.fillStyle = theme.textSecondary;
      ctx.font = '10px monospace';
      ctx.textAlign = isLeft ? 'left' : 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`── ${hBar.high.toFixed(2)}`, isLeft ? hX + 4 : hX - 4, hY);

      // Low tick
      const lBar = bars[lowestBarIdx];
      const lX = getX(lowestBarIdx);
      const lY = getPriceY(lBar.low);
      const isLeftL = lowestBarIdx < bars.length / 2;

      ctx.textAlign = isLeftL ? 'left' : 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`── ${lBar.low.toFixed(2)}`, isLeftL ? lX + 4 : lX - 4, lY);
    }

    // 7. Live Real-time Price Line & Right Badge
    const liveY = Math.round(getPriceY(currentPrice)) + 0.5;
    ctx.strokeStyle = currentPrice >= (bars[0]?.close || currentPrice) ? theme.green : theme.red;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, liveY);
    ctx.lineTo(plotWidth, liveY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Right Badge
    const badgeHeight = 16;
    const badgeWidth = rightAxisWidth - 6;
    ctx.fillStyle = currentPrice >= (bars[0]?.close || currentPrice) ? theme.green : theme.red;
    ctx.fillRect(plotWidth + 2, liveY - badgeHeight / 2, badgeWidth, badgeHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentPrice.toFixed(2), plotWidth + 2 + badgeWidth / 2, liveY);

    // 8. Draw Volume Sub-chart if active
    if (volHeight > 0) {
      const maxVol = Math.max(...volumes, 1);
      const getVolY = (v: number) => {
        const h = volHeight - 20;
        return volTop + 14 + (h - (v / maxVol) * h);
      };

      // Separator line
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(volTop) + 0.5);
      ctx.lineTo(width, Math.round(volTop) + 0.5);
      ctx.stroke();

      // Volume Grid
      ctx.fillStyle = theme.textMuted;
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatVol(maxVol), plotWidth + 6, volTop + 18);

      // Volume Bars
      bars.forEach((b, i) => {
        const x = Math.round(getX(i));
        const isUp = b.close >= b.open;
        const color = isUp ? theme.green : theme.red;
        const y = Math.round(getVolY(b.volume || 0));
        const barH = Math.max(1, (volTop + volHeight - 2) - y);

        ctx.fillStyle = color;
        ctx.fillRect(x - candleWidth / 2, y, candleWidth, barH);
      });

      // Vol MA 5 & 10
      const drawVolMA = (maArr: (number | null)[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let started = false;
        maArr.forEach((v, i) => {
          if (v !== null) {
            const x = getX(i);
            const y = getVolY(v);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
      };

      drawVolMA(volMa5, theme.gold);
      drawVolMA(volMa10, theme.purple);
    }

    // 9. Draw RSI Sub-chart if active
    if (rsiHeight > 0) {
      const getRsiY = (val: number) => {
        const h = rsiHeight - 20;
        return rsiTop + 10 + (h - (val / 100) * h);
      };

      // Separator line
      ctx.strokeStyle = theme.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(rsiTop) + 0.5);
      ctx.lineTo(width, Math.round(rsiTop) + 0.5);
      ctx.stroke();

      // 70 & 30 Reference Lines
      [70, 30].forEach((level) => {
        const y = Math.round(getRsiY(level)) + 0.5;
        ctx.strokeStyle = theme.gridLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = theme.textMuted;
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(level), plotWidth + 6, y);
      });

      // Draw RSI Lines (6, 14, 24)
      const drawRsiLine = (rsiArr: (number | null)[], color: string, widthPx: number = 1.2) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = widthPx;
        ctx.beginPath();
        let started = false;
        rsiArr.forEach((v, i) => {
          if (v !== null) {
            const x = getX(i);
            const y = getRsiY(v);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
      };

      drawRsiLine(rsi24, theme.blue, 1.2);
      drawRsiLine(rsi14, theme.purple, 1.4);
      drawRsiLine(rsi6, theme.gold, 1.6);
    }

    // 10. Draw Interactive Crosshair if active
    if (crosshairPos && hoveredIndex !== null && bars[hoveredIndex]) {
      const hBar = bars[hoveredIndex];
      const hX = Math.round(getX(hoveredIndex)) + 0.5;
      const hY = Math.round(crosshairPos.y) + 0.5;

      // Vertical line
      ctx.strokeStyle = theme.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hX, 0);
      ctx.lineTo(hX, height - bottomTimeAxisHeight);
      ctx.stroke();

      // Horizontal line in main chart
      if (crosshairPos.y <= mainHeight) {
        ctx.beginPath();
        ctx.moveTo(0, hY);
        ctx.lineTo(plotWidth, hY);
        ctx.stroke();

        // Crosshair Price Badge on Right Axis
        const crosshairPrice = maxPrice - (crosshairPos.y - 10) / (mainHeight - 20) * priceRange;
        const bH = 16;
        const bW = rightAxisWidth - 6;
        ctx.fillStyle = theme.tagBg;
        ctx.fillRect(plotWidth + 2, hY - bH / 2, bW, bH);

        ctx.fillStyle = theme.tagText;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(crosshairPrice.toFixed(2), plotWidth + 2 + bW / 2, hY);
      }
      ctx.setLineDash([]);

      // Bottom Date Badge
      const dateText = hBar.date;
      const dateBadgeW = 84;
      const dateBadgeH = 16;
      ctx.fillStyle = theme.tagBg;
      ctx.fillRect(hX - dateBadgeW / 2, height - bottomTimeAxisHeight + 2, dateBadgeW, dateBadgeH);

      ctx.fillStyle = theme.tagText;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dateText, hX, height - bottomTimeAxisHeight + 2 + dateBadgeH / 2);
    }

    ctx.restore();
  }, [
    bars,
    currentPrice,
    dimensions,
    chartType,
    mainIndicator,
    subIndicator,
    theme,
    crosshairPos,
    hoveredIndex,
    ma7Values,
    ma25Values,
    ma99Values,
    bollValues,
    volumes,
    volMa5,
    volMa10,
    rsi6,
    rsi14,
    rsi24
  ]);

  // Redraw when any dependencies change
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Mouse & Touch interaction handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !bars.length) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const rightAxisWidth = 64;
    const plotWidth = dimensions.width - rightAxisWidth;

    if (clientX < 0 || clientX > plotWidth) {
      setCrosshairPos(null);
      setHoveredIndex(null);
      return;
    }

    const ratio = Math.max(0, Math.min(1, (clientX - 8) / (plotWidth - 16)));
    const idx = Math.round(ratio * (bars.length - 1));

    setCrosshairPos({ x: clientX, y: clientY });
    setHoveredIndex(Math.max(0, Math.min(bars.length - 1, idx)));
  };

  const handleMouseLeave = () => {
    setCrosshairPos(null);
    setHoveredIndex(null);
  };

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-2xl border transition-colors overflow-hidden flex flex-col font-sans select-none ${
        isDark ? 'bg-[#181a20] border-[#2b313a] text-[#eaecef]' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* 
        ========================================================================
        1. 币安商业版头部行情栏 (BINANCE PRO MARKET STATS TICKER HEADER)
        ========================================================================
      */}
      <div
        className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b ${
          isDark ? 'border-[#2b313a] bg-[#1e2329]/60' : 'border-slate-100 bg-slate-50/80'
        }`}
      >
        {/* Left: Ticker Symbol, Name, Exchange */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold tracking-tight font-mono">{ticker}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${isDark ? 'bg-[#2b313a] text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
              {exchange}
            </span>
          </div>
          {stockName && (
            <span className={`text-xs truncate max-w-[140px] sm:max-w-[200px] ${isDark ? 'text-[#848e9c]' : 'text-slate-500'}`}>
              {stockName}
            </span>
          )}
        </div>

        {/* Center/Right: 24H Price, Change, High, Low, Volume, Turnover */}
        <div className="flex items-center gap-5 text-xs font-mono tabular-nums overflow-x-auto">
          {/* Price & Change */}
          <div className="flex flex-col items-start sm:items-end">
            <span className={`text-base font-black ${changePercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              ${currentPrice.toFixed(2)}
            </span>
            <div className={`text-[11px] font-bold flex items-center gap-0.5 ${changePercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{changePercent >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)</span>
            </div>
          </div>

          {/* 24h High */}
          <div className="hidden md:flex flex-col">
            <span className={`text-[10px] ${isDark ? 'text-[#848e9c]' : 'text-slate-400'}`}>24h 最高</span>
            <span className="font-semibold">{stats24h.high.toFixed(2)}</span>
          </div>

          {/* 24h Low */}
          <div className="hidden md:flex flex-col">
            <span className={`text-[10px] ${isDark ? 'text-[#848e9c]' : 'text-slate-400'}`}>24h 最低</span>
            <span className="font-semibold">{stats24h.low.toFixed(2)}</span>
          </div>

          {/* 24h Volume */}
          <div className="hidden lg:flex flex-col">
            <span className={`text-[10px] ${isDark ? 'text-[#848e9c]' : 'text-slate-400'}`}>24h 成交量</span>
            <span className="font-semibold">{formatVol(stats24h.vol)}</span>
          </div>

          {/* 24h Turnover */}
          <div className="hidden xl:flex flex-col">
            <span className={`text-[10px] ${isDark ? 'text-[#848e9c]' : 'text-slate-400'}`}>24h 成交额</span>
            <span className="font-semibold">${formatVol(stats24h.turnover)}</span>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        2. 币安专业级控制工具条 (BINANCE PRO TIMEFRAME & INDICATOR TOOLBAR)
        ========================================================================
      */}
      <div
        className={`px-3 py-1.5 flex items-center justify-between border-b text-xs font-mono select-none ${
          isDark ? 'border-[#2b313a] bg-[#181a20]' : 'border-slate-100 bg-white'
        }`}
      >
        {/* Left: Timeframe pills & Chart Type Toggle */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Chart Type Icon Toggle */}
          <button
            type="button"
            onClick={() => setChartType(chartType === 'candle' ? 'line' : 'candle')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer mr-1 ${
              isDark ? 'hover:bg-[#2b313a] text-[#848e9c] hover:text-white' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title={chartType === 'candle' ? '切换为折线分时图' : '切换为蜡烛K线图'}
          >
            {chartType === 'candle' ? (
              <CandlestickChart className="w-4 h-4 text-[#0ecb81]" />
            ) : (
              <LineChart className="w-4 h-4 text-[#00c0f9]" />
            )}
          </button>

          {/* Direct Timeframe Tabs */}
          {(['10m', '30m', '1h', '2h', '4h', '1D', '1W'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                timeframe === tf
                  ? isDark
                    ? 'bg-[#2b313a] text-[#f0b90b] shadow-xs'
                    : 'bg-slate-100 text-blue-600 font-black'
                  : isDark
                  ? 'text-[#848e9c] hover:text-[#eaecef] hover:bg-[#2b313a]/50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tf}
            </button>
          ))}

          {/* More Timeframes Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMoreTimeframesOpen(!isMoreTimeframesOpen)}
              className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                timeframe === '1M'
                  ? isDark ? 'bg-[#2b313a] text-[#f0b90b]' : 'bg-slate-100 text-blue-600'
                  : isDark ? 'text-[#848e9c] hover:text-[#eaecef]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <span>{timeframe === '1M' ? '1M' : '更多'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isMoreTimeframesOpen && (
              <div
                className={`absolute top-full left-0 mt-1 rounded-lg shadow-xl p-1 z-30 flex flex-col gap-0.5 min-w-[72px] border ${
                  isDark ? 'bg-[#1e2329] border-[#2b313a]' : 'bg-white border-slate-200'
                }`}
              >
                {(['1M'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => {
                      onTimeframeChange(tf);
                      setIsMoreTimeframesOpen(false);
                    }}
                    className={`px-2 py-1 text-xs font-mono text-left font-bold rounded cursor-pointer ${
                      timeframe === tf
                        ? isDark ? 'bg-[#2b313a] text-[#f0b90b]' : 'bg-slate-100 text-blue-600'
                        : isDark ? 'text-[#848e9c] hover:bg-[#2b313a]' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Main Indicator, Sub-chart selector, and Dark/Light Theme */}
        <div className="flex items-center gap-2">
          {/* Main Indicator Pill Selector */}
          <div className={`flex items-center p-0.5 rounded-lg border ${isDark ? 'bg-[#1e2329] border-[#2b313a]' : 'bg-slate-100 border-slate-200'}`}>
            {(['MA', 'BOLL', 'OFF'] as const).map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => setMainIndicator(ind)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                  mainIndicator === ind
                    ? isDark ? 'bg-[#2b313a] text-[#f0b90b]' : 'bg-white text-slate-900 shadow-2xs'
                    : isDark ? 'text-[#848e9c] hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>

          {/* Sub-chart Indicator Tabs */}
          <div className={`hidden sm:flex items-center p-0.5 rounded-lg border ${isDark ? 'bg-[#1e2329] border-[#2b313a]' : 'bg-slate-100 border-slate-200'}`}>
            {(['DUAL', 'VOL', 'RSI'] as const).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSubIndicator(sub)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                  subIndicator === sub
                    ? isDark ? 'bg-[#2b313a] text-[#00c0f9]' : 'bg-white text-slate-900 shadow-2xs'
                    : isDark ? 'text-[#848e9c] hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {sub === 'DUAL' ? 'VOL+RSI' : sub}
              </button>
            ))}
          </div>

          {/* Dark / Light Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#1e2329] border-[#2b313a] text-[#f0b90b] hover:bg-[#2b313a]'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title={isDark ? '切换为明亮浅色模式' : '切换为专业深色模式'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 
        ========================================================================
        3. 币安实时 HUD 指标读数条 (IN-CHART REAL-TIME HUD READOUT STRIP)
        ========================================================================
      */}
      <div
        className={`px-3 py-1 text-[11px] font-mono flex flex-wrap items-center gap-x-4 gap-y-0.5 border-b select-none tabular-nums ${
          isDark ? 'bg-[#181a20] border-[#2b313a]/50 text-[#848e9c]' : 'bg-slate-50 border-slate-100 text-slate-600'
        }`}
      >
        {activeBar && (
          <div className="flex items-center gap-2">
            <span className={isDark ? 'text-slate-300 font-bold' : 'text-slate-800 font-bold'}>{activeBar.date}</span>
            <span>开: <strong className={isDark ? 'text-[#eaecef]' : 'text-slate-900'}>{activeBar.open.toFixed(2)}</strong></span>
            <span>高: <strong className={isDark ? 'text-[#eaecef]' : 'text-slate-900'}>{activeBar.high.toFixed(2)}</strong></span>
            <span>低: <strong className={isDark ? 'text-[#eaecef]' : 'text-slate-900'}>{activeBar.low.toFixed(2)}</strong></span>
            <span>收: <strong className={activeBar.close >= activeBar.open ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>{activeBar.close.toFixed(2)}</strong></span>
            <span>幅: <strong className={activeBar.close >= activeBar.open ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
              {(((activeBar.close - activeBar.open) / activeBar.open) * 100).toFixed(2)}%
            </strong></span>
          </div>
        )}

        {/* Dynamic MA / BOLL legend readouts */}
        {mainIndicator === 'MA' && (
          <div className="flex items-center gap-3">
            <span className="text-[#f0b90b] font-bold">MA(7): {ma7Values[activeIndex]?.toFixed(2) || '--'}</span>
            <span className="text-[#8f5ae8] font-bold">MA(25): {ma25Values[activeIndex]?.toFixed(2) || '--'}</span>
            <span className="text-[#00c0f9] font-bold">MA(99): {ma99Values[activeIndex]?.toFixed(2) || '--'}</span>
          </div>
        )}

        {mainIndicator === 'BOLL' && (
          <div className="flex items-center gap-3">
            <span className="text-[#00c0f9] font-bold">UP: {bollValues.up[activeIndex]?.toFixed(2) || '--'}</span>
            <span className="text-[#f0b90b] font-bold">MB: {bollValues.mb[activeIndex]?.toFixed(2) || '--'}</span>
            <span className="text-[#8f5ae8] font-bold">DN: {bollValues.dn[activeIndex]?.toFixed(2) || '--'}</span>
          </div>
        )}

        {/* Volume & RSI Legends */}
        {subIndicator !== 'RSI' && activeBar && (
          <div className="flex items-center gap-2">
            <span>量: <strong className={activeBar.close >= activeBar.open ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>{formatVol(activeBar.volume)}</strong></span>
            <span className="text-[#f0b90b]">MA(5): {formatVol(volMa5[activeIndex])}</span>
            <span className="text-[#8f5ae8]">MA(10): {formatVol(volMa10[activeIndex])}</span>
          </div>
        )}

        {subIndicator !== 'VOL' && (
          <div className="flex items-center gap-2">
            <span className="text-[#f0b90b]">RSI(6): {rsi6[activeIndex]?.toFixed(2) || '--'}</span>
            <span className="text-[#8f5ae8]">RSI(14): {rsi14[activeIndex]?.toFixed(2) || '--'}</span>
            <span className="text-[#00c0f9]">RSI(24): {rsi24[activeIndex]?.toFixed(2) || '--'}</span>
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        4. 高清 Retina Canvas 图表画布 (HIGH-DPI RETINA CANVAS CONTAINER)
        ========================================================================
      */}
      <div className="relative w-full cursor-crosshair overflow-hidden flex-1">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="block w-full"
        />

        {isLoading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e2329] border border-[#2b313a] text-xs font-mono text-white shadow-xl">
              <span className="w-2 h-2 rounded-full bg-[#0ecb81] animate-ping" />
              <span>加载高精 Bar 矩阵数据中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
