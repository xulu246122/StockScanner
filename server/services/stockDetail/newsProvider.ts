import { StockNewsAndEventsData, DataBlock, StockNewsItem, CorporateEventItem } from '../../types.ts';

interface CacheEntry {
  data: DataBlock<StockNewsAndEventsData>;
  expiresAt: number;
}

export function classifyNewsText(title: string, summary: string, categoryHint = ''): Pick<StockNewsItem, 'sentiment' | 'sentimentLabel' | 'sentimentScore' | 'impactFactor'> {
  const text = `${title} ${summary} ${categoryHint}`.toLowerCase();
  const positive = ['beats', 'beat estimates', 'surges', 'rises', 'record revenue', 'raises guidance', 'upgrade', 'approval', 'wins contract'];
  const negative = ['misses', 'missed estimates', 'falls', 'drops', 'cuts guidance', 'downgrade', 'lawsuit', 'investigation', 'recall', 'layoff'];
  const positiveHits = positive.filter(term => text.includes(term)).length;
  const negativeHits = negative.filter(term => text.includes(term)).length;
  const score = positiveHits === negativeHits ? 0 : Math.sign(positiveHits - negativeHits) * Math.min(100, 35 + Math.abs(positiveHits - negativeHits) * 20);
  const combined = `${text} ${categoryHint}`;
  const category = /earnings|quarterly results|10-q|10-k|eps|revenue|financial results/.test(combined) ? 'Earnings'
    : /dividend|ex-dividend/.test(combined) ? 'Dividend'
    : /split|reverse split/.test(combined) ? 'Stock split'
    : /product launch|launches|unveils|introduces/.test(combined) ? 'Product'
    : /conference|investor day|presentation/.test(combined) ? 'Conference'
    : /lawsuit|litigation|investigation|sec charges|regulatory|settlement/.test(combined) ? 'Legal / Regulatory'
    : /merger|acquisition|acquires|buyout|takeover/.test(combined) ? 'M&A'
    : /analyst|price target|upgrade|downgrade|rating/.test(combined) ? 'Analyst'
    : /ceo|chief executive|resigns|appointed|management/.test(combined) ? 'Management'
    : 'Corporate';
  const sentiment: StockNewsItem['sentiment'] = category === 'Legal / Regulatory' || (category === 'Earnings' && score < 0) ? 'ALERT' : score > 0 ? 'BULLISH' : score < 0 ? 'BEARISH' : 'NEUTRAL';
  return {
    sentiment,
    sentimentLabel: `${sentiment === 'BULLISH' ? '偏正面' : sentiment === 'BEARISH' ? '偏负面' : sentiment === 'ALERT' ? '事件提醒' : '中性'} · 本地规则分类`,
    sentimentScore: score,
    impactFactor: `${category} · 规则分类`
  };
}

export class NewsProvider {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 Minutes TTL

  public async getNewsAndEvents(ticker: string): Promise<DataBlock<StockNewsAndEventsData>> {
    const symbol = ticker.toUpperCase().trim();
    const cached = this.cache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const sourceResults = await Promise.all([
      this.fetchFinnhubNews(symbol).catch(error => ({ news: [] as StockNewsItem[], events: [] as CorporateEventItem[], error: `Finnhub: ${this.errorMessage(error)}` })),
      this.fetchSecFilings(symbol).catch(error => ({ news: [] as StockNewsItem[], events: [] as CorporateEventItem[], error: `SEC EDGAR: ${this.errorMessage(error)}` })),
      this.fetchYahooRss(symbol).catch(error => ({ news: [] as StockNewsItem[], events: [] as CorporateEventItem[], error: `Yahoo RSS: ${this.errorMessage(error)}` }))
    ]);

    const allNews = sourceResults.flatMap(result => result.news);
    const newsByIdentity = new Map<string, StockNewsItem>();
    for (const item of allNews) {
      const identity = item.url || `${item.titleZh.toLowerCase()}|${item.timestamp}`;
      if (!newsByIdentity.has(identity)) newsByIdentity.set(identity, item);
    }
    const news = Array.from(newsByIdentity.values()).sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);

