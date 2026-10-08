import React from 'react';

export interface SectorVisualMeta {
  sectorZh: string;
  sectorEn: string;
  industryZh?: string;
  icon: string;
  badgeClass: string;
}

// 知名美股标的高频直通映射
const PRELOADED_SECTOR_MAP: Record<string, { sectorZh: string; sectorEn: string; industryZh: string; icon: string; badgeClass: string }> = {
  // 军工航天 (Aerospace & Defense)
  'LMT': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '航天防务与导弹系统', icon: '🛡️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'RTX': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '航空航天与国防雷达', icon: '🛡️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'NOC': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '隐身战机与战略防务', icon: '🛡️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'GD': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '装甲潜艇与防务系统', icon: '🛡️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'BA': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '民用客机与军工航天', icon: '✈️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'AVAV': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '巡飞弹无人机防务', icon: '🛡️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'LHX': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '军工通信与电子战', icon: '🛡️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'KTOS': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '无人战斗靶机与军工电子', icon: '🛡️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'TXT': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '直升机与轻型攻击机', icon: '🛡️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'HII': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '军用航母与核潜艇制造', icon: '⚓', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'LDOS': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '国防情报技术与国家安全', icon: '🛡️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'TDG': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '航空航天工程零部件', icon: '✈️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },
  'HEI': { sectorZh: '军工', sectorEn: 'Aerospace & Defense', industryZh: '航空航天替代件与防务电子', icon: '✈️', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80' },

  // 金融服务与商业银行 (Financials)
  'JPM': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '全球多元化综合银行', icon: '🏦', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'BAC': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '商业银行与零售金融', icon: '🏦', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'WFC': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '商业银行与按揭贷款', icon: '🏦', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'C': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '跨国商业银行', icon: '🏦', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'GS': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '顶级投资银行与高频做市', icon: '🏦', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'MS': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '投资银行与财富管理', icon: '🏦', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'BLK': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '全球资产管理集团', icon: '💼', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'AXP': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '高端信用卡与商务支付', icon: '💳', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'V': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '全球数字支付清算网络', icon: '💳', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'MA': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '全球信用卡支付网络', icon: '💳', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'PYPL': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '数字钱包与在线支付', icon: '💳', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'COIN': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '数字资产合规交易所', icon: '🪙', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'HOOD': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '零售互联网券商', icon: '📈', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'SOFI': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '数字科技银行与学生信贷', icon: '🏦', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'BRK-A': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '伯克希尔多元化金融财团', icon: '💼', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },
  'BRK-B': { sectorZh: '金融', sectorEn: 'Financial Services', industryZh: '伯克希尔多元化金融财团', icon: '💼', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80' },

  // 半导体与芯片制造 (Semiconductors)
  'NVDA': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: 'AI算力GPU与通用加速芯片', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'AMD': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '高性能CPU与GPU芯片', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'INTC': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: 'x86处理器与晶圆代工', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'TSM': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '全球先进制程晶圆代工', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'AVGO': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '网络交换与定制ASIC芯片', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'QCOM': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '移动基带与骁龙SOC', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'MU': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: 'DRAM与HBM高带宽存储', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'ASML': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: 'EUV极紫外光刻机设备', icon: '🔬', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'AMAT': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '半导体薄膜沉积与刻蚀设备', icon: '🔬', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'LRCX': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '晶圆制造等离子刻蚀设备', icon: '🔬', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'ARM': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '低功耗移动架构IP授权', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'TXN': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '模拟芯片与嵌入式处理器', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'AEHR': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '碳化硅SiC晶圆级老化测试设备', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'KLAC': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '半导体良率检测与量测设备', icon: '🔬', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'ADI': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '高性能模拟信号转换芯片', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'MRVL': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '数据中心网络与光互联芯片', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },
  'ON': { sectorZh: '半导体', sectorEn: 'Semiconductors', industryZh: '汽车功率半导体与碳化硅', icon: '⚡', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80' },

  // 医疗健康与生命科学 (Healthcare)
  'DHR': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '生命科学仪器与临床诊断', icon: '🏥', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'TMO': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '科研分析仪器与实验耗材', icon: '🏥', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'MANE': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '生物创新医药研发', icon: '💊', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'MRNA': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: 'mRNA核酸疫苗与创新生物药', icon: '💊', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'LLY': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: 'GLP-1减肥降糖药与生物药', icon: '💊', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'UNH': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '商业健康险与医疗网络', icon: '🏥', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'JNJ': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '创新制药与医疗器械', icon: '🏥', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'ABBV': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '免疫学与肿瘤生物制药', icon: '💊', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'MRK': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: 'PD-1肿瘤靶向药与疫苗', icon: '💊', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'ABT': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '心血管支架与动态血糖仪', icon: '🏥', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'PFE': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '抗感染疫苗与化学制药', icon: '💊', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'AMGN': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '生物类似药与骨科用药', icon: '💊', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'ISRG': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '达芬奇手术机器人与内窥镜', icon: '🔬', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },
  'VRTX': { sectorZh: '医疗健康', sectorEn: 'Healthcare', industryZh: '囊性纤维化靶向治疗', icon: '💊', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80' },

  // 科技与软件 (Technology / Software)
  'MSFT': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '企业级云服务与办公软件', icon: '💻', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'AAPL': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '消费电子终端与生态系统', icon: '📱', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'ORCL': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '数据库系统与企业云基础设施', icon: '💻', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'CRM': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '企业客户关系CRM云服务', icon: '☁️', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'ADBE': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '数字创意与文档云设计工具', icon: '🎨', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'NOW': { sectorZh: '科技', sectorEn: 'Technology', industryZh: 'IT工作流自动化云平台', icon: '💻', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'PLTR': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '企业AI大脑与大数据决策', icon: '🧠', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'SNOW': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '多云架构数据仓库平台', icon: '❄️', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'PANW': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '下一代防火墙与网络安全', icon: '🔒', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'CRWD': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '端点安全与云威胁检测', icon: '🛡️', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'NET': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '边缘计算与抗DDoS网络安全', icon: '🌐', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'SHOP': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '独立站SaaS电商技术平台', icon: '🛍️', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'MSTR': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '商业智能软件与比特币储备', icon: '📊', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'STX': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '高容量机械硬盘与存储系统', icon: '💾', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'WDC': { sectorZh: '科技', sectorEn: 'Technology', industryZh: 'NAND闪存与大容量固态硬盘', icon: '💾', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'CSCO': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '企业网络路由器与交换机', icon: '🌐', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },
  'IBM': { sectorZh: '科技', sectorEn: 'Technology', industryZh: '混合云架构与IT咨询集成', icon: '💻', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80' },

  // 可选消费与新能源车
  'AMZN': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '综合电商与AWS云计算', icon: '📦', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80' },
  'TSLA': { sectorZh: '新能源车', sectorEn: 'Consumer Cyclical', industryZh: '纯电智能汽车与储能系统', icon: '🚗', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80' },
  'HD': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '家居建材翻修连锁超市', icon: '🔨', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80' },
  'MCD': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '全球快餐连锁特许加盟', icon: '🍔', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80' },
  'NKE': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '运动鞋服设计与零售', icon: '👟', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80' },
  'BABA': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '电子商务与阿里云服务', icon: '🛍️', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80' },
  'PDD': { sectorZh: '可选消费', sectorEn: 'Consumer Cyclical', industryZh: '社交拼购电商与Temu出海', icon: '🛍️', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80' },
  'NIO': { sectorZh: '新能源车', sectorEn: 'Consumer Cyclical', industryZh: '高端智能纯电动汽车', icon: '🚗', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80' },
  'LI': { sectorZh: '新能源车', sectorEn: 'Consumer Cyclical', industryZh: '家庭增程式智能SUV', icon: '🚗', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80' },
  'XPEV': { sectorZh: '新能源车', sectorEn: 'Consumer Cyclical', industryZh: '智能辅助驾驶纯电汽车', icon: '🚗', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80' },

  // 必需消费 (Consumer Staples)
  'WMT': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '全球零售超级大卖场', icon: '🛒', badgeClass: 'bg-lime-50 text-lime-800 border-lime-200/80' },
  'COST': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '会员制仓储量贩批发超市', icon: '🛒', badgeClass: 'bg-lime-50 text-lime-800 border-lime-200/80' },
  'PG': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '日化洗护与个人护理品牌', icon: '🧼', badgeClass: 'bg-lime-50 text-lime-800 border-lime-200/80' },
  'KO': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '可口可乐软饮料与瓶装业务', icon: '🥤', badgeClass: 'bg-lime-50 text-lime-800 border-lime-200/80' },
  'PEP': { sectorZh: '必需消费', sectorEn: 'Consumer Defensive', industryZh: '百事可乐饮料与乐事休闲零食', icon: '🍿', badgeClass: 'bg-lime-50 text-lime-800 border-lime-200/80' },

  // 通信媒体 (Communication Services)
  'GOOGL': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '搜索引擎与流媒体广告', icon: '🔍', badgeClass: 'bg-pink-50 text-pink-800 border-pink-200/80' },
  'GOOG': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '搜索引擎与云服务平台', icon: '🔍', badgeClass: 'bg-pink-50 text-pink-800 border-pink-200/80' },
  'META': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '社交网络与元宇宙XR硬件', icon: '🌐', badgeClass: 'bg-pink-50 text-pink-800 border-pink-200/80' },
  'NFLX': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '流媒体长视频订阅平台', icon: '🎬', badgeClass: 'bg-pink-50 text-pink-800 border-pink-200/80' },
  'DIS': { sectorZh: '通信媒体', sectorEn: 'Communication Services', industryZh: '主题公园度假区与影视娱乐', icon: '🏰', badgeClass: 'bg-pink-50 text-pink-800 border-pink-200/80' },

  // 能源 (Energy)
  'XOM': { sectorZh: '能源', sectorEn: 'Energy', industryZh: '深海油气勘探开采与炼油', icon: '⛽', badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200/80' },
  'CVX': { sectorZh: '能源', sectorEn: 'Energy', industryZh: '上游油气田与石化下游产品', icon: '⛽', badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200/80' },

  // 工业制造 (Industrials)
  'CAT': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '重型工程挖掘机械与矿山机械', icon: '🚜', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300/80' },
  'GE': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '航空商用航发涡轮与燃气轮机', icon: '⚙️', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300/80' },
  'UNP': { sectorZh: '工业制造', sectorEn: 'Industrials', industryZh: '北美干线铁路联运网络', icon: '🚂', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300/80' },

  // ETF
  'SPY': { sectorZh: '指数ETF', sectorEn: 'ETF', industryZh: '标普500核心蓝筹ETF', icon: '📊', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/80' },
  'QQQ': { sectorZh: '指数ETF', sectorEn: 'ETF', industryZh: '纳斯达克100科技龙头ETF', icon: '📊', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/80' },
  'IWM': { sectorZh: '指数ETF', sectorEn: 'ETF', industryZh: '罗素2000小盘成长股ETF', icon: '📊', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/80' }
};

/**
 * 前端通用美股板块中文化解析器
 * 智能容错：即使输入 'General', 'Technology', 'Healthcare', 'Aerospace & Defense'
 * 也能准确推导出美股标准中文板块名称及优雅配色
 */
export function resolveSectorMeta(
  ticker?: string,
  rawSector?: string | null,
  rawIndustry?: string | null
): SectorVisualMeta {
  const sym = (ticker || '').toUpperCase().trim();

  // 1. 优先查标的直通字典
  if (sym && PRELOADED_SECTOR_MAP[sym]) {
    return PRELOADED_SECTOR_MAP[sym];
  }

  const s = (rawSector || '').trim();
  const ind = (rawIndustry || '').trim();
  const combined = `${s} ${ind}`.toUpperCase();

  // 2. 规则树推断：
  // 军工 (Aerospace & Defense)
  if (
    combined.includes('AEROSPACE') ||
    combined.includes('DEFENSE') ||
    combined.includes('军工') ||
    combined.includes('航天') ||
    combined.includes('防务')
  ) {
    return {
      sectorZh: '军工',
      sectorEn: 'Aerospace & Defense',
      industryZh: ind || '航天防务',
      icon: '🛡️',
      badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80'
    };
  }

  // 半导体 (Semiconductors)
  if (
    combined.includes('SEMICONDUCTOR') ||
    combined.includes('CHIP') ||
    combined.includes('WAFER') ||
    combined.includes('半导体') ||
    combined.includes('芯片')
  ) {
    return {
      sectorZh: '半导体',
      sectorEn: 'Semiconductors',
      industryZh: ind || '芯片半导体',
      icon: '⚡',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200/80'
    };
  }

  // 金融 (Financials)
  if (
    combined.includes('FINANC') ||
    combined.includes('BANK') ||
    combined.includes('INSURANCE') ||
    combined.includes('CREDIT') ||
    combined.includes('CAPITAL MARKET') ||
    combined.includes('金融') ||
    combined.includes('银行') ||
    combined.includes('证券')
  ) {
    return {
      sectorZh: '金融',
      sectorEn: 'Financial Services',
      industryZh: ind || '金融服务与银行',
      icon: '🏦',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80'
    };
  }

  // 医疗健康 (Healthcare)
  if (
    combined.includes('HEALTH') ||
    combined.includes('CARE') ||
    combined.includes('BIOTECH') ||
    combined.includes('PHARMA') ||
    combined.includes('DRUG') ||
    combined.includes('MEDICAL') ||
    combined.includes('DIAGNOSTIC') ||
    combined.includes('医疗') ||
    combined.includes('生物') ||
    combined.includes('制药')
  ) {
    return {
      sectorZh: '医疗健康',
      sectorEn: 'Healthcare',
      industryZh: ind || '医疗保健与生物医药',
      icon: '🏥',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200/80'
    };
  }

  // 新能源车 / 汽车制造
  if (
    combined.includes('AUTO') ||
    combined.includes('VEHICLE') ||
    combined.includes('汽车') ||
    combined.includes('新能源车')
  ) {
    return {
      sectorZh: '新能源车',
      sectorEn: 'Automotive',
      industryZh: ind || '汽车与新能源',
      icon: '🚗',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80'
    };
  }

  // 科技 / 软件
  if (
    combined.includes('TECH') ||
    combined.includes('SOFTWARE') ||
    combined.includes('CLOUD') ||
    combined.includes('IT') ||
    combined.includes('科技') ||
    combined.includes('软件')
  ) {
    return {
      sectorZh: '科技',
      sectorEn: 'Technology',
      industryZh: ind || '信息技术与软件',
      icon: '💻',
      badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80'
    };
  }

  // 能源 (Energy)
  if (
    combined.includes('ENERGY') ||
    combined.includes('OIL') ||
    combined.includes('GAS') ||
    combined.includes('能源') ||
    combined.includes('石油')
  ) {
    return {
      sectorZh: '能源',
      sectorEn: 'Energy',
      industryZh: ind || '石油石化能源',
      icon: '⛽',
      badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200/80'
    };
  }

  // 通信媒体 (Communication Services)
  if (
    combined.includes('COMMUNICATION') ||
    combined.includes('TELECOM') ||
    combined.includes('MEDIA') ||
    combined.includes('INTERNET') ||
    combined.includes('通信') ||
    combined.includes('传媒')
  ) {
    return {
      sectorZh: '通信媒体',
      sectorEn: 'Communication Services',
      industryZh: ind || '通信互联网与数字媒体',
      icon: '📡',
      badgeClass: 'bg-pink-50 text-pink-800 border-pink-200/80'
    };
  }

  // 可选消费 (Consumer Cyclical)
  if (
    combined.includes('CYCLICAL') ||
    combined.includes('DISCRETIONARY') ||
    combined.includes('RETAIL') ||
    combined.includes('可选消费') ||
    combined.includes('消费零售')
  ) {
    return {
      sectorZh: '可选消费',
      sectorEn: 'Consumer Cyclical',
      industryZh: ind || '非必需可选消费',
      icon: '🛍️',
      badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80'
    };
  }

  // 必需消费 (Consumer Staples)
  if (
    combined.includes('DEFENSIVE') ||
    combined.includes('STAPLES') ||
    combined.includes('BEVERAGE') ||
    combined.includes('FOOD') ||
    combined.includes('必需消费') ||
    combined.includes('食品饮料')
  ) {
    return {
      sectorZh: '必需消费',
      sectorEn: 'Consumer Defensive',
      industryZh: ind || '生活必需消费品',
      icon: '🛒',
      badgeClass: 'bg-lime-50 text-lime-800 border-lime-200/80'
    };
  }

  // 工业制造 (Industrials)
  if (
    combined.includes('INDUSTRIAL') ||
    combined.includes('MACHINERY') ||
    combined.includes('工业') ||
    combined.includes('机械')
  ) {
    return {
      sectorZh: '工业制造',
      sectorEn: 'Industrials',
      industryZh: ind || '工业制造与重型机械',
      icon: '⚙️',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-300/80'
    };
  }

  // 公用事业 (Utilities)
  if (
    combined.includes('UTILITY') ||
    combined.includes('UTILITIES') ||
    combined.includes('ELECTRIC') ||
    combined.includes('公用事业') ||
    combined.includes('电力')
  ) {
    return {
      sectorZh: '公用事业',
      sectorEn: 'Utilities',
      industryZh: ind || '公用事业与电力水务',
      icon: '💡',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200/80'
    };
  }

  // 房地产 (Real Estate)
  if (
    combined.includes('REAL ESTATE') ||
    combined.includes('REIT') ||
    combined.includes('地产') ||
    combined.includes('房产')
  ) {
    return {
      sectorZh: '房地产',
      sectorEn: 'Real Estate',
      industryZh: ind || '房地产与商业REITs',
      icon: '🏢',
      badgeClass: 'bg-stone-100 text-stone-800 border-stone-200/80'
    };
  }

  // 基础材料 (Basic Materials)
  if (
    combined.includes('MATERIAL') ||
    combined.includes('CHEMICAL') ||
    combined.includes('MINING') ||
    combined.includes('材料') ||
    combined.includes('化工')
  ) {
    return {
      sectorZh: '基础材料',
      sectorEn: 'Basic Materials',
      industryZh: ind || '基础材料与化学工业',
      icon: '🧱',
      badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-200/80'
    };
  }

  // ETF
  if (
    combined.includes('ETF') ||
    combined.includes('INDEX') ||
    combined.includes('基金')
  ) {
    return {
      sectorZh: '指数ETF',
      sectorEn: 'ETF',
      industryZh: '指数与主题ETF',
      icon: '📊',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/80'
    };
  }

  // 3. 安全默认分类：科技 (彻底杜绝出现 General)
  return {
    sectorZh: '科技',
    sectorEn: 'Technology',
    industryZh: '综合商业与科技',
    icon: '💻',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200/80'
  };
}

/**
 * 美股板块中文规范化名称 (字符串单值快捷提取)
 */
export function getSectorZh(
  ticker?: string,
  rawSector?: string | null,
  rawIndustry?: string | null
): string {
  return resolveSectorMeta(ticker, rawSector, rawIndustry).sectorZh;
}

/**
 * 现代高辨识度美股板块胶囊徽章组件
 * 在所有股票卡片（暴跌反弹、雷达、自选股、弹窗）中统一呈现
 */
export const StockSectorBadge: React.FC<{
  ticker?: string;
  sector?: string | null;
  industry?: string | null;
  showIcon?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}> = ({
  ticker,
  sector,
  industry,
  showIcon = true,
  className = '',
  size = 'sm'
}) => {
  const meta = resolveSectorMeta(ticker, sector, industry);

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.2 leading-tight',
    sm: 'text-[10px] px-1.5 py-0.5 leading-tight',
    md: 'text-[11px] px-2 py-0.5 leading-normal'
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold rounded-md border shrink-0 ${sizeClasses} ${meta.badgeClass} ${className}`}
      title={`${meta.sectorZh} (${meta.sectorEn}) · ${meta.industryZh || ''}`}
    >
      {showIcon && <span className="text-[10px] leading-none select-none">{meta.icon}</span>}
      <span className="truncate">{meta.sectorZh}</span>
    </span>
  );
};
