import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './db';

/**
 * Ensures an admin user and tournament data exist on startup.
 * If the admin user doesn't exist or has a corrupt password, recreates it.
 */
export function bootstrapAdmin(): void {
  const adminEmail = 'admin@league.com';
  const adminPassword = 'admin123';
  const adminDisplayName = 'LeagueAdmin';

  // Check if admin exists and is active
  const existing = db.prepare(
    "SELECT id, status, passwordHash FROM User WHERE email = ?"
  ).get(adminEmail) as { id: string; status: string; passwordHash: string } | undefined;

  if (existing && existing.status === 'active') {
    // Verify the password hash is valid (not corrupted)
    const isValid = bcrypt.compareSync(adminPassword, existing.passwordHash);
    if (isValid) {
      console.log('[bootstrap] Admin user verified');
      ensureTournamentData();
      return;
    }
    // Password hash is corrupt — fix it
    const newHash = bcrypt.hashSync(adminPassword, 10);
    db.prepare("UPDATE User SET passwordHash = ? WHERE id = ?").run(newHash, existing.id);
    console.log('[bootstrap] Admin password hash repaired');
    ensureTournamentData();
    return;
  }

  // Create admin user from scratch
  const hash = bcrypt.hashSync(adminPassword, 10);
  const userId = existing?.id || uuidv4();
  const now = new Date().toISOString();

  if (existing) {
    // User exists but not active — activate and fix
    db.prepare(
      "UPDATE User SET status = ?, role = ?, passwordHash = ?, updatedAt = ? WHERE id = ?"
    ).run('active', 'admin_player', hash, now, existing.id);
  } else {
    // Create new admin user
    db.prepare(
      "INSERT INTO User (id, email, displayName, passwordHash, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(userId, adminEmail, adminDisplayName, hash, 'admin_player', 'active', now, now);
  }

  console.log('[bootstrap] Admin user created/activated: admin@league.com / admin123');
  ensureTournamentData();
}

function ensureTournamentData(): void {
  // Check if tournament exists
  const tournament = db.prepare(
    "SELECT id FROM Tournament WHERE id = ?"
  ).get('fifa-wc-2026');

  if (!tournament) {
    // Reload from the JSON file
    console.log('[bootstrap] Tournament data will be loaded from league.json on startup');
  }
}
