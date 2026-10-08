# P0_REMEDIATION_PLAN_V2.md

## STEP 1 — CURRENT P0 PROBLEM INVENTORY

### P0-DATA-01: Synthetic historical fallback
- **Severity**: P0
- **Evidence**: `server/services/marketDataProvider.ts` invokes `generateFallbackHistoricalBars` on API failure or offline mode. This generates a synthetic price series around a base price of 150.0.
- **Affected files**: `server/services/marketDataProvider.ts`
- **Affected APIs**: `/api/stocks/:ticker/history`, `/api/stocks/:ticker/quote`
- **Affected UI**: All charts and technical indicators.
- **Data integrity risk**: High. Users will see fake price action.
- **Why it matters**: A financial app cannot show fake prices.
- **Verified**: Yes.

### P0-DATA-02: Synthetic backtest dataset
- **Severity**: P0
- **Evidence**: `server/quant/backtest/backtestValidationEngine.ts` generates prices using `Math.sin()` and `Math.cos()` for backtesting.
- **Affected files**: `server/quant/backtest/backtestValidationEngine.ts`
- **Affected APIs**: `/api/quant/backtest/run`
- **Affected UI**: Strategy details, performance graphs.
- **Data integrity risk**: Critical. Backtest results are mathematically meaningless.
- **Why it matters**: Traders rely on backtest results to risk capital.
- **Verified**: Yes.

### P0-DATA-03: Hardcoded Quant metrics
- **Severity**: P0
- **Evidence**: `server/services/stockDetail/quantProvider.ts` hardcodes `compositeScore: 86.5`, `winRate: 58.5`, `cagr: 24.6`, and others.
- **Affected files**: `server/services/stockDetail/quantProvider.ts`
- **Affected APIs**: `/api/stocks/:ticker/detail` (quant data block)
- **Affected UI**: Stock Detail Quant Panel.
- **Data integrity risk**: Critical. Quant scores do not reflect actual market conditions.
- **Why it matters**: Gives a false sense of strategy effectiveness.
- **Verified**: Yes.

### P0-DATA-04: Hardcoded frontend performance metrics
- **Severity**: P0
- **Evidence**: 79.2% win rate and factor recommendation strings were hardcoded in `RadarScannerView.tsx` and `StockDetailView.tsx`. (Note: partially mitigated by P0-A, but originally present).
- **Affected files**: `src/views/RadarScannerView.tsx`, `src/views/StockDetailView.tsx`
- **Affected APIs**: N/A (Frontend hardcodes)
- **Affected UI**: Radar Screener, Stock Detail.
- **Data integrity risk**: Critical.
- **Why it matters**: Misleads users about AI recommendations.
- **Verified**: Yes.

### P0-DATA-05: Synthetic fundamentals
- **Severity**: P0
- **Evidence**: `server/services/stockDetail/fundamentalProvider.ts` uses a `KNOWN_DATA` lookup for AAPL, NVDA, MSFT, TSLA, and generates fake fundamentals scaled to market cap for others.
- **Affected files**: `server/services/stockDetail/fundamentalProvider.ts`
- **Affected APIs**: `/api/stocks/:ticker/detail` (fundamentals data block)
- **Affected UI**: Stock Detail Financials Tab.
- **Data integrity risk**: High.
- **Why it matters**: Fundamentals are fabricated.
- **Verified**: Yes.

### P0-DATA-06: Synthetic analyst data
- **Severity**: P0
- **Evidence**: `server/services/stockDetail/analystProvider.ts` synthesizes consensus targets based on `currentPrice` (e.g., `highTarget = currentPrice * 1.32`).
- **Affected files**: `server/services/stockDetail/analystProvider.ts`
- **Affected APIs**: `/api/stocks/:ticker/detail` (forecasts data block)
- **Affected UI**: Stock Detail Forecasts Tab.
- **Data integrity risk**: High.
- **Why it matters**: False analyst recommendations.
- **Verified**: Yes.

