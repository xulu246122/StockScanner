# STRATEGY ENGINE AUDIT (PHASE 0)
**Version:** 1.0.0  
**Target:** US Stock Terminal — Professional Strategy & Screening Engine Upgrade  
**Date:** 2026-09-30  

---

## 1. 当前 Filters 架构分析

目前项目的筛选架构主要由两部分构成：
- **前端交互层** (`src/views/ScreenerView.tsx` & `src/components/screener/ScreenerTable.tsx`)：
  - 采用顶部单排浮动胶囊唤起轻量级浮层（Sector Sheet、Market Cap Sheet、Filters Drawer）。
  - 其中 Filters Drawer 采用**长单列纵向滚动**模态窗，将周期、9个硬编码预设（`STRATEGY_PRESETS`）、交易所、RSI计算周期线性堆叠。
  - 缺乏多条件组合（无法同时要求“底背离 + 成交量放大 + 均线多头”），仅支持单选单一 preset。
- **后端执行层** (`server/services/screenerService.ts` & `server/routes/api.ts`)：
  - 接收静态结构体 `ScreenerFilter` (`market`, `sector`, `minMarketCap`, `timeframe`, `preset`, `rsiPeriod`)。
  - 在内存中对 `STOCK_UNIVERSE` 进行线性循环，在循环体内串行调用 `marketDataProvider.getQuote` 和 `getHistoricalPrices`。
  - 预设通过 `switch(filter.preset)` 进行硬编码条件判断（如 `OVERSOLD_30`, `BULLISH_DIV`, `MA_BULLISH`）。
  - 没有指标缓存层、没有通用 AST/条件解析引擎，无法扩展新指标与复合策略。

---

## 2. 当前已有技术指标清单

在 `server/quant/indicators.ts` 与 `server/services/rsiEngine.ts` 中已实现的计算：
1. **Wilder RSI**: 支持周期 (6, 9, 14, 21, 30)，采用经典 Wilder 平滑算法。
2. **SMA (Simple Moving Average)**: 任意周期的简单移动平均线。
3. **EMA (Exponential Moving Average)**: 指数加权移动平均线。
4. **ATR (Average True Range)**: 真实波幅与 ATR% 波动率指标。
5. **Relative Volume (RVOL)**: 当前柱量能相比前 20 周期平均成交量的放大倍数。
6. **MA 排列 (简化版)**: Screener 中硬编码比较 `MA(7)` 与 `MA(25)`。
7. **RSI 极值与背离检测 (启发式)**: 比较最近 10 根 vs 前 15 根 K 线的价格低点与 RSI 低点斜率。

---

## 3. 当前已有 Strategy 及其局限

现有 9 个硬编码 Strategy Presets：
- `OVERSOLD_20`, `OVERSOLD_25`, `OVERSOLD_30`, `OVERSOLD_35`: 仅单变量 Wilder RSI 阈值判断，缺少趋势与质量过滤。
- `OVERBOUGHT_70`, `OVERBOUGHT_75`, `OVERBOUGHT_80`: 仅单变量 Wilder RSI 超买判断。
- `BULLISH_DIV` / `BEARISH_DIV`: 基于切片极值的启发式判定，缺乏 pivot 点校验与确立确认。
- `MA_BULLISH` / `MA_BEARISH`: 硬编码 `Price > MA7 > MA25`，缺少大周期趋势（如 50/200 日线）过滤与倾角确认。

**核心缺陷**：
- Strategy 与 Indicator 混为一谈（RSI < 30 本质是指标条件，而非完整策略体系）。
- 无任何策略作者、学术出处、文献依据或证据等级元数据。
- 参数固定死锁（无法修改均线周期或背离灵敏度）。
- 无法将策略规则与 Chart 上的技术标记、Alert Engine 预警规则实现 100% 逻辑复用。

---

## 4. 缺失技术指标清单 (需建立 Indicator Registry)

