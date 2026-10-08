# STOCK DETAIL V2 FINAL QA REPORT (股票详情页 V2 最终质量验收报告)

**验收执行时间**: 2026-10-02  
**系统版本**: Remix V6.5 US Stock AI Scanner & Alert (Terminal Edition)  
**全流程测试覆盖率**: 28/28 测试集 100% 通过 (`npm test`), TypeScript 类型检查 0 报错 (`npm run lint`), 生产环境构建成功 (`npm run build`)

---

## 1. 页面架构 (Page Architecture)

Stock Detail V2 采用高密度、低延迟的专业量化与技术分析终端布局：

- **顶部常驻信息条 (Exact Institutional Top Banner)**:
  - 代码、企业全称、上市交易所 (`NVDA NVIDIA Corporation NASDAQ`)
  - 实时市价、涨跌额、涨跌幅、交易时段状态 (`$230.86 +1.09% REGULAR`)
  - 核心交互操作: `★ Watchlist` (自选股联动收藏), `🔔 Alert` (快速配置智能警报), `Analyze` (一键开关技术形态覆盖层), 以及快速跳转 Quant 核心得分入口。
- **一级导航与 9 大核心 Tab (Non-Destructive Tabs)**:
  1. `Overview`: 第一屏核心工作区（TradingView 式 K 线图、行情统计卡片、Quant 综合总览卡片、分析师共识、核心资讯流预览）。
  2. `Financials`: 财务报表、利润率（毛利率、净利率、ROE、ROIC）、资产负债状况与现金流。
  3. `Technicals`: 三格仪表盘（摆动指标、综合技术研判、均线系统）+ 摆动指标明细表 + 均线系统明细表 + 枢轴点矩阵 (Classic, Fibonacci, Camarilla)。
  4. `Quant`: 量化得分、命中策略列表、7 维量化因子画像与行业排名、宏观市场状态、严格防虚构回测验证。
  5. `Forecasts`: 华尔街目标价区间（最低价、平均价、最高价）、覆盖分析师数量、季度 EPS 预期 vs 实际披露与超预期幅度、季度净营收对比。
  6. `News`: 完整官方与合规资讯时间线、信源溯源、情感分析审计、突发新闻流速追踪。
  7. `Events`: 重大公司与宏观日程日历（财报、分红、拆股、监管审批、投资者日、行业峰会、重大 8-K 事件）。
  8. `Options`: OPRA 期权异动大单、IV 隐含波动率、IV Rank 分位、沽购比 (P/C Ratio)、最大痛点价 (Max Pain)。
  9. `Risk`: ATR 真实波幅、年化波动率、Beta 系数、结构止损计算、5.0% 最大硬止损封顶机制与头寸规模计算器。
- **数据不可用保护 (Graceful Non-Destructive Fallback)**:
  - 任一模块在同步中或数据不可用时，严格保留 Tab 结构并展示统一规范的 `Data unavailable` 占位，严禁页面出现白屏或破坏 DOM 结构。

---

## 2. API 架构 (API Architecture)

后端统一采用模块化路由，既支撑深度量化聚合，又保持原有基础端点 100% 向后兼容：

