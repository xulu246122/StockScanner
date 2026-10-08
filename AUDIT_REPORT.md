# Strategy Library V2.0 — Codebase Audit Report (Phase 01)

> **审计执行人**: Senior Quant Research & Architecture Engineer  
> **审计日期**: 2026-10-02  
> **审计性质**: 全量真实代码静态扫描、AST规则解析与依赖图谱逆向分析（无虚构、无假设、纯实证）  
> **状态**: 审计已完成，代码库保持绝对洁净（无任何代码改动）

---

## 核心问答清单（严格回答必须回答的 23 个问题）

| # | 审计问题 | 实测核查结论 |
|---|---|---|
| **1** | **当前 Strategy Registry 实际在哪里？** | 真实源头在 `server/quant/strategies/catalog/` (8 个子模块)，汇总于 `server/quant/strategies/catalog/index.ts`，主注册表导出为 `server/quant/strategies/registry.ts`（`RAW_STRATEGY_REGISTRY` 与 `QUANT_STRATEGY_REGISTRY`）。前端由 `src/mock/quantStrategiesMock.ts` 导入该注册表并通过 `src/engine/strategyModesHelper.ts` 初始化自适应模式，最终注入 `src/engine/strategyEngine.ts` 单例的 `builtInStrategies` 内存 Map 中。 |
| **2** | **当前到底有多少策略？** | **精确为 62 个策略**（`ALL_QUANT_CATALOG_MODELS.length === 62`）。 |
| **3** | **当前三种模式分别有多少？** | 按照 UI 筛选计算函数 `getStrategyModelMode()` 运算结果：<br>• **SHORT_TERM (短线)**: **45 款**<br>• **SWING (波段)**: **1 款**<br>• **POSITION (中长线)**: **16 款**<br>（若按策略原始定义中的 `family` 字段统计：short_term 25 个，swing 18 个，position 8 个，factor 11 个）。 |
| **4** | **为什么 UI 显示 短线 45、波段 1、中长线 16？** | 根源在 `src/components/quant/StrategyLibrarySidebar.tsx` 的 `getStrategyModelMode()` 函数正则逻辑失准：<br>`if (f === 'short_term' || l.includes('短线') || (h.includes('day') && !l.includes('中期'))) return 'SHORT';`<br>大量在 `family: 'swing'` 中定义的波段策略，其 `horizon` 文本写为 `"3-15 Trading Days"`, `"5-20 Trading Days"` 等，因为包含字符串 `"day"` 且未包含 `"中期"`，全被首条规则拦截强制归类为 `SHORT`（共 45 款）；只有 `turtle_system_1` 的 `horizon` 值为 `"2-8 Weeks"` 且 holding 标签为 `"波段 2-8周"`，成功避开 `"day"` 命中 fallback 成为唯一的 `SWING`（1 款）；其余包含 `factor`, `position`, `month`, `year`, `长线` 的 16 款进入 `LONG`。 |
| **5** | **为什么总数显示 62？** | 8 个策略子分类文件模型总数正好为 62：Trend(10) + MeanReversion(9) + Breakout(9) + Factor(9) + SmartMoney(8) + StatArb(6) + AiMl(7) + MacroRegime(4) = 62。UI 中的总数标签 `{filteredAndSortedStrategies.length} / {strategies.length}` 直接读取了实际数组长度 62。 |
| **6** | **是否存在重复策略？** | 策略 ID 层面无完全相同主键，但在测试与预警模块中存在**悬空与冲突的策略别名**：如 `test/productionTestSuite.ts` 中引用 `rsi_2_mean_reversion`，而在目录中为 `connors_rsi2`；`server/services/strategyAlertService.ts` 预设警报中引用 `elder_impulse`，但在目录中为 `elder_triple_screen`。 |
| **7** | **是否存在相同策略不同名称？** | 存在高相似度与概念冗余，例如：`bollinger_mean_revert` 与 `keltner_mean_reversion`（底层 AST 条件高度同质化）；`connors_rsi2` 与 `wilder_oversold_rebound`（同为 RSI 超卖反弹，仅周期参数不同）。 |
| **8** | **是否存在错误分类？** | **严重存在**！多达 19 个策略被错误分类至短线或中长线，如经典波段策略 `supertrend_momentum`（波段3-15天）、`kama_adaptive_trend`（波段5-20天）、`intraday_high_breakout`（波段5-25天）、`adx_trend_strength`（波段3-15天）、`triple_ema_alignment`（波段5-20天）等，由于 horizon 中包含 "Days" 均被错误挤压到短线池。 |
| **9** | **是否存在不存在/无实际计算逻辑的策略？** | **存在严重逻辑退化**！目录中所有 62 个策略的 AST `rules` 实际**仅使用了 5 个基础指标**（`price`, `changePercent`, `distFrom52wHigh`, `relative_volume`, `rsi`）。所有 AI/ML（Transformer、LSTM、LightGBM、PPO强化学习、VAE）、统计套利（协整配对、三角套利）、多因子（Piotroski F-score 9分制）以及宏观（桥水全天候四宫格）模型，均未实现其核心算法，而是用简单的 RSI/涨跌幅/放量阈值作为代理（Proxy），缺乏真实底层执行逻辑。 |
| **10** | **是否存在虚构作者？** | **存在**！包含虚构的团队与伪造归属，例如：`Deep Quant Research Group (Vaswani et al. Architecture)`、`Microstructure Alpha Desk`、`Deep Quant Asset Pricing Laboratory`、`Smart Money Tracker Group`、`Statistical Arbitrage Quant Group` 等虚构机构，以及将纯学术机器学习论文作者（如 VAE 发明人 Kingma & Welling、随机森林发明人 Leo Breiman、LSTM 发明人 Schmidhuber）直接虚构为量化选股策略作者。 |
| **11** | **是否存在无法验证的来源？** | **存在**！12 款模型来源标为桌面自营/内幕跟踪类描述（如 "Dark Pool Block Inflow"、"Microstructure Alpha Desk" 等），无任何可考证的文献、学术报告或公开实证记录，必须标记为 `UNVERIFIED`。 |
| **12** | **是否存在虚构胜率？** | **全量存在硬编码虚构**！全部 62 个策略均直接在代码中静态硬编码了 `winRateEst`（如 `76.2%`, `74.5%`, `71.2%` 等），没有一个数字是由本项目实际回测引擎运行产出。 |
| **13** | **是否存在虚构 Sharpe？** | **全量存在硬编码虚构**！全部 62 个策略均硬编码了 `sharpeEst`（如 `2.65`, `2.58`, `2.52`, `2.38` 等），并在 `StrategyLibrarySidebar.tsx` 中直接参与综合得分（Composite Score）加权计算，严重误导展示。 |
| **14** | **strategy.id 被哪些代码引用？** | 全库共有 51 处引用：<br>1) API 路由：`/api/quant/strategies/:id/run`, `/api/screener/strategy`, `/api/quant/backtest/run`, `/api/quant/backtest/history`<br>2) 后端引擎：`screenerService.ts`, `backtestEngine.ts`, `indicatorCache.ts`, `strategyAlertService.ts`<br>3) 前端组件与引擎：`strategyEngine.ts`, `QuantStrategyView.tsx`, `StrategyLibrarySidebar.tsx`, `PerformancePanel.tsx`, `CreateStrategyAlertModal.tsx`, `TradeSetupOverlay.tsx`（硬编码了 `darvas_box` 与 `donchian_breakout`）。 |
| **15** | **strategy.slug 被哪些代码引用？** | **0 处引用**！全库无论是前后端类型定义、目录模型还是 API，均未对 `slug` 进行赋值或读取。 |
| **16** | **UI 是否写死数量？** | **UI 界面没有写死 45、1、16 或 62 这些硬编码常量**，所有计数字段均由 `modeCounts[mode]` 动态遍历 `strategies` 计算产生，失衡数字完全是由于过滤函数归类缺陷与目录数据所致。 |
| **17** | **API 是否依赖旧 strategy ID？** | **是**！`/api/quant/strategies/:id/run` 严格以 `:id` 查找策略，找不到立即返回 404；`/api/screener/strategy` 与 `/api/quant/backtest/run` 接受 `strategyId`，若找不到则回退到 `STRATEGY_REGISTRY[0]`。 |
| **18** | **LocalStorage 是否保存旧 strategy ID？** | `src/engine/strategyEngine.ts` 中保存了自定义策略 key `quant_user_custom_strategies`，里面包含用户自建策略对象及其生成的 ID（`custom_strategy_${Date.now()}`）；官方内置策略未在 LocalStorage 存储固定 ID。 |
| **19** | **Watchlist 是否保存 strategy ID？** | **否**！Watchlist 无论在前后端均只存储股票代码数组（`string[]`，如 `['NVDA', 'AAPL', ...]`），不绑定任何策略 ID。 |
| **20** | **Alert 是否保存 strategy ID？** | **是**（特定于策略预警）！`StrategyAlert` 数据结构明确持久化 `strategy_id: string`；且当前默认预警种子数据中包含 `connors_rsi2`, `donchian_breakout`, `elder_impulse`（失效悬空ID）, `high_rvol_spike`。 |
| **21** | **Backtest 是否依赖 strategy ID？** | **是**！`BacktestConfig`, `BacktestResult`, `BacktestJob` 均严格要求 `strategyId`，回测历史查询接口 `/api/quant/backtest/history?strategyId=...` 以 `strategyId` 为主过滤键。 |
| **22** | **Screener 是否直接读取 mock 策略？** | 常规选股页 `ScreenerView.tsx` 是纯技术指标/RSI维度筛选，不读取策略模型；而策略选股工作区（`QuantStrategyView.tsx`）则通过 `strategyEngine` 读取 `MOCK_QUANT_STRATEGIES`，并调用后端 `/api/quant/strategies/:id/run`。 |
| **23** | **Strategy Engine 是否直接依赖 quantStrategiesMock？** | **是**！`src/engine/strategyEngine.ts` 第 13 行显式 `import { MOCK_QUANT_STRATEGIES } from '../mock/quantStrategiesMock.ts';` 并在构造函数中直接加载所有条目。 |