按金融工程标准划分为 11 大类别：
1. **PRICE**: 52W High, 52W Low, 距高点跌幅%, 距低点涨幅%, 跳空 Gap%, 柱内振幅%。
2. **MOVING AVERAGES**: SMA (5, 10, 20, 21, 50, 100, 150, 200), EMA (5, 9, 10, 20, 21, 34, 50, 100, 200), MA 斜率, 均线缠绕与发散度。
3. **MOMENTUM**: RSI (2, 6, 14, 24), MACD (Fast, Slow, Signal, Hist), Stochastic (%K, %D), Williams %R, CCI, ROC, Momentum。
4. **TREND**: ADX (14), +DI / -DI, Aroon (Oscillator, Up, Down), Linear Regression Slope。
5. **VOLATILITY**: Bollinger Bands (Upper, Middle, Lower, BandWidth, %B), Keltner Channels, Donchian High/Low (20, 55)。
6. **VOLUME**: Volume SMA, Relative Volume (RVOL), OBV (On-Balance Volume), Volume Spike, Up/Down Volume Ratio。
7. **PRICE STRUCTURE**: Pivot High/Low, Consolidation Box (High, Low, Width), 52W High Break, Range Compression/Expansion。
8. **RELATIVE STRENGTH**: 标的对 SPY/QQQ 的 1M/3M/6M 相对强弱 RS Rating、百分位排名。
9. **MARKET CONTEXT**: 大盘 Regime (Risk-On / Risk-Off), VIX 状态, 大盘 50SMA 上方占比。
10. **FUNDAMENTALS**: PE, Forward PE, PS, PB, EV/EBITDA, 营收同比增速, 净利润同比增速, ROE, 资产负债率。
11. **EVENTS**: 下次财报日距今天数, 财报超预期率, 股息派发日 (无数据时展示清晰的 N/A，杜绝伪造)。

---

## 5. 缺失策略模型库 (Strategy Registry V1)

按持仓周期与交易风格划分：
- **SHORT-TERM (1–10 Trading Days)**:
  1. *Donchian Breakout* (Richard Donchian / CME 趋势突破): 20/55周期通道突破 + RVOL > 1.0。
  2. *Darvas Box Breakout* (Nicolas Darvas / 经典箱体突破): 箱顶突破 + 箱底止损参考 + 放量确认。
  3. *Connors RSI(2) Mean Reversion* (Larry Connors): 长期趋势线上方 (Close > SMA200) + 极端超跌 (RSI(2) < 10) + 均值回归反弹。
  4. *Elder Impulse System* (Alexander Elder): 13 EMA 斜率向上 + MACD Histogram 动能柱逐浪走高。
  5. *Elder Triple Screen* (Alexander Elder): 多周期协同 (日线大趋势 26 EMA + 4H 震荡回撤 + 1H 突破触发)。
  6. *Wyckoff Spring & SOS* (Richard D. Wyckoff / Wyckoff Method): 交易区间洗盘弹簧 (Spring) 与强势出现 (Sign of Strength)。
- **SWING & MOMENTUM (10–60 Trading Days)**:
  7. *Minervini-style SEPA Trend Template* (Mark Minervini 公开学术规则范式): 阶段2上升趋势模板 (200SMA向上, 150SMA>200SMA, 50SMA>150SMA, 突破或贴近52周新高)。
  8. *O'Neil / IBD-style Growth Breakout* (William O'Neil 公开规则范式): 营收/利润强劲成长 + RS 相对强度排名高位 + 枢轴点放量突破。
  9. *Weinstein Stage Analysis* (Stan Weinstein): 30周 (150日) 均线走平转升 + Stage 2 突破形态。
  10. *Jegadeesh-Titman Momentum Factor* (学术经典 1993): 3-12个月动量排序、行业超额收益。
  11. *Classic Trend Following*: EMA20 > EMA50 且 ADX > 20。
- **LONG-TERM & FACTORS**:
  12. *Value Investing Template* (Fama-French / Graham-Dodd): 低 PE / PB / EV-EBITDA 估值分位数。
  13. *Quality Factor Template* (学术 Quality / CFA 体系): 高 ROE、稳健毛利率、低财务杠杆。
  14. *Fama-French Multi-Factor*: Size, Value, Profitability, Investment 综合因子定位。

---

## 6. 可复用代码

