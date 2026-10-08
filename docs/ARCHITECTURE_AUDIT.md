# Architecture Audit: Full-Stack System & Data Flow

## 1. Current Architectural Blueprint
```
[ Client: React 19 + Tailwind CSS v4 SPA ]
          │ (HTTP REST / JSON)
          ▼
[ Server: Node.js + Express 4.x + TSX ]
    ├── API Router (/api/*)
    ├── Services
    │     ├── marketDataProvider (Yahoo v8 chart + in-memory cache)
    │     ├── rsiEngine (Wilder Smoothing)
    │     ├── alertEngine (In-memory setInterval worker)
    │     ├── screenerService (Candidate filter + quote enrichment)
    │     └── stockUniverse (Static list + live dynamic search)
```

---

## 2. Architecture Strengths & Reusable Assets
1. **Zero External DB Dependency**:
   - The app runs self-contained on Port 3000 without requiring complex database provisioning while remaining fast.
2. **Deterministic Mathematical Engines**:
   - `calculateWilderRSI` is pure and functional, ensuring deterministic output given identical OHLCV inputs.
3. **Resilient Data Aggregation**:
   - `aggregateBars` properly aggregates 1h chunks into 2h/4h intervals with volume accumulation and timestamp preserving.

---

## 3. Architectural Risks & Flaws (G)

### Risk 1: Cache Cross-Contamination & Granularity
- **Current State**:
  - `quoteCache` key is `${ticker}_${period}_${timeframe}`.
  - `historyCache` key is `${ticker}_${timeframe}`.
- **Problem**:
  - Does not encode market session (Regular vs Pre/Post market).
  - Quotes and history can become desynchronized if fetched during market transition periods.
- **Remedy**:
  - Upgrade cache keys to `${ticker}:${timeframe}:${session}` and attach `receivedAt`, `dataQuality`, and `source` metadata.

### Risk 2: In-Memory Alert Engine Fragility
- **Current State**:
  - `alerts` and `events` arrays are stored in a simple Node.js class instance.
  - Periodic scanning is done via a single `setInterval(..., 2 * 60 * 1000)` running a linear `for...of` loop over all alerts.
- **Problem**:
  - An unhandled error or network timeout on one stock can delay or block the scan of remaining alerts.
  - Lacks concurrency throttling, backoff, and deduplication keys (`ticker:alertId:conditionId:barTime`).
- **Remedy**:
  - Implement `ScanScheduler` with `Promise.allSettled`, per-symbol error boundaries, exponential backoff, and cooldown dedupe keys.

### Risk 3: Client State Fragmentation
- **Current State**:
  - `App.tsx` holds `watchlistTickers`, `selectedTicker`, `marketStatus`, and modal state, passing them via props.
  - Each view independently fetches its own quotes and histories, leading to redundant network calls when switching between Watchlist, Screener, and Detail views.
- **Remedy**:
  - Centralize server-state caching on the frontend via a unified query hook or state store, keeping Server State, UI State, and Derived State strictly separated.

---

## 4. Recommended Full-Stack Architecture Target

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER (React 19)                   │
├────────────────────────────────────────────────────────────────────────┤
│  Top Navigation & Global Market Status Bar (Session, Freshness, ET)    │
│  ├── MARKET (Regime, S&P Sectors, Movers, Reversal Radar)              │
│  ├── SCREENER (Professional Dense Table, Filter Registry, Presets)     │
│  ├── WATCHLIST (Compact Row, Mini Sparkline, Quick Actions)            │
│  ├── CHART WORKSPACE (Binance-Grade, Multi-Indicator, Setup Overlay)   │
│  ├── SHORT-TERM SETUPS (10 Core Setups, R:R Calculator, Invalidation)  │
│  └── ALERTS (State Machine, Multi-Condition Builder, History Log)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Unified Client API Client
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION & API LAYER (Express)               │
├────────────────────────────────────────────────────────────────────────┤
│  /api/market/*        /api/stocks/*       /api/screener/*              │
│  /api/setups/*        /api/risk/*         /api/alerts/*                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     DOMAIN & QUANTITATIVE SERVICES                     │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ MarketDataService │ SetupEngine       │ RiskEngine                     │
│ - Yahoo v8 Chart  │ - Pullback        │ - Structure Stop               │
│ - Freshness Tag   │ - Breakout        │ - ATR Invalidation             │
│ - Session Clock   │ - Reversal        │ - Position Sizing Calculator   │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ Multi-TF Matrix   │ AlertStateMachine │ ScanScheduler Worker           │
│ - 30m / 1H / 4H   │ - 8 States        │ - Error Isolation              │
│ - 1D / 1W Align   │ - Multi-Condition │ - Dedupe Key                   │
└───────────────────┴───────────────────┴────────────────────────────────┘
```
