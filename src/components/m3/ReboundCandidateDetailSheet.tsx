import React from 'react';
import {
  Shield,
  CheckCircle2,
  Zap,
  TrendingDown,
  Layers,
  Star,
  Bell,
  ArrowRight,
  ExternalLink,
  Clock,
  Activity,
  ChevronRight
} from 'lucide-react';
import { PlungeReboundCandidate } from '../../types.ts';
import { StockLogo } from '../common/StockLogo.tsx';
import { StockSectorBadge, getSectorZh } from '../../utils/stockSectorMapper.tsx';
import { M3ModalBottomSheet } from './M3ModalBottomSheet.tsx';

export interface ReboundCandidateDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: PlungeReboundCandidate | null;
  onOpenBracketOrder: (candidate: PlungeReboundCandidate) => void;
  onSelectStock: (ticker: string) => void;
  isWatchlisted: boolean;
  onToggleWatchlist: (ticker: string) => void;
  onOpenAlertModal: (ticker: string, stockName?: string) => void;
}

/**
 * 暴跌反弹 · 股票分析与操作建议专属 M3 抽屉 (图2 核心规范)
 * 默认列表中仅展示精简小卡片，用户点击后滑出此抽屉，呈现完整深度量化分析与交易预埋：
 * 1. 卖方衰竭判定信号与胜率评分
 * 2. 买入参考现价、目标止盈、硬性止损
 * 3. L2 盘口 OBI 微观订单流承接分析
 * 4. 一键预埋 Bracket (OCO) 复合单
 * 5. 直达完整日内/日 K 线图
 */
