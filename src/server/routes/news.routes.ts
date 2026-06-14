import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { dbAll } from '../db';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const articles = await dbAll(
      `SELECT id, headline, summary, sourceUrl, sourceAttribution, publishedAt, cachedAt
       FROM NewsArticle
       ORDER BY publishedAt DESC
       LIMIT 20`
    );
    res.json({ articles, lastUpdated: articles.length > 0 ? articles[0].cachedAt : null });
  } catch (error: any) {
    console.error('News error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
