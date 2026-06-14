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
  if (matchCount.length === 0) {
    await seedMatches();
    console.log('[bootstrap] Matches seeded');
  }

  // Seed news if not exists
  const newsCount = await dbAll('SELECT id FROM NewsArticle LIMIT 1');
  if (newsCount.length === 0) {
    await seedNews();
    console.log('[bootstrap] News seeded');
  }
}

async function seedMatches(): Promise<void> {
  const matches = [
    { id: 'match-001', home: 'Mexico', away: 'South Africa', time: '2026-06-11T19:00:00Z', group: 'Group A', status: 'completed', hs: 2, as: 0 },
    { id: 'match-002', home: 'South Korea', away: 'Czechia', time: '2026-06-12T02:00:00Z', group: 'Group A', status: 'completed', hs: 2, as: 1 },
    { id: 'match-003', home: 'Canada', away: 'Bosnia and Herzegovina', time: '2026-06-12T19:00:00Z', group: 'Group B', status: 'completed', hs: 1, as: 1 },
    { id: 'match-004', home: 'USA', away: 'Paraguay', time: '2026-06-13T01:00:00Z', group: 'Group D', status: 'completed', hs: 4, as: 1 },
    { id: 'match-005', home: 'Qatar', away: 'Switzerland', time: '2026-06-13T19:00:00Z', group: 'Group B', status: 'upcoming', hs: null, as: null },
    { id: 'match-006', home: 'Brazil', away: 'Morocco', time: '2026-06-13T22:00:00Z', group: 'Group C', status: 'upcoming', hs: null, as: null },
    { id: 'match-007', home: 'Haiti', away: 'Scotland', time: '2026-06-14T01:00:00Z', group: 'Group C', status: 'upcoming', hs: null, as: null },
    { id: 'match-008', home: 'Australia', away: 'Turkiye', time: '2026-06-14T04:00:00Z', group: 'Group D', status: 'upcoming', hs: null, as: null },
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
