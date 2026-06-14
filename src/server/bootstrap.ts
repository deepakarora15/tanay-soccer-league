import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun, dbAll, dbReady } from './db';

/**
 * Seeds admin user and tournament data on startup.
 */
export async function bootstrapAdmin(): Promise<void> {
  await dbReady;

  const adminEmail = 'admin@league.com';
  const adminPassword = 'admin123';

  const existing = await dbGet('SELECT id, status, passwordHash FROM User WHERE email = ?', adminEmail);

  if (existing) {
    // Fix password if corrupted
    const isValid = bcrypt.compareSync(adminPassword, existing.passwordHash);
    if (!isValid) {
      const hash = bcrypt.hashSync(adminPassword, 10);
      await dbRun('UPDATE User SET passwordHash = ?, status = ?, role = ? WHERE id = ?', hash, 'active', 'admin_player', existing.id);
      console.log('[bootstrap] Admin password repaired');
    }
  } else {
    const hash = bcrypt.hashSync(adminPassword, 10);
    const now = new Date().toISOString();
    await dbRun(
      'INSERT INTO User (id, email, displayName, passwordHash, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      uuidv4(), adminEmail, 'LeagueAdmin', hash, 'admin_player', 'active', now, now
    );
    console.log('[bootstrap] Admin user created');
  }

  // Seed tournament if not exists
  const tournament = await dbGet('SELECT id FROM Tournament WHERE id = ?', 'fifa-wc-2026');
  if (!tournament) {
    await dbRun(
      'INSERT INTO Tournament (id, name, startDate, endDate, status) VALUES (?, ?, ?, ?, ?)',
      'fifa-wc-2026', 'FIFA World Cup 2026', '2026-06-11', '2026-07-19', 'active'
    );
    console.log('[bootstrap] Tournament seeded');
  }

  // Seed matches if not exists
  const matchCount = await dbAll('SELECT id FROM Match LIMIT 1');

  // Add matchMinute column if missing (migration)
  try { await dbRun("ALTER TABLE Match ADD COLUMN matchMinute INTEGER"); } catch {}

  if (matchCount.length === 0) {
    await seedMatches();
    console.log('[bootstrap] Matches seeded');
  } else {
    // Ensure all 72 matches exist (add missing ones)
    await seedMatches();
    // Update results for matches that have been played
    await updateResults();
  }

  // Clean up test users
  await dbRun("DELETE FROM User WHERE email IN ('testpersist@test.com', 'check123@test.com')");
  await dbRun("DELETE FROM User WHERE email LIKE '%test.com' AND email != 'admin@league.com'");

  // Seed news if not exists
  const newsCount = await dbAll('SELECT id FROM NewsArticle LIMIT 1');
  if (newsCount.length === 0) {
    await seedNews();
    console.log('[bootstrap] News seeded');
  }
}

