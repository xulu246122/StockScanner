export type ReboundModelType = 
  | 'CONNORS_RSI'
  | 'WYCKOFF_CLIMAX'
  | 'VWAP_ZSCORE'
  | 'BOLLINGER_STOCH'
  | 'CUSTOM';

export type ReboundLookbackWindow = '15m' | '30m' | '1h' | '2h' | '4h' | '1d';

export type MacroVolatilityRegime = 'LOW_VOL' | 'NORMAL' | 'HIGH_VOL';

export interface VolatilityAdaptiveSettings {
  enabled: boolean;                      // 宏观波动率自适应防飞刀模式总开关 (默认 true)
  currentRegime: MacroVolatilityRegime;  // 'LOW_VOL' | 'NORMAL' | 'HIGH_VOL'
  regimeLabel: string;                   // 状态中文说明
  vixLevel: number;                      // 恐慌指数参考值
  thresholdMultiplier: number;           // 动态跌幅门槛调宽倍数 (如 1.0x 或 1.35x)
  antiKnifeProtectionActive: boolean;    // 是否处于防飞刀模式
  description?: string;
}

export interface ModelParamConfig {
  enabled: boolean;                      // 该模型是否启动独立监控（默认 true）
  universe: 'SP500' | 'NDX100' | 'ALL' | 'WATCHLIST';
  lookbackWindow: ReboundLookbackWindow;  // 统计窗口期
  minDropPercent: number;                 // 跌幅门槛，如 2.0 代表跌幅 >= 2.0%
  maxDropPercent?: number;                // 最大跌幅限制，如 15.0%
  targetGainPercent: number;              // 目标止盈，如 1.5 代表 +1.5%
  stopLossPercent: number;                // 硬止损，如 1.0 代表 -1.0%
  adaptiveRegimeEnabled?: boolean;        // 该模型是否跟随大盘波动率自适应动态加宽门槛 (默认 true)
  exhaustionCriteria?: {
    rsiMax?: number;                      // 如 Connors RSI(2) <= 10
    minPinbarRatio?: number;              // 如 Wyckoff 下影线 >= 0.40
    requireVolumeExhaustion?: boolean;    // 如成交量收缩/释放
    requireVwapDeviation?: boolean;       // 如偏离 VWAP
    vwapDeviationPct?: number;            // 如负偏离 <= -1.8%
  };
}

export const COMMERCIAL_DEFAULT_MODELS_CONFIG: Record<ReboundModelType, ModelParamConfig> = {
  CONNORS_RSI: {
    enabled: true,
    universe: 'ALL',
    lookbackWindow: '1h',
    minDropPercent: 2.0,
    maxDropPercent: 12.0,
    targetGainPercent: 1.5,
    stopLossPercent: 1.0,
    exhaustionCriteria: {
      rsiMax: 10,
      requireVolumeExhaustion: false
    }
  },
  WYCKOFF_CLIMAX: {
    enabled: true,
    universe: 'ALL',
    lookbackWindow: '2h',
    minDropPercent: 2.5,
    maxDropPercent: 15.0,
    targetGainPercent: 1.8,
    stopLossPercent: 1.2,
    exhaustionCriteria: {
      minPinbarRatio: 0.40,
      requireVolumeExhaustion: true
    }
  },
  VWAP_ZSCORE: {
    enabled: true,
    universe: 'ALL',
    lookbackWindow: '1h',
    minDropPercent: 1.8,
    maxDropPercent: 10.0,
    targetGainPercent: 1.5,
    stopLossPercent: 1.0,
    exhaustionCriteria: {
      vwapDeviationPct: -1.8,
      requireVwapDeviation: true
    }
  },
  BOLLINGER_STOCH: {
    enabled: true,
    universe: 'ALL',
    lookbackWindow: '2h',
    minDropPercent: 2.0,
    maxDropPercent: 12.0,
    targetGainPercent: 1.6,
    stopLossPercent: 1.0,
    exhaustionCriteria: {
      rsiMax: 30
    }
  },
  CUSTOM: {
    enabled: true,
    universe: 'ALL',
    lookbackWindow: '1h',
    minDropPercent: 2.5,
    maxDropPercent: 15.0,
    targetGainPercent: 1.5,
    stopLossPercent: 1.0,
    exhaustionCriteria: {
      rsiMax: 35,
      minPinbarRatio: 0.35
    }
  }
};

export interface PlungeReboundScanParams {
  universe: 'SP500' | 'NDX100' | 'ALL' | 'WATCHLIST';
  modelType: ReboundModelType;
  lookbackWindow: ReboundLookbackWindow;
  minDropPercent: number; // e.g. 2.0 (meaning -2.0% drop)
  maxDropPercent?: number; // e.g. 10.0
  targetGainPercent: number; // e.g. 1.5 (+1.5% profit target)
  stopLossPercent: number; // e.g. 1.0 (-1.0% max risk stop)
  minMarketCap?: number;
  adaptiveRegimeEnabled?: boolean; // 是否启用大盘波动率自适应门槛 (默认 true)
  exhaustionCriteria?: {
    rsiMax?: number;
    minPinbarRatio?: number;
    requireVolumeExhaustion?: boolean;
    requireVwapDeviation?: boolean;
    vwapDeviationPct?: number;
  };
}

export interface PlungeReboundCandidate {
  ticker: string;
  name: string;
  sector: string;
  exchange: string;
  price: number;
  changePercent: number;
  dropPercent: number; // e.g. -3.45%
  dropDurationMinutes: number; // e.g. 45
  modelType: ReboundModelType;
  modelNameZh: string;
  exhaustionSignals: string[]; // e.g. ["Connors RSI(2)=8.4 极限超跌", "下影线 Pinbar 62%", "成交量收缩企稳"]
  entryPrice: number;
  targetPrice: number;
  targetGainPercent: number;
  stopLossPrice: number;
  stopLossPercent: number;
  riskRewardRatio: number;
  reboundScore: number; // 0-100 score
  volume: number;
  rvol: number;
  marketCap?: number;
  triggeredAt: string; // ISO string
  status: 'TRIGGERED' | 'REBOUNDING' | 'TARGET_HIT' | 'STOPPED';
  adaptiveAdjusted?: boolean; // 是否应用了大盘波动率加宽防飞刀自适应
  adaptiveNote?: string;      // 自适应说明
  obiAnalysis?: import('./trading.ts').OrderBookImbalanceAnalysis; // L2 深度买卖盘不平衡度与托盘分析
  factorRecommendation?: string;
}

export interface ReboundDaemonConfig {
  enabled: boolean; // 全局监控总开关（默认 true，若用户不修改配置，全局监控默认启动）
  intervalMinutes: number; // 1, 3, 5, 15 (default), 30, 60
  sessionMode: 'REGULAR_ONLY' | 'ALL_SESSIONS';
  alerts: {
    desktopToast: boolean;
    audioChime: boolean;
    inAppModal: boolean;
  };
  activeParams: PlungeReboundScanParams;
  modelsConfig: Record<ReboundModelType, ModelParamConfig>;
  adaptiveRegime?: VolatilityAdaptiveSettings;
  lastScannedAt?: string;
  lastCandidateCount?: number;
}

export interface ReboundModelInfo {
  type: ReboundModelType;
  nameZh: string;
  description: string;
  defaultTargetGain: number;
  defaultStopLoss: number;
  defaultMinDrop: number;
  defaultLookback: ReboundLookbackWindow;
  icon: string;
}
