# P0_ACCEPTANCE_CRITERIA.md

## SECTION 1 — GLOBAL P0 GATES

The following are binary PASS/FAIL gates for the P0 Data Integrity remediation:

1. [ ] No synthetic historical data enters production Backtest
2. [ ] No hardcoded backtest performance metrics (e.g. Win Rate, CAGR, Sharpe)
3. [ ] No fake OOS metrics
4. [ ] No hardcoded 79.2%
5. [ ] No fabricated analyst consensus
6. [ ] No fabricated price targets
7. [ ] No fabricated options flow
8. [ ] No fabricated news/events presented as real
9. [ ] No misleading provenance labels
10. [ ] No silent mock fallback in STRICT mode (UNVERIFIED — HUMAN DECISION REQUIRED regarding explicit "STRICT mode" architecture, but "No silent mock fallback in Production" is a mandatory gate per Plan V2)
11. [ ] UNAVAILABLE state is supported
12. [ ] UNKNOWN classification is strictly rejected and never defaults to REAL
13. [ ] Existing API compatibility preserved
14. [ ] Strategy IDs preserved
15. [ ] Tests pass
16. [ ] Build passes

## SECTION 2 — BACKTEST VALIDATION

- **Historical data provenance**: PASS if input data strictly carries `REAL` classification. FAIL if `SYNTHESIZED`, `MOCK`, `HARDCODED`, or `UNKNOWN`.
- **Dataset Snapshot Identity**: PASS if dataset identity is referenced (e.g. `datasetSnapshotId` or `datasetHash`). FAIL if no snapshot identity is provided, requiring the backtest to return `UNAVAILABLE`.
- **Reproducibility**: PASS if `Same Dataset Snapshot Identity` + `Same Strategy Configuration` + `Same Transaction Assumptions` + `Same Execution Model` = `Same Result`. (Note: Independent requests to a third-party API without identical snapshot identity DO NOT qualify as identical).
- **Date range**: PASS if requested start/end boundaries are respected, only available valid trading bars inside the interval are used, trading-calendar behavior is explicit, and no assumption is made about weekend/holiday bars.
- **Trading calendar**: UNVERIFIED — REQUIRES HUMAN DECISION
- **Point-in-time data**: PASS if no future data is accessible at time $T$.
- **Lookahead**: PASS if a Buy signal generated at close of $T=10$ uses the open price of $T=11$ for execution.
- **Signal timing**: PASS if indicator values at $T$ perfectly match production indicator engine values for $T$.
- **Execution timing**: PASS if orders execute at next available open.
- **Slippage**: UNVERIFIED — REQUIRES HUMAN DECISION
- **Transaction costs**: UNVERIFIED — REQUIRES HUMAN DECISION
- **Corporate actions**: UNVERIFIED — REQUIRES HUMAN DECISION
- **Missing bars**: PASS if engine gracefully halts or flags `UNAVAILABLE` when historical data breaks continuity.
- **Position sizing**: PASS if risk budget relies on REAL equity prices and ATR.
- **Risk**: PASS if max drawdown and stop-loss limits trigger deterministically based on REAL data.
- **IS/OOS separation**: PASS if statistics accurately split In-Sample and Out-of-Sample metrics without data leakage.

## SECTION 3 — SYNTHETIC DATA SAFETY

### `generateFallbackHistoricalBars` Test
- **Test input**: Simulate external market data provider timeout or force `DATA_FEED_MODE=offline`.
- **Expected result**: The backend API MUST return an explicit `UNAVAILABLE` payload (or `STALE_REAL` if a valid cache exists).
- **Failure condition**: The API returns pseudo-random or sine-wave generated price bars.

### `generateStandardValidationDataset` Legality
- **TEST**: LEGAL (For unit testing the backtest math engine).
- **DEMO**: UNVERIFIED — REQUIRES HUMAN DECISION.
- **PRODUCTION**: ILLEGAL. Production API `/api/quant/backtest/run` must NEVER invoke this.

