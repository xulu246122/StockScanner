# Stock Detail Codebase Audit (Phase Stock-01)

## 1. 页面结构与路由现状 (Page Structure & Routing)

### 1.1 页面入口与路由绑定
- **主路由入口**：`src/App.tsx`
  - 路由状态：`activeTab: 'detail' | 'chart'`
  - 激活条件：用户在 `Market` / `Radar` / `Screener` / `Watchlist` 点击任意标的，触发 `handleSelectStock(ticker)`，将 `selectedTicker` 设为该股票代码并将 `activeTab` 切换为 `'detail'`。
  - 组件载入：`src/views/StockDetailView.tsx`
  - 传入 Props：
    ```typescript
    interface StockDetailViewProps {
      ticker: string;
      onBack: () => void;
      onOpenAlertModal: (ticker: string, stockName?: string, currentRsi?: number) => void;
      isWatchlisted: boolean;
      onToggleWatchlist: (ticker: string) => void;
    }
    ```

### 1.2 当前 StockDetailView 布局结构
当前 `StockDetailView.tsx` 采用单页纵向流式排版，分为 3 个核心区块：
1. **顶部交易看板与高级图表 (`BinanceTradingChart.tsx`)**：
   - 股票身份信息（Ticker、名称、交易所）
   - 实时行情数据（价格、24h 涨跌额/幅、24h 最高/最低价、成交量、成交额）
   - 周期切换栏（10m, 30m, 1h, 2h, 4h, 1D, 1W, 1M）
   - 指标切换栏（主图：MA / BOLL / OFF；副图：VOL+RSI / VOL / RSI）
   - 主副 Canvas 双轨绘制渲染引擎（K线/折线 + MA7/25/99 + BOLL + 成交量 + RSI 6/14/24 曲线 + 十字光标 HUD）
2. **量化策略风控参考 (`TradeSetupOverlay.tsx`)**：
   - 入场参考区间（Optimal Entry）
   - 防守止损位（Stop Loss，严格执行 5.0% 硬止损上限规则）
   - 第一/第二止盈目标（Target 1 / Target 2）
   - 预期盈亏比（Risk/Reward Ratio，如 1:1.59）
   - 快速同步创建量化预警按钮（`onOpenAlertModal`）
3. **趋势与背离诊断 (`analyzeTrendAndDivergence`) + 行情统计**：
   - 多周期切换（4H / 1D / 1W）
   - MA7/25/99 均线排列态势（多头排列 / 空头排列 / 震荡缠绕）
   - Wilder RSI 顶底背离监测（底背离 / 顶背离 / 趋势同步）
   - 均线乖离率统计（MA7 / MA25 / MA99 偏离百分比）
   - 基础统计卡片（当日波动区间、52周高低点、总市值、成交量）

---

## 2. 组件与文件分布 (Component Hierarchy)

```
src/
├── views/
│   └── StockDetailView.tsx                  # 股票详情视图主容器 (352 行)
├── components/
│   ├── charts/
│   │   ├── BinanceTradingChart.tsx          # 商业版 Canvas 专业图表引擎 (998 行)
│   │   ├── TradeSetupOverlay.tsx            # 交易形态与 5% 硬止损风控覆盖层 (160 行)
│   │   ├── PriceChart.tsx                   # 历史基础价格图表 (轻量备用)
│   │   └── RsiChart.tsx                     # 独立 RSI 图表 (轻量备用)
│   ├── market/
│   │   └── GoogleFinanceNewsModule.tsx      # Google Finance 风格财经新闻与情绪分析
│   ├── common/
│   │   └── StockLogo.tsx                    # 智能股票 Logo 生成与回退组件
│   └── modals/
│       ├── StockAlarmAlertModal.tsx         # 极速预警创建弹窗
│       └── AddToWatchlistModal.tsx          # 自选股添加弹窗
└── utils/
    └── trendAndDivergence.ts                # 均线多空排列与 RSI 顶底背离计算引擎
```

---

## 3. API 接口结构与返回真实数据 (API Endpoints & Schemas)