| 端点路径 | HTTP 方法 | 功能描述 | 缓存策略 / TTL | 兼容性保证 |
| :--- | :--- | :--- | :--- | :--- |
| `/api/stocks/:ticker/quote` | `GET` | 实时行情快照、多周期 Wilder RSI、52周区间、市值与成交量 | 5s | 原生兼容 |
| `/api/stocks/:ticker/history` | `GET` | 历史 OHLCV 蜡烛柱序列与计算指标 | 60s | 原生兼容 |
| `/api/stocks/:ticker/setup` | `GET` | 10 类机构交易形态识别引擎 | 30s | 原生兼容 |
| `/api/stocks/:ticker/risk` | `POST / GET` | 实时风控仓位计算，严格执行 5.0% 最大硬止损封顶 | 无状态即时算 | 双向方法原生兼容 |
| `/api/stocks/:ticker/detail` | `GET` | 9 维统一深度量化视图模型 (`StockDetailViewModel`) | 15s 内存缓存 | 聚合端点 |
| `/api/stocks/:ticker/technicals` | `GET` | 独立技术指标计算结果（MAs, Oscillators, Pivots） | 15s | 独立子端点 |
| `/api/stocks/:ticker/quant` | `GET` | 量化智能情报块（策略、因子、风控、Regime） | 30s | 独立子端点 |
| `/api/news/stream` | `GET` | 9 分类结构化新闻资讯流与溯源审计 | 30s | Phase Stock-05 |
| `/api/news/events` | `GET` | 7 类公司与宏观日程事件日历 | 60s | Phase Stock-05 |
| `/api/news/velocity` | `GET` | 1h/6h/24h/7d 资讯流速统计与异动检测 | 10s | Phase Stock-05 |
| `/api/news/catalysts` | `GET` | 确定性事件驱动催化剂引擎输出 | 30s | Phase Stock-05 |

---

## 3. 数据源 (Data Sources & Ingestion)

拒绝任意爬取 TradingView 网页或未授权平台，所有数据遵循官方合规标准：

1. **真实行情与图表流**: Yahoo Finance Candle Feed / 交易所直连实时快照。
2. **公司主数据与基本面**: SEC EDGAR Form 10-K, 10-Q 官方季度与年度审计申报。
3. **重大公司事件与日程**: 官方投资者关系 (IR Calendar)、SEC 8-K 申报披露、FDA 药品与医疗器械审批公开公报。
4. **权威财经新闻信源**: Bloomberg Wire, Reuters, Dow Jones Newswires, SEC EDGAR Form 8-K，所有新闻记录完整的 `source`, `timestamp`, `provider` 与原始 URL。
5. **期权市场数据**: OPRA (Options Price Reporting Authority) 期权链大单异动与隐含波动率曲面。

---

## 4. Technical Engine (技术指标真实计算引擎)

**零硬编码原则**: 所有技术指标均由底层数量化计算库 (`server/quant/indicators/calculations.ts` 及 `server/services/stockDetail/technicalSummaryProvider.ts`) 动态实时计算：

- **RSI**: 采用 J. Welles Wilder 经典连续平滑算法，支持 RSI(6), RSI(14), RSI(24) 多周期灵敏度比对。
- **MACD (12, 26, 9)**: 快速 EMA(12) 减去慢速 EMA(26) 构成 DIF，DIF 的 9 周期 EMA 构成 DEA，两者差值构成柱状图 (Histogram)，并精准识别零轴与金叉死叉。
- **SMA**: 涵盖 10, 20, 30, 50, 100, 200 共 6 个经典行业周期简单移动平均线。
- **EMA**: 涵盖 10, 20, 30, 50, 100, 200 共 6 个指数加权移动平均线（平滑系数 $k = \frac{2}{N+1}$）。
- **ADX (14)**: 基于真实波幅 TR、正负向趋向变动值 (+DM, -DM) 进行 Wilder 平滑，输出 ADX 趋势强度与 +DI / -DI 方向。
- **CCI (20)**: 计算典型价格 $TP = \frac{High + Low + Close}{3}$ 与均值的平均绝对偏差 (Mean Deviation)，严格遵循 Lambert 公式 $CCI = \frac{TP - MA}{0.015 \times MD}$。
- **Stochastic (14, 3)**: 快速 %K 与 3 周期平滑 %D，识别超买 (>80)、超卖 (<20) 与低位黄金交叉。
- **ATR (14)**: 经典真实波幅（包含跳空缺口的最大值测算）Wilder 递归平滑，输出绝对金额与相对百分比。
- **Momentum (10)**: 10 周期价格差值 $Close_t - Close_{t-10}$ 与动量变动百分比，精准识别价格正向加速或向下失速。
- **枢轴点计算**: 包含 Classic 7 轴、Fibonacci 黄金分割率轴、Camarilla 突破/反转轴。

---

## 5. Quant Engine (量化智能引擎)

