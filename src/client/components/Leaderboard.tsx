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
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('overall');

  useEffect(() => {
    setLoading(true);
    apiCall<LeaderboardResponse>(`/api/leaderboard?period=${period}`)
      .then((data) => { setEntries(data.entries || []); setLastMatch(data.lastMatch || null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

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
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {/* Last match actual score banner */}
          {period === 'lastMatch' && lastMatch && (
            <div className="bg-green-600 text-white px-4 py-3 text-center">
              <p className="text-xs opacity-80">Actual Score</p>
              <p className="text-lg font-bold">{lastMatch.homeTeam} {lastMatch.homeScore} - {lastMatch.awayScore} {lastMatch.awayTeam}</p>
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
      )}
    </div>
  );
}