### P0-DATA-07: Synthetic forecasts
- **Severity**: P0
- **Evidence**: Included in `analystProvider.ts` generating fake EPS history and surprises.
- **Affected files**: `server/services/stockDetail/analystProvider.ts`
- **Affected APIs**: `/api/stocks/:ticker/detail` (forecasts data block)
- **Affected UI**: Stock Detail Forecasts Tab.
- **Data integrity risk**: High.
- **Why it matters**: Misleading financial projections.
- **Verified**: Yes.

### P0-DATA-08: Synthetic news/events
- **Severity**: P0
- **Evidence**: `server/services/newsCenterService.ts` seeds `newsStore` with static JSON news items.
- **Affected files**: `server/services/newsCenterService.ts`, `server/services/stockDetail/newsProvider.ts`
- **Affected APIs**: `/api/stocks/:ticker/detail` (news data block)
- **Affected UI**: Stock Detail News Tab.
- **Data integrity risk**: High.
- **Why it matters**: Fake news events.
- **Verified**: Yes.

### P0-DATA-09: Synthetic options/options flow
- **Severity**: P0
- **Evidence**: `server/services/stockDetail/optionsProvider.ts` hardcodes implied volatility (`42.8`), IV Rank, and puts/calls volume.
- **Affected files**: `server/services/stockDetail/optionsProvider.ts`
- **Affected APIs**: `/api/stocks/:ticker/detail` (options data block)
- **Affected UI**: Stock Detail Options Tab.
- **Data integrity risk**: High.
- **Why it matters**: Fake options sentiment.
- **Verified**: Yes.

### P0-DATA-10: Misleading provenance/source labels
- **Severity**: P0
- **Evidence**: Providers attach labels like `source: 'SEC_EDGAR_QUARTERLY_10Q'` or `source: 'WALL_STREET_CONSENSUS_AGGREGATOR'` while returning synthesized or hardcoded data.
- **Affected files**: `fundamentalProvider.ts`, `analystProvider.ts`, `optionsProvider.ts`
- **Affected APIs**: `/api/stocks/:ticker/detail`
- **Affected UI**: Data source footers in UI.
- **Data integrity risk**: High.
- **Why it matters**: Lies about data origin.
- **Verified**: Yes.

### P0-DATA-11: Potential mock/fallback leakage
- **Severity**: P0
- **Evidence**: `QuantStrategyView.tsx` previously fell back to `mockMatches` on API failure (recently fixed).
- **Affected files**: `src/views/QuantStrategyView.tsx`
- **Affected APIs**: N/A
- **Affected UI**: Strategy Scanner.
- **Data integrity risk**: High.
- **Why it matters**: Silent failures replaced with fake positive results.
- **Verified**: Yes.


## STEP 2 — STRICT DATA TRUST MODEL

### Data Classification
- **REAL**: Real-time or verified historical data fetched from a live external API (e.g., Yahoo).
- **DERIVED_FROM_REAL**: Data computed mathematically (e.g., RSI, MACD, Backtest scores) using exclusively REAL inputs.
- **STALE_REAL**: Previously cached REAL data that has exceeded its TTL but is used because the upstream API is currently unreachable.
- **UNKNOWN**: 数据来源、来源真实性、数据快照身份或 provenance 无法被系统正向验证。`UNKNOWN` must NEVER equal `REAL`, must NEVER enter Production Backtest, and must NEVER be implicitly trusted or inferred as `REAL`. `UNKNOWN` data strictly fail-closes to `UNAVAILABLE` or is outright rejected.
- **MOCK**: Hardcoded JSON scaffolding used for UI testing.
- **SYNTHESIZED**: Mathematically generated approximations (e.g., sine waves, price anchors).
- **HARDCODED**: Static numbers written directly into the source code.
- **UNAVAILABLE**: The data point does not exist, failed to load, was rejected as unverifiable, and no STALE_REAL cache is available.
- **ERROR**: Upstream API returned a failure.

### Data Calculation vs Input Trust
For every derived metric, the flow is:
`Metric` -> `Calculation` -> `Input Dataset` -> `Input Provenance`.
A mathematically correct formula does NOT make the output `DERIVED_FROM_REAL` if the input dataset is synthetic or unknown. If the input is `SYNTHESIZED`, the derived metric is `SYNTHESIZED`. If the input is `UNKNOWN`, the output is `UNKNOWN`.

