# P0_DATA_LINEAGE_MAP.md

## MAP THESE FLOWS

### 1. LATEST VERIFIED MARKET BAR (QUOTE)
Yahoo Finance API (or verified external API)
[REAL ON SUCCESS]
↓
`fetchRealMarketBars` in `marketDataProvider.ts`
[REAL ON SUCCESS]
↓
`getHistoricalPrices` in `marketDataProvider.ts`
[CURRENTLY CONTAMINATED BY FALLBACK] (Generates via `generateFallbackHistoricalBars` on fail/offline)
↓
`getQuote` in `marketDataProvider.ts`
[CURRENTLY CONTAMINATED BY FALLBACK]
↓
`stockDetailService.ts` / `screenerService.ts`
[CURRENTLY CONTAMINATED BY FALLBACK]
↓
`/api/stocks/:ticker/detail` & `/api/screener`
[CURRENTLY CONTAMINATED BY FALLBACK]
↓
Frontend UI (Screener View, Stock Detail View)
[CURRENTLY CONTAMINATED BY FALLBACK]

### 2. HISTORICAL OHLCV
Yahoo Finance API
[REAL ON SUCCESS]
↓
`fetchRealMarketBars` in `marketDataProvider.ts`
[REAL ON SUCCESS]
↓
`getHistoricalPrices` in `marketDataProvider.ts`
[CURRENTLY CONTAMINATED BY FALLBACK]
↓
`/api/stocks/:ticker/history` and other services
[CURRENTLY CONTAMINATED BY FALLBACK]
↓
Frontend Charts
[CURRENTLY CONTAMINATED BY FALLBACK]

### 3. TECHNICAL INDICATORS
`getHistoricalPrices`
[CURRENTLY CONTAMINATED BY FALLBACK]
↓
`indicatorCache.ts` / `TechnicalSummaryProvider`
[SYNTHESIZED] (Calculated from synthetic fallback inputs)
↓
API endpoints
[SYNTHESIZED]
↓
Frontend UI
[SYNTHESIZED]

### 4. STRATEGY SIGNAL
`getHistoricalPrices`
[CURRENTLY CONTAMINATED BY FALLBACK]
↓
`strategyScoringEngine.ts` / `setupEngine`
[SYNTHESIZED] (Calculated from synthetic fallback inputs)
↓
API (`/api/quant/strategies/:id/run`)
[SYNTHESIZED]
↓
Frontend (QuantStrategyView)
[SYNTHESIZED]

### 5. SCREENER
`marketDataProvider.ts` (`getQuote` returning latest bar)
[CURRENTLY CONTAMINATED BY FALLBACK]
↓
`screenerService.ts`
[SYNTHESIZED] (Calculated from synthetic fallback inputs)
↓
`/api/screener`
[SYNTHESIZED]
↓
ScreenerView.tsx
[SYNTHESIZED]

### 6. RADAR
Same as Screener.
[SYNTHESIZED]

### 7. BACKTEST
`generateStandardValidationDataset` in `backtestValidationEngine.ts`
[SYNTHESIZED]
↓
`backtestEngine.ts`
[SYNTHESIZED] (Calculated from sine waves, lacks Dataset Snapshot Identity)
↓
`/api/quant/backtest/run`
[SYNTHESIZED]
↓
Frontend Backtest View
[SYNTHESIZED]

### 8. RISK
`getHistoricalPrices` (ATR calculations)
[CURRENTLY CONTAMINATED BY FALLBACK]
↓
`riskEngine.ts` / `quantProvider.ts`
[SYNTHESIZED] (Calculated from synthetic fallback inputs)
↓
Frontend Risk UI
[SYNTHESIZED]

### 9. ALERT
Alert service relies on `marketDataProvider.ts` latest verified market bar stream.
[CURRENTLY CONTAMINATED BY FALLBACK]

### 10. FUNDAMENTALS
`KNOWN_DATA` in `fundamentalProvider.ts`
[HARDCODED / SYNTHESIZED]
↓
`stockDetailService.ts`
[HARDCODED / SYNTHESIZED]
↓
`/api/stocks/:ticker/detail`
[HARDCODED / SYNTHESIZED]
↓
Frontend Financials Tab
[HARDCODED / SYNTHESIZED]

