import { useState, useEffect, useCallback } from 'react';
import { ActiveTab, MarketStatus, AlertEvent, WsConnectionStatus } from './types.ts';
import { apiClient } from './services/apiClient.ts';
import { notificationService } from './services/notificationService.ts';
import { wsClient } from './services/websocketClient.ts';
import { StockAlarmHeader } from './components/layout/StockAlarmHeader.tsx';
import { StockAlarmBottomNav } from './components/layout/StockAlarmBottomNav.tsx';
import { TerminalSidebar } from './components/layout/TerminalSidebar.tsx';
import { UniversalAlertModal } from './components/modals/UniversalAlertModal.tsx';
import { AddToWatchlistModal } from './components/modals/AddToWatchlistModal.tsx';
import { RsiRadarModal } from './components/modals/RsiRadarModal.tsx';
import { MarketDashboardView } from './views/MarketDashboardView.tsx';
import { StockDetailView } from './views/StockDetailView.tsx';
import { WatchlistAndAlertsView } from './views/WatchlistAndAlertsView.tsx';
import { QuantStrategyView } from './views/QuantStrategyView.tsx';
import { RadarScannerView } from './views/RadarScannerView.tsx';
import { PlungeReboundView } from './views/PlungeReboundView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { ExitConfirmModal } from './components/modals/ExitConfirmModal.tsx';
import { AndroidGestureExitModal } from './components/modals/AndroidGestureExitModal.tsx';
import { useAndroidGestureExit } from './hooks/useAndroidGestureExit.ts';
import { LiveAlertBanner } from './components/alerts/LiveAlertBanner.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { Minus, Square, X as CloseIcon } from 'lucide-react';
import { AlertTargetDimension } from './types.ts';
import { useResponsive } from './hooks/useResponsive.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('quant');
  const [previousTab, setPreviousTab] = useState<ActiveTab>('watchlist');
  const [selectedTicker, setSelectedTicker] = useState<string>('NVDA');
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>(['NVDA', 'AAPL', 'TSLA', 'AMD', 'PLTR', 'NOC', 'AVAV']);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [unreadAlertCount, setUnreadAlertCount] = useState<number>(0);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [focusedAlertTicker, setFocusedAlertTicker] = useState<string | null>(null);

  // Responsive & Platform detection: Distinguish Mobile/Android (bottom nav) vs Windows/Desktop (sidebar nav)
  const { isAndroid, isMobile } = useResponsive();

  // Android Gesture Exit & Background Interception hook
  const {
    isExitModalOpen: isAndroidGestureExitOpen,
    closeExitModal: closeAndroidGestureExit
  } = useAndroidGestureExit();

  // Modal states
  const [isAddWatchlistOpen, setIsAddWatchlistOpen] = useState(false);
  const [isRsiRadarOpen, setIsRsiRadarOpen] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    isOpen: boolean;
    ticker: string;
    stockName?: string;
    currentPrice?: number;
    currentChangePercent?: number;
    currentRsi?: number;
    initialDimension?: AlertTargetDimension;
  }>({
    isOpen: false,
    ticker: 'NVDA',
    stockName: 'NVIDIA Corporation',
    currentRsi: 50
  });

  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>('DISCONNECTED');

  const initData = useCallback(async () => {
    try {
      const status = await apiClient.getMarketStatus();
      setMarketStatus(status);

      const wl = await apiClient.getWatchlist();
      if (wl.tickers && wl.tickers.length > 0) {
        setWatchlistTickers(wl.tickers);
      }

      const events = await apiClient.getAlertEvents();
      const unread = events.filter((e: AlertEvent) => !e.isRead).length;
      setUnreadAlertCount(unread);
    } catch (e) {
      console.error('App init error:', e);
    }
  }, []);

  useEffect(() => {
    initData();

    // WebSocket real-time subscription bindings
    const unbindStatus = wsClient.onStatusChange(status => {
      setWsStatus(status);
    });

    const unbindAlert = wsClient.onAlert((evt: AlertEvent) => {
      notificationService.showNotification(`US Stock Alert: ${evt.ticker}`, {
        body: evt.message,
        metadata: {
          ticker: evt.ticker,
          view: 'watchlist',
          source: 'WATCHLIST',
          message: evt.message,
          timestamp: Date.now()
        }
      });
      setUnreadAlertCount(prev => prev + 1);
    });

    const unbindMarket = wsClient.onMarketStatus((status: MarketStatus) => {
      setMarketStatus(status);
    });

    const clockInterval = setInterval(async () => {
      try {
        const status = await apiClient.getMarketStatus();
        setMarketStatus(status);
      } catch (e) {
        // ignore
      }
    }, 20000);

    const alertInterval = setInterval(async () => {
      try {
        const res = await apiClient.triggerAlertScan();
        if (res.newEvents && res.newEvents.length > 0) {
          res.newEvents.forEach((evt: AlertEvent) => {
            notificationService.showNotification(`US Stock Alert: ${evt.ticker}`, {
              body: evt.message,
              metadata: {
                ticker: evt.ticker,
                view: 'watchlist',
                source: 'WATCHLIST',
                message: evt.message,
                timestamp: Date.now()
              }
            });
          });
          const evts = await apiClient.getAlertEvents();
          setUnreadAlertCount(evts.filter((e: AlertEvent) => !e.isRead).length);
        }
      } catch (e) {
        // ignore
      }
    }, 60000);

    return () => {
      unbindStatus();
      unbindAlert();
      unbindMarket();
      clearInterval(clockInterval);
      clearInterval(alertInterval);
    };
  }, [initData]);

  const handleWindowMinimize = () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.minimizeToTray === 'function') {
      electronAPI.minimizeToTray();
    } else if (electronAPI && typeof electronAPI.minimize === 'function') {
      electronAPI.minimize();
    }
  };

  const handleWindowClose = useCallback(() => {
    const remember = localStorage.getItem('v65_remember_close_action') === 'true';
    const pref = localStorage.getItem('v65_close_action_preference');
    const electronAPI = (window as any).electronAPI;

    if (remember && pref) {
      if (pref === 'MINIMIZE_TO_TRAY') {
        if (electronAPI && typeof electronAPI.minimizeToTray === 'function') {
          electronAPI.minimizeToTray();
        } else if (electronAPI && typeof electronAPI.minimize === 'function') {
          electronAPI.minimize();
        }
        return;
      }
      if (pref === 'QUIT') {
        if (electronAPI && typeof electronAPI.quit === 'function') {
          electronAPI.quit();
        } else {
          try { window.close(); } catch {}
        }
        return;
      }
    }

    setIsExitModalOpen(true);
  }, []);

  const handleTabChange = useCallback((tab: ActiveTab) => {
    if (tab === 'settings' && activeTab !== 'settings') {
      setPreviousTab(activeTab);
    }
    setActiveTab(tab);
  }, [activeTab]);

  const handleLocateStock = useCallback((ticker: string, view?: string) => {
    if (!ticker) return;
    const normTicker = ticker.toUpperCase();
    const targetTab = view === 'watchlist' ? 'watchlist' : view === 'radar' ? 'radar' : 'rebound';
    handleTabChange(targetTab);
    setFocusedAlertTicker(normTicker);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('app:focus-card-ticker', { detail: { ticker: normTicker, view: targetTab } }));
    }, 80);
  }, [handleTabChange]);

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.onCloseRequest === 'function') {
      electronAPI.onCloseRequest(() => {
        handleWindowClose();
      });
    }
    if (electronAPI && typeof electronAPI.onNavigateToTab === 'function') {
      electronAPI.onNavigateToTab((tab: any) => {
        if (tab) handleTabChange(tab);
      });
    }
    if (electronAPI && typeof electronAPI.onAlertNotificationClicked === 'function') {
      electronAPI.onAlertNotificationClicked((data: any) => {
        handleLocateStock(data?.ticker, data?.view);
      });
    }

    const handleFocusAlertStockEvent = (e: any) => {
      if (e.detail?.ticker) {
        handleLocateStock(e.detail.ticker, e.detail.view);
      }
    };
    window.addEventListener('app:focus-alert-stock', handleFocusAlertStockEvent);

    return () => {
      window.removeEventListener('app:focus-alert-stock', handleFocusAlertStockEvent);
    };
  }, [handleWindowClose, handleLocateStock, handleTabChange]);

  const handleSelectStock = (ticker: string) => {
    setSelectedTicker(ticker);
    if (activeTab !== 'detail') {
      setPreviousTab(activeTab);
    }
    setActiveTab('detail');
  };

  const handleNavigateScreenerPreset = (_preset?: any) => {
    handleTabChange('radar');
  };

  const handleToggleWatchlist = async (ticker: string) => {
    const norm = ticker.toUpperCase();
    if (watchlistTickers.includes(norm)) {
      setWatchlistTickers(prev => prev.filter(t => t !== norm));
      await apiClient.removeFromWatchlist(norm).catch(console.error);
    } else {
      setWatchlistTickers(prev => [...prev, norm]);
      await apiClient.addToWatchlist(norm).catch(console.error);
    }
  };

  const handleOpenAlertModal = (
    ticker: string,
    stockName?: string,
    currentPrice?: number,
    currentChangePercent?: number,
    currentRsi?: number,
    initialDimension?: AlertTargetDimension
  ) => {
    setAlertModalConfig({
      isOpen: true,
      ticker,
      stockName,
      currentPrice,
      currentChangePercent,
      currentRsi,
      initialDimension
    });
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-[#131722] overflow-hidden font-sans text-slate-100 select-none">
      
      {/* 1. TradingView-Style Professional Top System Bar (Frameless App Titlebar - Desktop Only) */}
      {!isMobile && (
        <header className="w-full bg-[#131722] text-slate-300 px-3.5 py-1.5 z-50 text-[11px] font-mono flex items-center justify-between border-b border-[#2a2e39] select-none shrink-0 shadow-xs app-drag-region">
          <div className="flex items-center gap-2 app-no-drag">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-white tracking-wide text-xs">REMIX V6.5</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-medium text-[10px] hidden sm:inline">US EQUITIES QUANT TERMINAL</span>
          </div>

          <div className="flex items-center gap-3 app-no-drag">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="hidden md:inline">NY: <strong className="text-slate-200">{marketStatus?.nyTime?.split(' ')[1] || '09:30:00'}</strong></span>
              <span className={`px-1.5 py-0.2 rounded font-semibold ${marketStatus?.isOpen ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30' : 'text-slate-400 bg-slate-800'}`}>
                {marketStatus?.sessionLabel || 'CLOSED'}
              </span>
              {/* Local Micro-WS Real-time Connection Indicator */}
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] bg-[#1a1e29] border border-slate-700/60"
                title={`WebSocket 本地实时流状态: ${wsStatus}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    wsStatus === 'CONNECTED'
                      ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : wsStatus === 'CONNECTING' || wsStatus === 'RECONNECTING'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-slate-500'
                  }`}
                />
                <span className={wsStatus === 'CONNECTED' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                  {wsStatus === 'CONNECTED' ? 'WS 实时' : wsStatus === 'RECONNECTING' ? 'WS 重连' : 'WS 离线'}
                </span>
              </div>
            </div>

            {/* Desktop Window Controls: Minimize, Maximize, Close (Prompt Exit Confirmation) */}
            <div className="flex items-center gap-0.5 border-l border-slate-700/80 pl-2">
              <button
                type="button"
                onClick={handleWindowMinimize}
                className="w-7 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="最小化到系统托盘 (保持后台运行)"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => (window as any).electronAPI?.maximize?.()}
                className="w-7 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="最大化 / 还原"
              >
                <Square className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleWindowClose}
                className="w-7 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer"
                title="关闭程序 (最小化 / 退出)"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>
      )}

      <div className="flex-1 flex overflow-hidden bg-[#f0f3fa]">
        {/* 2. Windows / Desktop Navigation: ONLY sidebar on desktop, NEVER on mobile */}
        {!isMobile && (
          <TerminalSidebar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            unreadAlertCount={unreadAlertCount}
            marketStatus={marketStatus}
            selectedTicker={selectedTicker}
            onOpenCreateAlert={() => handleOpenAlertModal(selectedTicker)}
          />
        )}

        {/* 3. Main Workspace Container */}
        <div className="flex-1 flex flex-col h-full bg-[#f8fafd] overflow-hidden relative text-slate-900">
          {/* Mobile Top Header: ONLY on Mobile/Android */}
          {isMobile && (
            <StockAlarmHeader
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              selectedTicker={selectedTicker}
              onBack={() => handleTabChange(previousTab || 'watchlist')}
              onOpenCreateAlert={() => handleOpenAlertModal(selectedTicker)}
              onOpenAddWatchlist={() => setIsAddWatchlistOpen(true)}
              isWatchlisted={watchlistTickers.includes(selectedTicker)}
              onToggleWatchlist={handleToggleWatchlist}
              marketStatus={marketStatus}
              unreadAlertCount={unreadAlertCount}
            />
          )}

          {/* High-visibility Live Alert Banner */}
          <LiveAlertBanner
            onLocateStock={handleLocateStock}
            onSelectStock={handleSelectStock}
            currentActiveTab={activeTab}
          />

          {/* Main Application Canvas */}
          <main className="flex-1 overflow-y-auto w-full h-full">
            <ErrorBoundary fallbackTitle="当前面板加载异常">
              {(activeTab === 'market' || activeTab === 'home') && !isMobile && (
                <div className="p-3.5 w-full min-w-0">
                  <MarketDashboardView
                    onSelectStock={handleSelectStock}
                    onNavigateScreenerPreset={handleNavigateScreenerPreset}
                    onNavigateTab={(tab: any) => {
                      if (tab === 'screener') handleTabChange('radar');
                      else handleTabChange(tab);
                    }}
                    onNavigateRadar={() => handleTabChange('radar')}
                    onOpenRsiRadar={() => setIsRsiRadarOpen(true)}
                    marketStatus={marketStatus}
                  />
                </div>
              )}

              {activeTab === 'radar' && (
                <div className="p-3.5 w-full min-w-0">
                  <RadarScannerView
                    onSelectStock={handleSelectStock}
                    onOpenAlertModal={handleOpenAlertModal}
                    onToggleWatchlist={handleToggleWatchlist}
                    watchlistTickers={watchlistTickers}
                    onOpenRsiRadar={() => setIsRsiRadarOpen(true)}
                  />
                </div>
              )}

              {activeTab === 'rebound' && (
                <div className="p-3.5 w-full min-w-0">
                  <PlungeReboundView
                    onSelectStock={handleSelectStock}
                    onOpenAlertModal={handleOpenAlertModal}
                    onToggleWatchlist={handleToggleWatchlist}
                    watchlistTickers={watchlistTickers}
                    focusedAlertTicker={focusedAlertTicker}
                  />
                </div>
              )}

              {activeTab === 'quant' && (
                <div className="p-3.5 w-full h-full min-w-0 flex flex-col">
                  <QuantStrategyView
                    onSelectStock={handleSelectStock}
                    onOpenAlertModal={handleOpenAlertModal}
                    onToggleWatchlist={handleToggleWatchlist}
                    watchlistTickers={watchlistTickers}
                  />
                </div>
              )}

              {(activeTab === 'chart' || activeTab === 'detail') && (
                <div className="p-3.5 w-full min-w-0">
                  <StockDetailView
                    ticker={selectedTicker}
                    onBack={() => handleTabChange(previousTab || 'quant')}
                    onOpenAlertModal={handleOpenAlertModal}
                    isWatchlisted={watchlistTickers.includes(selectedTicker)}
                    onToggleWatchlist={handleToggleWatchlist}
                  />
                </div>
              )}

              {(activeTab === 'watchlist' || activeTab === 'alerts' || (isMobile && (activeTab === 'market' || activeTab === 'home'))) && (
                <div className="p-3.5 w-full min-w-0">
                  <WatchlistAndAlertsView
                    onSelectStock={handleSelectStock}
                    onOpenAlertModal={handleOpenAlertModal}
                    onOpenAddWatchlist={() => setIsAddWatchlistOpen(true)}
                    watchlistTickers={watchlistTickers}
                    onRemoveFromWatchlist={handleToggleWatchlist}
                    initialSubTab={activeTab === 'alerts' ? 'ALERT_RULES' : (activeTab === 'market' || activeTab === 'home') ? 'MARKET' : 'WATCHLIST'}
                    unreadAlertCount={unreadAlertCount}
                    onRefreshAlertCount={async () => {
                      const evts = await apiClient.getAlertEvents();
                      setUnreadAlertCount(evts.filter((e: AlertEvent) => !e.isRead).length);
                    }}
                    marketStatus={marketStatus}
                    onOpenRsiRadar={() => setIsRsiRadarOpen(true)}
                    onNavigateRadar={() => handleTabChange('radar')}
                    onNavigateTab={(tab: any) => handleTabChange(tab)}
                  />
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="p-3.5 w-full min-w-0">
                  <SettingsView onBack={() => handleTabChange(previousTab || 'watchlist')} />
                </div>
              )}
            </ErrorBoundary>
          </main>

          {/* 4. Mobile Navigation: ONLY on Mobile/Android, NEVER on Windows Desktop */}
          {isMobile && (
            <StockAlarmBottomNav
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              unreadAlertCount={unreadAlertCount}
            />
          )}
        </div>
      </div>

      {/* Modal 1: Universal TradingView Alert Modal */}
      <UniversalAlertModal
        isOpen={alertModalConfig.isOpen}
        onClose={() => setAlertModalConfig(prev => ({ ...prev, isOpen: false }))}
        ticker={alertModalConfig.ticker}
        stockName={alertModalConfig.stockName}
        currentPrice={alertModalConfig.currentPrice}
        currentChangePercent={alertModalConfig.currentChangePercent}
        currentRsi={alertModalConfig.currentRsi}
        initialDimension={alertModalConfig.initialDimension}
        onCreated={() => {
          setAlertModalConfig(prev => ({ ...prev, isOpen: false }));
          initData();
        }}
      />

      {/* Modal 2: Add To Watchlist Modal */}
      <AddToWatchlistModal
        isOpen={isAddWatchlistOpen}
        onClose={() => setIsAddWatchlistOpen(false)}
        watchlistTickers={watchlistTickers}
        onToggleWatchlist={handleToggleWatchlist}
        onSelectStock={(ticker) => {
          setIsAddWatchlistOpen(false);
          handleSelectStock(ticker);
        }}
      />

      {/* Modal 3: RsiRadar Interactive Modal */}
      <RsiRadarModal
        isOpen={isRsiRadarOpen}
        onClose={() => setIsRsiRadarOpen(false)}
        onSelectStock={(ticker) => {
          setIsRsiRadarOpen(false);
          handleSelectStock(ticker);
        }}
        onOpenAlertModal={handleOpenAlertModal}
        watchlistTickers={watchlistTickers}
        onToggleWatchlist={handleToggleWatchlist}
      />

      {/* Modal 4: Desktop Exit Application Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
      />

      {/* Modal 5: Android Mobile Gesture Exit & Background Daemon Modal */}
      <AndroidGestureExitModal
        isOpen={isAndroidGestureExitOpen}
        onClose={closeAndroidGestureExit}
      />
    </div>
  );
}
