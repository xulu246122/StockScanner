# Project Architecture Audit Report
**V6.5 US Stock AI Scanner & Alert**

## 1. Frontend Architecture
- **Framework**: React 19 + TypeScript + Vite.
- **Styling**: TailwindCSS v4.
- **State/Routing**: Single Page Application (SPA), views are located in `src/views/`.
- **UI Components**: Custom components, Lucide React icons, Framer Motion for animations.

## 2. Backend Architecture
- **Framework**: Node.js + Express.
- **Language**: TypeScript (`tsx` for execution).
- **Structure**: Domain-driven design under `server/` (e.g., `services`, `quant`, `routes`, `workers`).
- **Server Entry**: `server.ts` mounts APIs and static files (in production), also runs background workers.

## 3. Database Architecture
- **Database**: SQLite (`data/universe.sqlite`).
- **Driver**: `sql.js` (WebAssembly SQLite port).
- **Data Files**: Static JSON files (`official_ndx100.json`, `official_sp500.json`) used for seeding indices.

## 4. Quant Engine
- Located in `server/quant/`.
- Computes technical indicators (RSI, ATR, etc.) natively in TypeScript (`indicators/calculations.ts`).

## 5. Strategy Engine
- Pluggable architecture (`server/quant/strategies/catalog/`).
- Supports Ai/Ml, Breakout, Mean Reversion, Trend, etc.
- **Note**: A large portion of strategy definitions are mocked via `src/mock/quantStrategiesMock.ts`.

## 6. Radar Scanner
- Scans market data continuously for specific setups. Supported by `marketDataProvider.ts` and `screenerService.ts`.

## 7. Screener
- Custom and Strategy-based filtering over the stock universe. Evaluates conditions against real-time or hybrid market data.

## 8. Stock Detail
- Powered by `StockDetailService`. Aggregates 9 data blocks.
- **Heavy Mocking**: Uses `fundamentalProvider`, `analystProvider`, `newsProvider`, which generate synthetic or hardcoded data for many fields.

## 9. Watchlist
- In-memory or DB-backed watchlist management.

## 10. Alert Engine
- Background scanning loop (`alertEngine.ts`) running every 2 minutes via `server.ts`. Checks user-defined conditions against live prices.

## 11. Backtest
- Fully implemented logic in `server/quant/backtest/backtestValidationEngine.ts`. Evaluates historical performance, but relies heavily on the underlying mocked indicators or mocked strategy signals.

## 12. Risk Management
- Implemented in `server/quant/riskEngine.ts`, handles position sizing, stop-loss, and portfolio limits.

## 13. API Map
- See `API_INVENTORY.md` for a comprehensive list. 
- Over 50+ REST endpoints covering market data, alerts, strategies, and backtests.

## 14. Data Flow
- **Market Data**: Client -> API Route -> `marketDataProvider.ts` -> Yahoo Finance API / Fallback Mock.
- **Stock Detail**: Client -> API Route -> `stockDetailService.ts` -> Aggregates from Providers (mostly Mock) -> Returns comprehensive JSON.

## 15. Current Dependencies
- `express`, `sql.js`, `vite`, `react`, `react-dom`, `@google/genai`, `tailwindcss`, `tsx`, `typescript`.

## 16. Existing Technical Debt & Current Status
- **npm run dev / build / test / lint**: **FAILS**. The project requires an `npm install` first as `node_modules` is completely absent.
- **TypeScript Errors**: Cannot be fully validated due to missing modules, but `tsc` will fail without dependencies.
- **TODOs**: Very few explicit `TODO` comments, but extensive use of `mock`, `dummy`, and synthetic fallbacks.

## 17. Known Risks (Data Integrity & Mocks)
- **Hardcoded Data**: `fundamentalProvider.ts` contains hardcoded `KNOWN_DATA` (e.g., AAPL, NVDA).
- **Mocked Features**: News, Analysts, Fundamentals, Options Flow, and Catalyst Events generate synthetic strings or mathematical guesses based on price.
- **Indicator/Strategy Mocks**: Many strategy configurations come directly from `mock/quantStrategiesMock.ts`.
- **API Status**:
  - **Real**: Market Quotes/History (via Yahoo Finance v8 chart API), Universe DB (SQLite), Alert/Backtest Engines (logic is real).
  - **Occupying/Mock**: `/api/stocks/:ticker/detail`, `/api/news/*`.