### Allowed Production Behavior
- Only **REAL**, **DERIVED_FROM_REAL**, **STALE_REAL**, and **UNAVAILABLE** are permitted in production.
- **MOCK**, **SYNTHESIZED**, **HARDCODED**, and **UNKNOWN** financial output MUST NEVER silently appear as real data.
- If data cannot be fetched and no cache exists, the system MUST return **UNAVAILABLE**.


## STEP 3 — BACKTEST ARCHITECTURE PLAN

### Target Architecture
Backtest Request
↓
Input Validation
↓
Strict Historical Data Adapter (Rejects SYNTHESIZED, MOCK, HARDCODED, UNKNOWN)
↓
Verified Real Historical Dataset (with Dataset Snapshot Identity)
↓
Corporate Action Handling (Splits/Dividends)
↓
Point-in-Time Validation
↓
Strategy Engine (AST execution)
↓
Signal Generation
↓
Execution Model (Next-open pricing)
↓
Transaction Costs
↓
Slippage
↓
Position Sizing
↓
Risk (Stop loss, max drawdown limit)
↓
Trade Ledger
↓
Metrics (Win Rate, CAGR, Sharpe)
↓
IS/OOS Separation
↓
Validation (Anti-fabrication checks)
↓
Provenance

### Strict Backtest Data Boundary
Production Backtest MUST NOT directly trust the generic `marketDataProvider`. It must go through the Strict Historical Data Adapter which validates the exact provenance of the dataset.
The adapter MUST explicitly reject: `SYNTHESIZED`, `MOCK`, `HARDCODED`, `UNKNOWN`.
Whether `STALE_REAL` is allowed for Backtest: **UNVERIFIED — HUMAN DECISION REQUIRED**.

### Dataset Snapshot Identity
Backtest Reproducibility requires:
`Same Dataset Snapshot Identity` + `Same Strategy Configuration` + `Same Transaction Assumptions` + `Same Execution Model` = `Same Result`.
- Datasets must carry a stable `datasetSnapshotId` or `datasetHash`.
- Two separate requests to a third-party API do NOT automatically constitute the same snapshot.
- Snapshot identity must be able to prove the input datasets are identical.
- Backtest provenance must reference the snapshot identity.
- If an verifiable snapshot identity cannot be established, the backtest cannot claim reproducibility and must return `UNAVAILABLE` or trigger a validation failure.

### Critical Rule
Synthetic or Unknown data MUST NOT be a valid input to production backtest. The Backtest must fail closed when verified historical data is unavailable (RETURN UNAVAILABLE).


## STEP 4 — MARKET DATA BOUNDARY

### Current Audit (`marketDataProvider.ts`)
Currently, `generateFallbackHistoricalBars` is used as a fallback if the live fetch fails or if the feed mode is 'offline'. This synthesized data flows into:
- Latest verified market bar (via `getQuote` calling `getHistoricalPrices`)
- History
- Indicator (RSI, etc.)
- Strategy evaluation
- Risk
- Radar Scanner
- Alert Engine

*(Note: There is NO independent real-time Quote API in the repository. The `/api/stocks/:ticker/quote` semantic is strictly a slice of the "latest verified market bar" from history, and must not be falsely claimed as an independent real-time feed unless explicitly added).*

### Target STRICT Boundary
- `marketDataProvider.ts` MUST NEVER generate fallback bars.
- If fetch fails, check cache. If cache exists, return STALE_REAL (with clear `dataAsOf`, `retrievedAt`, `age`).
- If cache is empty, throw an explicit `DataUnavailableError`.
- The following strict consumers MUST catch this error and fail-closed (propagating UNAVAILABLE):
  - **Indicators**
  - **Strategy**
  - **Screener**
  - **Radar**
  - **Risk** (Must not continue calculating fake ATR/volatility/drawdown)
  - **Alert** (Must not use synthetic/default price to trigger financial alerts)
  - **Backtest**


## STEP 5 — QUANT PROVIDER REMEDIATION

