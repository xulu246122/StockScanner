import { useState, useEffect, useRef } from 'react';
import { StockLogo } from '../components/common/StockLogo.tsx';
import { apiClient } from '../services/apiClient.ts';
import { ScreenerResultItem, Timeframe } from '../types.ts';
import {
  Zap,
  ArrowRight,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Building2,
  DollarSign,
  Star,
  Bell,
  Activity,
  Flame,
  Radar,
  Search,
  ArrowUp,
  LayoutGrid,
  Target,
  AlertTriangle,
  Play,
  Check,
  Filter,
  Layers,
  Sparkles,
  Sliders,
  Bookmark,
  Compass
} from 'lucide-react';
import { VisualFilterBuilderModal } from '../components/radar/VisualFilterBuilderModal.tsx';
import { PresetManagerModal } from '../components/radar/PresetManagerModal.tsx';
import { QuantWeightsDrawer } from '../components/radar/QuantWeightsDrawer.tsx';
import { ConditionGroup, ConditionNode, RadarPreset, RankingWeights } from '../types.ts';
import { useResponsive } from '../hooks/useResponsive.ts';
import { StockSectorBadge, getSectorZh } from '../utils/stockSectorMapper.tsx';
import { RadarFactorMatrixSheet } from '../components/m3/RadarFactorMatrixSheet.tsx';
import { M3ExtendedFAB } from '../components/m3/M3ExtendedFAB.tsx';

interface RadarScannerViewProps {
  onSelectStock: (ticker: string) => void;
  onOpenAlertModal: (ticker: string, stockName?: string, currentRsi?: number) => void;
  onToggleWatchlist: (ticker: string) => void;
  watchlistTickers: string[];
  onOpenRsiRadar: () => void;
}

interface StockQuantAnalysis {
  trend: string;
  trendDetail: string;
  dotColor: string;
  actionBadge: string;
  badgeStyle: string;
  actionAdvice: string;
  factorName: string;
  factorScore: number;
  factorRating: string;
  factorRatingStyle: string;
  factorRecommendation: string;
}

export interface RadarFilterDraft {
  radarMode: string;
  rsiPeriod: 6 | 14 | 24;
  timeframe: Timeframe;
  marketCapFilter: '1B' | '5B' | '10B' | 'ALL';
  priceFilter: 'ALL' | 'UNDER_10' | '10_50' | '50_100' | 'OVER_100';
  selectedSectors: string[]; // empty array means "全部行业" (All Sectors)
}

// Standard GICS 11 Sectors + ETF for US Stock Quant Terminal
export const AVAILABLE_SECTORS = [
  { id: 'Technology', labelZh: '信息技术 / 科技', labelEn: 'Technology', icon: '💻', desc: 'AAPL, NVDA, MSFT, AMD, ORCL' },
  { id: 'Healthcare', labelZh: '医疗保健 / 生物', labelEn: 'Healthcare', icon: '🏥', desc: 'LLY, UNH, JNJ, ABBV, MRK' },
  { id: 'Financial Services', labelZh: '金融服务 / 银行', labelEn: 'Financials', icon: '🏦', desc: 'JPM, V, MA, BAC, BRK-B' },
  { id: 'Consumer Cyclical', labelZh: '可选消费 / 零售', labelEn: 'Consumer Discretionary', icon: '🛍️', desc: 'AMZN, TSLA, HD, MCD, NKE' },
  { id: 'Communication Services', labelZh: '通信与互联网', labelEn: 'Communication Services', icon: '📡', desc: 'GOOGL, META, NFLX, DIS' },
  { id: 'Industrials', labelZh: '工业制造 / 航天', labelEn: 'Industrials', icon: '⚙️', desc: 'CAT, GE, BA, UNP, HON' },
  { id: 'Energy', labelZh: '能源石油 / 天然气', labelEn: 'Energy', icon: '⚡', desc: 'XOM, CVX, COP, SLB, EOG' },
  { id: 'Consumer Defensive', labelZh: '必需消费 / 食品', labelEn: 'Consumer Staples', icon: '🛒', desc: 'PG, COST, WMT, KO, PEP' },
  { id: 'Real Estate', labelZh: '房地产 / 商业地产', labelEn: 'Real Estate', icon: '🏢', desc: 'PLD, AMT, EQIX, CCI, SPG' },
  { id: 'Utilities', labelZh: '公用事业 / 电力', labelEn: 'Utilities', icon: '💡', desc: 'NEE, SO, DUK, SRE, AEP' },
  { id: 'Materials', labelZh: '基础原材料 / 化工', labelEn: 'Materials', icon: '🧱', desc: 'LIN, APD, SHW, FCX, NEM' },
  { id: 'ETF', labelZh: '宽基与行业 ETF', labelEn: 'ETFs & Indices', icon: '📊', desc: 'SPY, QQQ, IWM, DIA, XLK' }
];

function buildFactorRecommendation(
  stock: ScreenerResultItem,
  factorName: string,
  actionAdvice: string,
  radarMode: string
): string {
  if (stock.factorRecommendation && stock.factorRecommendation !== 'N/A' && stock.factorRecommendation.trim().length > 0) {
    return stock.factorRecommendation;
  }

  if (stock.whyMatched?.summary) {
    return `【${factorName}】${stock.whyMatched.summary}`;
  }

  const rsi = stock.rsi;
  const chg = stock.changePercent;
  const rvol = stock.rvol ?? stock.relativeVolume ?? 1.0;
  const rsRank = stock.rsRank ?? 70;

  if (rsi <= 20) {
    return `【${factorName}】RSI(${rsi.toFixed(1)}) 触及历史极值超跌区，超卖偏离度 ${(50 - rsi).toFixed(1)}%，${actionAdvice}`;
  }
  if (rsi <= 30) {
    return `【${factorName}】RSI(${rsi.toFixed(1)}) 构筑超卖企稳，量比 RVOL ${rvol.toFixed(1)}x 沉淀，${actionAdvice}`;
  }
  if (rsi <= 40) {
    return `【${factorName}】中低位弱势整理吸筹 (RSI ${rsi.toFixed(1)})，回踩企稳，${actionAdvice}`;
  }
  if (radarMode === 'PULLBACK' || (rsi >= 40 && rsi <= 55 && chg >= -2.0 && chg <= 0.5)) {
    return `【${factorName}】缩量回踩关键均线与通道下轨，日内波动 ${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%，${actionAdvice}`;
  }
  if (radarMode === 'BREAKOUT' || (rsi >= 55 && rsi < 70 && chg > 0.8)) {
    return `【${factorName}】放量突破关键阻力位，量比 RVOL ${rvol.toFixed(1)}x，相对强弱 RS Rank ${rsRank}，${actionAdvice}`;
  }
  if (radarMode === 'HIGH_REL_VOL' || (stock.volume && stock.volume > 2000000 && Math.abs(chg) > 2.2)) {
    return `【${factorName}】成交量异动放大，日内换手活跃，${actionAdvice}`;
  }
  if (rsi >= 70) {
    return `【${factorName}】指标进入极端超买过热区 (RSI ${rsi.toFixed(1)})，多头动能面临回调压力，${actionAdvice}`;
  }

  return `【${factorName}】多因子综合评分 ${stock.score ?? 75}/100，箱体整理待突破，${actionAdvice}`;
}

