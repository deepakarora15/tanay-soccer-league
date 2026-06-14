import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { dbAll } from '../db';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;

    // Get all players with their prediction stats
    const players = await dbAll(
      `SELECT u.id as playerId, u.displayName,
              COALESCE(SUM(p.pointsAwarded), 0) as totalPoints,
              COUNT(CASE WHEN p.pointsAwarded = 3 THEN 1 END) as exactPredictions,
              COUNT(CASE WHEN p.pointsAwarded >= 1 THEN 1 END) as correctOutcomes,
              COUNT(CASE WHEN p.pointsAwarded IS NOT NULL THEN 1 END) as scoredPredictions
       FROM User u
       LEFT JOIN Prediction p ON u.id = p.playerId
       WHERE u.status = 'active'
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

    const currentPlayer = entries.find((e: any) => e.playerId === playerId) || {
      rank: entries.length + 1, playerId, displayName: 'You', totalPoints: 0,
      accuracy: null, exactPredictions: 0, correctOutcomes: 0,
    };

    res.json({ entries, currentPlayer });
  } catch (error: any) {
    console.error('Leaderboard error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
