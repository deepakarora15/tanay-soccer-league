import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { dbAll } from '../db';

const router = Router();

router.get('/upcoming', requireAuth, async (req: Request, res: Response) => {
  try {
    const matches = await dbAll(
      "SELECT * FROM Match WHERE status = 'upcoming' ORDER BY scheduledAt ASC"
    );
    res.json(matches);
  } catch (error: any) {
    console.error('Get upcoming error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/live', requireAuth, async (req: Request, res: Response) => {
  try {
    const matches = await dbAll(
      "SELECT * FROM Match WHERE status = 'live' ORDER BY scheduledAt ASC"
    );
    res.json(matches);
  } catch (error: any) {
    console.error('Get live error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/completed', requireAuth, async (req: Request, res: Response) => {
  try {
    const matches = await dbAll(
      "SELECT * FROM Match WHERE status = 'completed' ORDER BY scheduledAt DESC"
    );
    res.json(matches);
  } catch (error: any) {
    console.error('Get completed error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
