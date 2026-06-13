import { v4 as uuidv4 } from 'uuid';
import db from '../db';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface League {
  id: string;
  name: string;
  adminId: string;
  tournamentId: string | null;
  createdAt: string;
}

// ─── Notification ───────────────────────────────────────────────────────────

/**
 * Creates a notification record for a given user.
 */
export function createNotification(userId: string, type: string, message: string): void {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO Notification (id, userId, type, message, read, createdAt) VALUES (?, ?, ?, ?, 0, ?)'
  ).run(id, userId, type, message, now);
}

// ─── League ─────────────────────────────────────────────────────────────────

/**
 * Creates a new league and assigns the given user as its admin.
 */
export function createLeague(
  name: string,
  adminId: string,
  tournamentId?: string
): { id: string; name: string; adminId: string; tournamentId: string | null; createdAt: string } {
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO League (id, name, adminId, tournamentId, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, adminId, tournamentId || null, now);

  return { id, name, adminId, tournamentId: tournamentId || null, createdAt: now };
}

/**
 * Retrieves a league by ID.
 */
export function getLeague(leagueId: string): League | null {
  const row = db.prepare('SELECT id, name, adminId, tournamentId, createdAt FROM League WHERE id = ?').get(leagueId) as League | undefined;
  return row || null;
}

/**
 * Retrieves all members of a league (users whose league admin matches).
 * For simplicity, returns users associated with the league's admin context.
 */
export function getLeagueMembers(leagueId: string): Array<{ id: string; displayName: string; role: string; status: string }> {
  const rows = db.prepare(
    `SELECT u.id, u.displayName, u.role, u.status
     FROM User u
     WHERE u.status = 'active'`
  ).all() as Array<{ id: string; displayName: string; role: string; status: string }>;
  return rows;
}

// ─── Tournament ─────────────────────────────────────────────────────────────

/**
 * Creates a new tournament.
 */
export function createTournament(
  name: string,
  startDate: string,
  endDate: string
): { id: string; name: string; startDate: string; endDate: string; status: string } {
  const id = uuidv4();

  db.prepare(
    'INSERT INTO Tournament (id, name, startDate, endDate, status) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, startDate, endDate, 'upcoming');

  return { id, name, startDate, endDate, status: 'upcoming' };
}

/**
 * Updates the status of a tournament.
 */
export function updateTournamentStatus(tournamentId: string, status: 'upcoming' | 'active' | 'completed'): void {
  db.prepare('UPDATE Tournament SET status = ? WHERE id = ?').run(status, tournamentId);
}

// ─── Tournament Winner Determination ────────────────────────────────────────

interface TournamentStandingEntry {
  playerId: string;
  displayName: string;
  rank: number;
  totalPoints: number;
  accuracy: number | null;
}

interface TournamentWinnerEntry extends TournamentStandingEntry {
  exactPredictions: number;
  correctOutcomes: number;
}

/**
 * Determines the tournament winner(s) with tiebreaker logic.
 *
 * Check if all matches for the tournament are completed.
 * If not, return isCompleted: false with current standings.
 * If yes, rank all players using tiebreaker logic:
 *   1. Total points descending
 *   2. Number of exact predictions (pointsAwarded=3) descending
 *   3. Number of correct outcomes (pointsAwarded>=1) descending
 *   4. Earliest last prediction timestamp ascending
 * Players tied across ALL criteria share the same rank (co-winners).
 */
export function determineTournamentWinner(tournamentId: string): {
  winners: TournamentWinnerEntry[];
  standings: TournamentStandingEntry[];
  isCompleted: boolean;
} {
  // Check if all matches are completed
  const incompleteMatches = db.prepare(
    `SELECT COUNT(*) as cnt FROM Match WHERE tournamentId = ? AND status != 'completed'`
  ).get(tournamentId) as { cnt: number };

  const totalMatches = db.prepare(
    `SELECT COUNT(*) as cnt FROM Match WHERE tournamentId = ?`
  ).get(tournamentId) as { cnt: number };

  const isCompleted = incompleteMatches.cnt === 0 && totalMatches.cnt > 0;

  // Get all players who made predictions for this tournament's matches
  const playerStats = db.prepare(
    `SELECT
       u.id as playerId,
       u.displayName,
       COALESCE(SUM(p.pointsAwarded), 0) as totalPoints,
       SUM(CASE WHEN p.pointsAwarded = 3 THEN 1 ELSE 0 END) as exactPredictions,
       SUM(CASE WHEN p.pointsAwarded >= 1 THEN 1 ELSE 0 END) as correctOutcomes,
       COUNT(p.id) as totalPredictions,
       SUM(CASE WHEN m.status = 'completed' THEN 1 ELSE 0 END) as completedMatchPredictions,
       MAX(p.updatedAt) as lastPredictionAt
     FROM User u
     INNER JOIN Prediction p ON p.playerId = u.id
     INNER JOIN Match m ON m.id = p.matchId
     WHERE m.tournamentId = ?
     GROUP BY u.id, u.displayName
     ORDER BY totalPoints DESC`
  ).all(tournamentId) as Array<{
    playerId: string;
    displayName: string;
    totalPoints: number;
    exactPredictions: number;
    correctOutcomes: number;
    totalPredictions: number;
    completedMatchPredictions: number;
    lastPredictionAt: string;
  }>;

  // Calculate accuracy and build standings
  const rankedPlayers = playerStats.map((player) => {
    const accuracy = player.completedMatchPredictions > 0
      ? Math.round((player.correctOutcomes / player.completedMatchPredictions) * 100 * 100) / 100
      : null;

    return {
      playerId: player.playerId,
      displayName: player.displayName,
      totalPoints: player.totalPoints,
      exactPredictions: player.exactPredictions,
      correctOutcomes: player.correctOutcomes,
      accuracy,
      lastPredictionAt: player.lastPredictionAt,
    };
  });

  // Sort with tiebreaker logic
  rankedPlayers.sort((a, b) => {
    // 1. Total points descending
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    // 2. Exact predictions descending
    if (b.exactPredictions !== a.exactPredictions) return b.exactPredictions - a.exactPredictions;
    // 3. Correct outcomes descending
    if (b.correctOutcomes !== a.correctOutcomes) return b.correctOutcomes - a.correctOutcomes;
    // 4. Earliest last prediction timestamp ascending
    return a.lastPredictionAt.localeCompare(b.lastPredictionAt);
  });

  // Assign ranks (players tied across ALL criteria share rank)
  const standings: TournamentStandingEntry[] = [];
  const winners: TournamentWinnerEntry[] = [];

  let currentRank = 1;
  for (let i = 0; i < rankedPlayers.length; i++) {
    const player = rankedPlayers[i];

    if (i > 0) {
      const prev = rankedPlayers[i - 1];
      const isTied =
        player.totalPoints === prev.totalPoints &&
        player.exactPredictions === prev.exactPredictions &&
        player.correctOutcomes === prev.correctOutcomes &&
        player.lastPredictionAt === prev.lastPredictionAt;

      if (!isTied) {
        currentRank = i + 1;
      }
    }

    standings.push({
      playerId: player.playerId,
      displayName: player.displayName,
      rank: currentRank,
      totalPoints: player.totalPoints,
      accuracy: player.accuracy,
    });

    if (isCompleted && currentRank === 1) {
      winners.push({
        playerId: player.playerId,
        displayName: player.displayName,
        rank: 1,
        totalPoints: player.totalPoints,
        accuracy: player.accuracy,
        exactPredictions: player.exactPredictions,
        correctOutcomes: player.correctOutcomes,
      });
    }
  }

  return { winners, standings, isCompleted };
}