function getStockQuantAnalysis(
  stock: ScreenerResultItem,
  radarMode: string,
  timeframe: string
): StockQuantAnalysis {
  const rsi = stock.rsi;
  const chg = stock.changePercent;
  const vol = stock.volume || 1000000;
  const isLargeCap = (stock.marketCap || 0) >= 10e9;

  // 1. Extreme Oversold (RSI <= 20)
  if (rsi <= 20) {
    const score = Math.min(96, Math.max(88, Math.round(96 - rsi * 0.4 + (isLargeCap ? 2 : 0))));
    const factorName = '均值回归+极端偏离因子';
    const actionAdvice = '触及历史极值超跌区，建议左侧分批建仓，严守5%止损';
    return {
      trend: '极度超跌·底部背离',
      trendDetail: `超跌偏离度 ${(50 - rsi).toFixed(1)}%`,
      dotColor: 'bg-purple-500 animate-pulse',
      actionBadge: '左侧吸筹',
      badgeStyle: 'bg-purple-100 text-purple-900 border border-purple-300 font-extrabold',
      actionAdvice,
      factorName,
      factorScore: stock.factorScore ?? stock.score ?? score,
      factorRating: '强烈推荐',
      factorRatingStyle: 'bg-purple-600 text-white',
      factorRecommendation: buildFactorRecommendation(stock, factorName, actionAdvice, radarMode)
    };
  }

  // 2. Oversold Rebound (RSI <= 30)
  if (rsi <= 30) {
    const score = Math.min(90, Math.max(82, Math.round(89 - (rsi - 20) * 0.6 + (chg >= 0 ? 3 : 0))));
    const factorName = '反转+估值修复因子';
    const actionAdvice = '超卖区间量能逐步沉淀，建议逢低分批吸筹，等待放量拐点确认';
    return {
      trend: '超卖磨底·企稳反弹',
      trendDetail: `RSI(${rsi.toFixed(1)})企稳`,
      dotColor: 'bg-emerald-500 animate-pulse',
      actionBadge: '逢低吸筹',
      badgeStyle: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
      actionAdvice,
      factorName,
      factorScore: stock.factorScore ?? stock.score ?? score,
      factorRating: '买入增持',
      factorRatingStyle: 'bg-emerald-600 text-white',
      factorRecommendation: buildFactorRecommendation(stock, factorName, actionAdvice, radarMode)
    };
  }

  // 3. Mild Oversold / Accumulation Zone (RSI <= 40)
  if (rsi <= 40) {
    const score = Math.min(86, Math.max(76, Math.round(85 - (rsi - 30) * 0.7 + (chg >= 0 ? 2 : 0))));
    const factorName = '估值折价+低位吸筹因子';
    const actionAdvice = '股价处于中低位弱势吸筹区间，回踩企稳，建议逢低分批建仓跟踪';
    return {
      trend: '弱势蓄势·回踩吸筹',
      trendDetail: `RSI(${rsi.toFixed(1)})吸筹`,
      dotColor: 'bg-teal-500 animate-pulse',
      actionBadge: '逢低吸筹',
      badgeStyle: 'bg-teal-100 text-teal-800 border border-teal-300 font-bold',
      actionAdvice,
      factorName,
      factorScore: stock.factorScore ?? stock.score ?? score,
      factorRating: '建议关注',
      factorRatingStyle: 'bg-teal-600 text-white',
      factorRecommendation: buildFactorRecommendation(stock, factorName, actionAdvice, radarMode)
    };
  }

  // 4. Pullback Support
  if (radarMode === 'PULLBACK' || (rsi >= 40 && rsi <= 55 && chg >= -2.0 && chg <= 0.5)) {
    const score = Math.min(88, Math.max(78, Math.round(84 + (isLargeCap ? 2 : 0) + (chg > -1 ? 2 : 0))));
    const factorName = '中期动量+支撑共振因子';
    const actionAdvice = '依托关键均线与通道下轨蓄势，建议挂单低吸，跌破前低止损';
    return {
      trend: '均线回踩·中继蓄势',
      trendDetail: '缩量回踩支撑',
      dotColor: 'bg-blue-500',
      actionBadge: '顺势低吸',
      badgeStyle: 'bg-blue-100 text-blue-800 border border-blue-300 font-bold',
      actionAdvice,
      factorName,
      factorScore: stock.factorScore ?? stock.score ?? score,
      factorRating: '顺势加仓',
      factorRatingStyle: 'bg-blue-600 text-white',
      factorRecommendation: buildFactorRecommendation(stock, factorName, actionAdvice, radarMode)
    };
  }

  // 4. Momentum Breakout
  if (radarMode === 'BREAKOUT' || (rsi >= 55 && rsi < 70 && chg > 0.8)) {
    const score = Math.min(92, Math.max(83, Math.round(85 + Math.min(chg, 5) * 1.2)));
    const factorName = '量价突破+动量加速因子';
    const actionAdvice = '放量越过阻力位，动能强劲，建议顺势跟进，启用移动止盈锁利';
    return {
      trend: '放量突破·动能加速',
      trendDetail: `涨幅 +${chg.toFixed(2)}%`,
      dotColor: 'bg-amber-500 animate-pulse',
      actionBadge: '突破跟进',
      badgeStyle: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      actionAdvice,
      factorName,
      factorScore: stock.factorScore ?? stock.score ?? score,
      factorRating: '进攻买入',
      factorRatingStyle: 'bg-amber-600 text-white',
      factorRecommendation: buildFactorRecommendation(stock, factorName, actionAdvice, radarMode)
    };
  }

  // 5. Volume Spike (RelVol > 1.4x)
  if (radarMode === 'HIGH_REL_VOL' || (vol > 2000000 && Math.abs(chg) > 2.2)) {
    const score = Math.min(84, Math.max(72, Math.round(76 + (chg > 0 ? 4 : -2))));
    const factorName = '异常流动性因子';
    const actionAdvice = '日内成交量比异常放大，多空激烈换手，建议观察收盘形态企稳';
    return {
      trend: '成交异动·主力博弈',
      trendDetail: `成交量异动 ${(vol / 1e6).toFixed(1)}M`,
      dotColor: 'bg-orange-500',
      actionBadge: '重点监控',
      badgeStyle: 'bg-orange-100 text-orange-800 border border-orange-300 font-bold',
      actionAdvice,
      factorName,
      factorScore: stock.factorScore ?? stock.score ?? score,
      factorRating: '密切跟踪',
      factorRatingStyle: 'bg-orange-500 text-white',
      factorRecommendation: buildFactorRecommendation(stock, factorName, actionAdvice, radarMode)
    };
  }

  // 6. Overbought Alert (RSI >= 70)
  if (rsi >= 70) {
    const score = Math.max(30, Math.round(52 - (rsi - 70) * 1.5));
    const factorName = '动量过热+波动溢出因子';
    const actionAdvice = '指标进入极端超买高风险区，严禁盲目追高，建议逢高分批减仓';
    return {
      trend: '动能过热·高位滞涨',
      trendDetail: `严重超买 RSI(${rsi.toFixed(1)})`,
      dotColor: 'bg-rose-500 animate-ping',
      actionBadge: '逢高止盈',
      badgeStyle: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      actionAdvice,
      factorName,
      factorScore: stock.factorScore ?? stock.score ?? score,
      factorRating: '建议减持',
      factorRatingStyle: 'bg-rose-600 text-white',
      factorRecommendation: buildFactorRecommendation(stock, factorName, actionAdvice, radarMode)
    };
  }

  // Default Neutral / Oscillating
  const score = Math.round(62 + chg * 2);
  const factorName = '中性Beta平衡因子';
  const actionAdvice = '股价处于箱体震荡中轴，方向未明，建议保持观望，轻仓跟踪';
  return {
    trend: chg >= 0 ? '温和向上·震荡蓄势' : '弱势整理·箱体波动',
    trendDetail: `震荡幅度 ${Math.abs(chg).toFixed(2)}%`,
    dotColor: chg >= 0 ? 'bg-emerald-400' : 'bg-slate-400',
    actionBadge: '中性观望',
    badgeStyle: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium',
    actionAdvice,
    factorName,
    factorScore: stock.factorScore ?? stock.score ?? Math.min(75, Math.max(50, score)),
    factorRating: '中性持有',
    factorRatingStyle: 'bg-slate-600 text-white',
    factorRecommendation: buildFactorRecommendation(stock, factorName, actionAdvice, radarMode)
  };
}

function syncTacticalTriggerRule(
  rules: ConditionGroup,
  radarMode: string,
  rsiPeriod: number
): ConditionGroup {
  const cleanChildren = (rules.children || []).filter(c => {
    if (c.type === 'leaf' && (c.id.startsWith('tactical_trigger_') || c.indicatorId.startsWith('rsi_'))) return false;
    return true;
  });

  const newLeaf: ConditionNode | null = (() => {
    if (radarMode === 'OVERSOLD_30') {
      return {
        type: 'leaf',
        id: 'tactical_trigger_oversold_30',
        indicatorId: `rsi_${rsiPeriod}`,
        operator: 'LTE',
        value: 30
      };
    }
    if (radarMode === 'OVERSOLD_20') {
      return {
        type: 'leaf',
        id: 'tactical_trigger_oversold_20',
        indicatorId: `rsi_${rsiPeriod}`,
        operator: 'LTE',
        value: 20
      };
    }
    if (radarMode === 'OVERSOLD_40') {
      return {
        type: 'leaf',
        id: 'tactical_trigger_oversold_40',
        indicatorId: `rsi_${rsiPeriod}`,
        operator: 'LTE',
        value: 40
      };
    }
    if (radarMode === 'OVERBOUGHT_70') {
      return {
        type: 'leaf',
        id: 'tactical_trigger_overbought_70',
        indicatorId: `rsi_${rsiPeriod}`,
        operator: 'GTE',
        value: 70
      };
    }
    if (radarMode === 'HIGH_REL_VOL') {
      return {
        type: 'leaf',
        id: 'tactical_trigger_rel_vol',
        indicatorId: 'rel_vol',
        operator: 'GTE',
        value: 1.4
      };
    }
    if (radarMode === 'BREAKOUT') {
      return {
        type: 'leaf',
        id: 'tactical_trigger_breakout',
        indicatorId: 'price',
        operator: 'GT',
        value: 'sma_20'
      };
    }
    if (radarMode === 'PULLBACK') {
      return {
        type: 'leaf',
        id: 'tactical_trigger_pullback',
        indicatorId: 'price',
        operator: 'GTE',
        value: 'sma_20'
      };
    }
    return null;
  })();

  return {
    ...rules,
    children: newLeaf ? [...cleanChildren, newLeaf] : cleanChildren
  };
}

export function getRecommendedRadarMode(profileType: string | undefined, currentMode: string): string {
  if (!profileType) return 'ALL';
  switch (profileType) {
    case 'BREAKOUT':
    case 'GAP_AND_GO':
      return 'BREAKOUT';
    case 'PULLBACK':
      return 'PULLBACK';
    case 'VOLUME_SURGE':
      return 'HIGH_REL_VOL';
    case 'EXTREME_OVERSOLD':
      return 'OVERSOLD_20';
    case 'OVERSOLD':
    case 'SHORT_TERM_1_10D':
    case 'MEAN_REVERSION':
      return currentMode.startsWith('OVERSOLD_') ? currentMode : 'OVERSOLD_30';
    default:
      // Trend following, Momentum, RS Leader, Defensive, High Liquidity, Earnings:
      // Allow pure strategy factor execution without conflicting oversold conditions
      return 'ALL';
  }
}

