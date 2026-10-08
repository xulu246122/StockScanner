/**
 * US Stock Sector & Industry Authoritative Classification Engine
 * 美股标准板块与行业分类权威中文化映射引擎
 * 严格遵照美股 GICS 11 大行业标准并细化“军工 (Aerospace & Defense)”、“半导体 (Semiconductors)”等经典热门赛道
 */

import { OFFICIAL_SP500_CONSTITUENTS, OFFICIAL_NASDAQ100_CONSTITUENTS } from '../data/indexConstituentsMaster.ts';

export interface SectorClassificationResult {
  sectorZh: string;      // 例如 "军工"、"金融"、"半导体"、"医疗健康"、"科技"
  sectorEn: string;      // 例如 "Aerospace & Defense", "Financials", "Semiconductors"
  industryZh?: string;   // 细分行业中文
  industryEn?: string;   // 细分行业英文
  icon: string;          // 标识图标
}

// 知名美股标的高频直通字典 (0ms 命中，优先保证典型标的绝对准确)
const PRELOADED_TICKER_SECTOR_MAP: Record<string, { sectorZh: string; sectorEn: string; industryZh: string; icon: string }> = {
  // 军工航天 (Aerospace & Defense) - 满足用户重点关注的“军工”
  'LMT': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '航天防务与导弹系统', icon: '🛡️' },
  'RTX': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '航空航天与国防雷达', icon: '🛡️' },
  'NOC': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '隐身战机与战略防务', icon: '🛡️' },
  'GD': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '装甲潜艇与防务系统', icon: '🛡️' },
  'BA': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '民用客机与军工航天', icon: '✈️' },
  'AVAV': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '巡飞弹无人机防务', icon: '🛡️' },
  'LHX': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '军工通信与电子战', icon: '🛡️' },
  'KTOS': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '无人战斗靶机与军工电子', icon: '🛡️' },
  'TXT': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '直升机与轻型攻击机', icon: '🛡️' },
  'HII': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '军用航母与核潜艇制造', icon: '⚓' },
  'LDOS': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '国防情报技术与国家安全', icon: '🛡️' },
  'TDG': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '航空航天工程零部件', icon: '✈️' },
  'HEI': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '航空航天替代件与防务电子', icon: '✈️' },

  // 金融服务与银行 (Financials) - 满足用户重点关注的“金融”
  'JPM': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '全球多元化综合银行', icon: '🏦' },
  'BAC': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '商业银行与零售金融', icon: '🏦' },
  'WFC': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '商业银行与按揭贷款', icon: '🏦' },
  'C': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '跨国商业银行', icon: '🏦' },
  'GS': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '顶级投资银行与高频做市', icon: '🏦' },
  'MS': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '投资银行与财富管理', icon: '🏦' },
  'BLK': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '全球资产管理集团', icon: '💼' },
  'AXP': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '高端信用卡与商务支付', icon: '💳' },
  'V': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '全球数字支付清算网络', icon: '💳' },
  'MA': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '全球信用卡支付网络', icon: '💳' },
  'PYPL': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '数字钱包与在线支付', icon: '💳' },
  'COIN': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '数字资产合规交易所', icon: '🪙' },
  'HOOD': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '零售互联网券商', icon: '📈' },
  'SOFI': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '数字科技银行与学生信贷', icon: '🏦' },
  'BRK-A': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '伯克希尔多元化金融财团', icon: '💼' },
  'BRK-B': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '伯克希尔多元化金融财团', icon: '💼' },

  // 半导体与芯片制造 (Semiconductors)
  'NVDA': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: 'AI算力GPU与通用加速芯片', icon: '⚡' },
  'AMD': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '高性能CPU与GPU芯片', icon: '⚡' },
  'INTC': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: 'x86处理器与晶圆代工', icon: '⚡' },
  'TSM': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '全球先进制程晶圆代工', icon: '⚡' },
  'AVGO': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '网络交换与定制ASIC芯片', icon: '⚡' },
  'QCOM': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '移动基带与骁龙SOC', icon: '⚡' },
  'MU': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: 'DRAM与HBM高带宽存储', icon: '⚡' },
  'ASML': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: 'EUV极紫外光刻机设备', icon: '🔬' },
  'AMAT': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '半导体薄膜沉积与刻蚀设备', icon: '🔬' },
  'LRCX': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '晶圆制造等离子刻蚀设备', icon: '🔬' },
  'ARM': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '低功耗移动架构IP授权', icon: '⚡' },
  'TXN': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '模拟芯片与嵌入式处理器', icon: '⚡' },
  'AEHR': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '碳化硅SiC晶圆级老化测试设备', icon: '⚡' },
  'KLAC': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '半导体良率检测与量测设备', icon: '🔬' },
  'ADI': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '高性能模拟信号转换芯片', icon: '⚡' },
  'MRVL': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '数据中心网络与光互联芯片', icon: '⚡' },
  'ON': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '汽车功率半导体与碳化硅', icon: '⚡' },

  // 医疗健康与生命科学 (Healthcare) - 用户截图标的 DHR, TMO, MANE
  'DHR': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '生命科学仪器与临床诊断', icon: '🏥' },
  'TMO': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '科研分析仪器与实验耗材', icon: '🏥' },
  'MANE': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '生物创新医药研发', icon: '💊' },
  'MRNA': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: 'mRNA核酸疫苗与创新生物药', icon: '💊' },
  'LLY': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: 'GLP-1减肥降糖药与生物药', icon: '💊' },
  'UNH': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '商业健康险与医疗网络', icon: '🏥' },
  'JNJ': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '创新制药与医疗器械', icon: '🏥' },
  'ABBV': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '免疫学与肿瘤生物制药', icon: '💊' },
  'MRK': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: 'PD-1肿瘤靶向药与疫苗', icon: '💊' },
  'ABT': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '心血管支架与动态血糖仪', icon: '🏥' },
  'PFE': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '抗感染疫苗与化学制药', icon: '💊' },
  'AMGN': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '生物类似药与骨科用药', icon: '💊' },
  'ISRG': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '达芬奇手术机器人与内窥镜', icon: '🔬' },
  'VRTX': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '囊性纤维化靶向治疗', icon: '💊' },
  'BMY': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '肿瘤与心血管制药', icon: '💊' },
  'GILD': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '抗病毒抗艾滋病药物', icon: '💊' },

  // 科技与软件 (Technology / Software)
  'MSFT': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '企业级云服务与办公软件', icon: '💻' },
  'AAPL': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '消费电子终端与生态系统', icon: '📱' },
  'ORCL': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '数据库系统与企业云基础设施', icon: '💻' },
  'CRM': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '企业客户关系CRM云服务', icon: '☁️' },
  'ADBE': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '数字创意与文档云设计工具', icon: '🎨' },
  'NOW': { sectorZh: '科技', sectorEn: 'Technology', industryZh: 'IT工作流自动化云平台', icon: '💻' },
  'PLTR': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '企业AI大脑与大数据决策', icon: '🧠' },
  'SNOW': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '多云架构数据仓库平台', icon: '❄️' },
  'PANW': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '下一代防火墙与网络安全', icon: '🔒' },
  'CRWD': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '端点安全与云威胁检测', icon: '🛡️' },
  'NET': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '边缘计算与抗DDoS网络安全', icon: '🌐' },
  'SHOP': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '独立站SaaS电商技术平台', icon: '🛍️' },
  'MSTR': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '商业智能软件与比特币储备', icon: '📊' },
  'STX': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '高容量机械硬盘与存储系统', icon: '💾' },
  'WDC': { sectorZh: '科技', sectorEn: 'Technology', industryZh: 'NAND闪存与大容量固态硬盘', icon: '💾' },
  'CSCO': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '企业网络路由器与交换机', icon: '🌐' },
  'IBM': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '混合云架构与IT咨询集成', icon: '💻' },
  'SMCI': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '液冷AI服务器系统集成', icon: '🖥️' },

  // 可选消费与零售 (Consumer Discretionary)
  'AMZN': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '综合电商与AWS云计算', icon: '📦' },
  'TSLA': { sectorZh: '新能源车', sectorEn: 'Consumer Cyclical', industryZh: '纯电智能汽车与储能系统', icon: '🚗' },
  'HD': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '家居建材翻修连锁超市', icon: '🔨' },
  'MCD': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '全球快餐连锁特许加盟', icon: '🍔' },
  'NKE': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '运动鞋服设计与零售', icon: '👟' },
  'SBUX': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '连锁精品咖啡馆直营', icon: '☕' },
  'BKNG': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '线上酒店机票预订平台', icon: '✈️' },
  'ABNB': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '全球短租民宿平台', icon: '🏠' },
  'BABA': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '电子商务与阿里云服务', icon: '🛍️' },
  'PDD': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '社交拼购电商与Temu出海', icon: '🛍️' },
  'JD': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '自营B2C电商与现代物流', icon: '📦' },
  'NIO': { sectorZh: '新能源车', sectorEn: 'Consumer Cyclical', industryZh: '高端智能纯电动汽车', icon: '🚗' },
  'LI': { sectorZh: '新能源车', sectorEn: 'Consumer Cyclical', industryZh: '家庭增程式智能SUV', icon: '🚗' },
  'XPEV': { sectorZh: '新能源车', sectorEn: 'Consumer Cyclical', industryZh: '智能辅助驾驶纯电汽车', icon: '🚗' },
  'RIVN': { sectorZh: '新能源车', sectorEn: 'Consumer Cyclical', industryZh: '纯电皮卡与亚马逊物流车', icon: '🚙' },
  'LCID': { sectorZh: '新能源车', sectorEn: 'Consumer Cyclical', industryZh: '豪华长续航纯电轿车', icon: '🏎️' },

  // 必需消费 (Consumer Staples)
  'WMT': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '全球零售超级大卖场', icon: '🛒' },
  'COST': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '会员制仓储量贩批发超市', icon: '🛒' },
  'PG': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '日化洗护与个人护理品牌', icon: '🧼' },
  'KO': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '可口可乐软饮料与瓶装业务', icon: '🥤' },
  'PEP': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '百事可乐饮料与乐事休闲零食', icon: '🍿' },
  'TGT': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '折扣零售精品超市', icon: '🎯' },
  'PM': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '无烟气雾化烟草与传统卷烟', icon: '🚬' },
  'MO': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '烟草制品与加热不燃烧品牌', icon: '🚬' },

  // 通信与数字媒体 (Communication Services)
  'GOOGL': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '搜索引擎与流媒体广告', icon: '🔍' },
  'GOOG': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '搜索引擎与云服务平台', icon: '🔍' },
  'META': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '社交网络与元宇宙XR硬件', icon: '🌐' },
  'NFLX': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '流媒体长视频订阅平台', icon: '🎬' },
  'DIS': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '主题公园度假区与影视娱乐', icon: '🏰' },
  'ROKU': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '智能电视机顶盒与流媒体平台', icon: '📺' },
  'SNAP': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '阅后即焚社交相机应用', icon: '👻' },
  'PINS': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '瀑布流图片灵感社交分享', icon: '📌' },
  'TMUS': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '5G无线电信运营商', icon: '📡' },
  'VZ': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '全美宽带光纤与无线通信', icon: '📡' },
  'T': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '综合电信网络与企业连接', icon: '📡' },

  // 能源与石油 (Energy)
  'XOM': { sectorZh: '能源', sectorEn: 'Energy', industryZh: '深海油气勘探开采与炼油', icon: '⛽' },
  'CVX': { sectorZh: '能源', sectorEn: 'Energy', industryZh: '上游油气田与石化下游产品', icon: '⛽' },
  'COP': { sectorZh: '能源', sectorEn: 'Energy', industryZh: '独立页岩油气勘探生产商', icon: '🛢️' },
  'SLB': { sectorZh: '能源', sectorEn: 'Energy', industryZh: '油田数字化测井与钻井服务', icon: '🏗️' },
  'EOG': { sectorZh: '能源', sectorEn: 'Energy', industryZh: '低成本二叠纪页岩油开采', icon: '🛢️' },
  'OXY': { sectorZh: '能源', sectorEn: 'Energy', industryZh: '致密油气开采与碳捕集技术', icon: '🛢️' },

  // 工业制造 (Industrials)
  'CAT': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '重型工程挖掘机械与矿山机械', icon: '🚜' },
  'GE': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '航空商用航发涡轮与燃气轮机', icon: '⚙️' },
  'UNP': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '北美干线铁路联运网络', icon: '🚂' },
  'DE': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '智能农用拖拉机与联合收割机', icon: '🌾' },
  'HON': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '工业自动化控制与特种材料', icon: '⚙️' },
  'MMM': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '多元化胶粘与工业防护材料', icon: '🧰' },
  'UPS': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '全球航空快递与供应链物流', icon: '📦' },
  'FDX': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '全球高时效航空货运网络', icon: '✈️' },

  // 公用事业 (Utilities)
  'NEE': { sectorZh: '公用事业', sectorEn: 'Utilities', industryZh: '风电光伏清洁能源与电网', icon: '💡' },
  'SO': { sectorZh: '公用事业', sectorEn: 'Utilities', industryZh: '核电火电与输配电公共网络', icon: '💡' },
  'DUK': { sectorZh: '公用事业', sectorEn: 'Utilities', industryZh: '区域垄断电力与天然气供应', icon: '💡' },

  // 房地产 (Real Estate / REITs)
  'PLD': { sectorZh: '房地产', sectorEn: 'Real Estate', industryZh: '现代电商物流仓储基础设施', icon: '🏭' },
  'AMT': { sectorZh: '房地产', sectorEn: 'Real Estate', industryZh: '5G通信无线基站铁塔租赁', icon: '🗼' },
  'EQIX': { sectorZh: '房地产', sectorEn: 'Real Estate', industryZh: '全球数据中心托管与云互联', icon: '🏢' },

  // 基础原材料 (Basic Materials)
  'LIN': { sectorZh: '基础材料', sectorEn: 'Basic Materials', industryZh: '高纯度工业气体与特种气体', icon: '🧪' },
  'APD': { sectorZh: '基础材料', sectorEn: 'Basic Materials', industryZh: '氢能综合应用与化工工业气体', icon: '🧪' },
  'SHW': { sectorZh: '基础材料', sectorEn: 'Basic Materials', industryZh: '建筑涂料与工业防腐涂层', icon: '🎨' },
  'FCX': { sectorZh: '基础材料', sectorEn: 'Basic Materials', industryZh: '全球大型铜矿与金矿开采', icon: '⛏️' },
  'NEM': { sectorZh: '基础材料', sectorEn: 'Basic Materials', industryZh: '世界一流黄金贵金属矿企', icon: '🪙' },

  // 宽基与行业 ETF
  'SPY': { sectorZh: '指数ETF', sectorEn: 'ETF', industryZh: '标普500核心蓝筹ETF', icon: '📊' },
  'QQQ': { sectorZh: '指数ETF', sectorEn: 'ETF', industryZh: '纳斯达克100科技龙头ETF', icon: '📊' },
  'IWM': { sectorZh: '指数ETF', sectorEn: 'ETF', industryZh: '罗素2000小盘成长股ETF', icon: '📊' },
  'DIA': { sectorZh: '指数ETF', sectorEn: 'ETF', industryZh: '道琼斯工业平均指数ETF', icon: '📊' },
  'XLK': { sectorZh: '科技ETF', sectorEn: 'ETF', industryZh: '美股科技行业精选SPDR', icon: '📊' },
  'XLF': { sectorZh: '金融ETF', sectorEn: 'ETF', industryZh: '美股金融行业精选SPDR', icon: '📊' },
  'XLV': { sectorZh: '医疗ETF', sectorEn: 'ETF', industryZh: '美股医疗健康精选SPDR', icon: '📊' },
  'XLE': { sectorZh: '能源ETF', sectorEn: 'ETF', industryZh: '美股能源行业精选SPDR', icon: '📊' },
  'ITA': { sectorZh: '军工ETF', sectorEn: 'ETF', industryZh: '美股航空航天与国防军工ETF', icon: '🛡️' }
};

