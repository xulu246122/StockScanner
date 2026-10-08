# TAKEOVER REPORT: V6.5 US Stock AI Scanner & Alert

## 1. EXECUTIVE SUMMARY
The **V6.5 US Stock AI Scanner & Alert** project is a React/Node.js/Express application with a sophisticated quantitative engine architecture. However, an extensive deep-dive into the code reveals a massive gap between the structural architecture and actual data reality. While the backend architecture (Quant AST, Strategy Parsers, Screener logic) is fully built and capable, the **vast majority of detailed financial data and backtest outcomes are either entirely hardcoded, mocked, or mathematically synthesized**. The platform relies on a single real data source (Yahoo Finance) for quotes and history, which drives the real Technical Indicators. The rest is synthetic.

## 2. PROJECT HEALTH
- **Build Status**: **FAIL**. The project lacks `node_modules` and requires `npm install`. `vite build` cannot be run.
- **Test Status**: **FAIL**. `npm run test` cannot execute without dependencies.
- **TypeScript Status**: **UNKNOWN/FAIL**. `tsc --noEmit` fails without `node_modules`.
- **Dependency Status**: `package.json` exists, but packages are not installed locally.

## 3. DATA REALITY AUDIT

| Data Domain | Classification | Source / Backend Path | Confidence | Known Problem |
|-------------|----------------|-----------------------|------------|---------------|
| **Market Quote** | **REAL** | `marketDataProvider.ts` (Yahoo Finance v8) | High | Fallback to mock on network failure |
| **Historical OHLCV** | **REAL** | `marketDataProvider.ts` (Yahoo Finance v8) | High | Fallback to synthesized bars on failure |
| **Universe** | **REAL** | `universeDb.ts` (SQLite) | High | Static DB, requires periodic sync |
| **Sector/Industry** | **REAL** | `universeDb.ts` (SQLite) | High | Derived from DB metadata |
| **Fundamentals** | **HARDCODED** | `fundamentalProvider.ts` | High | Hardcoded `KNOWN_DATA` (AAPL, NVDA, etc.) |
| **Earnings** | **HARDCODED** | `analystProvider.ts` | High | Synthesized surprises based on current price |
| **Analyst Ratings**| **SYNTHESIZED**| `analystProvider.ts` | High | Math generated from `currentPrice` |
| **Price Targets** | **SYNTHESIZED**| `analystProvider.ts` | High | Hardcoded 15.8% upside target math |
| **Forecasts** | **SYNTHESIZED**| `analystProvider.ts` | High | Fake consensus scores generated |
| **News** | **SYNTHESIZED**| `newsProvider.ts` | High | Hardcoded Chinese strings if no data |
| **Events** | **SYNTHESIZED**| `newsProvider.ts` | High | Generated dummy event items |
| **Options** | **SYNTHESIZED**| `optionsProvider.ts` | High | Dummy call/put flow numbers |
| **Options Flow** | **SYNTHESIZED**| `optionsProvider.ts` | High | Returns hardcoded JSON structure |
| **Tech Indicators**| **DERIVED_FROM_REAL** | `indicators.ts` / `calculations.ts` | High | Computed locally using real Yahoo OHLCV |
| **Quant Scores** | **DERIVED_FROM_REAL** | `strategyScoringEngine.ts` | High | Uses real tech indicators to score |
| **Strategy Signals**| **DERIVED_FROM_REAL** / **MOCK**| `screenerService.ts` / `QuantStrategyView.tsx` | High | Backend engine evaluates AST on real data, but frontend catches errors and returns `mockMatches` |
| **Backtest Results**| **SYNTHESIZED**| `backtestValidationEngine.ts` | High | Runs on `generateStandardValidationDataset()` (sine/cosine waves), NOT real history. |
| **Risk Metrics** | **SYNTHESIZED**| `riskEngine.ts` inside Backtests | High | Risk math is real, but runs on fake backtest data |
| **Alerts** | **REAL** | `alertEngine.ts` | High | Checks real Yahoo quotes against thresholds |

## 4. MOCK / FALLBACK TRACE

