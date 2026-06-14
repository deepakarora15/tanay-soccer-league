import cron from 'node-cron';
import { Resend } from 'resend';
import { dbAll } from '../db';

const resend = new Resend('re_PJuxQ9g2_48NXGggRXHDMcd7gPu3UNEr3');
const APP_URL = 'https://tanay-soccer-league.onrender.com';

/**
 * Sends email reminders to users who haven't predicted for tomorrow's matches.
 * Runs daily at 8 AM UTC (1:30 PM IST).
 */
async function sendReminders(): Promise<void> {
  try {
    // Get matches in the next 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingMatches = await dbAll(
      "SELECT id, homeTeam, awayTeam, scheduledAt, groupName FROM Match WHERE status = 'upcoming' AND scheduledAt >= ? AND scheduledAt <= ? ORDER BY scheduledAt ASC",
      now.toISOString(), tomorrow.toISOString()
    );

    if (upcomingMatches.length === 0) {
      console.log('[email-reminder] No matches in next 24 hours, skipping');
      return;
    }

    // Get all active users
    const users = await dbAll("SELECT id, email, displayName FROM User WHERE status = 'active'");

    let sent = 0;

    for (const user of users) {
      // Check which upcoming matches this user hasn't predicted
      const userPredictions = await dbAll(
        "SELECT matchId FROM Prediction WHERE playerId = ?", user.id
      );
      const predictedMatchIds = new Set(userPredictions.map((p: any) => p.matchId));

      const unpredicted = upcomingMatches.filter((m: any) => !predictedMatchIds.has(m.id));

      if (unpredicted.length === 0) continue; // User has predicted all — no email

      // Build match list for email
      const matchList = unpredicted.map((m: any) => {
        const time = new Date(m.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
        return `⚽ ${m.homeTeam} vs ${m.awayTeam} — ${time} IST${m.groupName ? ` (${m.groupName})` : ''}`;
      }).join('\n');

      // Send email
      try {
        await resend.emails.send({
          from: 'Tanay Soccer League <onboarding@resend.dev>',
          to: user.email,
          subject: `🎯 ${unpredicted.length} match${unpredicted.length > 1 ? 'es' : ''} to predict — don't miss out!`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #16a34a;">⚽ Tanay Soccer League 2026</h2>
              <p>Hey <strong>${user.displayName}</strong>,</p>
              <p>You haven't predicted for ${unpredicted.length} upcoming match${unpredicted.length > 1 ? 'es' : ''}:</p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <pre style="margin: 0; font-family: sans-serif; white-space: pre-wrap;">${matchList}</pre>
              </div>
              <p><strong>3 points</strong> for exact score, <strong>1 point</strong> for correct outcome!</p>
              <a href="${APP_URL}/predictions" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                🎯 Predict Now
              </a>
              <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">— Tanay Soccer League</p>
            </div>
          `,
        });
        sent++;
      } catch (emailErr: any) {
        console.error(`[email-reminder] Failed to send to ${user.email}:`, emailErr.message);
      }
    }

    console.log(`[email-reminder] Sent ${sent} reminders for ${upcomingMatches.length} matches`);
  } catch (error: any) {
    console.error('[email-reminder] Error:', error.message);
  }
}

export function startEmailReminder(): cron.ScheduledTask {
  // Run daily at 3:30 AM UTC (9:00 AM IST)
  return cron.schedule('30 3 * * *', async () => {
    await sendReminders();
  });
}

// Export for manual trigger from admin
export { sendReminders };