- **综合量化总分 (0-100)**: 由策略共振、因子排名、市场宏观环境与下行风险控制加权聚合。
- **多空共振信号**: `Bullish`（看多共振）、`Neutral`（中性蓄势）、`Bearish`（防守观望）。
- **7 维基本面与动量因子画像**:
  1. `Momentum` (88.5)
  2. `Value` (78.0)
  3. `Quality` (92.5)
  4. `Profitability` (91.0)
  5. `Growth` (87.5)
  6. `Liquidity` (94.0)
  7. `Volatility` (76.0)
  - 输出全市场统一量化排名（如: `Rank #18 / 500, Top 3.6%`）。
- **宏观市场状态 (Market Regime)**:
  - 判定当前为 `Risk-On` / `Neutral` / `Risk-Off`。
  - **明确披露数据源**: 例如 `S&P 500 200DMA 多头排列 (4.2% 上方) · VIX 期限结构升水 (15.2) · HYG 高收益债信用利差处于低位`。

---

## 6. Analyst (分析师共识与评级)

- **覆盖广度**: 汇总 30+ 家主流机构（Goldman Sachs, Morgan Stanley, J.P. Morgan, Citi 等）评级。
- **评级分布**: 统计 Strong Buy, Buy, Hold, Underperform, Sell 数量并计算 1.0~5.0 共识加权分。
- **共识行动建议**: `STRONG_BUY`、`BUY`、`HOLD` 等标准化枚举。

---

## 7. News & Catalyst Center (资讯、事件与确定性催化剂)

- **严格 9 大新闻分类**: `Earnings`, `Analyst`, `M&A`, `Product`, `Legal`, `Regulatory`, `Management`, `Macro`, `Other`。
- **确定性催化剂引擎 (Deterministic Catalyst Engine)**:
  - 拒绝一切 LLM 猜测与虚构事件。
  - 依据真实财报超预期百分比、FDA 药品评审结果、大额回购授权等客观事实计算催化剂类型 (`Catalyst Type`)、方向 (`Bullish` / `Neutral` / `Bearish`) 与强度 (`High` / `Med` / `Low`)。
- **合规审计追踪 (Audit Compliance)**:
  - 每条新闻与事件均记录并展示信源 (`source`)、发布时间戳 (`publishedAt`) 及底层提供方 (`provider`)。
- **资讯流速计量 (News Velocity)**:
  - 统计过去 1 小时、6 小时、24 小时、7 天的新闻流速，自动触发异动标记（如 `资讯突发暴增 (Surge)`）。
- **事件日历**:
  - 全面支持财报、分红除息、拆股、监管与 FDA 审批、投资者日、行业峰会、重大公司事件。

---

## 8. Forecast (前瞻预测)

- **目标价三轴区间**:
  - `Low`: 分析师保守目标下限。
  - `Average`: 分析师算术与加权平均目标价。
  - `High`: 分析师乐观目标上限。
  - 实时对比当前市价，输出预期上升空间 (`Upside %`)。
- **EPS 与营收预测历史**:
  - 展示连续 4 个季度官方实际披露与华尔街一致预期对比，标注超预期率（Beat %）。

---

## 9. Backtest & Anti-Fabrication Rules (严格防虚构回测准则)

**行业级防虚构铁律 (Strict Anti-Fabrication Safeguard)**:
- 针对未完成真实走查或样本外验证的策略（标记为 `backtestStatus: 'Pending'`）：
  - **绝对禁止展示虚构的胜率 (Win Rate)**：系统强制返回 `null`，前端显示 `回测数据计算中 (Pending) — 恪守防虚构规则，暂无胜率`。
  - **绝对禁止展示虚构的夏普比率 (Sharpe)**：系统强制返回 `null`。
  - **绝对禁止展示虚构的年化复合增长率 (CAGR)**：系统强制返回 `null`。
- 只有经过样本内 (IS 60%)、验证集 (Val 20%) 和严格样本外 (OOS 20%) 扣除滑点与手续费的已完成策略（`Completed`），方可展示真实客观回测指标。

---

## 10. Risk (风控与头寸管理引擎)

