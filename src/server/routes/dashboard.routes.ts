import { Router, Request, Response } from 'express';
import { requirePlayer } from '../auth';
import { dbAll, dbGet } from '../db';

const router = Router();

router.get('/', requirePlayer, async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;

    const predictions = await dbAll(
      `SELECT p.id, p.matchId, p.predictedHomeScore, p.predictedAwayScore, p.pointsAwarded, p.submittedAt,
              m.homeTeam, m.awayTeam, m.homeScore as actualHomeScore, m.awayScore as actualAwayScore
       FROM Prediction p
       LEFT JOIN Match m ON p.matchId = m.id
       WHERE p.playerId = ?
       ORDER BY p.submittedAt DESC
       LIMIT 20`,
      playerId
    );

    let totalPoints = 0;
    let scoredCount = 0;
    let correctCount = 0;

    for (const p of predictions) {
      if (p.pointsAwarded !== null) {
        totalPoints += p.pointsAwarded;
        scoredCount++;
        if (p.pointsAwarded >= 1) correctCount++;
      }
    }

    const accuracy = scoredCount > 0 ? Math.round((correctCount / scoredCount) * 1000) / 10 : null;

    res.json({
      totalPoints,
      rank: null,
      accuracy,
      totalPredictions: predictions.length,
      recentPredictions: predictions,
      achievements: [],
    });
  } catch (error: any) {
    console.error('Dashboard error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
