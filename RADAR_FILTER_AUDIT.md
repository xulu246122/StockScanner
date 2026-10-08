# RADAR SCANNER 模块代码与触发逻辑审计报告 (RADAR-01 AUDIT)

**审计日期**: 2026-10-02  
**审计目标**: `RadarScannerView.tsx` 及多模态雷达扫描预警模块完整执行链路、状态管理、API 及行业数据源审计  
**审计模式**: **CODEBASE AUDIT ONLY (只读分析，未修改任何代码)**  

---

## 1. Radar 页面实际文件定位与组件架构

| 组件层级 | 文件物理路径 | 行数 | 职责说明 |
| :--- | :--- | :--- | :--- |
| **主页面视图** | `src/views/RadarScannerView.tsx` | 806 行 | 雷达控制台主界面、触发模式选择、K线/RSI/市值/股价参数选择、4×15机会池矩阵展示 |
| **全息扫描弹窗** | `src/components/modals/RsiRadarModal.tsx` | 436 行 | 全息矩阵弹窗（通过主界面“全息矩阵”按钮调用） |
| **顶层路由挂载** | `src/App.tsx` (Lines 172-182) | 282 行 | 在 `activeTab === 'radar'` 时挂载 `<RadarScannerView />` |
| **侧边导航与底栏** | `src/components/layout/TerminalSidebar.tsx` (Line 32)<br>`src/components/layout/StockAlarmBottomNav.tsx` (Line 17) | - | 提供 `id: 'radar'` 的导航入口及中英文标注 |
| **前端 API 客户端** | `src/services/apiClient.ts` (Lines 110-118) | 503 行 | 提供 `runScreener(filter: ScreenerFilter): Promise<ScreenerResponse>` |
| **后端 API 路由** | `server/routes/api.ts` (Lines 231-239) | 849 行 | `POST /api/screener` 请求入口 |
| **后端扫描引擎服务** | `server/services/screenerService.ts` (Lines 19-475) | 518 行 | `ScreenerService.runScreener()` 与 `filterCandidates()` |
| **股票 Universe 数据库** | `server/db/universeDb.ts`<br>`server/services/stockUniverse.ts` | 628 行<br>251 行 | 存储全量标的及 Sector / Industry 基础信息 |
| **类型定义文件** | `src/types.ts` (Lines 73-108)<br>`server/types.ts` (Lines 76-110) | - | `ScreenerFilter`、`ScreenerResponse`、`ScreenerResultItem` |

---

## 2. Filter State 位置全景速查

在 `src/views/RadarScannerView.tsx` 中，当前所有筛选条件的 State 均集中定义于组件顶部：

```tsx
// src/views/RadarScannerView.tsx (Lines 199-210)
export function RadarScannerView({ ... }: RadarScannerViewProps) {
  // A. 扫描结果状态
  const [radarStocks, setRadarStocks] = useState<ScreenerResultItem[]>([]); // Line 199: 结果池
  const [totalMatches, setTotalMatches] = useState<number>(0);               // Line 200: 匹配总数

  // B. 触发模式 State
  const [selectedRadarMode, setSelectedRadarMode] = useState<string>('OVERSOLD_30'); // Line 201: 触发模式

  // C. RSI 参数 State
  const [selectedRsiPeriod, setSelectedRsiPeriod] = useState<6 | 14 | 24>(14);       // Line 202: RSI周期

  // D. K线周期 State
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1D');       // Line 203: K线级别

  // E. 公司市值 State
  const [marketCapFilter, setMarketCapFilter] = useState<'1B' | '5B' | '10B' | 'ALL'>('1B'); // Line 204: 市值门槛

  // F. 股价区间 State
  const [priceFilter, setPriceFilter] = useState<'ALL' | 'UNDER_10' | '10_50' | '50_100' | 'OVER_100'>('ALL'); // Line 205: 股价区间

  // G. 搜索关键词 State
  const [searchQuery, setSearchQuery] = useState(''); // Line 206: 本地/远程搜索框

  // H. 页面展示与 Loading State
  const [visibleCount, setVisibleCount] = useState<number>(28); // Line 207: 首屏展示数量 (28 -> 60)
  const [isLoading, setIsLoading] = useState(true);            // Line 208: 全局加载中状态
  const [isRefreshing, setIsRefreshing] = useState(false);      // Line 209: 局部刷新中状态
```