const INITIAL_FILTER_STATE: RadarFilterDraft = {
  radarMode: 'OVERSOLD_30',
  rsiPeriod: 14,
  timeframe: '1D',
  marketCapFilter: '1B',
  priceFilter: 'ALL',
  selectedSectors: []
};

export interface PresetGroup {
  id: string;
  name: string;
  icon: string;
  presetIds: string[];
}

export const PRESET_GROUPS: PresetGroup[] = [
  {
    id: 'oversold',
    name: '超跌反弹与均值回归',
    icon: '🎯',
    presetIds: [
      'preset_short_term_1_10d',
      'preset_oversold_rebound',
      'preset_mean_reversion',
      'preset_extreme_oversold'
    ]
  },
  {
    id: 'trend',
    name: '趋势中继与均线回踩',
    icon: '📈',
    presetIds: [
      'preset_pullback_support',
      'preset_trend_following',
      'preset_high_liquidity'
    ]
  },
  {
    id: 'breakout',
    name: '动能加速与平台突破',
    icon: '⚡',
    presetIds: [
      'preset_momentum_breakout',
      'preset_gap_and_go',
      'preset_short_squeeze'
    ]
  },
  {
    id: 'volume_alpha',
    name: '资金异动与 Alpha 领跑',
    icon: '🔥',
    presetIds: [
      'preset_volume_surge',
      'preset_relative_strength_leader',
      'preset_earnings_momentum',
      'preset_institutional_momentum'
    ]
  },
  {
    id: 'defensive',
    name: '稳健防守与低波底仓',
    icon: '🛡️',
    presetIds: [
      'preset_defensive'
    ]
  }
];

