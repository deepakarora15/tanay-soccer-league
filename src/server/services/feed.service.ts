import db from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface FeedEvent {
  id: string;
  eventType: string;
  description: string;
  relatedTeam: string | null;
  relatedPlayer: string | null;
  occurredAt: string;
  cachedAt: string;
}

/**
 * Pure function for property testing - deduplication.
 * Removes duplicate events (same eventType + occurredAt + (relatedTeam OR relatedPlayer)).
 * Keeps the first occurrence.
 */
export function deduplicateEvents(events: FeedEvent[]): FeedEvent[] {
  const seen = new Set<string>();
  const result: FeedEvent[] = [];

  for (const event of events) {
    const key = `${event.eventType}|${event.occurredAt}|${event.relatedTeam || ''}|${event.relatedPlayer || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(event);
    }
  }

  return result;
}

/**
 * Returns events matching player's favorite teams/players, deduplicated, reverse chronological, max 100.
 * If no favorites, returns general tournament highlights (last 10 events).
 */
export function getPersonalizedFeed(playerId: string): FeedEvent[] {
  // Get player's favorite teams and players
  const favoriteTeams = db.prepare(
    `SELECT entityName FROM Favorite WHERE playerId = ? AND type = 'team'`
  ).all(playerId) as Array<{ entityName: string }>;

  const favoritePlayers = db.prepare(
    `SELECT entityName FROM Favorite WHERE playerId = ? AND type = 'player'`
  ).all(playerId) as Array<{ entityName: string }>;

  // If no favorites, return general highlights
  if (favoriteTeams.length === 0 && favoritePlayers.length === 0) {
    return getGeneralHighlights();
  }

  const teamNames = favoriteTeams.map((f) => f.entityName);
  const playerNames = favoritePlayers.map((f) => f.entityName);

  // Build dynamic query for matching events
  const conditions: string[] = [];
  const params: string[] = [];

  if (teamNames.length > 0) {
    const placeholders = teamNames.map(() => '?').join(', ');
    conditions.push(`relatedTeam IN (${placeholders})`);
    params.push(...teamNames);
  }

  if (playerNames.length > 0) {
    const placeholders = playerNames.map(() => '?').join(', ');
    conditions.push(`relatedPlayer IN (${placeholders})`);
    params.push(...playerNames);
  }

  const whereClause = conditions.join(' OR ');

  const events = db.prepare(
    `SELECT id, eventType, description, relatedTeam, relatedPlayer, occurredAt, cachedAt
     FROM FeedEvent
     WHERE ${whereClause}
     ORDER BY occurredAt DESC
     LIMIT 200`
  ).all(...params) as FeedEvent[];

  // Deduplicate and limit to 100
  const deduplicated = deduplicateEvents(events);
  return deduplicated.slice(0, 100);
}

/**
 * Returns last 10 events regardless of favorites.
 */
export function getGeneralHighlights(): FeedEvent[] {
  return db.prepare(
    `SELECT id, eventType, description, relatedTeam, relatedPlayer, occurredAt, cachedAt
     FROM FeedEvent
     ORDER BY occurredAt DESC
     LIMIT 10`
  ).all() as FeedEvent[];
}

/**
 * Inserts event into FeedEvent table.
 */
export function addEvent(event: Omit<FeedEvent, 'id' | 'cachedAt'>): FeedEvent {
  const id = uuidv4();
  const cachedAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO FeedEvent (id, eventType, description, relatedTeam, relatedPlayer, occurredAt, cachedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, event.eventType, event.description, event.relatedTeam, event.relatedPlayer, event.occurredAt, cachedAt);

  return { id, ...event, cachedAt };
}

/**
 * Ensures player's relevant feed doesn't exceed the limit (default 100) events.
 * Removes oldest events beyond the limit.
 */
export function trimFeedToLimit(playerId: string, limit: number = 100): void {
  // Get player's favorite teams and players
  const favoriteTeams = db.prepare(
    `SELECT entityName FROM Favorite WHERE playerId = ? AND type = 'team'`
  ).all(playerId) as Array<{ entityName: string }>;

  const favoritePlayers = db.prepare(
    `SELECT entityName FROM Favorite WHERE playerId = ? AND type = 'player'`
  ).all(playerId) as Array<{ entityName: string }>;

  if (favoriteTeams.length === 0 && favoritePlayers.length === 0) {
    return;
  }

  const teamNames = favoriteTeams.map((f) => f.entityName);
  const playerNames = favoritePlayers.map((f) => f.entityName);

  // Build conditions
  const conditions: string[] = [];
  const params: string[] = [];

  if (teamNames.length > 0) {
    const placeholders = teamNames.map(() => '?').join(', ');
    conditions.push(`relatedTeam IN (${placeholders})`);
    params.push(...teamNames);
  }

  if (playerNames.length > 0) {
    const placeholders = playerNames.map(() => '?').join(', ');
    conditions.push(`relatedPlayer IN (${placeholders})`);
    params.push(...playerNames);
  }

  const whereClause = conditions.join(' OR ');

  // Get IDs of events beyond the limit (oldest ones)
  const eventsToKeep = db.prepare(
    `SELECT id FROM FeedEvent
     WHERE ${whereClause}
     ORDER BY occurredAt DESC
     LIMIT ?`
  ).all(...params, limit) as Array<{ id: string }>;

  const keepIds = new Set(eventsToKeep.map((e) => e.id));

  // Get all matching events
  const allEvents = db.prepare(
    `SELECT id FROM FeedEvent
     WHERE ${whereClause}`
  ).all(...params) as Array<{ id: string }>;

  // Delete those not in keep set
  const deleteStmt = db.prepare('DELETE FROM FeedEvent WHERE id = ?');
  const deleteMany = db.transaction((idsToDelete: string[]) => {
    for (const id of idsToDelete) {
      deleteStmt.run(id);
    }
  });

  const idsToDelete = allEvents.filter((e) => !keepIds.has(e.id)).map((e) => e.id);
  if (idsToDelete.length > 0) {
    deleteMany(idsToDelete);
  }
}
