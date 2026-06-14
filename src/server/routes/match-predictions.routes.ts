import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { dbAll, dbGet } from '../db';

const router = Router();

/**
 * GET /:matchId/predictions — returns all players' predictions for a match
 * Only visible once match has started (status = live or completed)
 */
router.get('/:matchId/predictions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    const match = await dbGet(
      'SELECT id, homeTeam, awayTeam, homeScore, awayScore, status, scheduledAt, groupName FROM Match WHERE id = ?',
      matchId
    );

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    // Only show predictions after match has started
    if (match.status === 'upcoming') {
      res.status(403).json({ error: 'Predictions are hidden until match starts' });
      return;
    }

    const predictions = await dbAll(
      `SELECT p.playerId, p.predictedHomeScore, p.predictedAwayScore, p.pointsAwarded, u.displayName
       FROM Prediction p
       LEFT JOIN User u ON p.playerId = u.id
       WHERE p.matchId = ?
       ORDER BY p.pointsAwarded DESC, p.submittedAt ASC`,
      matchId
    );

    res.json({ match, predictions });
  } catch (error: any) {
    console.error('Match predictions error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /history — returns all completed matches with prediction counts
 */
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const matches = await dbAll(
      `SELECT m.id, m.homeTeam, m.awayTeam, m.homeScore, m.awayScore, m.status, m.scheduledAt, m.groupName,
              COUNT(p.id) as predictionCount
       FROM Match m
       LEFT JOIN Prediction p ON m.id = p.matchId
       WHERE m.status IN ('completed', 'live')
       GROUP BY m.id
       ORDER BY m.scheduledAt DESC`
    );
    res.json(matches);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
