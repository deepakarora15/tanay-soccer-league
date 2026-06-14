import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  totalPoints: number;
  accuracy: number | null;
  exactPredictions: number;
  correctOutcomes: number;
  rank: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentPlayer: LeaderboardEntry;
  lastMatch?: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
  };
}

type Period = 'overall' | 'week' | 'today' | 'lastMatch';

export default function Leaderboard() {
  const { apiCall } = useApi();
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [lastMatch, setLastMatch] = useState<any>(null);
  const [periodMatches, setPeriodMatches] = useState<any[]>([]);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [matchPredictions, setMatchPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('lastMatch');

  useEffect(() => {
    setLoading(true);
    setExpandedMatch(null);
    apiCall<any>(`/api/leaderboard?period=${period}`)
      .then((data) => { setEntries(data.entries || []); setLastMatch(data.lastMatch || null); setPeriodMatches(data.matches || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const viewMatchPredictions = async (matchId: string) => {
    if (expandedMatch === matchId) { setExpandedMatch(null); return; }
    setExpandedMatch(matchId);
    try {
      const data = await apiCall<any>(`/api/match-predictions/${matchId}/predictions`);
      setMatchPredictions(data.predictions || []);
    } catch { setMatchPredictions([]); }
  };

  const getRankIcon = (rank: number, points: number) => {
    if (points === 0) return `${rank}`;
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🏆 Leaderboard</h2>

      {/* Period Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { key: 'lastMatch', label: 'Last Match' },
          { key: 'today', label: 'Today' },
          { key: 'week', label: 'This Week' },
          { key: 'overall', label: 'Overall' },
        ] as { key: Period; label: string }[]).map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              period === p.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">🏆</p>
          <p className="text-gray-500 dark:text-gray-400">
            {period === 'today' ? 'No predictions scored today yet.' :
             period === 'lastMatch' ? 'No match results available yet.' :
             period === 'week' ? 'No predictions scored this week.' :
             'No rankings yet. Start predicting!'}
          </p>
        </div>
      ) : (
        <>
        {/* Match slicer for Today/Week — positioned above the scoreboard */}
        {(period === 'today' || period === 'week') && periodMatches.length > 0 && (
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2">
              {periodMatches.map((m: any) => {
                const isPlayable = m.status === 'completed' || m.status === 'live';
                const isSelected = expandedMatch === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => isPlayable ? viewMatchPredictions(m.id) : null}
                    disabled={!isPlayable}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      !isPlayable
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-default'
                        : isSelected
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <span>{m.homeTeam.slice(0,3).toUpperCase()}</span>
                    <span className="mx-1 font-bold">{isPlayable ? `${m.homeScore??0}-${m.awayScore??0}` : 'vs'}</span>
                    <span>{m.awayTeam.slice(0,3).toUpperCase()}</span>
                    {m.status === 'live' && <span className="ml-1 text-red-500">●</span>}
                    {m.status === 'upcoming' && <span className="ml-1 text-gray-300">⏳</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Expanded match predictions */}
        {expandedMatch && (period === 'today' || period === 'week') && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            {matchPredictions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center">No predictions for this match</p>
            ) : (
              <div className="space-y-1">
                {matchPredictions.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <span className="text-gray-800 dark:text-gray-200">{p.displayName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">{p.predictedHomeScore} - {p.predictedAwayScore}</span>
                      {p.pointsAwarded !== null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                          p.pointsAwarded === 3 ? 'bg-green-100 dark:bg-green-900/40 text-green-700' :
                          p.pointsAwarded === 1 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}>+{p.pointsAwarded}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Last match actual score banner */}
          {period === 'lastMatch' && lastMatch && (
            <div className={`${lastMatch.status === 'live' ? 'bg-red-600' : 'bg-green-600'} text-white px-4 py-3 text-center`}>
              {lastMatch.status === 'live' && (
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-live-pulse"></span>
                  <span className="text-xs font-medium">LIVE — Score may update with 2-5 min lag</span>
                </div>
              )}
              {lastMatch.status === 'completed' && <p className="text-xs opacity-80">Final Score</p>}
              <p className="text-lg font-bold">{lastMatch.homeTeam} {lastMatch.homeScore ?? 0} - {lastMatch.awayScore ?? 0} {lastMatch.awayTeam}</p>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
              <tr>
                <th className="text-left px-3 py-3 font-semibold w-[40px]">#</th>
                <th className="text-left px-3 py-3 font-semibold">Player</th>
                {period === 'lastMatch' && <th className="text-center px-3 py-3 font-semibold">Predicted</th>}
                <th className="text-center px-3 py-3 font-semibold">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => {
                const isCurrentUser = entry.playerId === user?.id;
                return (
                  <tr
                    key={entry.playerId}
                    className={isCurrentUser ? 'bg-green-50 dark:bg-green-900/20 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
                  >
                    <td className="px-3 py-3">
                      <span className={entry.rank <= 3 && entry.totalPoints > 0 ? 'text-xl' : 'text-gray-600 dark:text-gray-400'}>
                        {getRankIcon(entry.rank, entry.totalPoints)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-900 dark:text-gray-100">
                      {entry.displayName}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">You</span>
                      )}
                    </td>
                    {period === 'lastMatch' && (
                      <td className="text-center px-3 py-3 font-mono text-gray-700 dark:text-gray-300">
                        {(entry as any).prediction ? `${(entry as any).prediction.home} - ${(entry as any).prediction.away}` : '—'}
                      </td>
                    )}
                    <td className="text-center px-3 py-3 font-bold text-blue-600 dark:text-blue-400">{entry.totalPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
      )}
    </div>
  );
}
