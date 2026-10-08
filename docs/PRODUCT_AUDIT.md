# Product Audit: US Stock Short-Term Analysis & Alert Terminal

## 1. Executive Summary & Product Positioning
- **Target Persona**: Active US stock swing & day traders focusing on 1–10 day momentum, mean reversion, and technical breakout setups.
- **Current State**: A working prototype focused on Wilder RSI scanning, single-stock Binance-styled K-line charts, and basic RSI alerts.
- **Target Commercial State**: **Professional US Stock Short-Term Analysis & Alert Terminal** integrating full-market regime context, sector rotation, multi-timeframe confirmation, multi-condition rule alerts, systematic setup detection, and mathematical risk/position management.

---

## 2. Capability Matrix

### A. Fully Implemented Capabilities (A)
1. **Real-time & Historical Market Data Feed**:
   - Live quotes and historical OHLCV via Yahoo Finance v8 chart integration.
   - Intraday & Daily/Weekly timeframe bar generation (10m, 30m, 1h, 2h, 4h, 1D, 1W, 1M).
2. **Wilder Smoothed RSI Engine**:
   - Exact mathematical implementation of J. Welles Wilder Jr. exponential smoothing (alpha = 1/N).
   - Support for arbitrary periods (6, 9, 14, 21, 24, 30).
3. **Binance-Grade K-Line Visualization**:
   - SVG-rendered Candlestick & Area charts with right-side price Y-axis and live price horizontal badge.
   - MA(7/25/99) overlaid moving averages and Bollinger Bands (20, 2).
   - High/Low price horizontal marker lines.
   - Multi-period RSI(6/14/24) 3-line sub-chart and Volume sub-chart with volume moving averages.
4. **Dynamic Global Stock Search**:
   - Hybrid local core asset universe + Yahoo Finance autocomplete search for any valid US equity/ETF.
5. **Basic Browser Notifications**:
   - Web Notification API permission management and trigger alerts.

### B. Partially Implemented Capabilities (B)
1. **Stock Screener**:
   - Supports basic filtering by market, sector, market cap, and RSI presets (Oversold 20/25/30/35, Overbought 70/75/80).
   - *Limitation*: Card-based rendering with low information density; lacks customizable multi-column sorting, ATR, Relative Volume, Momentum, or saved screen presets.
2. **Alert Engine**:
   - Evaluates single-condition RSI thresholds (`RSI_LTE`, `RSI_GTE`, `CROSS_BELOW_30`, `CROSS_ABOVE_70`, `RSI_BETWEEN`).
   - *Limitation*: Simple binary active/inactive state; no multi-condition AND/OR builder; no bar-close vs intrabar distinction; basic 15-minute global cooldown without per-bar dedupe keys.
3. **Trend & Divergence Diagnosis**:
   - Local extrema finding and basic peak/trough divergence check on historical bars.
   - *Limitation*: Rule evaluation only occurs on the client or during single stock lookup; lacks multi-timeframe bias matrix aggregation.

### C. Missing Capabilities (C)
1. **Market Regime & Sector Rotation**:
   - No SPY/QQQ/VIX regime analysis or sector relative strength dashboard.
2. **Short-Term Setup Engine**:
   - Lacks formal setup definitions (Pullback, Breakout, Oversold Recovery, Support Bounce, Range Break).
   - RSI < 30 is still ambiguously framed as "buy" rather than an indicator condition.
3. **Risk & Position Size Engine**:
   - No automated Entry / Stop / Target / R:R ratio calculation.
   - No structure-based invalidation levels or capital-at-risk position calculator.
4. **First-Class Chart Workspace**:
   - Chart is currently embedded inside Stock Detail modal/tab rather than a dedicated primary navigation destination.
5. **Multi-Condition Alert Engine**:
   - Cannot create composite alerts like `(RSI < 30 AND Price > EMA20 AND Volume > 1.2x AvgVol)`.
6. **Data Quality & Session Tracking**:
   - No visual indicator of data freshness (Live vs Delayed vs Stale vs Source Unavailable).

---

## 3. Product Bugs & Risks

### D. Identified Bugs (D)
1. **Alert Display Discrepancy**:
   - Alert list displays rule condition (e.g. `RSI ≤ 30`) while showing current live RSI (e.g. `56.6`) without distinguishing between "Rule Threshold", "Current Value", and "Last Triggered Value", confusing users into thinking the condition is currently active.
2. **Watchlist Persistence Gap**:
   - Default watchlist is in-memory on the backend and resets when server restarts; client localStorage sync is incomplete.

### E. Financial & Data Risks (E)
1. **Indicator Confusion**:
   - Calling RSI < 30 a "Dip Buy signal" creates pseudo-financial guarantee risks. It must be strictly framed as an Oversold Indicator Condition requiring price confirmation.
2. **Unverified Fallback Data Risk**:
   - If upstream quotes fail, fallback bars must be clearly flagged as synthetic or delayed rather than indistinguishable from live market feeds.

### F. User Experience Bottlenecks (F)
1. **Low Information Density**:
   - Desktop displays oversized mobile cards, wasting 70% of available screen real estate.
2. **Fragmented Workflow**:
   - Users cannot perform Quick Actions (e.g., right-click or tap dropdown to Open Chart, Add Watchlist, Set Alert, Calculate Risk) across list views.

---

## 4. Architectural Recommendations

### H. Code to Retain (H)
- `server/services/rsiEngine.ts`: Classic Wilder smoothing calculation.
- `server/services/marketDataProvider.ts`: Yahoo Finance v8 fetching pipeline and `aggregateBars`.
- `src/components/common/StockLogo.tsx` and `VerticalRsiSlider.tsx`: High-polish UI primitives.
- Existing API endpoint contracts (extend, do not break).

### I. Code to Refactor (I)
- `server/services/alertEngine.ts`: Refactor into formal Alert State Machine (`DRAFT`, `ARMED`, `TRIGGERED`, `COOLDOWN`, `DISABLED`, `EXPIRED`, `INVALIDATED`) with multi-condition evaluator.
- `src/views/ScreenerView.tsx`: Replace cards with dense sortable/resizable table on desktop and compact cards on mobile.
- `server/services/screenerService.ts`: Refactor into an extensible Filter Registry pattern.
- `src/views/AlertsView.tsx`: Redesign with clear Condition vs Current Value vs Last Trigger Value separation.

### J. New Modules to Add (J)
- `/server/quant/setupEngine.ts`: 10 institutional short-term setups with confidence scoring.
- `/server/quant/riskEngine.ts`: Structure & ATR-based Stop, Target, Risk/Reward, and Position Sizing.
- `/server/services/marketRegimeService.ts`: SPY, QQQ, VIX regime & 11 S&P sectors relative performance.
- `/src/views/ChartWorkspaceView.tsx`: First-class interactive chart workspace with Trade Setup Overlay.
- `/src/views/MarketDashboardView.tsx`: Market Session, SPY/QQQ/VIX regime, Sector Heatmap, and RSI Reversal Radar.
