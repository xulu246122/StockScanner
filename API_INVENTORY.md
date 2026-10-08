# API Inventory Audit

## Overview
This document maps out the currently implemented REST APIs in the V6.5 US Stock AI Scanner & Alert Backend (`server/routes/api.ts`).

## Market & Universe API
| API Path | Method | Purpose | Implementation File | Status / Data |
|----------|--------|---------|---------------------|---------------|
| `/api/market/status` | GET | Check market session | `server/routes/api.ts` | Real (Session Clock) |
| `/api/market/overview` | GET | Get market indices | `server/routes/api.ts` | Mocked / Generated |
| `/api/universe/list` | GET | List available universes | `server/routes/api.ts` | Real (SQLite) |
| `/api/universe/:code/instruments` | GET | Get universe stocks | `server/routes/api.ts` | Real (SQLite) |
| `/api/universe/sync` | POST | Trigger universe sync | `server/routes/api.ts` | Real (Worker) |

## Stock Data & Detail API
| API Path | Method | Purpose | Implementation File | Status / Data |
|----------|--------|---------|---------------------|---------------|
| `/api/stocks/:ticker` | GET | Basic stock meta | `server/routes/api.ts` | Real (SQLite) |
| `/api/stocks/:ticker/quote` | GET | Quote snapshot and derived RSI/volume metrics | `server/routes/api.ts`, `server/services/marketDataProvider.ts` | Real/stale-real Yahoo Chart API; fail-closed |
| `/api/stocks/:ticker/history` | GET | OHLCV history | `server/routes/api.ts`, `server/services/marketDataProvider.ts` | Real/stale-real Yahoo Chart API; no synthetic bars |
| `/api/stocks/:ticker/detail` | GET | Comprehensive details | `server/services/stockDetail/stockDetailService.ts` | Market/technicals derived from verified bars; SEC Financials requires `SEC_USER_AGENT`; deferred blocks unavailable |
| `/api/stocks/search` | GET | Search ticker | `server/routes/api.ts` | Real (SQLite) |

## Screener & Radar API
| API Path | Method | Purpose | Implementation File | Status / Data |
|----------|--------|---------|---------------------|---------------|
| `/api/screener` | POST | Basic Screener | `server/routes/api.ts` | Hybrid |
| `/api/screener/strategy` | POST | Strategy Screener | `server/routes/api.ts` | Hybrid |
| `/api/screener/custom` | POST | Custom Screener | `server/routes/api.ts` | Hybrid |

## Quant & Strategy API
| API Path | Method | Purpose | Implementation File | Status / Data |
|----------|--------|---------|---------------------|---------------|
| `/api/quant/strategies` | GET | List strategies | `server/routes/api.ts` | Real Engine (Mock Configs) |
| `/api/quant/strategies/:id/run` | POST | Execute strategy | `server/routes/api.ts` | Real Engine |
| `/api/quant/backtest/run` | POST | Run backtest | `server/routes/api.ts` | Real Engine |
| `/api/quant/backtest/history` | GET | Backtest results | `server/routes/api.ts` | Real Engine |
| `/api/quant/factors/evaluate` | POST | Evaluate factor | `server/routes/api.ts` | Real Engine |

## Alerts & Watchlist API
| API Path | Method | Purpose | Implementation File | Status / Data |
|----------|--------|---------|---------------------|---------------|
| `/api/watchlist` | GET/POST | Manage watchlist | `server/routes/api.ts` | In-Memory / DB |
| `/api/alerts` | GET/POST | Manage alerts | `server/routes/api.ts` | Real Engine |
| `/api/alerts/scan` | POST | Trigger alert scan | `server/routes/api.ts` | Real Engine |

## Stock Detail Data Sources
| Module | Source | Status |
|--------|--------|--------|
| Chart | TradingView Advanced Chart embed | Display-only; not used as an application data API |
| Financials | SEC Company Facts (`data.sec.gov`) | Available when descriptive `SEC_USER_AGENT` is configured; cached and provenance-tagged |
| Forecasts | No verified provider configured | `UNAVAILABLE` |
| News / Events | No authorized provider configured | `UNAVAILABLE` |
| Options | No OPRA/commercial provider configured | `UNAVAILABLE` |
| Community | TradingView external link | No scraping |

## News & Catalyst API
| API Path | Method | Purpose | Implementation File | Status / Data |
|----------|--------|---------|---------------------|---------------|
| `/api/news/stream` | GET | News feed | `server/services/newsCenterService.ts` | **Mocked / Synthesized** |
| `/api/news/events` | GET | Corporate events | `server/services/newsCenterService.ts` | **Mocked / Synthesized** |
| `/api/news/sentiment` | GET | Sentiment analysis | `server/services/newsCenterService.ts` | **Mocked / Synthesized** |

## Summary
The API layer is structurally complete and RESTful. Stock Detail market data is now fail-closed and provenance-aware. SEC Financials are server-side and optional through `SEC_USER_AGENT`; analyst forecasts, options, news, and events remain explicitly unavailable until authorized providers are configured. Legacy news endpoints are still marked mocked/synthesized and must not be used to populate Stock Detail.
