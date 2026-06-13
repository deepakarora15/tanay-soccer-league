import db from '../db';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DashboardData {
  totalPoints: number;
  rank: number | null;
  accuracy: number | null;
  totalPredictions: number;
  recentPredictions: Array<{
    id: string;
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    actualHomeScore: number | null;
    actualAwayScore: number | null;
    pointsAwarded: number | null;
    submittedAt: string;
  }>;
  achievements: string[];
}

// ─── Pure Functions ─────────────────────────────────────────────────────────

/**
 * Returns (correct / total) * 100 rounded to 1 decimal place.
 * Returns null if totalPredictions is 0.
 */
export function calculateAccuracy(correctPredictions: number, totalPredictions: number): number | null {
  if (totalPredictions === 0) return null;
  return Math.round((correctPredictions / totalPredictions) * 1000) / 10;
}

// ─── Database Functions ─────────────────────────────────────────────────────

/**
 * Detects streak achievements for consecutive correct predictions.
 */
export function detectStreaks(playerId: string): string[] {
  // Get all scored predictions for this player
  const allPredictions = db.prepare(
    'SELECT pointsAwarded, submittedAt FROM Prediction WHERE playerId = ?'
  ).all(playerId) as Array<{ pointsAwarded: number | null; submittedAt: string }>;
  
  // Filter to only scored ones and sort by date
  const scored = allPredictions
    .filter((p: any) => p.pointsAwarded !== null && p.pointsAwarded !== undefined)
    .sort((a: any, b: any) => a.submittedAt.localeCompare(b.submittedAt));

  let maxStreak = 0;
  let currentStreak = 0;

  for (const pred of scored) {
    if ((pred.pointsAwarded as number) >= 1) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  const achievements: string[] = [];
  if (maxStreak >= 3) achievements.push('streak_3');
  if (maxStreak >= 5) achievements.push('streak_5');
  if (maxStreak >= 10) achievements.push('streak_10');

  return achievements;
}

/**
 * Returns the player's rank among all active players.
 */
export function getPlayerRank(playerId: string): number | null {
  // Get all predictions
  const allPredictions = db.prepare(
    'SELECT playerId, pointsAwarded FROM Prediction WHERE playerId = ?'
  ).all(playerId) as Array<{ playerId: string; pointsAwarded: number | null }>;
  
  if (allPredictions.length === 0) return null;

  // Get all players' total points
  const allPlayerPredictions = db.prepare(
    'SELECT playerId, pointsAwarded FROM Prediction WHERE pointsAwarded = ?'
  ).all() as Array<{ playerId: string; pointsAwarded: number | null }>;

  // Group by player and sum points
  const playerPoints: Record<string, number> = {};
  for (const p of allPlayerPredictions) {
    if (!playerPoints[p.playerId]) playerPoints[p.playerId] = 0;
    playerPoints[p.playerId] += (p.pointsAwarded || 0);
  }
  
  // Also count current player if not in the list
  if (!playerPoints[playerId]) {
    let total = 0;
    for (const p of allPredictions) {
      total += (p.pointsAwarded || 0);
    }
    playerPoints[playerId] = total;
  }

  // Sort players by points descending
  const sorted = Object.entries(playerPoints).sort(([,a], [,b]) => b - a);
  const rank = sorted.findIndex(([id]) => id === playerId);
  return rank === -1 ? null : rank + 1;
}

/**
 * Aggregates all dashboard data for a player.
 */
export function getDashboardData(playerId: string): DashboardData {
  // Get all predictions for this player
  const allPredictions = db.prepare(
    'SELECT id, matchId, predictedHomeScore, predictedAwayScore, pointsAwarded, submittedAt FROM Prediction WHERE playerId = ?'
  ).all(playerId) as Array<{
    id: string;
    matchId: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    pointsAwarded: number | null;
    submittedAt: string;
  }>;

  // Calculate total points
  let totalPoints = 0;
  let scoredCount = 0;
  let correctCount = 0;
  
  for (const p of allPredictions) {
    if (p.pointsAwarded !== null && p.pointsAwarded !== undefined) {
      totalPoints += p.pointsAwarded;
      scoredCount++;
      if (p.pointsAwarded >= 1) correctCount++;
    }
  }

  // Get matches for the recent predictions
  const sorted = [...allPredictions].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const recent = sorted.slice(0, 20);

  const recentPredictions = recent.map(p => {
    // Look up the match
    const match = db.prepare('SELECT homeTeam, awayTeam, homeScore, awayScore FROM Match WHERE id = ?').get(p.matchId) as any;
    return {
      id: p.id,
      matchId: p.matchId,
      homeTeam: match?.homeTeam || 'TBD',
      awayTeam: match?.awayTeam || 'TBD',
      predictedHomeScore: p.predictedHomeScore,
      predictedAwayScore: p.predictedAwayScore,
      actualHomeScore: match?.homeScore ?? null,
      actualAwayScore: match?.awayScore ?? null,
      pointsAwarded: p.pointsAwarded,
      submittedAt: p.submittedAt,
    };
  });

  const accuracy = calculateAccuracy(correctCount, scoredCount);
  const rank = getPlayerRank(playerId);
  const achievements = detectStreaks(playerId);

  return {
    totalPoints,
    rank,
    accuracy,
    totalPredictions: allPredictions.length,
    recentPredictions,
    achievements,
  };
}