### Example: Backtest Results Trace
1. **Source file**: `server/quant/backtest/backtestValidationEngine.ts`
2. **Function**: `generateStandardValidationDataset(mode, days)` -> Creates fake price bars using `Math.sin()` and `Math.cos()`.
3. **Backend Service**: `server/services/backtestEngine.ts` -> `simulateBacktest()` calls the dataset generator instead of fetching real history.
4. **API**: `POST /api/quant/backtest/run` -> Returns the simulated fake trade results.
5. **Frontend State**: `QuantStrategyView.tsx` / `StockDetailView.tsx` loads backtest results.
6. **UI Component**: Renders fake equity curves and fake win rates.

### Example: Fundamental Data Trace
1. **Source file**: `server/services/stockDetail/fundamentalProvider.ts`
2. **Function**: `resolveFundamentalsForSymbol(symbol, sector, price, marketCap)`
3. **Backend Service**: Checks a hardcoded `KNOWN_DATA` dictionary. If not found, generates fake fundamental stats based on sector averages.
4. **API**: `GET /api/stocks/:ticker/detail` -> Aggregates this mock fundamental block.
5. **Frontend State**: `StockDetailService` / React Query cache.
6. **UI Component**: Renders perfectly formatted fake P/E and Margins in `StockDetailView.tsx`.

## 5. API REALITY MATRIX

| API Endpoint | Method | Reality Status | Notes |
|--------------|--------|----------------|-------|
| `/api/market/status` | GET | **REAL** | Reads system session clock |
| `/api/stocks/:ticker/quote` | GET | **REAL** | Calls Yahoo Finance API |
| `/api/stocks/:ticker/history`| GET | **REAL** | Calls Yahoo Finance API |
| `/api/universe/list` | GET | **REAL** | Reads SQLite |
| `/api/screener` | POST | **REAL** | Runs filters against real data |
| `/api/alerts/scan` | POST | **REAL** | Evaluates real quotes |
| `/api/stocks/:ticker/risk` | POST/GET | **REAL** | Risk math on real quotes |
| `/api/quant/strategies/:id/run` | POST | **REAL** (Engine) | Runs AST on real data |
| `/api/quant/backtest/run` | POST | **MOCK** (Data) | Runs logic on Sine-wave prices |
| `/api/stocks/:ticker/detail` | GET | **MOCK** | 90% of the JSON block is synthesized |
| `/api/news/*` | GET | **MOCK** | Entire news subsystem is fake |

## 6. QUANT ENGINE AUDIT
- **Indicator Engine**: CONSUMES REAL DATA. (Calculates on Yahoo Finance OHLCV).
- **Strategy Engine**: CONSUMES REAL DATA. (Evaluates AST conditions on real Indicators).
- **Backtest Engine**: CONSUMES MOCK DATA. (Uses `generateStandardValidationDataset`).
- **Risk Engine**: CONSUMES MOCK DATA (in Backtests) / CONSUMES REAL DATA (in `/risk` API).
- **Position Sizing**: Real math logic, depends on input.
- **Alert Engine**: CONSUMES REAL DATA. (Scans live Yahoo Quotes).
- **Market Regime**: CONSUMES REAL DATA.
- **Screener**: CONSUMES REAL DATA.
- **Radar Scanner**: CONSUMES REAL DATA (Backend), but Frontend injects hardcoded UI strings.

## 7. RADAR DATA INTEGRITY
**Suspicious String Trace**: `"动能+趋势共振，回测历史胜率79.2%，建议继续持有"` (Regression Win Rate 79.2%).
- **Determination**: **HARDCODED (Frontend UI-Level)**.
- **Trace Path**:
  - Found directly in `src/views/RadarScannerView.tsx` (Line 103).
  - Found in `src/views/StockDetailView.tsx` (Lines 953, 1191) as `OOS 胜率 79.2 / 100`.
  - The API does not return this 79.2% value. The frontend React component simply hardcodes this string into the `factorRecommendation` UI based on simple rules (e.g. if `rsi <= 30`, append this string).
- **Verdict**: Completely fake.

