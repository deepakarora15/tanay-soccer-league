import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { dbAll } from '../db';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const period = (req.query.period as string) || 'overall';

    let dateFilter = '';
    const now = new Date();

    if (period === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      dateFilter = ` AND m.resultConfirmedAt >= '${todayStart}'`;
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      dateFilter = ` AND m.resultConfirmedAt >= '${weekAgo}'`;
    } else if (period === 'lastMatch') {
      // Get the most recently completed match
      const lastMatch = await dbAll("SELECT id, homeTeam, awayTeam, homeScore, awayScore FROM Match WHERE status = 'completed' ORDER BY resultConfirmedAt DESC LIMIT 1");
      if (lastMatch.length > 0) {
        dateFilter = ` AND p.matchId = '${lastMatch[0].id}'`;
        // We'll attach match info and predictions to the response
        (req as any).lastMatchInfo = lastMatch[0];
      } else {
        res.json({ entries: [], currentPlayer: { rank: 1, playerId, displayName: 'You', totalPoints: 0, accuracy: null, exactPredictions: 0, correctOutcomes: 0 } });
        return;
      }
    }

    // Get all active users first
    const allUsers = await dbAll("SELECT id as playerId, displayName FROM User WHERE status = 'active'");

    // Get scores for the selected period
    const scoredPlayers = await dbAll(
      `SELECT p.playerId,
              COALESCE(SUM(p.pointsAwarded), 0) as totalPoints,
              COUNT(CASE WHEN p.pointsAwarded = 3 THEN 1 END) as exactPredictions,
              COUNT(CASE WHEN p.pointsAwarded >= 1 THEN 1 END) as correctOutcomes,
              COUNT(p.id) as scoredPredictions
       FROM Prediction p
       INNER JOIN Match m ON p.matchId = m.id
       WHERE 1=1${dateFilter}
       GROUP BY p.playerId`
    );

    const scoreMap: Record<string, any> = {};
    for (const s of scoredPlayers) {
      scoreMap[s.playerId] = s;
    }

    // Merge: all users + their scores for the period
    const entries = allUsers.map((u: any, i: number) => {
      const s = scoreMap[u.playerId] || { totalPoints: 0, exactPredictions: 0, correctOutcomes: 0, scoredPredictions: 0 };
      return {
        rank: 0,
        playerId: u.playerId,
        displayName: u.displayName,
        totalPoints: s.totalPoints || 0,
        accuracy: s.scoredPredictions > 0 ? Math.round((s.correctOutcomes / s.scoredPredictions) * 1000) / 10 : null,
        exactPredictions: s.exactPredictions || 0,
        correctOutcomes: s.correctOutcomes || 0,
      };
    }).sort((a: any, b: any) => b.totalPoints - a.totalPoints || b.exactPredictions - a.exactPredictions);

    // Assign ranks — players with equal points share the same rank
    let currentRank = 1;
    entries.forEach((e: any, i: number) => {
      if (i === 0) {
        e.rank = 1;
      } else if (e.totalPoints === entries[i - 1].totalPoints) {
        e.rank = entries[i - 1].rank; // same rank as previous
      } else {
        e.rank = i + 1;
      }
    });

    // If current player not in list, add them
    const currentPlayer = entries.find((e: any) => e.playerId === playerId) || {
      rank: entries.length + 1, playerId, displayName: 'You', totalPoints: 0,
      accuracy: null, exactPredictions: 0, correctOutcomes: 0,
    };

    // Ensure current player is in entries
    if (!entries.find((e: any) => e.playerId === playerId)) {
      entries.push(currentPlayer);
    }

    // For lastMatch period, include match info and each player's prediction
    let lastMatchData = null;
    if (period === 'lastMatch' && (req as any).lastMatchInfo) {
      const matchInfo = (req as any).lastMatchInfo;
      const predictions = await dbAll(
        "SELECT p.playerId, p.predictedHomeScore, p.predictedAwayScore FROM Prediction WHERE matchId = ?",
        matchInfo.id
      );
      const predMap: Record<string, { home: number; away: number }> = {};
      for (const p of predictions) {
        predMap[p.playerId] = { home: p.predictedHomeScore, away: p.predictedAwayScore };
      }
      // Attach prediction to each entry
      entries.forEach((e: any) => {
        e.prediction = predMap[e.playerId] || null;
      });
      lastMatchData = {
        homeTeam: matchInfo.homeTeam,
        awayTeam: matchInfo.awayTeam,
        homeScore: matchInfo.homeScore,
        awayScore: matchInfo.awayScore,
      };
    }

    res.json({ entries, currentPlayer, lastMatch: lastMatchData });
  } catch (error: any) {
    console.error('Leaderboard error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
