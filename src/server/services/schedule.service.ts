import db from '../db';
import { cache, CACHE_KEYS, CACHE_TTLS } from '../cache';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Match {
  id: string;
  tournamentId: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'upcoming' | 'live' | 'completed';
  stage: string;
  groupName: string | null;
  predictionsLocked: number;
  resultConfirmedAt: string | null;
  externalId: string | null;
}

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

// ─── Pure Functions ─────────────────────────────────────────────────────────

/**
 * Pure filter function for matching matches against filter criteria.
 * Useful for property testing.
 */
export function filterMatches(
  matches: Match[],
  filters: { stage?: string; startDate?: string; endDate?: string }
): Match[] {
  return matches.filter((match) => {
    if (filters.stage && match.stage !== filters.stage) return false;
    if (filters.startDate && match.scheduledAt < filters.startDate) return false;
    if (filters.endDate && match.scheduledAt > filters.endDate) return false;
    return true;
  });
}

/**
 * Checks which matches have predictions from a given player.
 */
export function annotateWithPredictions(
  matches: Match[],
  playerId: string
): (Match & { hasPrediction: boolean })[] {
  const predictionMatchIds = db
    .prepare('SELECT matchId FROM Prediction WHERE playerId = ?')
    .all(playerId) as Array<{ matchId: string }>;

  const predictionSet = new Set(predictionMatchIds.map((p) => p.matchId));

  return matches.map((match) => ({
    ...match,
    hasPrediction: predictionSet.has(match.id),
  }));
}

// ─── Database Functions ─────────────────────────────────────────────────────

/**
 * Query upcoming matches from DB with optional filters, ordered by scheduledAt ASC.
 */
export function getUpcomingMatches(filters?: {
  stage?: string;
  startDate?: string;
  endDate?: string;
}): Match[] {
  let query = `SELECT * FROM Match WHERE status = 'upcoming'`;
  const params: any[] = [];

  if (filters?.stage) {
    query += ' AND stage = ?';
    params.push(filters.stage);
  }
  if (filters?.startDate) {
    query += ' AND scheduledAt >= ?';
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    query += ' AND scheduledAt <= ?';
    params.push(filters.endDate);
  }

  query += ' ORDER BY scheduledAt ASC';

  return db.prepare(query).all(...params) as Match[];
}

/**
 * Returns cached timestamp of last successful schedule fetch.
 */
export function getScheduleLastUpdated(): string | null {
  return cache.get<string>('schedule_last_updated');
}

// ─── External API Functions ─────────────────────────────────────────────────

/**
 * Maps external API stage strings to internal stage values.
 */
function normalizeStage(stage: string): string {
  const stageMap: Record<string, string> = {
    GROUP_STAGE: 'group',
    LAST_16: 'round_of_16',
    QUARTER_FINALS: 'quarter_final',
    SEMI_FINALS: 'semi_final',
    THIRD_PLACE: 'third_place',
    FINAL: 'final',
  };
  return stageMap[stage] || 'group';
}

/**
 * Maps external API status strings to internal status values.
 */
function normalizeStatus(status: string): 'upcoming' | 'live' | 'completed' {
  if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(status)) return 'live';
  if (['FINISHED', 'AWARDED'].includes(status)) return 'completed';
  return 'upcoming';
}

/**
 * Fetches from football-data.org API (or uses cache), normalizes, and upserts into Match table.
 * API: GET https://api.football-data.org/v4/competitions/{id}/matches
 * Header: X-Auth-Token: {FOOTBALL_DATA_API_KEY}
 */
export async function refreshScheduleFromAPI(tournamentId: string): Promise<void> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    console.warn('[schedule] FOOTBALL_DATA_API_KEY not set, skipping schedule refresh');
    return;
  }

  // Check cache first
  const cached = cache.get<ExternalMatch[]>(CACHE_KEYS.SCHEDULE);
  let externalMatches: ExternalMatch[];

  if (cached) {
    externalMatches = cached;
  } else {
    try {
      const response = await fetch(
        `https://api.football-data.org/v4/competitions/${tournamentId}/matches`,
        {
          headers: { 'X-Auth-Token': apiKey },
        }
      );

      if (!response.ok) {
        console.error(`[schedule] API responded with status ${response.status}`);
        return;
      }

      const data = await response.json();
      externalMatches = data.matches as ExternalMatch[];
      cache.set(CACHE_KEYS.SCHEDULE, externalMatches, CACHE_TTLS.SCHEDULE);
    } catch (error) {
      console.error('[schedule] Failed to fetch schedule from API:', error);
      // Fallback to cached data if available
      const fallback = cache.get<ExternalMatch[]>(CACHE_KEYS.SCHEDULE);
      if (fallback) {
        externalMatches = fallback;
      } else {
        return;
      }
    }
  }

  // Upsert matches into DB
  const upsertStmt = db.prepare(`
    INSERT INTO Match (id, tournamentId, homeTeam, awayTeam, scheduledAt, homeScore, awayScore, status, stage, groupName, predictionsLocked, resultConfirmedAt, externalId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      homeTeam = excluded.homeTeam,
      awayTeam = excluded.awayTeam,
      scheduledAt = excluded.scheduledAt,
      homeScore = excluded.homeScore,
      awayScore = excluded.awayScore,
      status = excluded.status,
      stage = excluded.stage,
      groupName = excluded.groupName
  `);

  // Look up existing matches by externalId to preserve internal IDs
  const existingByExtId = db
    .prepare('SELECT id, externalId FROM Match WHERE tournamentId = ? AND externalId IS NOT NULL')
    .all(tournamentId) as Array<{ id: string; externalId: string }>;

  const extIdMap = new Map(existingByExtId.map((m) => [m.externalId, m.id]));

  const transaction = db.transaction(() => {
    for (const ext of externalMatches) {
      const externalId = String(ext.id);
      const matchId = extIdMap.get(externalId) || uuidv4();
      const status = normalizeStatus(ext.status);
      const stage = normalizeStage(ext.stage);
      const homeScore = ext.score?.fullTime?.home ?? null;
      const awayScore = ext.score?.fullTime?.away ?? null;
      const predictionsLocked = status !== 'upcoming' ? 1 : 0;

      upsertStmt.run(
        matchId,
        tournamentId,
        ext.homeTeam.name,
        ext.awayTeam.name,
        ext.utcDate,
        homeScore,
        awayScore,
        status,
        stage,
        ext.group || null,
        predictionsLocked,
        null,
        externalId
      );
    }
  });

  transaction();
  cache.set('schedule_last_updated', new Date().toISOString(), CACHE_TTLS.SCHEDULE);
}