## 8. STOCK DETAIL DATA INTEGRITY
- **Overview**: REAL (Quote/Price from Yahoo).
- **Financials / Fundamentals**: HARDCODED / SYNTHESIZED (`fundamentalProvider.ts`).
- **Technicals**: DERIVED_FROM_REAL (`technicalSummaryProvider.ts`).
- **Quant / AI**: SYNTHESIZED (OOS Scores hardcoded in UI).
- **Forecasts / Analyst**: SYNTHESIZED (`analystProvider.ts`).
- **News**: SYNTHESIZED (`newsProvider.ts`).
- **Events**: SYNTHESIZED (`newsProvider.ts`).
- **Options Flow**: SYNTHESIZED (`optionsProvider.ts`).
- **Risk**: DERIVED_FROM_REAL (Uses current price).

## 9. ANDROID READINESS
**Safe APIs for Kotlin + Jetpack Compose:**
- Quote, History, Indicators, Radar/Screener, Universe, Alerts.
**UNSAFE APIs (Do NOT integrate yet):**
- Stock Detail (Returns fake news/fundamentals).
- Backtest Engine (Returns fake trades from sine-waves).
- News / Catalyst / Options APIs.

## 10. TECHNICAL DEBT
- **P0 Data Integrity**: Massive. Backtests run on fake sine-waves. Fundamentals, Analysts, Options, and News are completely mocked.
- **P1 Backend/API**: Moderate. Need real 3rd party providers (e.g. Polygon, Finnhub) connected to the Provider classes.
- **P2 Radar**: High (Frontend). Must remove hardcoded `79.2%` recommendations and wire them to actual backend ML scores.
- **P3 Strategy Library**: Low. The AST Engine is excellent, but configs currently sit in `mock/quantStrategiesMock.ts`.
- **P4 Stock Detail**: Critical. The `/detail` endpoint is currently a payload of lies.
- **P5 Android Architecture**: Pending.
- **P6 Android App**: Pending.
- **P7 Push Alert**: High. Needs FCM (Firebase Cloud Messaging) integration for mobile.
- **P8 AI**: Low priority right now.

## 11. CONFLICT DETECTION
- **[CONFLICT DETECTED]**
  - **Actual Situation**: Backtest Engine generates its own fake price history using Sine/Cosine waves (`generateStandardValidationDataset`).
  - **Prompt / Context Expectation**: Backtests evaluate historical strategy performance.
  - **Conflict Reason**: The developer built the AST engine but did not hook it up to a local historical database (SQLite is universe-only, Yahoo API is rate-limited for bulk backtests). So they built a sine-wave generator to "demo" the UI.
  - **Impact**: All "OOS" and backtest equity curves are mathematically faked.
  - **Recommended Resolution**: Connect Backtest Engine to a real historical OHLCV database (e.g., download historical CSVs or use a financial data provider API).

- **[CONFLICT DETECTED]**
  - **Actual Situation**: Radar/Screener "Factor Recommendations" and "Win Rates" are hardcoded directly in React components (e.g. `79.2%`).
  - **Conflict Reason**: UI mockups were merged directly into production views without replacing the dummy strings with API data.
  - **Impact**: Users see fake AI recommendations and win rates regardless of actual backend strategy calculations.
  - **Recommended Resolution**: Remove hardcoded strings in `RadarScannerView.tsx` and map them to real `factorRecommendation` strings generated by the backend `factorEngine.ts`.

## 12. RECOMMENDED IMPLEMENTATION ORDER
1. Setup local environment (`npm install`, fix build/test scripts).
2. Wire Backtest Engine to Real Historical Data (remove sine-wave generator).
3. Connect Stock Detail Providers (News, Fundamentals, Options) to real APIs (e.g. Finnhub).
4. Remove Frontend Hardcoded Strings (Radar UI, OOS Win Rate).
5. Add Authentication & FCM Push Notifications to Backend.
6. Begin Android Kotlin/Jetpack Compose implementation.

## 13. FINAL DECISION GATE
**READY FOR IMPLEMENTATION: NO**
- **Reason**: We cannot start building the Android App (or continue scaling features) when the core Backtest Engine runs on Sine-Waves and the Stock Details/Radar views display hardcoded "79.2% Win Rate" strings. 
- **Required Resolution**: The P0 Data Integrity debt (Connecting real history to the Backtest Engine and purging frontend UI mocks) MUST be resolved before any client implementation begins.
