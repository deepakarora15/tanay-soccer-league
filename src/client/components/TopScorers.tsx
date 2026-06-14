import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

interface Scorer {
  rank: number;
  playerName: string;
  team: string;
  goals: number;
  assists: number;
  matchesPlayed: number;
}

export default function TopScorers() {
  const { apiCall } = useApi();
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall<Scorer[]>('/api/scorers')
      .then(setScorers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">⚽ Top Scorers</h2>

      {scorers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-4xl mb-2">⚽</p>
          <p className="text-gray-500 dark:text-gray-400">Top scorers data will appear once matches are played.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <tr>
                  <th className="text-left pl-4 pr-2 py-3 font-semibold w-[40px]">#</th>
                  <th className="text-left px-2 py-3 font-semibold">Player</th>
                  <th className="text-left px-2 py-3 font-semibold hidden sm:table-cell">Team</th>
                  <th className="text-center px-2 py-3 font-semibold w-[50px]">⚽</th>
                  <th className="text-center px-2 py-3 font-semibold w-[50px]">👟</th>
                  <th className="text-center px-2 py-3 font-semibold w-[40px] hidden sm:table-cell">P</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {scorers.map((s) => (
                  <tr key={s.rank} className={s.rank <= 3 ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                    <td className="pl-4 pr-2 py-3 font-bold text-gray-700 dark:text-gray-300">
                      {s.rank <= 3 ? ['🥇', '🥈', '🥉'][s.rank - 1] : s.rank}
                    </td>
                    <td className="px-2 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{s.playerName}</p>
                      <p className="text-xs text-gray-400 sm:hidden">{s.team}</p>
                    </td>
                    <td className="px-2 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{s.team}</td>
                    <td className="text-center px-2 py-3 font-bold text-gray-900 dark:text-white">{s.goals}</td>
                    <td className="text-center px-2 py-3 text-gray-600 dark:text-gray-400">{s.assists}</td>
                    <td className="text-center px-2 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{s.matchesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">⚽ Goals • 👟 Assists • P Matches Played — Updates automatically</p>
    </div>
  );
}
