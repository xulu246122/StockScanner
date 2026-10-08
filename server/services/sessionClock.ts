import { MarketStatus, DataQualityTag, DataQuality } from '../types.ts';

export class SessionClock {
  public getMarketStatus(): MarketStatus {
    const now = new Date();
    const nyTimeString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const nyDate = new Date(nyTimeString);

    const dayOfWeek = nyDate.getDay(); // 0 = Sun, 6 = Sat
    const hours = nyDate.getHours();
    const minutes = nyDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let session: MarketStatus['session'] = 'CLOSED';
    let sessionLabel = '休市 (Closed)';
    let isOpen = false;

    if (isWeekend) {
      session = 'WEEKEND';
      sessionLabel = '周末休市 (Weekend)';
    } else {
      if (totalMinutes >= 240 && totalMinutes < 570) {
        session = 'PRE_MARKET';
        sessionLabel = '盘前交易 (Pre-Market)';
      } else if (totalMinutes >= 570 && totalMinutes < 960) {
        session = 'REGULAR';
        sessionLabel = '盘中交易中 (Regular Hours)';
        isOpen = true;
      } else if (totalMinutes >= 960 && totalMinutes < 1200) {
        session = 'AFTER_HOURS';
        sessionLabel = '盘后交易 (After-Hours)';
      } else {
        session = 'CLOSED';
        sessionLabel = '休市 (Closed)';
      }
    }

    const nyFormatted = now.toLocaleString('zh-CN', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' ET';

    return {
      isOpen,
      session,
      sessionLabel,
      nyTime: nyFormatted,
      isHoliday: false,
      dataQuality: 'OK'
    };
  }

  public createDataQualityTag(
    source: string = 'Yahoo Finance Real-Time Market Feed',
    isDelayed: boolean = false,
    quality: DataQuality = 'OK'
  ): DataQualityTag {
    const status = this.getMarketStatus();
    const now = Date.now();
    return {
      source,
      timestamp: now,
      receivedAt: now,
      marketSession: status.session,
      isDelayed,
      isExtendedHours: status.session === 'PRE_MARKET' || status.session === 'AFTER_HOURS',
      dataQuality: quality
    };
  }
}

export const sessionClock = new SessionClock();
