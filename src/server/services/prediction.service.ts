import { v4 as uuidv4 } from 'uuid';
import db from '../db';

/**
 * Validates that a score is a whole number between 0 and 99 inclusive.
 */
export function validateScore(score: any): { valid: boolean; error?: string } {
  if (
    typeof score !== 'number' ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 99
  ) {
    return { valid: false, error: 'Score must be a whole number between 0 and 99' };
  }
  return { valid: true };
}

/**
 * Returns true if the match status is 'upcoming' and predictionsLocked is 0.
 */
export function isPredictionWindowOpen(matchId: string): boolean {
  const match = db.prepare(
    'SELECT status, predictionsLocked FROM Match WHERE id = ?'
  ).get(matchId) as { status: string; predictionsLocked: number } | undefined;

  if (!match) return false;

  return match.status === 'upcoming' && match.predictionsLocked === 0;
}

/**
 * Submits (or updates) a prediction for a player on a match.
 * Uses INSERT OR REPLACE to enforce one-prediction-per-player-per-match.
 * Throws an error if the prediction window is closed.
 */
export function submitPrediction(
  playerId: string,
  matchId: string,
  homeScore: number,
  awayScore: number
): { id: string; predictedHomeScore: number; predictedAwayScore: number; submittedAt: string } {
  if (!isPredictionWindowOpen(matchId)) {
    throw new Error('Prediction window is closed');
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT OR REPLACE INTO Prediction (id, playerId, matchId, predictedHomeScore, predictedAwayScore, pointsAwarded, submittedAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`
  ).run(id, playerId, matchId, homeScore, awayScore, now, now);

  return { id, predictedHomeScore: homeScore, predictedAwayScore: awayScore, submittedAt: now };
}

/**
 * Returns a player's predictions, joined with match data for team names.
 * Supports pagination via limit and offset.
 */
export function getPlayerPredictions(
  playerId: string,
  limit?: number,
  offset?: number
): Array<{
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsAwarded: number | null;
  submittedAt: string;
}> {
  let query = `
    SELECT p.id, p.matchId, m.homeTeam, m.awayTeam, p.predictedHomeScore, p.predictedAwayScore, p.pointsAwarded, p.submittedAt
    FROM Prediction p
    JOIN Match m ON p.matchId = m.id
    WHERE p.playerId = ?
    ORDER BY p.submittedAt DESC
  `;

  const params: any[] = [playerId];

  if (limit !== undefined) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  if (offset !== undefined) {
    query += ' OFFSET ?';
    params.push(offset);
  }

  return db.prepare(query).all(...params) as Array<{
    id: string;
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    pointsAwarded: number | null;
    submittedAt: string;
  }>;
}

/**
 * Locks predictions for a match by setting predictionsLocked = 1.
 */
export function lockPredictions(matchId: string): void {
  db.prepare('UPDATE Match SET predictionsLocked = 1 WHERE id = ?').run(matchId);
}
