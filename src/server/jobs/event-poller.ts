import cron from 'node-cron';

/**
 * Polls events every 2 minutes.
 * Placeholder — full implementation will come with Task 17.
 */
export function startEventPoller(): cron.ScheduledTask {
  return cron.schedule('*/2 * * * *', async () => {
    try {
      // TODO: Implement event fetching in Task 17
      console.log('[event-poller] Event polling not yet implemented');
    } catch (error) {
      console.error('[event-poller] Error polling events:', error);
    }
  });
}