---

## A. Current Repository Structure

当前与策略体系直接相关的核心目录结构如下：

```
├── server/
│   ├── quant/
│   │   ├── conditions/
│   │   │   └── conditionEngine.ts        # AST 规则解析与条件求值引擎
│   │   ├── indicators/
│   │   │   ├── calculations.ts           # 核心数学指标计算 (SMA, EMA, ATR, MACD, RSI, 等)
│   │   │   └── registry.ts               # 指标元数据定义
│   │   ├── strategies/
│   │   │   ├── catalog/                  # 8个独立策略目录分类
│   │   │   │   ├── aiMlModels.ts         # 7款 AI/ML 模型
│   │   │   │   ├── breakoutModels.ts     # 9款 突破模型
│   │   │   │   ├── factorModels.ts       # 9款 多因子模型
│   │   │   │   ├── index.ts              # 汇聚导出 ALL_QUANT_CATALOG_MODELS (共62款)
│   │   │   │   ├── macroRegimeModels.ts  # 4款 宏观周期模型
│   │   │   │   ├── meanReversionModels.ts# 9款 均值回归模型
│   │   │   │   ├── smartMoneyModels.ts   # 8款 机构资金模型
│   │   │   │   ├── statArbModels.ts      # 6款 统计套利模型
│   │   │   │   └── trendModels.ts        # 10款 趋势跟踪模型
│   │   │   └── registry.ts               # 后端统一策略注册表 (RAW_STRATEGY_REGISTRY)
│   │   ├── riskEngine.ts                 # 组合风控核心逻辑
│   │   └── setupEngine.ts                # K线图表形态与交易设置识别
│   ├── routes/
│   │   └── api.ts                        # 策略执行、选股、回测与预警 API 路由
│   ├── services/
│   │   ├── backtestEngine.ts             # 服务端回测引擎与历史记录
│   │   ├── indicatorCache.ts             # 股票多指标计算上下文缓存与策略求值
│   │   ├── screenerService.ts            # 策略全市场扫描与候选池过滤服务
│   │   └── strategyAlertService.ts       # 策略级预警触发与状态监控
│   └── types.ts                          # 服务端统一类型定义
│
├── src/
│   ├── components/
│   │   ├── charts/
│   │   │   └── TradeSetupOverlay.tsx     # 包含 darvas_box / donchian_breakout 特化图层
│   │   ├── quant/
│   │   │   ├── CreateStrategyAlertModal.tsx# 策略警报创建弹窗
│   │   │   ├── PerformancePanel.tsx      # 策略回测与绩效展示面板
│   │   │   ├── StrategyLibrarySidebar.tsx# 策略模型库导航栏（含核心分类逻辑）
│   │   │   ├── StrategyWorkspaceMain.tsx # 策略交互核心工作台（参数、逻辑、回测）
│   │   │   └── TradingStyleSelector.tsx  # 三种交易模式自适应切换器
│   ├── engine/
│   │   ├── backtestVectorEngine.ts       # 客户端向量化回测引擎
│   │   ├── riskManagementEngine.ts       # 交易头寸风控与止损裁决引擎
│   │   ├── strategyEngine.ts             # 客户端策略生命周期管理（单例）
│   │   └── strategyModesHelper.ts        # 短线/波段/中长线 3模参数自动适配生成器
│   ├── mock/
│   │   └── quantStrategiesMock.ts        # 导入 server 注册表并封装自适应模式
│   ├── services/
│   │   └── apiClient.ts                  # REST API 客户端 (包含 runQuantStrategy 等)
│   ├── types.ts                          # 前端类型规范
│   └── views/
│       └── QuantStrategyView.tsx         # 量化策略主视图（组合各组件与引擎）
```

