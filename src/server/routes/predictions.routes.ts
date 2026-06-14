import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requirePlayer } from '../auth';
import { dbGet, dbRun, dbAll } from '../db';

const router = Router();

router.post('/', requirePlayer, async (req: Request, res: Response) => {
  try {
    const { matchId, homeScore, awayScore } = req.body;
    const playerId = req.user!.id;

    if (!matchId) {
      res.status(400).json({ error: 'matchId is required' });
      return;
    }

    if (!Number.isInteger(homeScore) || homeScore < 0 || homeScore > 99) {
      res.status(400).json({ error: 'Score must be a whole number between 0 and 99' });
      return;
    }
    if (!Number.isInteger(awayScore) || awayScore < 0 || awayScore > 99) {
      res.status(400).json({ error: 'Score must be a whole number between 0 and 99' });
      return;
    }

    const match = await dbGet('SELECT status, predictionsLocked FROM Match WHERE id = ?', matchId);
    if (!match || match.status !== 'upcoming' || match.predictionsLocked === 1) {
      res.status(403).json({ error: 'Prediction window is closed' });
      return;
    }

    const now = new Date().toISOString();
    const existing = await dbGet('SELECT id FROM Prediction WHERE playerId = ? AND matchId = ?', playerId, matchId);

    if (existing) {
      await dbRun(
        'UPDATE Prediction SET predictedHomeScore = ?, predictedAwayScore = ?, updatedAt = ? WHERE id = ?',
        homeScore, awayScore, now, existing.id
      );
    } else {
      const id = uuidv4();
      await dbRun(
        'INSERT INTO Prediction (id, playerId, matchId, predictedHomeScore, predictedAwayScore, submittedAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        id, playerId, matchId, homeScore, awayScore, now, now
      );
    }

    res.status(201).json({ matchId, predictedHomeScore: homeScore, predictedAwayScore: awayScore, submittedAt: now });
  } catch (error: any) {
    console.error('Prediction error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/my', requirePlayer, async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const predictions = await dbAll(
      `SELECT p.id, p.matchId, p.predictedHomeScore, p.predictedAwayScore, p.pointsAwarded, p.submittedAt,
              m.homeTeam, m.awayTeam
       FROM Prediction p
       LEFT JOIN Match m ON p.matchId = m.id
       WHERE p.playerId = ?
       ORDER BY p.submittedAt DESC`,
      playerId
    );
    res.json(predictions);
  } catch (error: any) {
    console.error('Get predictions error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
