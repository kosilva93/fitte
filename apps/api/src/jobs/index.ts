import cron from 'node-cron';
import { fetchTrends } from './trendFetcher';
import { classifyPendingItems } from './classifyItems';
import { logger } from '../utils/logger';

export function startScheduledJobs(): void {
  // Fetch fashion trends every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running trend fetch job');
    try {
      await fetchTrends();
    } catch (err) {
      logger.error('Trend fetch job failed', { error: err });
    }
  });

  // Classify any wardrobe items stuck in pending/processing (e.g. after server restart)
  cron.schedule('*/5 * * * *', async () => {
    try {
      await classifyPendingItems();
    } catch (err) {
      logger.error('Classify pending items job failed', { error: err });
    }
  });

  logger.info('Scheduled jobs started');
}
