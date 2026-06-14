import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth';
import { dbAll } from '../db';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const playerId = req.user!.id;
    const period = (req.query.period as string) || 'overall';

    let dateFilter = '';
    const now = new Date();

    if (period === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      dateFilter = ` AND m.resultConfirmedAt >= '${todayStart}'`;
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      dateFilter = ` AND m.resultConfirmedAt >= '${weekAgo}'`;
    } else if (period === 'lastMatch') {
      // Show live match if one exists, otherwise most recently completed match
      let lastMatch = await dbAll("SELECT id, homeTeam, awayTeam, homeScore, awayScore, status FROM Match WHERE status = 'live' ORDER BY scheduledAt DESC LIMIT 1");
      if (lastMatch.length === 0) {
        lastMatch = await dbAll("SELECT id, homeTeam, awayTeam, homeScore, awayScore, status FROM Match WHERE status = 'completed' ORDER BY resultConfirmedAt DESC LIMIT 1");
      }
      if (lastMatch.length > 0) {
        dateFilter = ` AND p.matchId = '${lastMatch[0].id}'`;
        (req as any).lastMatchInfo = lastMatch[0];
      } else {
        res.json({ entries: [], currentPlayer: { rank: 1, playerId, displayName: 'You', totalPoints: 0, accuracy: null, exactPredictions: 0, correctOutcomes: 0 }, lastMatch: null });
        return;
      }
    }

    // Get all active users first
    const allUsers = await dbAll("SELECT id as playerId, displayName FROM User WHERE status = 'active'");

    // Get scores for the selected period
    let scoredPlayers;
    if (period === 'lastMatch' && (req as any).lastMatchInfo) {
      const matchId = (req as any).lastMatchInfo.id;
      scoredPlayers = await dbAll(
        `SELECT p.playerId,
                COALESCE(SUM(p.pointsAwarded), 0) as totalPoints,
                COUNT(CASE WHEN p.pointsAwarded = 3 THEN 1 END) as exactPredictions,
                COUNT(CASE WHEN p.pointsAwarded >= 1 THEN 1 END) as correctOutcomes,
                COUNT(p.id) as scoredPredictions
         FROM Prediction p
         WHERE p.matchId = ?
         GROUP BY p.playerId`,
        matchId
      );
    } else {
      scoredPlayers = await dbAll(
        `SELECT p.playerId,
                COALESCE(SUM(p.pointsAwarded), 0) as totalPoints,
                COUNT(CASE WHEN p.pointsAwarded = 3 THEN 1 END) as exactPredictions,
                COUNT(CASE WHEN p.pointsAwarded >= 1 THEN 1 END) as correctOutcomes,
                COUNT(p.id) as scoredPredictions
         FROM Prediction p
         INNER JOIN Match m ON p.matchId = m.id
         WHERE 1=1${dateFilter}
         GROUP BY p.playerId`
      );
    }

    const scoreMap: Record<string, any> = {};
    for (const s of scoredPlayers) {
      scoreMap[s.playerId] = s;
    }

    // Merge: all users + their scores for the period
    const entries = allUsers.map((u: any, i: number) => {
      const s = scoreMap[u.playerId] || { totalPoints: 0, exactPredictions: 0, correctOutcomes: 0, scoredPredictions: 0 };
      return {
        rank: 0,
        playerId: u.playerId,
        displayName: u.displayName,
        totalPoints: s.totalPoints || 0,
        accuracy: s.scoredPredictions > 0 ? Math.round((s.correctOutcomes / s.scoredPredictions) * 1000) / 10 : null,
        exactPredictions: s.exactPredictions || 0,
        correctOutcomes: s.correctOutcomes || 0,
        closeness: 0, // will be calculated for tiebreaking
      };
    });

    // Calculate closeness for tiebreaking
    // Rule: 1. Got winner right (outcome correct) ranks higher
    //        2. Among same outcome, closest goal difference to actual ranks higher
    if (period === 'lastMatch' && (req as any).lastMatchInfo) {
      const matchInfo = (req as any).lastMatchInfo;
      const actualGD = (matchInfo.homeScore || 0) - (matchInfo.awayScore || 0); // positive = home win
      const predictions = await dbAll(
        "SELECT playerId, predictedHomeScore, predictedAwayScore FROM Prediction WHERE matchId = ?",
        matchInfo.id
      );
      const predMap: Record<string, any> = {};
      for (const p of predictions) {
        predMap[p.playerId] = p;
      }
      entries.forEach((e: any) => {
        const pred = predMap[e.playerId];
        if (pred && matchInfo.homeScore !== null) {
          const predGD = pred.predictedHomeScore - pred.predictedAwayScore;
          const actualOutcome = Math.sign(actualGD); // 1=home win, -1=away win, 0=draw
          const predOutcome = Math.sign(predGD);
          
          // Got winner right? (lower = better: 0 = correct outcome, 1 = wrong outcome)
          e.outcomeCorrect = predOutcome === actualOutcome ? 0 : 1;
          // Goal difference closeness (lower = better)
          e.closeness = Math.abs(predGD - actualGD);
        } else {
          e.outcomeCorrect = 2; // no prediction = worst
          e.closeness = 999;
        }
      });
    }

    // Sort: points desc → outcome correct first → closest goal difference
    entries.sort((a: any, b: any) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (a.outcomeCorrect !== undefined && b.outcomeCorrect !== undefined) {
        if (a.outcomeCorrect !== b.outcomeCorrect) return a.outcomeCorrect - b.outcomeCorrect;
        return a.closeness - b.closeness;
      }
      return 0;
    });

    // Assign ranks — same points + same outcome + same closeness = shared rank
    let currentRank = 1;
    entries.forEach((e: any, i: number) => {
      if (i === 0) {
        e.rank = 1;
      } else if (
        e.totalPoints === entries[i - 1].totalPoints &&
        e.outcomeCorrect === entries[i - 1].outcomeCorrect &&
        e.closeness === entries[i - 1].closeness
      ) {
        e.rank = entries[i - 1].rank;
      } else {
        e.rank = i + 1;
      }
    });

    // If current player not in list, add them
    const currentPlayer = entries.find((e: any) => e.playerId === playerId) || {
      rank: entries.length + 1, playerId, displayName: 'You', totalPoints: 0,
      accuracy: null, exactPredictions: 0, correctOutcomes: 0,
    };

    // Ensure current player is in entries
    if (!entries.find((e: any) => e.playerId === playerId)) {
      entries.push(currentPlayer);
    }

    let lastMatchData = null;
    if (period === 'lastMatch' && (req as any).lastMatchInfo) {
      const matchInfo = (req as any).lastMatchInfo;
      const predictions = await dbAll(
        "SELECT playerId, predictedHomeScore, predictedAwayScore FROM Prediction WHERE matchId = ?",
        matchInfo.id
      );
      const predMap: Record<string, { home: number; away: number }> = {};
      for (const p of predictions) {
        predMap[p.playerId] = { home: p.predictedHomeScore, away: p.predictedAwayScore };
      }
      entries.forEach((e: any) => {
        e.prediction = predMap[e.playerId] || null;
      });
      lastMatchData = {
        homeTeam: matchInfo.homeTeam,
        awayTeam: matchInfo.awayTeam,
        homeScore: matchInfo.homeScore,
        awayScore: matchInfo.awayScore,
        status: matchInfo.status,
      };
    }

    // Get matches for the period (for today/week views)
    let periodMatches: any[] = [];
    if (period === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      periodMatches = await dbAll(
        "SELECT id, homeTeam, awayTeam, homeScore, awayScore, status, scheduledAt, groupName FROM Match WHERE scheduledAt >= ? AND scheduledAt < ? ORDER BY scheduledAt ASC",
        todayStart, tomorrowStart
      );
    } else if (period === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      periodMatches = await dbAll(
        "SELECT id, homeTeam, awayTeam, homeScore, awayScore, status, scheduledAt, groupName FROM Match WHERE scheduledAt >= ? ORDER BY scheduledAt DESC",
        weekAgo
      );
    }

    res.json({ entries, currentPlayer, lastMatch: lastMatchData, matches: periodMatches });
  } catch (error: any) {
    console.error('Leaderboard error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