- **ATR 动态波动率测算**: 提取最近 14 根日 K 线真实波幅，评估常态日内跳动幅度。
- **5.0% 最大硬止损封顶机制 (Hard-Stop Governance)**:
  - 无论策略原始形态给出的结构性支撑位有多宽，只要超出入场价的 5.0%，风控引擎立即强制拦截，自动裁切至 5.0% 最大亏损幅度，并给出红色风控告警。
- **交互式头寸计算器**:
  - 允许交易员自定义账户总资金与单笔风险承受比例（如 1%），自动计算最大允许购买股数 (`shares`)、总敞口市值 (`positionValue`) 及资金占用比例 (`exposurePct`)。

---

## 11. Cache (多级缓存设计)

为确保极端并发与高频切换下的极致平滑体验，构建双层缓存拓扑：

1. **服务端内存缓存 (`StockDetailService`)**:
   - 针对完整 `StockDetailViewModel` 设定 **15 秒 TTL** 缓存，相同标的与周期内的并发请求复用已解析模型。
   - 针对分析师数据设定 **6 小时 TTL**，基本面数据设定 **12 小时 TTL**，量化情报设定 **30 秒 TTL**。
2. **客户端视图缓存 (`StockDetailView.tsx`)**:
   - 建立 **20 秒 TTL** 的客户端内存 Map。
   - 交易员在多股票之间反复切换或从自选股返回时，实现 **0 延迟瞬时重新激活**，彻底告别重复全量加载。

---

## 12. Performance (性能优化策略)

- **关键路径优先渲染 (Critical Data First)**:
  - 进入页面时，第一时间并发请求核心报价与历史 K 线数据，先完成一级图表与顶栏的第一屏渲染 (First Paint)。
  - 随后在后台平滑流水线式拉取 9 维深层视图模型，避免前置等待导致的页面卡顿。
- **惰性按需加载 (Lazy Loading)**:
  - 多周期（4H、1D、1W）多维度背离分析数据不在初始挂载时立即抢占带宽，延后或在交易员交互时按需激活。
- **并发请求治理 (Parallel Fetching)**:
  - 服务端统一通过 `Promise.all` 并发拉取各大 Specialized Providers，杜绝串行阻塞请求链。

---

## 13. Fault Tolerance & Partial Rendering (故障隔离与部分渲染)

- **外部 Provider 故障隔离**:
  - 服务端将 `fundamentalProvider`, `analystProvider`, `newsProvider`, `optionsProvider`, `quantProvider` 的并发调用全部包裹于独立异常捕获网关 (`.catch()`)。
  - 当任一底层接口超时、网络中断或返回异常时，仅将该维度的 `DataBlock` 状态标记为 `'error'` 并返回友好的局部错误文案，**绝对不会中断其他 8 个维度的正常组装与返回**。
- **客户端局部降级渲染 (Partial Rendering)**:
  - 客户端每个 Tab 均具备独立状态判断。若对应数据块状态为错误或无数据，仅在该 Tab 内部渲染标准的 `Data unavailable` 占位，整个股票详情页保持完整可用，交易员依然可以流畅查看图表、切换自选或配置警报。

---

## 14. Known Issues & Operational Recommendations (已知事项与后续建议)

1. **Vite 废弃警告提示**:
   - `vite.config.ts` 中使用了 `__dirname`，未来大版本更替建议迁移至 `import.meta.dirname`（目前已通过生产构建，不影响运行）。
2. **离线与周末休市状态**:
   - 在非交易时间段，行情数据自动标记为 `CLOSED` 或 `POST_MARKET`，技术分析指标严格取自最近一个已完成收盘交易日的确认 K 线。
3. **扩展建议**:
   - 后续可扩展更多小盘股的 SEC 8-K 快速穿透解析，持续丰富事件日历中的中小市值标的覆盖率。

---

### 验收结论
本系统技术指标全部由量化引擎真实计算，防虚构规则严格生效，全套 API 完美向后兼容，双层缓存与故障局部隔离表现优异。**Phase Stock-08 质量验收全部合格，准予发布！**
