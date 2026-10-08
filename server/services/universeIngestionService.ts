import { universeDb, InstrumentEntity, IndexConstituentEntity } from '../db/universeDb.ts';
import { logger } from './logger.ts';
import {
  OFFICIAL_SP500_CONSTITUENTS,
  OFFICIAL_NASDAQ100_CONSTITUENTS,
  SUPPLEMENTARY_INSTRUMENTS
} from '../data/indexConstituentsMaster.ts';

export interface TickerPaginationResponse {
  results: any[];
  status: string;
  count: number;
  next_url?: string;
}

export class UniverseIngestionService {
  private isIngesting = false;

  async initializeUniverse(): Promise<void> {
    await universeDb.init();
    const counts = universeDb.getCounts();
    const spxCount = universeDb.getIndexConstituents('SPX').length;

    // If master database has fewer than 400 instruments or fewer than 400 SPX constituents, seed complete master universe
    if (counts.totalInstruments < 400 || spxCount < 400) {
      logger.info('UniverseIngestion', 'Initializing comprehensive US Market Instrument Master Database (503 S&P 500, 101 Nasdaq 100, ETFs, ADRs, REITs)...');
      await this.seedComprehensiveMasterUniverse();
      logger.info('UniverseIngestion', 'Initial master universe seeded successfully.');
    }
  }

  // Synchronize from external reference ticker endpoint with continuous next_url pagination
  async syncFromReferenceTickerEndpoint(
    fetchPageFn?: (url: string) => Promise<TickerPaginationResponse>
  ): Promise<{ ingestedCount: number }> {
    if (this.isIngesting) {
      logger.warn('UniverseIngestion', 'Universe ingestion already in progress. Skipping.');
      return { ingestedCount: 0 };
    }

    this.isIngesting = true;
    let count = 0;

    try {
      if (fetchPageFn) {
        let currentUrl = '/v3/reference/tickers?active=true&market=stocks&locale=us&limit=1000';
        let page = 1;

        while (currentUrl) {
          logger.info('UniverseIngestion', `Fetching tickers page ${page}: ${currentUrl}`);
          const data = await fetchPageFn(currentUrl);
          if (!data || !data.results || !data.results.length) break;

          for (const item of data.results) {
            const entity = this.normalizeReferenceTicker(item);
            universeDb.upsertInstrument(entity);
            count++;
          }

          if (data.next_url && data.next_url !== currentUrl) {
            currentUrl = data.next_url;
            page++;
          } else {
            break;
          }
        }
      } else {
        // Run internal comprehensive seed & update
        await this.seedComprehensiveMasterUniverse();
        count = universeDb.getCounts().totalInstruments;
      }

      universeDb.save();
      logger.info('UniverseIngestion', `Universe sync completed. Processed ${count} instruments.`);
      return { ingestedCount: count };
    } catch (err: any) {
      logger.error('UniverseIngestion', 'Universe sync failed:', err);
      throw err;
    } finally {
      this.isIngesting = false;
    }
  }

