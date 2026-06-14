import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { dbAll, dbRun, dbGet } from '../db';

const API_KEY = '9bb958f7a931446bbd65e253a62dcfcf';
const COMPETITION_ID = '2000';

/**
 * Fetches all matches from football-data.org and adds any new ones (knockout rounds).
 * Runs every 6 hours.
 */
async function fetchNewMatches(): Promise<void> {
  if (!API_KEY) return;

  try {
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${COMPETITION_ID}/matches`,
      { headers: { 'X-Auth-Token': API_KEY } }
    );

    if (!response.ok) {
      console.log(`[schedule-poller] API status ${response.status}`);
      return;
    }

    const data = await response.json();
    const apiMatches = data.matches || [];
    let added = 0;

    for (const ext of apiMatches) {
      const homeTeam = ext.homeTeam?.name;
      const awayTeam = ext.awayTeam?.name;
      if (!homeTeam || !awayTeam || homeTeam === 'null' || awayTeam === 'null') continue;

      // Check if this match already exists
      const existing = await dbAll(
        "SELECT id FROM Match WHERE homeTeam = ? AND awayTeam = ? AND scheduledAt = ?",
        homeTeam, awayTeam, ext.utcDate
      );

      if (existing.length > 0) continue;

      // Map stage
      const stageMap: Record<string, string> = {
        'GROUP_STAGE': 'group',
        'LAST_32': 'round_of_32',
        'LAST_16': 'round_of_16',
        'QUARTER_FINALS': 'quarter_final',
        'SEMI_FINALS': 'semi_final',
        'THIRD_PLACE': 'third_place',
        'FINAL': 'final',
      };
      const stage = stageMap[ext.stage] || 'group';

      // Only add knockout matches (group matches are already seeded)
      if (stage === 'group') continue;

      const id = `match-ko-${uuidv4().slice(0, 8)}`;
      await dbRun(
        `INSERT OR IGNORE INTO Match (id, tournamentId, homeTeam, awayTeam, scheduledAt, homeScore, awayScore, status, stage, groupName, predictionsLocked, resultConfirmedAt, externalId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, 'fifa-wc-2026', homeTeam, awayTeam, ext.utcDate, null, null, 'upcoming', stage, null, 0, null, String(ext.id)
      );
      added++;
      console.log(`[schedule-poller] Added knockout: ${homeTeam} vs ${awayTeam} (${stage})`);
    }

    if (added > 0) console.log(`[schedule-poller] Added ${added} new knockout matches`);
  } catch (error: any) {
    console.error('[schedule-poller] Error:', error.message);
  }
}

export function startSchedulePoller(): cron.ScheduledTask {
  // Fetch on startup
  fetchNewMatches().catch(() => {});

  // Then every 6 hours
  return cron.schedule('0 */6 * * *', async () => {
    await fetchNewMatches();
  });
}