export function RadarScannerView({
  onSelectStock,
  onOpenAlertModal,
  onToggleWatchlist,
  watchlistTickers,
  onOpenRsiRadar
}: RadarScannerViewProps) {
  const { isMobile, isAndroid } = useResponsive();
  const [isMobileFilterExpanded, setIsMobileFilterExpanded] = useState<boolean>(false);
  const [isMobileFactorSheetOpen, setIsMobileFactorSheetOpen] = useState<boolean>(false);

  // 1. Decoupled State: Draft (editing) vs Applied (currently in scan result)
  const [draftFilters, setDraftFilters] = useState<RadarFilterDraft>(INITIAL_FILTER_STATE);
  const [appliedFilters, setAppliedFilters] = useState<RadarFilterDraft>(INITIAL_FILTER_STATE);

  // 2. Data & Loading States
  const [radarStocks, setRadarStocks] = useState<ScreenerResultItem[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [scannedUniverseCount, setScannedUniverseCount] = useState<number>(150);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(28);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scanStatusText, setScanStatusText] = useState<string>('正在执行多因子量化选股模型...');
  const [lastScannedAt, setLastScannedAt] = useState<string | null>(null);

  // 3. Concurrency guard ref
  const isScanningRef = useRef<boolean>(false);

  // 4. UI Dropdown State
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState<boolean>(false);
  const sectorDropdownRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // 5. Radar Unified Quant State
  const [currentRules, setCurrentRules] = useState<ConditionGroup>({
    type: 'group',
    id: 'root',
    logicalOperator: 'AND',
    children: []
  });
  const [currentWeights, setCurrentWeights] = useState<RankingWeights>({
    relativeStrength: 0.20,
    momentum: 0.20,
    volume: 0.15,
    trend: 0.15,
    sector: 0.15,
    market: 0.10,
    structure: 0.05
  });
  const [activePreset, setActivePreset] = useState<RadarPreset | null>(null);
  const [presetsList, setPresetsList] = useState<RadarPreset[]>([]);
  const [isFilterBuilderOpen, setIsFilterBuilderOpen] = useState(false);
  const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);
  const [isWeightsDrawerOpen, setIsWeightsDrawerOpen] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | undefined>(undefined);
  const [marketOverview, setMarketOverview] = useState<any>(null);

  const isOversoldStrategy = !activePreset?.profileType || 
    ['SHORT_TERM_1_10D', 'OVERSOLD', 'MEAN_REVERSION', 'EXTREME_OVERSOLD'].includes(activePreset.profileType);

  /**
   * Primary Scan Executor: Triggered on initial mount or when user clicks "雷达扫描启动"
   */
  const executeRadarScan = async (
    configToRun: RadarFilterDraft = draftFilters,
    presetToUse: RadarPreset | null = activePreset,
    rulesToUse: ConditionGroup = currentRules
  ) => {
    if (isScanningRef.current) return; // Concurrency lock
    isScanningRef.current = true;
    setIsLoading(true);
    setScanStatusText('正在直连公网金融 API 拉取全美股行情...');

    try {
      // 1. Parse price filter (default: ALL)
      let minPrice: number | undefined = undefined;
      let maxPrice: number | undefined = undefined;
      if (configToRun.priceFilter === 'UNDER_10') {
        maxPrice = 10;
      } else if (configToRun.priceFilter === '10_50') {
        minPrice = 10;
        maxPrice = 50;
      } else if (configToRun.priceFilter === '50_100') {
        minPrice = 50;
        maxPrice = 100;
      } else if (configToRun.priceFilter === 'OVER_100') {
        minPrice = 100;
      }

      // 2. Parse market cap filter (default: 1B+)
      let minMarketCap: number | undefined = undefined;
      if (configToRun.marketCapFilter === '1B') minMarketCap = 1_000_000_000;
      else if (configToRun.marketCapFilter === '5B') minMarketCap = 5_000_000_000;
      else if (configToRun.marketCapFilter === '10B') minMarketCap = 10_000_000_000;
      else if (configToRun.marketCapFilter === 'ALL') minMarketCap = 0;

      setScanStatusText(`正在执行 Wilder RSI(${configToRun.rsiPeriod}) 与 7 维因子矩阵实时研判...`);

      const screenerRes = await apiClient.screenRadarV2({
        universe: 'ALL',
        presetId: presetToUse?.id,
        rules: rulesToUse.children && rulesToUse.children.length > 0 ? rulesToUse : undefined,
        rankingWeights: currentWeights,
        radarMode: configToRun.radarMode,
        rsiPeriod: configToRun.rsiPeriod,
        minMarketCap,
        minPrice,
        maxPrice,
        sectors: configToRun.selectedSectors.length > 0 ? configToRun.selectedSectors : undefined,
        timeframe: configToRun.timeframe,
        pageSize: 60
      });

      setRadarStocks(screenerRes.results || []);
      setTotalMatches(screenerRes.total || screenerRes.results?.length || 0);
      if (screenerRes.scannedCount) setScannedUniverseCount(screenerRes.scannedCount);
      setAppliedFilters({ ...configToRun });
      setLastScannedAt(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      setVisibleCount(28);
    } catch (err) {
      console.error('Failed to execute multimodal radar scan:', err);
    } finally {
      isScanningRef.current = false;
      setIsLoading(false);
    }
  };

  // Load Presets & Market Context on mount, then trigger initial scan synchronously without race condition
  useEffect(() => {
    let isMounted = true;
    async function init() {
      let initialPreset: RadarPreset | null = null;
      let initialRules: ConditionGroup = syncTacticalTriggerRule(
        { type: 'group', id: 'root', logicalOperator: 'AND', children: [] },
        INITIAL_FILTER_STATE.radarMode,
        INITIAL_FILTER_STATE.rsiPeriod
      );

      try {
        const res = await apiClient.getRadarPresets();
        if (!isMounted) return;
        if (res.success && res.presets.length > 0) {
          setPresetsList(res.presets);
          const def = res.presets.find(p => p.id === 'preset_short_term_1_10d') || res.presets[0];
          initialPreset = def;
          const initialMode = getRecommendedRadarMode(def.profileType, INITIAL_FILTER_STATE.radarMode);
          initialRules = syncTacticalTriggerRule(def.rules, initialMode, INITIAL_FILTER_STATE.rsiPeriod);
          setActivePreset(def);
          setCurrentRules(initialRules);
          if (def.rankingWeights) setCurrentWeights(def.rankingWeights);
        }
      } catch (err) {
        console.error('Failed to fetch radar presets on mount:', err);
      }

      if (isMounted) {
        await executeRadarScan(INITIAL_FILTER_STATE, initialPreset, initialRules);
      }

      try {
        const ctx = await apiClient.getRadarMarketContext();
        if (isMounted && ctx.regime) setMarketOverview(ctx);
      } catch (e) {
        // ignore
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update preview count on rules/filter change
  useEffect(() => {
    let minPrice: number | undefined = undefined;
    let maxPrice: number | undefined = undefined;
    if (draftFilters.priceFilter === 'UNDER_10') maxPrice = 10;
    else if (draftFilters.priceFilter === '10_50') { minPrice = 10; maxPrice = 50; }
    else if (draftFilters.priceFilter === '50_100') { minPrice = 50; maxPrice = 100; }
    else if (draftFilters.priceFilter === 'OVER_100') minPrice = 100;

    let minMarketCap: number | undefined = undefined;
    if (draftFilters.marketCapFilter === '1B') minMarketCap = 1_000_000_000;
    else if (draftFilters.marketCapFilter === '5B') minMarketCap = 5_000_000_000;
    else if (draftFilters.marketCapFilter === '10B') minMarketCap = 10_000_000_000;
    else if (draftFilters.marketCapFilter === 'ALL') minMarketCap = 0;

    apiClient.getRadarPreviewCount({
      rules: currentRules,
      presetId: activePreset?.id,
      radarMode: draftFilters.radarMode,
      rsiPeriod: draftFilters.rsiPeriod,
      minMarketCap,
      minPrice,
      maxPrice,
      sectors: draftFilters.selectedSectors.length > 0 ? draftFilters.selectedSectors : undefined,
      timeframe: draftFilters.timeframe
    }).then((res) => {
      if (res.matchingCount !== undefined) {
        setPreviewCount(res.matchingCount);
      }
    }).catch(() => {});
  }, [currentRules, draftFilters, activePreset]);

  // Handlers for AST rules modification
  const handleAddCondition = (node: ConditionNode) => {
    setCurrentRules(prev => ({
      ...prev,
      children: [...(prev.children || []), node]
    }));
  };

  const handleRemoveLeaf = (conditionId: string) => {
    setCurrentRules(prev => ({
      ...prev,
      children: (prev.children || []).filter(c => c.id !== conditionId)
    }));
  };

  const handleClearAllRules = () => {
    setCurrentRules({
      type: 'group',
      id: 'root',
      logicalOperator: 'AND',
      children: []
    });
    setActivePreset(null);
  };

  const handleSelectPreset = (preset: RadarPreset) => {
    setActivePreset(preset);
    const effectiveRadarMode = getRecommendedRadarMode(preset.profileType, draftFilters.radarMode);
    const syncedRules = syncTacticalTriggerRule(preset.rules, effectiveRadarMode, draftFilters.rsiPeriod);
    setCurrentRules(syncedRules);
    if (preset.rankingWeights) setCurrentWeights(preset.rankingWeights);

    // Sync draftFilters to reflect preset parameters so Pro Badges and Summary bar match
    // Keep priceFilter as 'ALL' so $50+ core assets (e.g. NVDA, AAPL, MSFT, JPM, NVO, PLD) are not truncated
    let updatedDraft: RadarFilterDraft = { ...draftFilters, radarMode: effectiveRadarMode, priceFilter: 'ALL' };
    if (preset.rules && preset.rules.children) {
      for (const c of preset.rules.children) {
        if (c.type === 'leaf') {
          if (c.indicatorId === 'market_cap') {
            if (c.value >= 10e9) updatedDraft.marketCapFilter = '10B';
            else if (c.value >= 5e9) updatedDraft.marketCapFilter = '5B';
            else if (c.value >= 1e9) updatedDraft.marketCapFilter = '1B';
          }
        }
      }
    }
    setDraftFilters(updatedDraft);
    executeRadarScan(updatedDraft, preset, syncedRules);
  };

  // Close sector dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(e.target as Node)) {
        setIsSectorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute if draft filters have changed from applied filters
  const isFilterModified =
    draftFilters.radarMode !== appliedFilters.radarMode ||
    draftFilters.rsiPeriod !== appliedFilters.rsiPeriod ||
    draftFilters.timeframe !== appliedFilters.timeframe ||
    draftFilters.marketCapFilter !== appliedFilters.marketCapFilter ||
    draftFilters.priceFilter !== appliedFilters.priceFilter ||
    JSON.stringify([...draftFilters.selectedSectors].sort()) !== JSON.stringify([...appliedFilters.selectedSectors].sort());

  const scrollToTop = () => {
    if (gridContainerRef.current) {
      gridContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const formatCap = (cap?: number) => {
    if (!cap) return '-';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
    return `$${cap.toLocaleString()}`;
  };

  // Sector selection helper handlers
  const handleToggleSector = (sectorId: string) => {
    setDraftFilters(prev => {
      const current = prev.selectedSectors;
      if (current.includes(sectorId)) {
        return { ...prev, selectedSectors: current.filter(s => s !== sectorId) };
      } else {
        return { ...prev, selectedSectors: [...current, sectorId] };
      }
    });
  };

  const handleSelectAllSectors = () => {
    setDraftFilters(prev => ({
      ...prev,
      selectedSectors: AVAILABLE_SECTORS.map(s => s.id)
    }));
  };

  const handleClearSectors = () => {
    setDraftFilters(prev => ({
      ...prev,
      selectedSectors: []
    }));
  };

  // Filter stocks by live search within returned candidate pool
  const displayedStocks = radarStocks.filter(stock => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return stock.ticker.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q);
  });

  return (
    <div className={`flex flex-col ${isMobile ? 'gap-3 pb-24 px-1' : 'gap-4 pb-16'}`}>
      {isMobile ? (
        /* Mobile-Optimized Radar View */
        <div className="flex flex-col gap-3">
          {/* 1. Mobile Header Deck */}
          <div className="bg-white rounded-2xl p-2.5 border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Radar className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-xs font-black text-slate-900 tracking-tight truncate">
                      多模态雷达 2.0
                    </h1>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-md shrink-0">
                      匹配 {totalMatches}
                    </span>
                  </div>
                  <span className="text-[9.5px] font-mono text-slate-400 block truncate">
                    {lastScannedAt ? `于 ${lastScannedAt} 计算` : '全市场多因子机会'}
                  </span>
                </div>
              </div>

              {/* Mobile Quick Action Buttons: 策略调参 + 全息矩阵 + 刷新 */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMobileFactorSheetOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-black border border-blue-200 active:bg-blue-100 transition cursor-pointer shadow-2xs"
                  title="打开多模态雷达因子权重与策略配置抽屉"
                >
                  <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                  <span>策略调参</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenRsiRadar}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200/80 active:bg-indigo-100 transition cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-indigo-600" />
                  <span>全息矩阵</span>
                </button>
                <button
                  type="button"
                  onClick={() => executeRadarScan()}
                  disabled={isLoading}
                  className="p-1.5 rounded-lg bg-slate-900 text-white active:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                  title="刷新扫描"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Mobile Search Input */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索标的代码/名称 (如 NVDA, AAPL)..."
                className="w-full pl-8 pr-7 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 15 Strategies Horizontal Scrolling Capsule Row */}
            <div className="space-y-1 pt-1.5 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-extrabold text-slate-700 flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-indigo-600" />
                  <span>策略模板 (15 套)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsPresetManagerOpen(true)}
                  className="text-indigo-600 font-bold active:text-indigo-800 cursor-pointer text-[10.5px]"
                >
                  模板中心 ›
                </button>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none touch-pan-x">
                {presetsList.map(p => {
                  const isSel = activePreset?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                        isSel
                          ? 'bg-indigo-600 text-white shadow-xs font-black'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                      }`}
                    >
                      {p.nameZh || p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tactical Trigger Mode (买点档位) Capsule Row */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-extrabold text-slate-700 flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-600" />
                  <span>买点档位</span>
                </span>
                <span className="text-[9.5px] text-slate-400 font-mono">
                  {appliedFilters.radarMode}
                </span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none touch-pan-x">
                {isOversoldStrategy ? (
                  ([
                    { id: 'OVERSOLD_20', label: '≤20 极度超跌', activeClass: 'bg-purple-600 text-white' },
                    { id: 'OVERSOLD_30', label: '≤30 经典超卖', activeClass: 'bg-emerald-600 text-white' },
                    { id: 'OVERSOLD_40', label: '≤40 弱势吸筹', activeClass: 'bg-teal-600 text-white' }
                  ] as const).map(({ id, label, activeClass }) => {
                    const isSel = draftFilters.radarMode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          const updated: RadarFilterDraft = { ...draftFilters, radarMode: id };
                          const updatedRules = syncTacticalTriggerRule(currentRules, id, updated.rsiPeriod);
                          setDraftFilters(updated);
                          setCurrentRules(updatedRules);
                          executeRadarScan(updated, activePreset, updatedRules);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                          isSel
                            ? `${activeClass} shadow-xs font-black`
                            : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })
                ) : (
                  ([
                    { id: 'ALL', label: '策略自适应 (原生)', activeClass: 'bg-indigo-600 text-white' },
                    { id: 'OVERSOLD_40', label: '+ 叠加≤40吸筹', activeClass: 'bg-teal-600 text-white' }
                  ] as const).map(({ id, label, activeClass }) => {
                    const isSel = draftFilters.radarMode === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          const updated: RadarFilterDraft = { ...draftFilters, radarMode: id };
                          const updatedRules = syncTacticalTriggerRule(currentRules, id, updated.rsiPeriod);
                          setDraftFilters(updated);
                          setCurrentRules(updatedRules);
                          executeRadarScan(updated, activePreset, updatedRules);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                          isSel
                            ? `${activeClass} shadow-xs font-black`
                            : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Collapsible Advanced Filters Drawer Header */}
            <div className="pt-1.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMobileFilterExpanded(!isMobileFilterExpanded)}
                className="w-full flex items-center justify-between py-1 text-xs font-extrabold text-slate-700 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>高级过滤 ({draftFilters.timeframe} · {draftFilters.marketCapFilter} · {draftFilters.priceFilter})</span>
                </span>
                <span className="text-[11px] text-indigo-600 flex items-center gap-0.5">
                  <span>{isMobileFilterExpanded ? '收起' : '展开参数'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMobileFilterExpanded ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {isMobileFilterExpanded && (
                <div className="pt-2 pb-1 space-y-2.5 animate-in fade-in duration-150">
                  {/* Timeframe */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">K线周期:</span>
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                      {(['30m', '1h', '2h', '4h', '1D', '1W', '1M'] as const).map(tf => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => {
                            const updated: RadarFilterDraft = { ...draftFilters, timeframe: tf as Timeframe };
                            setDraftFilters(updated);
                            executeRadarScan(updated, activePreset, currentRules);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold shrink-0 cursor-pointer ${
                            draftFilters.timeframe === tf
                              ? 'bg-blue-600 text-white font-black shadow-xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Market Cap */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">公司市值:</span>
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                      {([
                        { id: '1B', label: '> $1B' },
                        { id: '5B', label: '> $5B' },
                        { id: '10B', label: '> $10B' },
                        { id: 'ALL', label: '不限' }
                      ] as const).map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            const updated: RadarFilterDraft = { ...draftFilters, marketCapFilter: id };
                            setDraftFilters(updated);
                            executeRadarScan(updated, activePreset, currentRules);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer ${
                            draftFilters.marketCapFilter === id
                              ? 'bg-emerald-600 text-white font-black shadow-xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500">股价区间:</span>
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                      {([
                        { id: 'ALL', label: '全部' },
                        { id: 'UNDER_10', label: '<$10' },
                        { id: '10_50', label: '$10-$50' },
                        { id: '50_100', label: '$50-$100' },
                        { id: 'OVER_100', label: '>$100' }
                      ] as const).map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            const updated: RadarFilterDraft = { ...draftFilters, priceFilter: id };
                            setDraftFilters(updated);
                            executeRadarScan(updated, activePreset, currentRules);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer ${
                            draftFilters.priceFilter === id
                              ? 'bg-indigo-600 text-white font-black shadow-xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sector selector trigger + Clear */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
                      className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg cursor-pointer"
                    >
                      {draftFilters.selectedSectors.length === 0
                        ? '全市场板块 (全部)'
                        : `已选 ${draftFilters.selectedSectors.length} 个行业板块`}
                    </button>
                    {draftFilters.selectedSectors.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSectors}
                        className="text-xs text-rose-500 font-bold cursor-pointer"
                      >
                        重置为全板块
                      </button>
                    )}
                  </div>

                  {/* Mobile Sector Checklist if dropdown toggled */}
                  {isSectorDropdownOpen && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 max-h-48 overflow-y-auto">
                      {AVAILABLE_SECTORS.map(sec => {
                        const isChecked = draftFilters.selectedSectors.includes(sec.id);
                        return (
                          <div
                            key={sec.id}
                            onClick={() => handleToggleSector(sec.id)}
                            className={`flex items-center justify-between p-1.5 px-2 rounded-lg text-xs border cursor-pointer ${
                              isChecked
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span>{sec.icon} {sec.labelZh}</span>
                            {isChecked && <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Dedicated Primary Radar Scan Action Button */}
          <div className="pt-0.5 pb-0.5">
            <button
              type="button"
              onClick={() => executeRadarScan(draftFilters)}
              disabled={isLoading}
              className={`w-full h-8.5 py-1 px-3 rounded-xl text-xs font-black tracking-wide shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                isLoading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                  : isFilterModified
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 active:from-emerald-700 active:to-indigo-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/50'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 active:from-indigo-700 active:to-blue-700 text-white shadow-indigo-500/20'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>正在执行全美股多因子雷达扫描...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  <span>立即执行全美股雷达扫描</span>
                  {isFilterModified ? (
                    <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-amber-950 text-[9px] font-mono font-bold rounded-full">
                      待扫描
                    </span>
                  ) : (
                    <span className="ml-1 text-[9.5px] text-white/80 font-mono">
                      ({activePreset?.nameZh || activePreset?.name || '短线优质买点'} · {draftFilters.timeframe})
                    </span>
                  )}
                </>
              )}
            </button>
          </div>

          {/* 2. Mobile Single-Column Card Stream */}
          {isLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-mono">
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-600" />
              <span className="text-slate-800 font-extrabold text-xs">{scanStatusText}</span>
              <span className="text-[10px] text-slate-400 font-normal">公网直连 Finnhub · Massive · Alpha Vantage</span>
            </div>
          ) : displayedStocks.length === 0 ? (
            <div className="py-12 px-4 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <p className="text-sm font-bold text-slate-800">当前筛选条件下暂无匹配标的</p>
              <button
                type="button"
                onClick={() => {
                  const relaxed: RadarFilterDraft = { ...draftFilters, radarMode: 'OVERSOLD_40', priceFilter: 'ALL' };
                  setDraftFilters(relaxed);
                  executeRadarScan(relaxed, activePreset, currentRules);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer"
              >
                一键放宽至 RSI≤40 弱势吸筹
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {displayedStocks.slice(0, visibleCount).map((stock, idx) => {
                const isPositive = stock.changePercent >= 0;
                const isWatchlisted = watchlistTickers.includes(stock.ticker);
                const rank = idx + 1;
                const analysis = getStockQuantAnalysis(stock, appliedFilters.radarMode, appliedFilters.timeframe);

                return (
                  <div
                    key={`${stock.ticker}-${idx}`}
                    onClick={() => onSelectStock(stock.ticker)}
                    className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs active:bg-slate-50 transition-all flex flex-col gap-1.5 relative cursor-pointer"
                  >
                    {/* Card Top: Rank + Logo + Ticker + Name + Quick Actions */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span
                          className={`text-[9px] font-black font-mono px-1 py-0.2 rounded-md shrink-0 ${
                            rank <= 3
                              ? 'bg-amber-500 text-white'
                              : rank <= 10
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{rank}
                        </span>
                        <StockLogo ticker={stock.ticker} name={stock.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-slate-900 text-[13px] tracking-tight truncate">
                              {stock.ticker}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {stock.exchange}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate block leading-tight font-medium">
                            {stock.name}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(stock.ticker);
                          }}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isWatchlisted
                              ? 'text-amber-500 bg-amber-50'
                              : 'text-slate-400 bg-slate-100 active:bg-slate-200'
                          }`}
                          title={isWatchlisted ? '已在自选' : '加入自选'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAlertModal(stock.ticker, stock.name, stock.rsi);
                          }}
                          className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50 active:bg-indigo-100 transition cursor-pointer"
                          title="设置预警"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price, Change & Wilder RSI */}
                    <div className="flex items-baseline justify-between pt-0.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono font-black text-slate-900 text-base tabular-nums">
                          ${stock.price.toFixed(2)}
                        </span>
                        <span
                          className={`text-[10.5px] font-mono font-black px-1.5 py-0.2 rounded-md ${
                            isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                          }`}
                        >
                          {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </div>

                      <span
                        className={`font-mono font-black px-1.5 py-0.2 rounded-md text-[9.5px] ${
                          stock.rsi <= 20
                            ? 'bg-purple-100 text-purple-900'
                            : stock.rsi <= 30
                            ? 'bg-emerald-100 text-emerald-800'
                            : stock.rsi >= 70
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        RSI({appliedFilters.rsiPeriod}) {stock.rsi.toFixed(1)}
                      </span>
                    </div>

                    {/* Multi-Factor Insight Block */}
                    <div className="bg-indigo-50/50 rounded-lg p-2 space-y-1 border border-indigo-100/70">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <div className="flex items-center gap-1 font-bold text-slate-800">
                          <span className={`w-1.5 h-1.5 rounded-full ${analysis.dotColor} shrink-0`} />
                          <span>{analysis.trend}</span>
                          <span className={`px-1 py-0.2 rounded text-[9px] font-black ${analysis.badgeStyle}`}>
                            {analysis.actionBadge}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-[9px] text-slate-400">评分</span>
                          <span className="font-black text-[11px] text-indigo-700">{analysis.factorScore}</span>
                          <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded ${analysis.factorRatingStyle}`}>
                            {analysis.factorRating}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-700 leading-snug font-medium">
                        <span className="inline-flex items-center gap-0.5 text-indigo-700 font-bold mr-1">
                          <Sparkles className="w-2.5 h-2.5 text-indigo-500 inline shrink-0" />
                          多因子分析:
                        </span>
                        <span className="text-slate-600">
                          {analysis.factorRecommendation}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[9.5px] font-mono pt-1 border-t border-slate-100 text-slate-400">
                      <span>市值 {formatCap(stock.marketCap || 0)} · {stock.sector || '全市场'}</span>
                      <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                        <span>详情</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Load More Button on Mobile */}
              {displayedStocks.length > 28 && (
                <div className="pt-2 pb-4 text-center">
                  {visibleCount === 28 ? (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(60)}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs cursor-pointer"
                    >
                      加载更多 ({displayedStocks.length - 28} 标的)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setVisibleCount(28);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      收起为前 28 标的
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Desktop View */
        <div className="flex flex-col gap-4">
          {/* Unified Compact Quant Radar Command Deck */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        {/* Row 1: Header - Title, Subtitle, Match Count, Search, Mode Switcher & Hologram Matrix */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Brand, Title & Meta */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Radar className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                多模态雷达量化终端 2.0
              </h1>
              <span className="text-[10px] font-mono text-slate-400 font-medium hidden sm:inline">
                Professional Quant Screener
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                匹配 {totalMatches} 标的 · 显示前 {Math.min(displayedStocks.length, 60)} 席
              </span>
              {lastScannedAt && (
                <span className="text-[10px] font-mono text-slate-400 hidden lg:inline">
                  (已于 {lastScannedAt} 计算)
                </span>
              )}
            </div>
          </div>

          {/* Right: Search & Hologram Matrix */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">

            {/* Live Search */}
            <div className="relative w-36 sm:w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索标的代码/名称..."
                className="w-full pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Hologram Matrix Button */}
            <button
              type="button"
              onClick={onOpenRsiRadar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200/70 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>全息矩阵</span>
              <ArrowRight className="w-3 h-3 text-indigo-400" />
            </button>
          </div>
        </div>

        {/* Row 1.5: Integrated Quant Strategy Console (5 Style Groups) */}
        <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Presets grouped dropdown */}
            <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 shrink-0">
                <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                <span>量化策略:</span>
              </span>
              <select
                value={activePreset?.id || ''}
                onChange={(e) => {
                  const found = presetsList.find(p => p.id === e.target.value);
                  if (found) handleSelectPreset(found);
                }}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs cursor-pointer max-w-xs sm:max-w-md truncate"
              >
                <option value="">-- 选择策略预设模板 (共 15 套) --</option>
                {PRESET_GROUPS.map(group => {
                  const groupPresets = presetsList.filter(p => group.presetIds.includes(p.id));
                  if (groupPresets.length === 0) return null;
                  return (
                    <optgroup key={group.id} label={`${group.icon} ${group.name}`}>
                      {groupPresets.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nameZh || p.name} {p.isSystem ? '' : '(自定义)'}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
                {presetsList.some(p => !p.isSystem && !PRESET_GROUPS.some(g => g.presetIds.includes(p.id))) && (
                  <optgroup label="⭐ 其他自定义策略">
                    {presetsList.filter(p => !p.isSystem && !PRESET_GROUPS.some(g => g.presetIds.includes(p.id))).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nameZh || p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {activePreset && (
                <span className="text-[11px] text-slate-500 font-medium truncate hidden xl:inline max-w-md bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/60" title={activePreset.description}>
                  📌 {activePreset.description || activePreset.nameZh}
                </span>
              )}
            </div>

            {/* Quick Action Tools */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPresetManagerOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                title="浏览与管理 15 套量化策略模板库"
              >
                <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
                <span>模板中心</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFilterBuilderOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 shadow-2xs transition-all cursor-pointer"
                title="可视化添加指标过滤条件 (支持 28 种量化因子分类)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ 自定义条件</span>
              </button>

              <button
                type="button"
                onClick={() => setIsWeightsDrawerOpen(!isWeightsDrawerOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 shadow-2xs transition-all cursor-pointer"
                title="调节多因子综合评分权重"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                <span>权重配置</span>
              </button>

              {marketOverview && (
                <div className="hidden 2xl:flex items-center gap-2 text-[11px] font-mono px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-600">
                  <span className={`w-1.5 h-1.5 rounded-full ${marketOverview.regime === 'RISK_ON' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>大盘: {marketOverview.regimeLabel || marketOverview.regime}</span>
                  {marketOverview.indices?.vix && (
                    <span className="text-slate-400">VIX {marketOverview.indices.vix.price}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Parameter Shelf with Sector Multi-select & Dedicated Launch Button */}
        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/70 space-y-2.5 text-xs">
          {/* Sub-row 1: K线周期 & 行业板块 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
            {/* K-Line Period */}
            <div className="lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-1.5 text-slate-700 shrink-0 w-20 font-bold">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>K线周期</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap flex-1">
                {([
                  { tf: '30m', label: '30m', desc: '30分钟K线 (适合日内短线交易)' },
                  { tf: '1h', label: '1H', desc: '1小时K线 (日内趋势跟踪)' },
                  { tf: '2h', label: '2H', desc: '2小时K线 (日内与隔日过渡)' },
                  { tf: '4h', label: '4H', desc: '4小时K线 (波段交易核心周期)' },
                  { tf: '1D', label: '1D (默认)', desc: '日K线 (最经典的主流分析周期)' },
                  { tf: '1W', label: '1W', desc: '周K线 (中期趋势与大级别支撑阻力)' },
                  { tf: '1M', label: '1M', desc: '月K线 (长期宏观趋势)' }
                ] as const).map(({ tf, label, desc }) => {
                  const isSelected = draftFilters.timeframe === tf;
                  return (
                    <button
                      key={tf}
                      type="button"
                      title={desc}
                      onClick={() => {
                        const updated: RadarFilterDraft = { ...draftFilters, timeframe: tf as Timeframe };
                        setDraftFilters(updated);
                        executeRadarScan(updated, activePreset, currentRules);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Industry Sector Filter */}
            <div className="lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2 relative" ref={sectorDropdownRef}>
              <div className="flex items-center gap-1.5 text-slate-700 shrink-0 w-20 font-bold">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>行业板块</span>
              </div>
              
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {/* Sector Multi-select Popover Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsSectorDropdownOpen(!isSectorDropdownOpen)}
                  className={`flex items-center justify-between gap-2 px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer w-full sm:w-auto min-w-[200px] ${
                    draftFilters.selectedSectors.length > 0
                      ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3 h-3 text-indigo-600 shrink-0" />
                    <span className="truncate">
                      {draftFilters.selectedSectors.length === 0
                        ? '全部行业 (全市场覆盖)'
                        : draftFilters.selectedSectors.length === 1
                        ? `已选: ${AVAILABLE_SECTORS.find(s => s.id === draftFilters.selectedSectors[0])?.labelZh || draftFilters.selectedSectors[0]}`
                        : `已选 ${draftFilters.selectedSectors.length} 个行业板块`}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isSectorDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {draftFilters.selectedSectors.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSectors}
                    className="text-[11px] text-slate-400 hover:text-slate-600 font-bold shrink-0 cursor-pointer underline decoration-dotted"
                  >
                    重置为全部
                  </button>
                )}
              </div>

              {/* Sector Dropdown Popover */}
              {isSectorDropdownOpen && (
                <div className="absolute top-full left-0 right-0 sm:left-20 sm:right-auto sm:w-[420px] mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Popover Header with Quick Controls */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>选择扫描板块 (支持多选)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearSectors}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        全部(不限)
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleSelectAllSectors}
                        className="text-[11px] text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
                      >
                        全选
                      </button>
                    </div>
                  </div>

                  {/* Sectors Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                    {AVAILABLE_SECTORS.map(sec => {
                      const isChecked = draftFilters.selectedSectors.includes(sec.id);
                      return (
                        <div
                          key={sec.id}
                          onClick={() => handleToggleSector(sec.id)}
                          className={`flex items-start gap-2 p-2 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 font-bold shadow-2xs'
                              : 'bg-slate-50/50 hover:bg-slate-100 border-slate-200/70 text-slate-700'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white border-slate-300'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="truncate">{sec.labelZh}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{sec.icon}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono truncate block mt-0.5">
                              {sec.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Popover Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {draftFilters.selectedSectors.length === 0
                        ? '未选行业，将扫描全市场所有标的'
                        : `已选择 ${draftFilters.selectedSectors.length} 个行业板块`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSectorDropdownOpen(false)}
                      className="px-3 py-1 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      完成
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-slate-200/60 w-full" />

          {/* Sub-row 2: RSI 买点阈值、RSI 周期、公司市值、股价区间 & 独立【雷达扫描启动】按钮 */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 items-center flex-1">
              {/* RSI Oversold Threshold / Tactical Trigger Mode (买点模式) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-1.5 text-slate-700 shrink-0 w-20 font-bold">
                  <Target className="w-3.5 h-3.5 text-emerald-600" />
                  <span>买点档位</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap flex-1">
                  {isOversoldStrategy ? (
                    ([
                      { id: 'OVERSOLD_20', label: '≤20 极度超跌', activeClass: 'bg-purple-600 text-white shadow-xs font-black', desc: 'RSI <= 20，极度超跌区，胜率高但标的少' },
                      { id: 'OVERSOLD_30', label: '≤30 经典超卖', activeClass: 'bg-emerald-600 text-white shadow-xs font-black', desc: 'RSI <= 30，标准超卖反弹区 (系统默认设置)' },
                      { id: 'OVERSOLD_40', label: '≤40 弱势吸筹', activeClass: 'bg-teal-600 text-white shadow-xs font-black', desc: 'RSI <= 40，弱势吸筹与回踩企稳区 (防空白，标的丰富·推荐)' }
                    ] as const).map(({ id, label, activeClass, desc }) => {
                      const isSelected = draftFilters.radarMode === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          title={desc}
                          onClick={() => {
                            const updated: RadarFilterDraft = { ...draftFilters, radarMode: id };
                            const updatedRules = syncTacticalTriggerRule(currentRules, id, updated.rsiPeriod);
                            setDraftFilters(updated);
                            setCurrentRules(updatedRules);
                            executeRadarScan(updated, activePreset, updatedRules);
                          }}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? activeClass
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })
                  ) : (
                    ([
                      { id: 'ALL', label: '策略自适应 (原生)', activeClass: 'bg-indigo-600 text-white shadow-xs font-black', desc: '执行策略原生设定的买点与过滤规则' },
                      { id: 'OVERSOLD_40', label: '+ 叠加≤40吸筹', activeClass: 'bg-teal-600 text-white shadow-xs font-black', desc: '在原生策略基础上，额外要求 RSI <= 40 低位企稳' }
                    ] as const).map(({ id, label, activeClass, desc }) => {
                      const isSelected = draftFilters.radarMode === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          title={desc}
                          onClick={() => {
                            const updated: RadarFilterDraft = { ...draftFilters, radarMode: id };
                            const updatedRules = syncTacticalTriggerRule(currentRules, id, updated.rsiPeriod);
                            setDraftFilters(updated);
                            setCurrentRules(updatedRules);
                            executeRadarScan(updated, activePreset, updatedRules);
                          }}
                          className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? activeClass
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RSI Period */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-1.5 text-slate-700 shrink-0 w-16 font-bold">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>RSI 参数</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap flex-1">
                  {([
                    { p: 6, label: 'RSI(6)', desc: '6个周期，反应极快，适合超短线捕捉日内极值' },
                    { p: 14, label: 'RSI(14)', desc: '14个周期，经典默认参数，平衡灵敏度与稳定性' },
                    { p: 24, label: 'RSI(24)', desc: '24个周期，反应较慢，适合过滤杂波看中线趋势' }
                  ] as const).map(({ p, label, desc }) => {
                    const isSelected = draftFilters.rsiPeriod === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        title={desc}
                        onClick={() => {
                          const updated: RadarFilterDraft = { ...draftFilters, rsiPeriod: p };
                          const updatedRules = syncTacticalTriggerRule(currentRules, updated.radarMode, p);
                          setDraftFilters(updated);
                          setCurrentRules(updatedRules);
                          executeRadarScan(updated, activePreset, updatedRules);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs font-black'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Market Cap */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-1.5 text-slate-700 shrink-0 w-16 font-bold">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>公司市值</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap flex-1">
                  {([
                    { id: '1B', label: '> $1B', desc: '市值大于10亿美元 (过滤微盘股，保证基本流动性)' },
                    { id: '5B', label: '> $5B', desc: '市值大于50亿美元 (中大型公司，机构参与度高)' },
                    { id: '10B', label: '> $10B', desc: '市值大于100亿美元 (大型蓝筹股，走势相对稳健)' },
                    { id: 'ALL', label: '不限', desc: '不限制公司市值 (包含所有盘子的股票)' }
                  ] as const).map(({ id, label, desc }) => {
                    const isSelected = draftFilters.marketCapFilter === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        title={desc}
                        onClick={() => {
                          const updated: RadarFilterDraft = { ...draftFilters, marketCapFilter: id };
                          setDraftFilters(updated);
                          executeRadarScan(updated, activePreset, currentRules);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs font-black'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-1.5 text-slate-700 shrink-0 w-16 font-bold">
                  <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                  <span>股价区间</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap flex-1">
                  {([
                    { id: 'ALL', label: '不限', desc: '无股价限制' },
                    { id: 'UNDER_10', label: '<$10', desc: '股价低于10美元 (低价股，波动率通常较大)' },
                    { id: '10_50', label: '$10-$50', desc: '股价介于10至50美元之间' },
                    { id: '50_100', label: '$50-$100', desc: '股价介于50至100美元之间' },
                    { id: 'OVER_100', label: '>$100', desc: '股价高于100美元 (通常为中大盘核心资产)' }
                  ] as const).map(({ id, label, desc }) => {
                    const isSelected = draftFilters.priceFilter === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        title={desc}
                        onClick={() => {
                          const updated: RadarFilterDraft = { ...draftFilters, priceFilter: id };
                          setDraftFilters(updated);
                          executeRadarScan(updated, activePreset, currentRules);
                        }}
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs font-black'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Dedicated Primary "雷达扫描启动" Action Button */}
            <div className="flex items-center justify-end shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-200/50">
              <button
                type="button"
                onClick={() => executeRadarScan(draftFilters)}
                disabled={isLoading}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-wide shadow-md transition-all cursor-pointer min-w-[150px] ${
                  isLoading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
                    : isFilterModified
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/50 scale-[1.02]'
                    : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-500/20'
                }`}
                title="选择配置好参数后，点击启动雷达多因子扫描"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>正在执行扫描...</span>
                  </>
                ) : (
                  <>
                    <Radar className="w-4 h-4 animate-pulse text-white" />
                    <span>雷达扫描启动</span>
                    {isFilterModified && (
                      <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 text-[10px] font-mono font-bold rounded-full">
                        待执行
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Active Rules & Conditions Summary Bar */}
        <div className="flex items-center justify-between gap-2 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 text-xs flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-extrabold text-slate-800 shrink-0">当前生效规则:</span>
            <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
              <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-indigo-200 text-indigo-900 font-bold">
                策略: {activePreset?.nameZh || activePreset?.name || '短线优质买点'}
              </span>
              <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-slate-200 font-mono">
                周期: {appliedFilters.timeframe} · RSI({appliedFilters.rsiPeriod})
              </span>
              <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-slate-200">
                买点: {
                  [
                    { id: 'OVERSOLD_30', label: '经典超卖 (≤30)' },
                    { id: 'OVERSOLD_20', label: '极度超跌 (≤20)' },
                    { id: 'OVERSOLD_40', label: '弱势吸筹 (≤40)' },
                    { id: 'ALL', label: '策略自适应 (原生)' }
                  ].find(m => m.id === appliedFilters.radarMode)?.label || appliedFilters.radarMode
                }
              </span>
              <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-slate-200 font-mono">
                市值: {
                  [
                    { id: '1B', label: '> $1B' },
                    { id: '5B', label: '> $5B' },
                    { id: '10B', label: '> $10B' },
                    { id: 'ALL', label: '不限' }
                  ].find(m => m.id === appliedFilters.marketCapFilter)?.label || appliedFilters.marketCapFilter
                }
              </span>
              <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-slate-200 font-mono">
                股价: {
                  [
                    { id: 'ALL', label: '不限' },
                    { id: 'UNDER_10', label: '<$10' },
                    { id: '10_50', label: '$10-$50' },
                    { id: '50_100', label: '$50-$100' },
                    { id: 'OVER_100', label: '>$100' }
                  ].find(m => m.id === appliedFilters.priceFilter)?.label || appliedFilters.priceFilter
                }
              </span>
              <span className="bg-white px-2 py-0.5 rounded shadow-2xs border border-slate-200">
                板块: {appliedFilters.selectedSectors.length === 0 ? '全部市场' : `已选 ${appliedFilters.selectedSectors.length} 个板块`}
              </span>
            </div>
          </div>

          {/* Custom Rules Badges (if user added conditions from Builder) */}
          {currentRules.children && currentRules.children.filter(c => c.type === 'leaf' && !c.id.startsWith('tactical_trigger_') && !c.id.startsWith('filter_')).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">自定义扩展:</span>
              {currentRules.children
                .filter(c => c.type === 'leaf' && !c.id.startsWith('tactical_trigger_') && !c.id.startsWith('filter_'))
                .map(node => (
                  <span
                    key={node.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100/70 border border-indigo-200 text-indigo-900 text-[11px] font-mono font-bold"
                  >
                    <span>{(node as ConditionNode).label || `${(node as ConditionNode).indicatorId} ${(node as ConditionNode).operator} ${(node as ConditionNode).value}`}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLeaf(node.id)}
                      className="text-indigo-400 hover:text-rose-600 cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              <button
                type="button"
                onClick={handleClearAllRules}
                className="text-[10px] text-rose-500 hover:text-rose-700 underline cursor-pointer ml-1"
              >
                清空扩展
              </button>
            </div>
          )}
        </div>

        {/* Row 4: 4×15 Grid Presentation Header & Navigation Controls */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2 text-slate-700 flex-wrap">
            <LayoutGrid className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-extrabold text-sm text-slate-900">
              {visibleCount === 28
                ? `4 × 7 极速机会池 (首屏展示 28 标的，共匹配 ${displayedStocks.length} 个)`
                : `4 × 15 机会池矩阵 (已展示全部 ${Math.min(displayedStocks.length, 60)} 个标的)`}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold">
              {visibleCount === 28 ? '4 列 × 7 行 · 首批 28 标的' : '4 列 × 15 行 · 完整 60 标的'}
            </span>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              {appliedFilters.selectedSectors.length > 0
                ? `[板块: ${appliedFilters.selectedSectors.join(', ')}]`
                : '[板块: 全行业]'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={scrollToTop}
              title="滑动至顶部"
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>回到顶部</span>
            </button>
          </div>
        </div>

        {/* 3. Cards Display (Initial 28 + Load More to 60) */}
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-2.5 text-slate-400 text-xs font-mono">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-slate-600 font-bold">
              正在按 [{draftFilters.timeframe}] · RSI({draftFilters.rsiPeriod}) 极速扫描雷达机会标的...
            </span>
            <span className="text-[11px] text-slate-400">
              执行多因子融合模型与形态识别计算
            </span>
          </div>
        ) : displayedStocks.length === 0 ? (
          <div className="py-14 px-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">当前筛选条件下暂无匹配标的</p>
            <p className="text-xs text-slate-400">
              可能是由于行业板块或市值/价格过滤条件过窄，请尝试将行业选为“全部”或将市值选为“不限”。
            </p>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const relaxed: RadarFilterDraft = { ...draftFilters, radarMode: 'OVERSOLD_40', priceFilter: 'ALL' };
                  const relaxedRules = syncTacticalTriggerRule(
                    activePreset ? activePreset.rules : { type: 'group', id: 'root', logicalOperator: 'AND', children: [] },
                    'OVERSOLD_40',
                    relaxed.rsiPeriod
                  );
                  setDraftFilters(relaxed);
                  setCurrentRules(relaxedRules);
                  executeRadarScan(relaxed, activePreset, relaxedRules);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>一键放宽至 RSI≤40 弱势吸筹</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const resetConfig: RadarFilterDraft = {
                    ...INITIAL_FILTER_STATE,
                    selectedSectors: []
                  };
                  setDraftFilters(resetConfig);
                  const resetRules = syncTacticalTriggerRule(
                    activePreset ? activePreset.rules : { type: 'group', id: 'root', logicalOperator: 'AND', children: [] },
                    resetConfig.radarMode,
                    resetConfig.rsiPeriod
                  );
                  setCurrentRules(resetRules);
                  executeRadarScan(resetConfig, activePreset, resetRules);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重置为默认条件</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-4 mb-6 overflow-hidden flex flex-col">
            {/* 4×15 Vertical Scrolling Grid Matrix with Institutional Rounded Framing */}
            <div
              ref={gridContainerRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 max-h-[calc(100vh-270px)] min-h-[440px] overflow-y-auto pr-1.5 scroll-smooth custom-scrollbar"
              style={{ scrollbarWidth: 'thin' }}
            >
              {displayedStocks.slice(0, visibleCount).map((stock, idx) => {
                const isPositive = stock.changePercent >= 0;
                const isWatchlisted = watchlistTickers.includes(stock.ticker);
                const rank = idx + 1;
                const analysis = getStockQuantAnalysis(stock, appliedFilters.radarMode, appliedFilters.timeframe);

                return (
                  <div
                    key={`${stock.ticker}-${idx}`}
                    onClick={() => onSelectStock(stock.ticker)}
                    className="bg-white hover:bg-slate-50/40 rounded-2xl p-4 border border-slate-200/80 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-3 group relative cursor-pointer"
                  >
                    {/* Row 1: Flat Header - Rank, Logo, Ticker, Exchange, Name & Quick Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Integrated Rank Tag */}
                        <span
                          className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md shrink-0 shadow-2xs ${
                            rank <= 3
                              ? 'bg-amber-500 text-white'
                              : rank <= 10
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          #{rank}
                        </span>

                        <StockLogo ticker={stock.ticker} name={stock.name} size="sm" />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm tracking-tight truncate">
                              {stock.ticker}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium">
                              {stock.exchange}
                            </span>
                            <StockSectorBadge ticker={stock.ticker} sector={stock.sector} size="xs" />
                          </div>
                          <span className="text-[11px] text-slate-500 truncate block leading-tight font-medium">
                            {stock.name}
                          </span>
                        </div>
                      </div>

                      {/* Integrated Quick Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWatchlist(stock.ticker);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isWatchlisted
                              ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                              : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title={isWatchlisted ? '已加入自选' : '加入自选'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-500' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAlertModal(stock.ticker, stock.name, stock.rsi);
                          }}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="设置量化预警"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Price, Change & Technical RSI Snapshot */}
                    <div className="flex items-baseline justify-between pt-0.5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono font-black text-slate-900 text-lg tracking-tight tabular-nums">
                          ${stock.price.toFixed(2)}
                        </span>
                        <span
                          className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg ${
                            isPositive
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-rose-700 bg-rose-50'
                          }`}
                        >
                          {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </div>

                      {/* Clean Flat RSI Pill */}
                      <div className="flex items-center gap-1 text-xs font-mono">
                        <span
                          className={`font-black px-2 py-0.5 rounded-lg text-[10px] ${
                            stock.rsi <= 20
                              ? 'bg-purple-100 text-purple-900'
                              : stock.rsi <= 30
                              ? 'bg-emerald-100 text-emerald-800'
                              : stock.rsi >= 70
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                          title={`Wilder RSI(${appliedFilters.rsiPeriod} · ${appliedFilters.timeframe}): ${stock.rsi.toFixed(1)}`}
                        >
                          RSI({appliedFilters.rsiPeriod}) {stock.rsi.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {/* Unified Multi-Factor & Trend Quantitative Block */}
                    <div className="bg-indigo-50/40 rounded-xl p-2.5 space-y-1.5 border border-indigo-100/60">
                      {/* Line 1: Trend & Action Badge + Multi-Factor Score & Rating */}
                      <div className="flex items-center justify-between gap-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full ${analysis.dotColor} shrink-0`} />
                          <span className="truncate">{analysis.trend}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${analysis.badgeStyle}`}>
                            {analysis.actionBadge}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono shrink-0">
                          <span className="text-[10px] text-slate-400 font-medium">评分</span>
                          <span className="font-black text-xs text-indigo-700">
                            {analysis.factorScore}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${analysis.factorRatingStyle}`}>
                            {analysis.factorRating}
                          </span>
                        </div>
                      </div>

                      {/* Line 2: Multi-Factor Model Analysis Insight */}
                      <div className="text-[11px] text-slate-700 leading-snug font-medium line-clamp-2" title={analysis.factorRecommendation}>
                        <span className="inline-flex items-center gap-1 text-indigo-700 font-bold mr-1 shrink-0">
                          <Sparkles className="w-3 h-3 text-indigo-500 inline shrink-0" />
                          多因子模型分析:
                        </span>
                        <span className="text-slate-600 font-normal">
                          {analysis.factorRecommendation}
                        </span>
                      </div>
                    </div>

                    {/* Row 5: Footer Bar */}
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-100 text-slate-400">
                      <div className="flex items-center gap-2">
                        {stock.marketCap && (
                          <span>市值 {formatCap(stock.marketCap)}</span>
                        )}
                        {stock.sector && (
                          <>
                            <span>·</span>
                            <span className="truncate text-slate-600 font-bold">{getSectorZh(stock.ticker, stock.sector)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button Section */}
            {displayedStocks.length > 28 && (
              <div className="pt-3 pb-1 flex items-center justify-center">
                {visibleCount === 28 ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(60)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer group"
                  >
                    <span className="tracking-wide">更多</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-mono">
                      显示剩下 {Math.min(displayedStocks.length - 28, 32)} 个机会标的
                    </span>
                    <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleCount(28);
                      scrollToTop();
                    }}
                    className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>收起 (保留前 28 个标的)</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )}

      <VisualFilterBuilderModal
        isOpen={isFilterBuilderOpen}
        onClose={() => setIsFilterBuilderOpen(false)}
        currentRules={currentRules}
        onAddCondition={handleAddCondition}
      />

      <PresetManagerModal
        isOpen={isPresetManagerOpen}
        onClose={() => setIsPresetManagerOpen(false)}
        currentRules={currentRules}
        currentWeights={currentWeights}
        onSelectPreset={handleSelectPreset}
      />

      {/* Google M3: Radar Factor Matrix Modal Bottom Sheet */}
      <RadarFactorMatrixSheet
        isOpen={isMobileFactorSheetOpen}
        onClose={() => setIsMobileFactorSheetOpen(false)}
        activePresetId={activePreset?.id || 'BALANCED_QUANT'}
        onSelectPreset={(presetId) => {
          const target = presetsList.find((p: RadarPreset) => p.id === presetId);
          if (target) {
            handleSelectPreset(target);
          }
        }}
        timeframe={draftFilters.timeframe}
        onTimeframeChange={(tf) => {
          const updated: RadarFilterDraft = { ...draftFilters, timeframe: tf };
          setDraftFilters(updated);
        }}
        marketCapFilter={draftFilters.marketCapFilter}
        onMarketCapFilterChange={(cap) => {
          const updated: RadarFilterDraft = { ...draftFilters, marketCapFilter: cap };
          setDraftFilters(updated);
        }}
        onApplyAndScan={async (presetId, weights) => {
          const targetPreset = presetsList.find((p: RadarPreset) => p.id === presetId) || activePreset;
          const updatedWeights = {
            oversold: weights.oversoldWeight / 100,
            rsAlpha: weights.rsAlphaWeight / 100,
            maAlignment: weights.maAlignmentWeight / 100,
            whaleInflow: weights.whaleInflowWeight / 100,
            patternBreakout: weights.patternBreakoutWeight / 100,
            atrRisk: weights.atrRiskWeight / 100,
            volumeSurge: weights.volumeSurgeWeight / 100
          };
          setCurrentWeights(prev => ({ ...prev, ...updatedWeights }));
          await executeRadarScan(draftFilters, targetPreset, currentRules);
        }}
        totalScanCount={scannedUniverseCount}
      />

      {/* Google M3: Extended FAB for Thumb Zone Ergonomics (移动端雷达常驻调参入口) */}
      {isMobile && (
        <M3ExtendedFAB
          icon={<SlidersHorizontal className="w-5 h-5 stroke-[2.5]" />}
          label="雷达策略调参"
          onClick={() => setIsMobileFactorSheetOpen(true)}
          badge="7因子"
          color="indigo"
        />
      )}
    </div>
  );
}
