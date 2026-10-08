# P0 DATA INTEGRITY REMEDIATION PLAN
**V6.5 US Stock AI Scanner & Alert**

## 1. P0 DATA SOURCE REPLACEMENT PLAN

| Domain | Current Source | Current Classification | Target Source | Target Classification | Required API Changes | Required DB Changes | Required Frontend Changes | Dependencies | Risk | Rollback Plan |
|---|---|---|---|---|---|---|---|---|---|---|
| **Quote** | `marketDataProvider.ts` (Yahoo v8) | REAL | External API (e.g. Polygon / Finnhub) | REAL | Expand provenance fields | None | Minimal UI parsing | API Keys, SDK | Low | Revert to Yahoo |
| **Historical OHLCV** | `marketDataProvider.ts` (Yahoo) | REAL | Hybrid Local Cache + External API | REAL | Provenance fields | Add Local Cache schema | None | DB driver | Low | Revert to Yahoo |
| **Fundamentals** | `fundamentalProvider.ts` | HARDCODED | External API (e.g. FMP / Finnhub) | REAL | None | Cache schema | Handle `UNAVAILABLE` | External SDK | Med | Revert to KNOWN_DATA |
| **Earnings** | `analystProvider.ts` | SYNTHESIZED | External API | REAL | None | Cache schema | Handle `UNAVAILABLE` | External SDK | Med | Revert to math synthesis |
| **Analyst Ratings** | `analystProvider.ts` | SYNTHESIZED | External API | REAL | None | Cache schema | Handle `UNAVAILABLE` | External SDK | Med | Revert to math synthesis |
| **Price Targets** | `analystProvider.ts` | SYNTHESIZED | External API | REAL | None | Cache schema | Handle `UNAVAILABLE` | External SDK | Med | Revert to math synthesis |
| **Forecasts** | `analystProvider.ts` | SYNTHESIZED | External API | REAL | None | Cache schema | Handle `UNAVAILABLE` | External SDK | Med | Revert to math synthesis |
| **News** | `newsProvider.ts` | SYNTHESIZED | External API (e.g. Benzinga/Polygon) | REAL | None | Cache schema | Handle `UNAVAILABLE` | External SDK | Low | Revert to dummy strings |
| **Events** | `newsProvider.ts` | SYNTHESIZED | External API | REAL | None | Cache schema | Handle `UNAVAILABLE` | External SDK | Low | Revert to dummy items |
| **Options** | `optionsProvider.ts` | SYNTHESIZED | External API / Polygon | REAL | None | Cache schema | Handle `UNAVAILABLE` | External SDK | Med | Revert to dummy flow |
| **Options Flow**| `optionsProvider.ts` | SYNTHESIZED | External API | REAL | None | Cache schema | Handle `UNAVAILABLE` | External SDK | Med | Revert to dummy flow |
| **Tech Indicators** | `indicators.ts` | DERIVED_FROM_REAL | Derived from Target OHLCV | DERIVED_FROM_REAL | None | None | None | None | Low | Revert to old OHLCV feed |
| **Quant Scores** | `strategyScoringEngine` | DERIVED_FROM_REAL | Derived from Target OHLCV | DERIVED_FROM_REAL | None | None | None | None | Low | None |
| **Strategy Signals**| `screenerService` | DERIVED_FROM_REAL / MOCK | Derived from Target OHLCV | DERIVED_FROM_REAL | Remove UI fallback | None | Remove `mockMatches` fallback | None | Low | Add fallback back |
| **Backtest** | `backtestValidationEngine.ts` | SYNTHESIZED | Target Historical OHLCV | DERIVED_FROM_REAL | Add date/symbol params | Add bulk history DB | Render real metrics | History Store | High | Revert to sine waves |
| **Risk** | `riskEngine.ts` | DERIVED_FROM_REAL | Unchanged (Uses real quote) | DERIVED_FROM_REAL | None | None | None | None | Low | None |
| **Alerts** | `alertEngine.ts` | REAL | Target Quote API | REAL | None | None | None | FCM / WebSockets | Med | Revert to Yahoo polling |

