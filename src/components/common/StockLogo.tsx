interface StockLogoProps {
  ticker: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StockLogo({ ticker, size = 'md', className = '' }: StockLogoProps) {
  const norm = ticker.toUpperCase().replace('.', '-');

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 28
  };

  const s = iconSizes[size];

  // Specific high-fidelity SVGs for popular stocks matching StockAlarm screenshots
  if (norm === 'NVDA') {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 ${className}`}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 4C6.5 4 2 8 2 12C2 16 6.5 20 12 20C17.5 20 22 16 22 12C22 8 17.5 4 12 4ZM12 17C9.2 17 7 14.8 7 12C7 9.2 9.2 7 12 7C14.8 7 17 9.2 17 12C17 14.8 14.8 17 12 17Z" fill="#76B900" />
          <path d="M12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9Z" fill="#76B900" />
        </svg>
      </div>
    );
  }

  if (norm === 'AAPL') {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 ${className}`}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className="text-slate-900">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.62 1.35-.56.64-.99 1.68-.86 2.7.99.08 2.01-.5 2.56-1.2z" />
        </svg>
      </div>
    );
  }

  if (norm === 'GOOGL' || norm === 'GOOG') {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs ${className}`}>
        <svg width={s} height={s} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      </div>
    );
  }

  if (norm === 'MSFT') {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 ${className}`}>
        <svg width={s - 2} height={s - 2} viewBox="0 0 24 24">
          <rect x="1" y="1" width="10" height="10" fill="#F25022" />
          <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
          <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
          <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
        </svg>
      </div>
    );
  }

  if (norm === 'AMZN') {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-amber-50/80 border border-amber-200/70 flex items-center justify-center shrink-0 ${className}`}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M4 16C8 19 16 19 20 14" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 13.5L20.5 14L19.5 16.5" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (norm === 'TSLA') {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 ${className}`}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className="text-rose-600">
          <path d="M12 5.5c2.3 0 5 .6 6.8 1.8l.9-1.9C17.3 4.1 14.3 3.5 12 3.5s-5.3.6-7.7 1.9l.9 1.9c1.8-1.2 4.5-1.8 6.8-1.8zm0 3c-1.8 0-3.5.3-4.9.9l-.7-1.4C7.9 7.4 9.9 7 12 7s4.1.4 5.6 1l-.7 1.4c-1.4-.6-3.1-.9-4.9-.9zm0 3.2l2.5 7.8h2.3L12 9.5l-4.8 10h2.3l2.5-7.8z" />
        </svg>
      </div>
    );
  }

  if (norm === 'META') {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 ${className}`}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
          <path d="M16.9 7.2c-1.8 0-3.4 1-4.3 2.5-.9-1.5-2.5-2.5-4.3-2.5C4.8 7.2 2 9.8 2 13.5c0 4.1 3.5 7.3 7.8 7.3 2.1 0 3.7-.8 4.7-2.1 1 1.3 2.6 2.1 4.7 2.1 4.3 0 7.8-3.2 7.8-7.3 0-3.7-2.8-6.3-6.3-6.3zm-8.6 11.2c-2.8 0-5.1-2.2-5.1-5 0-2.6 2.1-4.7 4.7-4.7 1.7 0 3.2 1 3.9 2.5l-2.4 5.9c-.4.8-.9 1.3-1.1 1.3zm8.6 0c-.2 0-.7-.5-1.1-1.3l-2.4-5.9c.7-1.5 2.2-2.5 3.9-2.5 2.6 0 4.7 2.1 4.7 4.7 0 2.8-2.3 5-5.1 5z" />
        </svg>
      </div>
    );
  }

  // Fallback: Clean StockAlarm letter avatar
  const colors = [
    'bg-blue-50 border-blue-200 text-blue-700',
    'bg-emerald-50 border-emerald-200 text-emerald-700',
    'bg-violet-50 border-violet-200 text-violet-700',
    'bg-amber-50 border-amber-200 text-amber-700',
    'bg-sky-50 border-sky-200 text-sky-700',
    'bg-rose-50 border-rose-200 text-rose-700'
  ];
  const charCode = norm.charCodeAt(0) + (norm.charCodeAt(1) || 0);
  const colorClass = colors[charCode % colors.length];

  return (
    <div className={`${sizeClasses[size]} rounded-full border flex items-center justify-center font-mono font-bold shrink-0 tracking-tighter ${colorClass} ${className}`}>
      {norm.slice(0, 3)}
    </div>
  );
}
