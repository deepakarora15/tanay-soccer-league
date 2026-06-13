import '../src/server/db';
import { dbReady } from '../src/server/db';
import db from '../src/server/db';

async function main() {
  await dbReady;
  
  // Set the first user as active admin_player
  db.prepare(
    "UPDATE User SET status = 'active', role = 'admin_player', updatedAt = ? WHERE email = ?"
  ).run(new Date().toISOString(), 'admin@league.com');
  
  // Create a league for them
  const { v4: uuidv4 } = require('uuid');
  const leagueId = uuidv4();
  const user = db.prepare("SELECT id FROM User WHERE email = ?").get('admin@league.com') as any;
  
  if (user) {
    db.prepare(
      "INSERT OR IGNORE INTO League (id, name, adminId, tournamentId, createdAt) VALUES (?, ?, ?, NULL, ?)"
    ).run(leagueId, 'Friends Prediction League', user.id, new Date().toISOString());
    console.log('Admin user activated and league created!');
    console.log('Login with: admin@league.com / admin123');
  } else {
    console.log('User not found');
  }
}

main();
