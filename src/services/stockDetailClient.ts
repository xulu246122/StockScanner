import { StockDetailViewModel, Timeframe } from '../types.ts';

export const stockDetailClient = {
  /**
   * Fetches the unified StockDetailViewModel with all 9 dimension data blocks
   */
  async getStockDetail(ticker: string, timeframe: Timeframe = '1D'): Promise<StockDetailViewModel> {
    const res = await fetch(`/api/stocks/${encodeURIComponent(ticker)}/detail?timeframe=${timeframe}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch stock detail model' }));
      throw new Error(err.error || 'Failed to fetch stock detail model');
    }
    return res.json();
  }
};