---

## B. Current Strategy Registry

注册表现状架构为 **双端镜像+适配器**：
1. **服务端源头**: `server/quant/strategies/registry.ts`
   ```typescript
   export const RAW_STRATEGY_REGISTRY: StrategyDefinition[] = ALL_QUANT_CATALOG_MODELS;
   export const QUANT_STRATEGY_REGISTRY: StrategyDefinition[] = RAW_STRATEGY_REGISTRY.map(s => ensureStrategyModes(s));
   ```
2. **客户端镜像**: `src/mock/quantStrategiesMock.ts`
   ```typescript
   export const RAW_MOCK_QUANT_STRATEGIES: StrategyDefinition[] = RAW_STRATEGY_REGISTRY;
   export const MOCK_QUANT_STRATEGIES: StrategyDefinition[] = RAW_MOCK_QUANT_STRATEGIES.map(s => ensureStrategyModes(s));
   ```
3. **运行时管理器**: `src/engine/strategyEngine.ts`
   ```typescript
   class StrategyEngineImpl {
     private builtInStrategies: Map<string, StrategyDefinition> = new Map();
     private userCustomStrategies: Map<string, StrategyDefinition> = new Map();
     // 初始化时将 MOCK_QUANT_STRATEGIES 载入 Map
   }
   ```

---

## C. Current Strategy Count

| 子分类目录文件 | 策略数量 | 占比 |
|---|:---:|:---:|
| `trendModels.ts` (趋势跟踪) | 10 | 16.1% |
| `meanReversionModels.ts` (均值回归) | 9 | 14.5% |
| `breakoutModels.ts` (通道突破) | 9 | 14.5% |
| `factorModels.ts` (多因子) | 9 | 14.5% |
| `smartMoneyModels.ts` (机构资金) | 8 | 12.9% |
| `statArbModels.ts` (统计套利) | 6 | 9.7% |
| `aiMlModels.ts` (AI 量化) | 7 | 11.3% |
| `macroRegimeModels.ts` (宏观对冲) | 4 | 6.5% |
| **全库总计 (Total Models)** | **62** | **100%** |

