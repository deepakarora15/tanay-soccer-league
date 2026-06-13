import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { determineTournamentWinner } from '../services/league.service';
import db from '../db';

const router = Router();

/**
 * GET /standings
 * Returns tournament standings and winner(s).
 * Requires authentication.
 */
router.get('/standings', requireAuth, (req: Request, res: Response) => {
  try {
    // Get the active or most recent tournament
    const tournament = db.prepare(
      `SELECT id, name, startDate, endDate, status
       FROM Tournament
       ORDER BY
         CASE status
           WHEN 'active' THEN 0
           WHEN 'completed' THEN 1
           WHEN 'upcoming' THEN 2
         END,
         startDate DESC
       LIMIT 1`
    ).get() as { id: string; name: string; startDate: string; endDate: string; status: string } | undefined;

    if (!tournament) {
      res.status(404).json({ error: 'No tournament found' });
      return;
    }

    const result = determineTournamentWinner(tournament.id);

    res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        status: tournament.status,
      },
      ...result,
    });
  } catch (error) {
    console.error('Get tournament standings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
