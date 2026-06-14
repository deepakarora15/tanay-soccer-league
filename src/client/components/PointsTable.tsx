import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  groupName: string;
}

interface TeamStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export default function PointsTable() {
  const { apiCall } = useApi();
  const [standings, setStandings] = useState<Record<string, TeamStanding[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiCall<Match[]>('/api/matches/completed').catch(() => []),
    ]).then(([completed]) => {
      const groupStandings = calculateStandings(completed);
      setStandings(groupStandings);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div></div>;
  }

  const groups = Object.keys(standings).sort();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📋 Points Table</h2>

      {groups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-4xl mb-2">📋</p>
          <p className="text-gray-500 dark:text-gray-400">Points table will appear once matches are completed.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-green-600 text-white px-4 py-2 font-semibold text-sm">{group}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-300">Team</th>
                      <th className="text-center px-2 py-2 font-medium text-gray-600 dark:text-gray-300">P</th>
                      <th className="text-center px-2 py-2 font-medium text-gray-600 dark:text-gray-300">W</th>
                      <th className="text-center px-2 py-2 font-medium text-gray-600 dark:text-gray-300">D</th>
                      <th className="text-center px-2 py-2 font-medium text-gray-600 dark:text-gray-300">L</th>
                      <th className="text-center px-2 py-2 font-medium text-gray-600 dark:text-gray-300 hidden sm:table-cell">GF</th>
                      <th className="text-center px-2 py-2 font-medium text-gray-600 dark:text-gray-300 hidden sm:table-cell">GA</th>
                      <th className="text-center px-2 py-2 font-medium text-gray-600 dark:text-gray-300">GD</th>
                      <th className="text-center px-2 py-2 font-bold text-gray-800 dark:text-gray-100">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {standings[group].map((team, i) => (
                      <tr key={team.team} className={i < 2 ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                        <td className="px-3 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {i < 2 && <span className="text-green-500 mr-1">●</span>}
                          {team.team}
                        </td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">{team.played}</td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">{team.won}</td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">{team.drawn}</td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">{team.lost}</td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{team.goalsFor}</td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{team.goalsAgainst}</td>
                        <td className="text-center px-2 py-2 text-gray-600 dark:text-gray-400">
                          {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                        </td>
                        <td className="text-center px-2 py-2 font-bold text-gray-900 dark:text-white">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        <span className="text-green-500">●</span> Top 2 qualify for knockout stage
      </p>
    </div>
  );
}

function calculateStandings(matches: Match[]): Record<string, TeamStanding[]> {
  const groups: Record<string, Record<string, TeamStanding>> = {};

  for (const match of matches) {
    if (!match.groupName || match.homeScore === null || match.awayScore === null) continue;

    if (!groups[match.groupName]) groups[match.groupName] = {};

    const g = groups[match.groupName];
    if (!g[match.homeTeam]) g[match.homeTeam] = { team: match.homeTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
    if (!g[match.awayTeam]) g[match.awayTeam] = { team: match.awayTeam, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };

    const home = g[match.homeTeam];
    const away = g[match.awayTeam];

    home.played++; away.played++;
    home.goalsFor += match.homeScore; home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore; away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) { home.won++; home.points += 3; away.lost++; }
    else if (match.homeScore < match.awayScore) { away.won++; away.points += 3; home.lost++; }
    else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  const result: Record<string, TeamStanding[]> = {};
  for (const [group, teams] of Object.entries(groups)) {
    result[group] = Object.values(teams).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }

  return result;
}