---

## 3. Scan Trigger 位置与执行函数

真正执行扫描的函数是 `fetchRadarData`：

- **函数位置**: `src/views/RadarScannerView.tsx` (Lines 227-276)
- **函数签名**: `const fetchRadarData = async (isManualRefresh = false) => { ... }`
- **当前调用触发点**:
  1. **自动执行触发点**: Line 280 (在 `useEffect` 中自动调用)
  2. **手动刷新触发点**: Line 351 (`onClick={() => fetchRadarData(true)}`)

---

## 4. useEffect 依赖与自动触发原理

当前组件之所以**每次点击任何筛选条件就会立即触发扫描**，核心原因在于 Lines 278-281 的 `useEffect`：

```tsx
// src/views/RadarScannerView.tsx (Lines 278-281)
useEffect(() => {
  setVisibleCount(28);
  fetchRadarData();
}, [selectedRadarMode, selectedRsiPeriod, selectedTimeframe, marketCapFilter, priceFilter, searchQuery]);
```

### 自动执行过程剖析：
1. 用户在 UI 点击任意触发模式按钮（如“动能突破”），调用 `setSelectedRadarMode('BREAKOUT')`；
2. React 调度状态更新，重新渲染 `RadarScannerView`；
3. `useEffect` 检测到 `selectedRadarMode` 发生变化；
4. `useEffect` 立即执行：先将 `visibleCount` 重置为 `28`，紧接着调用 `fetchRadarData()`；
5. `fetchRadarData()` 立即将 `isLoading` 设为 `true`，向后端发送 `POST /api/screener` 请求；
6. 整个机会池闪烁刷新，展示 Loading 菊花图，直至 API 返回。

---

## 5. Scan API 规范

| 属性 | 具体数值 / 规范 |
| :--- | :--- |
| **API Endpoint** | `/api/screener` |
| **HTTP Method** | `POST` |
| **Content-Type** | `application/json` |
| **Client 调用处** | `apiClient.runScreener(filter: ScreenerFilter)` (`src/services/apiClient.ts:110`) |
| **Server 路由处理** | `apiRouter.post('/screener', ...)` (`server/routes/api.ts:231`) |
| **Server 执行引擎** | `screenerService.runScreener(filter)` (`server/services/screenerService.ts:292`) |

---

## 6. Request Payload 详细结构

当前 `fetchRadarData` 构造并发送的 Payload 结构如下：

```json
{
  "market": "ALL",
  "preset": "OVERSOLD_30",
  "rsiPeriod": 14,
  "timeframe": "1D",
  "minMarketCap": 1000000000,
  "minPrice": null,
  "maxPrice": null,
  "searchQuery": null,
  "pageSize": 60,
  "sortBy": "rsi",
  "sortOrder": "asc"
}
```

### 是否支持新增 `sector` 字段？
- **结论**: **完全原生支持！无需改动后端核心解析层。**
- **证据**:
  - `src/types.ts` 第 76 行：`sector?: string;` 已存在于 `ScreenerFilter`。
  - `server/services/screenerService.ts` 第 77-79 行：
    ```ts
    if (filter.sector && filter.sector !== 'ALL') {
      candidateStocks = candidateStocks.filter(s => s.sector === filter.sector);
    }
    ```
  - 当在请求体中附带 `"sector": "Technology"` 时，后端已可直接过滤出科技板块标的。

---

## 7. Response Payload 详细结构

后端返回的标准 `ScreenerResponse` 结构如下：

