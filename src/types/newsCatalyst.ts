// src/types/newsCatalyst.ts
// Phase Stock-05: News, Events & Catalyst Center Data Specifications

export type NewsCategory =
  | 'Earnings'
  | 'Analyst'
  | 'M&A'
  | 'Product'
  | 'Legal'
  | 'Regulatory'
  | 'Management'
  | 'Macro'
  | 'Other';

export type NewsSentimentLabel = 'Positive' | 'Neutral' | 'Negative';

export interface NewsSentimentAudit {
  source: string;
  timestamp: number;
  provider: string; // e.g. "Finnhub", "Google Finance RSS", "SEC EDGAR", "Yahoo Finance", "Financial Wire"
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string; // ISO 8601 or formatted date
  timestamp: number; // Unix epoch ms
  url: string;
  ticker: string; // Ticker e.g. "NVDA", or "MACRO"
  category: NewsCategory;
  summary?: string;
  sentiment: NewsSentimentLabel;
  sentimentScore: number; // -1.00 to +1.00 (or -100 to +100)
  sentimentAudit: NewsSentimentAudit;
  relatedTickers?: string[];
  impactScore?: number; // 1 - 100
}

export interface NewsVelocityStats {
  past1h: number;
  past6h: number;
  past24h: number;
  past7d: number;
  status: 'SURGE' | 'ELEVATED' | 'NORMAL' | 'QUIET';
  statusLabelZh: string;
  calculatedAt: string;
  ticker?: string;
  hourlyVelocityScore: number; // normalized index 0-100
}

export type CorporateEventCategory =
  | 'Earnings'
  | 'Dividend'
  | 'Split'
  | 'FDA/Regulatory'
  | 'Investor Day'
  | 'Conference'
  | '重大公司事件';

export interface CorporateEvent {
  id: string;
  ticker: string;
  companyName: string;
  eventType: CorporateEventCategory;
  title: string;
  date: string; // YYYY-MM-DD
  time?: 'BMO' | 'AMC' | 'DURING' | string;
  details: string;
  isUpcoming: boolean;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  metrics?: {
    epsEstimate?: number | null;
    epsActual?: number | null;
    revenueEstimateUsd?: number | null;
    revenueActualUsd?: number | null;
    surprisePct?: number | null;
    dividendAmount?: number | null;
    dividendYield?: number | null;
    exDate?: string | null;
    recordDate?: string | null;
    paymentDate?: string | null;
    splitRatio?: string | null;
    regulatoryAgency?: string | null;
    regulatoryStatus?: string | null;
    conferenceName?: string | null;
    speaker?: string | null;
    secFilingType?: '8-K' | '10-Q' | '10-K' | '13D' | 'SC 13D/A' | string | null;
    dealValueUsd?: number | null;
  };
  source: string;
  url?: string;
}

export type CatalystDirection = 'Bullish' | 'Bearish' | 'Neutral';
export type CatalystStrength = 'High' | 'Medium' | 'Low';

export interface CatalystItem {
  id: string;
  ticker: string;
  companyName: string;
  catalystType: string;
  catalystTypeLabelZh: string;
  catalystDirection: CatalystDirection;
  catalystStrength: CatalystStrength;
  strengthScore: number; // 0 - 100
  title: string;
  summary: string;
  empiricalBasis: string; // 客观事件与真实数据支撑，非LLM虚构
  impactHorizon: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM';
  detectedAt: string;
  effectiveDate: string;
  source: string;
  provider: string;
  underlyingEventId?: string;
  underlyingNewsId?: string;
  status: 'ACTIVE' | 'PENDING' | 'REALIZED';
}

export interface NewsStreamResponse {
  total: number;
  news: NewsItem[];
  velocity: NewsVelocityStats;
  sentimentSummary: {
    averageScore: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    positivePct: number;
    neutralPct: number;
    negativePct: number;
    classification: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
    auditedProviders: string[];
    lastEvaluatedAt: string;
  };
  categoriesCount: Record<NewsCategory, number>;
  timestamp: string;
}

export interface NewsTabFilter {
  tab: 'Latest' | 'Earnings' | 'Analyst' | 'Corporate' | 'Macro';
  category?: NewsCategory | 'ALL';
  ticker?: string;
  sentiment?: NewsSentimentLabel | 'ALL';
  limit?: number;
}