async function seedMatches(): Promise<void> {
  const matches = [
    // Matchday 1
    { id: 'match-001', home: 'Mexico', away: 'South Africa', time: '2026-06-11T19:00:00Z', group: 'Group A', status: 'completed', hs: 2, as: 0 },
    { id: 'match-002', home: 'South Korea', away: 'Czechia', time: '2026-06-12T02:00:00Z', group: 'Group A', status: 'completed', hs: 2, as: 1 },
    { id: 'match-003', home: 'Canada', away: 'Bosnia and Herzegovina', time: '2026-06-12T19:00:00Z', group: 'Group B', status: 'completed', hs: 1, as: 1 },
    { id: 'match-004', home: 'USA', away: 'Paraguay', time: '2026-06-13T01:00:00Z', group: 'Group D', status: 'completed', hs: 4, as: 1 },
    { id: 'match-005', home: 'Qatar', away: 'Switzerland', time: '2026-06-13T19:00:00Z', group: 'Group B', status: 'completed', hs: 1, as: 1 },
    { id: 'match-006', home: 'Brazil', away: 'Morocco', time: '2026-06-13T22:00:00Z', group: 'Group C', status: 'completed', hs: 1, as: 1 },
    { id: 'match-007', home: 'Haiti', away: 'Scotland', time: '2026-06-14T01:00:00Z', group: 'Group C', status: 'completed', hs: 0, as: 1 },
    { id: 'match-008', home: 'Australia', away: 'Turkiye', time: '2026-06-14T04:00:00Z', group: 'Group D', status: 'completed', hs: 2, as: 0 },
    { id: 'match-009', home: 'Germany', away: 'Curacao', time: '2026-06-14T17:00:00Z', group: 'Group E', status: 'upcoming', hs: null, as: null },
    { id: 'match-010', home: 'Netherlands', away: 'Japan', time: '2026-06-14T20:00:00Z', group: 'Group F', status: 'upcoming', hs: null, as: null },
    { id: 'match-011', home: 'Ivory Coast', away: 'Ecuador', time: '2026-06-14T23:00:00Z', group: 'Group E', status: 'upcoming', hs: null, as: null },
    { id: 'match-012', home: 'Sweden', away: 'Tunisia', time: '2026-06-15T02:00:00Z', group: 'Group F', status: 'upcoming', hs: null, as: null },
    { id: 'match-013', home: 'Spain', away: 'Cape Verde', time: '2026-06-15T16:00:00Z', group: 'Group H', status: 'upcoming', hs: null, as: null },
    { id: 'match-014', home: 'Belgium', away: 'Egypt', time: '2026-06-15T19:00:00Z', group: 'Group G', status: 'upcoming', hs: null, as: null },
    { id: 'match-015', home: 'Saudi Arabia', away: 'Uruguay', time: '2026-06-15T22:00:00Z', group: 'Group H', status: 'upcoming', hs: null, as: null },
    { id: 'match-016', home: 'Iran', away: 'New Zealand', time: '2026-06-16T01:00:00Z', group: 'Group G', status: 'upcoming', hs: null, as: null },
    { id: 'match-017', home: 'France', away: 'Senegal', time: '2026-06-16T19:00:00Z', group: 'Group I', status: 'upcoming', hs: null, as: null },
    { id: 'match-018', home: 'Iraq', away: 'Norway', time: '2026-06-16T22:00:00Z', group: 'Group I', status: 'upcoming', hs: null, as: null },
    { id: 'match-019', home: 'Argentina', away: 'Algeria', time: '2026-06-17T01:00:00Z', group: 'Group J', status: 'upcoming', hs: null, as: null },
    { id: 'match-020', home: 'Austria', away: 'Jordan', time: '2026-06-17T04:00:00Z', group: 'Group J', status: 'upcoming', hs: null, as: null },
    { id: 'match-021', home: 'Portugal', away: 'DR Congo', time: '2026-06-17T17:00:00Z', group: 'Group K', status: 'upcoming', hs: null, as: null },
    { id: 'match-022', home: 'England', away: 'Croatia', time: '2026-06-17T20:00:00Z', group: 'Group L', status: 'upcoming', hs: null, as: null },
    { id: 'match-023', home: 'Ghana', away: 'Panama', time: '2026-06-17T23:00:00Z', group: 'Group L', status: 'upcoming', hs: null, as: null },
    { id: 'match-024', home: 'Uzbekistan', away: 'Colombia', time: '2026-06-18T02:00:00Z', group: 'Group K', status: 'upcoming', hs: null, as: null },
    // Matchday 2
    { id: 'match-025', home: 'Czechia', away: 'South Africa', time: '2026-06-18T16:00:00Z', group: 'Group A', status: 'upcoming', hs: null, as: null },
    { id: 'match-026', home: 'Switzerland', away: 'Bosnia and Herzegovina', time: '2026-06-18T19:00:00Z', group: 'Group B', status: 'upcoming', hs: null, as: null },
    { id: 'match-027', home: 'Canada', away: 'Qatar', time: '2026-06-18T22:00:00Z', group: 'Group B', status: 'upcoming', hs: null, as: null },
    { id: 'match-028', home: 'Mexico', away: 'South Korea', time: '2026-06-19T01:00:00Z', group: 'Group A', status: 'upcoming', hs: null, as: null },
    { id: 'match-029', home: 'USA', away: 'Australia', time: '2026-06-19T19:00:00Z', group: 'Group D', status: 'upcoming', hs: null, as: null },
    { id: 'match-030', home: 'Scotland', away: 'Morocco', time: '2026-06-19T22:00:00Z', group: 'Group C', status: 'upcoming', hs: null, as: null },
    { id: 'match-031', home: 'Brazil', away: 'Haiti', time: '2026-06-20T00:30:00Z', group: 'Group C', status: 'upcoming', hs: null, as: null },
    { id: 'match-032', home: 'Turkiye', away: 'Paraguay', time: '2026-06-20T03:00:00Z', group: 'Group D', status: 'upcoming', hs: null, as: null },
    { id: 'match-033', home: 'Netherlands', away: 'Sweden', time: '2026-06-20T17:00:00Z', group: 'Group F', status: 'upcoming', hs: null, as: null },
    { id: 'match-034', home: 'Germany', away: 'Ivory Coast', time: '2026-06-20T20:00:00Z', group: 'Group E', status: 'upcoming', hs: null, as: null },
    { id: 'match-035', home: 'Ecuador', away: 'Curacao', time: '2026-06-21T03:00:00Z', group: 'Group E', status: 'upcoming', hs: null, as: null },
    { id: 'match-036', home: 'Tunisia', away: 'Japan', time: '2026-06-21T04:00:00Z', group: 'Group F', status: 'upcoming', hs: null, as: null },
    { id: 'match-037', home: 'Spain', away: 'Saudi Arabia', time: '2026-06-21T16:00:00Z', group: 'Group H', status: 'upcoming', hs: null, as: null },
    { id: 'match-038', home: 'Belgium', away: 'Iran', time: '2026-06-21T19:00:00Z', group: 'Group G', status: 'upcoming', hs: null, as: null },
    { id: 'match-039', home: 'Uruguay', away: 'Cape Verde', time: '2026-06-21T22:00:00Z', group: 'Group H', status: 'upcoming', hs: null, as: null },
    { id: 'match-040', home: 'New Zealand', away: 'Egypt', time: '2026-06-22T01:00:00Z', group: 'Group G', status: 'upcoming', hs: null, as: null },
    { id: 'match-041', home: 'Argentina', away: 'Austria', time: '2026-06-22T17:00:00Z', group: 'Group J', status: 'upcoming', hs: null, as: null },
    { id: 'match-042', home: 'France', away: 'Iraq', time: '2026-06-22T21:00:00Z', group: 'Group I', status: 'upcoming', hs: null, as: null },
    { id: 'match-043', home: 'Norway', away: 'Senegal', time: '2026-06-23T00:00:00Z', group: 'Group I', status: 'upcoming', hs: null, as: null },
    { id: 'match-044', home: 'Jordan', away: 'Algeria', time: '2026-06-23T03:00:00Z', group: 'Group J', status: 'upcoming', hs: null, as: null },
    { id: 'match-045', home: 'Portugal', away: 'Uzbekistan', time: '2026-06-23T17:00:00Z', group: 'Group K', status: 'upcoming', hs: null, as: null },
    { id: 'match-046', home: 'England', away: 'Ghana', time: '2026-06-23T20:00:00Z', group: 'Group L', status: 'upcoming', hs: null, as: null },
    { id: 'match-047', home: 'Panama', away: 'Croatia', time: '2026-06-23T23:00:00Z', group: 'Group L', status: 'upcoming', hs: null, as: null },
    { id: 'match-048', home: 'Colombia', away: 'DR Congo', time: '2026-06-24T02:00:00Z', group: 'Group K', status: 'upcoming', hs: null, as: null },
    // Matchday 3
    { id: 'match-049', home: 'Switzerland', away: 'Canada', time: '2026-06-24T19:00:00Z', group: 'Group B', status: 'upcoming', hs: null, as: null },
    { id: 'match-050', home: 'Bosnia and Herzegovina', away: 'Qatar', time: '2026-06-24T19:00:00Z', group: 'Group B', status: 'upcoming', hs: null, as: null },
    { id: 'match-051', home: 'Scotland', away: 'Brazil', time: '2026-06-24T22:00:00Z', group: 'Group C', status: 'upcoming', hs: null, as: null },
    { id: 'match-052', home: 'Morocco', away: 'Haiti', time: '2026-06-24T22:00:00Z', group: 'Group C', status: 'upcoming', hs: null, as: null },
    { id: 'match-053', home: 'Czechia', away: 'Mexico', time: '2026-06-25T01:00:00Z', group: 'Group A', status: 'upcoming', hs: null, as: null },
    { id: 'match-054', home: 'South Africa', away: 'South Korea', time: '2026-06-25T01:00:00Z', group: 'Group A', status: 'upcoming', hs: null, as: null },
    { id: 'match-055', home: 'Ecuador', away: 'Germany', time: '2026-06-25T20:00:00Z', group: 'Group E', status: 'upcoming', hs: null, as: null },
    { id: 'match-056', home: 'Curacao', away: 'Ivory Coast', time: '2026-06-25T20:00:00Z', group: 'Group E', status: 'upcoming', hs: null, as: null },
    { id: 'match-057', home: 'Japan', away: 'Sweden', time: '2026-06-25T23:00:00Z', group: 'Group F', status: 'upcoming', hs: null, as: null },
    { id: 'match-058', home: 'Tunisia', away: 'Netherlands', time: '2026-06-25T23:00:00Z', group: 'Group F', status: 'upcoming', hs: null, as: null },
    { id: 'match-059', home: 'Turkiye', away: 'USA', time: '2026-06-26T02:00:00Z', group: 'Group D', status: 'upcoming', hs: null, as: null },
    { id: 'match-060', home: 'Paraguay', away: 'Australia', time: '2026-06-26T02:00:00Z', group: 'Group D', status: 'upcoming', hs: null, as: null },
    { id: 'match-061', home: 'Norway', away: 'France', time: '2026-06-26T19:00:00Z', group: 'Group I', status: 'upcoming', hs: null, as: null },
    { id: 'match-062', home: 'Senegal', away: 'Iraq', time: '2026-06-26T19:00:00Z', group: 'Group I', status: 'upcoming', hs: null, as: null },
    { id: 'match-063', home: 'Cape Verde', away: 'Saudi Arabia', time: '2026-06-27T00:00:00Z', group: 'Group H', status: 'upcoming', hs: null, as: null },
    { id: 'match-064', home: 'Uruguay', away: 'Spain', time: '2026-06-27T00:00:00Z', group: 'Group H', status: 'upcoming', hs: null, as: null },
    { id: 'match-065', home: 'Egypt', away: 'Iran', time: '2026-06-27T03:00:00Z', group: 'Group G', status: 'upcoming', hs: null, as: null },
    { id: 'match-066', home: 'New Zealand', away: 'Belgium', time: '2026-06-27T03:00:00Z', group: 'Group G', status: 'upcoming', hs: null, as: null },
    { id: 'match-067', home: 'Panama', away: 'England', time: '2026-06-27T21:00:00Z', group: 'Group L', status: 'upcoming', hs: null, as: null },
    { id: 'match-068', home: 'Croatia', away: 'Ghana', time: '2026-06-27T21:00:00Z', group: 'Group L', status: 'upcoming', hs: null, as: null },
    { id: 'match-069', home: 'Colombia', away: 'Portugal', time: '2026-06-27T23:30:00Z', group: 'Group K', status: 'upcoming', hs: null, as: null },
    { id: 'match-070', home: 'DR Congo', away: 'Uzbekistan', time: '2026-06-27T23:30:00Z', group: 'Group K', status: 'upcoming', hs: null, as: null },
    { id: 'match-071', home: 'Algeria', away: 'Austria', time: '2026-06-28T02:00:00Z', group: 'Group J', status: 'upcoming', hs: null, as: null },
    { id: 'match-072', home: 'Jordan', away: 'Argentina', time: '2026-06-28T02:00:00Z', group: 'Group J', status: 'upcoming', hs: null, as: null },
  ];

  for (const m of matches) {
    await dbRun(
      `INSERT OR IGNORE INTO Match (id, tournamentId, homeTeam, awayTeam, scheduledAt, homeScore, awayScore, status, stage, groupName, predictionsLocked, resultConfirmedAt, externalId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      m.id, 'fifa-wc-2026', m.home, m.away, m.time, m.hs, m.as, m.status, 'group', m.group,
      m.status === 'completed' ? 1 : 0, m.status === 'completed' ? m.time : null, null
    );
  }
}

async function seedNews(): Promise<void> {
  const articles = [
    { id: 'news-001', headline: 'USA dominates Paraguay 4-1 in World Cup opener', summary: 'Folarin Balogun scored twice and Christian Pulisic starred as the US recorded a commanding victory in Los Angeles.', source: 'NBC News', url: 'https://nbcnews.com', date: '2026-06-13T05:00:00Z' },
    { id: 'news-002', headline: 'Mexico wins tournament opener 2-0 against South Africa', summary: 'Mexico scored through Julián Quiñones at Estadio Azteca. Three red cards made World Cup history.', source: 'NBC News', url: 'https://nbcnews.com', date: '2026-06-11T22:00:00Z' },
    { id: 'news-003', headline: 'South Korea stages epic 2-1 comeback over Czechia', summary: 'South Korea scored twice in the second half for a dramatic comeback win in Guadalajara.', source: 'Fox Sports', url: 'https://foxsports.com', date: '2026-06-12T04:00:00Z' },
    { id: 'news-004', headline: 'Shakira headlines World Cup opening ceremony', summary: 'The biggest World Cup kicked off with a star-studded ceremony featuring Shakira, Tyla, and Alejandro Fernández.', source: 'CBS News', url: 'https://cbsnews.com', date: '2026-06-11T18:00:00Z' },
    { id: 'news-005', headline: 'Argentina tops FIFA rankings ahead of title defense', summary: 'Defending champions Argentina surged to the top of rankings ahead of their Group J opener.', source: 'USA Today', url: 'https://usatoday.com', date: '2026-06-11T15:00:00Z' },
  ];

  const now = new Date().toISOString();
  for (const a of articles) {
    await dbRun(
      'INSERT OR IGNORE INTO NewsArticle (id, headline, summary, sourceUrl, sourceAttribution, publishedAt, cachedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      a.id, a.headline, a.summary, a.url, a.source, a.date, now
    );
  }
}

async function updateResults(): Promise<void> {
  // Actual results from the World Cup
  const results = [
    { id: 'match-001', hs: 2, as: 0 },
    { id: 'match-002', hs: 2, as: 1 },
    { id: 'match-003', hs: 1, as: 1 },
    { id: 'match-004', hs: 4, as: 1 },
    { id: 'match-005', hs: 1, as: 1 },
    { id: 'match-006', hs: 1, as: 1 },
    { id: 'match-007', hs: 0, as: 1 },
    { id: 'match-008', hs: 2, as: 0 },
  ];

  for (const r of results) {
    await dbRun(
      "UPDATE Match SET homeScore = ?, awayScore = ?, status = 'completed', predictionsLocked = 1, resultConfirmedAt = ? WHERE id = ? AND status != 'completed'",
      r.hs, r.as, new Date().toISOString(), r.id
    );
  }

  // Score all predictions for completed matches that haven't been scored yet
  const unscored = await dbAll(
    `SELECT p.id, p.matchId, p.predictedHomeScore, p.predictedAwayScore, m.homeScore, m.awayScore
     FROM Prediction p
     JOIN Match m ON p.matchId = m.id
     WHERE m.status = 'completed' AND p.pointsAwarded IS NULL AND m.homeScore IS NOT NULL`
  );

  for (const pred of unscored) {
    let points = 0;
    if (pred.predictedHomeScore === pred.homeScore && pred.predictedAwayScore === pred.awayScore) {
      points = 3;
    } else {
      const pOutcome = Math.sign(pred.predictedHomeScore - pred.predictedAwayScore);
      const aOutcome = Math.sign(pred.homeScore - pred.awayScore);
      if (pOutcome === aOutcome) points = 1;
    }
    await dbRun("UPDATE Prediction SET pointsAwarded = ? WHERE id = ?", points, pred.id);
  }

  if (unscored.length > 0) console.log(`[bootstrap] Scored ${unscored.length} pending predictions`);
}
