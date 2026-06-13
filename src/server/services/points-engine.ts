import db from '../db';

// ─── Types ──────────────────────────────────────────────────────────────────

export type MatchOutcome = 'home_win' | 'away_win' | 'draw';

export interface Prediction {
  predictedHomeScore: number;
  predictedAwayScore: number;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
}

// ─── Pure Functions ─────────────────────────────────────────────────────────

/**
 * Determines the outcome of a match based on the scores.
 * Pure function — no side effects.
 */
export function determineOutcome(homeScore: number, awayScore: number): MatchOutcome {
  if (homeScore > awayScore) return 'home_win';
  if (awayScore > homeScore) return 'away_win';
  return 'draw';
}

/**
 * Calculates the points awarded for a prediction against a match result.
 * - 3 points for an exact score match
 * - 1 point for correct outcome (but wrong scores)
 * - 0 points otherwise
 *
 * Pure function — no side effects.
 */
export function calculatePoints(prediction: Prediction, matchResult: MatchResult): number {
  const isExactMatch =
    prediction.predictedHomeScore === matchResult.homeScore &&
    prediction.predictedAwayScore === matchResult.awayScore;

  if (isExactMatch) return 3;

  const predictedOutcome = determineOutcome(
    prediction.predictedHomeScore,
    prediction.predictedAwayScore
  );
  const actualOutcome = determineOutcome(matchResult.homeScore, matchResult.awayScore);

  if (predictedOutcome === actualOutcome) return 1;

  return 0;
}

// ─── Database Functions ─────────────────────────────────────────────────────

/**
 * Scores all predictions for a given match by calculating points and
 * updating the database. Uses a prepared statement inside a transaction
 * for efficiency.
 */
export function bulkScorePredictions(matchId: string, matchResult: MatchResult): void {
  const predictions = db
    .prepare(
      `SELECT id, predictedHomeScore, predictedAwayScore FROM Prediction WHERE matchId = ?`
    )
    .all(matchId) as Array<{
    id: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
  }>;

  const updateStmt = db.prepare(
    `UPDATE Prediction SET pointsAwarded = ? WHERE id = ?`
  );

  const transaction = db.transaction(() => {
    for (const pred of predictions) {
      const points = calculatePoints(
        {
          predictedHomeScore: pred.predictedHomeScore,
          predictedAwayScore: pred.predictedAwayScore,
        },
        matchResult
      );
      updateStmt.run(points, pred.id);
    }
  });

  transaction();
}
