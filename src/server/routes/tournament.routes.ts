import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { dbAll, dbGet } from '../db';

const router = Router();

router.get('/standings', requireAuth, async (req: Request, res: Response) => {
  try {
    const tournament = await dbGet("SELECT * FROM Tournament LIMIT 1");
    if (!tournament) { res.status(404).json({ error: 'No tournament found' }); return; }

    const standings = await dbAll(
      `SELECT u.id as playerId, u.displayName,
              COALESCE(SUM(p.pointsAwarded), 0) as totalPoints,
              COUNT(CASE WHEN p.pointsAwarded = 3 THEN 1 END) as exactPredictions,
              COUNT(CASE WHEN p.pointsAwarded >= 1 THEN 1 END) as correctOutcomes
       FROM User u
       LEFT JOIN Prediction p ON u.id = p.playerId
       WHERE u.status = 'active'
       GROUP BY u.id, u.displayName
       ORDER BY totalPoints DESC`
    );

    res.json({ tournament, standings, isCompleted: tournament.status === 'completed', winners: [] });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
