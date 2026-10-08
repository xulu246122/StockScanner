import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  Star,
  Bell,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { ScreenerResultItem } from '../../types.ts';
import { StockLogo } from '../common/StockLogo.tsx';
import { StockSectorBadge } from '../../utils/stockSectorMapper.tsx';

interface RadarResultCardV2Props {
  stock: ScreenerResultItem;
  isInWatchlist: boolean;
  onSelect: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  onOpenAlert: (ticker: string, name?: string, rsi?: number) => void;
}

export const RadarResultCardV2: React.FC<RadarResultCardV2Props> = ({
  stock,
  isInWatchlist,
  onSelect,
  onToggleWatchlist,
  onOpenAlert
}) => {
  const [expanded, setExpanded] = useState(false);

  const isUp = stock.changePercent >= 0;
  const score = stock.score ?? Math.round(stock.confluenceScore ?? 70);

  // Derive score color
  const getScoreBadgeClass = (s: number) => {
    if (s >= 85) return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20';
    if (s >= 70) return 'bg-blue-500/15 border-blue-500/40 text-blue-300';
    if (s >= 50) return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
    return 'bg-rose-500/15 border-rose-500/40 text-rose-300';
  };

  const formatDollar = (val?: number) => {
    if (!val) return 'N/A';
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(0)}M`;
    return `$${val.toLocaleString()}`;
  };

  const getSignalStateBadge = (state?: string) => {
    switch (state) {
      case 'TRIGGERED':
        return (
          <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>已触发战术买点</span>
          </span>
        );
      case 'NEAR_TRIGGER':
        return (
          <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold rounded-full flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>临界触发</span>
          </span>
        );
      case 'SETUP':
        return (
          <span className="px-2.5 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[11px] font-bold rounded-full flex items-center gap-1">
            <Layers className="w-3 h-3" />
            <span>形态构筑中</span>
          </span>
        );
      case 'NO_TRADE':
        return (
          <span className="px-2.5 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold rounded-full flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            <span>风控阻断 (NO TRADE)</span>
          </span>
        );
      case 'WATCHING':
      default:
        return (
          <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-[11px] font-medium rounded-full">
            监控池候选
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-md hover:shadow-xl group">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <StockLogo ticker={stock.ticker} name={stock.name} className="w-10 h-10 rounded-xl" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                onClick={() => onSelect(stock.ticker)}
                className="font-black text-base text-white hover:text-indigo-400 cursor-pointer transition-colors"
              >
                {stock.ticker}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                {stock.exchange}
              </span>
              <StockSectorBadge ticker={stock.ticker} sector={stock.sector} size="xs" />
              {stock.rank && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-indigo-950 text-indigo-400 rounded font-bold">
                  #{stock.rank}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 truncate max-w-[200px]" title={stock.name}>
              {stock.name}
            </div>
          </div>
        </div>

        {/* Price & Change */}
        <div className="text-right">
          <div className="text-base font-black text-white font-mono">
            ${stock.price.toFixed(2)}
          </div>
          <div
            className={`text-xs font-bold font-mono flex items-center justify-end gap-0.5 ${
              isUp ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>
              {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Institutional Multi-Factor Metric Matrix */}
      <div className="grid grid-cols-4 gap-2 mt-3.5 p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-center">
        <div>
          <div className="text-[10px] text-slate-500 font-medium">日均成交额</div>
          <div className="text-xs font-bold font-mono text-slate-200 mt-0.5">
            {formatDollar(stock.dollarVolume || stock.avgDollarVolume)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-medium">相对量比 RVOL</div>
          <div
            className={`text-xs font-bold font-mono mt-0.5 ${
              (stock.rvol || stock.relativeVolume || 1) >= 1.5 ? 'text-emerald-400' : 'text-slate-200'
            }`}
          >
            {(stock.rvol || stock.relativeVolume || 1).toFixed(1)}x
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-medium">日内 ATR%</div>
          <div className="text-xs font-bold font-mono text-slate-200 mt-0.5">
            {stock.atrPercent ? `${stock.atrPercent.toFixed(1)}%` : 'N/A'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-medium">RS Rank</div>
          <div
            className={`text-xs font-bold font-mono mt-0.5 ${
              (stock.rsRank || 50) >= 80 ? 'text-indigo-400 font-black' : 'text-slate-200'
            }`}
          >
            {stock.rsRank ?? 50}/99
          </div>
        </div>
      </div>

      {/* Signal Status & Score Bar */}
      <div className="flex items-center justify-between mt-3 pt-2">
        <div className="flex items-center gap-2">
          {getSignalStateBadge(stock.signalState)}
          {stock.sector && (
            <StockSectorBadge ticker={stock.ticker} sector={stock.sector} size="sm" />
          )}
        </div>

        <div className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-1 ${getScoreBadgeClass(score)}`}>
          <Sparkles className="w-3 h-3" />
          <span>量化分: {score}</span>
        </div>
      </div>

      {/* NO TRADE Risk Warning Banner (if flagged) */}
      {stock.noTrade && stock.noTradeReasons && stock.noTradeReasons.length > 0 && (
        <div className="mt-3 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-rose-200">机构风控拦截 (NO TRADE):</span>
            {stock.noTradeReasons.map((r, i) => (
              <p key={i} className="text-[11px] leading-tight text-rose-300/90">{r}</p>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Why Matched & Trade Setup */}
      {stock.whyMatched && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-400 hover:text-indigo-300 hover:bg-slate-850 rounded-lg transition-colors"
          >
            <span className="font-semibold flex items-center gap-1">
              <span>Why Matched 深度逻辑解析</span>
              {stock.whyMatched.riskRewardRatio && (
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-1.5 rounded">
                  R:R 1:{stock.whyMatched.riskRewardRatio}
                </span>
              )}
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="mt-2 p-3 bg-slate-950/70 border border-slate-800/90 rounded-xl text-xs space-y-2.5 animate-in fade-in">
              <p className="text-slate-300 leading-relaxed font-medium">
                {stock.whyMatched.summary}
              </p>

              {/* Strengths */}
              {stock.whyMatched.strengths && stock.whyMatched.strengths.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-emerald-400">核心优势 (Strengths):</span>
                  {stock.whyMatched.strengths.map((str, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cautions */}
              {stock.whyMatched.cautions && stock.whyMatched.cautions.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-amber-400">风控警示 (Cautions):</span>
                  {stock.whyMatched.cautions.map((cau, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{cau}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Strict 5% Stop & Target */}
              <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px] font-mono">
                <div>
                  <span className="text-slate-500">建议止损:</span>{' '}
                  <strong className="text-rose-400">${stock.stopLossPrice?.toFixed(2) || (stock.price * 0.95).toFixed(2)}</strong>
                  <span className="text-[9px] text-slate-500 ml-1">(&lt;=5%限制)</span>
                </div>
                <div>
                  <span className="text-slate-500">目标位:</span>{' '}
                  <strong className="text-emerald-400">${stock.targetPrice?.toFixed(2) || (stock.price * 1.1).toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleWatchlist(stock.ticker)}
            className={`p-1.5 rounded-lg border transition-all ${
              isInWatchlist
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={isInWatchlist ? '从自选股移除' : '加入自选股'}
          >
            <Star className={`w-3.5 h-3.5 ${isInWatchlist ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={() => onOpenAlert(stock.ticker, stock.name, stock.rsi)}
            className="p-1.5 rounded-lg border bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-indigo-300 transition-colors"
            title="设置预警"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => onSelect(stock.ticker)}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-indigo-950/40 transition-colors"
        >
          <span>查看详情</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
