# Implementation Plan: Professional US Stock Short-Term Analysis & Alert Terminal

## 1. Executive Strategy & Migration Principles
1. **Zero Greenfield Rewrite**: Retain the existing React 19, TypeScript, Vite, Tailwind CSS v4, Express, and quant calculation infrastructure.
2. **Deterministic & Verified Market Data**: No fake quotes or synthetic fallbacks disguised as live data; clear data freshness indicators (`Live`, `Delayed`, `Stale`, `Unavailable`).
3. **Dual Device Architecture**:
   - **Desktop (>=1024px)**: Left Navigation Sidebar + Dense Financial Workspace Table & Multi-panel Chart.
   - **Mobile (<1024px)**: Bottom Navigation + Compact Cards & Touch-Optimized Sheet Modals.
4. **Unified 5-Step Trader Loop**:
   $$\text{DISCOVER} \rightarrow \text{ANALYZE} \rightarrow \text{MONITOR} \rightarrow \text{ALERT} \rightarrow \text{REVIEW}$$

---

## 2. Phase-by-Phase Roadmap (Phase 0 – 12)

### Phase 0: Project Audit & Architectural Specification (COMPLETED)
- Deep repository scan and publication of audit documentation.
- Deliverables:
  - `/docs/PRODUCT_AUDIT.md`
  - `/docs/ARCHITECTURE_AUDIT.md`
  - `/docs/UI_UX_AUDIT.md`
  - `/docs/QUANT_AUDIT.md`
  - `/docs/ALERT_AUDIT.md`
  - `/docs/IMPLEMENTATION_PLAN.md`

---

### Phase 1: Domain Models, Unified Timezone & Data Quality Layer
- **Goal**: Establish canonical TypeScript domain models, New York exchange session clock, and strict data quality wrapping.
- **Affected Files**:
  - `src/types.ts`, `server/types.ts`
  - `server/services/marketDataProvider.ts`
  - `server/services/sessionClock.ts` (New)
- **Key Enhancements**:
  - Add `DataQualityTag` (`source`, `timestamp`, `receivedAt`, `marketSession`, `isDelayed`, `isExtendedHours`).
  - Cache key isolation: `${ticker}:${timeframe}:${session}`.
- **Testing**:
  - Verify cache isolation between 1h, 4h, and 1D bars for the same symbol.

---

### Phase 2: Next-Gen Alert Engine & State Machine
- **Goal**: Upgrade alert system to formal 8-State State Machine, composite multi-condition rule builder, bar-close deduplication, and decoupled notification dispatch.
- **Affected Files**:
  - `server/services/alertEngine.ts`
  - `server/services/notificationDispatcher.ts` (New)
  - `src/views/AlertsView.tsx`
  - `src/components/modals/StockAlarmAlertModal.tsx`
- **Key Enhancements**:
  - States: `DRAFT`, `ARMED`, `TRIGGERED`, `COOLDOWN`, `DISABLED`, `EXPIRED`, `INVALIDATED`, `ERROR`.
  - Composite dedupe key: `${alertId}:${ticker}:${timeframe}:${barTimestamp}`.
  - UI separation: Condition vs Current Value vs Last Trigger Value.

---

### Phase 3: Professional Screener Table & Extensible Filter Registry
- **Goal**: Replace bulky cards with a dense, sortable, resizable institutional table on desktop and compact card hybrid on mobile.
- **Affected Files**:
  - `server/services/screenerService.ts`
  - `src/views/ScreenerView.tsx`
  - `src/components/screener/ScreenerTable.tsx` (New)
  - `src/components/screener/FilterRegistry.ts` (New)
- **Key Enhancements**:
  - Columns: Ticker, Name, Price, Change %, Volume, RelVol, RSI(14), Trend, Momentum, ATR %, Setup, Alert Status, Quick Actions.
  - Saved screen presets (Oversold Reversal, Breakout, Pullback, High RelVol).

---

### Phase 4: First-Class Chart Workspace & Trade Setup Overlay
- **Goal**: Elevate chart into a top-level primary workspace with Binance-grade precision, multi-panel sync, and on-chart Entry / Stop / Target overlay.
- **Affected Files**:
  - `src/views/ChartWorkspaceView.tsx` (New)
  - `src/views/StockDetailView.tsx`
  - `src/components/charts/TradeSetupOverlay.tsx` (New)
- **Key Enhancements**:
  - Independent primary navigation entry (`CHART`).
  - Crosshair, time, and hover synchronization across main K-line, RSI 6/14/24, and Volume panels.
  - Visual setup targets (Entry Zone, Structural Stop, Target 1, Target 2, R:R badge).

