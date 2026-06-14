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
      const lastMatch = await dbAll("SELECT id FROM Match WHERE status = 'completed' ORDER BY resultConfirmedAt DESC LIMIT 1");
      if (lastMatch.length > 0) {
        dateFilter = ` AND p.matchId = '${lastMatch[0].id}'`;
      } else {
        res.json({ entries: [], currentPlayer: { rank: 1, playerId, displayName: 'You', totalPoints: 0, accuracy: null, exactPredictions: 0, correctOutcomes: 0 } });
        return;
      }
    }

    const players = await dbAll(
      `SELECT u.id as playerId, u.displayName,
              COALESCE(SUM(p.pointsAwarded), 0) as totalPoints,
              COUNT(CASE WHEN p.pointsAwarded = 3 THEN 1 END) as exactPredictions,
              COUNT(CASE WHEN p.pointsAwarded >= 1 THEN 1 END) as correctOutcomes,
              COUNT(CASE WHEN p.pointsAwarded IS NOT NULL THEN 1 END) as scoredPredictions
       FROM User u
       INNER JOIN Prediction p ON u.id = p.playerId
       INNER JOIN Match m ON p.matchId = m.id
       WHERE u.status = 'active'${dateFilter}
       GROUP BY u.id, u.displayName
       ORDER BY totalPoints DESC, exactPredictions DESC, correctOutcomes DESC`
    );

    const entries = players.map((p: any, i: number) => ({
      rank: i + 1,
      playerId: p.playerId,
      displayName: p.displayName,
      totalPoints: p.totalPoints || 0,
      accuracy: p.scoredPredictions > 0 ? Math.round((p.correctOutcomes / p.scoredPredictions) * 1000) / 10 : null,
      exactPredictions: p.exactPredictions || 0,
      correctOutcomes: p.correctOutcomes || 0,
    }));

    // If current player not in list, add them
    const currentPlayer = entries.find((e: any) => e.playerId === playerId) || {
      rank: entries.length + 1, playerId, displayName: 'You', totalPoints: 0,
      accuracy: null, exactPredictions: 0, correctOutcomes: 0,
    };

    // Ensure current player is in entries
    if (!entries.find((e: any) => e.playerId === playerId)) {
      entries.push(currentPlayer);
    }

    res.json({ entries, currentPlayer });
  } catch (error: any) {
    console.error('Leaderboard error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