---

## 2. BACKTEST REPLACEMENT ARCHITECTURE

### Current Flow
`POST /api/quant/backtest/run` 
↓ `backtestEngine.simulateBacktest()`
↓ `BacktestValidationEngine.generateStandardValidationDataset()` (Sine/Cosine mathematical waves generation)
↓ `executePartitionBacktest()` evaluates AST Strategy rules against the fake waves
↓ Trade simulation runs on fake waves
↓ Statistics/Metrics calculated
↓ Response returned to frontend

### Target Replacement Flow
`REAL HISTORICAL OHLCV` (from local DB or External Provider)
↓ **Data Adapter**: Fetches and normalizes actual $TICKER historical bars based on requested date range.
↓ **Backtest Dataset**: Strictly partitioned by date (Train/Test or IS/OOS).
↓ **Strategy Engine**: Evaluates AST rules against the real historical dataset at $T=n$.
↓ **Execution Simulator**: Executes triggered trades at $T=n+1$ (Open) or $T=n$ (Close) to strictly prevent **lookahead bias**.
↓ **Transaction Costs / Slippage**: Applies parameterized commission ($) and slippage (%) models.
↓ **Risk Engine**: Applies position sizing rules based on trailing ATR / trailing Stop-Loss.
↓ **Metrics**: Calculates CAGR, Sharpe, Max Drawdown, Win Rate, Expectancy on actual filled trades.
↓ **OOS Validation**: Cross-checks In-Sample vs Out-of-Sample stability.

### Requirements Guaranteed
- No synthetic price generation in production backtests.
- No lookahead (Signal at $T$ executes at $T+1$ Open).
- Explicit IS/OOS date separation based on parameters.
- Explicit slippage and corporate-action adjustments (Split-adjusted prices).
- Reproducible deterministic results.

---

## 3. BACKTEST DATABASE / DATA STORAGE OPTIONS

| Option | Cost | Latency | Bulk Backtest Scalability | Data Freshness | Storage | Rate Limits | Reliability | Implementation Complexity |
|--------|------|---------|---------------------------|----------------|---------|-------------|-------------|---------------------------|
| **A. SQLite OHLCV** | Free (Local) | Low (Disk) | Low (Row-by-row limit) | Stale unless cron synced | Bloated (>50GB quickly) | None | High | Medium |
| **B. Local Parquet/CSV** | Free (Local) | Ultra-Low (DuckDB/Arrow) | Very High (Columnar) | Requires manual/ETL sync | Compact | None | High | High (Needs DuckDB) |
| **C. External API (Live)** | High ($$) | High (Network) | Terrible (OOM/Timeouts) | Real-time | None | Severe | Low | Low |
| **D. Hybrid Cache + API** | Medium | Low (Once cached) | Moderate | Lazy-loaded / Real-time | Medium (SQLite/Redis) | Moderate | Medium | Medium |

**Recommendation:** **Option D (Hybrid Local Cache + External API)**.
*Why?* Option D preserves the current stateless API architecture while gradually building a local historical SQLite cache for requested symbols. For heavy institutional bulk backtesting across 8,000 tickers, Option B (Parquet + DuckDB) is superior, but for the immediate scale of this V6.5 app, Option D is the lowest risk and fastest to implement without over-engineering data pipelines.

---

## 4. MOCK / FALLBACK POLICY

### Production State Definitions
- **REAL**: Real-time or verified historical data from a certified provider. (Allowed in Production)
- **DERIVED_FROM_REAL**: Data computed locally (e.g., RSI) using REAL data inputs. (Allowed in Production)
- **MOCK**: Hardcoded static JSON structures used for UI scaffolding. (**FORBIDDEN** in Production)
- **SYNTHESIZED**: Mathematically generated approximations (e.g., Sine-wave prices, estimated Analyst ratings). (**FORBIDDEN** in Production)
- **FALLBACK**: Stale REAL data used temporarily when the live provider fails. (Allowed with warning)
- **UNAVAILABLE**: The requested data point does not exist or failed to load. (Allowed in Production)