    const eventsByIdentity = new Map<string, CorporateEventItem>();
    for (const event of sourceResults.flatMap(result => result.events)) {
      if (!eventsByIdentity.has(event.id)) eventsByIdentity.set(event.id, event);
    }
    const events = Array.from(eventsByIdentity.values()).sort((a, b) => b.date.localeCompare(a.date));
    const now = new Date().toISOString();
    const sources = Array.from(new Set(news.map(item => item.source)));
    const hasData = news.length > 0 || events.length > 0;
    const errors = sourceResults.map(result => 'error' in result ? result.error : undefined).filter((value): value is string => Boolean(value));
    const block: DataBlock<StockNewsAndEventsData> = {
      status: hasData ? 'success' : 'UNAVAILABLE',
      data: hasData ? { news, events } : null,
      error: hasData ? (errors.length ? `Some sources unavailable: ${errors.join('; ')}` : null) : errors.join('; ') || 'No company news or SEC filings were returned by configured sources.',
      isMock: false,
      isStale: false,
      updatedAt: hasData ? now : null,
      source: sources.length ? sources.join(', ') : 'UNAVAILABLE'
    };
    this.cache.set(symbol, { data: block, expiresAt: Date.now() + this.TTL_MS });
    return block;
  }

  private async fetchFinnhubNews(symbol: string): Promise<{ news: StockNewsItem[]; events: CorporateEventItem[]; error?: string }> {
    const apiKey = process.env.FINNHUB_API_KEY?.trim();
    if (!apiKey) return { news: [], events: [], error: 'FINNHUB_API_KEY is not configured' };
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}&token=${encodeURIComponent(apiKey)}`;
    const payload = await this.fetchJson<any[]>(url);
    const news = (Array.isArray(payload) ? payload : []).map(item => {
      const title = this.cleanText(item?.headline || '');
      const summary = this.cleanText(item?.summary || '');
      const timestamp = Number(item?.datetime) * 1000;
      if (!title || !Number.isFinite(timestamp) || timestamp <= 0) return null;
      return this.makeNews({ id: `finnhub-${item.id ?? this.hash(title)}`, title, summary, source: `Finnhub${item.source ? ` · ${this.cleanText(item.source)}` : ''}`, timestamp, url: this.safeUrl(item.url), categoryHint: item.category });
    }).filter((item): item is StockNewsItem => item !== null);
    return { news, events: [] };
  }

  private async fetchSecFilings(symbol: string): Promise<{ news: StockNewsItem[]; events: CorporateEventItem[]; error?: string }> {
    const userAgent = process.env.SEC_USER_AGENT?.trim();
    if (!userAgent) return { news: [], events: [], error: 'SEC_USER_AGENT is not configured' };
    const tickerResponse = await this.fetchJson<Record<string, { cik_str: number; ticker: string }>>('https://www.sec.gov/files/company_tickers.json', { 'User-Agent': userAgent });
    const match = Object.values(tickerResponse).find(entry => entry.ticker.toUpperCase() === symbol);
    if (!match) return { news: [], events: [], error: `SEC CIK not found for ${symbol}` };
    const cik = String(match.cik_str).padStart(10, '0');
    const submissions = await this.fetchJson<any>(`https://data.sec.gov/submissions/CIK${cik}.json`, { 'User-Agent': userAgent });
    const recent = submissions?.filings?.recent;
    if (!recent || !Array.isArray(recent.form)) return { news: [], events: [] };
    const news: StockNewsItem[] = [];
    const events: CorporateEventItem[] = [];
    for (let index = 0; index < recent.form.length && news.length < 20; index++) {
      const form = String(recent.form[index] || '');
      if (!['8-K', '10-Q', '10-K', 'DEF 14A', 'SC 13D', 'SC 13G', '4'].includes(form)) continue;
      const filed = String(recent.filingDate?.[index] || '');
      const accession = String(recent.accessionNumber?.[index] || '').replace(/-/g, '');
      const document = String(recent.primaryDocument?.[index] || '');
      const description = this.cleanText(recent.primaryDocDescription?.[index] || form);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(filed) || !accession) continue;
      const title = `${symbol} SEC ${form} filing${description && description !== form ? `: ${description}` : ''}`;
      const url = document ? `https://www.sec.gov/Archives/edgar/data/${match.cik_str}/${accession}/${encodeURIComponent(document)}` : `https://www.sec.gov/Archives/edgar/data/${match.cik_str}/${accession}/`;
      const filingEvent = this.makeEvent(symbol, title, filed, form, url);
      news.push(this.makeNews({ id: `sec-${accession}`, title, summary: `${form} filing submitted to the U.S. Securities and Exchange Commission.`, source: 'SEC EDGAR', timestamp: Date.parse(`${filed}T12:00:00Z`), url, categoryHint: form }));
      if (filingEvent) events.push(filingEvent);
    }
    return { news, events };
  }

  private async fetchYahooRss(symbol: string): Promise<{ news: StockNewsItem[]; events: CorporateEventItem[] }> {
    const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
    const xml = await this.fetchText(url);
    const news: StockNewsItem[] = [];
    const events: CorporateEventItem[] = [];
    for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
      const item = match[1];
      const title = this.cleanText(this.xmlTag(item, 'title'));
      const summary = this.cleanText(this.xmlTag(item, 'description'));
      const link = this.safeUrl(this.xmlTag(item, 'link'));
      const dateValue = this.xmlTag(item, 'pubDate');
      const timestamp = Date.parse(dateValue);
      if (!title || !Number.isFinite(timestamp)) continue;
      news.push(this.makeNews({ id: `yahoo-${this.hash(link || title)}`, title, summary, source: 'Yahoo Finance RSS', timestamp, url: link }));
      const event = this.makeEvent(symbol, title, new Date(timestamp).toISOString().slice(0, 10), 'Yahoo Finance RSS', link);
      if (event) events.push(event);
    }
    return { news, events };
  }

  private makeNews(input: { id: string; title: string; summary: string; source: string; timestamp: number; url?: string; categoryHint?: string }): StockNewsItem {
    const classification = classifyNewsText(input.title, input.summary, input.categoryHint);
    return { id: input.id, titleZh: input.title, summaryZh: input.summary || '来源未提供摘要。', source: input.source, publishedAt: new Date(input.timestamp).toISOString(), timestamp: input.timestamp, ...classification, ...(input.url ? { url: input.url } : {}) };
  }

  private makeEvent(symbol: string, title: string, date: string, form: string, url?: string): CorporateEventItem | null {
    const text = `${title} ${form}`.toLowerCase();
    let type: CorporateEventItem['type'] | null = null;
    if (/earnings|quarterly results|10-q|10-k/.test(text)) type = 'EARNINGS';
    else if (/dividend/.test(text)) type = 'DIVIDEND';
    else if (/stock split|reverse split/.test(text)) type = 'SPLIT';
    else if (/product launch|unveils|introduces/.test(text)) type = 'PRODUCT_LAUNCH';
    else if (/conference|investor day/.test(text)) type = 'CONFERENCE';
    if (!type) return null;
    const labels: Record<CorporateEventItem['type'], string> = { EARNINGS: '财报申报', DIVIDEND: '股息公告', SPLIT: '拆股公告', PRODUCT_LAUNCH: '产品公告', CONFERENCE: '会议公告' };
    const isUpcoming = Date.parse(date) > Date.now();
    return { id: `event-${symbol}-${form}-${date}-${this.hash(title)}`, type, typeLabelZh: labels[type], titleZh: title, date, details: `${form} · SEC / ${url ? '查看申报文件' : '公开披露'}`, isUpcoming };
  }

  private async fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
    const response = await this.fetch(url, headers);
    return await response.json() as T;
  }

  private async fetchText(url: string): Promise<string> {
    return this.fetch(url, { Accept: 'application/rss+xml, application/xml, text/xml, */*' }).then(response => response.text());
  }

  private async fetch(url: string, headers: Record<string, string>): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 V6.5 Stock Scanner', ...headers } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } finally { clearTimeout(timeout); }
  }

  private xmlTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return this.decodeXml(match?.[1] || '');
  }

  private decodeXml(value: string): string {
    return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
  }

  private cleanText(value: unknown): string { return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
  private safeUrl(value: unknown): string | undefined { try { const url = new URL(String(value)); return url.protocol === 'https:' ? url.toString() : undefined; } catch { return undefined; } }
  private hash(value: string): string { let hash = 0; for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0; return Math.abs(hash).toString(36); }
  private errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
}

export const newsProvider = new NewsProvider();
