import { Router, Request, Response } from 'express';
import { requirePlayer } from '../auth';
import { getPersonalizedFeed } from '../services/feed.service';

const router = Router();

/**
 * GET /
 * Returns personalized feed for the authenticated player.
 */
router.get('/', requirePlayer, (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const feed = getPersonalizedFeed(playerId);
    res.json({ events: feed });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
