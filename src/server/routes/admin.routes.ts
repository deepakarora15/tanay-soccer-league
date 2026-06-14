import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db';
import { requireAdmin } from '../auth';

const router = Router();

router.get('/join-requests', requireAdmin, async (req: Request, res: Response) => {
  try {
    const pending = await dbAll("SELECT id, email, displayName, createdAt, status FROM User WHERE status = 'pending'");
    res.json(pending);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/join-requests/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await dbRun("UPDATE User SET status = 'active', updatedAt = ? WHERE id = ?", new Date().toISOString(), id);
    res.json({ message: 'User approved', userId: id });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/join-requests/:id/reject', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await dbRun("UPDATE User SET status = 'rejected', rejectionReason = ?, updatedAt = ? WHERE id = ?", reason || null, new Date().toISOString(), id);
    res.json({ message: 'User rejected', userId: id });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/all-predictions', requireAdmin, async (req: Request, res: Response) => {
  try {
    const matches = await dbAll("SELECT id, homeTeam, awayTeam, scheduledAt, homeScore, awayScore, status, groupName FROM Match WHERE status != 'upcoming' ORDER BY scheduledAt DESC");

    const result = [];
    for (const match of matches) {
      const predictions = await dbAll(
        `SELECT p.playerId, p.predictedHomeScore, p.predictedAwayScore, p.pointsAwarded, u.displayName
         FROM Prediction p
         LEFT JOIN User u ON p.playerId = u.id
         WHERE p.matchId = ?`,
        match.id
      );
      result.push({ ...match, predictions });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Admin predictions error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
