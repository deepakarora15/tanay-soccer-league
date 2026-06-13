import db from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface Favorite {
  id: string;
  playerId: string;
  type: 'team' | 'player';
  entityName: string;
  entityId: string;
  createdAt: string;
}

/**
 * Returns the player's favorites grouped by teams and players.
 */
export function getFavorites(playerId: string): { teams: Favorite[]; players: Favorite[] } {
  const teams = db.prepare(
    `SELECT id, playerId, type, entityName, entityId, createdAt
     FROM Favorite
     WHERE playerId = ? AND type = 'team'
     ORDER BY createdAt DESC`
  ).all(playerId) as Favorite[];

  const players = db.prepare(
    `SELECT id, playerId, type, entityName, entityId, createdAt
     FROM Favorite
     WHERE playerId = ? AND type = 'player'
     ORDER BY createdAt DESC`
  ).all(playerId) as Favorite[];

  return { teams, players };
}

/**
 * Adds a team favorite for the player.
 * Max 5 teams — throws error if limit reached.
 */
export function addFavoriteTeam(playerId: string, entityName: string, entityId: string): Favorite {
  const count = db.prepare(
    `SELECT COUNT(*) as cnt FROM Favorite WHERE playerId = ? AND type = 'team'`
  ).get(playerId) as { cnt: number };

  if (count.cnt >= 5) {
    throw new Error('Maximum of 5 favorite teams reached');
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO Favorite (id, playerId, type, entityName, entityId, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, playerId, 'team', entityName, entityId, now);

  return { id, playerId, type: 'team', entityName, entityId, createdAt: now };
}

/**
 * Adds a player favorite for the player.
 * Max 10 players — throws error if limit reached.
 */
export function addFavoritePlayer(playerId: string, entityName: string, entityId: string): Favorite {
  const count = db.prepare(
    `SELECT COUNT(*) as cnt FROM Favorite WHERE playerId = ? AND type = 'player'`
  ).get(playerId) as { cnt: number };

  if (count.cnt >= 10) {
    throw new Error('Maximum of 10 favorite players reached');
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO Favorite (id, playerId, type, entityName, entityId, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, playerId, 'player', entityName, entityId, now);

  return { id, playerId, type: 'player', entityName, entityId, createdAt: now };
}

/**
 * Removes a favorite. Returns true if deleted, false if not found.
 */
export function removeFavorite(playerId: string, favoriteId: string): boolean {
  const result = db.prepare(
    'DELETE FROM Favorite WHERE id = ? AND playerId = ?'
  ).run(favoriteId, playerId);

  return result.changes > 0;
}