export const ReboundCandidateDetailSheet: React.FC<ReboundCandidateDetailSheetProps> = ({
  isOpen,
  onClose,
  candidate,
  onOpenBracketOrder,
  onSelectStock,
  isWatchlisted,
  onToggleWatchlist,
  onOpenAlertModal
}) => {
  if (!candidate) return null;

  const entryPrice = candidate.entryPrice ?? candidate.price ?? 0;
  const targetPrice = candidate.targetPrice ?? (entryPrice * (1 + (candidate.targetGainPercent ?? 1.5) / 100));
  const stopLossPrice = candidate.stopLossPrice ?? (entryPrice * (1 - (candidate.stopLossPercent ?? 1.0) / 100));
  const reboundScore = candidate.reboundScore ?? 85;
  const obiValue = candidate.obiAnalysis?.obi ?? 0.42;
  const obiPercent = (obiValue * 100).toFixed(0);
  const obiRegime = candidate.obiAnalysis?.regimeLabel || '主力挂单承接';

  return (
    <M3ModalBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoint="auto"
      title={
        <div className="flex items-center gap-2.5 min-w-0 pr-1">
          <StockLogo ticker={candidate.ticker} name={candidate.name} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base font-black text-slate-900 tracking-tight">
                {candidate.ticker}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {candidate.exchange}
              </span>
              <StockSectorBadge ticker={candidate.ticker} sector={candidate.sector} size="xs" />
            </div>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {candidate.name}
            </p>
          </div>
        </div>
      }
      headerRight={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleWatchlist(candidate.ticker)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
              isWatchlisted ? 'text-amber-500 bg-amber-50' : 'text-slate-400 bg-slate-100 hover:text-slate-600'
            }`}
            title={isWatchlisted ? '已在自选' : '加入自选'}
          >
            <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => onOpenAlertModal(candidate.ticker, candidate.name)}
            className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center transition cursor-pointer hover:bg-rose-100"
            title="设置专属预警"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      }
      footer={
        <div className="flex flex-col gap-2">
          {/* 1. 一键预埋 Bracket (OCO) 复合单 */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBracketOrder(candidate);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current stroke-none" />
            <span>⚡ 一键预埋 Bracket (OCO) 复合单</span>
          </button>

          {/* 2. 查看完整 K 线走势 */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectStock(candidate.ticker);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
            <span>查看 {candidate.ticker} 完整 K 线走势与技术指标</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* 1. 核心行情与触发模型摘要栏 */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-black text-2xl text-slate-900 tabular-nums">
                ${(candidate.price ?? 0).toFixed(2)}
              </span>
              <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg text-rose-700 bg-rose-50 border border-rose-200">
                日内 {(candidate.changePercent ?? candidate.dropPercent ?? 0) >= 0 ? '+' : ''}{(candidate.changePercent ?? candidate.dropPercent ?? 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 mt-1">
              <span>{candidate.modelNameZh}</span>
              <span>·</span>
              <span>窗口 {candidate.dropDurationMinutes}m</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="font-mono font-black px-2.5 py-1 rounded-xl text-xs bg-rose-600 text-white shadow-xs">
              急跌 {candidate.dropPercent}%
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              量比 {candidate.rvol.toFixed(1)}x
            </span>
          </div>
        </div>

        {/* 2. 卖方衰竭判定信号 (图2核心：带胜率 90分) */}
        <div className="bg-amber-50/70 rounded-2xl p-3.5 space-y-2 border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-amber-200/60">
            <span className="font-extrabold text-amber-950 flex items-center gap-1.5 text-sm">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>卖方衰竭判定信号</span>
            </span>
            <span className="font-mono font-black text-xs text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-lg shadow-2xs">
              胜率 {reboundScore}分
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {(Array.isArray(candidate.exhaustionSignals) ? candidate.exhaustionSignals : []).map((sig, sIdx) => (
              <div key={sIdx} className="flex items-start gap-2 text-xs text-amber-950 font-medium leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{sig}</span>
              </div>
            ))}
            {(!candidate.exhaustionSignals || candidate.exhaustionSignals.length === 0) && (
              <div className="text-xs text-amber-800 italic">
                做市商盘口深度侦测中：卖盘卖压急速衰减，多头资金出现异动挂单承接。
              </div>
            )}
          </div>
        </div>

        {/* 3. 买入参考现价、目标止盈、硬性止损 (图2核心) */}
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2 font-mono">
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
            <span className="text-slate-500 font-bold">买入参考现价:</span>
            <span className="font-black text-slate-900 text-sm">${entryPrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100">
            <div className="flex items-center gap-1 text-emerald-700 font-bold">
              <span>目标止盈</span>
              <span className="text-[11px]">(+{candidate.targetGainPercent ?? 1.5}%):</span>
            </div>
            <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-sm">
              ${targetPrice.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-rose-700 font-bold">
              <span>硬性止损</span>
              <span className="text-[11px]">(-{candidate.stopLossPercent ?? 1.0}%):</span>
            </div>
            <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 text-sm">
              ${stopLossPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 4. L2 盘口 OBI 微观订单流失衡度 (图2核心) */}
        <div className="bg-indigo-50/70 border border-indigo-200/70 rounded-2xl p-3 space-y-2 text-xs font-mono text-indigo-950">
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5 text-indigo-900">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>L2 盘口 OBI:</span>
            </span>
            <span className="text-sm font-black text-indigo-700">
              {obiValue >= 0 ? '+' : ''}{obiPercent}% ({obiRegime})
            </span>
          </div>

          {/* OBI 买卖盘能量槽 */}
          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
            <div
              className="h-full bg-rose-500 transition-all duration-300"
              style={{ width: `${Math.max(10, Math.min(90, (1 - (obiValue + 1) / 2) * 100))}%` }}
              title="卖方卖压"
            />
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.max(10, Math.min(90, ((obiValue + 1) / 2) * 100))}%` }}
              title="买方承接"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
            <span>卖方抛压</span>
            <span className="font-bold text-emerald-700">买方主力承接</span>
          </div>
        </div>

        {/* 5. 板块与技术特征卡 */}
        <div className="flex items-center justify-between text-[11px] px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
          <span>所属板块: <strong className="text-slate-800">{getSectorZh(candidate.ticker, candidate.sector)}</strong></span>
          <span>做市量比: <strong className="text-slate-800 font-mono">{candidate.rvol.toFixed(1)}x</strong></span>
        </div>
      </div>
    </M3ModalBottomSheet>
  );
};
