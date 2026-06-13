import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalPoints: number;
  accuracy: number;
  rank: number;
}

export default function Leaderboard() {
  const { apiCall } = useApi();
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall<LeaderboardEntry[]>('/api/leaderboard')
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Leaderboard</h2>

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-gray-500 dark:text-gray-400">No leaderboard data yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-blue-500 to-green-500 text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">#</th>
                <th className="text-left px-4 py-3 font-semibold">Player</th>
                <th className="text-center px-4 py-3 font-semibold">Points</th>
                <th className="text-center px-4 py-3 font-semibold hidden sm:table-cell">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => {
                const isCurrentUser = entry.userId === user?.id;
                return (
                  <tr
                    key={entry.userId}
                    className={`${
                      isCurrentUser
                        ? 'bg-green-50 dark:bg-green-900/20 font-semibold'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={entry.rank <= 3 ? 'text-xl' : 'text-gray-600 dark:text-gray-400'}>
                        {getRankIcon(entry.rank)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {entry.displayName}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                      {entry.totalPoints}
                    </td>
                    <td className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                      {entry.accuracy}%
                    </td>
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
