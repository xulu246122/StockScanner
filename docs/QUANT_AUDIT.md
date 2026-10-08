# Quant & Technical Analysis Engine Audit

## 1. Mathematical Accuracy Assessment

### Wilder RSI Formula (`server/services/rsiEngine.ts`)
- **Audit Result: VERIFIED VALID & ACCURATE**
- The implementation strictly adheres to J. Welles Wilder Jr.'s 1978 standard:
  - Initial seed window (bars 1 to period): Simple average of gains & losses.
  - Subsequent periods: Modified exponential moving average (alpha = 1 / period):
    $$\text{AvgGain}_t = \frac{\text{AvgGain}_{t-1} \times (N-1) + \text{Gain}_t}{N}$$
    $$\text{AvgLoss}_t = \frac{\text{AvgLoss}_{t-1} \times (N-1) + \text{Loss}_t}{N}$$
    $$\text{RS} = \frac{\text{AvgGain}}{\text{AvgLoss}}, \quad \text{RSI} = 100 - \frac{100}{1 + \text{RS}}$$
- **Edge cases handled properly**:
  - `AvgLoss === 0`: RSI = 100
  - `AvgGain === 0`: RSI = 0
  - Both zero (completely flat price action): RSI = 50.0

### Multi-Timeframe Bar Aggregation (`server/services/marketDataProvider.ts`)
- **Audit Result: VERIFIED VALID**
- `aggregateBars` properly computes:
  - `open = first.open`
  - `high = Math.max(...chunk.high)`
  - `low = Math.min(...chunk.low)`
  - `close = last.close`
  - `volume = sum(chunk.volume)`
  - `timestamp = first.timestamp`

---

## 2. Quant Gaps & Deficiencies to Address

### Gap 1: Indicator vs Trade Setup Fallacy
- **Current Defect**:
  - The UI and screener currently label RSI < 30 as "Dip Buy" or "超卖买入区".
  - In real financial markets, strong downtrends can keep RSI depressed below 30 for weeks while price continues to cascade downwards.
- **Architectural Fix**:
  - Decouple **Indicator Conditions** from **Trade Setups**.
  - A trade setup requires multi-condition confirmation:
    1. Indicator in oversold zone ($RSI \le 30$)
    2. Bullish momentum recovery ($RSI \text{ crosses back above } 30$)
    3. Price structure confirmation (e.g. price breaks above prior candle high or recovers EMA/SMA key level)
    4. Structural invalidation level (stop loss) with acceptable Risk/Reward $\ge 1.5$.

### Gap 2: Missing Volatility & Risk Metrics (ATR)
- Average True Range (ATR 14) is currently missing from the quant engine.
- ATR is the institutional standard for measuring market noise, setting dynamic trailing stops, and sizing positions appropriately across high-beta vs low-beta stocks.
- **Action**: Implement `calculateATR(bars: PriceBar[], period = 14): number[]` in `/server/quant/indicators.ts`.

### Gap 3: Missing Institutional Setup Engine
- Introduce 10 systematic short-term setups in `/server/quant/setupEngine.ts`:
  1. `OVERSOLD_REBOUND`: RSI(14) crosses back above 30 with hammer / engulfing bar.
  2. `BULLISH_DIVERGENCE`: Lower price low with higher RSI trough.
  3. `BEARISH_DIVERGENCE`: Higher price high with lower RSI peak.
  4. `PULLBACK_EMA`: Healthy trend pulling back to rising EMA20/SMA50 with RSI 40–50 support.
  5. `MOMENTUM_BREAKOUT`: Consolidation break with volume expansion (>1.5x) and RSI > 55.
  6. `RANGE_SUPPORT_BOUNCE`: Horizontal support test with oversold inflection.
  7. `RANGE_RESISTANCE_REJECTION`: Resistance test with overbought inflection.
  8. `MOMENTUM_CONTINUATION`: Strong trend consolidation resolving in direction of higher timeframe bias.
  9. `OVERBOUGHT_EXHAUSTION`: Parabolic extension crossing back below 70 with heavy volume stalling.
  10. `RSI_FAILURE_SWING`: Classical Wilder failure swing top/bottom pattern.

### Gap 4: Risk & Position Sizing Engine
- Create `/server/quant/riskEngine.ts`:
  - Calculate `EntryZone`, `StructureStop`, `ATRStop`, `Target1`, `Target2`, and `RiskRewardRatio`.
  - Cap maximum risk at 5.0% hard stop; if structural stop requires >5.0% risk, flag setup as `INVALID_RISK`.
  - Position size calculation:
    $$\text{Shares} = \frac{\text{Account Size} \times \text{Risk \%}}{\text{Entry} - \text{Stop}}$$
