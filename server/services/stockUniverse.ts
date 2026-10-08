import { StockMeta } from '../types.ts';
import { universeDb } from '../db/universeDb.ts';
import { resolveStockSectorMeta } from '../utils/stockSectorMapper.ts';
import { OFFICIAL_SP500_CONSTITUENTS, OFFICIAL_NASDAQ100_CONSTITUENTS } from '../data/indexConstituentsMaster.ts';

export const STOCK_UNIVERSE: StockMeta[] = [
  // Mega Cap & Big Tech
  { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', marketCap: 3050000000000, sector: 'Technology', industry: 'Semiconductors', isActive: true },
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', marketCap: 3400000000000, sector: 'Technology', industry: 'Consumer Electronics', isActive: true },
  { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', marketCap: 3120000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'GOOGL', name: 'Alphabet Inc. (Class A)', exchange: 'NASDAQ', marketCap: 2150000000000, sector: 'Communication Services', industry: 'Internet Content', isActive: true },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', marketCap: 2020000000000, sector: 'Consumer Cyclical', industry: 'E-Commerce', isActive: true },
  { ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', marketCap: 1450000000000, sector: 'Communication Services', industry: 'Internet Content', isActive: true },
  { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', marketCap: 780000000000, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', isActive: true },
  { ticker: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', marketCap: 790000000000, sector: 'Technology', industry: 'Semiconductors', isActive: true },
  { ticker: 'TSM', name: 'Taiwan Semiconductor Manufacturing', exchange: 'NYSE', marketCap: 890000000000, sector: 'Technology', industry: 'Semiconductors', isActive: true },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway Inc.', exchange: 'NYSE', marketCap: 980000000000, sector: 'Financial Services', industry: 'Insurance', isActive: true },

  // Large Cap Tech & Software
  { ticker: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ', marketCap: 245000000000, sector: 'Technology', industry: 'Semiconductors', isActive: true },
  { ticker: 'ORCL', name: 'Oracle Corporation', exchange: 'NYSE', marketCap: 450000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'CRM', name: 'Salesforce, Inc.', exchange: 'NYSE', marketCap: 285000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ', marketCap: 225000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'QCOM', name: 'Qualcomm Incorporated', exchange: 'NASDAQ', marketCap: 185000000000, sector: 'Technology', industry: 'Semiconductors', isActive: true },
  { ticker: 'ASML', name: 'ASML Holding N.V.', exchange: 'NASDAQ', marketCap: 340000000000, sector: 'Technology', industry: 'Semiconductor Equipment', isActive: true },
  { ticker: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', marketCap: 98000000000, sector: 'Technology', industry: 'Semiconductors', isActive: true },
  { ticker: 'TXN', name: 'Texas Instruments Incorporated', exchange: 'NASDAQ', marketCap: 190000000000, sector: 'Technology', industry: 'Semiconductors', isActive: true },
  { ticker: 'CSCO', name: 'Cisco Systems, Inc.', exchange: 'NASDAQ', marketCap: 210000000000, sector: 'Technology', industry: 'Communication Equipment', isActive: true },
  { ticker: 'IBM', name: 'International Business Machines', exchange: 'NYSE', marketCap: 205000000000, sector: 'Technology', industry: 'IT Services', isActive: true },
  { ticker: 'NOW', name: 'ServiceNow, Inc.', exchange: 'NYSE', marketCap: 195000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'AMAT', name: 'Applied Materials, Inc.', exchange: 'NASDAQ', marketCap: 165000000000, sector: 'Technology', industry: 'Semiconductor Equipment', isActive: true },
  { ticker: 'MU', name: 'Micron Technology, Inc.', exchange: 'NASDAQ', marketCap: 120000000000, sector: 'Technology', industry: 'Semiconductors', isActive: true },
  { ticker: 'LRCX', name: 'Lam Research Corporation', exchange: 'NASDAQ', marketCap: 105000000000, sector: 'Technology', industry: 'Semiconductor Equipment', isActive: true },
  { ticker: 'PANW', name: 'Palo Alto Networks, Inc.', exchange: 'NASDAQ', marketCap: 125000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'PLTR', name: 'Palantir Technologies Inc.', exchange: 'NYSE', marketCap: 95000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'SNOW', name: 'Snowflake Inc.', exchange: 'NYSE', marketCap: 45000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'UBER', name: 'Uber Technologies, Inc.', exchange: 'NYSE', marketCap: 155000000000, sector: 'Technology', industry: 'Software - Application', isActive: true },
  { ticker: 'COIN', name: 'Coinbase Global, Inc.', exchange: 'NASDAQ', marketCap: 52000000000, sector: 'Financial Services', industry: 'Financial Data & Exchanges', isActive: true },
  { ticker: 'ARM', name: 'Arm Holdings plc', exchange: 'NASDAQ', marketCap: 140000000000, sector: 'Technology', industry: 'Semiconductors', isActive: true },
  { ticker: 'SHOP', name: 'Shopify Inc.', exchange: 'NYSE', marketCap: 98000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'NET', name: 'Cloudflare, Inc.', exchange: 'NYSE', marketCap: 28000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'CRWD', name: 'CrowdStrike Holdings, Inc.', exchange: 'NASDAQ', marketCap: 75000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'SMCI', name: 'Super Micro Computer, Inc.', exchange: 'NASDAQ', marketCap: 26000000000, sector: 'Technology', industry: 'Hardware', isActive: true },

  // Healthcare & Biotech
  { ticker: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE', marketCap: 840000000000, sector: 'Healthcare', industry: 'Drug Manufacturers', isActive: true },
  { ticker: 'UNH', name: 'UnitedHealth Group Incorporated', exchange: 'NYSE', marketCap: 530000000000, sector: 'Healthcare', industry: 'Healthcare Plans', isActive: true },
  { ticker: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', marketCap: 390000000000, sector: 'Healthcare', industry: 'Drug Manufacturers', isActive: true },
  { ticker: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE', marketCap: 340000000000, sector: 'Healthcare', industry: 'Drug Manufacturers', isActive: true },
  { ticker: 'MRK', name: 'Merck & Co., Inc.', exchange: 'NYSE', marketCap: 290000000000, sector: 'Healthcare', industry: 'Drug Manufacturers', isActive: true },
  { ticker: 'TMO', name: 'Thermo Fisher Scientific Inc.', exchange: 'NYSE', marketCap: 215000000000, sector: 'Healthcare', industry: 'Diagnostics & Research', isActive: true },
  { ticker: 'ABT', name: 'Abbott Laboratories', exchange: 'NYSE', marketCap: 200000000000, sector: 'Healthcare', industry: 'Medical Devices', isActive: true },
  { ticker: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE', marketCap: 165000000000, sector: 'Healthcare', industry: 'Drug Manufacturers', isActive: true },
  { ticker: 'AMGN', name: 'Amgen Inc.', exchange: 'NASDAQ', marketCap: 175000000000, sector: 'Healthcare', industry: 'Biotechnology', isActive: true },
  { ticker: 'ISRG', name: 'Intuitive Surgical, Inc.', exchange: 'NASDAQ', marketCap: 170000000000, sector: 'Healthcare', industry: 'Medical Instruments', isActive: true },
  { ticker: 'VRTX', name: 'Vertex Pharmaceuticals Inc.', exchange: 'NASDAQ', marketCap: 120000000000, sector: 'Healthcare', industry: 'Biotechnology', isActive: true },
  { ticker: 'MRNA', name: 'Moderna, Inc.', exchange: 'NASDAQ', marketCap: 28000000000, sector: 'Healthcare', industry: 'Biotechnology', isActive: true },

  // Financials
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', marketCap: 620000000000, sector: 'Financial Services', industry: 'Banks - Diversified', isActive: true },
  { ticker: 'V', name: 'Visa Inc.', exchange: 'NYSE', marketCap: 560000000000, sector: 'Financial Services', industry: 'Credit Services', isActive: true },
  { ticker: 'MA', name: 'Mastercard Incorporated', exchange: 'NYSE', marketCap: 450000000000, sector: 'Financial Services', industry: 'Credit Services', isActive: true },
  { ticker: 'BAC', name: 'Bank of America Corporation', exchange: 'NYSE', marketCap: 320000000000, sector: 'Financial Services', industry: 'Banks - Diversified', isActive: true },
  { ticker: 'WFC', name: 'Wells Fargo & Company', exchange: 'NYSE', marketCap: 200000000000, sector: 'Financial Services', industry: 'Banks - Diversified', isActive: true },
  { ticker: 'MS', name: 'Morgan Stanley', exchange: 'NYSE', marketCap: 170000000000, sector: 'Financial Services', industry: 'Capital Markets', isActive: true },
  { ticker: 'GS', name: 'The Goldman Sachs Group, Inc.', exchange: 'NYSE', marketCap: 165000000000, sector: 'Financial Services', industry: 'Capital Markets', isActive: true },
  { ticker: 'BLK', name: 'BlackRock, Inc.', exchange: 'NYSE', marketCap: 145000000000, sector: 'Financial Services', industry: 'Asset Management', isActive: true },
  { ticker: 'AXP', name: 'American Express Company', exchange: 'NYSE', marketCap: 190000000000, sector: 'Financial Services', industry: 'Credit Services', isActive: true },
  { ticker: 'PYPL', name: 'PayPal Holdings, Inc.', exchange: 'NASDAQ', marketCap: 78000000000, sector: 'Financial Services', industry: 'Credit Services', isActive: true },

  // Consumer & Retail
  { ticker: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', marketCap: 640000000000, sector: 'Consumer Defensive', industry: 'Discount Stores', isActive: true },
  { ticker: 'COST', name: 'Costco Wholesale Corporation', exchange: 'NASDAQ', marketCap: 395000000000, sector: 'Consumer Defensive', industry: 'Discount Stores', isActive: true },
  { ticker: 'PG', name: 'The Procter & Gamble Company', exchange: 'NYSE', marketCap: 400000000000, sector: 'Consumer Defensive', industry: 'Household & Personal Products', isActive: true },
  { ticker: 'HD', name: 'The Home Depot, Inc.', exchange: 'NYSE', marketCap: 390000000000, sector: 'Consumer Cyclical', industry: 'Home Improvement Retail', isActive: true },
  { ticker: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE', marketCap: 300000000000, sector: 'Consumer Defensive', industry: 'Beverages', isActive: true },
  { ticker: 'PEP', name: 'PepsiCo, Inc.', exchange: 'NASDAQ', marketCap: 235000000000, sector: 'Consumer Defensive', industry: 'Beverages', isActive: true },
  { ticker: 'MCD', name: "McDonald's Corporation", exchange: 'NYSE', marketCap: 215000000000, sector: 'Consumer Cyclical', industry: 'Restaurants', isActive: true },
  { ticker: 'NKE', name: 'NIKE, Inc.', exchange: 'NYSE', marketCap: 130000000000, sector: 'Consumer Cyclical', industry: 'Footwear & Accessories', isActive: true },
  { ticker: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE', marketCap: 175000000000, sector: 'Communication Services', industry: 'Entertainment', isActive: true },
  { ticker: 'SBUX', name: 'Starbucks Corporation', exchange: 'NASDAQ', marketCap: 110000000000, sector: 'Consumer Cyclical', industry: 'Restaurants', isActive: true },
  { ticker: 'TGT', name: 'Target Corporation', exchange: 'NYSE', marketCap: 70000000000, sector: 'Consumer Defensive', industry: 'Discount Stores', isActive: true },
  { ticker: 'BKNG', name: 'Booking Holdings Inc.', exchange: 'NASDAQ', marketCap: 145000000000, sector: 'Consumer Cyclical', industry: 'Travel Services', isActive: true },
  { ticker: 'ABNB', name: 'Airbnb, Inc.', exchange: 'NASDAQ', marketCap: 82000000000, sector: 'Consumer Cyclical', industry: 'Travel Services', isActive: true },

  // Energy & Industrials
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE', marketCap: 470000000000, sector: 'Energy', industry: 'Oil & Gas Integrated', isActive: true },
  { ticker: 'CVX', name: 'Chevron Corporation', exchange: 'NYSE', marketCap: 275000000000, sector: 'Energy', industry: 'Oil & Gas Integrated', isActive: true },
  { ticker: 'CAT', name: 'Caterpillar Inc.', exchange: 'NYSE', marketCap: 185000000000, sector: 'Industrials', industry: 'Farm & Heavy Machinery', isActive: true },
  { ticker: 'GE', name: 'General Electric Company', exchange: 'NYSE', marketCap: 200000000000, sector: 'Industrials', industry: 'Specialty Industrial Machinery', isActive: true },
  { ticker: 'BA', name: 'The Boeing Company', exchange: 'NYSE', marketCap: 95000000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'RTX', name: 'RTX Corporation', exchange: 'NYSE', marketCap: 160000000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'LMT', name: 'Lockheed Martin Corporation', exchange: 'NYSE', marketCap: 135000000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'UNP', name: 'Union Pacific Corporation', exchange: 'NYSE', marketCap: 145000000000, sector: 'Industrials', industry: 'Railroads', isActive: true },
  { ticker: 'DE', name: 'Deere & Company', exchange: 'NYSE', marketCap: 110000000000, sector: 'Industrials', industry: 'Farm & Heavy Machinery', isActive: true },

  // Mid Caps & High Beta / Tech
  { ticker: 'SOFI', name: 'SoFi Technologies, Inc.', exchange: 'NASDAQ', marketCap: 9500000000, sector: 'Financial Services', industry: 'Credit Services', isActive: true },
  { ticker: 'RIVN', name: 'Rivian Automotive, Inc.', exchange: 'NASDAQ', marketCap: 11500000000, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', isActive: true },
  { ticker: 'LCID', name: 'Lucid Group, Inc.', exchange: 'NASDAQ', marketCap: 7800000000, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', isActive: true },
  { ticker: 'AFRM', name: 'Affirm Holdings, Inc.', exchange: 'NASDAQ', marketCap: 13500000000, sector: 'Technology', industry: 'Software - Infrastructure', isActive: true },
  { ticker: 'ROKU', name: 'Roku, Inc.', exchange: 'NASDAQ', marketCap: 10200000000, sector: 'Communication Services', industry: 'Entertainment', isActive: true },
  { ticker: 'SNAP', name: 'Snap Inc.', exchange: 'NYSE', marketCap: 18000000000, sector: 'Communication Services', industry: 'Internet Content', isActive: true },
  { ticker: 'PINS', name: 'Pinterest, Inc.', exchange: 'NYSE', marketCap: 22000000000, sector: 'Communication Services', industry: 'Internet Content', isActive: true },
  { ticker: 'BABA', name: 'Alibaba Group Holding Limited', exchange: 'NYSE', marketCap: 230000000000, sector: 'Consumer Cyclical', industry: 'Internet Retail', isActive: true },
  { ticker: 'PDD', name: 'PDD Holdings Inc.', exchange: 'NASDAQ', marketCap: 170000000000, sector: 'Consumer Cyclical', industry: 'Internet Retail', isActive: true },
  { ticker: 'JD', name: 'JD.com, Inc.', exchange: 'NASDAQ', marketCap: 52000000000, sector: 'Consumer Cyclical', industry: 'Internet Retail', isActive: true },
  { ticker: 'NIO', name: 'NIO Inc.', exchange: 'NYSE', marketCap: 9500000000, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', isActive: true },
  { ticker: 'LI', name: 'Li Auto Inc.', exchange: 'NASDAQ', marketCap: 24000000000, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', isActive: true },
  { ticker: 'XPEV', name: 'XPeng Inc.', exchange: 'NYSE', marketCap: 11000000000, sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', isActive: true },
  { ticker: 'MARA', name: 'MARA Holdings, Inc.', exchange: 'NASDAQ', marketCap: 4500000000, sector: 'Financial Services', industry: 'Capital Markets', isActive: true },
  { ticker: 'RIOT', name: 'Riot Platforms, Inc.', exchange: 'NASDAQ', marketCap: 2800000000, sector: 'Financial Services', industry: 'Capital Markets', isActive: true },
  { ticker: 'HOOD', name: 'Robinhood Markets, Inc.', exchange: 'NASDAQ', marketCap: 21000000000, sector: 'Financial Services', industry: 'Capital Markets', isActive: true },
  { ticker: 'DKNG', name: 'DraftKings Inc.', exchange: 'NASDAQ', marketCap: 19500000000, sector: 'Consumer Cyclical', industry: 'Gambling', isActive: true },
  { ticker: 'MSTR', name: 'MicroStrategy Incorporated', exchange: 'NASDAQ', marketCap: 38000000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'PATH', name: 'UiPath Inc.', exchange: 'NYSE', marketCap: 7200000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'AI', name: 'C3.ai, Inc.', exchange: 'NYSE', marketCap: 3100000000, sector: 'Technology', industry: 'Software', isActive: true },
  { ticker: 'UPST', name: 'Upstart Holdings, Inc.', exchange: 'NASDAQ', marketCap: 3400000000, sector: 'Financial Services', industry: 'Credit Services', isActive: true },
  // Defense & Aerospace Giants (NOC, AVAV, GD, LHX, etc.)
  { ticker: 'NOC', name: 'Northrop Grumman Corporation', exchange: 'NYSE', marketCap: 72000000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'AVAV', name: 'AeroVironment, Inc.', exchange: 'NASDAQ', marketCap: 5500000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'GD', name: 'General Dynamics Corporation', exchange: 'NYSE', marketCap: 81000000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'LHX', name: 'L3Harris Technologies, Inc.', exchange: 'NYSE', marketCap: 46000000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'TDG', name: 'TransDigm Group Incorporated', exchange: 'NYSE', marketCap: 76000000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'HEI', name: 'HEICO Corporation', exchange: 'NYSE', marketCap: 31000000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'KTOS', name: 'Kratos Defense & Security Solutions, Inc.', exchange: 'NASDAQ', marketCap: 3200000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'TXT', name: 'Textron Inc.', exchange: 'NYSE', marketCap: 17500000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'HII', name: 'Huntington Ingalls Industries, Inc.', exchange: 'NYSE', marketCap: 11000000000, sector: 'Industrials', industry: 'Aerospace & Defense', isActive: true },
  { ticker: 'LDOS', name: 'Leidos Holdings, Inc.', exchange: 'NYSE', marketCap: 22000000000, sector: 'Technology', industry: 'Information Technology Services', isActive: true },

  // Key Index ETFs
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE', marketCap: 560000000000, sector: 'ETF', industry: 'Index Fund', isActive: true },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', marketCap: 290000000000, sector: 'ETF', industry: 'Index Fund', isActive: true },
  { ticker: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSE', marketCap: 72000000000, sector: 'ETF', industry: 'Index Fund', isActive: true }
];

export async function findStockInUniverse(query: string): Promise<StockMeta[]> {
  const q = query.trim().toUpperCase();
  if (!q) return STOCK_UNIVERSE.slice(0, 20);

  // 1. Local universe match
  const matches = STOCK_UNIVERSE.filter(s => 
    s.ticker.toUpperCase().includes(q) || 
    s.name.toUpperCase().includes(q) ||
    s.sector.toUpperCase().includes(q)
  );

  // 2. Query live financial market autocomplete to dynamically discover ANY US Stock or ETF
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const quotes = data?.quotes || [];
      for (const item of quotes) {
        if (!item.symbol || item.symbol.includes('.') || item.symbol.includes('-USD') || item.symbol.includes('=')) {
          continue;
        }
        if (item.quoteType !== 'EQUITY' && item.quoteType !== 'ETF') continue;

        const sym = item.symbol.toUpperCase();
        let existing = STOCK_UNIVERSE.find(s => s.ticker.toUpperCase() === sym);
        if (!existing) {
          existing = {
            ticker: sym,
            name: item.longname || item.shortname || sym,
            exchange: item.exchDisp === 'NASDAQ' ? 'NASDAQ' : 'NYSE',
            marketCap: 20000000000,
            sector: item.sector || item.sectorDisp || (item.quoteType === 'ETF' ? 'ETF' : 'Industrials'),
            industry: item.industry || item.industryDisp || 'Public Equity',
            isActive: true
          };
          STOCK_UNIVERSE.push(existing);
        }

        if (!matches.some(m => m.ticker === sym)) {
          matches.push(existing);
        }
      }
    }
  } catch (err) {
    // If online search network fails, proceed with local matches or ticker fallback
  }

  // 3. Fallback: If query looks like a valid US stock ticker (1-5 uppercase chars) and not yet found, register it
  if (matches.length === 0 && /^[A-Z]{1,5}$/.test(q)) {
    const fallbackMeta: StockMeta = {
      ticker: q,
      name: `${q} Corporation`,
      exchange: 'NASDAQ',
      marketCap: 15000000000,
      sector: 'General',
      industry: 'Public Company',
      isActive: true
    };
    STOCK_UNIVERSE.push(fallbackMeta);
    matches.push(fallbackMeta);
  }

  return matches;
}

export function getStockMeta(ticker: string): StockMeta | undefined {
  const norm = ticker.trim().toUpperCase();
  const normDash = norm.replace('.', '-');
  const normDot = norm.replace('-', '.');

  // 1. Check SQLite master instrument database first
  try {
    const dbInst = universeDb.getInstrumentByTicker(norm) ||
      universeDb.getInstrumentByTicker(normDash) ||
      universeDb.getInstrumentByTicker(normDot);

    if (dbInst) {
      const sectorMeta = resolveStockSectorMeta(norm, dbInst.sector, dbInst.industry, dbInst.companyName);
      return {
        ticker: dbInst.ticker,
        name: dbInst.companyName,
        exchange: (dbInst.primaryExchange === 'NYSE' ? 'NYSE' : 'NASDAQ') as any,
        marketCap: dbInst.marketCap || 25000000000,
        sector: sectorMeta.sectorZh,
        industry: sectorMeta.industryZh || dbInst.industry || 'Public Company',
        isActive: dbInst.active
      };
    }
  } catch {
    // universeDb not ready yet
  }

  // 2. Check official S&P 500 & Nasdaq 100 benchmark constituents (covers DHR, TMO, etc.)
  const officialItem = OFFICIAL_SP500_CONSTITUENTS.find(c => c.ticker === norm) ||
    OFFICIAL_NASDAQ100_CONSTITUENTS.find(c => c.ticker === norm);
  if (officialItem) {
    const sectorMeta = resolveStockSectorMeta(norm, officialItem.sector, officialItem.industry, officialItem.name);
    return {
      ticker: officialItem.ticker,
      name: officialItem.name,
      exchange: (officialItem.exchange === 'NYSE' ? 'NYSE' : 'NASDAQ') as any,
      marketCap: 60000000000,
      sector: sectorMeta.sectorZh,
      industry: sectorMeta.industryZh || officialItem.industry,
      isActive: true
    };
  }

  // 3. Check local STOCK_UNIVERSE
  let found = STOCK_UNIVERSE.find(s => s.ticker.toUpperCase() === norm || s.ticker.toUpperCase() === normDash);
  if (found) {
    const sectorMeta = resolveStockSectorMeta(norm, found.sector, found.industry, found.name);
    return {
      ...found,
      sector: sectorMeta.sectorZh,
      industry: sectorMeta.industryZh || found.industry
    };
  }

  // 4. Dynamic discovery with smart sector deduction
  if (/^[A-Z0-9.-]{1,7}$/.test(norm)) {
    const sectorMeta = resolveStockSectorMeta(norm);
    found = {
      ticker: norm,
      name: `${norm} Corporation`,
      exchange: norm.length <= 3 ? 'NYSE' : 'NASDAQ',
      marketCap: 20000000000,
      sector: sectorMeta.sectorZh,
      industry: sectorMeta.industryZh || 'Public Company',
      isActive: true
    };
    STOCK_UNIVERSE.push(found);
    return found;
  }

  return undefined;
}

let sharedWatchlist: string[] = ['NVDA', 'AAPL', 'TSLA', 'AMD', 'PLTR'];

export function getUserWatchlist(): string[] {
  if (universeDb.isInitialized()) {
    try {
      const dbList = universeDb.getWatchlist();
      if (dbList !== null && dbList !== undefined) {
        sharedWatchlist = dbList;
      }
    } catch (e) {
      console.warn('[Watchlist] Failed to read from universeDb:', e);
    }
  }
  return [...sharedWatchlist];
}

export function setUserWatchlist(list: string[]): void {
  sharedWatchlist = [...list];
  if (universeDb.isInitialized()) {
    try {
      universeDb.setWatchlist(list);
    } catch (e) {
      console.warn('[Watchlist] Failed to persist to universeDb:', e);
    }
  }
}

export function addToWatchlist(ticker: string): string[] {
  const norm = ticker?.toUpperCase()?.trim();
  if (norm) {
    if (!sharedWatchlist.includes(norm)) {
      sharedWatchlist.push(norm);
    }
    if (universeDb.isInitialized()) {
      try {
        universeDb.addToWatchlist(norm);
      } catch (e) {
        console.warn('[Watchlist] Failed to persist addToWatchlist:', e);
      }
    }
  }
  return [...sharedWatchlist];
}

export function removeFromWatchlist(ticker: string): string[] {
  const norm = ticker?.toUpperCase()?.trim();
  if (norm) {
    sharedWatchlist = sharedWatchlist.filter(t => t !== norm);
    if (universeDb.isInitialized()) {
      try {
        universeDb.removeFromWatchlist(norm);
      } catch (e) {
        console.warn('[Watchlist] Failed to persist removeFromWatchlist:', e);
      }
    }
  }
  return [...sharedWatchlist];
}
