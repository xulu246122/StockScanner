import { universeDb, InstrumentEntity, UniverseEntity } from '../db/universeDb.ts';
import { logger } from './logger.ts';

export interface UniverseCriteriaConfig {
  megaCapMin: number;
  largeCapMin: number;
  midCapMin: number;
  midCapMax: number;
  smallCapMin: number;
  smallCapMax: number;
  liquidMinPrice: number;
  liquidMinVolume20d: number;
  liquidMinDollarVolume20d: number;
  liquidMinMarketCap: number;
}

export const DEFAULT_UNIVERSE_CONFIG: UniverseCriteriaConfig = {
  megaCapMin: 200e9,
  largeCapMin: 10e9,
  midCapMin: 2e9,
  midCapMax: 10e9,
  smallCapMin: 300e6,
  smallCapMax: 2e9,
  liquidMinPrice: 5.0,
  liquidMinVolume20d: 1e6,
  liquidMinDollarVolume20d: 20e6,
  liquidMinMarketCap: 2e9
};

export const UNIVERSE_EXPECTED_COUNTS: Record<string, number> = {
  SP500: 503,
  NASDAQ100: 101,
  MEGA_CAP: 45,
  LARGE_CAP: 800,
  MID_CAP: 800,
  SMALL_CAP: 1500,
  US_LIQUID: 1200,
  NYSE_STOCKS: 2400,
  NASDAQ_STOCKS: 3500,
  ADR: 400,
  REIT: 200,
  SECTOR_TECH: 400,
  INDUSTRY_SEMIS: 65,
  ETF: 3000,
  WATCHLIST: 5,
  CUSTOM: 500
};

export class UniverseBuilder {
  private config: UniverseCriteriaConfig = { ...DEFAULT_UNIVERSE_CONFIG };

  updateConfig(updates: Partial<UniverseCriteriaConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): UniverseCriteriaConfig {
    return { ...this.config };
  }

