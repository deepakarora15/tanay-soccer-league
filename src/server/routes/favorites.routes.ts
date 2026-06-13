import { Router, Request, Response } from 'express';
import { requirePlayer } from '../auth';
import { getFavorites, addFavoriteTeam, addFavoritePlayer, removeFavorite } from '../services/favorites.service';

const router = Router();

/**
 * GET /
 * Returns player's favorites grouped by teams and players.
 */
router.get('/', requirePlayer, (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const favorites = getFavorites(playerId);
    res.json(favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /teams
 * Adds a team favorite. Body: { entityName, entityId }
 * Returns 400 if limit exceeded.
 */
router.put('/teams', requirePlayer, (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const { entityName, entityId } = req.body;

    if (!entityName || !entityId) {
      res.status(400).json({ error: 'entityName and entityId are required' });
      return;
    }

    const favorite = addFavoriteTeam(playerId, entityName, entityId);
    res.status(201).json(favorite);
  } catch (error: any) {
    if (error.message?.includes('Maximum')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Add favorite team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /players
 * Adds a player favorite. Body: { entityName, entityId }
 * Returns 400 if limit exceeded.
 */
router.put('/players', requirePlayer, (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const { entityName, entityId } = req.body;

    if (!entityName || !entityId) {
      res.status(400).json({ error: 'entityName and entityId are required' });
      return;
    }

    const favorite = addFavoritePlayer(playerId, entityName, entityId);
    res.status(201).json(favorite);
  } catch (error: any) {
    if (error.message?.includes('Maximum')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Add favorite player error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /:id
 * Removes a favorite.
 */
router.delete('/:id', requirePlayer, (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const favoriteId = req.params.id;

    const deleted = removeFavorite(playerId, favoriteId);

    if (!deleted) {
      res.status(404).json({ error: 'Favorite not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
