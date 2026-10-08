import { useState, useEffect } from 'react';
import { StrategyAlertTriggerType, Timeframe } from '../../types.ts';
import { apiClient } from '../../services/apiClient.ts';
import {
  Bell,
  X,
  Zap,
  Check,
  TrendingUp,
  BarChart3,
  Layers,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface CreateStrategyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyId: string;
  strategyName: string;
  parameters: Record<string, any>;
  timeframe: string;
  symbols: string[];
  onSuccess: (message?: string) => void;
}

export function CreateStrategyAlertModal({
  isOpen,
  onClose,
  strategyId,
  strategyName,
  parameters,
  timeframe,
  symbols,
  onSuccess
}: CreateStrategyAlertModalProps) {
  const [targetSymbols, setTargetSymbols] = useState<string>('');
  const [triggerType, setTriggerType] = useState<StrategyAlertTriggerType>('CONDITION_TRIGGER');
  const [conditionDesc, setConditionDesc] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetSymbols(symbols.length > 0 ? symbols.join(', ') : 'NVDA, AAPL, MSFT, PLTR');

      const sid = (strategyId || '').toLowerCase();
      if (sid.includes('rvol') || sid.includes('volume') || parameters.spikeRvol || parameters.minRvol >= 2.0) {
        setTriggerType('VOLUME_ANOMALY');
        setConditionDesc(`成交量放大超过 20日均量 ${parameters.spikeRvol || parameters.minRvol || 2.0} 倍异常爆量`);
      } else if (sid.includes('break') || sid.includes('donchian') || sid.includes('darvas') || sid.includes('stage2')) {
        setTriggerType('BREAKOUT_TRIGGER');
        setConditionDesc(`价格突破 ${strategyName} 关键阻力与新高通道`);
      } else if (sid.includes('ema') || sid.includes('sma') || sid.includes('cross') || sid.includes('impulse')) {
        setTriggerType('TREND_CHANGE');
        setConditionDesc(`均线多头金叉共振加速 (EMA/SMA)`);
      } else {
        setTriggerType('CONDITION_TRIGGER');
        const rsiThresh = parameters.rsiThreshold || parameters.rsiOversold || 30;
        setConditionDesc(`Wilder RSI < ${rsiThresh} 极度超卖反弹触发`);
      }
    }
  }, [isOpen, strategyId, strategyName, parameters, symbols]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const symbolList = targetSymbols
      .split(/[\s,]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    if (symbolList.length === 0) {
      setErrorMsg('请至少输入一个监控的股票代码 (Symbols)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiClient.createStrategyAlert({
        strategy_id: strategyId,
        strategyName,
        parameters,
        timeframe,
        symbols: symbolList,
        trigger_type: triggerType,
        conditionDescription: conditionDesc
      });

      onSuccess(`策略提醒「${strategyName}」创建成功，监控 ${symbolList.length} 只标的`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '创建策略提醒失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">创建策略实时自动监控</h3>
              <p className="text-[10px] text-slate-400">系统将在后台持续评估策略条件并在触发时发送提醒</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1 rounded-md hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3.5 text-xs">
          
          {/* Strategy Info Card */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">已绑定量化策略:</span>
              <span className="font-black text-white text-xs">{strategyName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">执行周期:</span>
              <span className="font-mono font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-900">{timeframe}</span>
            </div>
          </div>

          {/* Trigger Type Selection (4 Alert Types) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">选择触发类型 (Alert Trigger Type):</label>
            <div className="grid grid-cols-2 gap-2">
              
              {/* Type 1: Condition Trigger */}
              <button
                type="button"
                onClick={() => {
                  setTriggerType('CONDITION_TRIGGER');
                  setConditionDesc(`Wilder RSI < ${parameters.rsiThreshold || 30} 极度超卖区域`);
                }}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  triggerType === 'CONDITION_TRIGGER'
                    ? 'bg-blue-600/15 border-blue-500 text-white ring-1 ring-blue-500/30'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>1. 条件触发</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">例如: RSI 进入超卖区域</div>
              </button>

              {/* Type 2: Breakout Trigger */}
              <button
                type="button"
                onClick={() => {
                  setTriggerType('BREAKOUT_TRIGGER');
                  setConditionDesc(`价格突破 ${strategyName} 20日高点与阻力通道`);
                }}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  triggerType === 'BREAKOUT_TRIGGER'
                    ? 'bg-emerald-600/15 border-emerald-500 text-white ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>2. 突破触发</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">例如: 价格突破 Donchian High</div>
              </button>

              {/* Type 3: Trend Change */}
              <button
                type="button"
                onClick={() => {
                  setTriggerType('TREND_CHANGE');
                  setConditionDesc(`EMA(20) 上穿 EMA(50) 形成多头金叉`);
                }}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  triggerType === 'TREND_CHANGE'
                    ? 'bg-purple-600/15 border-purple-500 text-white ring-1 ring-purple-500/30'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span>3. 趋势变化</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">例如: EMA20 上穿 EMA50</div>
              </button>

              {/* Type 4: Volume Anomaly */}
              <button
                type="button"
                onClick={() => {
                  setTriggerType('VOLUME_ANOMALY');
                  setConditionDesc(`Volume > 20日均量 2.0 倍异常放量`);
                }}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  triggerType === 'VOLUME_ANOMALY'
                    ? 'bg-amber-600/15 border-amber-500 text-white ring-1 ring-amber-500/30'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>4. 成交量异常</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">例如: Volume &gt; 20日均量2倍</div>
              </button>

            </div>
          </div>

          {/* Condition Description */}
          <div className="space-y-1">
            <label className="font-bold text-slate-300">触发条件说明 (Condition Description):</label>
            <input
              type="text"
              value={conditionDesc}
              onChange={e => setConditionDesc(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-blue-500"
            />
          </div>

          {/* Target Symbols */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300">监控股票池 (Monitored Symbols):</label>
              <span className="text-[10px] text-slate-500">以英文逗号或空格分隔</span>
            </div>
            <textarea
              rows={2}
              value={targetSymbols}
              onChange={e => setTargetSymbols(e.target.value)}
              placeholder="NVDA, AAPL, MSFT, PLTR, AMD"
              className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 fill-slate-950" />
            <span>{isSubmitting ? '创建中...' : '确认创建策略监控 (Create Alert)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