## SECTION 4 — QUANT VALIDATION

Pass/Fail criteria for Quant Metrics:

- Composite Score
- Factor Scores
- Momentum
- Value
- Quality
- Profitability
- Growth
- Liquidity
- Volatility
- Factor Rank
- Percentile
- Strategy Score
- OOS
- Win Rate
- Sharpe
- CAGR
- Max Drawdown

**Rule**: A financial metric must have a traceable source or deterministic calculation from verified input data.
**Data Calculation vs Input Trust**: For every derived metric, if the input dataset is `SYNTHESIZED`, the derived metric is `SYNTHESIZED` and thus invalid for production. If the input dataset is `UNKNOWN`, the derived metric is `UNKNOWN` and thus invalid for production.
**Otherwise**: `UNAVAILABLE`.

## SECTION 5 — RADAR VALIDATION

- **79.2%**: PASS if the string no longer exists in frontend hardcodes.
- **factorRecommendation**: PASS if rendered strictly from backend `ScreenerResponse.recommendation` (or `ExtendedScreenerItem.factorRecommendation`).
- **OOS / Win Rate**: PASS if rendered strictly from API payload.
- **confidence / recommendation text**: PASS if frontend only acts as a dumb renderer for these values.

**Requirements**:
1. Frontend cannot manufacture financial performance metrics.
2. Frontend can only render backend-provided authoritative values.
3. Backend value must have provenance.
4. No verified value: `UNAVAILABLE`.

## SECTION 6 — STOCK DETAIL VALIDATION

For the following modules (Overview, Financials, Technicals, Quant, Forecasts, Analyst, News, Events, Options, Risk):

- **Data source test**: PASS if underlying provider calls a real external API (or relies on real computed history).
- **Provider Verification Rule**: PASS if provider logic relies strictly on proven source-code facts, official APIs, verified credentials, and real schemas. FAIL if provider invents a 3rd party API, endpoint, or schema, or uses "looks like real API" mock adapters, generative values, default values, price-anchored formulas, or hardcoded values.
- **Provenance test**: PASS if returned data includes `meta` with accurate `source` and `classification`. (Unverified data source/schema MUST NOT be marked REAL).
- **Freshness test**: PASS if `timestamp` correctly reflects the external API fetch time (or cache write time).
- **Failure behavior**: PASS if upstream timeout/404 results in a structured fallback to `STALE_REAL` or `UNAVAILABLE`.
- **UNAVAILABLE rendering**: PASS if UI renders "N/A", "---", or hides the component instead of crashing or showing mock data.
- **No fabricated value test**: PASS if searching the specific provider file reveals no `KNOWN_DATA`, hardcoded numbers, or price-anchored synthesized math.

## SECTION 7 — API COMPATIBILITY

Regression tests for:
- `/api/stocks/:ticker/quote` (Validates return of latest verified market bar, not an unverified independent real-time quote API).
- `/api/stocks/:ticker/history`
- `/api/stocks/:ticker/detail`
- `/api/stocks/:ticker/risk`
- `/api/quant/strategies/:id/run`
- `/api/quant/backtest/run`
- `/api/screener`
- `/api/alerts/scan`

**Verify**:
- Existing endpoint remains available (No 404s due to route deletion).
- Existing strategy IDs remain valid.
- Required legacy fields remain compatible unless explicitly approved (e.g., using `null` or `UNAVAILABLE` states instead of deleting keys).

## SECTION 8 — PROVENANCE VALIDATION

- **Test**: `Actual data source == declared source label`
- **Rule**: A provider hitting a local cache or a fallback generator MUST NOT label itself `source: 'WALL_STREET_CONSENSUS_AGGREGATOR'` or `source: 'SEC_EDGAR_QUARTERLY_10Q'`.
- **Traceability**: Every user-visible financial metric must trace to a `ProvenanceMeta` block containing:
  - `source`
  - `classification` (e.g., REAL, DERIVED_FROM_REAL, STALE_REAL, UNAVAILABLE)
  - `timestamp`
