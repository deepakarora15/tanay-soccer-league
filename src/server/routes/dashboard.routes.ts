import { Router, Request, Response } from 'express';
import { requirePlayer } from '../auth';
import { getDashboardData } from '../services/dashboard.service';

const router = Router();

/**
 * GET /
 * Returns the authenticated player's dashboard data including
 * points, rank, accuracy, recent predictions, and achievements.
 */
router.get('/', requirePlayer, (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const dashboard = getDashboardData(playerId);
    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
