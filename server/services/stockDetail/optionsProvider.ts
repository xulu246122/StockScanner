import { OptionsFlowData, DataBlock } from '../../types.ts';

interface CacheEntry {
  data: DataBlock<OptionsFlowData>;
  expiresAt: number;
}

export class OptionsProvider {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 15 * 60 * 1000; // 15 Minutes TTL for Options Flow

  public async getOptionsFlow(ticker: string, currentPrice: number): Promise<DataBlock<OptionsFlowData>> {
    const symbol = ticker.toUpperCase();
    const cached = this.cache.get(symbol);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    throw new Error('DataUnavailableError: Verified options flow data is currently unavailable.');
  }
}

export const optionsProvider = new OptionsProvider();