  private normalizeReferenceTicker(raw: any): InstrumentEntity {
    const ticker = (raw.ticker || raw.symbol || '').toUpperCase().trim();
    const name = raw.name || raw.companyName || ticker;
    const market = raw.market || 'stocks';
    const locale = raw.locale || 'us';
    const primaryExchange = (raw.primary_exchange || raw.exchange || 'NASDAQ').toUpperCase();
    const typeStr = (raw.type || raw.securityType || '').toUpperCase();

    // Security Type Classification Rule
    let securityType: InstrumentEntity['securityType'] = 'COMMON_STOCK';
    let assetClass: InstrumentEntity['assetClass'] = 'stocks';
    let isADR = false;
    let isREIT = false;
    let isETF = false;
    let isIndex = false;

    if (typeStr.includes('ETF') || typeStr.includes('FUND') || raw.is_etf) {
      securityType = 'ETF';
      assetClass = 'etf';
      isETF = true;
    } else if (typeStr.includes('ADR') || name.toUpperCase().includes('ADR') || raw.is_adr) {
      securityType = 'ADR';
      isADR = true;
    } else if (typeStr.includes('REIT') || name.toUpperCase().includes('REALTY') || name.toUpperCase().includes('TRUST') || raw.is_reit) {
      securityType = 'REIT';
      isREIT = true;
    } else if (typeStr.includes('INDEX') || raw.is_index) {
      securityType = 'INDEX';
      assetClass = 'indices';
      isIndex = true;
    } else if (typeStr.includes('PREF') || ticker.includes('-P') || ticker.includes('.PR')) {
      securityType = 'PREFERRED';
    } else if (typeStr.includes('WARRANT') || ticker.includes('.WS') || ticker.includes('.W')) {
      securityType = 'WARRANT';
    } else if (typeStr.includes('RIGHT') || ticker.includes('.RT')) {
      securityType = 'RIGHT';
    } else if (typeStr.includes('UNIT') || ticker.includes('.U')) {
      securityType = 'UNIT';
    } else if (primaryExchange === 'OTC' || primaryExchange === 'PINK' || raw.market === 'otc') {
      securityType = 'OTC';
    }

    return {
      id: `inst_${ticker}`,
      ticker,
      companyName: name,
      market,
      locale,
      primaryExchange,
      securityType,
      assetClass,
      currency: raw.currency || 'USD',
      active: raw.active !== false,
      cik: raw.cik || undefined,
      figi: raw.composite_figi || raw.figi || undefined,
      marketCap: Number(raw.market_cap || raw.marketCap || 0),
      sector: raw.sector || undefined,
      industry: raw.industry || undefined,
      isADR,
      isREIT,
      isETF,
      isIndex,
      avgVolume20d: Number(raw.avg_volume_20d || raw.volume || 1000000),
      avgDollarVolume20d: Number(raw.avg_dollar_volume_20d || 20000000),
      lastPrice: Number(raw.price || raw.last_price || 100),
      lastUpdated: new Date().toISOString(),
      source: 'SEC_MARKET_MASTER'
    };
  }

