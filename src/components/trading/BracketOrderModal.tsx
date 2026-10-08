import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/apiClient.ts';
import {
  BrokerOrder,
  SubmitOrderRequest,
  BrokerAccountSummary,
  PositionSizingMethod,
  PositionSizingResult,
  OrderBookImbalanceAnalysis
} from '../../types/trading.ts';
import { Level2DepthCard } from './Level2DepthCard.tsx';
import { notificationService } from '../../services/notificationService.ts';
import {
  X,
  Zap,
  TrendingUp,
  Shield,
  Layers,
  DollarSign,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Calculator,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BracketOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    ticker: string;
    name?: string;
    currentPrice: number;
    targetPrice?: number;
    stopLossPrice?: number;
    targetGainPercent?: number;
    stopLossPercent?: number;
    strategySource?: string;
    obiAnalysis?: OrderBookImbalanceAnalysis;
  } | null;
  onOrderSuccess?: (order: BrokerOrder) => void;
}

export const BracketOrderModal: React.FC<BracketOrderModalProps> = ({
  isOpen,
  onClose,
  data,
  onOrderSuccess
}) => {
  if (!isOpen || !data) return null;

  const [account, setAccount] = useState<BrokerAccountSummary | null>(null);
  const [entryPrice, setEntryPrice] = useState<number>(data.currentPrice);
  const [targetPrice, setTargetPrice] = useState<number>(
    data.targetPrice || Number((data.currentPrice * 1.018).toFixed(2))
  );
  const [stopLossPrice, setStopLossPrice] = useState<number>(
    data.stopLossPrice || Number((data.currentPrice * 0.99).toFixed(2))
  );
  const [trailingStopPercent, setTrailingStopPercent] = useState<number>(1.5);

  const [sizingMethod, setSizingMethod] = useState<PositionSizingMethod>('HALF_KELLY');
  const [shares, setShares] = useState<number>(100);
  const [sizingResult, setSizingResult] = useState<PositionSizingResult | null>(null);
  const [showL2, setShowL2] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load broker account on open
  useEffect(() => {
    let isMounted = true;
    async function loadAccount() {
      try {
        const res = await apiClient.getBrokerAccount();
        if (isMounted && res.success) {
          setAccount(res.account);
        }
      } catch (err) {
        console.error('Failed to load broker account:', err);
      }
    }
    loadAccount();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Recalculate position sizing when inputs change
  useEffect(() => {
    async function recalc() {
      if (!account) return;
      try {
        const res = await apiClient.calculatePositionSizing({
          method: sizingMethod,
          accountEquity: account.portfolioValue,
          entryPrice,
          stopLossPrice,
          targetPrice,
          winRate: 0.65,
          riskRewardRatio: (targetPrice - entryPrice) / Math.max(0.01, (entryPrice - stopLossPrice)),
          fixedRiskPercent: sizingMethod === 'FIXED_RISK' ? 1.0 : 1.0,
          customShares: shares
        });
        if (res.success) {
          setSizingResult(res.result);
          if (sizingMethod !== 'CUSTOM_SHARES') {
            setShares(res.result.recommendedShares);
          }
        }
      } catch (err) {
        console.error('Failed to calculate sizing:', err);
      }
    }
    recalc();
  }, [account, sizingMethod, entryPrice, stopLossPrice, targetPrice]);

  const targetGainPct = Number((((targetPrice - entryPrice) / entryPrice) * 100).toFixed(2));
  const stopLossPct = Number((((entryPrice - stopLossPrice) / entryPrice) * 100).toFixed(2));
  const riskReward = stopLossPct > 0 ? (targetGainPct / stopLossPct).toFixed(2) : '2.0';

  const totalNotional = Number((shares * entryPrice).toFixed(2));
  const totalRisk = Number((shares * Math.max(0, entryPrice - stopLossPrice)).toFixed(2));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const orderReq: SubmitOrderRequest = {
        symbol: data.ticker,
        side: 'BUY',
        qty: shares,
        orderType: 'LIMIT',
        orderClass: 'BRACKET',
        limitPrice: entryPrice,
        takeProfitPrice: targetPrice,
        stopLossPrice: stopLossPrice,
        trailingStopPercent,
        strategySource: data.strategySource || 'FLASH_REBOUND'
      };

      const res = await apiClient.submitBrokerOrder(orderReq);
      if (res.success) {
        setSuccessMsg(res.message);
        notificationService.showNotification(`⚡ [Bracket 复合单已提交] ${data.ticker}`, {
          body: `已挂单买入 ${shares} 股 @ $${entryPrice}，目标止盈 $${targetPrice} (+${targetGainPct}%)，止损 $${stopLossPrice} (-${stopLossPct}%)`
        });

        if (onOrderSuccess) {
          onOrderSuccess(res.order);
        }

        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || '下单执行失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  一键预埋复合 Bracket (OCO) 订单
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  {account?.mode === 'LIVE' ? '实盘执行' : '量化模拟沙盒'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                主入场限价单 + 阶梯保本目标止盈单 + 硬风控保底止损单，全自动原子化路由
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Target Stock Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-xl font-extrabold font-mono text-amber-400">
                  {data.ticker}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  {data.name || 'US Stock'}
                </span>
              </div>
              {data.obiAnalysis && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  OBI {(data.obiAnalysis.obi * 100 >= 0 ? '+' : '')}{(data.obiAnalysis.obi * 100).toFixed(0)}% 机构托盘
                </span>
              )}
            </div>
            <div className="text-right font-mono">
              <div className="text-xs text-slate-400">参考市价</div>
              <div className="text-lg font-bold text-white">${data.currentPrice.toFixed(2)}</div>
            </div>
          </div>

          {/* Account Buying Power Snapshot */}
          {account && (
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">账户可用现金</span>
                <span className="font-bold text-slate-800">${account.cash.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">日内购买力 (2x)</span>
                <span className="font-bold text-indigo-700">${account.buyingPower.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">资产总净值</span>
                <span className="font-bold text-slate-800">${account.portfolioValue.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* 3-Tier Price Setup Fields */}
          <div className="grid grid-cols-3 gap-3">
            {/* Limit Entry */}
            <div className="space-y-1.5 p-3 rounded-xl border border-blue-200 bg-blue-50/40">
              <label className="text-[11px] font-bold text-blue-900 block flex items-center justify-between">
                <span>1. 限价买入价</span>
                <span className="text-[10px] text-blue-600 font-normal">Entry</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-blue-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-mono font-bold bg-white border border-blue-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-hidden"
                />
              </div>
              <div className="text-[10px] text-blue-700 font-mono">基准市价</div>
            </div>

            {/* Take Profit */}
            <div className="space-y-1.5 p-3 rounded-xl border border-emerald-200 bg-emerald-50/40">
              <label className="text-[11px] font-bold text-emerald-900 block flex items-center justify-between">
                <span>2. 目标止盈价</span>
                <span className="text-[10px] text-emerald-600 font-bold">+{targetGainPct}%</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-emerald-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-hidden"
                />
              </div>
              <div className="text-[10px] text-emerald-700 font-mono flex items-center justify-between">
                <span>每股浮盈</span>
                <span className="font-bold">+${(targetPrice - entryPrice).toFixed(2)}</span>
              </div>
            </div>

            {/* Hard Stop Loss */}
            <div className="space-y-1.5 p-3 rounded-xl border border-rose-200 bg-rose-50/40">
              <label className="text-[11px] font-bold text-rose-900 block flex items-center justify-between">
                <span>3. 止损防线</span>
                <span className="text-[10px] text-rose-600 font-bold">-{stopLossPct}%</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-rose-500 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-mono font-bold bg-white border border-rose-300 rounded-lg focus:ring-1 focus:ring-rose-500 outline-hidden"
                />
              </div>
              <div className="text-[10px] text-rose-700 font-mono flex items-center justify-between">
                <span>盈亏比</span>
                <span className="font-bold">1:{riskReward}</span>
              </div>
            </div>
          </div>

          {/* Smart Capital Allocation / Position Sizing Tabs */}
          <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                <span>智能资金管理与头寸分配器 (Position Sizing)</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-700">
                买入 {shares} 股 = ${totalNotional.toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSizingMethod('HALF_KELLY')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  sizingMethod === 'HALF_KELLY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                半凯利公式 (Half-Kelly)
              </button>
              <button
                type="button"
                onClick={() => setSizingMethod('FIXED_RISK')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  sizingMethod === 'FIXED_RISK'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                1% 账户硬风险
              </button>
              <button
                type="button"
                onClick={() => setSizingMethod('VOLATILITY_PARITY')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  sizingMethod === 'VOLATILITY_PARITY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                波动率平价
              </button>
              <button
                type="button"
                onClick={() => setSizingMethod('CUSTOM_SHARES')}
                className={`py-1.5 px-2 rounded-lg font-semibold transition ${
                  sizingMethod === 'CUSTOM_SHARES'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                自定义股数
              </button>
            </div>

            {/* Custom Shares Input if active */}
            {sizingMethod === 'CUSTOM_SHARES' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-600 font-semibold">自选股数:</span>
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={shares}
                  onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg outline-hidden"
                />
              </div>
            )}

            {/* Sizing Rationale Explanation */}
            {sizingResult && (
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans bg-white p-2 rounded-lg border border-slate-100">
                💡 {sizingResult.rationale}
              </p>
            )}

            {/* Risk Disclosure */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200/60">
              <span>名义本金敞口: ${totalNotional.toLocaleString()}</span>
              <span className="text-rose-600 font-bold">
                止损触发最大亏损: ${totalRisk.toFixed(2)} ({account ? ((totalRisk / account.portfolioValue) * 100).toFixed(2) : 0}%)
              </span>
            </div>
          </div>

          {/* Level 2 Order Book Accordion */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowL2(!showL2)}
              className="w-full px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-100/80 text-left flex items-center justify-between text-xs font-bold text-slate-700 transition"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>查看 Level 2 买卖盘深度盘口与挂单墙</span>
              </div>
              {showL2 ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showL2 && (
              <div className="p-3 bg-white border-t border-slate-200">
                <Level2DepthCard symbol={data.ticker} currentPrice={entryPrice} />
              </div>
            )}
          </div>

          {/* Status Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            复合单结构: <span className="font-bold text-slate-700">LIMIT + OCO (TP/SL)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || totalNotional <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>正在提交路由...</span>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>确认提交 Bracket 委托 (${totalNotional.toLocaleString()})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