---

### Phase 5: Modernized Watchlist with Sparklines & Quick Actions
- **Goal**: Transform watchlist from simple RSI list into a high-density monitoring hub.
- **Affected Files**:
  - `src/views/WatchlistView.tsx`
  - `src/components/common/QuickActionMenu.tsx` (New)
- **Key Enhancements**:
  - Compact row with mini trend sparkline, Relative Volume, Wilder RSI, Setup status, and Alert badge.
  - One-click Quick Actions (Open Chart, Set Alert, View Setup, Copy Ticker).

---

### Phase 6: Market Dashboard (Regime, S&P Sectors & RSI Radar)
- **Goal**: Re-engineer home view into comprehensive US Market Dashboard.
- **Affected Files**:
  - `src/views/HomeView.tsx` -> `src/views/MarketDashboardView.tsx`
  - `server/services/marketRegimeService.ts` (New)
- **Key Enhancements**:
  - Top US Indices (SPY, QQQ, VIX) with live market session clock and trend regime.
  - 11 S&P Sectors performance and relative strength.
  - Re-scaled RSI Reversal Radar focusing on oversold/overbought recovery rather than raw RSI < 30.

---

### Phase 7: Quantitative Setup Engine
- **Goal**: Institutional short-term setup identification with confidence ratings and validation triggers.
- **Affected Files**:
  - `server/quant/setupEngine.ts` (New)
  - `server/quant/indicators.ts` (New: ATR, ROC, MACD, EMAs)
- **Key Setups**:
  - Pullback to Rising EMA, Oversold Recovery, Bullish Divergence, Momentum Breakout, Range Support Bounce, Resistance Rejection, Bearish Divergence.

---

### Phase 8: Systematic Risk & Position Sizing Engine
- **Goal**: Mathematical trade planning with structural stop loss, ATR volatility stop, risk/reward assessment, and share calculator.
- **Affected Files**:
  - `server/quant/riskEngine.ts` (New)
  - `src/components/common/PositionSizeModal.tsx` (New)
- **Key Principles**:
  - Structure stop takes priority; hard maximum 5.0% risk cap.
  - If structural stop > 5.0%, flag as `INVALID_RISK`.
  - Position sizing based on Account Size and Risk % per trade.

---

### Phase 9: Short-Term Trading Dashboard (1–10 Day Horizon)
- **Goal**: Dedicated workspace filtering top active setups across the market with direct risk metrics and execution checklists.
- **Affected Files**:
  - `src/views/ShortTermDashboardView.tsx` (New)

---

### Phase 10: Performance, Responsiveness & Accessibility (A11y)
- **Goal**: Virtualization, memoized render rows, keyboard navigation, focus states, and color-independent semantic indicators.

---

### Phase 11: Unit & Integration Testing Suite
- **Goal**: Add automated tests for RSI calculation, bar aggregation, alert deduplication, cooldown, cache isolation, and risk math.

---

### Phase 12: Commercial Polish & Production Hardening
- **Goal**: Comprehensive error boundaries, offline/stale banners, API latency observability, and clean build verification.

---

## 3. Major Architecture Decisions (ADRs)

| Decision | Why | Impact | Risk | Rollback |
| :--- | :--- | :--- | :--- | :--- |
| **ADR 1: Dual Layout (Sidebar on Desktop, BottomNav on Mobile)** | Professional traders need multi-column density on desktop while preserving single-hand mobile ease. | Low complexity, massive UX upgrade. | Responsive breakpoint edge cases (tablet). | Fall back to top navigation. |
| **ADR 2: Cache Key Isolation by Timeframe & Session** | Prevents intraday and daily bars from contaminating each other during pre/post-market transitions. | Eliminates data ghosting and chart anomalies. | Minor memory increase. | Revert to simple `${ticker}_${tf}` key. |
| **ADR 3: 8-State Alert Lifecycle** | Eliminates confusing UI states where users cannot tell if an alert is active, cooling down, or triggered. | Clear operational feedback. | Migration of existing alert JSON. | Map legacy `isEnabled` to `ARMED`/`DISABLED`. |
| **ADR 4: Decouple Indicator Condition from Setup** | RSI < 30 is not a buy signal; requires price structure confirmation and risk validation. | Protects users from catching falling knives in severe downtrends. | None; establishes institutional credibility. | N/A |
| **ADR 5: Extensible Filter Registry Pattern** | Screener filters need to support 15+ metrics without spaghetti if-else chains. | Clean modular architecture; easy to add MACD, ATR, etc. | None. | N/A |