---

## D. SHORT_TERM Count (短线模型审计)

- **UI 页面当前显示数量**: **45 款**
- **策略实际短线意图 (1–10 交易日)**: **约 28 款**
- **当前被强制塞入短线的策略清单 (45款全部枚举)**:
  1. `donchian_breakout` (短线 1-10天)
  2. `elder_triple_screen` (短线 2-10天)
  3. `supertrend_momentum` (波段 3-15天 — **误判进入**)
  4. `kama_adaptive_trend` (波段 5-20天 — **误判进入**)
  5. `parabolic_sar_trend` (短线 3-12天 — **误判进入**)
  6. `adx_trend_strength` (波段 3-15天 — **误判进入**)
  7. `triple_ema_alignment` (波段 5-20天 — **误判进入**)
  8. `connors_rsi2` (超短线 1-5天)
  9. `wilder_oversold_rebound` (短线 1-5天)
  10. `stoch_double_bottom` (短线 2-8天)
  11. `cci_oversold_thrust` (短线 2-6天)
  12. `williams_r_exhaustion` (超短线 1-5天)
  13. `bollinger_mean_revert` (短线 2-8天)
  14. `dpo_detrended_osc` (波段 3-10天 — **误判进入**)
  15. `mfi_divergence_reversion` (短线 2-7天)
  16. `keltner_mean_reversion` (短线 2-7天)
  17. `darvas_box` (短线 2-15天 — **误判进入**)
  18. `bollinger_squeeze` (短线 2-10天)
  19. `ttm_squeeze_breakout` (短线 2-8天)
  20. `atr_volatility_expansion` (短线 3-12天 — **误判进入**)
  21. `chaikin_volatility_surge` (短线 2-8天)
  22. `nr7_range_breakout` (超短线 1-5天)
  23. `intraday_high_breakout` (波段 5-25天 — **误判进入**)
  24. `vwap_band_breakout` (短线 1-5天)
  25. `opening_range_breakout` (超短线 1-3天)
  26. `high_rvol_spike` (短线 1-5天)
  27. `obv_institutional_accum` (波段 2-15天 — **误判进入**)
  28. `cmf_persistent_inflow` (波段 3-15天 — **误判进入**)
  29. `pvt_bullish_divergence` (短线 2-10天)
  30. `dark_pool_block_inflow` (短线 1-7天)
  31. `closing_auction_rush` (超短线 1-3天)
  32. `vwap_institutional_defense` (波段 2-10天 — **误判进入**)
  33. `order_flow_imbalance` (超短线 1-3天)
  34. `pairs_trading_cointegration` (短线 2-15天 — **误判进入**)
  35. `zscore_cross_sectional_arb` (短线 1-8天 — **误判进入**)
  36. `etf_nav_premium_arbitrage` (短线 2-10天)
  37. `dual_class_spread_convergence` (波段 3-20天 — **误判进入**)
  38. `lead_lag_cross_asset` (短线 1-5天)
  39. `triangular_correlation_arb` (短线 2-10天)
  40. `transformer_temporal_momentum` (短线 2-10天)
  41. `lstm_regime_switch` (波段 3-15天 — **误判进入**)
  42. `lightgbm_rank_alpha` (波段 5-20天 — **误判进入**)
  43. `rl_policy_trend_following` (短线 2-12天 — **误判进入**)
  44. `vae_liquidity_anomaly` (短线 1-5天)
  45. `random_forest_alpha_ensemble` (波段 3-15天 — **误判进入**)

---

## E. SWING Count (波段模型审计)

- **UI 页面当前显示数量**: **仅 1 款** (`turtle_system_1`)
- **策略实际波段意图 (5–20 交易日 / 1–4 周)**: **18 款**
- **当前被漏判波段模型的根因**: 绝大多数波段模型在其 `horizon` 字段中写了包含 `"Days"` 的区间（如 `"3-15 Trading Days"`），被 `StrategyLibrarySidebar.tsx` 的前置判定全部劫持至 `SHORT`。

---

## F. POSITION Count (中长线持仓模型审计)

- **UI 页面当前显示数量**: **16 款**
- **实际分布**:
  1. `minervini_trend_template` (中期 1-6月)
  2. `weinstein_stage2` (中期 1-6月)
  3. `jt_momentum` (中期 1-6月)
  4. `fama_french_size_mom` (中长线 3-12月)
  5. `piotroski_f_score` (中长线 3-12月)
  6. `low_volatility_anomaly` (长线 1-12月)
  7. `novy_marx_profitability` (中长线 2-12月)
  8. `carhart_four_factor` (中期 1-6月)
  9. `dividend_yield_growth` (长线 3-24月)
  10. `sue_earnings_momentum` (中期 1-3月)
  11. `q_factor_growth_combo` (中长线 2-12月)
  12. `deep_feature_orthogonal` (中期 5-30天 — **误判进入**)
  13. `bridgewater_all_weather` (长线 1-12月)
  14. `sector_rs_rotation` (中期 1-3月)
  15. `treasury_sensitive_defense` (长线 3-12月)
  16. `merrill_clock_expansion` (中期 2-6月)

---

## G. Duplicate Strategies & Identifier Conflicts (重复与冲突策略)

