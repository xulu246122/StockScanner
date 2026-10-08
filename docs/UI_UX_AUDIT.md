# UI / UX Audit: Financial Terminal Experience

## 1. Current UI Inventory
- **Header**: Minimal bar with title and Market Session badge.
- **Bottom Navigation**: 5 mobile tabs: `Market` (Home), `Screener`, `Watchlist`, `Alerts`, and `Detail` (hidden/sub-route).
- **HomeView**: Large "RSI Radar" bubble visualization taking up 50% of the viewport; basic sector list.
- **ScreenerView**: Large cards with rounded borders, ticker badge, company name, RSI pill, and mini sparkline.
- **WatchlistView**: Card-based ticker list with star button and RSI badge.
- **StockDetailView**: Binance K-line chart (candles, MA7/25/99, high/low markers, real-time price tag, RSI 6/14/24 sub-chart, VOL sub-chart), Trend/Divergence cards, Company Profile, Alert CTA.
- **AlertsView**: Card list of active rules and alert event logs.

---

## 2. Information Architecture & UX Audit Findings

### Issue 1: Information Density Deficit on Desktop
- On large screens (>1024px), the Screener displays cards with excessive vertical padding, showing only 4–5 stocks per screen. Professional traders require scanning 20–30 rows simultaneously with dense financial metrics (Price, Change %, Volume, Relative Volume, RSI, Trend, ATR, Setup Status).
- **Solution**: Implement a dual-mode responsive layout:
  - **Desktop (>=1024px)**: High-density, sortable, resizable table with sticky header and customizable column sets.
  - **Mobile (<1024px)**: Compact list/card hybrid with quick swipe actions.

### Issue 2: Chart as a Sub-Route Rather than Primary Workspace
- Currently, users must tap a stock in Watchlist or Screener to enter `StockDetailView` to see the chart.
- The user flow `DISCOVER → ANALYZE → MONITOR → ALERT` requires a dedicated **Chart Workspace** as a top-level primary tab.
- **Solution**: Elevate `CHART` to a first-class navigation item in both Desktop Sidebar and Mobile Navigation.

### Issue 3: Inadequate Quick Action System
- In traditional terminals, right-clicking or tapping an action button on any ticker opens a context menu with `Open Chart`, `Add Watchlist`, `Create Alert`, `Analyze Setup`, `Copy Ticker`.
- Currently, users must navigate into the detail view to create an alert.
- **Solution**: Embed universal Quick Action dots `[ ··· ]` on every ticker row, card, and table cell.

### Issue 4: Visual Language & Hierarchy
- The app should strictly follow the **Professional Financial Terminal** visual design guidelines:
  - Background: Crisp White (`#ffffff`) and Slate 50 (`#f8fafc`).
  - Dividers: Ultra-fine Slate 100/200 borders (`border-slate-100` / `border-slate-200/80`).
  - Text Hierarchy: Slate 900 for prices and symbols, Slate 500 for company names and labels, Slate 400 for secondary metrics.
  - Semantic Color Discipline: Emerald (`#10b981`) exclusively for Bullish/Gains, Rose (`#f43f5e`) for Bearish/Losses, Indigo/Blue (`#4f46e5` / `#2563eb`) for Active/System/Neutral.
  - Zero decorative fluff: No unnecessary 3D gradients, excessive drop shadows, or floating pills without semantic meaning.

### Issue 5: Accessibility (A11y) Baseline
- Color alone is currently used to distinguish positive vs negative change in several locations.
- **Solution**: Always pair color with unambiguous directional icons (`TrendingUp` / `TrendingDown` / `Activity`) and accessible ARIA attributes (`aria-label`, `role="table"`).
