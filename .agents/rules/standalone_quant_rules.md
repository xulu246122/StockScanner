---
name: standalone_quant_rules
description: >-
  StockScanner 核心开发规则与系统架构准则：Windows 与 Android 全平台 100% 纯单机模式，
  彻底废弃服务端中继模式；默认使用 Finnhub、Massive、Alpha Vantage 三大市场数据接口及内置 Key。
always_on: true
---

# 🛡️ StockScanner 核心开发规则 (Standalone Quant Rules)

## 1. 架构模式铁律：全平台 100% 纯单机模式 (Standalone Mode)
- **拒绝“服务端中继模式”**：无论是 Windows 桌面端还是 Android 手机端，均独立运行为单机终端，不再使用局域网中继或外部服务端。
- **本地量化计算闭环**：行情直连请求、Wilder RSI、ATR14、RVOL、做市商抛售衰竭指标、暴跌 4+1 核心模型、多因子雷达打分、量化策略执行与条件预警判定，全部由客户端本地量化引擎 (`directMarketProvider.ts` / SQLite WASM) 独立处理。

## 2. 三大权威数据接口与内置授权 API KEY
客户端默认内置并配置以下 3 大市场数据接口，并提供自动故障转移 (Auto Failover)：
1. **Finnhub API KEY**: `dauanj1r01qkvn4p3qi0dauanj1r01qkvn4p3qig`
   - 用途：实时报价、代码搜索、大盘三大指数 (SPY/QQQ/DIA)、新闻催化剂。
2. **Massive (Polygon) API KEY**: `1mfijJuxcpzxhX_0GshqQ3N7SV9s8mlP`
   - 用途：盘中高频 K 线蜡烛柱、历史交易数据、全美股市场切片。
3. **Alpha Vantage API KEY**: `LIWYBWJZZWD1NII5`
   - 用途：备用行情通道、历史多源冗余校准。

## 3. 金融逻辑与测试准则
- 5.0% 最大硬止损封顶。
- Wilder 14 周期指数平滑 RSI 算法。
- 暴跌反弹盈亏比严格满足 Risk:Reward >= 1:1.50。
- 任何功能迭代必须保持 `tests/terminal.test.ts` 53/53 项测试 100% 通过。

## 4. 构建与发布交付铁律
- **Windows 桌面端**：**仅编译生成 `release/win-unpacked/` 目录下的快速启动版（免安装绿色版，主程序为 `V6.5 Desktop Preview.exe`），彻底废弃并严禁编译生成集成安装包（NSIS .exe）**。
- **Android 移动端**：执行 `npm run build:android`，严格保持 `release/StockScanner V{Version}.apk` 单文件发布。
