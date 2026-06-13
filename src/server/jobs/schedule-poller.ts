import cron from 'node-cron';
import { refreshScheduleFromAPI } from '../services/schedule.service';
import db from '../db';

/**
 * Polls schedule every 30 minutes.
 * Fetches the active tournament and refreshes the match schedule from the external API.
 */
export function startSchedulePoller(): cron.ScheduledTask {
  return cron.schedule('*/30 * * * *', async () => {
    try {
      const tournament = db
        .prepare(`SELECT id FROM Tournament WHERE status = 'active' LIMIT 1`)
        .get() as { id: string } | undefined;

      if (!tournament) {
        return;
      }

      await refreshScheduleFromAPI(tournament.id);
    } catch (error) {
      console.error('[schedule-poller] Error polling schedule:', error);
    }
  });
}