- `server/services/marketDataProvider.ts`: 稳定的实时行情与历史 K 线拉取、多时间级别聚合、Yahoo/Finnhub/Polygon 适配及重试机制。
- `server/services/stockUniverse.ts`: 涵盖标普 500、纳斯达克 100 核心资产的标的字典（含代码、名称、交易所、行业、市值等）。
- `server/quant/indicators.ts`: 已验证的 Wilder RSI、SMA、EMA、ATR、RVOL 基础数学实现。
- `src/components/charts/PriceChart.tsx` & `src/components/charts/TradeSetupOverlay.tsx`: 绘制 K 线与交易设置层的高性能 SVG 渲染器。
- `server/services/alertEngine.ts` & `notificationDispatcher.ts`: 预警规则持久化与匹配触发系统。

---

## 7. 需要重构的代码

1. `server/services/screenerService.ts`:
   - 移除写死在 switch-case 中的指标判断逻辑。
   - 引入统一的 `ConditionEngine` 求解器与 `IndicatorCache`，由条件树动态求值。
2. `src/views/ScreenerView.tsx`:
   - 彻底废除移动端/桌面共用的长纵列 Filters 模态窗。
   - 升级为桌面端 **3 栏矩阵抽屉 (Category -> Available Filters -> Selected Conditions)**。
   - 移动端升级为标准分步 Sheet（分类 Tab + 选中列表浮动栏）。
3. `server/types.ts` & `src/types.ts`:
   - 扩展出标准的 AST 节点类型 `ConditionNode`, `ConditionGroup`, `StrategyDefinition`, `IndicatorDefinition`, `SavedStrategy`。

---

## 8. Data Dependency 分析

| 指标/策略类别 | 所需数据源 | 数据完备性 | 降级处理机制 |
|---|---|---|---|
| K线与价格 (OHLCV) | `marketDataProvider.getHistoricalPrices` | 100% 实时支持 (10m 到 1M) | 最少需要 60 根 bar，不足时安全截断 |
| 动量与趋势指标 (RSI, EMA, ADX, ATR) | 计算自 OHLCV 序列 | 100% 离线数学支持 | 缓存于 `IndicatorCache`，单股票单周期仅算一次 |
| 多周期协同 (Elder Triple Screen) | 同时依赖 1D、4H、1H 三级 K 线 | 依赖内存聚合引擎 | 批量预拉取并由服务层联合计算 |
| 相对强弱 (RS vs SPY/QQQ) | 基准指数 SPY / QQQ 历史收盘价 | 预拉取缓存基准历史收盘 | 指数数据全局单例共享，不重复请求 |
| 基础财务与事件数据 (PE, ROE, 财报日) | `marketDataProvider.getQuote` & 静态元数据字典 | 核心股具备，部分缺失 | 缺失项显式返回 `null` / `N/A`，不允许编造假数据 |

---

## 9. Strategy Engine 架构设计 (三层解耦)

```
┌─────────────────────────────────────────────────────────────┐
│                 LAYER 3: CUSTOM STRATEGY LAYER              │
│       User AST: AND / OR / NOT, Nested Condition Groups     │
│         Parameters, Confluence Scores, Save & Duplicate     │
└──────────────────────────────┬──────────────────────────────┘
                               │ references
┌──────────────────────────────▼──────────────────────────────┐
│                 LAYER 2: STRATEGY REGISTRY LAYER            │
│   Pre-built Classic & Academic Templates (Donchian, Darvas,  │
│   Connors RSI(2), Minervini SEPA-style, Wyckoff, Elder)     │
│   Evidence Levels (Level A/B/C), Authors, Dynamic Rules AST │
└──────────────────────────────┬──────────────────────────────┘
                               │ evaluates via
┌──────────────────────────────▼──────────────────────────────┐
│                 LAYER 1: INDICATOR REGISTRY LAYER           │
│   Price, Trend, Momentum, Volatility, Volume, Structure,    │
│   Relative Strength, Market Context, Fundamentals           │
│     Parameterized Calculations + In-Memory Indicator Cache  │
└─────────────────────────────────────────────────────────────┘
```

