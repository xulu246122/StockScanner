import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exchange } from '../../types.ts';

const INTERVALS = [
  { value: '1m', label: '1 minute' },
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '2h', label: '2 hours' },
  { value: '4h', label: '4 hours' },
  { value: '1D', label: '1 day' },
  { value: '1W', label: '1 week' },
  { value: '1M', label: '1 month' }
] as const;

type TechnicalInterval = (typeof INTERVALS)[number]['value'];

interface TradingViewTechnicalAnalysisProps {
  ticker: string;
  exchange?: Exchange | string;
}

export function TradingViewTechnicalAnalysis({ ticker, exchange }: TradingViewTechnicalAnalysisProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [interval, setInterval] = useState<TechnicalInterval>('1D');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unsupported'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const normalizedTicker = ticker.trim().toUpperCase();
  const normalizedExchange = exchange?.trim().toUpperCase();
  const symbol = useMemo(() => {
    if (!/^[A-Z0-9][A-Z0-9.-]{0,14}$/.test(normalizedTicker)) return '';
    if (normalizedExchange !== 'NASDAQ' && normalizedExchange !== 'NYSE') return '';
    return `${normalizedExchange}:${normalizedTicker}`;
  }, [normalizedExchange, normalizedTicker]);
  const symbolUrl = symbol
    ? `https://www.tradingview.com/symbols/${encodeURIComponent(symbol)}/`
    : 'https://www.tradingview.com/';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.replaceChildren();
    setStatus('loading');

    if (!symbol) {
      setStatus('unsupported');
      return;
    }

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.width = '100%';

    const attribution = document.createElement('div');
    attribution.className = 'tradingview-widget-copyright';
    const link = document.createElement('a');
    link.href = symbolUrl;
    link.target = '_blank';
    link.rel = 'noopener nofollow';
    link.textContent = `${symbol} Technical Analysis by TradingView`;
    attribution.append(link);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.type = 'text/javascript';
    script.async = true;
    script.textContent = JSON.stringify({
      interval,
      width: '100%',
      isTransparent: false,
      height: '430',
      symbol,
      showIntervalTabs: false,
      displayMode: 'single',
      locale: 'en',
      colorTheme: 'light'
    });
    container.append(widget, attribution, script);

    let settled = false;
    const observer = new MutationObserver(() => {
      if (widget.querySelector('iframe')) {
        settled = true;
        setStatus('ready');
        observer.disconnect();
        window.clearTimeout(timeout);
      }
    });
    observer.observe(widget, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => {
      if (settled) return;
      observer.disconnect();
      setStatus('error');
    }, 8000);
    script.onerror = () => {
      settled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      setStatus('error');
    };

    return () => {
      settled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      container.replaceChildren();
    };
  }, [interval, reloadKey, symbol, symbolUrl]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="space-y-4 border-b border-slate-100 px-5 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Indicators' summary</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Official TradingView technical ratings for the selected timeframe. Ratings are provided by TradingView and are not personalized investment advice.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Technical analysis timeframe">
          {INTERVALS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={interval === value}
              onClick={() => setInterval(value)}
              className={`rounded-md px-3 py-2 text-xs transition ${interval === value ? 'bg-slate-100 font-bold text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <div className="relative min-h-[430px] bg-white">
        <div ref={containerRef} className="tradingview-widget-container w-full" />
        {(status === 'loading' || status === 'error' || status === 'unsupported') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center">
            {status === 'loading' ? (
              <>
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                <p className="text-sm text-slate-500">Loading TradingView ratings. Local technical indicators are shown above.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700">
                  {status === 'unsupported' ? 'Ticker or exchange could not be verified' : 'TradingView technical analysis is unavailable'}
                </p>
                <p className="max-w-xl text-xs text-slate-500">
                  {status === 'unsupported'
                    ? 'The official widget requires a valid ticker and NASDAQ/NYSE exchange.'
                    : 'The TradingView widget did not load in time. Local technical indicators are shown above; retry or open the official analysis directly.'}
                </p>
                {status === 'error' && (
                  <button type="button" onClick={() => setReloadKey(key => key + 1)} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                    Retry
                  </button>
                )}
                <a href={symbolUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                  Open TradingView
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