### Policy Rules
1. APIs must never return fabricated financial values on failure. They must return an `UNAVAILABLE` state.
2. Frontend components must render "N/A", "---", or hide the component entirely when data is `UNAVAILABLE`.
3. APIs must expose data provenance in a top-level `meta` field (see Section 8).

### Standard Fallback Payload Example
```json
{
  "status": "UNAVAILABLE",
  "data": null,
  "meta": {
    "source": null,
    "classification": "UNAVAILABLE",
    "timestamp": "2026-10-03T10:00:00Z",
    "reason": "UPSTREAM_TIMEOUT"
  }
}
```

---

## 5. RADAR 79.2% REMEDIATION PLAN

| File | Line(s) | Current Behavior | Target Replacement Source | API Contract | Frontend Consumer |
|---|---|---|---|---|---|
| `RadarScannerView.tsx` | 103 | Hardcodes `'...回归历史胜率79.2%...'` | Backend `ScreenerResponse.recommendation` | `ExtendedScreenerItem.factorRecommendation` | Radar Data Grid |
| `RadarScannerView.tsx` | Various | Hardcodes recommendation strings based on RSI thresholds | Backend `factorEngine.ts` | `ExtendedScreenerItem.factorRecommendation` | Radar Data Grid |
| `StockDetailView.tsx` | 953 | Hardcodes `79.2 / 100` OOS Score | Backend `StockDetailViewModel.quantIntelligence.oosScore` | `quantIntelligence.oosScore` | Detail View - Quant Panel |
| `StockDetailView.tsx` | 1191 | Hardcodes `79.2` OOS Win Rate | Backend `StockDetailViewModel.quantIntelligence.oosWinRate` | `quantIntelligence.oosWinRate` | Detail View - Quant Panel |
| `QuantStrategyView.tsx`| 188-210 | Falls back to `mockMatches` on API fail | `UNAVAILABLE` / Show Error Toast | N/A | Strategy Screener Grid |

**Remediation:** 
All hardcoded strings will be removed from the UI. The UI will render `item.factorRecommendation` strictly from the API response. If the backend cannot calculate a REAL_BACKTEST or DERIVED_SIGNAL score, it will return `UNAVAILABLE` and the UI will omit the recommendation label.

---

## 6. STOCK DETAIL REMEDIATION

### Provider Interfaces Architecture
We will preserve the existing `StockDetailService` orchestration but rewire the underlying providers to strictly implement this interface:

```typescript
interface DataProviderResponse<T> {
  status: 'SUCCESS' | 'FALLBACK' | 'UNAVAILABLE';
  data: T | null;
  meta: ProvenanceMeta;
}

interface IStockProvider<T> {
  fetch(ticker: string, options?: any): Promise<DataProviderResponse<T>>;
}
```

### Provider Map
- **QuoteProvider**: Source: `Polygon/Finnhub`. Fallback: `Yahoo`. Freshness: Real-time. Failure: `UNAVAILABLE`.
- **FundamentalProvider**: Source: `FMP / Alpha Vantage`. Fallback: Stale Cache. Freshness: Daily. Failure: `UNAVAILABLE` (Remove `KNOWN_DATA`).
- **EarningsProvider**: Source: `FMP / Finnhub`. Freshness: Daily. Failure: `UNAVAILABLE`.
- **AnalystProvider**: Source: `Finnhub`. Freshness: Daily. Failure: `UNAVAILABLE` (Remove synthetic math).
- **NewsProvider**: Source: `Benzinga / Polygon`. Freshness: 10 mins. Failure: `UNAVAILABLE`.
- **OptionsProvider**: Source: `Polygon Options`. Freshness: 15 mins. Failure: `UNAVAILABLE`.

---

## 7. API COMPATIBILITY

Existing API responses (like `StockDetailViewModel` and `BacktestResult`) are massive, deeply nested objects.