### Audit of `server/services/stockDetail/quantProvider.ts`
- **compositeScore**: Hardcoded to `86.5`. Target: Compute from actual factors, or PARTIAL (Derived from real).
- **factorRank**: Hardcoded to `18`. Target: UNAVAILABLE (requires universe ranking).
- **winRate**: Hardcoded to `58.5` and `64.0`. Target: Compute via real Backtest Engine (YES).
- **cagr**: Hardcoded to `24.6` and `21.8`. Target: Compute via real Backtest Engine (YES).
- **backtestSharpe**: Hardcoded. Target: Compute via real Backtest Engine (YES).
- **maxDrawdown**: Hardcoded. Target: Compute via real Backtest Engine (YES).
- **signalLabelZh**: Hardcoded translation. Target: Keep as UI translation for computed score.

### Rule
If a real backtest cannot be run dynamically (due to lack of verified data), these fields MUST return `UNAVAILABLE` or `null`. Do NOT propose fabricated replacement numbers.


## STEP 6 — STOCK DETAIL REMEDIATION

### Remediation Architecture
- **Overview**: Target: Latest Verified Market Bar Provider. Fallback: `STALE_REAL` or `UNAVAILABLE`.
- **Financials**: Current: Synthetic (`KNOWN_DATA`). Target: Provider Interface. Fallback: `UNAVAILABLE`.
- **Technicals**: Target: Computed locally from history. Fallback: `UNAVAILABLE`.
- **Quant**: Target: `BacktestEngine` + `FactorEngine`. Fallback: `UNAVAILABLE`.
- **Forecasts**: Current: Synthetic based on price. Target: Provider Interface. Fallback: `UNAVAILABLE`.
- **Analyst**: Current: Synthetic. Target: Provider Interface. Fallback: `UNAVAILABLE`.
- **News**: Current: Static Seed. Target: Provider Interface. Fallback: `UNAVAILABLE`.
- **Events**: Current: Static Seed. Target: Provider Interface. Fallback: `UNAVAILABLE`.
- **Options**: Current: Hardcoded `42.8%`. Target: Provider Interface. Fallback: `UNAVAILABLE`.
- **Risk**: Target: Computed locally. Fallback: `UNAVAILABLE`.

### Provider Verification Rules
In the absence of source-code facts, official API docs, verified credentials/configuration, or real response schemas:
- Do NOT assume a third-party API exists.
- Do NOT invent providers, endpoints, schema fields, or response structures.
- Do NOT build "looks like real API" adapters simply to pass tests.
- Do NOT use generative values, default values, price-anchored formulas, or hardcoded values as substitutes for real data.
- When verified real data sources cannot be confirmed, the system MUST return `UNAVAILABLE` or strictly preserve whatever existing verified REAL data is already proven.
- "Provider-Neutral Interface" does not give permission to self-invent a provider. Unverified endpoints must fail-closed.


## STEP 7 — RADAR REMEDIATION

### Target Architecture
- Backend is authoritative. `ScreenerService` generates `factorRecommendation` based on REAL factor execution.
- Frontend only renders verified values.
- No frontend-generated financial performance claims.


## STEP 8 — API COMPATIBILITY

- `/api/stocks/:ticker/quote`: Target: Return latest verified market bar or 404/UNAVAILABLE.
- `/api/stocks/:ticker/history`: Target: Return real OHLCV or 404/UNAVAILABLE.
- `/api/stocks/:ticker/detail`: Target: Return structured data block. Missing data blocks will have `status: 'UNAVAILABLE'`.
- `/api/stocks/:ticker/risk`: Target: Computed risk metrics.
- `/api/quant/strategies/:id/run`: Target: Return strategy evaluation on real data.
- `/api/quant/backtest/run`: Target: Execute backtest on real data only.
- `/api/screener`: Target: Scan universe using real data.
- `/api/alerts/scan`: Target: Execute alerts on real data.

**Compatibility Rules:**
- Do NOT delete APIs.
- Do NOT rename strategy IDs.
- Nullable fields are permitted. UI must handle `null`.


## STEP 9 — PROVIDER-NEUTRAL ARCHITECTURE

