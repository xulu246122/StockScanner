import React, { useState, useEffect } from 'react';
import {
  Bell,
  Crosshair,
  TrendingDown,
  ExternalLink,
  X,
  History,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { AlertMetadata, notificationService } from '../../services/notificationService.ts';
import { M3ModalBottomSheet } from '../m3/M3ModalBottomSheet.tsx';

interface LiveAlertBannerProps {
  onLocateStock: (ticker: string, view?: string) => void;
  onSelectStock: (ticker: string) => void;
  currentActiveTab?: string;
}

/**
 * Google Material 3 灵动悬浮预警胶囊 (M3 Dynamic Alert Island / Capsule)
 * 作为 Google 顶级 UI 设计规范重构:
 * - 彻底终结笨重多行横幅占用 25% 屏幕的问题
 * - 单行高度压缩至 ~38px，极简灵动微晶磨砂玻璃浮岛
 * - 水平单行无折叠排版：脉冲呼吸灯 + 标的与现价 + 简明模型微标 + 【🎯 定位】微胶囊
 * - 点击历史或胶囊主体滑出 M3 原生预警历史抽屉，主屏零侵占
 */
export function LiveAlertBanner({
  onLocateStock,
  onSelectStock,
  currentActiveTab
}: LiveAlertBannerProps) {
  const [activeAlert, setActiveAlert] = useState<AlertMetadata | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<AlertMetadata[]>([]);
  const [isHistorySheetOpen, setIsHistorySheetOpen] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // 1. 同步初始告警
    const list = notificationService.getRecentAlerts();
    if (list.length > 0) {
      setRecentAlerts(list);
      setActiveAlert(list[0]);
    }

    // 2. 监听实时新预警
    const unsubscribe = notificationService.onAlertTriggered((newAlert) => {
      setActiveAlert(newAlert);
      setIsDismissed(false);
      setRecentAlerts(prev => [newAlert, ...prev.filter(a => a.ticker !== newAlert.ticker)].slice(0, 10));
    });

    // 3. 监听窗口全局事件
    const handleAlertEvent = (e: any) => {
      if (e.detail) {
        setActiveAlert(e.detail);
        setIsDismissed(false);
        setRecentAlerts(prev => [e.detail, ...prev.filter(a => a.ticker !== e.detail.ticker)].slice(0, 10));
      }
    };
    window.addEventListener('app:alert-triggered', handleAlertEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('app:alert-triggered', handleAlertEvent);
    };
  }, []);

  if (!activeAlert || isDismissed) {
    return null;
  }

  const timeDisplay = activeAlert.timestamp
    ? new Date(activeAlert.timestamp).toLocaleTimeString('zh-CN', { hour12: false })
    : '刚刚';

  const handleLocate = (alertToLocate: AlertMetadata) => {
    onLocateStock(alertToLocate.ticker, alertToLocate.view);
    setIsHistorySheetOpen(false);
  };

  // 简化的模型名称（适合单行微胶囊展示，避免折行）
  const getConciseModelName = (nameZh?: string) => {
    if (!nameZh) return '反弹预警';
    if (nameZh.includes('Connors')) return 'Connors极限';
    if (nameZh.includes('Wyckoff')) return 'Wyckoff衰竭';
    if (nameZh.includes('VWAP')) return 'VWAP偏离';
    if (nameZh.includes('布林')) return '布林刺透';
    if (nameZh.includes('暴跌')) return '暴跌反弹';
    return nameZh.slice(0, 6);
  };

  return (
    <>
      {/* 1. M3 灵动悬浮微胶囊 (高度严格限制在 38px 左右，零视口挤压) */}
      <div className="w-full px-2.5 pt-1.5 pb-1 shrink-0 z-30 select-none animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="max-w-5xl mx-auto bg-slate-900/95 backdrop-blur-md border border-rose-500/40 text-slate-100 rounded-full px-3 py-1 shadow-lg shadow-black/20 flex items-center justify-between gap-2 transition-all">
          
          {/* 左侧：微型呼吸灯 + 标的代码 + 现价涨跌 + 简明模型 */}
          <div
            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer overflow-hidden group"
            onClick={() => handleLocate(activeAlert)}
            title="点击快速定位到此股票卡片"
          >
            {/* 脉冲呼吸灯 */}
            <div className="relative shrink-0 flex items-center justify-center w-3 h-3">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute inset-0 m-auto opacity-75" />
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            </div>

            {/* 股票代码与价格标签 */}
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-black text-xs text-white tracking-tight shrink-0 group-hover:text-rose-300 transition-colors">
                {activeAlert.ticker}
              </span>

              {activeAlert.price !== undefined && (
                <span className="font-mono text-xs font-bold text-slate-200 shrink-0">
                  ${activeAlert.price.toFixed(2)}
                </span>
              )}

              {activeAlert.dropPercent !== undefined && (
                <span className="font-mono text-[11px] font-bold text-rose-400 shrink-0">
                  (-{Math.abs(activeAlert.dropPercent).toFixed(1)}%)
                </span>
              )}

              {activeAlert.changePercent !== undefined && activeAlert.dropPercent === undefined && (
                <span className={`font-mono text-[11px] font-bold shrink-0 ${activeAlert.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ({activeAlert.changePercent >= 0 ? '+' : ''}{activeAlert.changePercent.toFixed(1)}%)
                </span>
              )}

              {/* 极简模型标签 */}
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-950/70 text-rose-300 border border-rose-700/50 font-medium truncate max-w-[85px] hidden xs:inline shrink-0">
                {getConciseModelName(activeAlert.modelNameZh)}
              </span>

              <span className="font-mono text-[9px] text-slate-400 shrink-0 hidden md:inline">
                {timeDisplay}
              </span>
            </div>
          </div>

          {/* 右侧：紧凑型操作微胶囊 */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 🎯 一键定位微按钮 */}
            <button
              type="button"
              onClick={() => handleLocate(activeAlert)}
              className="px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-[11px] shadow-xs active:scale-95 flex items-center gap-1 cursor-pointer transition border border-rose-400/30"
              title="一键定位到卡片"
            >
              <Crosshair className="w-3 h-3 stroke-[2.5]" />
              <span>定位</span>
            </button>

            {/* 历史触发记录数量入口 */}
            {recentAlerts.length > 1 && (
              <button
                type="button"
                onClick={() => setIsHistorySheetOpen(true)}
                className="px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 font-bold text-[10px] border border-slate-700/90 flex items-center gap-1 cursor-pointer transition"
                title={`查看近期 ${recentAlerts.length} 条预警记录`}
              >
                <History className="w-3 h-3 text-amber-400" />
                <span className="font-mono">({recentAlerts.length})</span>
              </button>
            )}

            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 active:scale-90 transition cursor-pointer"
              title="收起预警胶囊"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* 2. M3 原生预警历史抽屉 (点击历史或展开时从底部滑出，完全不侵占主界面) */}
      <M3ModalBottomSheet
        isOpen={isHistorySheetOpen}
        onClose={() => setIsHistorySheetOpen(false)}
        snapPoint="half"
        title={
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                近期实时预警触发记录
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                共记录 {recentAlerts.length} 条做市商盘口衰竭与均值回归异动
              </p>
            </div>
          </div>
        }
      >
        <div className="space-y-2">
          {recentAlerts.map((a, i) => {
            const isCurrent = a.ticker === activeAlert.ticker;
            const tStr = a.timestamp ? new Date(a.timestamp).toLocaleTimeString('zh-CN', { hour12: false }) : '刚刚';

            return (
              <div
                key={`${a.ticker}-${a.timestamp || i}`}
                onClick={() => handleLocate(a)}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-98 ${
                  isCurrent
                    ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200 shadow-xs'
                    : 'bg-white border-slate-200/90 hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-slate-900 tracking-tight">
                      {a.ticker}
                    </span>
                    {a.modelNameZh && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                        {a.modelNameZh}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      {tStr}
                    </span>
                  </div>
                  {a.stockName && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {a.stockName}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    {a.price !== undefined && (
                      <span className="font-mono font-black text-sm text-slate-900 block">
                        ${a.price.toFixed(2)}
                      </span>
                    )}
                    {a.dropPercent !== undefined && (
                      <span className="font-mono font-bold text-xs text-rose-600 block">
                        -{Math.abs(a.dropPercent).toFixed(2)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsHistorySheetOpen(false);
                        onSelectStock(a.ticker);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition"
                      title="查看K线"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLocate(a);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      title="立即定位"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>定位</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </M3ModalBottomSheet>
    </>
  );
}