1. **悬空预警 ID**:
   - `server/services/strategyAlertService.ts`: 第 56 行预置警报引用 `strategy_id: 'elder_impulse'`。经查，全库注册表只有 `elder_triple_screen`，导致该默认预警的策略元数据查找返回 `undefined`。
2. **测试用例 ID 脱节**:
   - `test/productionTestSuite.ts`: 第 64 行引用 `strategyId: 'rsi_2_mean_reversion'`。而实际注册表中主键为 `connors_rsi2`。
3. **指标与形态近义重复**:
   - `bollinger_squeeze` (通道突破) vs `ttm_squeeze_breakout` (通道突破): 两者均采用布林带与肯特纳通道挤压指标，参数微调，本质逻辑重叠。
   - `bollinger_mean_revert` vs `keltner_mean_reversion`: 底层触发均为下轨破位回归。

---

## H. Misclassified Strategies (详细误分类审计)

共有 **19 个策略**在当前 UI 的模式过滤器中被错误分类：

| Strategy ID | 策略定义中的 Family | Holding 标签 | Horizon 字符串 | 当前UI模式 | 真实合理归类 |
|---|---|---|---|:---:|:---:|
| `supertrend_momentum` | swing | 波段 3-15天 | 3-15 Trading Days | **SHORT** | **SWING** |
| `kama_adaptive_trend` | swing | 波段 5-20天 | 5-20 Trading Days | **SHORT** | **SWING** |
| `parabolic_sar_trend` | short_term | 短线 3-12天 | 3-12 Trading Days | **SHORT** | **SWING** |
| `adx_trend_strength` | swing | 波段 3-15天 | 3-15 Trading Days | **SHORT** | **SWING** |
| `triple_ema_alignment` | swing | 波段 5-20天 | 5-20 Trading Days | **SHORT** | **SWING** |
| `dpo_detrended_osc` | swing | 波段 3-10天 | 3-10 Trading Days | **SHORT** | **SWING** |
| `darvas_box` | short_term | 短线 2-15天 | 2-15 Trading Days | **SHORT** | **SWING** |
| `atr_volatility_expansion` | short_term | 短线 3-12天 | 3-12 Trading Days | **SHORT** | **SWING** |
| `intraday_high_breakout` | swing | 波段 5-25天 | 5-25 Trading Days | **SHORT** | **SWING** |
| `obv_institutional_accum` | swing | 波段 2-15天 | 2-15 Trading Days | **SHORT** | **SWING** |
| `cmf_persistent_inflow` | swing | 波段 3-15天 | 3-15 Trading Days | **SHORT** | **SWING** |
| `pairs_trading_cointegration` | short_term | 短线 2-15天 | 2-15 Trading Days | **SHORT** | **SWING** |
| `zscore_cross_sectional_arb` | short_term | 短线 1-8天 | 1-8 Trading Days | **SHORT** | **SWING** |
| `dual_class_spread_convergence` | swing | 波段 3-20天 | 3-20 Trading Days | **SHORT** | **SWING** |
| `lstm_regime_switch` | swing | 波段 3-15天 | 3-15 Trading Days | **SHORT** | **SWING** |
| `lightgbm_rank_alpha` | swing | 波段 5-20天 | 5-20 Trading Days | **SHORT** | **SWING** |
| `rl_policy_trend_following` | short_term | 短线 2-12天 | 2-12 Trading Days | **SHORT** | **SWING** |
| `random_forest_alpha_ensemble` | swing | 波段 3-15天 | 3-15 Trading Days | **SHORT** | **SWING** |
| `deep_feature_orthogonal` | factor | 中期 5-30天 | 5-30 Trading Days | **LONG** | **SWING** |

---

## I. Invalid Strategies (无真实计算逻辑 / 逻辑严重退化模型)

经严格提取 62 个策略的 AST `rules` 结构，发现以下模型**名不副实**：

| Strategy ID | 宣传功能与模型名称 | 代码中 AST 实际求值的真实规则 | 缺陷诊断 |
|---|---|---|---|
| `transformer_temporal_momentum` | 多头自注意力机制捕捉高维微观结构时序动量 | `RSI ∈ [52, 72]`, `RVOL >= 1.25`, `changePercent > 0.6%` | **伪 AI**：无任何 Transformer、Attention 矩阵或权重计算，纯粹是 RSI+放量阳线过滤器。 |
| `lstm_regime_switch` | 长短期记忆神经网络市场状态切换 | `RSI > 54`, `changePercent > 0.5%` | **伪深度学习**：无循环单元或隐藏状态，仅为常规趋势过滤。 |
| `lightgbm_rank_alpha` | 梯度提升树多因子非线性排序模型 | `RSI ∈ [50, 75]`, `RVOL >= 1.1`, `distFrom52wHigh >= -20%` | **伪机器学习**：无树模型推断，纯静态范围过滤。 |
| `rl_policy_trend_following` | 强化学习 (PPO) 自适应策略 | `RSI > 52`, `changePercent > 0.4%`, `distFrom52wHigh >= -25%` | **伪强化学习**：无 Agent/Policy/Reward 逻辑。 |
| `pairs_trading_cointegration` | 协整配对交易残差均值回归 | `RSI ∈ [32, 68]`, `relative_volume >= 1.0` | **伪套利**：无配对标的资产、无协整检验 (ADF)、无价差 (Spread) Z-Score。 |
| `triangular_correlation_arb` | 三角相关性与统计离散度套利 | `RSI ∈ [35, 65]`, `relative_volume >= 1.1` | **伪离散度套利**：无多资产关联度矩阵。 |
| `bridgewater_all_weather` | 桥水全天候风险平价资产配置 | `RSI ∈ [45, 70]`, `distFrom52wHigh >= -12%`, `price > 20` | **伪风险平价**：全天候是跨资产配置宏观模型，代码内强行降解为单只抗跌股票过滤器。 |
| `piotroski_f_score` | 9分制财务质地评分基本面优选 | `RSI ∈ [52, 75]`, `distFrom52wHigh >= -18%` | **缺少财务指标**：数据库无 ROA、杠杆、毛利率时序数据，退化为技术指标。 |