### 11. EARNINGS
`analystProvider.ts` (EPS surprises)
[SYNTHESIZED]
↓
Frontend UI
[SYNTHESIZED]

### 12. ANALYST RATINGS
`analystProvider.ts` (Strong Buy = 22, etc.)
[HARDCODED]
↓
Frontend UI
[HARDCODED]

### 13. PRICE TARGETS
`analystProvider.ts` (Target = currentPrice * 1.32)
[SYNTHESIZED] (Synthesized from contaminated quote)
↓
Frontend UI
[SYNTHESIZED]

### 14. FORECASTS
`analystProvider.ts`
[SYNTHESIZED]
↓
Frontend UI
[SYNTHESIZED]

### 15. NEWS
`newsCenterService.ts`
[HARDCODED]
↓
Frontend UI
[HARDCODED]

### 16. EVENTS
`newsCenterService.ts`
[HARDCODED]
↓
Frontend UI
[HARDCODED]

### 17. OPTIONS
`optionsProvider.ts` (IV = 42.8)
[HARDCODED]
↓
Frontend UI
[HARDCODED]

### 18. OPTIONS FLOW
`optionsProvider.ts` (Put/Call Volume)
[HARDCODED]
↓
Frontend UI
[HARDCODED]

### 19. QUANT SCORES
`quantProvider.ts` (`compositeScore: 86.5`)
[HARDCODED]
↓
Frontend UI
[HARDCODED]

### 20. FACTOR SCORES
`quantProvider.ts` (`momentumScore: 88.5`)
[HARDCODED]
↓
Frontend UI
[HARDCODED]


## SPECIAL TRACE A: generateFallbackHistoricalBars
- **Who calls it?**: `getHistoricalPrices` in `server/services/marketDataProvider.ts`
- **Under what conditions?**: When `process.env.DATA_FEED_MODE === 'offline'` OR when `fetchRealMarketBars` throws an error and no STALE_REAL cache exists.
- **What data does it generate?**: Synthetic OHLCV bars using a base price, pseudo-random walk, and sine waves for volatility.
- **Can it reach Indicators?**: YES, via `getHistoricalPrices`.
- **Can it reach Strategy?**: YES, via `getHistoricalPrices` passed to strategy engines.
- **Can it reach Screener?**: YES, `getQuote` calls `getHistoricalPrices` for the latest bar and RSI calculation, which flows into Screener.
- **Can it reach Radar?**: YES.
- **Can it reach Backtest?**: NO. Backtest uses `generateStandardValidationDataset`.
- **Can it reach Risk?**: YES, ATR and Volatility rely on `getHistoricalPrices`.
- **Can it reach Alert?**: YES, Alerts rely on `getQuote` (which uses `getHistoricalPrices`).

## SPECIAL TRACE B: generateStandardValidationDataset
- **Caller**: `BacktestValidationEngine.executePartitionBacktest` or `backtestEngine.runBacktest`
- **Dataset**: `PriceBar[]` generated via `Math.sin()` and `Math.cos()`. No `Dataset Snapshot Identity`.
- **Backtest**: Processes the synthesized bars.
- **Metrics**: Computes Win Rate, Sharpe, CAGR over synthesized bars.
- **API**: `/api/quant/backtest/run`
- **Frontend**: Strategy details and charts.
- **Reaches Production?**: YES. `backtestEngine.runBacktest` is the production endpoint for backtesting, meaning all backtest results requested from the frontend are currently mathematically fabricated.

## SPECIAL TRACE C: 79.2%
- **Occurrence 1**: `src/views/RadarScannerView.tsx` Line 103 (Historically)
  - **Context**: Hardcoded `factorRecommendation`.
  - **Trigger**: None, statically returned from `getStockQuantAnalysis`.
  - **From API**: No.
  - **Frontend Generated**: Yes.
  - **Stored**: No.
  - **Reaches Stock Detail**: No.
  - **Reaches Radar**: Yes.
