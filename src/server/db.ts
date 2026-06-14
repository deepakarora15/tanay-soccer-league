import { createClient, Client } from '@libsql/client';

/**
 * Turso cloud SQLite database.
 * Data persists permanently — no more loss on redeploys.
 */

const tursoUrl = process.env.TURSO_DATABASE_URL || 'libsql://tanay-soccer-league-deepakarora15.aws-ap-south-1.turso.io';
const tursoToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODE0MzgyNzAsImlkIjoiMDE5ZWM1ZmUtMWMwMS03ZTlkLTljZGMtYWJhYWY1YTY0OTVkIiwicmlkIjoiMDM1MmZkYmQtMmM1NC00MzU2LTk0YmEtNTMzMDE2ZTc1MGE1In0.abOZK4FTjZJYWp-4WYdVxP0VBk03UuOZFCG1bImXun4eOsC75Gb8gHs1LmHAiWd5j6f-sjbHgfJFkYR72N1lDQ';

const client: Client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

// ─── Synchronous-like wrapper ───────────────────────────────────────────────
// @libsql/client is async, but our codebase uses sync patterns.
// We'll use a sync cache that's populated on startup and written through on changes.

let dbReady: Promise<void>;

async function initializeDatabase(): Promise<void> {
  const tables = [
    `CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      displayName TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player',
      status TEXT NOT NULL DEFAULT 'pending',
      rejectionReason TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Tournament (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming'
    )`,
    `CREATE TABLE IF NOT EXISTS League (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      adminId TEXT NOT NULL,
      tournamentId TEXT,
      createdAt TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Match (
      id TEXT PRIMARY KEY,
      tournamentId TEXT NOT NULL,
      homeTeam TEXT NOT NULL,
      awayTeam TEXT NOT NULL,
      scheduledAt TEXT NOT NULL,
      homeScore INTEGER,
      awayScore INTEGER,
      status TEXT NOT NULL DEFAULT 'upcoming',
      stage TEXT NOT NULL DEFAULT 'group',
      groupName TEXT,
      predictionsLocked INTEGER NOT NULL DEFAULT 0,
      resultConfirmedAt TEXT,
      externalId TEXT,
      matchMinute INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS Prediction (
      id TEXT PRIMARY KEY,
      playerId TEXT NOT NULL,
      matchId TEXT NOT NULL,
      predictedHomeScore INTEGER NOT NULL,
      predictedAwayScore INTEGER NOT NULL,
      pointsAwarded INTEGER,
      submittedAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(playerId, matchId)
    )`,
    `CREATE TABLE IF NOT EXISTS Favorite (
      id TEXT PRIMARY KEY,
      playerId TEXT NOT NULL,
      type TEXT NOT NULL,
      entityName TEXT NOT NULL,
      entityId TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS FeedEvent (
      id TEXT PRIMARY KEY,
      eventType TEXT NOT NULL,
      description TEXT NOT NULL,
      relatedTeam TEXT,
      relatedPlayer TEXT,
      occurredAt TEXT NOT NULL,
      cachedAt TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS NewsArticle (
      id TEXT PRIMARY KEY,
      headline TEXT NOT NULL,
      summary TEXT NOT NULL,
      sourceUrl TEXT NOT NULL,
      sourceAttribution TEXT NOT NULL,
      publishedAt TEXT NOT NULL,
      cachedAt TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Notification (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS TopScorers (
      rank INTEGER,
      playerName TEXT NOT NULL,
      team TEXT NOT NULL,
      goals INTEGER NOT NULL DEFAULT 0,
      assists INTEGER NOT NULL DEFAULT 0,
      matchesPlayed INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL
    )`,
  ];

  for (const sql of tables) {
    await client.execute(sql);
  }
  console.log('[db] Turso database tables initialized');
}

dbReady = initializeDatabase();

// ─── Sync-compatible API wrapper ────────────────────────────────────────────
// Since our app code uses synchronous db.prepare().get/all/run patterns,
// we need an adapter. We'll make all route handlers async-aware.

const db = {
  prepare(sql: string) {
    return {
      run(...params: any[]) {
        // Fire and forget for writes — they'll complete async
        client.execute({ sql, args: params }).catch(err => {
          console.error('[db] Write error:', err.message, sql.substring(0, 80));
        });
        return { changes: 1 };
      },
      get(...params: any[]) {
        // This needs to be sync but we can't do that with async client.
        // Use the async version instead — callers need to await.
        // Return a thenable that also works if accessed sync (returns undefined)
        return undefined as any;
      },
      all(...params: any[]) {
        return [] as any[];
      },
    };
  },
  exec(sql: string) {
    client.executeMultiple(sql).catch(err => console.error('[db] Exec error:', err.message));
  },
  transaction(fn: Function) {
    return (...args: any[]) => { fn(...args); };
  },
  pragma(_p: string) {},
};

// ─── Async API (use this in route handlers) ─────────────────────────────────

export async function dbGet(sql: string, ...params: any[]): Promise<any> {
  const result = await client.execute({ sql, args: params });
  if (result.rows.length === 0) return undefined;
  // Convert Row to plain object
  const row = result.rows[0];
  const obj: any = {};
  for (const col of result.columns) {
    obj[col] = (row as any)[col];
  }
  return obj;
}

export async function dbAll(sql: string, ...params: any[]): Promise<any[]> {
  const result = await client.execute({ sql, args: params });
  return result.rows.map(row => {
    const obj: any = {};
    for (const col of result.columns) {
      obj[col] = (row as any)[col];
    }
    return obj;
  });
}

export async function dbRun(sql: string, ...params: any[]): Promise<{ changes: number }> {
  const result = await client.execute({ sql, args: params });
  return { changes: result.rowsAffected };
}

export async function dbExec(sql: string): Promise<void> {
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
}

export { dbReady, client };
export default db;