```json
{
  "total": 42,
  "page": 1,
  "pageSize": 60,
  "totalPages": 1,
  "scannedCount": 240,
  "results": [
    {
      "ticker": "NVDA",
      "name": "NVIDIA Corporation",
      "exchange": "NASDAQ",
      "sector": "Technology",
      "industry": "Semiconductors",
      "price": 121.40,
      "change": 2.80,
      "changePercent": 2.36,
      "marketCap": 3050000000000,
      "rsi": 28.5,
      "rsiPrevious": 26.1,
      "rsiChange": 2.4,
      "rsiStatus": "OVERSOLD",
      "rsiStatusLabel": "超卖",
      "rsiPeriod": 14,
      "timeframe": "1D",
      "volume": 68000000,
      "updatedAt": "2026-10-02T13:00:00.000Z"
    }
  ],
  "filterApplied": { ... },
  "marketStatus": { ... },
  "timestamp": "2026-10-02T13:00:00.000Z"
}
```

---

## 8. Loading 与 Error 机制分析

### Loading 机制：
1. **全局扫描加载** (`isLoading`):
   - 在 `fetchRadarData(false)` 进入时设置为 `true`。
   - UI 表现：隐藏标的卡片网格，展示居中加载框与动态文案：`正在按 [1D] · RSI(14) 极速扫描雷达机会标的...` (Lines 573-579)。
2. **局部刷新加载** (`isRefreshing`):
   - 在 `fetchRadarData(true)` 进入时设置为 `true`。
   - UI 表现：保持现有卡片，仅顶部刷新图标呈 `animate-spin` 旋转 (Line 356)。
3. **完成处理** (`finally`):
   - 无论成功或失败，`finally` 块中均安全复位 `setIsLoading(false)` 与 `setIsRefreshing(false)`。

### Error 机制：
- 在 `try-catch` 捕获异常时，通过 `console.error('Failed to load multimodal radar data:', err)` 记录。
- 如果请求失败导致 `radarStocks` 为空数组，UI 自动呈现空状态提示及“重置筛选条件”按钮 (Lines 580-597)。

---

## 9. 数据库 Universe 结构与 Sector 字段现状

通过检查 `server/db/universeDb.ts` 及 `server/services/stockUniverse.ts`，全量美股标的的行业属性现状如下：

### 1. 数据库结构定义：
- `InstrumentEntity.sector`: `string | undefined`
- `InstrumentEntity.industry`: `string | undefined`

### 2. 真实数据覆盖率与枚举分布：
当前内置的股票库中已明确分配以下 8 大核心行业板块（GICS 标准分类）：
1. `Technology` (信息科技与半导体 - 英伟达/苹果/微软/台积电等)
2. `Healthcare` (生物医药与健康 - 礼来/联合健康/强生等)
3. `Financial Services` (金融银行与支付 - 摩根大通/伯克希尔/Visa等)
4. `Consumer Cyclical` (非必需可选消费 - 亚马逊/特斯拉等)
5. `Communication Services` (通信与互联网 - 谷歌/Meta/奈飞等)
6. `Energy` (石油与天然气能源 - 埃克森美孚/雪佛龙等)
7. `Industrials` (航天军工与工业 - 波音/卡特彼勒等)
8. `Consumer Defensive` (必需消费品 - 宝洁/沃尔玛/可口可乐等)

### 3. 结论：
**不需要制造新行业数据，也不需要编写复杂的行业映射表。直接使用现有的 `sector` 字段即可完美运作。**

---

## 10. 当前自动扫描触发链路图

```
┌────────────────────────────────────────────────────────┐
│ UI 层: 用户点击某个筛选条件                              │
│ (触发模式 / K线周期 / RSI参数 / 公司市值 / 股价区间)       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ State 更新: setSelectedRadarMode / setSelectedTimeframe │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ React Re-render & useEffect 依赖侦测                    │
│ useEffect(..., [selectedRadarMode, selectedTimeframe..])│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 调用 fetchRadarData() -> setIsLoading(true)            │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ apiClient.runScreener(filter)                          │
│ 发送 HTTP POST /api/screener 请求                      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 后端 ScreenerService.runScreener()                     │
│ 1. filterCandidates(filter) 过滤市值/行业/市场          │
│ 2. 批量计算 Wilder RSI / K线 / 价格                    │
│ 3. 匹配 Preset 触发规则 (OVERSOLD / BREAKOUT 等)       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 前端接收结果: setRadarStocks(results)                   │
│ 关闭 Loading: setIsLoading(false)                      │
│ UI 渲染 4×15 机会池矩阵                                 │
└────────────────────────────────────────────────────────┘
```

