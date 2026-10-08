import { FundamentalData, DataBlock } from '../../types.ts';
import { secEdgarProvider } from './secEdgarProvider.ts';

interface CacheEntry {
  data: DataBlock<FundamentalData>;
  expiresAt: number;
}

export class FundamentalProvider {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 12 * 60 * 60 * 1000; // 12 Hours TTL for Fundamentals

  /**
   * Retrieves verified fundamental data for a given ticker
   */
  public async getFundamentals(ticker: string, _currentPrice: number, _marketCap: number): Promise<DataBlock<FundamentalData>> {
    return secEdgarProvider.getFundamentals(ticker);
  }

  private resolveFundamentalsForSymbol(
    symbol: string,
    sector: string = 'Technology',
    price: number,
    marketCap: number
  ): FundamentalData {
    throw new Error('DataUnavailableError: Verified fundamental data is currently unavailable.');
  }
}

export const fundamentalProvider = new FundamentalProvider();