---

## J. Unverified Sources & Fake Authors (虚构作者与不可考信源)

以下 15 项策略的作者与信源存在严重虚构或不当引用问题：

| Strategy ID | 当前记录作者 | 诊断类型 | 事实与合规要求 |
|---|---|:---:|---|
| `transformer_temporal_momentum` | `Deep Quant Research Group (Vaswani et al. Architecture)` | **虚构作者** | 华尔街并无此公开量化机构；Vaswani 等人是注意力机制学术论文作者，非量化交易模型作者。应标记为 `UNVERIFIED` 或更正为学术启发模型。 |
| `vae_liquidity_anomaly` | `Kingma & Welling Deep Generative Architecture` | **作者不当移用** | Kingma & Welling 是变分自编码器发明学者，从未发布此股票选股策略。 |
| `random_forest_alpha_ensemble` | `Leo Breiman Ensemble Theory` | **作者不当移用** | Leo Breiman 是统计学泰斗，非量化股票作者。 |
| `lstm_regime_switch` | `Sepp Hochreiter & Jürgen Schmidhuber` | **作者不当移用** | LSTM 发明人，非选股策略作者。 |
| `closing_auction_rush` | `Microstructure Alpha Desk` | **虚构机构** | 虚构的交易柜台，无公开可查实证。标记为 `UNVERIFIED`。 |
| `dark_pool_block_inflow` | `Smart Money Tracker Group` | **虚构机构** | 无可信背书，数据源亦无实盘暗池逐笔数据。标记为 `UNVERIFIED`。 |
| `order_flow_imbalance` | `Rama Cont & Arseniy Kukanov` | **微观结构理论移用** | 论文为订单簿微观结构研究，日线级终端无法执行微秒级 LOB。 |
| `deep_feature_orthogonal` | `Deep Quant Asset Pricing Laboratory` | **虚构实验室** | 虚构机构。标记为 `UNVERIFIED`。 |
| `zscore_cross_sectional_arb` | `Statistical Arbitrage Quant Group` | **虚构机构** | 虚构机构。标记为 `UNVERIFIED`。 |
| `pvt_bullish_divergence` | `Institutional Quantitative Research` | **虚构机构** | 虚构机构。标记为 `UNVERIFIED`。 |
| `triangular_correlation_arb` | `Quantitative Correlation Arbitrage Desk` | **虚构机构** | 虚构机构。标记为 `UNVERIFIED`。 |
| `rl_policy_trend_following` | `Deep Reinforcement Learning Quant Desk` | **虚构机构** | 虚构机构。标记为 `UNVERIFIED`。 |
| `etf_nav_premium_arbitrage` | `Index Arbitrage Trading Desk` | **虚构机构** | 虚构机构。标记为 `UNVERIFIED`。 |
| `bridgewater_all_weather` | `Ray Dalio / Bridgewater Associates` | **误导性机构冠名** | 桥水未曾授权或发布此单股代码级量化选股模型。 |
| `merrill_clock_expansion` | `Merrill Lynch Strategy Team` | **宏观框架降级** | 美林时钟为宏观大类资产配置框架，非个股选股策略。 |

---

## K. Fake / Hardcoded Metrics (硬编码胜率与虚构 Sharpe 审计)

经遍历 `ALL_QUANT_CATALOG_MODELS`，**全部 62 个策略对象的胜率与夏普比率均为静态硬编码**：
- 最高硬编码胜率：`bridgewater_all_weather` (77.5%), `transformer_temporal_momentum` (76.2%), `dual_class_spread_convergence` (75.2%)。
- 最高硬编码夏普：`transformer_temporal_momentum` (2.65), `bridgewater_all_weather` (2.58), `dual_class_spread_convergence` (2.58), `pairs_trading_cointegration` (2.52)。
- **危害分析**: 在 `src/components/quant/StrategyLibrarySidebar.tsx` 中，`computeStrategyScore()` 直接将未经回测校验的 `winRateEst` 与 `sharpeEst` 组合生成综合得分，并以此为全站策略列表进行默认升序/降序排布，严重违反了“禁止伪造胜率”的总控铁律。

---

## L. Strategy ID Dependency Map (完整系统依赖拓扑)

