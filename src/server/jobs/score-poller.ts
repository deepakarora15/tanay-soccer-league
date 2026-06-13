import cron from 'node-cron';
import { refreshScoresFromAPI } from '../services/scorecard.service';
import db from '../db';

/**
 * Polls live scores every 2 minutes.
 * Fetches the active tournament and refreshes scores from the external API.
 */
export function startScorePoller(): cron.ScheduledTask {
  return cron.schedule('*/2 * * * *', async () => {
    try {
      const tournament = db
        .prepare(`SELECT id FROM Tournament WHERE status = 'active' LIMIT 1`)
        .get() as { id: string } | undefined;

      if (!tournament) {
        return;
      }

      await refreshScoresFromAPI(tournament.id);
    } catch (error) {
      console.error('[score-poller] Error polling scores:', error);
    }
  });
}