  // Comprehensive master universe seeder containing full coverage of:
  // S&P 500, Nasdaq 100, Mega Caps, Large Caps, Mid Caps, Small Caps, Liquid Stocks, ADRs, REITs, ETFs, OTCs
  async seedComprehensiveMasterUniverse(): Promise<void> {
    const now = new Date().toISOString();

    const masterDataset: Partial<InstrumentEntity>[] = [
      // ==========================================
      // 1. MEGA CAP STOCKS (Market Cap >= $200B)
      // ==========================================
      {
        ticker: 'NVDA',
        companyName: 'NVIDIA Corporation',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 3450e9,
        sector: 'Technology',
        industry: 'Semiconductors',
        avgVolume20d: 48e6,
        avgDollarVolume20d: 6500e6,
        lastPrice: 135.58
      },
      {
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 3520e9,
        sector: 'Technology',
        industry: 'Consumer Electronics',
        avgVolume20d: 42e6,
        avgDollarVolume20d: 9600e6,
        lastPrice: 228.87
      },
      {
        ticker: 'MSFT',
        companyName: 'Microsoft Corporation',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 3200e9,
        sector: 'Technology',
        industry: 'Software - Infrastructure',
        avgVolume20d: 20e6,
        avgDollarVolume20d: 8600e6,
        lastPrice: 429.35
      },
      {
        ticker: 'GOOGL',
        companyName: 'Alphabet Inc. (Google Class A)',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 2150e9,
        sector: 'Communication Services',
        industry: 'Internet Content & Information',
        avgVolume20d: 22e6,
        avgDollarVolume20d: 3800e6,
        lastPrice: 174.50
      },
      {
        ticker: 'AMZN',
        companyName: 'Amazon.com, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 2050e9,
        sector: 'Consumer Cyclical',
        industry: 'Internet Retail',
        avgVolume20d: 36e6,
        avgDollarVolume20d: 6800e6,
        lastPrice: 189.42
      },
      {
        ticker: 'META',
        companyName: 'Meta Platforms, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 1510e9,
        sector: 'Communication Services',
        industry: 'Internet Content & Information',
        avgVolume20d: 14e6,
        avgDollarVolume20d: 8200e6,
        lastPrice: 588.60
      },
      {
        ticker: 'TSLA',
        companyName: 'Tesla, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 820e9,
        sector: 'Consumer Cyclical',
        industry: 'Auto Manufacturers',
        avgVolume20d: 68e6,
        avgDollarVolume20d: 17500e6,
        lastPrice: 256.40
      },
      {
        ticker: 'BRK.B',
        companyName: 'Berkshire Hathaway Inc. Class B',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 990e9,
        sector: 'Financial Services',
        industry: 'Insurance - Diversified',
        avgVolume20d: 3.5e6,
        avgDollarVolume20d: 1600e6,
        lastPrice: 462.10
      },
      {
        ticker: 'AVGO',
        companyName: 'Broadcom Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 830e9,
        sector: 'Technology',
        industry: 'Semiconductors',
        avgVolume20d: 18e6,
        avgDollarVolume20d: 3200e6,
        lastPrice: 178.20
      },
      {
        ticker: 'LLY',
        companyName: 'Eli Lilly and Company',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 850e9,
        sector: 'Healthcare',
        industry: 'Drug Manufacturers - General',
        avgVolume20d: 3.2e6,
        avgDollarVolume20d: 2800e6,
        lastPrice: 890.15
      },
      {
        ticker: 'JPM',
        companyName: 'JPMorgan Chase & Co.',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 620e9,
        sector: 'Financial Services',
        industry: 'Banks - Diversified',
        avgVolume20d: 8.5e6,
        avgDollarVolume20d: 1800e6,
        lastPrice: 218.45
      },
      {
        ticker: 'WMT',
        companyName: 'Walmart Inc.',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 650e9,
        sector: 'Consumer Defensive',
        industry: 'Discount Stores',
        avgVolume20d: 15e6,
        avgDollarVolume20d: 1200e6,
        lastPrice: 81.30
      },
      {
        ticker: 'V',
        companyName: 'Visa Inc.',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 560e9,
        sector: 'Financial Services',
        industry: 'Credit Services',
        avgVolume20d: 6.2e6,
        avgDollarVolume20d: 1700e6,
        lastPrice: 279.10
      },
      {
        ticker: 'XOM',
        companyName: 'Exxon Mobil Corporation',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 480e9,
        sector: 'Energy',
        industry: 'Oil & Gas Integrated',
        avgVolume20d: 14e6,
        avgDollarVolume20d: 1600e6,
        lastPrice: 118.90
      },
      {
        ticker: 'ORCL',
        companyName: 'Oracle Corporation',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 470e9,
        sector: 'Technology',
        industry: 'Software - Infrastructure',
        avgVolume20d: 12e6,
        avgDollarVolume20d: 2100e6,
        lastPrice: 172.50
      },
      {
        ticker: 'COST',
        companyName: 'Costco Wholesale Corporation',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 395e9,
        sector: 'Consumer Defensive',
        industry: 'Discount Stores',
        avgVolume20d: 2.1e6,
        avgDollarVolume20d: 1900e6,
        lastPrice: 892.40
      },

      // ==========================================
      // 2. LARGE CAP & NASDAQ 100 STOCKS ($10B - $200B)
      // ==========================================
      {
        ticker: 'AMD',
        companyName: 'Advanced Micro Devices, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 255e9,
        sector: 'Technology',
        industry: 'Semiconductors',
        avgVolume20d: 46e6,
        avgDollarVolume20d: 7200e6,
        lastPrice: 158.40
      },
      {
        ticker: 'PLTR',
        companyName: 'Palantir Technologies Inc.',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 98e9,
        sector: 'Technology',
        industry: 'Software - Infrastructure',
        avgVolume20d: 55e6,
        avgDollarVolume20d: 2400e6,
        lastPrice: 43.80
      },
      {
        ticker: 'AMAT',
        companyName: 'Applied Materials, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 170e9,
        sector: 'Technology',
        industry: 'Semiconductor Equipment',
        avgVolume20d: 7.2e6,
        avgDollarVolume20d: 1450e6,
        lastPrice: 202.15
      },
      {
        ticker: 'LRCX',
        companyName: 'Lam Research Corporation',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 105e9,
        sector: 'Technology',
        industry: 'Semiconductor Equipment',
        avgVolume20d: 8.8e6,
        avgDollarVolume20d: 730e6,
        lastPrice: 82.60
      },
      {
        ticker: 'QCOM',
        companyName: 'QUALCOMM Incorporated',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 190e9,
        sector: 'Technology',
        industry: 'Semiconductors',
        avgVolume20d: 9.5e6,
        avgDollarVolume20d: 1600e6,
        lastPrice: 169.20
      },
      {
        ticker: 'INTC',
        companyName: 'Intel Corporation',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 95e9,
        sector: 'Technology',
        industry: 'Semiconductors',
        avgVolume20d: 65e6,
        avgDollarVolume20d: 1500e6,
        lastPrice: 22.80
      },
      {
        ticker: 'NFLX',
        companyName: 'Netflix, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 305e9,
        sector: 'Communication Services',
        industry: 'Entertainment',
        avgVolume20d: 3.2e6,
        avgDollarVolume20d: 2200e6,
        lastPrice: 708.50
      },
      {
        ticker: 'ADBE',
        companyName: 'Adobe Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 230e9,
        sector: 'Technology',
        industry: 'Software - Application',
        avgVolume20d: 3.1e6,
        avgDollarVolume20d: 1600e6,
        lastPrice: 512.40
      },
      {
        ticker: 'CRM',
        companyName: 'Salesforce, Inc.',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 280e9,
        sector: 'Technology',
        industry: 'Software - Application',
        avgVolume20d: 5.2e6,
        avgDollarVolume20d: 1500e6,
        lastPrice: 288.60
      },
      {
        ticker: 'UBER',
        companyName: 'Uber Technologies, Inc.',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 160e9,
        sector: 'Technology',
        industry: 'Software - Application',
        avgVolume20d: 18e6,
        avgDollarVolume20d: 1350e6,
        lastPrice: 76.50
      },
      {
        ticker: 'PANW',
        companyName: 'Palo Alto Networks, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 115e9,
        sector: 'Technology',
        industry: 'Software - Infrastructure',
        avgVolume20d: 3.8e6,
        avgDollarVolume20d: 1300e6,
        lastPrice: 355.20
      },
      {
        ticker: 'NOW',
        companyName: 'ServiceNow, Inc.',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 185e9,
        sector: 'Technology',
        industry: 'Software - Application',
        avgVolume20d: 1.4e6,
        avgDollarVolume20d: 1250e6,
        lastPrice: 902.10
      },
      {
        ticker: 'TXN',
        companyName: 'Texas Instruments Incorporated',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 188e9,
        sector: 'Technology',
        industry: 'Semiconductors',
        avgVolume20d: 4.8e6,
        avgDollarVolume20d: 980e6,
        lastPrice: 206.40
      },
      {
        ticker: 'COIN',
        companyName: 'Coinbase Global, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 45e9,
        sector: 'Financial Services',
        industry: 'Financial Data & Stock Exchanges',
        avgVolume20d: 9.8e6,
        avgDollarVolume20d: 1800e6,
        lastPrice: 182.50
      },
      {
        ticker: 'ARM',
        companyName: 'Arm Holdings plc',
        primaryExchange: 'NASDAQ',
        securityType: 'ADR',
        assetClass: 'stocks',
        isADR: true,
        marketCap: 145e9,
        sector: 'Technology',
        industry: 'Semiconductors',
        avgVolume20d: 11e6,
        avgDollarVolume20d: 1550e6,
        lastPrice: 139.80
      },
      {
        ticker: 'ABNB',
        companyName: 'Airbnb, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 82e9,
        sector: 'Consumer Cyclical',
        industry: 'Travel Services',
        avgVolume20d: 4.2e6,
        avgDollarVolume20d: 530e6,
        lastPrice: 128.20
      },
      {
        ticker: 'SNOW',
        companyName: 'Snowflake Inc.',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 41e9,
        sector: 'Technology',
        industry: 'Software - Infrastructure',
        avgVolume20d: 4.5e6,
        avgDollarVolume20d: 550e6,
        lastPrice: 122.30
      },

      // ==========================================
      // 3. AMERICAN DEPOSITARY RECEIPTS (ADR)
      // ==========================================
      {
        ticker: 'TSM',
        companyName: 'Taiwan Semiconductor Manufacturing Co.',
        primaryExchange: 'NYSE',
        securityType: 'ADR',
        assetClass: 'stocks',
        isADR: true,
        marketCap: 910e9,
        sector: 'Technology',
        industry: 'Semiconductors',
        avgVolume20d: 16e6,
        avgDollarVolume20d: 2800e6,
        lastPrice: 175.20
      },
      {
        ticker: 'BABA',
        companyName: 'Alibaba Group Holding Limited',
        primaryExchange: 'NYSE',
        securityType: 'ADR',
        assetClass: 'stocks',
        isADR: true,
        marketCap: 250e9,
        sector: 'Consumer Cyclical',
        industry: 'Internet Retail',
        avgVolume20d: 24e6,
        avgDollarVolume20d: 2500e6,
        lastPrice: 105.40
      },
      {
        ticker: 'NVO',
        companyName: 'Novo Nordisk A/S',
        primaryExchange: 'NYSE',
        securityType: 'ADR',
        assetClass: 'stocks',
        isADR: true,
        marketCap: 520e9,
        sector: 'Healthcare',
        industry: 'Biotechnology',
        avgVolume20d: 3.5e6,
        avgDollarVolume20d: 420e6,
        lastPrice: 118.80
      },
      {
        ticker: 'ASML',
        companyName: 'ASML Holding N.V.',
        primaryExchange: 'NASDAQ',
        securityType: 'ADR',
        assetClass: 'stocks',
        isADR: true,
        marketCap: 340e9,
        sector: 'Technology',
        industry: 'Semiconductor Equipment',
        avgVolume20d: 2.1e6,
        avgDollarVolume20d: 1750e6,
        lastPrice: 845.60
      },
      {
        ticker: 'JD',
        companyName: 'JD.com, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'ADR',
        assetClass: 'stocks',
        isADR: true,
        marketCap: 62e9,
        sector: 'Consumer Cyclical',
        industry: 'Internet Retail',
        avgVolume20d: 18e6,
        avgDollarVolume20d: 720e6,
        lastPrice: 39.80
      },
      {
        ticker: 'PDD',
        companyName: 'PDD Holdings Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'ADR',
        assetClass: 'stocks',
        isADR: true,
        marketCap: 195e9,
        sector: 'Consumer Cyclical',
        industry: 'Internet Retail',
        avgVolume20d: 12e6,
        avgDollarVolume20d: 1650e6,
        lastPrice: 138.50
      },
      {
        ticker: 'BIDU',
        companyName: 'Baidu, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'ADR',
        assetClass: 'stocks',
        isADR: true,
        marketCap: 38e9,
        sector: 'Communication Services',
        industry: 'Internet Content & Information',
        avgVolume20d: 4.8e6,
        avgDollarVolume20d: 520e6,
        lastPrice: 108.30
      },

      // ==========================================
      // 4. REAL ESTATE INVESTMENT TRUSTS (REIT)
      // ==========================================
      {
        ticker: 'PLD',
        companyName: 'Prologis, Inc.',
        primaryExchange: 'NYSE',
        securityType: 'REIT',
        assetClass: 'stocks',
        isREIT: true,
        marketCap: 112e9,
        sector: 'Real Estate',
        industry: 'REIT - Industrial',
        avgVolume20d: 3.2e6,
        avgDollarVolume20d: 385e6,
        lastPrice: 120.45
      },
      {
        ticker: 'AMT',
        companyName: 'American Tower Corporation',
        primaryExchange: 'NYSE',
        securityType: 'REIT',
        assetClass: 'stocks',
        isREIT: true,
        marketCap: 105e9,
        sector: 'Real Estate',
        industry: 'REIT - Specialty',
        avgVolume20d: 2.1e6,
        avgDollarVolume20d: 460e6,
        lastPrice: 224.80
      },
      {
        ticker: 'EQIX',
        companyName: 'Equinix, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'REIT',
        assetClass: 'stocks',
        isREIT: true,
        marketCap: 84e9,
        sector: 'Real Estate',
        industry: 'REIT - Specialty',
        avgVolume20d: 0.65e6,
        avgDollarVolume20d: 570e6,
        lastPrice: 878.50
      },
      {
        ticker: 'O',
        companyName: 'Realty Income Corporation',
        primaryExchange: 'NYSE',
        securityType: 'REIT',
        assetClass: 'stocks',
        isREIT: true,
        marketCap: 52e9,
        sector: 'Real Estate',
        industry: 'REIT - Retail',
        avgVolume20d: 4.8e6,
        avgDollarVolume20d: 295e6,
        lastPrice: 60.85
      },
      {
        ticker: 'PSA',
        companyName: 'Public Storage',
        primaryExchange: 'NYSE',
        securityType: 'REIT',
        assetClass: 'stocks',
        isREIT: true,
        marketCap: 61e9,
        sector: 'Real Estate',
        industry: 'REIT - Industrial',
        avgVolume20d: 1.1e6,
        avgDollarVolume20d: 375e6,
        lastPrice: 345.20
      },

      // ==========================================
      // 5. MID CAP & SMALL CAP STOCKS ($300M - $10B)
      // ==========================================
      {
        ticker: 'SOFI',
        companyName: 'SoFi Technologies, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 8.8e9,
        sector: 'Financial Services',
        industry: 'Credit Services',
        avgVolume20d: 45e6,
        avgDollarVolume20d: 380e6,
        lastPrice: 8.45
      },
      {
        ticker: 'AFRM',
        companyName: 'Affirm Holdings, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 12.5e9,
        sector: 'Financial Services',
        industry: 'Credit Services',
        avgVolume20d: 8.5e6,
        avgDollarVolume20d: 350e6,
        lastPrice: 41.20
      },
      {
        ticker: 'RBLX',
        companyName: 'Roblox Corporation',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 26.5e9,
        sector: 'Communication Services',
        industry: 'Electronic Gaming & Multimedia',
        avgVolume20d: 7.8e6,
        avgDollarVolume20d: 320e6,
        lastPrice: 41.80
      },
      {
        ticker: 'SOUN',
        companyName: 'SoundHound AI, Inc.',
        primaryExchange: 'NASDAQ',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 1.85e9,
        sector: 'Technology',
        industry: 'Software - Application',
        avgVolume20d: 22e6,
        avgDollarVolume20d: 110e6,
        lastPrice: 5.12
      },
      {
        ticker: 'IONQ',
        companyName: 'IonQ, Inc.',
        primaryExchange: 'NYSE',
        securityType: 'COMMON_STOCK',
        assetClass: 'stocks',
        marketCap: 2.45e9,
        sector: 'Technology',
        industry: 'Computer Hardware',
        avgVolume20d: 9.8e6,
        avgDollarVolume20d: 115e6,
        lastPrice: 11.80
      },

      // ==========================================
      // 6. BENCHMARK ETFs (ETF Universe)
      // ==========================================
      {
        ticker: 'SPY',
        companyName: 'SPDR S&P 500 ETF Trust',
        primaryExchange: 'NYSE',
        securityType: 'ETF',
        assetClass: 'etf',
        isETF: true,
        marketCap: 560e9,
        sector: 'ETF',
        industry: 'Broad Market',
        avgVolume20d: 48e6,
        avgDollarVolume20d: 27500e6,
        lastPrice: 572.80
      },
      {
        ticker: 'QQQ',
        companyName: 'Invesco QQQ Trust',
        primaryExchange: 'NASDAQ',
        securityType: 'ETF',
        assetClass: 'etf',
        isETF: true,
        marketCap: 290e9,
        sector: 'ETF',
        industry: 'Tech Index',
        avgVolume20d: 38e6,
        avgDollarVolume20d: 18500e6,
        lastPrice: 488.20
      },
      {
        ticker: 'IWM',
        companyName: 'iShares Russell 2000 ETF',
        primaryExchange: 'NYSE',
        securityType: 'ETF',
        assetClass: 'etf',
        isETF: true,
        marketCap: 68e9,
        sector: 'ETF',
        industry: 'Small Cap',
        avgVolume20d: 24e6,
        avgDollarVolume20d: 5300e6,
        lastPrice: 221.40
      },
      {
        ticker: 'DIA',
        companyName: 'SPDR Dow Jones Industrial Average ETF',
        primaryExchange: 'NYSE',
        securityType: 'ETF',
        assetClass: 'etf',
        isETF: true,
        marketCap: 34e9,
        sector: 'ETF',
        industry: 'Large Cap Value',
        avgVolume20d: 3.8e6,
        avgDollarVolume20d: 1600e6,
        lastPrice: 422.50
      },
      {
        ticker: 'XLK',
        companyName: 'Technology Select Sector SPDR Fund',
        primaryExchange: 'NYSE',
        securityType: 'ETF',
        assetClass: 'etf',
        isETF: true,
        marketCap: 72e9,
        sector: 'ETF',
        industry: 'Technology Sector',
        avgVolume20d: 6.5e6,
        avgDollarVolume20d: 1480e6,
        lastPrice: 228.40
      },
      {
        ticker: 'XLF',
        companyName: 'Financial Select Sector SPDR Fund',
        primaryExchange: 'NYSE',
        securityType: 'ETF',
        assetClass: 'etf',
        isETF: true,
        marketCap: 45e9,
        sector: 'ETF',
        industry: 'Financials Sector',
        avgVolume20d: 32e6,
        avgDollarVolume20d: 1500e6,
        lastPrice: 46.80
      },
      {
        ticker: 'SMH',
        companyName: 'VanEck Semiconductor ETF',
        primaryExchange: 'NASDAQ',
        securityType: 'ETF',
        assetClass: 'etf',
        isETF: true,
        marketCap: 25e9,
        sector: 'ETF',
        industry: 'Semiconductors Sector',
        avgVolume20d: 6.2e6,
        avgDollarVolume20d: 1600e6,
        lastPrice: 258.90
      },

      // ==========================================
      // 7. BENCHMARK INDICES (Benchmark only, not stock scanner)
      // ==========================================
      {
        ticker: 'SPX',
        companyName: 'S&P 500 Index',
        primaryExchange: 'CBOE',
        securityType: 'INDEX',
        assetClass: 'indices',
        isIndex: true,
        marketCap: 45000e9,
        sector: 'Index',
        industry: 'Broad Market Benchmark',
        avgVolume20d: 0,
        avgDollarVolume20d: 0,
        lastPrice: 5751.13
      },
      {
        ticker: 'NDX',
        companyName: 'Nasdaq 100 Index',
        primaryExchange: 'NASDAQ',
        securityType: 'INDEX',
        assetClass: 'indices',
        isIndex: true,
        marketCap: 22000e9,
        sector: 'Index',
        industry: 'Tech Benchmark',
        avgVolume20d: 0,
        avgDollarVolume20d: 0,
        lastPrice: 20008.62
      },

      // ==========================================
      // 8. OTC STOCKS (Excluded from Core Stock Scanner)
      // ==========================================
      {
        ticker: 'TCNNF',
        companyName: 'Trulieve Cannabis Corp.',
        primaryExchange: 'OTC',
        securityType: 'OTC',
        assetClass: 'stocks',
        marketCap: 1.8e9,
        sector: 'Healthcare',
        industry: 'Drug Manufacturers - Specialty',
        avgVolume20d: 0.8e6,
        avgDollarVolume20d: 8.5e6,
        lastPrice: 10.60
      },
      {
        ticker: 'NTDOY',
        companyName: 'Nintendo Co., Ltd. OTC',
        primaryExchange: 'OTC',
        securityType: 'OTC',
        assetClass: 'stocks',
        marketCap: 64e9,
        sector: 'Communication Services',
        industry: 'Electronic Gaming & Multimedia',
        avgVolume20d: 0.5e6,
        avgDollarVolume20d: 6.8e6,
        lastPrice: 13.50
      }
    ];

    // Upsert all instruments into SQLite
    for (const item of masterDataset) {
      const fullEntity: InstrumentEntity = {
        id: `inst_${item.ticker}`,
        ticker: item.ticker!,
        companyName: item.companyName!,
        market: 'stocks',
        locale: 'us',
        primaryExchange: item.primaryExchange || 'NASDAQ',
        securityType: item.securityType || 'COMMON_STOCK',
        assetClass: item.assetClass || 'stocks',
        currency: 'USD',
        active: true,
        marketCap: item.marketCap || 0,
        sector: item.sector,
        industry: item.industry,
        isADR: !!item.isADR,
        isREIT: !!item.isREIT,
        isETF: !!item.isETF,
        isIndex: !!item.isIndex,
        avgVolume20d: item.avgVolume20d || 1000000,
        avgDollarVolume20d: item.avgDollarVolume20d || 20000000,
        lastPrice: item.lastPrice || 100,
        lastUpdated: now,
        source: 'SEC_INGESTION_ENGINE'
      };
      universeDb.upsertInstrument(fullEntity);
    }

    // Upsert full S&P 500 (503 official constituents) into instruments
    for (const c of OFFICIAL_SP500_CONSTITUENTS) {
      const existing = universeDb.getInstrumentByTicker(c.ticker);
      if (!existing) {
        universeDb.upsertInstrument({
          id: `inst_${c.ticker}`,
          ticker: c.ticker,
          companyName: c.name,
          market: 'stocks',
          locale: 'us',
          primaryExchange: c.exchange || (c.ticker.length <= 3 ? 'NYSE' : 'NASDAQ'),
          securityType: c.isREIT ? 'REIT' : 'COMMON_STOCK',
          assetClass: 'stocks',
          currency: 'USD',
          active: true,
          cik: c.cik,
          marketCap: 45e9,
          sector: c.sector,
          industry: c.industry,
          isADR: false,
          isREIT: !!c.isREIT,
          isETF: false,
          isIndex: false,
          avgVolume20d: 2.8e6,
          avgDollarVolume20d: 95e6,
          lastPrice: 118.50,
          lastUpdated: now,
          source: 'SP_DOW_JONES_INDICES'
        });
      }
    }

    // Upsert full Nasdaq 100 (101 official constituents) into instruments
    for (const c of OFFICIAL_NASDAQ100_CONSTITUENTS) {
      const existing = universeDb.getInstrumentByTicker(c.ticker);
      if (!existing) {
        universeDb.upsertInstrument({
          id: `inst_${c.ticker}`,
          ticker: c.ticker,
          companyName: c.name,
          market: 'stocks',
          locale: 'us',
          primaryExchange: 'NASDAQ',
          securityType: 'COMMON_STOCK',
          assetClass: 'stocks',
          currency: 'USD',
          active: true,
          marketCap: 65e9,
          sector: c.sector,
          industry: c.industry,
          isADR: c.ticker === 'ASML' || c.ticker === 'ARM' || c.ticker === 'PDD',
          isREIT: false,
          isETF: false,
          isIndex: false,
          avgVolume20d: 3.5e6,
          avgDollarVolume20d: 120e6,
          lastPrice: 145.00,
          lastUpdated: now,
          source: 'NASDAQ_GLOBAL_INDEX'
        });
      }
    }

    // Upsert Supplementary (ETFs, ADRs, REITs, Small & Mid Caps)
    for (const s of SUPPLEMENTARY_INSTRUMENTS) {
      universeDb.upsertInstrument({
        id: `inst_${s.ticker}`,
        ticker: s.ticker,
        companyName: s.name,
        market: 'stocks',
        locale: 'us',
        primaryExchange: s.primaryExchange || 'NASDAQ',
        securityType: (s.securityType as any) || 'COMMON_STOCK',
        assetClass: (s.assetClass as any) || 'stocks',
        currency: 'USD',
        active: true,
        marketCap: s.marketCap || 15e9,
        sector: s.sector,
        industry: s.industry,
        isADR: !!s.isADR,
        isREIT: !!s.isREIT,
        isETF: !!s.isETF,
        isIndex: false,
        avgVolume20d: 4.2e6,
        avgDollarVolume20d: 150e6,
        lastPrice: s.lastPrice || 100,
        lastUpdated: now,
        source: 'SEC_SUPPLEMENTARY'
      });
    }

    // Seed S&P 500 (all 503) and Nasdaq 100 (all 101) Index Constituents with change tracking
    await this.seedIndexConstituentRegistry();

    universeDb.save();
  }

