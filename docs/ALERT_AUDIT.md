# Alert Engine & Notification Infrastructure Audit

## 1. Current Alert Architecture Analysis

### Current Implementation (`server/services/alertEngine.ts`)
- **Storage**: In-memory JavaScript arrays `alerts: AlertRule[]` and `events: AlertEvent[]`.
- **Condition Support**:
  - `RSI_LTE` (Less than or equal)
  - `RSI_GTE` (Greater than or equal)
  - `CROSS_BELOW_30`
  - `CROSS_ABOVE_70`
  - `RSI_BETWEEN`
- **Trigger Execution**: Background scan runs every 2 minutes via `setInterval`.
- **Cooldown**: Simple global timestamp check: `now - lastTriggeredTime < 15 * 60 * 1000`.

---

## 2. Critical Flaws & Deficiencies in Current Alert System

### Flaw 1: State Machine Ambiguity
- **Problem**: Alert currently only possesses a binary flag `isEnabled: boolean`.
- **Risk**: Cannot distinguish between:
  - An alert that is armed and watching (`ARMED`)
  - An alert that has triggered and waiting for cooldown (`COOLDOWN`)
  - An alert that has triggered once and finished (`TRIGGERED`)
  - An alert whose technical setup is invalidated by price action (`INVALIDATED`)
  - An alert disabled by user (`DISABLED`)
  - An alert with data retrieval failure (`ERROR`)
- **Solution**: Implement formal 8-State Alert Lifecycle State Machine:
  `DRAFT → ARMED ⇄ TRIGGERED ⇄ COOLDOWN | INVALIDATED | DISABLED | EXPIRED | ERROR`

### Flaw 2: Single-Condition Limitation
- **Problem**: Users can only set single RSI threshold alerts.
- **Risk**: High rate of false positives because single indicators generate market noise without price/volume confirmation.
- **Solution**: Upgrade to **Composite Multi-Condition Evaluator** supporting:
  - Logical `ALL` (AND) / `ANY` (OR) groups.
  - Multi-factor criteria:
    - `PRICE` (Crosses Above/Below, Change %, Gap %)
    - `RSI` (Wilder RSI value, crossing, divergence)
    - `VOLUME` (Volume > X, Relative Volume > 1.5x)
    - `MOVING_AVERAGE` (Price > EMA20, MA7 crosses MA25)
    - `SETUP` (Specific Setup pattern detected)

### Flaw 3: Inadequate Deduplication & Bar-Close Verification
- **Problem**: The current cooldown only checks elapsed milliseconds. During high-volatility intraday bars, intrabar ticks can trigger false crossing signals before the candle actually closes.
- **Solution**:
  - Introduce Trigger Frequency Mode:
    - `ONCE`
    - `ONCE_PER_BAR_CLOSE` (default for technical confirmation)
    - `INTRABAR_REALTIME`
  - Compute a composite deduplication key:
    $$\text{DedupeKey} = \text{alertId} + \text{ticker} + \text{timeframe} + \text{barTimestamp}$$
  - Prevent duplicate trigger events on the same completed candle.

### Flaw 4: Alert UI Confusion (Bug Fix)
- **Problem**: In the alerts view, an alert created for `RSI ≤ 30` shows the live RSI value (e.g. `56.6`), making users think the condition is active when it has already recovered.
- **Solution**: The UI must display three distinct, unambiguous columns:
  1. **Condition**: `RSI(14, 1D) ≤ 30`
  2. **Current Value**: `56.6` (Neutral)
  3. **Last Trigger**: `28.6 at 2026-09-29 14:30 ET`
  4. **Status**: `Armed / Monitoring` vs `Triggered` vs `Cooling Down`

### Flaw 5: Notification Decoupling
- **Problem**: Notification sending is intertwined with alert evaluation.
- **Solution**: Implement an **Event-Driven Dispatcher Architecture**:
  `Alert Evaluator → AlertEvent → NotificationDispatcher → [BrowserPushProvider, InAppProvider, WebhookProvider]`