- **Provider Verification Rule**: Any unverified data source, unverified endpoint, or unverified schema must NEVER trace to `REAL`.

## SECTION 9 — STRICT / NORMAL / DEMO

UNVERIFIED — HUMAN DECISION REQUIRED

*(The approved P0_REMEDIATION_PLAN_V2 defines a Data Trust Model with Classifications (REAL, SYNTHESIZED, UNKNOWN, etc.), but does not explicitly define a system-wide mode toggle for STRICT / NORMAL / DEMO behavior in production.)*

## SECTION 10 — FAILURE TESTS

Define explicit execution tests for the following conditions:
- Yahoo/network failure
- Provider timeout
- Provider rate limit
- No cached real data
- Stale data
- Malformed data
- Missing historical bars
- Missing fundamentals
- Missing news
- Missing options
- API errors
- Frontend API errors

**Pass Criteria**: The expected outcome must never be silently fabricated financial data. The system must degrade gracefully to `UNAVAILABLE` or `STALE_REAL`.

### Special Risk and Alert Failure-Path Tests
- **Risk Failure-Path Test**: PASS if market data fetch fails and Risk module aborts gracefully, returning `UNAVAILABLE`. FAIL if Risk calculates fake ATR/volatility/drawdown using default or fallback synthetic prices.
- **Alert Failure-Path Test**: PASS if latest verified market bar fetch fails and Alert engine halts. FAIL if Alert engine uses synthetic/default prices to trigger financial alerts.
- **UNKNOWN Handling Test**: PASS if any system receiving an `UNKNOWN` payload fail-closes to `UNAVAILABLE`.

### STALE_REAL Semantics
For `STALE_REAL`, the payload must explicitly define:
- `dataAsOf`
- `retrievedAt`
- `age`
- domain-specific freshness policy (No numeric freshness thresholds invented unless explicitly defined in project scope).

## SECTION 11 — REPOSITORY SCAN TEST

Design a static CI scan for forbidden production financial literals/patterns:
- `79.2`
- hardcoded Win Rate (`58.5`, `64.0`)
- hardcoded Sharpe (`1.48`, `1.35`)
- hardcoded CAGR (`24.6`, `21.8`)
- hardcoded Max Drawdown
- `Math.sin` historical generation
- `Math.cos` historical generation
- `KNOWN_DATA`
- `mockMatches`

**IMPORTANT**: Tests must distinguish TEST/DEMO code from PRODUCTION code. Occurrences in `/tests/` or explicitly isolated demo seeders are ignored; occurrences in `/server/services/` or `/src/views/` trigger a build failure.

## SECTION 12 — RELEASE GATE

- **P0 PASS**: All mandatory binary gates (Section 1) pass. All Provider failure modes return `UNAVAILABLE` or `STALE_REAL`. No synthetic or unknown data reaches production APIs. Risk and Alert engines fail-closed. Dataset Snapshot Identity is enforced for Backtest.
- **P0 FAIL**: Any synthetic data, unknown data, hardcoded metric, or fake performance claim is accessible via a production API, rendered in the frontend, or used to evaluate Risk/Alerts.

(No scoring. No percentage-based quality score.)

## SECTION 13 — PHASE ACCEPTANCE

### Phase P0-0: Trust Contract / Provenance / Status Semantics
- **Entry Criteria**: Development environment ready.
- **Tests**: Verify `ProvenanceMeta`, `Dataset Snapshot Identity`, and Data Classification typings exist. Ensure `UNKNOWN` classification tests pass.
- **Pass Criteria**: Base architecture supports `UNAVAILABLE` and `STALE_REAL`.
- **Failure Criteria**: Missing types or conflicting type definitions.
- **Rollback Trigger**: Type compilation failure.
- **Exit Criteria**: Base types ready.