  // Build and materialize all 16 target universes into SQLite
  async buildAllUniverses(userWatchlistTickers: string[] = ['NVDA', 'AAPL', 'TSLA', 'AMD', 'PLTR']): Promise<{
    universes: UniverseEntity[];
  }> {
    await universeDb.init();
    logger.info('UniverseBuilder', 'Building all 16 US Market Universes...');

    const allInstruments = universeDb.getAllInstruments({ activeOnly: true });

    // 1. S&P 500 Universe
    const spxConstituents = universeDb.getIndexConstituents('SPX').filter((c) => c.changeType !== 'REMOVE');
    const spxTickers = new Set(spxConstituents.map((c) => c.ticker));
    const sp500Members = allInstruments.filter((i) => !i.isIndex && spxTickers.has(i.ticker)).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_sp500',
      code: 'SP500',
      name: '标普 500 (S&P 500)',
      description: '美国标普500大盘核心成分股，不含OTC及指数本身',
      category: 'INDEX',
      memberIds: sp500Members
    });

    // 2. Nasdaq 100 Universe
    const ndxConstituents = universeDb.getIndexConstituents('NDX').filter((c) => c.changeType !== 'REMOVE');
    const ndxTickers = new Set(ndxConstituents.map((c) => c.ticker));
    const nasdaq100Members = allInstruments.filter((i) => !i.isIndex && ndxTickers.has(i.ticker)).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_nasdaq100',
      code: 'NASDAQ100',
      name: '纳斯达克 100 (Nasdaq 100)',
      description: '纳斯达克100科技龙头成分股',
      category: 'INDEX',
      memberIds: nasdaq100Members
    });

    // 3. Mega Cap Universe (marketCap >= megaCapMin, default $200B)
    const megaCapMembers = allInstruments.filter(
      (i) => !i.isIndex && !i.isETF && i.securityType !== 'OTC' && i.marketCap >= this.config.megaCapMin
    ).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_megacap',
      code: 'MEGA_CAP',
      name: '超大市值股 (Mega Cap $200B+)',
      description: '总市值 >= 2000 亿美元的超级巨头股票',
      category: 'CAPITALIZATION',
      memberIds: megaCapMembers
    });

    // 4. Large Cap Universe (marketCap >= largeCapMin, default $10B)
    const largeCapMembers = allInstruments.filter(
      (i) => !i.isIndex && !i.isETF && i.securityType !== 'OTC' && i.marketCap >= this.config.largeCapMin
    ).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_largecap',
      code: 'LARGE_CAP',
      name: '大市值股 (Large Cap $10B+)',
      description: '总市值 >= 100 亿美元的成熟大型企业',
      category: 'CAPITALIZATION',
      memberIds: largeCapMembers
    });

    // 5. Mid Cap Universe ($2B - $10B)
    const midCapMembers = allInstruments.filter(
      (i) => !i.isIndex && !i.isETF && i.securityType !== 'OTC' &&
             i.marketCap >= this.config.midCapMin && i.marketCap < this.config.midCapMax
    ).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_midcap',
      code: 'MID_CAP',
      name: '中市值股 (Mid Cap $2B-$10B)',
      description: '总市值 20 亿至 100 亿美元的高弹性成长型企业',
      category: 'CAPITALIZATION',
      memberIds: midCapMembers
    });

    // 6. Small Cap Universe ($300M - $2B)
    const smallCapMembers = allInstruments.filter(
      (i) => !i.isIndex && !i.isETF && i.securityType !== 'OTC' &&
             i.marketCap >= this.config.smallCapMin && i.marketCap < this.config.smallCapMax
    ).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_smallcap',
      code: 'SMALL_CAP',
      name: '小市值股 (Small Cap $300M-$2B)',
      description: '总市值 3 亿至 20 亿美元的早期成长股',
      category: 'CAPITALIZATION',
      memberIds: smallCapMembers
    });

    // 7. US Liquid Stocks
    // Criteria: active=true, common stock, price >= 5, avg volume >= 1M, avg dollar volume >= 20M, marketCap >= 2B
    const liquidMembers = allInstruments.filter(
      (i) =>
        i.active &&
        i.securityType === 'COMMON_STOCK' &&
        i.lastPrice >= this.config.liquidMinPrice &&
        i.avgVolume20d >= this.config.liquidMinVolume20d &&
        i.avgDollarVolume20d >= this.config.liquidMinDollarVolume20d &&
        i.marketCap >= this.config.liquidMinMarketCap
    ).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_us_liquid',
      code: 'US_LIQUID',
      name: '高流动性股票 (US Liquid Stocks)',
      description: '日均交易量>100万股且成交额>2000万美元的高流动性正股池',
      category: 'LIQUIDITY',
      memberIds: liquidMembers
    });

    // 8. NYSE Stocks
    const nyseMembers = allInstruments.filter(
      (i) => i.active && i.primaryExchange === 'NYSE' && ['COMMON_STOCK', 'ADR', 'REIT'].includes(i.securityType)
    ).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_nyse',
      code: 'NYSE_STOCKS',
      name: '纽约证交所股票 (NYSE Stocks)',
      description: '所有在 NYSE 主板上市的股票、ADR 与 REITs',
      category: 'EXCHANGE',
      memberIds: nyseMembers
    });

    // 9. Nasdaq Stocks
    const nasdaqMembers = allInstruments.filter(
      (i) => i.active && i.primaryExchange === 'NASDAQ' && ['COMMON_STOCK', 'ADR', 'REIT'].includes(i.securityType)
    ).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_nasdaq',
      code: 'NASDAQ_STOCKS',
      name: '纳斯达克股票 (Nasdaq Stocks)',
      description: '所有在 NASDAQ 市场上市的股票、ADR 与 REITs',
      category: 'EXCHANGE',
      memberIds: nasdaqMembers
    });

    // 10. ADR Universe
    const adrMembers = allInstruments.filter((i) => i.active && i.isADR).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_adr',
      code: 'ADR',
      name: '美股存托凭证 (ADR)',
      description: '美国境外优质公司在美股挂牌的 ADR 凭证（台积电、阿里、诺和诺德等）',
      category: 'ASSET_TYPE',
      memberIds: adrMembers
    });

    // 11. REIT Universe
    const reitMembers = allInstruments.filter((i) => i.active && i.isREIT).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_reit',
      code: 'REIT',
      name: '房地产信托基金 (REIT)',
      description: '高股息房地产投资信托资产（Prologis、American Tower、Realty Income等）',
      category: 'ASSET_TYPE',
      memberIds: reitMembers
    });

    // 12. Sector Universe (GICS Technology & S&P Sectors)
    const sectorMembers = allInstruments.filter((i) => i.active && i.sector === 'Technology').map((i) => i.id);
    this.registerUniverse({
      id: 'univ_sector_tech',
      code: 'SECTOR_TECH',
      name: '科技板块股票 (Tech Sector)',
      description: '标普 GICS 科技板块全覆盖',
      category: 'SECTOR',
      memberIds: sectorMembers
    });

    // 13. Industry Universe (Semiconductors)
    const industryMembers = allInstruments.filter((i) => i.active && i.industry?.includes('Semiconductor')).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_ind_semis',
      code: 'INDUSTRY_SEMIS',
      name: '半导体芯片产业链 (Semiconductors)',
      description: '先进制程、设计与设备龙头产业链',
      category: 'SECTOR',
      memberIds: industryMembers
    });

    // 14. ETF Universe
    const etfMembers = allInstruments.filter((i) => i.active && i.isETF).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_etf',
      code: 'ETF',
      name: '交易型开放式指数基金 (ETF)',
      description: '美股主流指数与行业 ETF（SPY、QQQ、SMH、XLK、IWM等）',
      category: 'ASSET_TYPE',
      memberIds: etfMembers
    });

    // 15. Watchlist Universe
    const watchlistSet = new Set(userWatchlistTickers.map((t) => t.toUpperCase()));
    const watchlistMembers = allInstruments.filter((i) => watchlistSet.has(i.ticker)).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_watchlist',
      code: 'WATCHLIST',
      name: '自选关注池 (Watchlist)',
      description: '用户当前个人自选关注标的',
      category: 'CUSTOM',
      memberIds: watchlistMembers
    });

    // 16. Custom Universe
    const customMembers = allInstruments.filter(
      (i) => i.active && !i.isIndex && i.securityType !== 'OTC' && i.marketCap >= 5e9
    ).map((i) => i.id);
    this.registerUniverse({
      id: 'univ_custom',
      code: 'CUSTOM',
      name: '自定义优选池 (Custom Universe)',
      description: '基于市值与动量多因子筛选的动态策略池',
      category: 'CUSTOM',
      memberIds: customMembers
    });
    universeDb.save();
    const result = universeDb.getAllUniverses();
    logger.info('UniverseBuilder', `Successfully built ${result.length} universes with materialized membership.`);
    return { universes: result };
  }

  private registerUniverse(params: {
    id: string;
    code: string;
    name: string;
    description: string;
    category: UniverseEntity['category'];
    memberIds: string[];
    expectedCount?: number;
  }): void {
    const expected = params.expectedCount || UNIVERSE_EXPECTED_COUNTS[params.code] || params.memberIds.length;
    universeDb.upsertUniverse({
      id: params.id,
      code: params.code,
      name: params.name,
      description: params.description,
      category: params.category,
      isSystem: true,
      memberCount: params.memberIds.length,
      expectedCount: expected,
      lastRebuiltAt: new Date().toISOString()
    });

    universeDb.setUniverseMembers(params.id, params.memberIds);
  }
}

export const universeBuilder = new UniverseBuilder();
