import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requirePlayer } from '../auth';
import { dbAll, dbGet, dbRun } from '../db';

const router = Router();

router.get('/', requirePlayer, async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const teams = await dbAll("SELECT * FROM Favorite WHERE playerId = ? AND type = 'team'", playerId);
    const players = await dbAll("SELECT * FROM Favorite WHERE playerId = ? AND type = 'player'", playerId);
    res.json({ teams, players });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/teams', requirePlayer, async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const { entityName, entityId } = req.body;
    if (!entityName || !entityId) { res.status(400).json({ error: 'entityName and entityId required' }); return; }

    const count = await dbAll("SELECT id FROM Favorite WHERE playerId = ? AND type = 'team'", playerId);
    if (count.length >= 5) { res.status(400).json({ error: 'Maximum of 5 favorite teams reached' }); return; }

    const id = uuidv4();
    await dbRun('INSERT INTO Favorite (id, playerId, type, entityName, entityId, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      id, playerId, 'team', entityName, entityId, new Date().toISOString());
    res.status(201).json({ id, entityName, entityId });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/players', requirePlayer, async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const { entityName, entityId } = req.body;
    if (!entityName || !entityId) { res.status(400).json({ error: 'entityName and entityId required' }); return; }

    const count = await dbAll("SELECT id FROM Favorite WHERE playerId = ? AND type = 'player'", playerId);
    if (count.length >= 10) { res.status(400).json({ error: 'Maximum of 10 favorite players reached' }); return; }

    const id = uuidv4();
    await dbRun('INSERT INTO Favorite (id, playerId, type, entityName, entityId, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      id, playerId, 'player', entityName, entityId, new Date().toISOString());
    res.status(201).json({ id, entityName, entityId });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requirePlayer, async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const result = await dbRun('DELETE FROM Favorite WHERE id = ? AND playerId = ?', req.params.id, playerId);
    res.json({ success: result.changes > 0 });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
