import db from '../db';
import { calculateAccuracy } from './dashboard.service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  totalPoints: number;
  accuracy: number | null;
  exactPredictions: number;
  correctOutcomes: number;
}

// ─── Functions ──────────────────────────────────────────────────────────────

/**
 * Ranks all players by total points with tiebreakers.
 */
export function rankPlayers(): LeaderboardEntry[] {
  // Get all active players
  const users = db.prepare(
    "SELECT id, displayName FROM User WHERE status = ?"
  ).all('active') as Array<{ id: string; displayName: string }>;

  // Get all predictions
  const allPredictions = db.prepare(
    'SELECT playerId, pointsAwarded, submittedAt FROM Prediction WHERE playerId = ?'
  ).all() as Array<{ playerId: string; pointsAwarded: number | null; submittedAt: string }>;

  // Calculate stats per player
  const playerStats = users.map(user => {
    const userPreds = allPredictions.filter((p: any) => p.playerId === user.id);
    const scored = userPreds.filter((p: any) => p.pointsAwarded !== null && p.pointsAwarded !== undefined);
    
    let totalPoints = 0;
    let exactPredictions = 0;
    let correctOutcomes = 0;
    let lastSubmission = '';

    for (const p of scored) {
      totalPoints += (p.pointsAwarded || 0);
      if (p.pointsAwarded === 3) exactPredictions++;
      if ((p.pointsAwarded || 0) >= 1) correctOutcomes++;
      if (p.submittedAt > lastSubmission) lastSubmission = p.submittedAt;
    }

    return {
      playerId: user.id,
      displayName: user.displayName,
      totalPoints,
      exactPredictions,
      correctOutcomes,
      scoredCount: scored.length,
      lastSubmission,
    };
  }).filter(p => p.scoredCount > 0 || true); // Include all players

  // Sort with tiebreaker logic
  playerStats.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactPredictions !== a.exactPredictions) return b.exactPredictions - a.exactPredictions;
    if (b.correctOutcomes !== a.correctOutcomes) return b.correctOutcomes - a.correctOutcomes;
    return a.lastSubmission.localeCompare(b.lastSubmission);
  });

  return playerStats.map((p, index) => ({
    rank: index + 1,
    playerId: p.playerId,
    displayName: p.displayName,
    totalPoints: p.totalPoints,
    accuracy: calculateAccuracy(p.correctOutcomes, p.scoredCount),
    exactPredictions: p.exactPredictions,
    correctOutcomes: p.correctOutcomes,
  }));
}

/**
 * Returns top N players with the current player always included.
 */
export function getLeaderboard(currentPlayerId: string, limit: number = 50): {
  entries: LeaderboardEntry[];
  currentPlayer: LeaderboardEntry;
} {
  const allRanked = rankPlayers();
  
  const currentPlayer = allRanked.find(e => e.playerId === currentPlayerId);

  const currentPlayerEntry: LeaderboardEntry = currentPlayer ?? {
    rank: allRanked.length + 1,
    playerId: currentPlayerId,
    displayName: getPlayerDisplayName(currentPlayerId),
    totalPoints: 0,
    accuracy: null,
    exactPredictions: 0,
    correctOutcomes: 0,
  };

  let entries = allRanked.slice(0, limit);
  const isInTopN = entries.some(e => e.playerId === currentPlayerId);
  if (!isInTopN) {
    entries.push(currentPlayerEntry);
  }

  return { entries, currentPlayer: currentPlayerEntry };
}

function getPlayerDisplayName(playerId: string): string {
  const row = db.prepare('SELECT displayName FROM User WHERE id = ?').get(playerId) as any;
  return row?.displayName ?? 'Unknown';
}
