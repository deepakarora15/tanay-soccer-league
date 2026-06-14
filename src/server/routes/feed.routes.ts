import { Router, Request, Response } from 'express';
import { requirePlayer } from '../auth';
import { dbAll } from '../db';

const router = Router();

router.get('/', requirePlayer, async (req: Request, res: Response) => {
  try {
    const events = await dbAll(
      'SELECT * FROM FeedEvent ORDER BY occurredAt DESC LIMIT 50'
    );
    res.json({ events });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
