import db from '../db';
import { cache, CACHE_KEYS, CACHE_TTLS } from '../cache';
import { bulkScorePredictions, MatchResult } from './points-engine';
import { lockPredictions } from './prediction.service';
import { Match } from './schedule.service';

// ─── Status priority for ordering ──────────────────────────────────────────

const STATUS_PRIORITY: Record<string, number> = {
  live: 0,
  upcoming: 1,
  completed: 2,
};

// ─── Pure Functions ─────────────────────────────────────────────────────────

/**
 * Pure function that sorts matches by status priority (live first, then upcoming, then completed)
 * and within each group by scheduledAt. Useful for property testing.
 */
export function orderMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const priorityA = STATUS_PRIORITY[a.status] ?? 3;
    const priorityB = STATUS_PRIORITY[b.status] ?? 3;

    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.scheduledAt.localeCompare(b.scheduledAt);
  });
}

// ─── Database Functions ─────────────────────────────────────────────────────

/**
 * Returns matches with status 'live' from DB.
 */
export function getLiveMatches(): Match[] {
  return db
    .prepare(`SELECT * FROM Match WHERE status = 'live' ORDER BY scheduledAt ASC`)
    .all() as Match[];
}

/**
 * Returns matches with status 'completed', optionally filtered by date.
 */
export function getCompletedMatches(date?: string): Match[] {
  if (date) {
    return db
      .prepare(
        `SELECT * FROM Match WHERE status = 'completed' AND DATE(scheduledAt) = DATE(?) ORDER BY scheduledAt DESC`
      )
      .all(date) as Match[];
  }
  return db
    .prepare(`SELECT * FROM Match WHERE status = 'completed' ORDER BY scheduledAt DESC`)
    .all() as Match[];
}

/**
 * Returns all matches ordered by: live first, then upcoming, then completed;
 * within each group by scheduledAt.
 */
export function getAllMatchesForScorecard(): Match[] {
  return db
    .prepare(
      `SELECT * FROM Match ORDER BY
        CASE status
          WHEN 'live' THEN 0
          WHEN 'upcoming' THEN 1
          WHEN 'completed' THEN 2
        END,
        scheduledAt ASC`
    )
    .all() as Match[];
}

/**
 * Updates match with final scores, sets status='completed', resultConfirmedAt=now.
 * Calls lockPredictions and bulkScorePredictions to score all predictions for this match.
 */
export function confirmMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number
): void {
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE Match SET homeScore = ?, awayScore = ?, status = 'completed', resultConfirmedAt = ? WHERE id = ?`
  ).run(homeScore, awayScore, now, matchId);

  // Lock predictions (idempotent)
  lockPredictions(matchId);

  // Score all predictions for this match
  const matchResult: MatchResult = { homeScore, awayScore };
  bulkScorePredictions(matchId, matchResult);
}

// ─── External API Functions ─────────────────────────────────────────────────

interface ExternalMatch {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  utcDate: string;
  score: { fullTime: { home: number | null; away: number | null } };
  status: string;
  stage: string;
  group: string | null;
}

/**
 * Fetches live scores from football-data.org, updates matches in DB.
 * If a match changed from 'upcoming' to 'IN_PLAY', locks predictions and sets status='live'.
 * If a match is 'FINISHED', calls confirmMatchResult.
 */
export async function refreshScoresFromAPI(tournamentId: string): Promise<void> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.warn('[scorecard] FOOTBALL_DATA_API_KEY not set, skipping score refresh');
    return;
  }

  let externalMatches: ExternalMatch[];

  try {
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${tournamentId}/matches`,
      {
        headers: { 'X-Auth-Token': apiKey },
      }
    );

    if (!response.ok) {
      console.error(`[scorecard] API responded with status ${response.status}`);
      // Fallback to cached data
      const cached = cache.get<ExternalMatch[]>(CACHE_KEYS.LIVE_SCORES);
      if (cached) {
        externalMatches = cached;
      } else {
        return;
      }
    } else {
      const data = await response.json();
      externalMatches = data.matches as ExternalMatch[];
      cache.set(CACHE_KEYS.LIVE_SCORES, externalMatches, CACHE_TTLS.LIVE_SCORES);
    }
  } catch (error) {
    console.error('[scorecard] Failed to fetch scores from API:', error);
    // Fallback to cached data
    const cached = cache.get<ExternalMatch[]>(CACHE_KEYS.LIVE_SCORES);
    if (cached) {
      externalMatches = cached;
    } else {
      return;
    }
  }

  // Get existing matches by externalId
  const existingMatches = db
    .prepare('SELECT id, externalId, status FROM Match WHERE tournamentId = ? AND externalId IS NOT NULL')
    .all(tournamentId) as Array<{ id: string; externalId: string; status: string }>;

  const extIdMap = new Map(existingMatches.map((m) => [m.externalId, m]));

  for (const ext of externalMatches) {
    const externalId = String(ext.id);
    const existing = extIdMap.get(externalId);
    if (!existing) continue;

    const isLive = ['IN_PLAY', 'PAUSED', 'LIVE'].includes(ext.status);
    const isFinished = ['FINISHED', 'AWARDED'].includes(ext.status);

    if (isLive && existing.status === 'upcoming') {
      // Match just went live: lock predictions and update status
      lockPredictions(existing.id);
      db.prepare(`UPDATE Match SET status = 'live' WHERE id = ?`).run(existing.id);

      // Update live scores if available
      if (ext.score?.fullTime?.home != null && ext.score?.fullTime?.away != null) {
        db.prepare(`UPDATE Match SET homeScore = ?, awayScore = ? WHERE id = ?`).run(
          ext.score.fullTime.home,
          ext.score.fullTime.away,
          existing.id
        );
      }
    } else if (isLive && existing.status === 'live') {
      // Update live scores
      if (ext.score?.fullTime?.home != null && ext.score?.fullTime?.away != null) {
        db.prepare(`UPDATE Match SET homeScore = ?, awayScore = ? WHERE id = ?`).run(
          ext.score.fullTime.home,
          ext.score.fullTime.away,
          existing.id
        );
      }
    } else if (isFinished && existing.status !== 'completed') {
      // Match finished: confirm result
      const homeScore = ext.score?.fullTime?.home;
      const awayScore = ext.score?.fullTime?.away;
      if (homeScore != null && awayScore != null) {
        confirmMatchResult(existing.id, homeScore, awayScore);
      }
    }
  }
}