- **Occurrence 2**: `src/views/StockDetailView.tsx` Line 953 (Historically)
  - **Context**: Hardcoded OOS Score (`79.2 / 100`).
  - **Trigger**: Renders unconditionally if quant data exists.
  - **From API**: No.
  - **Frontend Generated**: Yes.
  - **Stored**: No.
  - **Reaches Stock Detail**: Yes.
  - **Reaches Radar**: No.
- **Occurrence 3**: `src/views/StockDetailView.tsx` Line 1191 (Historically)
  - **Context**: Hardcoded OOS Win Rate (`79.2`).
  - **From API**: No.
  - **Frontend Generated**: Yes.
  - **Reaches Stock Detail**: Yes.
- *(Note: These frontend occurrences were recently removed in Phase P0-A, but this trace documents their origin)*

## SPECIAL TRACE D: Hardcoded Quant Metrics
Found in `server/services/stockDetail/quantProvider.ts`:
- **compositeScore**: `86.5`
- **factorRank**: `18`
- **rankPercentile**: `3.6`
- **momentumScore**: `88.5`
- **valueScore**: `78.0`
- **qualityScore**: `92.5`
- **volatilityScore**: `76.0`
- **growthScore**: `87.5`
- **Win Rate**: `58.5`, `64.0`
- **CAGR**: `24.6`, `21.8`
- **Sharpe**: `1.48`, `1.35`
- **Max Drawdown**: `-14.2`, `-16.5`

**Map**:
`quantProvider.ts` [HARDCODED] 
↓ 
`stockDetailService.ts` 
↓ 
`/api/stocks/:ticker/detail` 
↓ 
Frontend Quant Panel UI

## SPECIAL TRACE E: Provenance Labels
- `source: 'SEC_EDGAR_QUARTERLY_10Q'` in `fundamentalProvider.ts`. 
  - **Actual Data Source**: Uses hardcoded `KNOWN_DATA` or synthesizes values based on market cap. 
  - **Classification**: [SYNTHESIZED / HARDCODED]
- `source: 'WALL_STREET_CONSENSUS_AGGREGATOR'` in `analystProvider.ts`. 
  - **Actual Data Source**: Mathematically synthesized numbers based on latest verified market bar (e.g. `highTarget = currentPrice * 1.32`). 
  - **Classification**: [SYNTHESIZED]
- `source: 'OPRA_OPTIONS_FLOW_FEED'` in `optionsProvider.ts`. 
  - **Actual Data Source**: Hardcoded JSON values (e.g. IV = 42.8). 
  - **Classification**: [HARDCODED]
- `source: 'YAHOO_FINANCE_CANDLE_STREAM'` in `stockDetailService.ts`. 
  - **Actual Data Source**: Traces back to `marketDataProvider.ts` which returns real data on success, but silently substitutes synthetic data on failure. 
  - **Classification**: [CURRENTLY CONTAMINATED BY FALLBACK]

## TRUST BOUNDARY
- **TRUSTED DATA PATHS**: Historical fetch from Yahoo inside `marketDataProvider.ts` (when the fetch strictly succeeds).
- **UNTRUSTED / SYNTHETIC PATHS**:
  - `generateFallbackHistoricalBars` in `marketDataProvider.ts`
  - `generateStandardValidationDataset` in `backtestValidationEngine.ts`
  - ALL stock detail providers (`fundamentalProvider.ts`, `analystProvider.ts`, `quantProvider.ts`, `newsProvider.ts`, `optionsProvider.ts`)
- **DATA TRUST BOUNDARY**: The trust boundary is entirely compromised at the data access layer. `marketDataProvider.ts` acts as a facade, silently substituting synthetic data for missing real data across the entire application. The strict boundary MUST intercept this failure and explicitly propagate UNAVAILABLE down to:
  - **Indicators**
  - **Strategy**
  - **Screener**
  - **Radar**
  - **Risk** (Must not calculate fallback risk metrics)
  - **Alert** (Must not trigger financial alerts on fallback quotes)
  - **Backtest** (Must execute only against a `datasetSnapshotId`)

PLAN STATUS:
REVISED

IMPLEMENTATION STATUS:
STOPPED

READY FOR IMPLEMENTATION:
NO

STOP.