```
[Strategy Definition Source Catalog]
  ├── server/quant/strategies/catalog/trendModels.ts
  ├── server/quant/strategies/catalog/meanReversionModels.ts
  ├── server/quant/strategies/catalog/breakoutModels.ts
  ├── server/quant/strategies/catalog/factorModels.ts
  ├── server/quant/strategies/catalog/smartMoneyModels.ts
  ├── server/quant/strategies/catalog/statArbModels.ts
  ├── server/quant/strategies/catalog/aiMlModels.ts
  └── server/quant/strategies/catalog/macroRegimeModels.ts
         ↓
[Catalog Index]
  server/quant/strategies/catalog/index.ts (ALL_QUANT_CATALOG_MODELS: 62)
         ↓
[Server Strategy Registry]
  server/quant/strategies/registry.ts (RAW_STRATEGY_REGISTRY, QUANT_STRATEGY_REGISTRY, getQuantStrategy)
         │
         ├───→ [Screener Service] server/services/screenerService.ts
         │       └── getStrategyDefinition(strategyId)
         │             ↓
         │           [Indicator Cache & Evaluator] server/services/indicatorCache.ts
         │             ↓
         │           [Condition AST Engine] server/quant/conditions/conditionEngine.ts
         │             ↓
         │           [API Route] POST /api/screener/strategy (req.body.strategyId)
         │
         ├───→ [Backtest Engine] server/services/backtestEngine.ts
         │       ├── seedDefaultResults (strategyId: 'connors_rsi2')
         │       ├── runBacktest(config.strategyId)
         │       └── listResultsForStrategy(strategyId)
         │             ↓
         │           [API Routes]
         │           ├── POST /api/quant/backtest/run
         │           └── GET /api/quant/backtest/history?strategyId=...
         │
         ├───→ [Strategy Alert Service] server/services/strategyAlertService.ts
         │       ├── seedDefaultStrategyAlerts (connors_rsi2, donchian_breakout, elder_impulse, high_rvol_spike)
         │       └── inferTriggerType(strategyId)
         │             ↓
         │           [API Route] POST /api/strategy-alert/create (strategy_id: string)
         │
         └───→ [Client Mock Mirror] src/mock/quantStrategiesMock.ts
                 └── MOCK_QUANT_STRATEGIES
                       ↓
                     [Strategy Engine Singleton] src/engine/strategyEngine.ts
                       ├── builtInStrategies: Map<string, StrategyDefinition>
                       └── userCustomStrategies: Map<string, StrategyDefinition>
                             ↓
                           [Quant Main View] src/views/QuantStrategyView.tsx
                             │
                             ├──→ [Sidebar] src/components/quant/StrategyLibrarySidebar.tsx
                             │      ├── getStrategyModelMode() -> SHORT / SWING / LONG
                             │      └── computeStrategyScore() -> compositeScore (based on fake winRate/sharpe)
                             │
                             ├──→ [Workspace] src/components/quant/StrategyWorkspaceMain.tsx
                             │      └── TradingStyleSelector.tsx (3 modes switcher)
                             │
                             ├──→ [Performance & Backtest Panel] src/components/quant/PerformancePanel.tsx
                             │      ├── client VectorEngine: BacktestVectorEngine.runSimulation()
                             │      └── API history: apiClient.getBacktestHistory(strategyId)
                             │
                             ├──→ [Alert Modal] src/components/quant/CreateStrategyAlertModal.tsx
                             │      └── POST /api/strategy-alert/create
                             │
                             └──→ [Chart Overlay] src/components/charts/TradeSetupOverlay.tsx
                                    └── 特殊 hardcoded strategyId: 'darvas_box' & 'donchian_breakout'
```

---

## M. API Dependency (API 端点依赖明细)

1. `POST /api/quant/strategies/:id/run`
   - 入参：URL 路径参数 `:id`，请求体 `{ parameters, timeframe, modeType, filter }`。
   - 依赖机制：调用 `getQuantStrategy(req.params.id)`。若找不到直接报错 404。
2. `GET /api/quant/strategies/:id`
   - 入参：URL 路径参数 `:id`。
   - 依赖机制：调用 `getQuantStrategy(req.params.id)`，返回单个策略定义。
3. `POST /api/screener/strategy`
   - 入参：请求体 `{ strategyId, timeframe, filter }`。
   - 依赖机制：调用 `getStrategyDefinition(strategyId) || STRATEGY_REGISTRY[0]`。
4. `POST /api/quant/backtest/run`
   - 入参：`BacktestConfig` 结构体，必传 `strategyId`。
   - 依赖机制：调用 `getStrategyDefinition(config.strategyId)` 进行回测仿真。
5. `GET /api/quant/backtest/history`
   - 入参：Query 参数 `strategyId`。
   - 依赖机制：根据 `strategyId` 过滤历史回测记录。
6. `POST /api/strategy-alert/create`
   - 入参：`StrategyAlert`，必须包含 `strategy_id`。

---

## N. UI Dependency (前端界面依赖明细)

1. `QuantStrategyView.tsx`:
   - 状态管理：`selectedStrategy: StrategyDefinition | null`。
   - 选定事件：传递 `strategyId` 到子组件、API 及风控面板。
2. `StrategyLibrarySidebar.tsx`:
   - 依赖 `strategies: StrategyDefinition[]`。
   - 依赖 `st.id === selectedStrategyId` 标识高亮选中态。
   - 依赖 `getStrategyModelMode(st)` 统计并分割三个模式（短线/波段/长线）。
3. `TradeSetupOverlay.tsx`:
   - 第 18-19 行显式匹配：
     `strategyEvaluation?.strategyId === 'darvas_box'`
     `strategyEvaluation?.strategyId === 'donchian_breakout'`
     用于在 K 线图层精准绘制达瓦斯箱体和唐奇安上下轨。