| 接口端点 | HTTP 方法 | 后端处理服务 | 真实返回 Payload 说明 |
|---|---|---|---|
| `/api/stocks/:ticker` | GET | `getStockMeta` | `{ ticker, name, exchange, sector, industry, marketCap, isActive }` |
| `/api/stocks/:ticker/quote` | GET | `marketDataProvider.getQuote` | `{ ticker, name, exchange, price, change, changePercent, marketCap, volume, high52w, low52w, rsi: { value, status, label }, allRsi: { rsi6, rsi9, rsi14, rsi21, rsi30 }, marketTime, isDelayed, dataSource, updatedAt }` |
| `/api/stocks/:ticker/history` | GET | `marketDataProvider.getHistoricalPrices` | `{ ticker, name, period, timeframe, range, currentPrice, changePercent, rsi, bars: Array<{ time, open, high, low, close, volume, rsi }> }` |
| `/api/stocks/:ticker/setup` | GET | `setupEngine.detectSetups` | `{ ticker, name, timeframe, setups: Array<{ id, type, label, direction, confidence, entry, stopLoss, target1, target2, riskPercent, rewardPercent, rrRatio, rules }> }` |
| `/api/stocks/:ticker/risk` | POST | `riskEngine.calculatePositionSize` | `{ ticker, accountSize, riskAmount, entryPrice, stopLossPrice, positionShares, positionValue, riskPercent, status }` |
| `/api/market/overview` | GET | `marketRegimeService.getMarketOverview` | `{ marketStatus, regime: 'RISK_ON'\|'RISK_OFF'\|'NEUTRAL_CHOP', regimeLabel, indices: { spy, qqq, vix }, sectors }` |

---

## 4. 全链路数据流 (End-to-End Data Flow)

