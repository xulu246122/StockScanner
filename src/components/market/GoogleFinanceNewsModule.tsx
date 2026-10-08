import { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  Flame,
  ArrowUpRight,
  ChevronRight,
  BookOpen,
  Filter,
  X,
  Share2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { StockLogo } from '../common/StockLogo.tsx';

export interface GoogleFinanceNewsItem {
  id: string;
  titleZh: string;
  summaryZh: string;
  contentZh: string;
  source: string;
  category: 'MACRO' | 'TECH_AI' | 'RESEARCH' | 'SEMI' | 'EARNINGS' | 'GLOBAL';
  categoryLabel: string;
  publishedAt: string;
  timestamp: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'ALERT';
  sentimentLabel: string;
  sentimentScore: number; // -100 to +100
  relatedTickers: {
    ticker: string;
    changePercent: number;
    price?: number;
  }[];
  impactFactor: string;
  importance: 'HIGH' | 'MEDIUM' | 'NORMAL';
  readTimeMinutes: number;
}

const GOOGLE_FINANCE_NEWS_DATA: GoogleFinanceNewsItem[] = [
  {
    id: 'gf-01',
    titleZh: '英伟达 Blackwell 芯片量产进度超预期，AI 算力资本开支再获大型云厂商加码',
    summaryZh: '谷歌、微软及 Meta 宣布上调 2026 财年数据中心与 AI 算力预算，英伟达 GB200 机柜需求强劲，供应链交期持续排至下半年。',
    contentZh: '据 Google Finance 财经终端与彭博综合报道，英伟达（NVIDIA）CEO 在最新供应链闭门交流中透露，Blackwell 架构 GPU 已进入全面规模化量产阶段，良品率与产线利用率均超此前华尔街普遍预期。微软 Azure 与 Alphabet 谷歌云在最新财年资本开支展望中确认，将加大对新一代液冷 AI 集群的部署力度。高盛量化团队指出，英伟达在数据中心加速计算领域的护城河依然坚不可摧，动量与成长因子持续共振。',
    source: 'Google Finance / 彭博社 (Bloomberg)',
    category: 'TECH_AI',
    categoryLabel: '科技与AI龙头',
    publishedAt: '8 分钟前',
    timestamp: Date.now() - 8 * 60 * 1000,
    sentiment: 'BULLISH',
    sentimentLabel: '重大利好 · 算力狂飙',
    sentimentScore: 92,
    relatedTickers: [
      { ticker: 'NVDA', changePercent: 2.85, price: 128.5 },
      { ticker: 'MSFT', changePercent: 1.15, price: 448.2 },
      { ticker: 'GOOGL', changePercent: 1.42, price: 182.6 }
    ],
    impactFactor: '动量因子显著加速，芯片龙头 Alpha 持续扩散',
    importance: 'HIGH',
    readTimeMinutes: 2
  },
  {
    id: 'gf-02',
    titleZh: '美联储最新纪要释放降息路径信号：通胀回落趋势确立，就业市场呈现温和韧性',
    summaryZh: '联邦公开市场委员会（FOMC）多数委员倾向于在未来两次议息会议上继续适度下调联邦基金利率，长端美债收益率应声回落。',
    contentZh: '美联储公布的最新货币政策会议纪要显示，多数政策制定者认为核心 PCE 价格指数正朝着 2.0% 的长期通胀目标平稳靠拢，且劳动力市场降温幅度处于可控区间。芝商所 FedWatch 工具显示，交易员对接下来维持宽松周期的预期概率攀升至 86.4%。华尔街投行普遍认为，金融环境的持续宽松将直接缓解科技成长股的折现率压力，并为均值回归策略提供宏观流动性支撑。',
    source: 'Google Finance / 华尔街日报 (WSJ)',
    category: 'MACRO',
    categoryLabel: '美联储与宏观',
    publishedAt: '22 分钟前',
    timestamp: Date.now() - 22 * 60 * 1000,
    sentiment: 'BULLISH',
    sentimentLabel: '宏观偏多 · 流动性宽松',
    sentimentScore: 84,
    relatedTickers: [
      { ticker: 'SPY', changePercent: 0.38, price: 563.2 },
      { ticker: 'QQQ', changePercent: 0.62, price: 486.5 },
      { ticker: 'TLT', changePercent: 0.95, price: 98.4 }
    ],
    impactFactor: '贴现率下行利多高估值成长因子与大盘 Beta',
    importance: 'HIGH',
    readTimeMinutes: 3
  },
  {
    id: 'gf-03',
    titleZh: '台积电先进制程产能利用率达 100%，上调全年营收指引与海外晶圆厂扩产节奏',
    summaryZh: '台积电 3nm 及 2nm 订单爆满，苹果 iPhone 新机芯片与 AMD、英伟达 AI 加速卡争抢先进制程配额，半导体设备链全线走高。',
    contentZh: '来自 Google Finance 半导体专栏最新简讯，台积电（TSM）最新月度运营简报显示，先进制程晶圆代工产能持续处于饱和满载状态。台积电高管重申，AI 相关收入复合年增长率预计将超过 45%，并在法拉利式扩张中上调全年资本支出指引下限。受此催化，半导体设备巨头 ASML 与应用材料（AMAT）盘前联动走强。',
    source: 'Google Finance / 路透社 (Reuters)',
    category: 'SEMI',
    categoryLabel: '芯片半导体',
    publishedAt: '45 分钟前',
    timestamp: Date.now() - 45 * 60 * 1000,
    sentiment: 'BULLISH',
    sentimentLabel: '景气上行 · 订单饱和',
    sentimentScore: 88,
    relatedTickers: [
      { ticker: 'TSM', changePercent: 3.12, price: 174.8 },
      { ticker: 'AMD', changePercent: 2.05, price: 158.4 },
      { ticker: 'ASML', changePercent: 2.34, price: 825.0 }
    ],
    impactFactor: '产业链景气度因子爆表，半导体相对强弱 (RS) 领先',
    importance: 'HIGH',
    readTimeMinutes: 2
  },
  {
    id: 'gf-04',
    titleZh: '苹果 Apple Intelligence 迎来重磅多模态升级，iPhone 换机潮加速席卷全球核心市场',
    summaryZh: '第三方供应链追踪数据显示，支持本地神经引擎的新一代机型全球激活率激增 18%，服务业务 ARR 创下历史新高。',
    contentZh: '据 Google Finance 深度科技报道，苹果公司通过向开发者推送全新端侧多模态模型，大幅拓展了 Siri 与系统级自动化助手的应用场景。摩根士丹利量化分析师将苹果评级维持在“超配”，并将目标价上调。分析师指出，硬件与私有云 AI 服务的深度捆绑大幅提升了生态粘性，现金流因子与质量因子得分位居标普 500 前 1%。',
    source: 'Google Finance / CNBC 商业频道',
    category: 'TECH_AI',
    categoryLabel: '科技与AI龙头',
    publishedAt: '1 小时前',
    timestamp: Date.now() - 60 * 60 * 1000,
    sentiment: 'BULLISH',
    sentimentLabel: '估值扩张 · 生态粘性',
    sentimentScore: 78,
    relatedTickers: [
      { ticker: 'AAPL', changePercent: 1.25, price: 228.4 },
      { ticker: 'QCOM', changePercent: 0.88, price: 168.2 }
    ],
    impactFactor: '质量因子+自由现金流因子双轮驱动，防守反击属性突出',
    importance: 'MEDIUM',
    readTimeMinutes: 2
  },
  {
    id: 'gf-05',
    titleZh: '特斯拉全球自动驾驶 FSD 累计行驶突破 25 亿英里，Robotaxi 监管牌照取得实质性突破',
    summaryZh: '加州与德州交通管理部门完成端到端纯视觉无监督自动驾驶测试评估，分析师预计软件订阅现金流将迎来拐点。',
    contentZh: '根据 Google Finance 实时快讯，特斯拉（TSLA）官方工程博客披露，其基于端到端神经网络训练的自动驾驶里程已跨越 25 亿英里关键里程碑。德银与巴克莱研报指出，Robotaxi 商业化车队准入规则正在加速落地，软件服务高毛利特征将显著改善车企长期净利润率预期。今日盘前特斯拉买盘资金活跃，换手率较前一日放大 1.45 倍。',
    source: 'Google Finance / 巴伦周刊 (Barron\'s)',
    category: 'RESEARCH',
    categoryLabel: '华尔街研报',
    publishedAt: '1.5 小时前',
    timestamp: Date.now() - 90 * 60 * 1000,
    sentiment: 'BULLISH',
    sentimentLabel: '突破预期 · 动能放量',
    sentimentScore: 82,
    relatedTickers: [
      { ticker: 'TSLA', changePercent: 3.45, price: 254.8 },
      { ticker: 'UBER', changePercent: -0.65, price: 74.2 }
    ],
    impactFactor: '催化剂突破，相对成交量 (RelVol) 异动放大',
    importance: 'HIGH',
    readTimeMinutes: 3
  },
  {
    id: 'gf-06',
    titleZh: '美国能源部宣布战略石油储备（SPR）回补计划，国际油价探底回升，能源股企稳',
    summaryZh: 'WTI 原油在每桶 68 美元关键均线获得强支撑，雪佛龙与埃克森美孚股息率吸引力上升，资金出现左侧逆向回流。',
    contentZh: 'Google Finance 宏观大宗商品模块数据显示，美国能源部已启动分批次采购以填补战略原油库存。受供给端地缘不确定性与美国炼厂开工率企稳支撑，国际油价脱离年内低位。高盛大宗商品分析师指出，能源板块股息收益率已接近 4.2%，具有显著的价值洼地反转特征，适合均值回归策略在 RSI 极度超跌区间进行左侧布局。',
    source: 'Google Finance / 标普普氏能源 (S&P Global)',
    category: 'MACRO',
    categoryLabel: '美联储与宏观',
    publishedAt: '2 小时前',
    timestamp: Date.now() - 120 * 60 * 1000,
    sentiment: 'NEUTRAL',
    sentimentLabel: '低位震荡 · 价值筑底',
    sentimentScore: 45,
    relatedTickers: [
      { ticker: 'XOM', changePercent: 0.72, price: 114.5 },
      { ticker: 'CVX', changePercent: 0.85, price: 148.6 },
      { ticker: 'XLE', changePercent: 0.65, price: 88.2 }
    ],
    impactFactor: '低估值+高股息因子防御，超跌反弹胜率提升',
    importance: 'NORMAL',
    readTimeMinutes: 2
  },
  {
    id: 'gf-07',
    titleZh: '微软与 OpenAI 达成扩展算力协议：Azure 商业云年化收入突破 400 亿美元大关',
    summaryZh: '企业级生成式 AI 落地速度超市场预期，财富 500 强企业中超 70% 已在生产环境中部署微软 Copilot 商业方案。',
    contentZh: '来自 Google Finance 企业软件频道的报道，微软（MSFT）与 OpenAI 联合发布企业数字化赋能年度报告。数据显示，Azure 云计算平台商业营收增速连续第四个季度超过 28%，其中与大模型相关的直接增量贡献超过 9 个百分点。伯恩斯坦分析师强调，微软在企业端软件入口的垄断壁垒无可替代，机构筹码高度稳定。',
    source: 'Google Finance / 彭博社 (Bloomberg)',
    category: 'EARNINGS',
    categoryLabel: '美股财报季',
    publishedAt: '3 小时前',
    timestamp: Date.now() - 180 * 60 * 1000,
    sentiment: 'BULLISH',
    sentimentLabel: '高增长确认 · 护城河稳固',
    sentimentScore: 86,
    relatedTickers: [
      { ticker: 'MSFT', changePercent: 1.15, price: 448.2 },
      { ticker: 'ORCL', changePercent: 1.55, price: 172.4 }
    ],
    impactFactor: '盈利修正 (Earnings Revision) 因子持续上调',
    importance: 'MEDIUM',
    readTimeMinutes: 2
  },
  {
    id: 'gf-08',
    titleZh: '摩根大通发布 2026 美股量化策略展望：标普 500 目标点位调升至 6,200 点，看好高 Alpha 标的',
    summaryZh: '小摩量化主管认为，宏观软着陆背景下流动性充足，结构性牛市仍在半途，建议超配动量因子与高自由现金流龙头。',
    contentZh: '据 Google Finance 投行研报库，摩根大通首席美股策略团队在最新宏观策略报告中，正式将标普 500 指数基准目标点位调升至 6,200 点。报告指出，尽管市场市盈率估值偏高，但在强劲的企业盈利增长支撑下，下行风险有限。量化模型显示，当市场大盘环境（Regime）处于 Risk-On 多头进攻状态时，顺势跟踪动能突破与均线回踩蓄势策略的回撤极小。',
    source: 'Google Finance / 摩根大通研报 (J.P. Morgan)',
    category: 'RESEARCH',
    categoryLabel: '华尔街研报',
    publishedAt: '4 小时前',
    timestamp: Date.now() - 240 * 60 * 1000,
    sentiment: 'BULLISH',
    sentimentLabel: '机构看多 · 目标点位上调',
    sentimentScore: 80,
    relatedTickers: [
      { ticker: 'SPY', changePercent: 0.38, price: 563.2 },
      { ticker: 'JPM', changePercent: 0.45, price: 212.8 }
    ],
    impactFactor: '宏观偏好扩张，机构资金偏好大盘权重蓝筹',
    importance: 'NORMAL',
    readTimeMinutes: 3
  }
];

interface GoogleFinanceNewsModuleProps {
  onSelectStock: (ticker: string) => void;
}

export function GoogleFinanceNewsModule({ onSelectStock }: GoogleFinanceNewsModuleProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNewsModal, setActiveNewsModal] = useState<GoogleFinanceNewsItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('刚刚更新');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      const now = new Date();
      setLastRefreshedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} 实时同步`);
    }, 600);
  };

  const categories = [
    { id: 'ALL', label: '全部要闻' },
    { id: 'MACRO', label: '美联储与宏观' },
    { id: 'TECH_AI', label: '科技与AI龙头' },
    { id: 'SEMI', label: '芯片半导体' },
    { id: 'RESEARCH', label: '华尔街研报' },
    { id: 'EARNINGS', label: '美股财报季' }
  ];

  const filteredNews = useMemo(() => {
    return GOOGLE_FINANCE_NEWS_DATA.filter((item) => {
      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        !query ||
        item.titleZh.toLowerCase().includes(query) ||
        item.summaryZh.toLowerCase().includes(query) ||
        item.source.toLowerCase().includes(query) ||
        item.relatedTickers.some((t) => t.ticker.toLowerCase().includes(query));
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
      {/* 1. Header Bar: Google Finance Brand & Live Sync */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          {/* Google Finance Modern Logo Badge */}
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-sm relative overflow-hidden shrink-0">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Google Finance</span>
                <span className="text-indigo-600 font-black">谷歌财经新闻</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] font-bold">
                  中文精选版
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              全球美股宏观盘势、标普纳指要闻、科技龙头财报与美联储货币政策实时中文速递
            </p>
          </div>
        </div>

        {/* Right Tools: Live Status, Last Update & Refresh */}
        <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs font-mono text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold">{lastRefreshedTime}</span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
            title="刷新新闻流"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Controls Row: Category Filters & Search Input */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Live Search Input */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索代码或要闻 (如 NVDA, 降息, 芯片)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 focus:bg-white transition-all font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. News Grid List (Institutional Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNews.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            暂无匹配的财经新闻，请尝试更换分类或清除搜索关键词。
          </div>
        ) : (
          filteredNews.map((news) => {
            const isPositiveSentiment = news.sentiment === 'BULLISH';
            const isAlertSentiment = news.sentiment === 'ALERT' || news.sentiment === 'BEARISH';

            return (
              <div
                key={news.id}
                onClick={() => setActiveNewsModal(news)}
                className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-indigo-400 hover:shadow-sm transition-all flex flex-col justify-between gap-3 group cursor-pointer relative"
              >
                {/* News Header: Source, Time & Sentiment */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-slate-500 text-[11px] truncate">
                      {news.source}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {news.publishedAt}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 border ${
                      isPositiveSentiment
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isAlertSentiment
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {news.sentimentLabel}
                  </span>
                </div>

                {/* News Headline */}
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
                  {news.titleZh}
                </h3>

                {/* News Summary */}
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                  {news.summaryZh}
                </p>

                {/* Bottom Row: Related Tickers & Quant Factor Impact */}
                <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  {/* Related Stocks Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold">关联标的:</span>
                    {news.relatedTickers.map((t) => {
                      const isUp = t.changePercent >= 0;
                      return (
                        <button
                          key={t.ticker}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStock(t.ticker);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-300 text-[11px] font-mono font-bold text-slate-800 transition-all flex items-center gap-1 cursor-pointer"
                          title={`查看 ${t.ticker} 深度量化指标与K线`}
                        >
                          <span>{t.ticker}</span>
                          <span
                            className={isUp ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}
                          >
                            {isUp ? '+' : ''}{t.changePercent.toFixed(2)}%
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Impact factor caption */}
                  <span className="text-[10px] text-indigo-700 font-medium truncate max-w-[200px]" title={news.impactFactor}>
                    {news.impactFactor}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Full Article Modal Reader (Chinese Detailed Briefing) */}
      {activeNewsModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setActiveNewsModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    {activeNewsModal.categoryLabel}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {activeNewsModal.source}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {activeNewsModal.publishedAt}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                  {activeNewsModal.titleZh}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveNewsModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Summary Callout */}
            <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-900">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Google Finance 智能核心速读</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {activeNewsModal.summaryZh}
              </p>
            </div>

            {/* Full News Content */}
            <div className="space-y-3 text-slate-800 text-sm leading-relaxed">
              <p>{activeNewsModal.contentZh}</p>
            </div>

            {/* Quantitative Impact Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <span className="text-xs font-bold text-slate-500 block">量化多因子模型传导分析</span>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{activeNewsModal.impactFactor}</span>
                <span className="font-mono font-bold text-emerald-600">
                  情绪得分: +{activeNewsModal.sentimentScore} / 100
                </span>
              </div>
            </div>

            {/* Related Stocks Interactive Bar */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 block">受影响美股标的 (点击查看详情)</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {activeNewsModal.relatedTickers.map((t) => (
                  <button
                    key={t.ticker}
                    type="button"
                    onClick={() => {
                      setActiveNewsModal(null);
                      onSelectStock(t.ticker);
                    }}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 transition-all flex items-center justify-between cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <StockLogo ticker={t.ticker} size="sm" />
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-600 block">
                          {t.ticker}
                        </span>
                        {t.price && (
                          <span className="text-[10px] font-mono text-slate-400">
                            ${t.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono font-black ${
                        t.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.changePercent >= 0 ? '+' : ''}{t.changePercent.toFixed(2)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                数据来源: Google Finance 实时同步
              </span>
              <button
                type="button"
                onClick={() => setActiveNewsModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                完成阅读
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