- **统一求值引擎**：同一套 AST 规则引擎同时提供给：
  1. `ScreenerService`（全市场扫描与匹配）
  2. `StockDetailView / ChartOverlay`（单股票当前状态与图表画线标记）
  3. `AlertEngine`（盘中实时触发与通知推送）

---

## 10. UI 架构重构设计 (3 栏工作矩阵)

桌面端右侧滑入 3-Column Drawer（响应式 980px+ 全屏展开或浮层）：
```
┌────────────────────────────────────────────────────────────────────────┐
│ FILTERS & STRATEGY MATRIX (Close / Clear All / Apply)                  │
├───────────────────┬──────────────────────────┬─────────────────────────┤
│ 1. CATEGORY NAV   │ 2. AVAILABLE REPOSITORY  │ 3. ACTIVE CONDITIONS    │
│                   │                          │                         │
│ • Quick Presets   │ [ Search Indicators/.. ] │ [Active: 3 Conditions]  │
│ • Strategies (15) │                          │                         │
│   - Short-Term    │ 🟢 Donchian Breakout     │ ① RSI(14, 1D) < 30      │
│   - Swing         │   Rich. Donchian · Lvl A │   [edit] [remove]       │
│   - Position      │   [Use] [View Rules]     │      AND                │
│ • Indicators (11) │                          │ ② RVOL(20) > 1.2        │
│   - Price         │ ⚡ Darvas Box Breakout   │   [edit] [remove]       │
│   - Momentum      │   Nicolas Darvas · Lvl B │      AND                │
│   - Volume        │   [Use] [View Rules]     │ ③ Price > EMA(20)       │
│   - Trend         │                          │                         │
│ • Custom Builder  │ 📈 Connors RSI(2)        │ [ + Add Condition ]     │
│ • Saved (3)       │   Larry Connors · Lvl A  │ [ Save as My Strategy ] │
└───────────────────┴──────────────────────────┴─────────────────────────┘
```
- **Rule Detail Drawer**: 点击 `View Rules` 展开策略详细档案卡（作者、出处论文/著作、证据等级、入场/失效逻辑、风险框架与参数滑块）。
- **Use Strategy**: 立即将策略解构注入第 3 栏 Active Conditions 树，允许自由微调、增删条件后执行。
- **Conflict Detector**: 自动校验互斥逻辑（如 `RSI < 30 AND RSI > 70`）并给出警示条，杜绝无效扫描。

---

## 11. 文件级修改计划

### 后端与量化核心
1. `server/types.ts`: 引入 AST、IndicatorDefinition、StrategyDefinition、StrategyEvidence 等全套类型定义。
2. `server/quant/indicators/registry.ts`: 建立 11 大类指标元数据注册表。
3. `server/quant/indicators/calculations.ts`: 补全 MACD、ADX、Aroon、Stochastic、Bollinger、Donchian、Pivot 等指标计算。
4. `server/quant/conditions/conditionEngine.ts`: 实现 AST 条件树求值、操作符求值（GT, LT, CROSS_UP, BETWEEN 等）与冲突检测。
5. `server/quant/strategies/registry.ts`: 建立首批经典与学术策略注册表及证据元数据。
6. `server/services/indicatorCache.ts`: 针对股票代码 + 时间级别 + 指标参数的内存记忆化缓存。
7. `server/services/screenerService.ts`: 接入 ConditionEngine，支持 AST 查询与复合排序。
8. `server/routes/api.ts`: 增加 `/api/strategies`, `/api/indicators`, `/api/screener/custom`, `/api/strategies/saved` 接口。

### 前端与用户界面
9. `src/types.ts`: 同步前端 AST、Strategy 与 Indicator 类型定义。
10. `src/services/apiClient.ts`: 增加策略库、指标库、自定义策略执行与保存 API 方法。
11. `src/components/screener/StrategyMatrixDrawer.tsx`: 实现 3 栏式专业策略/指标/已选条件抽屉。
12. `src/components/screener/StrategyRuleModal.tsx`: 实现策略学术出处、文献证据、参数调节详情弹窗。
13. `src/components/screener/CustomConditionBuilder.tsx`: 实现 AND/OR 嵌套条件树可视化编辑器。
14. `src/views/ScreenerView.tsx`: 替换老旧单列筛选器，接入新 Matrix Drawer 与策略状态指示。
15. `src/components/charts/TradeSetupOverlay.tsx`: 与策略引擎联动，支持 Donchian/Darvas 箱体和止损参考线图表渲染。