### Phase P0-1: Strict Market Data Boundary
- **Entry Criteria**: Phase P0-0 Complete.
- **Tests**: Trigger offline mode. Ensure `marketDataProvider.ts` throws or returns `UNAVAILABLE`. Verify Risk and Alert fail-closed behavior.
- **Pass Criteria**: `generateFallbackHistoricalBars` is never invoked in production path. Strict Historical Data Adapter is in place.
- **Failure Criteria**: API returns 200 OK with synthesized candle data, or Risk/Alert compute on synthetic inputs.
- **Rollback Trigger**: Core Quote/History API crashing universally. Rollback ONLY to last P0-passing verified state OR `UNAVAILABLE`.
- **Exit Criteria**: Real Yahoo data flows to history API, or API returns 404/UNAVAILABLE gracefully.

### Phase P0-2: Real-Data Backtest
- **Entry Criteria**: Phase P0-1 Complete.
- **Tests**: Submit Backtest request for a known ticker.
- **Pass Criteria**: Backtest engine processes OHLCV arrays directly from the Strict Historical Data Adapter using a verifiable `Dataset Snapshot Identity`.
- **Failure Criteria**: `generateStandardValidationDataset` is invoked or snapshot identity is absent.
- **Rollback Trigger**: Engine fails to process real OHLCV arrays correctly. Rollback ONLY to last P0-passing verified state OR `UNAVAILABLE` (NEVER restore `Math.sin()`).
- **Exit Criteria**: Backtest metrics are mathematically derived exclusively from REAL historical data under reproducible conditions.

### Phase P0-3: QuantProvider Remediation
- **Entry Criteria**: Phase P0-2 Complete.
- **Tests**: Fetch quant payload.
- **Pass Criteria**: `compositeScore`, `winRate`, `cagr` are dynamically computed from real backtests or `UNAVAILABLE`.
- **Failure Criteria**: Hardcoded metrics are returned or derived metrics rely on `UNKNOWN` datasets.
- **Rollback Trigger**: Provider logic crashing. Rollback ONLY to last P0-passing verified state OR `UNAVAILABLE`.
- **Exit Criteria**: Quant metrics are clean.

### Phase P0-4: Stock Detail Provider Remediation
- **Entry Criteria**: Phase P0-3 Complete.
- **Tests**: Fetch `/api/stocks/:ticker/detail` for an obscure ticker.
- **Pass Criteria**: `KNOWN_DATA` is deleted. Missing fundamentals return `UNAVAILABLE`. Follows Provider Verification Rules explicitly.
- **Failure Criteria**: Synthetic mathematical targets (e.g. `price * 1.32`) are returned as analyst consensus.
- **Rollback Trigger**: Provider aggregation failure. Rollback ONLY to last P0-passing verified state OR `UNAVAILABLE`.
- **Exit Criteria**: All sub-modules render REAL data or empty states safely.

### Phase P0-5: Radar/UI Remediation
- **Entry Criteria**: Phase P0-4 Complete.
- **Tests**: Load frontend pages.
- **Pass Criteria**: Frontend handles `UNAVAILABLE` safely.
- **Failure Criteria**: Application crashes on null/unavailable payloads.
- **Rollback Trigger**: UI rendering failure. Rollback ONLY to last P0-passing verified state OR `UNAVAILABLE`.
- **Exit Criteria**: Frontend accurately reflects real or empty backend data.

### Phase P0-6: Full P0 Validation
- **Entry Criteria**: Phase P0-5 Complete.
- **Tests**: Run the complete End-to-End `P0_ACCEPTANCE_CRITERIA` suite.
- **Pass Criteria**: All binary gates pass.
- **Failure Criteria**: Any synthetic financial data is found in production flows.
- **Rollback Trigger**: NA
- **Exit Criteria**: P0 DATA INTEGRITY REMEDIATION SIGN-OFF.

PLAN STATUS:
REVISED

IMPLEMENTATION STATUS:
STOPPED

READY FOR IMPLEMENTATION:
NO

REASON:
Awaiting human approval.

STOP.
