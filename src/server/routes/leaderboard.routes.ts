import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { getLeaderboard } from '../services/leaderboard.service';

const router = Router();

/**
 * GET /
 * Returns the leaderboard with the current player highlighted.
 * Query params: ?limit= (default 50)
 */
router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const leaderboard = getLeaderboard(playerId, limit);

    res.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
