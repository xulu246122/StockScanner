import { DataBlock, FundamentalData, ProvenanceMeta } from '../../types.ts';

interface SecTickerEntry { cik_str: number; ticker: string; title: string; }
interface SecFactUnit { val: number; end?: string; filed?: string; form?: string; accn?: string; }
interface SecFacts { facts?: { usgaap?: Record<string, { units?: Record<string, SecFactUnit[]> }> }; }

const SEC_BASE_URL = 'https://data.sec.gov';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export class SecEdgarProvider {
  private readonly cache = new Map<string, { block: DataBlock<FundamentalData>; expiresAt: number }>();
  private tickerMap: { data: Map<string, string>; expiresAt: number } | null = null;

  public async getFundamentals(ticker: string): Promise<DataBlock<FundamentalData>> {
    const symbol = ticker.toUpperCase().trim();
    const cached = this.cache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.block;
    const userAgent = process.env.SEC_USER_AGENT?.trim() || '';
    if (!userAgent) return this.unavailable('SEC_USER_AGENT 未配置。请在 .env 中设置包含应用名称和联系邮箱的 SEC_USER_AGENT，并重启服务。');
    try {
      const cik = await this.resolveCik(symbol);
      if (!cik) return this.unavailable(`SEC CIK unavailable for ${symbol}`);
      const facts = await this.fetchJson<SecFacts>(`${SEC_BASE_URL}/api/xbrl/companyfacts/CIK${cik}.json`);
      const retrievedAt = new Date().toISOString();
      const provenance: ProvenanceMeta = { source: 'SEC_COMPANYFACTS', classification: 'REAL', timestamp: retrievedAt, retrievedAt, symbol, calculationMethod: 'SEC companyfacts latest reported facts' };
      const block: DataBlock<FundamentalData> = { status: 'success', data: this.mapFacts(facts), isMock: false, isStale: false, updatedAt: retrievedAt, source: 'SEC_COMPANYFACTS', provenance };
      this.cache.set(symbol, { block, expiresAt: Date.now() + CACHE_TTL_MS });
      return block;
    } catch (error) {
      return this.unavailable(error instanceof Error ? error.message : 'SEC request failed');
    }
  }

  private async resolveCik(symbol: string): Promise<string | null> {
    if (!this.tickerMap || this.tickerMap.expiresAt <= Date.now()) {
      const entries = await this.fetchJson<Record<string, SecTickerEntry>>(`${SEC_BASE_URL}/files/company_tickers.json`);
      const map = new Map<string, string>();
      Object.values(entries).forEach(entry => map.set(entry.ticker.toUpperCase(), String(entry.cik_str).padStart(10, '0')));
      this.tickerMap = { data: map, expiresAt: Date.now() + CACHE_TTL_MS };
    }
    return this.tickerMap.data.get(symbol) ?? null;
  }

  private async fetchJson<T>(url: string): Promise<T> {
      const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': process.env.SEC_USER_AGENT?.trim() || '' } });
    if (!response.ok) throw new Error(`SEC HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }

  private mapFacts(facts: SecFacts): FundamentalData {
    const latest = (names: string[], unit = 'USD'): number | null => {
      for (const name of names) {
        const values = facts.facts?.usgaap?.[name]?.units?.[unit];
        const item = values?.filter(value => typeof value.val === 'number').at(-1);
        if (item) return item.val;
      }
      return null;
    };
    const revenue = latest(['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues']);
    const grossProfit = latest(['GrossProfit']);
    const operatingIncome = latest(['OperatingIncomeLoss']);
    const netIncome = latest(['NetIncomeLoss']);
    const assets = latest(['Assets']);
    const equity = latest(['StockholdersEquity']);
    const cash = latest(['CashAndCashEquivalentsAtCarryingValue']);
    const debt = latest(['LongTermDebtNoncurrent']);
    const operatingCashFlow = latest(['NetCashProvidedByUsedInOperatingActivities']);
    const shares = latest(['EntityCommonStockSharesOutstanding', 'CommonStockSharesOutstanding']);
    return {
      valuation: { peRatio: null, forwardPE: null, psRatio: null, pbRatio: null, evToEbitda: null, pegRatio: null, enterpriseValue: null },
      profitability: { grossMargin: revenue && grossProfit !== null ? grossProfit / revenue : null, operatingMargin: revenue && operatingIncome !== null ? operatingIncome / revenue : null, netMargin: revenue && netIncome !== null ? netIncome / revenue : null, roe: equity && netIncome !== null ? netIncome / equity : null, roa: assets && netIncome !== null ? netIncome / assets : null, roic: null },
      balanceSheet: { totalCash: cash, totalDebt: debt, currentRatio: null, quickRatio: null, debtToEquity: debt !== null && equity ? debt / equity : null, bookValuePerShare: equity !== null && shares ? equity / shares : null },
      cashFlow: { operatingCashFlow, freeCashFlow: null, fcfPerShare: null, fcfYield: null },
      dividends: { dividendRate: null, dividendYield: null, payoutRatio: null, exDividendDate: null },
      growth: { revenueGrowthYoy: null, earningsGrowthYoy: null, revenue3yCagr: null }
    };
  }

  private unavailable(reason: string): DataBlock<FundamentalData> {
    const timestamp = new Date().toISOString();
    return { status: 'UNAVAILABLE', data: null, error: reason, isMock: false, isStale: false, updatedAt: null, source: 'UNAVAILABLE', provenance: { source: null, classification: 'UNAVAILABLE', timestamp, reason } };
  }
}

export const secEdgarProvider = new SecEdgarProvider();
