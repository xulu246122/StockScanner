import { universeIngestionService } from '../services/universeIngestionService.ts';
import { universeBuilder } from '../services/universeBuilder.ts';
import { logger } from '../services/logger.ts';

export class UniverseSyncWorker {
  private syncTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  async start(): Promise<void> {
    logger.info('UniverseSyncWorker', 'Starting UniverseSyncWorker...');
    try {
      await this.runSync();
    } catch (err: any) {
      logger.error('UniverseSyncWorker', 'Initial universe sync failed:', err);
    }

    // Schedule daily sync (24 hours)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    this.syncTimer = setInterval(async () => {
      try {
        await this.runSync();
      } catch (err: any) {
        logger.error('UniverseSyncWorker', 'Scheduled universe sync failed:', err);
      }
    }, TWENTY_FOUR_HOURS);
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async runSync(): Promise<{ status: string; timestamp: string }> {
    if (this.isRunning) {
      return { status: 'IN_PROGRESS', timestamp: new Date().toISOString() };
    }

    this.isRunning = true;
    logger.info('UniverseSyncWorker', 'Running master database sync & universe rebuild...');
    try {
      await universeIngestionService.initializeUniverse();
      await universeBuilder.buildAllUniverses();
      logger.info('UniverseSyncWorker', 'Sync and rebuild completed successfully.');
      return { status: 'SUCCESS', timestamp: new Date().toISOString() };
    } catch (err: any) {
      logger.error('UniverseSyncWorker', 'UniverseSyncWorker error:', err);
      return { status: 'ERROR', timestamp: new Date().toISOString() };
    } finally {
      this.isRunning = false;
    }
  }
}

export const universeSyncWorker = new UniverseSyncWorker();