**Backward Compatibility Strategy:**
- We will NOT change the core structure of the response objects.
- We will augment the root of the response with a `_meta` object containing the `ProvenanceMeta`.
- Properties that were previously populated with MOCK data will now return `null` or empty arrays `[]` if the real external API does not supply that data.
- Frontend React components currently use optional chaining (`?.`), but we must verify that all UI components gracefully handle `null` without crashing.

**Deprecation:**
- No endpoints will be deleted.
- No strategy IDs will be renamed. The core AST engine expects the current schemas.

---

## 8. DATA PROVENANCE

We will introduce a standard reusable TypeScript interface across the backend and frontend:

```typescript
type DataClassification = 'REAL' | 'DERIVED_FROM_REAL' | 'FALLBACK' | 'UNAVAILABLE';

interface ProvenanceMeta {
  source: string | null;           // e.g., 'YAHOO_FINANCE_V8', 'POLYGON_IO'
  classification: DataClassification;
  timestamp: string;               // ISO-8601 execution time
  calculationMethod?: string;      // e.g., 'SMA_20', 'AST_EVAL'
  symbol?: string;
  period?: string | number;
}
```

---

## 9. VALIDATION PLAN

Before declaring P0 Data Integrity fixed, we will execute the following test suites:

1. **Synthetic Data Purge Test**: Search the entire AST execution path for any call to `Math.sin()` or hardcoded `KNOWN_DATA`.
2. **Backtest Lookahead Test**: Pass a dataset where $T=10$ triggers a Buy, ensure trade execution uses open price at $T=11$.
3. **Reproducibility Test**: Run Backtest A twice; assert identical equity curves down to the 4th decimal.
4. **OOS Separation Test**: Ensure statistics accurately split `In-Sample` and `Out-of-Sample` metrics without data leakage.
5. **No-Mock UI Test**: Disconnect the external API (simulate timeout). Verify the frontend displays empty states without crashing or falling back to `mockMatches` or `79.2%`.
6. **Data Type Test**: Ensure all missing values return standard `null` rather than `0` (which implies a value).

---

## 10. IMPLEMENTATION ORDER

- **P0-A: Clean Frontend Mocks & Hardcodes**
  - **Scope**: Remove `mockMatches` from `QuantStrategyView.tsx` and hardcoded `79.2%` strings from `RadarScannerView.tsx` & `StockDetailView.tsx`.
  - **Dependencies**: None.
  - **Rollback**: Git revert UI files.

- **P0-B: Backtest Engine Real-Data Integration**
  - **Scope**: Deprecate `generateStandardValidationDataset`. Wire `simulateBacktest` to request real OHLCV arrays via `marketDataProvider.ts`.
  - **Dependencies**: Requires `marketDataProvider` to handle deeper historical ranges reliably.
  - **Rollback**: Restore sine-wave generator invocation.

- **P0-C: Provenance Infrastructure**
  - **Scope**: Add `ProvenanceMeta` to `types.ts`. Implement the `DataProviderResponse` wrapper.
  - **Dependencies**: None.

- **P0-D: Stock Detail Providers Overhaul**
  - **Scope**: Rewrite `fundamentalProvider`, `analystProvider`, `newsProvider`, and `optionsProvider` to hit real APIs (or return `UNAVAILABLE`) instead of synthesizing data.
  - **Dependencies**: P0-C Provenance wrapper.
  - **Rollback**: Revert providers to synthetic logic.

---

## 11. CONFLICT DETECTION

**[NO NEW CONFLICTS DETECTED]**
- The Actual Code, TAKEOVER_REPORT.md, and Project Context align perfectly with the remediation plan designed above.
- The plan successfully addresses the Backtest Sine-wave conflict and the Frontend Radar Mock conflict discovered during the Takeover phase.

---

## 12. FINAL GATE

**READY FOR IMPLEMENTATION: YES**

*(Implementation remains STOPPED as per instructions. Do not modify any code.)*
