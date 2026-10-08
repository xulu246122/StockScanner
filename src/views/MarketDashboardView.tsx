import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient.ts';
import { MarketStatus } from '../types.ts';
import {
  Compass,
  Layers,
  Clock,
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';

interface MarketDashboardViewProps {
  onSelectStock: (ticker: string) => void;
  onNavigateScreenerPreset?: (preset: any) => void;
  onNavigateTab?: (tab: any) => void;
  onOpenRsiRadar: () => void;
  onNavigateRadar?: () => void;
  marketStatus?: MarketStatus | null;
}

export function MarketDashboardView({
  onSelectStock,
  onOpenRsiRadar,
  onNavigateRadar,
  marketStatus
}: MarketDashboardViewProps) {
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const overview = await apiClient.getMarketOverview(forceRefresh);
      setOverviewData(overview);
    } catch (err) {
      console.error('Failed to load market dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
  }, []);

  return (
    <div className="flex flex-col gap-4 pb-12 font-sans select-none">
      
      {/* 1. Macro & Market Indices (Institutional Display Area) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#2962ff]" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              全景宏观指数与市场环境 (Macro Indices & Regime)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#f8fafd] border border-slate-200/80 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-700">{marketStatus?.nyTime || '09:30:00 ET'}</span>
              <span className={`px-1.5 py-0.2 rounded font-bold ${
                marketStatus?.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {marketStatus?.sessionLabel || '休市'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer border border-slate-200/80"
              title="实时刷新云端行情"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#2962ff]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Indices Ticker Grid */}
        {(() => {
          const spyData = overviewData?.indices?.spy || (Array.isArray(overviewData?.indices) ? overviewData.indices.find((i: any) => i.symbol === 'SPY' || i.symbol === 'SPX') : null);
          const qqqData = overviewData?.indices?.qqq || (Array.isArray(overviewData?.indices) ? overviewData.indices.find((i: any) => i.symbol === 'QQQ' || i.symbol === 'IXIC') : null);
          const vixData = overviewData?.indices?.vix || (Array.isArray(overviewData?.indices) ? overviewData.indices.find((i: any) => i.symbol === 'VIX') : null);

          const spyPct = typeof spyData?.changePercent === 'number' ? spyData.changePercent : 0;
          const qqqPct = typeof qqqData?.changePercent === 'number' ? qqqData.changePercent : 0;
          const vixPct = typeof vixData?.changePercent === 'number' ? vixData.changePercent : 0;
          const vixVal = typeof vixData?.price === 'number' ? vixData.price : (overviewData?.vix?.value || 15.08);

          return (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* SPY */}
              <div className="bg-[#f8fafd] rounded-2xl p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">标普500 (SPY)</span>
                  <span className="font-mono text-[10px] text-slate-400">大盘基准</span>
                </div>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-base font-bold font-mono text-slate-900">
                    ${spyData?.price ? Number(spyData.price).toFixed(2) : '777.22'}
                  </span>
                  <span className={`text-xs font-bold font-mono ${spyPct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                    {spyPct >= 0 ? '+' : ''}{spyPct.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center justify-between">
                  <span>RSI: {spyData?.rsi ? Number(spyData.rsi).toFixed(1) : '54.2'}</span>
                  <span className={spyPct >= 0 ? 'text-emerald-700 font-medium' : 'text-slate-600 font-medium'}>
                    {spyPct >= 0 ? '多头排列' : '回调整理'}
                  </span>
                </div>
              </div>

              {/* QQQ */}
              <div className="bg-[#f8fafd] rounded-2xl p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">纳斯达克 (QQQ)</span>
                  <span className="font-mono text-[10px] text-slate-400">科技成长</span>
                </div>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-base font-bold font-mono text-slate-900">
                    ${qqqData?.price ? Number(qqqData.price).toFixed(2) : '757.73'}
                  </span>
                  <span className={`text-xs font-bold font-mono ${qqqPct >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                    {qqqPct >= 0 ? '+' : ''}{qqqPct.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center justify-between">
                  <span>RSI: {qqqData?.rsi ? Number(qqqData.rsi).toFixed(1) : '56.8'}</span>
                  <span className={qqqPct >= 0 ? 'text-emerald-700 font-medium' : 'text-slate-600 font-medium'}>
                    {qqqPct >= 0 ? '多头排列' : '短线承压'}
                  </span>
                </div>
              </div>

              {/* VIX */}
              <div className="bg-[#f8fafd] rounded-2xl p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">恐慌指数 (VIX)</span>
                  <span className={`font-mono text-[10px] font-medium ${
                    vixVal < 18 ? 'text-emerald-700' : vixVal < 25 ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {overviewData?.vix?.statusZh || (vixVal < 18 ? '低位稳定' : vixVal < 25 ? '正常波动' : '恐慌攀升')}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1.5">
                  <span className="text-base font-bold font-mono text-slate-900">
                    {Number(vixVal).toFixed(2)}
                  </span>
                  <span className={`text-xs font-bold font-mono ${vixPct <= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                    {vixPct >= 0 ? '+' : ''}{vixPct.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center justify-between">
                  <span>基准区间: 12 - 20</span>
                  <span className="text-slate-400">
                    {vixVal < 18 ? '偏好扩张' : vixVal < 25 ? '中性平衡' : '避险防御'}
                  </span>
                </div>
              </div>

              {/* Market Regime */}
              <div className="bg-[#edf2fe] rounded-2xl p-3.5 border border-blue-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">市场环境评级</span>
                  <span className={`w-2 h-2 rounded-full animate-pulse ${
                    vixVal < 18 ? 'bg-emerald-500' : vixVal < 25 ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />
                </div>
                <div className="mt-1">
                  <span className="text-sm font-extrabold text-[#2962ff] block">
                    {overviewData?.regimeLabel || (vixVal < 18 ? '多头进攻 (Risk-On)' : vixVal < 25 ? '中性震荡 (Neutral)' : '避险防守 (Risk-Off)')}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {vixVal < 18
                      ? '环境健康，优先关注强势回调与突破形态'
                      : vixVal < 25
                      ? '震荡行情，防守反弹与高胜率策略'
                      : '恐慌加剧，严格风控，现金为王'}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 2. Sector Rotation (Institutional Display Area) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4 overflow-hidden mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2962ff]" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              美股核心板块轮动与强弱表现 (Sector Rotation)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">相对基准 SPY</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(overviewData?.sectors || [
            { sector: 'Technology', nameZh: '科技信息', etf: 'XLK', changePercent: 0.82, relativeStrength: 0.44, leadingStocks: ['NVDA', 'AAPL'] },
            { sector: 'Semiconductors', nameZh: '半导体芯片', etf: 'SOXX', changePercent: 1.45, relativeStrength: 1.07, leadingStocks: ['NVDA', 'AMD'] },
            { sector: 'Communication Services', nameZh: '通信互联', etf: 'XLC', changePercent: 0.54, relativeStrength: 0.16, leadingStocks: ['GOOGL', 'META'] },
            { sector: 'Consumer Cyclical', nameZh: '可选消费', etf: 'XLY', changePercent: 0.28, relativeStrength: -0.10, leadingStocks: ['AMZN', 'TSLA'] },
            { sector: 'Financial Services', nameZh: '金融银行', etf: 'XLF', changePercent: -0.15, relativeStrength: -0.53, leadingStocks: ['JPM', 'BAC'] },
            { sector: 'Healthcare', nameZh: '医疗制药', etf: 'XLV', changePercent: -0.32, relativeStrength: -0.70, leadingStocks: ['LLY', 'UNH'] },
            { sector: 'Industrials', nameZh: '工业军工', etf: 'XLI', changePercent: 0.42, relativeStrength: 0.04, leadingStocks: ['RTX', 'NOC'] },
            { sector: 'Energy', nameZh: '石油能源', etf: 'XLE', changePercent: -0.65, relativeStrength: -1.03, leadingStocks: ['XOM', 'CVX'] }
          ]).map((sec: any, idx: number) => {
            const relStrength = typeof sec.relativeStrength === 'number' ? sec.relativeStrength : 0;
            const isOutperforming = relStrength >= 0;
            const chgPct = typeof sec.changePercent === 'number' ? sec.changePercent : 0;
            const isPositive = chgPct >= 0;
            const leadingStr = Array.isArray(sec.leadingStocks) ? sec.leadingStocks.join(', ') : (sec.name || '');

            return (
              <div
                key={sec.sector || sec.name || `sec-${idx}`}
                className="bg-[#f8fafd] hover:bg-slate-100/70 rounded-2xl p-3.5 border border-slate-200/80 transition-colors flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">{sec.nameZh || sec.name || '行业板块'}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold bg-white px-1.5 py-0.5 rounded-md border border-slate-200/80">
                      {sec.etf || sec.code || 'ETF'}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold ${
                      isPositive ? 'text-[#089981]' : 'text-[#f23645]'
                    }`}
                  >
                    {isPositive ? '+' : ''}{chgPct.toFixed(2)}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono mt-2 pt-1.5 border-t border-[#f0f3fa]">
                  <span className="text-slate-400">
                    相对 SPY: <span className={isOutperforming ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
                      {isOutperforming ? '+' : ''}{relStrength.toFixed(2)}%
                    </span>
                  </span>
                  <span className="text-slate-400 truncate max-w-[80px]" title={leadingStr}>
                    {leadingStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
