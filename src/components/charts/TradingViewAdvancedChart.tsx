import { useEffect, useRef, useState } from 'react';
import type { Exchange, Timeframe } from '../../types.ts';

interface TradingViewAdvancedChartProps {
  ticker: string;
  exchange?: Exchange | string;
  timeframe: Timeframe;
  height?: number;
}

const INTERVALS: Partial<Record<Timeframe, string>> = {
  '30m': '30',
  '1h': '60',
  '2h': '120',
  '4h': '240',
  '1D': 'D',
  '1W': 'W',
  '1M': 'M'
};

export function TradingViewAdvancedChart({ ticker, exchange, timeframe, height = 520 }: TradingViewAdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unsupported'>('loading');
  const [message, setMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const normalizedTicker = ticker.trim().toUpperCase();
  const normalizedExchange = exchange?.trim().toUpperCase();
  const isValidTicker = /^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(normalizedTicker);
  const isValidExchange = normalizedExchange === 'NASDAQ' || normalizedExchange === 'NYSE';
  const symbol = isValidTicker && isValidExchange ? `${normalizedExchange}:${normalizedTicker}` : '';
  const interval = INTERVALS[timeframe] ?? 'D';
  const hasIntervalFallback = !INTERVALS[timeframe];
  const chartUrl = symbol
    ? `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`
    : 'https://www.tradingview.com/chart/';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.replaceChildren();
    setStatus('loading');
    setMessage('');

    if (!symbol) {
      setStatus('unsupported');
      setMessage('无法确认有效的股票代码或交易所，暂不加载第三方图表。');
      return;
    }

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    widget.style.width = '100%';

    const attribution = document.createElement('div');
    attribution.className = 'tradingview-widget-copyright';
    const link = document.createElement('a');
    link.href = `https://www.tradingview.com/symbols/${encodeURIComponent(symbol)}/`;
    link.rel = 'noopener nofollow';
    link.target = '_blank';
    link.textContent = `${normalizedTicker} chart`;
    attribution.append(link, document.createTextNode(' by TradingView'));

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'America/New_York',
      theme: 'light',
      style: '1',
      locale: 'en',
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      support_host: 'https://www.tradingview.com'
    });
    container.append(widget, attribution, script);

    let settled = false;
    let timeout = 0;
    const observer = new MutationObserver(() => {
      if (container.querySelector('iframe')) {
        settled = true;
        setStatus('ready');
        observer.disconnect();
        window.clearTimeout(timeout);
      }
    });
    observer.observe(widget, { childList: true, subtree: true });
    observer.observe(container, { childList: true, subtree: true });
    script.onerror = () => {
      settled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      setStatus('error');
      setMessage('TradingView 官方嵌入脚本加载失败。请检查网络连接、防火墙或第三方内容限制。');
    };
    timeout = window.setTimeout(() => {
      if (settled) return;
      observer.disconnect();
      setStatus('error');
      setMessage('官方脚本已请求，但未检测到图表 iframe。可能是网络策略、扩展程序或 TradingView 拒绝嵌入；可重试或在 TradingView 打开。');
    }, 30000);

    return () => {
      settled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      container.replaceChildren();
    };
  }, [symbol, normalizedTicker, interval, reloadKey]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">TradingView 图表 · {normalizedTicker}</h2>
          <p className="mt-1 text-xs text-slate-500">官方在线嵌入组件；行情由 TradingView 提供，不用于填充本应用其他数据字段。</p>
        </div>
        <div className="flex items-center gap-3">
          {hasIntervalFallback && <span className="text-xs text-amber-700">周期 {timeframe} 不受支持，图表使用日线周期</span>}
          <a href={chartUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:text-blue-800">在 TradingView 打开</a>
        </div>
      </header>
      <div className="relative bg-white" style={{ height }}>
        <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
        {(status === 'loading' || status === 'error' || status === 'unsupported') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white px-6 text-center">
            {status === 'loading' ? (
              <>
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                <p className="text-sm text-slate-500">正在连接 TradingView 图表…</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700">{status === 'unsupported' ? '暂无法显示图表' : '在线图表不可用'}</p>
                <p className="max-w-xl text-xs text-slate-500">{message}</p>
                {status === 'error' && (
                  <button
                    type="button"
                    onClick={() => setReloadKey((key) => key + 1)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    重新加载图表
                  </button>
                )}
                <a href={chartUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:text-blue-800">前往 TradingView 查看</a>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