---

## 12. PHASE 1–12 执行计划与路线图

- **PHASE 0 (Audit & Planning)**: 完成全盘架构代码审计与实施计划（当前阶段）。
- **PHASE 1 (Indicator Registry)**: 建立 Indicator Registry 与计算库，实现 11 分类指标元数据，集成单元测试。
- **PHASE 2 (Condition Engine)**: 实现支持 GT/LT/CROSS/BETWEEN/AND/OR/NOT 的 AST 条件引擎与冲突检测。
- **PHASE 3 (Strategy Registry)**: 建立首期 5 大核心策略 (Donchian, Darvas, Connors RSI2, Elder Impulse, Momentum) 并挂载学术出处与证据等级。
- **PHASE 4 (Strategy Library UI)**: 开发策略库展示、搜索与学术文献 Drawer。
- **PHASE 5 (Filter UI 重构)**: 重写 Filters UI 为 3 栏工作矩阵 (Category - Available - Selected)，支持移动端自适应。
- **PHASE 6 (Custom Strategy Builder)**: 实现用户自由添加条件、组装嵌套条件树、保存为专属策略。
- **PHASE 7 (Strategy → Screener)**: 全局扫描求值、多因子打分、状态流转（Setup/Triggered/Invalidated）。
- **PHASE 8 (Strategy → Chart)**: 策略边界与入场点在 PriceChart 与 Overlay 同步画线。
- **PHASE 9 (Strategy → Alert)**: 统一逻辑闭环，从选出的标的一键创建预警规则。
- **PHASE 10 (Validation & Compliance)**: 增加非黑盒说明与免责标注（无收益承诺、Not Backtested 标志）。
- **PHASE 11 (Performance & Caching)**: 指标批处理求值与内存缓存加速。
- **PHASE 12 (QA & Polish)**: 全终端断点响应式测试、无数据/冲突状态测试与最终验收。

---

## 13. 每个 Phase 的验收标准

- **Phase 1 验收**: 所有新指标函数包含输入边界测试（不足 bar、NaN 容错），TypeScript 类型完全通过。
- **Phase 2 验收**: AST 逻辑引擎能在测试用例中正确判定各种复合条件（AND、OR、NOT 组合嵌套），并且能捕获互斥冲突。
- **Phase 3 验收**: 策略元数据完备（含 author, sourceReference, evidenceLevel），无任何夸大收益广告语。
- **Phase 4-5 验收**: 桌面端 3 栏矩阵交互流畅，移动端抽屉正常收放，彻底告别单列超长滚动。
- **Phase 6 验收**: 用户自定义条件树能保存至 LocalStorage/API，并可再次载入和修改。
- **Phase 7-9 验收**: Screener 筛选出的股票，打开 Chart 时能看到对应的策略标记线，点击 Create Alert 能无缝继承同一套触发条件。
- **Phase 10-12 验收**: `npm run build` 和 `tsc --noEmit` 0 报错，无破坏旧版 API 兼容性。

---

## 14. 风险与回滚方案

1. **计算性能风险**:
   - *风险*: 扫描上百只标的的多重指标可能导致 API 耗时增加。
   - *防范*: 仅在进入匹配范围后按需计算重指标；引入全局 60s `IndicatorCache`；默认扫描高流动性标的（用户确认的核心宇宙）。
2. **向下兼容风险**:
   - *风险*: 旧的 UI 或客户端依赖原有的 `preset: 'OVERSOLD_30'` 等字段。
   - *防范*: 保留 `ScreenerFilter` 兼容层，将旧 preset 自动转换映射为 AST 语法树求值，对外 API 保持向前兼容。
3. **回滚方案**:
   - 保持所有老接口入参格式向后兼容，若前端新版抽屉发生异常，备用兼容模式可直接降级使用标准预设。