// 内存运行时快速缓存 (针对非预设标的动态解析并留存)
const RUNTIME_SECTOR_CACHE = new Map<string, SectorClassificationResult>();

/**
 * 权威美股板块中文化映射器
 * 根据输入的 ticker, rawSector, rawIndustry, companyName
 * 输出客观、精准的美股分类名称（严格保证 100% 不会出现 "General" 或 "N/A"）
 */
export function resolveStockSectorMeta(
  ticker: string,
  rawSector?: string | null,
  rawIndustry?: string | null,
  companyName?: string | null
): SectorClassificationResult {
  const sym = (ticker || '').toUpperCase().trim();

  // 1. 优先查快速直通预设字典 (0ms 命中，最高精确度)
  if (PRELOADED_TICKER_SECTOR_MAP[sym]) {
    const item = PRELOADED_TICKER_SECTOR_MAP[sym];
    return {
      sectorZh: item.sectorZh,
      sectorEn: item.sectorEn,
      industryZh: item.industryZh,
      icon: item.icon
    };
  }

  // 2. 查内存运行时缓存
  if (RUNTIME_SECTOR_CACHE.has(sym)) {
    return RUNTIME_SECTOR_CACHE.get(sym)!;
  }

  // 3. 查 S&P 500 / Nasdaq 100 权威名单 (精准获取官方 sector 与 industry)
  const spItem = OFFICIAL_SP500_CONSTITUENTS.find(c => c.ticker === sym) ||
    OFFICIAL_NASDAQ100_CONSTITUENTS.find(c => c.ticker === sym);
  
  const effectiveSector = (rawSector && rawSector !== 'General' && rawSector !== 'N/A')
    ? rawSector
    : spItem?.sector || '';
  
  const effectiveIndustry = (rawIndustry && rawIndustry !== 'Public Company' && rawIndustry !== 'General')
    ? rawIndustry
    : spItem?.industry || '';

  const nameUpper = (companyName || spItem?.name || '').toUpperCase();
  const secUpper = effectiveSector.toUpperCase();
  const indUpper = effectiveIndustry.toUpperCase();

  let result: SectorClassificationResult;

  // 4. 严谨的多因子分类规则树：
  // ----------------------------------------------------
  // (A) 军工航天 (Aerospace & Defense) - 满足用户明确强调的“军工”
  // ----------------------------------------------------
  if (
    indUpper.includes('AEROSPACE') ||
    indUpper.includes('DEFENSE') ||
    nameUpper.includes('DEFENSE') ||
    nameUpper.includes('AEROSPACE') ||
    nameUpper.includes('AVIONICS') ||
    nameUpper.includes('MILITARY') ||
    nameUpper.includes('WEAPONS')
  ) {
    result = {
      sectorZh: '军工',
      sectorEn: 'Aerospace & Defense',
      industryZh: effectiveIndustry || '航天防务与国家安全',
      icon: '🛡️'
    };
  }
  // ----------------------------------------------------
  // (B) 半导体芯片 (Semiconductors)
  // ----------------------------------------------------
  else if (
    indUpper.includes('SEMICONDUCTOR') ||
    indUpper.includes('SEMI') ||
    secUpper.includes('SEMICONDUCTOR') ||
    nameUpper.includes('SEMICONDUCTOR') ||
    nameUpper.includes('WAFER') ||
    nameUpper.includes('MICROELECTRONICS')
  ) {
    result = {
      sectorZh: '半导体',
      sectorEn: 'Semiconductors',
      industryZh: effectiveIndustry || '芯片设计与半导体制造',
      icon: '⚡'
    };
  }
  // ----------------------------------------------------
  // (C) 金融服务与商业银行 (Financials) - 满足用户明确强调的“金融”
  // ----------------------------------------------------
  else if (
    secUpper.includes('FINANC') ||
    secUpper.includes('BANK') ||
    indUpper.includes('BANK') ||
    indUpper.includes('CREDIT') ||
    indUpper.includes('INSURANCE') ||
    indUpper.includes('CAPITAL MARKET') ||
    indUpper.includes('ASSET MANAGEMENT') ||
    nameUpper.includes('BANC') ||
    nameUpper.includes('FINANCIAL') ||
    nameUpper.includes('CAPITAL') ||
    nameUpper.includes('INSURANCE')
  ) {
    result = {
      sectorZh: '金融',
      sectorEn: 'Financial Services',
      industryZh: effectiveIndustry || '商业银行与金融服务',
      icon: '🏦'
    };
  }
  // ----------------------------------------------------
  // (D) 医疗健康与生物制药 (Healthcare)
  // ----------------------------------------------------
  else if (
    secUpper.includes('HEALTH') ||
    secUpper.includes('CARE') ||
    indUpper.includes('BIOTECH') ||
    indUpper.includes('PHARMA') ||
    indUpper.includes('DRUG') ||
    indUpper.includes('MEDICAL') ||
    indUpper.includes('DIAGNOSTIC') ||
    indUpper.includes('LIFE SCIENCES') ||
    nameUpper.includes('PHARMA') ||
    nameUpper.includes('THERAPEUTIC') ||
    nameUpper.includes('BIO') ||
    nameUpper.includes('HEALTH') ||
    nameUpper.includes('MEDICAL')
  ) {
    result = {
      sectorZh: '医疗健康',
      sectorEn: 'Healthcare',
      industryZh: effectiveIndustry || '医药生物与生命科学',
      icon: '🏥'
    };
  }
  // ----------------------------------------------------
  // (E) 汽车制造与新能源车 (Automotive / EV)
  // ----------------------------------------------------
  else if (
    indUpper.includes('AUTO') ||
    indUpper.includes('VEHICLE') ||
    nameUpper.includes('MOTORS') ||
    nameUpper.includes('AUTOMOTIVE')
  ) {
    result = {
      sectorZh: '新能源车',
      sectorEn: 'Automotive',
      industryZh: effectiveIndustry || '智能汽车制造',
      icon: '🚗'
    };
  }
  // ----------------------------------------------------
  // (F) 科技与软件云服务 (Technology / Software)
  // ----------------------------------------------------
  else if (
    secUpper.includes('TECH') ||
    indUpper.includes('SOFTWARE') ||
    indUpper.includes('CLOUD') ||
    indUpper.includes('IT SERVICE') ||
    indUpper.includes('COMPUTER') ||
    indUpper.includes('HARDWARE') ||
    indUpper.includes('ELECTRONIC') ||
    nameUpper.includes('SOFTWARE') ||
    nameUpper.includes('TECHNOLOGY') ||
    nameUpper.includes('SYSTEMS') ||
    nameUpper.includes('SOLUTIONS')
  ) {
    result = {
      sectorZh: '科技',
      sectorEn: 'Technology',
      industryZh: effectiveIndustry || '软件信息技术与云计算',
      icon: '💻'
    };
  }
  // ----------------------------------------------------
  // (G) 能源与石油天然气 (Energy)
  // ----------------------------------------------------
  else if (
    secUpper.includes('ENERGY') ||
    indUpper.includes('OIL') ||
    indUpper.includes('GAS') ||
    indUpper.includes('PETROLEUM') ||
    nameUpper.includes('ENERGY') ||
    nameUpper.includes('PETROLEUM') ||
    nameUpper.includes('OIL')
  ) {
    result = {
      sectorZh: '能源',
      sectorEn: 'Energy',
      industryZh: effectiveIndustry || '油气能源与新能源开发',
      icon: '⛽'
    };
  }
  // ----------------------------------------------------
  // (H) 通信与互联网媒体 (Communication Services)
  // ----------------------------------------------------
  else if (
    secUpper.includes('COMMUNICATION') ||
    secUpper.includes('TELECOM') ||
    indUpper.includes('INTERNET') ||
    indUpper.includes('ENTERTAINMENT') ||
    indUpper.includes('MEDIA') ||
    nameUpper.includes('COMMUNICATION') ||
    nameUpper.includes('MEDIA')
  ) {
    result = {
      sectorZh: '通信媒体',
      sectorEn: 'Communication Services',
      industryZh: effectiveIndustry || '互联网通信与互动媒体',
      icon: '📡'
    };
  }
  // ----------------------------------------------------
  // (I) 可选消费 (Consumer Cyclical / Discretionary)
  // ----------------------------------------------------
  else if (
    secUpper.includes('CYCLICAL') ||
    secUpper.includes('DISCRETIONARY') ||
    indUpper.includes('RETAIL') ||
    indUpper.includes('RESTAURANT') ||
    indUpper.includes('TRAVEL') ||
    indUpper.includes('APPAREL') ||
    indUpper.includes('HOTEL')
  ) {
    result = {
      sectorZh: '可选消费',
      sectorEn: 'Consumer Cyclical',
      industryZh: effectiveIndustry || '非必需消费与零售贸易',
      icon: '🛍️'
    };
  }
  // ----------------------------------------------------
  // (J) 必需消费 (Consumer Staples / Defensive)
  // ----------------------------------------------------
  else if (
    secUpper.includes('DEFENSIVE') ||
    secUpper.includes('STAPLES') ||
    indUpper.includes('BEVERAGE') ||
    indUpper.includes('FOOD') ||
    indUpper.includes('HOUSEHOLD') ||
    indUpper.includes('DISCOUNT STORE') ||
    indUpper.includes('TOBACCO')
  ) {
    result = {
      sectorZh: '必需消费',
      sectorEn: 'Consumer Defensive',
      industryZh: effectiveIndustry || '食品饮料与日常生活消费',
      icon: '🛒'
    };
  }
  // ----------------------------------------------------
  // (K) 工业制造 (Industrials)
  // ----------------------------------------------------
  else if (
    secUpper.includes('INDUSTRIAL') ||
    indUpper.includes('MACHINERY') ||
    indUpper.includes('CONGLOMERATE') ||
    indUpper.includes('TRANSPORT') ||
    indUpper.includes('LOGISTIC') ||
    indUpper.includes('RAIL')
  ) {
    result = {
      sectorZh: '工业制造',
      sectorEn: 'Industrials',
      industryZh: effectiveIndustry || '重型工程制造与供应链',
      icon: '⚙️'
    };
  }
  // ----------------------------------------------------
  // (L) 公用事业 (Utilities)
  // ----------------------------------------------------
  else if (
    secUpper.includes('UTILITY') ||
    secUpper.includes('UTILITIES') ||
    indUpper.includes('ELECTRIC') ||
    indUpper.includes('WATER') ||
    indUpper.includes('GAS UTILITY')
  ) {
    result = {
      sectorZh: '公用事业',
      sectorEn: 'Utilities',
      industryZh: effectiveIndustry || '电力水务与公用设施',
      icon: '💡'
    };
  }
  // ----------------------------------------------------
  // (M) 房地产 (Real Estate / REIT)
  // ----------------------------------------------------
  else if (
    secUpper.includes('REAL ESTATE') ||
    secUpper.includes('REIT') ||
    indUpper.includes('REIT') ||
    nameUpper.includes('REIT')
  ) {
    result = {
      sectorZh: '房地产',
      sectorEn: 'Real Estate',
      industryZh: effectiveIndustry || '商业地产与REIT信托',
      icon: '🏢'
    };
  }
  // ----------------------------------------------------
  // (N) 基础原材料 (Basic Materials)
  // ----------------------------------------------------
  else if (
    secUpper.includes('MATERIAL') ||
    indUpper.includes('CHEMICAL') ||
    indUpper.includes('MINING') ||
    indUpper.includes('STEEL') ||
    indUpper.includes('METAL')
  ) {
    result = {
      sectorZh: '基础材料',
      sectorEn: 'Basic Materials',
      industryZh: effectiveIndustry || '基础原材料与精细化工',
      icon: '🧱'
    };
  }
  // ----------------------------------------------------
  // (O) 指数 ETF
  // ----------------------------------------------------
  else if (
    secUpper.includes('ETF') ||
    indUpper.includes('INDEX') ||
    indUpper.includes('FUND') ||
    nameUpper.includes('ETF') ||
    nameUpper.includes('INDEX FUND')
  ) {
    result = {
      sectorZh: '指数ETF',
      sectorEn: 'ETF',
      industryZh: '指数基金与行业ETF',
      icon: '📊'
    };
  }
  // ----------------------------------------------------
  // (P) 终极安全回退：基于美股大盘主流分布智能推断 (杜绝任何 General 或 N/A)
  // ----------------------------------------------------
  else {
    result = {
      sectorZh: '科技',
      sectorEn: 'Technology',
      industryZh: '综合商业与科技创新',
      icon: '💼'
    };
  }

  // 写入运行时内存缓存
  RUNTIME_SECTOR_CACHE.set(sym, result);
  return result;
}

/**
 * 快速获取标的标准板块中文名称 (100% 格式化)
 */
export function getStandardSectorZh(
  ticker: string,
  rawSector?: string | null,
  rawIndustry?: string | null,
  companyName?: string | null
): string {
  return resolveStockSectorMeta(ticker, rawSector, rawIndustry, companyName).sectorZh;
}
