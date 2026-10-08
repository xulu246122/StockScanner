import { IndicatorCategory, Timeframe, ConditionOperator } from '../types.ts';

// ============================================================================
// 1. INDICATOR PARAMETER SCHEMA & DEFINITION
// ============================================================================

export interface IndicatorParamDef {
  id: string;
  name: string;
  type: 'number' | 'select' | 'boolean';
  default: number | string | boolean;
  currentValue?: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  unit?: string;
  description: string;
}

export interface DetailedIndicatorDefinition {
  id: string;
  name: string;
  shortName: string;
  category: IndicatorCategory;
  categoryLabel: string;
  author: string;
  origin: string;
  mathFormula: string;
  calculationSteps: string[];
  description: string;
  usageGuide: string;
  applicableScenarios: string[];
  riskWarnings: string[];
  parameters: IndicatorParamDef[];
  supportedTimeframes: Timeframe[];
  operators: ConditionOperator[];
  unit?: string;
  sourceReference: string;
}

// ============================================================================
// 2. CORE 7 TECHNICAL INDICATORS REGISTRY (RSI, MACD, EMA, SMA, ATR, BOLL, ADX)
// ============================================================================

export const CORE_INDICATORS: DetailedIndicatorDefinition[] = [
  // 1. RSI (Relative Strength Index)
  {
    id: 'rsi',
    name: 'Relative Strength Index (Wilder RSI)',
    shortName: 'RSI',
    category: 'momentum',
    categoryLabel: '动量摆动指标',
    author: 'J. Welles Wilder Jr.',
    origin: 'New Concepts in Technical Trading Systems (1978)',
    mathFormula: 'RSI = 100 - [100 / (1 + RS)], RS = WilderAvg(Gain, N) / WilderAvg(Loss, N)',
    calculationSteps: [
      '1. 计算价格周期变动量：ΔClose = Close(t) - Close(t-1)',
      '2. 分离上涨增益 (Gain = max(ΔClose, 0)) 与下跌损失 (Loss = max(-ΔClose, 0))',
      '3. 计算首期平滑平均：First_AvgGain = Sum(Gain, N) / N; First_AvgLoss = Sum(Loss, N) / N',
      '4. 运用 Wilder 平滑滤波：AvgGain(t) = (AvgGain(t-1) * (N-1) + Gain(t)) / N',
      '5. 计算相对强度 RS 并归一化映射至 [0, 100] 区间。'
    ],
    description: '衡量价格内部涨跌动能速率与变动幅度的摆动指标，用于精准识别极度超买、超卖及动能背离状态。',
    usageGuide: '30 以下为极度超卖区（寻找均值回归买点），70 以上为超买区（多头警惕拉升乏力）；50 中轴为牛熊动量分水岭。',
    applicableScenarios: [
      '震荡箱体高抛低吸（寻找 RSI < 30 超卖金叉）',
      '上升趋势中的次回踩企稳（RSI 回踩 45-50 中轴获支撑）',
      '顶底背离狙击（价格创新高而 RSI 峰值逐波走低预示见顶）'
    ],
    riskWarnings: [
      '在极度强劲的单边大牛市主升浪中，RSI 可能在 80 以上出现长期高位钝化，若过早盲目做空会导致巨大亏损。',
      '突发基本面恶化时，超卖容易进一步恶化为崩跌，需配合硬性价格止损。'
    ],
    parameters: [
      {
        id: 'period',
        name: '计算周期 (Period N)',
        type: 'number',
        default: 14,
        min: 2,
        max: 50,
        step: 1,
        unit: '周期',
        description: '经典原著推荐 14 周期；超短线均值回归可设为 2 周期。'
      },
      {
        id: 'oversoldThreshold',
        name: '超卖阈值 (Oversold Line)',
        type: 'number',
        default: 30,
        min: 5,
        max: 45,
        step: 1,
        unit: 'pts',
        description: '低于该数值触发超卖警报（保守交易者可设为 20）。'
      },
      {
        id: 'overboughtThreshold',
        name: '超买阈值 (Overbought Line)',
        type: 'number',
        default: 70,
        min: 55,
        max: 95,
        step: 1,
        unit: 'pts',
        description: '高于该数值触发超买警报（保守交易者可设为 80）。'
      }
    ],
    supportedTimeframes: ['10m', '30m', '1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'BETWEEN'],
    unit: 'pts',
    sourceReference: 'Wilder, J. Welles. New Concepts in Technical Trading Systems. Trend Research, 1978.'
  },

  // 2. MACD (Moving Average Convergence Divergence)
  {
    id: 'macd',
    name: 'Moving Average Convergence Divergence',
    shortName: 'MACD',
    category: 'momentum',
    categoryLabel: '趋势动能指标',
    author: 'Gerald Appel',
    origin: 'Systems and Forecasts (1979)',
    mathFormula: 'DIF = EMA(Fast) - EMA(Slow); DEA = EMA(DIF, Signal); Histogram = (DIF - DEA) * 2',
    calculationSteps: [
      '1. 计算快速指数移动平均线 EMA(Close, Fast)',
      '2. 计算慢速指数移动平均线 EMA(Close, Slow)',
      '3. 计算离差值 DIF (快线) = EMA(Fast) - EMA(Slow)',
      '4. 对 DIF 进行 Signal 周期的指数平滑得到讯号线 DEA (慢线)',
      '5. 计算柱状动能图 Histogram = (DIF - DEA) * 2。'
    ],
    description: '通过两条不同速度的指数平滑均线的聚合与离散，研判市场趋势方向并度量多空加速度。',
    usageGuide: '零轴上方为多头主导区；DIF 向上突破 DEA 形成金叉为买入信号；柱状图由负转正表示动能向上加速。',
    applicableScenarios: [
      '零轴上多头回踩二次金叉（高动量主升浪狙击）',
      '柱状图柱峰连续收窄（动能衰竭减仓）',
      '价格新高而 MACD 峰值走低的顶背离风险警示'
    ],
    riskWarnings: [
      '在无序窄幅震荡市中，快慢线频繁交叉会产生大量来回打脸的假金叉/死叉。',
      '零轴下方的弱势金叉仅为反弹，不宜作为重仓追涨依据。'
    ],
    parameters: [
      {
        id: 'fastPeriod',
        name: '快线周期 (Fast EMA)',
        type: 'number',
        default: 12,
        min: 5,
        max: 30,
        step: 1,
        unit: '周期',
        description: '短期指数均线敏感度，标准为 12。'
      },
      {
        id: 'slowPeriod',
        name: '慢速周期 (Slow EMA)',
        type: 'number',
        default: 26,
        min: 15,
        max: 60,
        step: 1,
        unit: '周期',
        description: '基线指数均线周期，标准为 26。'
      },
      {
        id: 'signalPeriod',
        name: '平滑讯号周期 (Signal DEA)',
        type: 'number',
        default: 9,
        min: 3,
        max: 20,
        step: 1,
        unit: '周期',
        description: 'DIF 差离值的平滑期数，标准为 9。'
      }
    ],
    supportedTimeframes: ['30m', '1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'SLOPE_UP', 'SLOPE_DOWN'],
    unit: 'pts',
    sourceReference: 'Appel, Gerald. Technical Analysis: Power Tools for Active Investors. FT Press, 2005.'
  },

  // 3. EMA (Exponential Moving Average)
  {
    id: 'ema',
    name: 'Exponential Moving Average',
    shortName: 'EMA',
    category: 'moving_averages',
    categoryLabel: '均线与趋势',
    author: 'Charles C. Holt & Peter Winters',
    origin: 'Exponential Smoothing and Forecasting (1957)',
    mathFormula: 'EMA(t) = [Close(t) * Multiplier] + [EMA(t-1) * (1 - Multiplier)], Multiplier = 2 / (N + 1)',
    calculationSteps: [
      '1. 计算平滑加权因子 Multiplier = 2 / (N + 1)',
      '2. 第 1 周期初始值为前 N 个周期的简单平均 SMA',
      '3. 后续周期递推加权：赋予最新收盘价更高的权重，随时间推移指数级递减历史权重。'
    ],
    description: '指数加权移动平均线，相比普通 SMA 响应速度更快，能更敏锐地捕捉趋势突变与动量拐点。',
    usageGuide: '短期 EMA（如 9/21）向上金叉中长期 EMA 确立加速上涨；回踩未跌破关键 EMA 为强趋势顺势加仓点。',
    applicableScenarios: [
      '双 EMA 交叉系统（9 EMA 穿越 21 EMA）',
      '强庄主升浪动态移动止损跟踪（以 10 EMA 或 20 EMA 护航）',
      '多头排列加速阶段判定'
    ],
    riskWarnings: [
      '对价格短期假突破过于敏感，在震荡市中比 SMA 产生更多毛刺信号。'
    ],
    parameters: [
      {
        id: 'period',
        name: 'EMA 均线周期 (Period)',
        type: 'number',
        default: 20,
        min: 3,
        max: 200,
        step: 1,
        unit: '周期',
        description: '常用参数有 9 (超短线), 20 (短线生命线), 50 (中线), 200 (牛熊分界)。'
      }
    ],
    supportedTimeframes: ['10m', '30m', '1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'PERCENT_ABOVE', 'PERCENT_BELOW'],
    unit: 'pts',
    sourceReference: 'Holt, Charles C. "Forecasting seasonals and trends by exponentially weighted moving averages." (1957).'
  },

  // 4. SMA (Simple Moving Average)
  {
    id: 'sma',
    name: 'Simple Moving Average',
    shortName: 'SMA',
    category: 'moving_averages',
    categoryLabel: '均线与趋势',
    author: 'Classical Quantitative Analysis',
    origin: 'Standard Statistical Time Series Moving Windows',
    mathFormula: 'SMA(t) = [Close(t) + Close(t-1) + ... + Close(t-N+1)] / N',
    calculationSteps: [
      '1. 选取指定 N 个历史时间窗口的收盘价序列',
      '2. 对所有 N 个收盘价求算术和',
      '3. 除以 N 得到当期的算术平均值，滑动窗口逐周期推进。'
    ],
    description: '所有技术分析中最基础的基石指标，平滑滤除价格短期噪音，呈现市场中期与长期的真实筹码成本重心。',
    usageGuide: '200 SMA 为全市场机构公认的牛熊分水岭；股价站上 50 SMA 且 50 穿越 200 SMA 构成黄金交叉。',
    applicableScenarios: [
      '米奈尔维尼 SEPA 趋势模板（Price > 50 SMA > 150 SMA > 200 SMA）',
      '中长线大波段底部突破确认',
      '机构大单建仓支撑位测试'
    ],
    riskWarnings: [
      '具有明显的滞后性（Lagging），在拐点初期无法第一时间发出离场预警。'
    ],
    parameters: [
      {
        id: 'period',
        name: 'SMA 周期 (Lookback)',
        type: 'number',
        default: 50,
        min: 5,
        max: 250,
        step: 5,
        unit: '周期',
        description: '机构核心关注均线：20 (月线), 50 (季线), 200 (年线)。'
      }
    ],
    supportedTimeframes: ['1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'PERCENT_ABOVE', 'PERCENT_BELOW'],
    unit: 'pts',
    sourceReference: 'Murphy, John J. Technical Analysis of the Financial Markets. New York Institute of Finance, 1999.'
  },

  // 5. ATR (Average True Range)
  {
    id: 'atr',
    name: 'Average True Range (Wilder ATR)',
    shortName: 'ATR',
    category: 'volatility',
    categoryLabel: '波动率指标',
    author: 'J. Welles Wilder Jr.',
    origin: 'New Concepts in Technical Trading Systems (1978)',
    mathFormula: 'TR = max(High - Low, |High - Close_prev|, |Low - Close_prev|); ATR = WilderAvg(TR, N)',
    calculationSteps: [
      '1. 计算当日最高价与最低价之差：Range1 = High - Low',
      '2. 计算当日最高价与前一日收盘价之差绝对值：Range2 = |High - Close_prev|',
      '3. 计算当日最低价与前一日收盘价之差绝对值：Range3 = |Low - Close_prev|',
      '4. 真实波幅 TR = max(Range1, Range2, Range3)（有效计入跳空缺口）',
      '5. 对 TR 序列执行 Wilder N 周期平滑求得真实平均波幅 ATR。'
    ],
    description: '量化衡量市场无方向纯波动率的黄金标准，被海龟交易法则、专业对冲基金作为计算头寸大小与动态止损线的基础。',
    usageGuide: '海龟法则以 2 * ATR 设置硬性防守止损；ATR 突发翻倍飙升预示波动率扩张与突破大行情来临。',
    applicableScenarios: [
      '科学量化仓位管理（以 1% 账户资金 / (2*ATR) 计算股数）',
      '吊灯止损法（Chandelier Exit = 最高价 - 3*ATR）',
      '波动率收缩与爆发筛选'
    ],
    riskWarnings: [
      'ATR 只反映波动剧烈程度，不提供任何上涨或下跌的方向预测。'
    ],
    parameters: [
      {
        id: 'period',
        name: 'ATR 平滑周期',
        type: 'number',
        default: 14,
        min: 3,
        max: 50,
        step: 1,
        unit: '周期',
        description: '标准参数为 14；超短线日内波动可用 7。'
      },
      {
        id: 'multiplier',
        name: '止损乘数 (ATR Multiplier)',
        type: 'number',
        default: 2.0,
        min: 1.0,
        max: 4.0,
        step: 0.1,
        unit: 'x',
        description: '海龟法则标准风险单元系数为 2.0x。'
      }
    ],
    supportedTimeframes: ['30m', '1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'BETWEEN'],
    unit: 'pts',
    sourceReference: 'Wilder, J. Welles. New Concepts in Technical Trading Systems. Trend Research, 1978.'
  },

  // 6. BOLL (Bollinger Bands)
  {
    id: 'boll',
    name: 'Bollinger Bands (Volatility Envelope)',
    shortName: 'BOLL',
    category: 'volatility',
    categoryLabel: '通道与波动率',
    author: 'John Bollinger',
    origin: 'Bollinger on Bollinger Bands (2001)',
    mathFormula: 'Middle = SMA(Close, N); Upper = Middle + (K * StdDev); Lower = Middle - (K * StdDev); BandWidth = (Upper - Lower) / Middle',
    calculationSteps: [
      '1. 计算基准中轨：Middle Band = SMA(Close, N)（默认 20 周期）',
      '2. 计算收盘价标准差：StdDev = sqrt(Sum((Close - Middle)^2) / N)',
      '3. 计算上轨：Upper Band = Middle + (K * StdDev)（默认 K = 2.0）',
      '4. 计算下轨：Lower Band = Middle - (K * StdDev)',
      '5. 计算相对通道宽度 BandWidth 百分比以监测挤压（Squeeze）。'
    ],
    description: '结合均线与统计学标准差构建的自适应动态波动通道，能够随市场波动率扩张而变宽、随沉寂而收紧。',
    usageGuide: '带宽压缩至历史极低位（Squeeze）预示大级别单边突破在即；突破上轨伴随放量为强动能顺势追涨信号。',
    applicableScenarios: [
      '布林带极限收口挤压突破（Bollinger Squeeze Breakout）',
      '震荡市触碰下轨超卖反弹做多',
      '走在通道外沿（Walking the Bands）的超级主升浪跟踪'
    ],
    riskWarnings: [
      '在极端单边单边大跌中，股价可能连续多日贴着下轨持续暴跌，不可仅因触及下轨就盲目抄底。'
    ],
    parameters: [
      {
        id: 'period',
        name: '基准均线周期 (Period N)',
        type: 'number',
        default: 20,
        min: 5,
        max: 50,
        step: 1,
        unit: '周期',
        description: '约翰·布林格标准推荐 20 周期。'
      },
      {
        id: 'stdDevMultiplier',
        name: '标准差倍数 (K Multiplier)',
        type: 'number',
        default: 2.0,
        min: 1.0,
        max: 3.5,
        step: 0.1,
        unit: 'σ',
        description: '涵盖正态分布约 95.4% 的价格包络，标准为 2.0。'
      }
    ],
    supportedTimeframes: ['10m', '30m', '1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN', 'BETWEEN'],
    unit: 'pts',
    sourceReference: 'Bollinger, John. Bollinger on Bollinger Bands. McGraw-Hill, 2001.'
  },

  // 7. ADX (Average Directional Index)
  {
    id: 'adx',
    name: 'Average Directional Movement Index',
    shortName: 'ADX',
    category: 'trend',
    categoryLabel: '趋势强度指标',
    author: 'J. Welles Wilder Jr.',
    origin: 'New Concepts in Technical Trading Systems (1978)',
    mathFormula: '+DI = Smooth(+DM) / ATR; -DI = Smooth(-DM) / ATR; DX = |(+DI - -DI) / (+DI + -DI)| * 100; ADX = WilderAvg(DX, N)',
    calculationSteps: [
      '1. 计算方向变动量：+DM = max(High(t) - High(t-1), 0); -DM = max(Low(t-1) - Low(t), 0)',
      '2. 标准化正负趋向指标：+DI(14) 与 -DI(14)',
      '3. 计算方向指数 DX = 100 * |(+DI - -DI)| / (+DI + -DI)',
      '4. 对 DX 进行 14 周期 Wilder 平滑求得趋势强度 ADX。'
    ],
    description: '独立度量趋势强弱程度（而非趋势方向）的核心指标。无论市场是暴涨还是暴跌，只要单边趋势强劲，ADX 就会持续上升。',
    usageGuide: 'ADX > 25 确认单边趋势确立（可执行趋势跟踪策略）；ADX < 20 表示市场进入低波动无序震荡（应切换为网格/均值回归或观望）。',
    applicableScenarios: [
      '趋势交易过滤器（过滤 ADX < 20 的垃圾震荡标的）',
      '+DI 向上穿越 -DI 且 ADX 突破 25（极强顺势起飞信号）',
      'ADX 超过 50 高位掉头向下（提示主升浪进入尾声分批止盈）'
    ],
    riskWarnings: [
      'ADX 本身不区分上涨或下跌，必须结合 +DI/-DI 或均线系统确认方向。',
      '平滑计算具有滞后性，在震荡市初期容易产生假读数。'
    ],
    parameters: [
      {
        id: 'adxPeriod',
        name: 'ADX 强度周期',
        type: 'number',
        default: 14,
        min: 5,
        max: 30,
        step: 1,
        unit: '周期',
        description: '标准参数为 14。'
      },
      {
        id: 'trendThreshold',
        name: '强趋势门槛 (Trend Threshold)',
        type: 'number',
        default: 25,
        min: 15,
        max: 40,
        step: 1,
        unit: 'pts',
        description: '高于该数值确认强趋势建立（通常为 20-25）。'
      }
    ],
    supportedTimeframes: ['1h', '4h', '1D', '1W'],
    operators: ['GT', 'LT', 'CROSS_UP', 'CROSS_DOWN'],
    unit: 'pts',
    sourceReference: 'Wilder, J. Welles. New Concepts in Technical Trading Systems. Trend Research, 1978.'
  }
];

// ============================================================================
// 3. INDICATOR ENGINE SERVICE IMPLEMENTATION
// ============================================================================

class IndicatorEngineImpl {
  private indicatorsMap: Map<string, DetailedIndicatorDefinition> = new Map();
  private userCustomParams: Map<string, Record<string, any>> = new Map();

  constructor() {
    CORE_INDICATORS.forEach(ind => {
      this.indicatorsMap.set(ind.id, JSON.parse(JSON.stringify(ind)));
    });
    this.loadPersistedParams();
  }

  private loadPersistedParams() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('quant_user_indicator_params');
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.keys(parsed).forEach(k => {
            this.userCustomParams.set(k, parsed[k]);
          });
        }
      }
    } catch (e) {
      console.warn('IndicatorEngine: Could not read custom params from localStorage', e);
    }
  }

  private persistParams() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const obj: Record<string, any> = {};
        this.userCustomParams.forEach((v, k) => {
          obj[k] = v;
        });
        localStorage.setItem('quant_user_indicator_params', JSON.stringify(obj));
      }
    } catch (e) {
      console.warn('IndicatorEngine: Could not persist custom params', e);
    }
  }

  public getAllIndicators(): DetailedIndicatorDefinition[] {
    return Array.from(this.indicatorsMap.values()).map(ind => {
      const custom = this.userCustomParams.get(ind.id);
      if (custom) {
        const cloned: DetailedIndicatorDefinition = JSON.parse(JSON.stringify(ind));
        cloned.parameters = cloned.parameters.map(p => ({
          ...p,
          currentValue: custom[p.id] !== undefined ? custom[p.id] : p.default
        }));
        return cloned;
      }
      return {
        ...ind,
        parameters: ind.parameters.map(p => ({ ...p, currentValue: p.default }))
      };
    });
  }

  public getIndicator(id: string): DetailedIndicatorDefinition | null {
    const found = this.indicatorsMap.get(id);
    if (!found) return null;
    const custom = this.userCustomParams.get(id);
    const cloned: DetailedIndicatorDefinition = JSON.parse(JSON.stringify(found));
    cloned.parameters = cloned.parameters.map(p => ({
      ...p,
      currentValue: custom && custom[p.id] !== undefined ? custom[p.id] : p.default
    }));
    return cloned;
  }

  public modifyIndicatorParameters(id: string, newParams: Record<string, any>): DetailedIndicatorDefinition | null {
    const found = this.indicatorsMap.get(id);
    if (!found) return null;

    // Validate parameters against defined min/max ranges
    const validated: Record<string, any> = {};
    found.parameters.forEach(p => {
      if (newParams[p.id] !== undefined) {
        let val = newParams[p.id];
        if (typeof val === 'number') {
          if (p.min !== undefined) val = Math.max(p.min, val);
          if (p.max !== undefined) val = Math.min(p.max, val);
        }
        validated[p.id] = val;
      } else {
        validated[p.id] = p.default;
      }
    });

    this.userCustomParams.set(id, validated);
    this.persistParams();

    return this.getIndicator(id);
  }

  public resetIndicatorParameters(id: string): DetailedIndicatorDefinition | null {
    if (this.userCustomParams.has(id)) {
      this.userCustomParams.delete(id);
      this.persistParams();
    }
    return this.getIndicator(id);
  }
}

export const indicatorEngine = new IndicatorEngineImpl();
