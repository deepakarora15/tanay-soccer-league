import cron from 'node-cron';
import { fetchScorersFromAPI } from '../routes/scorers.routes';

/**
 * Refreshes top scorers every 30 minutes.
 */
export function startEventPoller(): cron.ScheduledTask {
  // Fetch on startup
  fetchScorersFromAPI().catch(() => {});

  return cron.schedule('*/30 * * * *', async () => {
    try {
      await fetchScorersFromAPI();
    } catch (error: any) {
      console.error('[event-poller] Scorers refresh error:', error.message);
    }
  });
}