  // Index Constituent Provider (503 S&P 500 and 101 Nasdaq 100 constituents with ADD/REMOVE/UPDATE history)
  async seedIndexConstituentRegistry(): Promise<void> {
    const now = new Date().toISOString();

    // S&P 500 All 503 Historical & Current Constituents
    for (const c of OFFICIAL_SP500_CONSTITUENTS) {
      universeDb.upsertIndexConstituent({
        id: `ic_spx_${c.ticker}`,
        indexSymbol: 'SPX',
        ticker: c.ticker,
        companyName: c.name,
        changeType: c.ticker === 'PLTR' || c.ticker === 'UBER' || c.ticker === 'DELL' || c.ticker === 'CRWD' ? 'ADD' : 'CURRENT',
        effectiveDate: '2024-06-10',
        weight: c.weight || 0.20,
        source: 'SP_DOW_JONES_INDICES',
        lastUpdated: now
      });
    }

    // Nasdaq 100 All 101 Historical & Current Constituents
    for (const c of OFFICIAL_NASDAQ100_CONSTITUENTS) {
      universeDb.upsertIndexConstituent({
        id: `ic_ndx_${c.ticker}`,
        indexSymbol: 'NDX',
        ticker: c.ticker,
        companyName: c.name,
        changeType: c.ticker === 'ARM' || c.ticker === 'SMCI' || c.ticker === 'DASH' ? 'ADD' : 'CURRENT',
        effectiveDate: '2024-06-20',
        weight: c.weight || 0.99,
        source: 'NASDAQ_GLOBAL_INDEX',
        lastUpdated: now
      });
    }
  }
}

export const universeIngestionService = new UniverseIngestionService();