4. `TradingStyleSelector.tsx`:
   - 依赖 `strategy.modes`（由 `ensureStrategyModes()` 生成的 short_term, swing, position 三套参数与风控规则）。

---

## O. LocalStorage Dependency (本地持久化依赖明细)

1. `quant_user_custom_strategies`:
   - 位置：`src/engine/strategyEngine.ts`。
   - 内容：用户在前端创建的自定义策略列表（包含用户自定义的 ID，以 `custom_strategy_${timestamp}` 命名）。
   - 影响：重构官方内置策略 ID 不会破坏或覆盖用户自建策略的 LocalStorage，但需确保存储加载时能够正常适配新 schema。
2. `quant_user_indicator_params`:
   - 位置：`src/engine/indicatorEngine.ts`。
   - 内容：用户自定义的指标默认周期与阈值，不直接依赖 strategy ID。

---

## P. Migration Risk (重构迁移风险清单)

1. **ID 变更导致 404 / 悬空引用风险**：
   - 既有组件（`TradeSetupOverlay.tsx`、`CreateStrategyAlertModal.tsx`、`strategyAlertService.ts`）存在对特定 ID 的硬编码引用。直接删除或更名旧 ID 会导致图表覆盖层失效或警报触发异常。
2. **模式分类重新平衡对既有界面的冲击风险**：
   - 目前 UI 呈现 45/1/16，若将其调整为 24/24/24，必须保证 UI 渲染流畅，侧边栏分类标签、颜色指示器与搜索索引无缝衔接。
3. **AST 规则与真实指标计算脱节风险**：
   - 修复退化模型（如 AI/ML、高阶多因子）时，若引入未在 `calculations.ts` 与 `conditionEngine.ts` 中支持的指标 ID，会导致 `resolveIndicatorValue()` 命中 fallback 返回 `ctx.price`，造成选股完全失效。
4. **移除假数据后的指标空缺风险**：
   - 移除硬编码的胜率和夏普后，`StrategyLibrarySidebar.tsx` 的排序引擎（Composite Score）必须能够降级使用【文献证据等级】、【实测回测结果】或标注【待本地回测 (UNTESTED)】，不能出现 `NaN` 或空白崩溃。

---

## Q. Recommended Migration Plan (迁移路线推荐)

为实现 Strategy Library V2.0 目标（三大模式 SHORT: 24, SWING: 24, POSITION: 24，总量 72 款左右，可执行、反幻觉、数据求真）：

1. **架构层：引入 Strategy Registry Adapter 与类型加固 (Phase 02)**
   - 在 `types.ts` 中规范策略元数据，增加 `slug`, `strategySchool`, `mode` (`SHORT_TERM` | `SWING` | `POSITION`), `evidenceLevel`, `backtestStatus` (`LITERATURE_ONLY` | `LOCAL_TESTED` | `UNTESTED`) 等核心字段。
   - 增加 ID 兼容映射表（Legacy ID Adapter），保证原有的 `donchian_breakout`, `connors_rsi2`, `darvas_box` 等旧 ID 100% 向后兼容。
2. **模型层：清理伪科学与虚构模型，重构三大模式策略库 (Phase 03 - Phase 05)**
   - **SHORT_TERM (24个)**: 聚焦日内放量突破、开盘区间突破(ORB)、窄幅震荡突破(NR7)、RSI极值反弹、VWAP偏离回归、收盘前主力动能等经典且切实可执行的模型。
   - **SWING (24个)**: 修复当前被误判的波段模型，纳入门限均线系统、SuperTrend、KAMA自适应均线、布林带挤压、MACD双零轴共振、成交量多空比(OBV/CMF)、高低波段回踩等模型。
   - **POSITION (24个)**: 规范中长线趋势与多因子体系，纳入经典动量因子(Jegadeesh-Titman)、低波动异象、质量动量、米奈尔维尼VCP趋势模板、斯坦温斯坦第二阶段等具备坚实学术及实证支撑的模型。
3. **求真化：彻底清除硬编码指标与虚假机构 (Phase 06)**
   - 移除所有硬编码的 `winRateEst: 76.2%`、`sharpeEst: 2.65` 等造假数据；替换为明确的【文献研究证据 (Literature Evidence)】与【本地回测状态 (Backtest Status: UNTESTED / PENDING_LOCAL_RUN)】。
   - 清理所有虚构机构（如 Microstructure Alpha Desk、Deep Quant Asset Pricing Laboratory 等），不可考证的一律严肃标记为 `UNVERIFIED`。
4. **引擎层：验证可执行性与前后端联调测试 (Phase 07 - Phase 08)**
   - 保证全部 72 个策略的 AST 条件均可被 `ConditionEngine` 准确解析与执行，杜绝 fallback 到 `ctx.price` 的虚假逻辑。
   - 修复 `strategyAlertService.ts` 中的悬空 ID (`elder_impulse` -> `elder_triple_screen`)。
   - 运行自动化测试，验证 Screener、Backtest、Alert、Watchlist 与 UI 联动无损。

---

**Phase 01 审计总结**：
本阶段已完成对整个代码库的深入审计，全面梳理了策略定义源头、依赖图谱、分类计算失衡根因、硬编码虚假指标及 AST 规则真实情况。**本阶段未改动任何代码**。

等待指令：`继续 Phase 02`。
