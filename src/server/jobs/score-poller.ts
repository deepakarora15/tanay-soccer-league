import cron from 'node-cron';
import { dbAll, dbRun } from '../db';

const API_KEY = '9bb958f7a931446bbd65e253a62dcfcf';
const COMPETITION_ID = '2000'; // FIFA World Cup

async function pollScores(): Promise<void> {
  try {
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${COMPETITION_ID}/matches?status=LIVE,IN_PLAY,PAUSED,FINISHED`,
      { headers: { 'X-Auth-Token': API_KEY } }
    );

    if (!response.ok) {
      console.log(`[score-poller] API status ${response.status}`);
      return;
    }

    const data = await response.json();
    const matches = data.matches || [];

    for (const ext of matches) {
      const homeTeam = ext.homeTeam?.name;
      const awayTeam = ext.awayTeam?.name;
      if (!homeTeam || !awayTeam) continue;

      const dbMatch = await findMatch(homeTeam, awayTeam);
      if (!dbMatch) continue;

      const homeScore = ext.score?.fullTime?.home ?? ext.score?.halfTime?.home ?? null;
      const awayScore = ext.score?.fullTime?.away ?? ext.score?.halfTime?.away ?? null;
      const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(ext.status);
      const isFinished = ['FINISHED', 'AWARDED'].includes(ext.status);

      // Calculate approximate minute from scheduled time if API doesn't provide it
      let minute = ext.minute || null;
      if (!minute && isLive && ext.utcDate) {
        const kickoff = new Date(ext.utcDate).getTime();
        const elapsed = Math.floor((Date.now() - kickoff) / 60000);
        minute = Math.min(elapsed, 90); // cap at 90
        if (minute < 0) minute = null;
      }

      if (isLive && dbMatch.status === 'upcoming') {
        await dbRun("UPDATE Match SET status = 'live', predictionsLocked = 1, homeScore = ?, awayScore = ?, matchMinute = ? WHERE id = ?", homeScore, awayScore, minute, dbMatch.id);
        console.log(`[score-poller] LIVE: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam} (${minute}')`);
      } else if (isLive) {
        await dbRun("UPDATE Match SET homeScore = ?, awayScore = ?, matchMinute = ?, status = 'live' WHERE id = ?", homeScore, awayScore, minute, dbMatch.id);
      } else if (isFinished && dbMatch.status !== 'completed') {
        await dbRun("UPDATE Match SET status = 'completed', predictionsLocked = 1, homeScore = ?, awayScore = ?, matchMinute = 90, resultConfirmedAt = ? WHERE id = ?", homeScore, awayScore, new Date().toISOString(), dbMatch.id);
        console.log(`[score-poller] FINAL: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`);
        await scorePredictions(dbMatch.id, homeScore, awayScore);
      }
    }
  } catch (error: any) {
    console.error('[score-poller] Error:', error.message);
  }
}

async function findMatch(homeTeam: string, awayTeam: string): Promise<any> {
  // Normalize: remove accents and try various matching
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const h = normalize(homeTeam);
  const a = normalize(awayTeam);

  // Get all non-completed matches
  const allMatches = await dbAll("SELECT id, status, homeTeam, awayTeam FROM Match WHERE status != 'completed'");
  
  // Try to find a match
  for (const m of allMatches) {
    const mh = normalize(m.homeTeam);
    const ma = normalize(m.awayTeam);
    if (mh === h && ma === a) return m;
    // Partial match on first word
    if (h.startsWith(mh.split(' ')[0]) && a.startsWith(ma.split(' ')[0])) return m;
    if (mh.startsWith(h.split(' ')[0]) && ma.startsWith(a.split(' ')[0])) return m;
  }
  
  // Also check completed matches for final score updates
  const completed = await dbAll("SELECT id, status, homeTeam, awayTeam FROM Match");
  for (const m of completed) {
    const mh = normalize(m.homeTeam);
    const ma = normalize(m.awayTeam);
    if (mh === h && ma === a) return m;
    if (h.startsWith(mh.split(' ')[0]) && a.startsWith(ma.split(' ')[0])) return m;
    if (mh.startsWith(h.split(' ')[0]) && ma.startsWith(a.split(' ')[0])) return m;
  }

  return null;
}

async function scorePredictions(matchId: string, homeScore: number, awayScore: number): Promise<void> {
  const predictions = await dbAll("SELECT id, predictedHomeScore, predictedAwayScore FROM Prediction WHERE matchId = ?", matchId);
  for (const pred of predictions) {
    let points = 0;
    if (pred.predictedHomeScore === homeScore && pred.predictedAwayScore === awayScore) {
      points = 3;
    } else {
      const pOutcome = Math.sign(pred.predictedHomeScore - pred.predictedAwayScore);
      const aOutcome = Math.sign(homeScore - awayScore);
      if (pOutcome === aOutcome) points = 1;
    }
    await dbRun("UPDATE Prediction SET pointsAwarded = ? WHERE id = ?", points, pred.id);
  }
}

async function autoLockPastMatches(): Promise<void> {
  const now = new Date().toISOString();
  // Lock predictions for matches past their scheduled time
  await dbRun(
    "UPDATE Match SET predictionsLocked = 1 WHERE status = 'upcoming' AND scheduledAt <= ? AND predictionsLocked = 0",
    now
  );
  // Set matches to 'live' if their scheduled time has passed but they haven't been marked as completed
  await dbRun(
    "UPDATE Match SET status = 'live', predictionsLocked = 1 WHERE status = 'upcoming' AND scheduledAt <= ?",
    now
  );
}

export function startScorePoller(): cron.ScheduledTask {
  autoLockPastMatches().catch(() => {});
  pollScores().catch(() => {});

  // Poll every 1 minute for near-real-time live scores
  return cron.schedule('* * * * *', async () => {
    await autoLockPastMatches();
    await pollScores();
  });
}
