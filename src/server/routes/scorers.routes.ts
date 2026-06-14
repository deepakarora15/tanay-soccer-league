import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { dbAll, dbRun, dbGet } from '../db';

const API_KEY = '9bb958f7a931446bbd65e253a62dcfcf';
const COMPETITION_ID = '2000';

const router = Router();

/**
 * GET / — returns top scorers from cache or fetches from API
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    // Check if we have cached scorers (refresh every 30 min)
    const cached = await dbAll("SELECT * FROM TopScorers ORDER BY goals DESC, assists DESC LIMIT 20");
    
    if (cached.length > 0) {
      res.json(cached);
      return;
    }

    // Fetch from API
    const scorers = await fetchScorersFromAPI();
    res.json(scorers);
  } catch (error: any) {
    console.error('Scorers error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function fetchScorersFromAPI(): Promise<any[]> {
  if (!API_KEY) return [];

  try {
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${COMPETITION_ID}/scorers?limit=20`,
      { headers: { 'X-Auth-Token': API_KEY } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const scorers = (data.scorers || []).map((s: any, i: number) => ({
      rank: i + 1,
      playerName: s.player?.name || 'Unknown',
      team: s.team?.name || 'Unknown',
      goals: s.goals || 0,
      assists: s.assists || 0,
      matchesPlayed: s.playedMatches || 0,
    }));

    // Cache in DB
    await dbRun("DELETE FROM TopScorers");
    for (const s of scorers) {
      await dbRun(
        "INSERT INTO TopScorers (rank, playerName, team, goals, assists, matchesPlayed, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        s.rank, s.playerName, s.team, s.goals, s.assists, s.matchesPlayed, new Date().toISOString()
      );
    }

    return scorers;
  } catch (e: any) {
    console.error('[scorers] API error:', e.message);
    return [];
  }
}

export default router;
export { fetchScorersFromAPI };