### Interfaces
- `MarketDataProvider`: Responsible for fetching real-time price, volume, change (via latest verified market bar).
- `HistoricalDataProvider`: Responsible for fetching OHLCV daily/intraday bars.
- `FundamentalProvider`: Responsible for fetching balance sheet, income statement, cash flow.
- `EarningsProvider`: Responsible for fetching EPS history and surprises.
- `AnalystProvider`: Responsible for fetching consensus ratings and price targets.
- `NewsProvider`: Responsible for fetching corporate news streams.
- `OptionsProvider`: Responsible for fetching IV, flow sentiment, put/call ratios.


## STEP 10 — PHASED IMPLEMENTATION PLAN

### Phase P0-0: Trust Contract / Provenance / Status Semantics
- **Objective**: Establish `ProvenanceMeta` structures, `Dataset Snapshot Identity`, Data Classification enums (`UNKNOWN`, `REAL`, etc.), and explicit status wrappers (`UNAVAILABLE`, `STALE_REAL`) in `types.ts`.

### Phase P0-1: Strict Market Data Boundary
- **Objective**: Replace synthetic fallback (`generateFallbackHistoricalBars`) in `marketDataProvider.ts` with strict API failure handling. Implement Strict Historical Data Adapter. Enforce Risk and Alert fail-closed behavior.
- **Rollback**: Rollback only to: 1. last P0-passing / previously verified state OR 2. UNAVAILABLE.

### Phase P0-2: Real-Data Backtest
- **Objective**: Remove `generateStandardValidationDataset` sine-wave generator. Wire `backtestValidationEngine.ts` strictly to the Strict Historical Data Adapter.
- **Rollback**: Rollback only to: 1. last P0-passing / previously verified state OR 2. UNAVAILABLE (NEVER restore `Math.sin()`).

### Phase P0-3: QuantProvider Remediation
- **Objective**: Ensure `quantProvider.ts` computes metrics from real Phase P0-2 backtests or returns `UNAVAILABLE`. Purge hardcoded `compositeScore`, `winRate`, `cagr`.
- **Rollback**: Rollback only to: 1. last P0-passing / previously verified state OR 2. UNAVAILABLE.

### Phase P0-4: Stock Detail Provider Remediation
- **Objective**: Purge `KNOWN_DATA` and synthetic math from `fundamentalProvider.ts`, `analystProvider.ts`, `optionsProvider.ts`, `newsProvider.ts`. Return `UNAVAILABLE`. Follow strict Provider Verification Rules.
- **Rollback**: Rollback only to: 1. last P0-passing / previously verified state OR 2. UNAVAILABLE.

### Phase P0-5: Radar/UI Remediation
- **Objective**: Ensure frontend properly handles `UNAVAILABLE` payload across Radar and Detail without crashing.
- **Rollback**: Rollback only to: 1. last P0-passing / previously verified state OR 2. UNAVAILABLE (must NEVER restore synthetic/hardcoded/fabricated output).

### Phase P0-6: Full P0 Validation
- **Objective**: End-to-end execution of all test criteria in `P0_ACCEPTANCE_CRITERIA.md`.


## STEP 11 — ROLLBACK POLICY

**Final rule:**
Rollback may only restore:
1. previous verified REAL implementation (last P0-passing verified state)
OR
2. UNAVAILABLE

Rollback MUST NEVER restore:
- sine-wave data
- synthetic bars
- hardcoded metrics
- fake analyst data
- fake news
- fake options
- fake performance metrics


## STEP 12 — CONFLICT DETECTION

**Actual Situation**: The backend heavily relies on synthetic data generation (sine waves, anchor prices) when real data is not present or not implemented.
**Expected Situation**: The system should use real data or explicitly fail (UNAVAILABLE).
**Conflict**: The current implementation violates the strict data trust model.
**Impact**: High risk of misleading users with fabricated financial metrics.
**Resolution**: Implement the phased plan above to strip all synthetic data generators and replace them with strict API failure handling (UNAVAILABLE).


PLAN STATUS:
REVISED

IMPLEMENTATION STATUS:
STOPPED

READY FOR IMPLEMENTATION:
NO

STOP.
