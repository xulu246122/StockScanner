# 🛡️ StockScanner 核心开发规则与系统架构准则 (Development Rules)

> **生效版本**：V6.08+ 及后续所有版本  
> **适用平台**：Windows 桌面端 (Electron) + Android 移动端 (Capacitor 原生)  
> **适用对象**：所有协同开发工程师与 AI Agent (Antigravity / Gemini)

---

## 铁律一：全平台 100% 纯单机模式 (Standalone Mode)，彻底废弃“服务端中继模式”

1. **零外部中继依赖**：
   - **Windows 桌面端与 Android 移动端统一采用 100% 单机模式 (Standalone Mode)**。
   - **严禁依赖或默认启用“服务端中继模式 (Server Relay Mode)”**。终端无需依赖局域网外部 Node.js 电脑中继服务器，自身即为完备的独立量化交易终端。
2. **客户端本地闭环量化运算**：
   - 所有的实时股票搜索、报价拉取、K 线历史、Wilder RSI、ATR14、RVOL、做市商抛售衰竭分析、暴跌反弹 4+1 核心模型评估、多因子雷达打分、量化策略执行、蒙特卡洛压力测试与条件预警触发，**全部由客户端本地量化引擎 (`directMarketProvider.ts` / SQLite WASM)** 独立计算完成。
3. **架构防破坏原则**：
   - 在前端视图与客户端服务开发中，严禁假定存在远程服务端，严禁引入仅在服务端环境可用的硬编码依赖，确保客户端在任何单一设备上均可开箱即用、脱机独立运转。

---

## 铁律二：3 大默认市场数据接口与内置授权密钥规范 (Default Market Data APIs & Keys)

全系统默认内置并配置以下 3 个官方权威市场数据接口及对应 API Key，用于端到端直连获取实时行情：

| 数据服务商 | 核心职责与应用场景 | 默认授权 API Key |
| :--- | :--- | :--- |
| **1. Finnhub** | 实时最新报价、股票基础元数据搜索、SPY/QQQ/DIA 大盘核心指数、公司新闻 | `dauanj1r01qkvn4p3qi0dauanj1r01qkvn4p3qig` |
| **2. Massive (Polygon 协议)** | 盘中高频 K 线蜡烛柱、历史交易日走势、全市场批量聚合行情切片 | `1mfijJuxcpzxhX_0GshqQ3N7SV9s8mlP` |
| **3. Alpha Vantage** | 备用实时行情、历史日线数据多源冗余、技术分析辅助指标 | `LIWYBWJZZWD1NII5` |

### 接口协同与调度规则：
1. **多源自动故障转移 (Auto Failover)**：
   - 客户端优先调用主数据源（Finnhub / Massive），若遇网络抖动或频控限制（HTTP 429），系统自动毫秒级切换至备用接口，确保行情永不中断。
2. **Android 原生网络加速**：
   - 在 Android 原生平台下，直连请求必须优先通过 `CapacitorHttp` 原生通道发出，彻底规避浏览器 WebView 的 CORS 跨域拦截与沙箱阻碍。
3. **严禁虚构数据 (Anti-Fabrication Safeguard)**：
   - 行情展示必须来源于真实云端 API 响应或客观历史数据缓存，严禁硬编码虚构股票价格或伪造假数据。

---

## 铁律三：金融量化算法与风控底线

1. **5.0% 最大硬止损封顶 (Hard-Stop Governance)**：
   - 任何策略与暴跌反弹模型计算出的止损价，单笔最大亏损幅度绝对不得突破入场价的 **5.0%**；一旦超过必须强制截断至 5.0% 并触发风控警告。
2. **严格 Wilder RSI 14 周期指数平滑**：
   - 严格执行 J. Welles Wilder 原著平滑公式，严禁使用简单移动平均 (SMA) 替代。
3. **暴跌反弹盈亏比严格满足 Risk:Reward $\ge$ 1:1.50**：
   - Connors RSI、Wyckoff Climax、VWAP Deviation、Bollinger Extreme 四大模型默认止损为 -1.0%，目标盈利为 +1.5% ~ +2.5%，盈亏比必须恒大于 1:1.50。
4. **反雷达克隆选股**：
   - 量化策略库（流动性猎手、机构突破、极度恐慌、弱势做空）必须拥有独立的因子筛选管道，严禁克隆雷达数据。

---

## 铁律四：质量门禁与发布规范

1. **测试全绿门禁 (100% Pass)**：
   - 任何涉及算法、网络请求或视图逻辑的变更，必须运行 `npm.cmd test`，确保 `tests/terminal.test.ts` 中的全部 53 项大型金融集成测试 **100% (53/53) 通过**。
2. **Windows 桌面端仅编译 win-unpacked 快速启动版 (No Integrated Installer)**：
   - 以后每次编译 Windows 桌面版本，**只需编译生成 `release/win-unpacked/` 目录下的快速启动版（绿色解压/直接运行版，主程序为 `V6.5 Desktop Preview.exe`），彻底废除并严禁编译生成集成安装包（NSIS 单文件安装包 .exe）**；
   - 编译命令：`npm run build:desktop`（底层执行 `electron-builder --win --dir`，`target` 固定为 `dir`），打包极速完成，开箱即用。
3. **严格单文件 APK 发布策略 (Single-File Release)**：
   - 编译 Android 安装包时必须执行 `npm run build:android`；
   - 根目录下 `release/` 必须仅保留唯一单文件 `StockScanner V{Version}.apk`，每次打包版本号自增 0.01 并自动清理历史包。
4. **Google Material 3 极简交互规范**：
   - 手机端预警弹窗必须保持 38px 超紧凑单行灵动胶囊 (`LiveAlertBanner`)，严禁出现遮挡主屏图表的多行大型横幅；详情一律通过半屏抽屉 (`M3ModalBottomSheet`) 展开。
