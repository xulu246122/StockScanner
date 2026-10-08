# 🛸 Antigravity 二次开发工程手册 (Antigravity Developer Kit)

本项目已完成深度优化与适配，支持无缝导出至本地电脑，并使用 **Antigravity** 平台与自主 Agent 进行二次开发。

---

## 1. 快速上手 (Quick Start)

### 1.1 环境要求
- **Node.js**: v18.0.0 或更高版本（推荐 v20.x LTS）
- **包管理器**: npm (或 pnpm / yarn / bun)
- **操作系统**: macOS / Linux / Windows (WSL2 推荐)

### 1.2 本地运行三步法
```bash
# 1. 安装项目所有依赖
npm install

# 2. 复制环境配置文件
cp .env.example .env

# 3. 启动全栈一体化开发服务 (Express 后端 + Vite 极速前端热更新)
npm run dev
```
打开浏览器访问：[http://localhost:3000](http://localhost:3000)

### 1.3 核心 npm 脚本速查
| 命令 | 说明 | 适用场景 |
| :--- | :--- | :--- |
| `npm run dev` | 启动全栈 Express + Vite 开发服务 (端口 3000) | 日常开发与调试 |
| `npm run dev:inspect` | 附带 Node.js Inspector 调试器模式启动 | 深度断点调试量化底层算法 |
| `npm run check` | 执行 TypeScript 类型检查 + 全量 28 个量化测试 | 提交代码前完整健康检查 |
| `npm run antigravity:check` | 运行 Antigravity 专属 7 维智能体诊断脚本 | Agent 自动化验证与自检 |
| `npm test` | 执行全套量化模型、指标计算与合规防虚构单元测试 | 算法与金融逻辑回归测试 |
| `npm run lint` | 执行 TypeScript 严格类型检查 (`tsc --noEmit`) | 代码质量审查 |
| `npm run build` | 构建生产环境前端与静态资源包 | 部署上线 |

---

## 2. 架构拓扑 (System Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    React 19 SPA (Frontend)                  │
│   src/views/StockDetailView.tsx (统一 9 维量化钻取终端)     │
│   src/components/charts/BinanceTradingChart.tsx (K线引擎)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / WebSocket (Port 3000)
┌──────────────────────────────▼──────────────────────────────┐
│                    Express Full-Stack Server                 │
│   server.ts -> server/routes/api.ts (RESTful 路由网关)      │
├─────────────────────────────────────────────────────────────┤
│                    Core Quant Services                      │
│   ├─ marketDataProvider.ts (混合数据流 / 离线平滑降级)     │
│   ├─ stockDetailService.ts (9 维 ViewModel 组装 / 15s 缓存) │
│   ├─ technicalSummaryProvider.ts (26 项指标技术评级引擎)    │
│   ├─ masterStrategyRegistry.ts (72 种量化策略注册中心)      │
│   ├─ riskEngine.ts (5.0% 最大硬止损封顶风控引擎)            │
│   ├─ catalystEngine.ts (确定性事件驱动催化剂引擎)           │
│   └─ sessionClock.ts (纽交所交易时钟与数据品质标签)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 数据源策略与离线开发 (Hybrid Data Feeds)

本项目支持在 `.env` 中通过 `DATA_FEED_MODE` 控制数据策略：

- **`DATA_FEED_MODE="hybrid"` (推荐默认)**:
  - 优先拉取 Yahoo Finance 与 SEC EDGAR 实时公开数据；
  - 若遇网络超时、断网或外部 API 限制，系统**毫秒级平滑降级**至内置的代表性离线数据集（包含 NVDA, AAPL, MSFT 等历史 OHLCV 蜡烛柱与 9 维指标），绝不会导致页面白屏或接口崩溃。
- **`DATA_FEED_MODE="offline"`**:
  - 完全脱机运行，跳过所有外网请求，适合飞机、高铁或企业内网等无外网环境下的极速算法开发与前端调试。
- **`DATA_FEED_MODE="live"`**:
  - 严格实时模式，直接与金融数据提供商握手。

---

## 4. Antigravity Agent 专用 Prompt 与指令集

将本项目导入 Antigravity 后，建议将以下 System Prompt 指令注入您的 Antigravity Agent：

```markdown
# Antigravity Agent Directives for US Stock Quant Terminal

你正在作为顶级量化工程师和全栈专家对本项目进行二次开发。在修改或新增代码时，你必须严格恪守以下工程铁律：

1. 【全平台 100% 纯单机模式铁律 (100% Standalone Mode)】:
   Windows 桌面端与 Android 移动端均不采用“服务端中继模式”，必须 100% 单机脱机独立运行。零外部 Node 中继服务依赖，所有行情拉取、Wilder RSI、ATR14、做市商衰竭量化指标、暴跌 4+1 模型、多因子雷达打分与条件预警均由客户端本地引擎 (`directMarketProvider.ts` / SQLite WASM) 独立闭环完成。

2. 【三大官方默认数据接口与授权 Key (Default Market Data APIs & Keys)】:
   系统默认内置并配置以下 3 大权威官方市场数据接口，支持多源自动故障转移 (Auto Failover)：
   - **Finnhub API KEY**: `dauanj1r01qkvn4p3qi0dauanj1r01qkvn4p3qig` (最新实时报价、标的搜索、SPY/QQQ/DIA、新闻)
   - **Massive (Polygon) API KEY**: `1mfijJuxcpzxhX_0GshqQ3N7SV9s8mlP` (高频 K 线蜡烛柱、历史交易数据、全美股切片)
   - **Alpha Vantage API KEY**: `LIWYBWJZZWD1NII5` (备用行情通道、历史多源冗余校准)

3. 【5.0% 最大硬止损风控铁律 (Hard-Stop Governance)】:
   无论任何形态或策略计算出的止损价有多宽，当止损幅度超过入场价的 5.0% 时，必须通过 `riskEngine.ts` 强制截断并告警，严禁放行大额亏损敞口。

4. 【严格防虚构准则 (Anti-Fabrication Safeguard)】:
   对于标记为 `backtestStatus: 'Pending'` 的未完成样本外走查策略，胜率 (Win Rate)、夏普比率 (Sharpe Ratio) 和年化回报率 (CAGR) 必须严格返回 `null`，前端显示待计算状态，绝对禁止捏造或随机生成虚构的回测统计数据！行情展示必须源自真实接口或真实本地历史缓存。

5. 【真实指标计算原则 (No Hardcoded Technicals)】:
   所有技术指标（包括 Wilder RSI 14、ATR14、MACD、SMA、EMA、ADX、CCI、Stochastic、Momentum、布林带等）必须经由纯数学公式动态计算，禁止在组件或 Mock 数据中硬编码静态读数。

6. 【质量门禁与测试 100% 通过】:
   每次修改完成后，请在终端执行 `npm.cmd test`，确保全部 53 项大型量化与端到端集成测试 100% 全绿通过。

7. 【Windows 桌面端仅编译 win-unpacked 快速启动版 (No Integrated Installer)】:
   每次编译 Windows 桌面端时，只需编译生成 `release/win-unpacked/` 目录下的快速启动版（可直接运行的绿色版，主程序为 `V6.5 Desktop Preview.exe`），彻底废除并严禁编译生成集成安装包（NSIS .exe 安装引导程序）。
```

---

## 5. 二次开发扩展指南 (Recipes)

### 5.1 如何新增一个自定义技术指标？
1. **编写计算公式**:
   在 `server/quant/indicators/calculations.ts` 中实现纯函数数学计算（入参为价格序列数组或 OHLCV，输出单值或时间序列）。
2. **接入 26 指标技术研判引擎**:
   打开 `server/services/stockDetail/technicalSummaryProvider.ts`，在 `oscItems` 或 `maItems` 中加入新增指标的 Buy/Neutral/Sell 条件判定。
3. **前端自动呈现**:
   `StockDetailView.tsx` 会自动渲染新增指标的读数与多空操作标签。

### 5.2 如何新增一个量化策略？
1. **定义策略 AST**:
   在 `server/quant/strategies/` 对应分类目录（`shortTerm/`, `swing/`, `position/`）下创建新策略定义文件。
2. **注册到主策略库**:
   在 `server/quant/strategyRegistry.ts` 中将其追加到 `ALL_STRATEGIES` 列表。
3. **验证回测与防虚构规则**:
   若策略未完成严格样本外回测，配置 `backtestStatus: 'Pending'`，`backtestMetrics: { winRate: null, sharpeRatio: null, cagr: null }`。
4. **运行测试**:
   执行 `npm test`，确认自动化测试套件识别并验证通过。

### 5.3 如何新增图表或指标覆盖层？
- 核心专业 K 线图位于 `src/components/charts/BinanceTradingChart.tsx`。
- 支持基于 High-DPI Canvas 绘制自定义均线、布林通道、成交量分析或形态标注覆盖层。
- 图表已支持明亮浅色模式（默认）与暗色专业模式一键切换。

---

## 6. 核心 API 契约一览

| 端点路径 | HTTP 方法 | 说明 | 缓存 TTL |
| :--- | :--- | :--- | :--- |
| `/api/stocks/:ticker/quote` | `GET` | 实时行情快照、多周期 RSI、成交量、日内波幅 | 5s |
| `/api/stocks/:ticker/history` | `GET` | 历史蜡烛柱 (OHLCV) 与指标序列 | 60s |
| `/api/stocks/:ticker/setup` | `GET` | 10 类专业交易形态扫描 | 30s |
| `/api/stocks/:ticker/risk` | `POST / GET` | 动态头寸计算与 5% 硬止损校验 | 实时 |
| `/api/stocks/:ticker/detail` | `GET` | 9 维统一股票详情 ViewModel 聚合视图 | 15s |
| `/api/stocks/:ticker/technicals` | `GET` | 26 项量化技术指标评级与仪表盘 | 15s |
| `/api/stocks/:ticker/quant` | `GET` | 量化情报、因子画像与市场状态 | 30s |
| `/api/strategies` | `GET` | 72 种量化策略元数据与清单 | 300s |
| `/api/news/stream` | `GET` | 结构化权威财经新闻与来源溯源 | 30s |
| `/api/news/catalysts` | `GET` | 确定性事件驱动催化剂列表 | 30s |

---

## 7. 故障排查 (Troubleshooting)

- **Q: 启动报端口占用 `EADDRINUSE: 3000`？**
  - A: 可以在 `.env` 中修改 `PORT=3001`，或者使用命令 `lsof -ti:3000 | xargs kill -9` 释放端口。
- **Q: 离线时请求股票报错或等待时间过长？**
  - A: 在 `.env` 中设置 `DATA_FEED_MODE="offline"`，系统将完全使用本地零延迟模拟回测数据集。
- **Q: 运行 `npm run check` 出现类型报错？**
  - A: 运行 `npm run lint` 观察具体报错代码行，确保所有新添加的字段均在 `types.ts` 或 `server/types/stockDetail.ts` 中完成类型声明。