```
[ 用户选择标的 (NVDA / AAPL) ]
               ↓
[ App.tsx: selectedTicker 状态更新, activeTab -> 'detail' ]
               ↓
[ StockDetailView.tsx 挂载 / ticker 切换响应 ]
               ↓
[ 并行发起 API 请求: getStockQuote + getStockHistory + getMultiPeriodHistory ]
               ↓
[ Express Backend (server/routes/api.ts) ]
               ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. marketDataProvider: 实时行情 + Yahoo Finance OHLCV + 缓存 │
│ 2. rsiEngine: Wilder 经典平滑算法 (RSI 2/6/9/14/21/24/30)    │
│ 3. universeDb / stockUniverse: 公司元数据与行业板块          │
│ 4. setupEngine: 10 大机构形态识别 + 5% 硬止损锚定            │
│ 5. indicatorCacheService: 多指标 AST 运算上下文             │
└─────────────────────────────────────────────────────────────┘
               ↓
[ 数据下发给前端 React 视图 ]
               ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. BinanceTradingChart: Canvas 高性能双轨渲染               │
│ 2. TradeSetupOverlay: 交易形态、止损、目标价区间            │
│ 3. analyzeTrendAndDivergence: 均线矩阵排列 + 顶底背离诊断   │
│ 4. 核心统计数据统计卡片展示                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 技术指标代码现状 (Existing Indicators Engine)

后端已具备完整的数学计算引擎（`server/quant/indicators/calculations.ts` 与 `server/quant/indicators.ts`）：

| 技术指标 | 标识符 | 所在文件 | 计算实现状态 | 参数覆盖 |
|---|---|---|---|---|
| **Relative Strength Index** | `rsi` | `rsiEngine.ts` / `calculations.ts` | ✅ 完全实现 (Wilder 平滑) | 2, 6, 9, 14, 21, 24, 30 |
| **Simple Moving Average** | `sma` | `indicators.ts` / `calculations.ts` | ✅ 完全实现 | 5, 7, 10, 20, 25, 50, 99, 100, 150, 200 |
| **Exponential Moving Average** | `ema` | `indicators.ts` / `calculations.ts` | ✅ 完全实现 | 9, 12, 13, 20, 21, 26, 50, 200 |
| **MACD** | `macd` | `calculations.ts` | ✅ 完全实现 (DIF, DEA, Hist, 交叉) | (12, 26, 9) |
| **Bollinger Bands** | `bollinger` | `calculations.ts` | ✅ 完全实现 (上/中/下轨, 宽度%, %B) | (20, 2.0) |
| **Average True Range** | `atr` | `indicators.ts` | ✅ 完全实现 (ATR, ATR%) | 14 |
| **Relative Volume** | `relative_volume` | `indicators.ts` | ✅ 完全实现 (RVOL) | 20 |
| **Stochastic Oscillator** | `stochastic` | `calculations.ts` | ✅ 完全实现 (%K, %D, 超买超卖, 交叉) | (14, 3) |
| **Average Directional Index** | `adx` | `calculations.ts` | ✅ 完全实现 (ADX, +DI, -DI, 趋势方向) | 14 |
| **Donchian Channels** | `donchian` | `calculations.ts` | ✅ 完全实现 (唐奇安通道, 突破检测) | 20 |
| **Darvas Box** | `darvas` | `calculations.ts` | ✅ 完全实现 (达瓦斯箱体, 突破距离) | 30 |
| **On-Balance Volume** | `obv` | `calculations.ts` | ✅ 完全实现 (能量潮, 回归斜率) | 标准 OBV + 10日斜率 |
| **52-Week Range** | `distFrom52wHigh` | `calculations.ts` | ✅ 完全实现 (距高低点幅度) | 52周全周期 |

---

## 6. 图表模块现状 (Chart Modules Status)

- **主图组件**：`src/components/charts/BinanceTradingChart.tsx`
  - 核心技术：基于 HTML5 2D Canvas 的双缓冲渲染机制。
  - 功能特性：
    - 支持日间/夜间模式切换；
    - 支持 K 线（Candlestick）与分时折线（Line）切换；
    - 支持主图指标（MA 7/25/99 组合、BOLL 布林带、关闭）；
    - 支持副图指标（VOL 成交量 + RSI 6/14/24 多周期三线叠加）；
    - 支持全屏十字准星（Crosshair）、吸附磁吸与悬浮 HUD 实时读数（开高低收、涨跌幅、均线值、RSI值、成交量）。
- **待优化项**：
  - 需增强为支持更标准 TradingView 级别的指标开关与技术综合汇总仪表盘（Technical Summary Gauge）。

---

## 7. 缺失模块对比 (Missing Modules in Stock Detail V2)

根据 TradingView 级信息架构 + 本终端独有 Quant Intelligence 要求，当前详情页尚缺失以下专业维度：

1. **分层 Tab 导航架构**：
   - 现为单页滚动，需升级为专业九大选项卡系统：`Overview` | `Technicals` | `Quant & Setups` | `Financials` | `Forecasts & Analysts` | `News` | `Events` | `Options & Flow` | `Risk & Regime`。
2. **Technical Summary 技术综合总览仪表盘**：
   - 汇总 12+ 个技术指标信号（Strong Buy / Buy / Neutral / Sell / Strong Sell 仪表盘指针）；
   - 均线汇总买卖计分表（EMA10/20/30/50/100/200, SMA10/20/30/50/100/200）；
   - 震荡指标汇总计分表（RSI, STOCH, MACD, ADX, CCI, Williams %R）。
3. **真实基本面与财务分析 (Fundamentals & Financials)**：
   - 关键估值与财务倍数（P/E, Forward P/E, P/S, EV/EBITDA, 毛利率, 净利率, ROE, 负债率, 自由现金流）。
4. **分析师预期与目标价 (Analyst Consensus & Price Targets)**：
   - 华尔街共识评级分布（Strong Buy / Buy / Hold / Underperform / Sell）；
   - 目标价区间预测（Highest Target, Mean Consensus Target, Lowest Target 及上涨空间%）。
5. **财报历史与预测 (Earnings & Estimates)**：
   - EPS 预期 vs 实际惊喜度（Surprise %）；
   - 季度营收趋势与下一财报发布日倒计时。
6. **标的深度新闻与事件日历 (Stock News & Corporate Events)**：
   - 针对当前 Ticker 的定向财经快讯流、情绪打分与重大公司事件（分红日、拆股日、财报日）。
7. **期权异动与波动率画像 (Options Flow & Volatility)**：
   - Put/Call 比率、隐含波动率（IV Percentile）、最大痛点价位。
8. **量化策略适配与回测画像 (Quant Strategy Confluence & Backtest)**：
   - 72 个策略在当前标的上的适用性评分、触发状态与 OOS 实测夏普/最大回撤画像。

---

## 8. 可直接复用的成熟模块 (Reusable Modules)

1. **`BinanceTradingChart.tsx`**：已具备完整 Canvas K线绘制、十字光标 HUD、多周期切换与 MA/BOLL/RSI/VOL 渲染，直接作为图表核心。
2. **`TradeSetupOverlay.tsx`**：形态识别、5% 硬止损风控计算与预警弹窗联动完整可用。
3. **`trendAndDivergence.ts`**：MA 多空排列诊断、乖离率与 RSI 顶底背离算法完整可用。
4. **`server/quant/indicators/calculations.ts`**：MACD、BOLL、Stoch、ADX、ATR、OBV、Darvas、Donchian、线性回归等 13 个技术指标公式直接可用。
5. **`GoogleFinanceNewsModule.tsx`**：新闻卡片 UI、情绪徽标、关联标的展示逻辑可直接提炼复用到详情页新闻 Tab。
6. **`factorEngine.ts` & `riskEngine.ts`**：多因子打分与仓位风控计算完整可用。
7. **`StockAlarmAlertModal.tsx` & `AddToWatchlistModal.tsx`**：全局自选与预警创建弹窗交互现成可用。

---

## 9. 重构风险评估与防范策略 (Refactoring Risks & Mitigations)

| 潜在风险 | 影响程度 | 防范与解决方案 |
|---|---|---|
| **虚构数据违规风险 (Fabrication Risk)** | **高** | 严格执行真实性规则：无真实数据字段统一规范返回 `—` / `N/A` / `No Data`，严禁伪造胜率或目标价。 |
| **状态混乱与并发加载卡顿** | **中** | 采用选项卡懒加载（Lazy Tab Loading），切换 Tab 时才加载对应维度的深度数据；对行情与图表数据做 Memoization 缓存。 |
| **移动端布局溢出** | **中** | 采用 Responsive Tabs + 横向滚动导航条，仪表盘指针与表格在小屏自动降级为紧凑卡片。 |
| **图表重绘性能损耗** | **低** | 保持 Canvas 绘制图表独立，不因其他 Tab 数据刷新而触发不必要的 Canvas 重绘。 |

---

## 10. 推荐 V2 架构设计 (Recommended Stock Detail V2 Architecture)

```
StockDetailView V2 (TradingView Architecture + Quant Intelligence)
│
├── 1. Sticky Pro Header (固定标的顶部栏)
│   ├── Logo + Ticker + Name + Exchange + Sector Tag
│   ├── Real-time Price + Change + Change% + High/Low + Market Cap + Volume
│   ├── Market Session Badge (Regular / Pre-Market / Post-Market / Closed)
│   └── Actions: [ ⭐ 加入自选 ] [ 🔔 新建量化预警 ] [ ↻ 刷新 ]
│
├── 2. Tab Navigation Bar (专业九大选项卡)
│   ├── [1] Overview (概览 - 核心图表 + 技术/量化速览)
│   ├── [2] Technicals (技术分析 - 综合总览仪表盘 + 均线/震荡指标明细)
│   ├── [3] Quant & Setups (量化情报 - 独家策略信号 + 形态识别 + 因子评分)
│   ├── [4] Fundamentals (基本面 - 财务估值倍数 + 利润表/资产表核心指标)
│   ├── [5] Forecasts (机构预测 - 目标价区间 + 分析师评级分布 + 财报EPS预测)
│   ├── [6] News (标的快讯 - 专属新闻流 + 情绪打分 + 影响因子)
│   ├── [7] Events (公司事件 - 财报日程 + 分红拆股日历)
│   ├── [8] Options (期权画像 - Put/Call Ratio + 隐含波动率 IV)
│   └── [9] Risk & Regime (风控与宏观 - 5% 硬止损仓位计算器 + 大盘环境)
│
└── 3. Dynamic Tab Content Viewports (高性能独立视口渲染)
```

---

### 审计结论
现有代码库已具备稳固的行情数据流、Canvas 交互图表、形态识别与全套指标计算数学底座。V2 重构需在保持底层指标计算一致性的前提下，升级顶部行情栏、建立 TradingView 级 9 大模块选项卡结构，并补齐技术总览仪表盘、基本面估值表与量化多因子评分深度视图。

**STOCK DETAIL AUDIT COMPLETED. AWAITING NEXT PHASE DIRECTIVE.**