---

## 11. 行业板块筛选最小修改方案 (Phase RADAR-02 规划)

### 1. State 增加：
在 `src/views/RadarScannerView.tsx` 增加：
```tsx
const [sectorFilter, setSectorFilter] = useState<string>('ALL');
```

### 2. UI 渲染位置：
在 `RadarScannerView.tsx` 的“参数控制架（Parameter Shelf）”中，新增 **“行业板块”** 分段选择行（风格保持与其他行 100% 一致）：
- `全部行业 (ALL)`
- `信息科技 (Technology)`
- `生物医疗 (Healthcare)`
- `金融服务 (Financial Services)`
- `可选消费 (Consumer Cyclical)`
- `通信互联 (Communication Services)`
- `能源石油 (Energy)`
- `工业军工 (Industrials)`
- `必选消费 (Consumer Defensive)`

### 3. Payload 传递：
在 `fetchRadarData` 中将 `sector: sectorFilter !== 'ALL' ? sectorFilter : undefined` 注入请求体即可。

---

## 12. 独立启动按钮与解耦自动扫描最小修改方案

### 1. 解耦 `useEffect` 自动触发：
将 `useEffect` 的依赖数组清空（或仅保留初始挂载），确保**用户点击任何筛选条件时，仅更新 UI 高亮状态，绝不触发 API 请求**：

```tsx
// 改造后：仅在页面初次进入时执行一次初始扫描，后续必须由用户主动点击按钮触发
useEffect(() => {
  fetchRadarData();
}, []); // 移除所有 filter 依赖
```

### 2. 增加显眼的“启动雷达扫描”主按钮：
在控制台右上角或参数架底部增加具有高视觉权重的主执行按钮：
```tsx
<button
  type="button"
  onClick={() => {
    setVisibleCount(28);
    fetchRadarData();
  }}
  disabled={isLoading || isRefreshing}
  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
>
  <Radar className={`w-4 h-4 ${isLoading ? 'animate-spin' : 'animate-pulse'}`} />
  <span>{isLoading ? '正在执行雷达全息扫描...' : '启动雷达扫描 (Scan Now)'}</span>
</button>
```

### 3. 未同步状态提示（可选体验优化）：
可在筛选条件变更后，在按钮旁展示“参数已就绪，点击执行扫描”等友好提示。

---

## 13. 兼容性风险与评估

| 检查维度 | 潜在风险 | 防范与解决方案 |
| :--- | :--- | :--- |
| **首屏渲染** | 解耦后初次进入页面若不扫描会导致白屏 | 保留 `useEffect(..., [])` 在组件挂载时进行首次默认扫描，确保进入页面立即可见机会池 |
| **RsiRadarModal 兼容** | 独立弹窗是否受影响 | `RsiRadarModal.tsx` 拥有独立的内部 State 与 `fetchRadarData`，两者互不干扰 |
| **搜索框交互** | 键盘实时输入是否会误触发 API | 搜索框可通过前端本地 `displayedStocks` 进行即时字符串过滤，只有点击“启动雷达扫描”或按下回车时才调用后端模糊搜索 |
| **分页状态** | 点击“更多/收起”是否触发重新扫描 | `visibleCount` 仅控制前端切片渲染 (`displayedStocks.slice(0, visibleCount)`)，不向后端发请求，完全安全 |

---

## 14. 审计结论

1. **代码结构清晰且高度模块化**：`RadarScannerView.tsx` 状态定义规范，UI 结构紧凑。
2. **后端能力已就绪**：后端 `/api/screener` 与 `ScreenerService` 已经完全支持 `sector` 过滤，无需改动数据库或后端接口。
3. **改造路径极小且安全**：只需在前端解耦 `useEffect` 依赖、增加行业选择状态、并在 UI 上部署“启动雷达扫描”独立按钮即可完成全部需求。

---

**AUDIT COMPLETE — AWAITING NEXT PHASE INSTRUCTION**:
等待用户指令：**“继续 RADAR-02”**。
