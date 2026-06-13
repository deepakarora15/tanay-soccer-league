import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { getNews } from '../services/news.service';

const router = Router();

/**
 * GET /
 * Returns news articles with lastUpdated timestamp.
 * Requires authentication.
 */
router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const result = getNews();
    res.json(result);
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
