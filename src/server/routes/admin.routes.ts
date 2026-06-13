import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { requireAdmin } from '../auth';
import { createNotification, createLeague, createTournament } from '../services/league.service';

const router = Router();

/**
 * GET /join-requests
 * Returns all users with status 'pending'.
 */
router.get('/join-requests', requireAdmin, (req: Request, res: Response) => {
  try {
    const pendingUsers = db.prepare(
      "SELECT id, email, displayName, role, status, createdAt FROM User WHERE status = 'pending'"
    ).all();

    res.json(pendingUsers);
  } catch (error) {
    console.error('Get join requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /join-requests/:id/approve
 * Approves a pending user by setting their status to 'active'.
 */
router.post('/join-requests/:id/approve', requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = db.prepare('SELECT id, displayName, status FROM User WHERE id = ?').get(id) as
      | { id: string; displayName: string; status: string }
      | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.status !== 'pending') {
      res.status(400).json({ error: 'User is not in pending status' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE User SET status = 'active', updatedAt = ? WHERE id = ?").run(now, id);

    createNotification(id, 'approval', 'Your join request has been approved. Welcome to the league!');

    res.json({ message: 'User approved', userId: id });
  } catch (error) {
    console.error('Approve join request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /join-requests/:id/reject
 * Rejects a pending user with an optional reason.
 */
router.post('/join-requests/:id/reject', requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = db.prepare('SELECT id, displayName, status FROM User WHERE id = ?').get(id) as
      | { id: string; displayName: string; status: string }
      | undefined;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.status !== 'pending') {
      res.status(400).json({ error: 'User is not in pending status' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE User SET status = 'rejected', rejectionReason = ?, updatedAt = ? WHERE id = ?").run(
      reason || null,
      now,
      id
    );

    const message = reason
      ? `Your join request has been rejected. Reason: ${reason}`
      : 'Your join request has been rejected.';

    createNotification(id, 'rejection', message);

    res.json({ message: 'User rejected', userId: id });
  } catch (error) {
    console.error('Reject join request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /league
 * Creates a new league. The requesting admin is assigned as the league admin.
 */
router.post('/league', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, tournamentId } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'League name is required' });
      return;
    }

    const adminId = req.user!.id;

    // Update the admin's role to admin_player
    db.prepare("UPDATE User SET role = 'admin_player', updatedAt = ? WHERE id = ?").run(
      new Date().toISOString(),
      adminId
    );

    const league = createLeague(name.trim(), adminId, tournamentId);

    res.status(201).json(league);
  } catch (error) {
    console.error('Create league error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /tournament
 * Creates a new tournament.
 */
router.post('/tournament', requireAdmin, (req: Request, res: Response) => {
  try {
    const { name, startDate, endDate } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Tournament name is required' });
      return;
    }

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Start date and end date are required' });
      return;
    }

    const tournament = createTournament(name.trim(), startDate, endDate);

    res.status(201).json(tournament);
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
