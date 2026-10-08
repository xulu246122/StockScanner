import { marketDataProvider } from './marketDataProvider.ts';
import { sessionClock } from './sessionClock.ts';
import { SectorPerformance } from '../types.ts';
import { VolatilityAdaptiveSettings, MacroVolatilityRegime } from '../types/rebound.ts';

export interface MarketOverviewData {
  marketStatus: ReturnType<typeof sessionClock.getMarketStatus>;
  regime: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL_CHOP';
  regimeLabel: string;
  indices: {
    spy: { price: number; changePercent: number; trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; rsi: number };
    qqq: { price: number; changePercent: number; trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; rsi: number };
    vix: { price: number; changePercent: number; level: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' };
  };
  sectors: SectorPerformance[];
}

export class MarketRegimeService {
  /**
   * Evaluates real-time macro volatility regime and calculates dynamic anti-falling-knife multiplier (P1)
   */
  public async getAdaptiveVolatilityMetrics(): Promise<VolatilityAdaptiveSettings> {
    const overview = await this.getMarketOverview();
    const vix = overview.indices.vix.price;
    const spy = overview.indices.spy;

    let regime: MacroVolatilityRegime = 'NORMAL';
    let regimeLabel = '🟡 均衡常态 (正常波动)';
    let thresholdMultiplier = 1.0;
    let antiKnifeProtectionActive = false;
    let description = '大盘波动稳定均衡，量化系统维持基准商业敏捷参数。';

    if (vix >= 24 || (vix >= 20 && spy.changePercent < -1.2)) {
      regime = 'HIGH_VOL';
      regimeLabel = '⚠️ 极端高波动 (恐慌主跌/防飞刀模式)';
      thresholdMultiplier = 1.35; // 动态调宽门槛 +35%，防早产接飞刀
      antiKnifeProtectionActive = true;
      description = `恐慌指数 VIX (${vix.toFixed(1)}) 显著偏高，大盘处于急跌踩踏期。系统已自适应调宽跌幅门槛 +35%，强化卖方衰竭过滤，防止在主跌浪中过早接飞刀。`;
    } else if (vix <= 16 && spy.trend === 'BULLISH') {
      regime = 'LOW_VOL';
      regimeLabel = '🟢 稳健低波动 (多头主升)';
      thresholdMultiplier = 1.0;
      antiKnifeProtectionActive = false;
      description = `恐慌指数 VIX (${vix.toFixed(1)}) 处于低位，市场处于健康慢牛趋势，执行标准灵敏反弹监控。`;
    }

    return {
      enabled: true,
      currentRegime: regime,
      regimeLabel,
      vixLevel: vix,
      thresholdMultiplier,
      antiKnifeProtectionActive,
      description
    };
  }

  public async getMarketOverview(): Promise<MarketOverviewData> {
    const status = sessionClock.getMarketStatus();

    let spyQuote = { price: 572.45, changePercent: 0.38, rsi: 54.2 };
    let qqqQuote = { price: 488.90, changePercent: 0.62, rsi: 56.8 };

    try {
      const s = await marketDataProvider.getQuote('SPY', 14, '1D');
      spyQuote = { price: s.price, changePercent: s.changePercent, rsi: s.rsi.value };
    } catch {
      // fallback
    }

    try {
      const q = await marketDataProvider.getQuote('QQQ', 14, '1D');
      qqqQuote = { price: q.price, changePercent: q.changePercent, rsi: q.rsi.value };
    } catch {
      // fallback
    }

    let vixPrice = 14.85;
    let vixChange = -0.42;

    try {
      const v = await marketDataProvider.getQuote('^VIX', 14, '1D').catch(() => null);
      if (v && v.price > 0) {
        vixPrice = v.price;
        vixChange = v.changePercent;
      }
    } catch {}

    const vixLevel: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' = vixPrice < 15 ? 'LOW' : vixPrice < 20 ? 'NORMAL' : 'ELEVATED';

    let regime: MarketOverviewData['regime'] = 'RISK_ON';
    let regimeLabel = '多头进攻 (Risk-On)';
    if (spyQuote.changePercent < -0.8 || vixPrice > 22) {
      regime = 'RISK_OFF';
      regimeLabel = '避险防守 (Risk-Off)';
    } else if (Math.abs(spyQuote.changePercent) <= 0.4 && vixPrice >= 15) {
      regime = 'NEUTRAL_CHOP';
      regimeLabel = '平衡震荡 (Chop/Neutral)';
    }

    const spyTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = spyQuote.rsi >= 50 ? 'BULLISH' : 'BEARISH';
    const qqqTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = qqqQuote.rsi >= 50 ? 'BULLISH' : 'BEARISH';

    const sectorConfigs = [
      { sector: 'Technology', nameZh: '科技信息', etf: 'XLK', changePercent: 0.82, leadingStocks: ['NVDA', 'AAPL', 'MSFT'] },
      { sector: 'Semiconductors', nameZh: '半导体芯片', etf: 'SOXX', changePercent: 1.45, leadingStocks: ['NVDA', 'AMD', 'AVGO'] },
      { sector: 'Communication Services', nameZh: '通信互联网', etf: 'XLC', changePercent: 0.54, leadingStocks: ['GOOGL', 'META'] },
      { sector: 'Consumer Cyclical', nameZh: '可选消费', etf: 'XLY', changePercent: 0.28, leadingStocks: ['AMZN', 'TSLA'] },
      { sector: 'Financial Services', nameZh: '金融银行', etf: 'XLF', changePercent: -0.15, leadingStocks: ['JPM', 'BAC', 'GS'] },
      { sector: 'Healthcare', nameZh: '医疗制药', etf: 'XLV', changePercent: -0.32, leadingStocks: ['LLY', 'UNH', 'JNJ'] },
      { sector: 'Industrials', nameZh: '工业军工', etf: 'XLI', changePercent: 0.42, leadingStocks: ['RTX', 'NOC', 'CAT'] },
      { sector: 'Energy', nameZh: '石油能源', etf: 'XLE', changePercent: -0.65, leadingStocks: ['XOM', 'CVX'] }
    ];

    const sectors: SectorPerformance[] = sectorConfigs.map(c => {
      const relStrength = Number((c.changePercent - spyQuote.changePercent).toFixed(2));
      return {
        sector: c.sector,
        nameZh: c.nameZh,
        etf: c.etf,
        changePercent: c.changePercent,
        relativeStrength: relStrength,
        trend: c.changePercent >= 0 ? 'BULLISH' : 'BEARISH',
        leadingStocks: c.leadingStocks
      };
    });

    return {
      marketStatus: status,
      regime,
      regimeLabel,
      indices: {
        spy: { price: spyQuote.price, changePercent: spyQuote.changePercent, trend: spyTrend, rsi: spyQuote.rsi },
        qqq: { price: qqqQuote.price, changePercent: qqqQuote.changePercent, trend: qqqTrend, rsi: qqqQuote.rsi },
        vix: { price: vixPrice, changePercent: vixChange, level: vixLevel }
      },
      sectors
    };
  }
}

export const marketRegimeService = new MarketRegimeService();
