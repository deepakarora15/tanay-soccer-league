import { Router, Request, Response } from 'express';
import { requirePlayer } from '../auth';
import {
  validateScore,
  isPredictionWindowOpen,
  submitPrediction,
  getPlayerPredictions,
} from '../services/prediction.service';

const router = Router();

/**
 * POST /
 * Submits a prediction for a match. Requires player auth.
 * Body: { matchId, homeScore, awayScore }
 */
router.post('/', requirePlayer, (req: Request, res: Response) => {
  try {
    const { matchId, homeScore, awayScore } = req.body;
    const playerId = req.user!.id;

    if (!matchId) {
      res.status(400).json({ error: 'matchId is required' });
      return;
    }

    // Validate scores
    const homeValidation = validateScore(homeScore);
    if (!homeValidation.valid) {
      res.status(400).json({ error: homeValidation.error });
      return;
    }

    const awayValidation = validateScore(awayScore);
    if (!awayValidation.valid) {
      res.status(400).json({ error: awayValidation.error });
      return;
    }

    // Check prediction window
    if (!isPredictionWindowOpen(matchId)) {
      res.status(403).json({ error: 'Prediction window is closed' });
      return;
    }

    const prediction = submitPrediction(playerId, matchId, homeScore, awayScore);

    res.status(201).json(prediction);
  } catch (error: any) {
    if (error.message === 'Prediction window is closed') {
      res.status(403).json({ error: error.message });
      return;
    }
    console.error('Submit prediction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /my
 * Returns the authenticated player's predictions with optional pagination.
 * Query params: ?limit=&offset=
 */
router.get('/my', requirePlayer, (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const predictions = getPlayerPredictions(playerId, limit, offset);

    res.json(predictions);
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
