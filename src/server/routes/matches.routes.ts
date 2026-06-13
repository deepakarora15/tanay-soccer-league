import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { getUpcomingMatches } from '../services/schedule.service';
import { getLiveMatches, getCompletedMatches } from '../services/scorecard.service';

const router = Router();

/**
 * GET /upcoming
 * Returns upcoming matches with optional filters.
 * Query params: ?stage=&startDate=&endDate=
 */
router.get('/upcoming', requireAuth, (req: Request, res: Response) => {
  try {
    const stage = req.query.stage as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const matches = getUpcomingMatches({ stage, startDate, endDate });
    res.json(matches);
  } catch (error) {
    console.error('Get upcoming matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /live
 * Returns live matches with current scores.
 */
router.get('/live', requireAuth, (req: Request, res: Response) => {
  try {
    const matches = getLiveMatches();
    res.json(matches);
  } catch (error) {
    console.error('Get live matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /completed
 * Returns completed matches with final scores.
 * Query params: ?date= (optional, filters by specific date)
 */
router.get('/completed', requireAuth, (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const matches = getCompletedMatches(date);
    res.json(matches);
  } catch (error) {
    console.error('Get completed matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
