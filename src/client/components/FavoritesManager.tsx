import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

interface FavoriteItem {
  id: string;
  name: string;
}

interface SearchResult {
  id: string;
  name: string;
}

export default function FavoritesManager() {
  const { apiCall } = useApi();
  const [teams, setTeams] = useState<FavoriteItem[]>([]);
  const [players, setPlayers] = useState<FavoriteItem[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [teamResults, setTeamResults] = useState<SearchResult[]>([]);
  const [playerResults, setPlayerResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall<{ teams: FavoriteItem[]; players: FavoriteItem[] }>('/api/favorites')
      .then((data) => {
        setTeams(data.teams);
        setPlayers(data.players);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const searchTeams = async (query: string) => {
    setTeamSearch(query);
    if (query.length < 2) { setTeamResults([]); return; }
    try {
      const results = await apiCall<SearchResult[]>(`/api/favorites/search/teams?q=${encodeURIComponent(query)}`);
      setTeamResults(results.filter((r) => !teams.some((t) => t.id === r.id)));
    } catch {}
  };

  const searchPlayers = async (query: string) => {
    setPlayerSearch(query);
    if (query.length < 2) { setPlayerResults([]); return; }
    try {
      const results = await apiCall<SearchResult[]>(`/api/favorites/search/players?q=${encodeURIComponent(query)}`);
      setPlayerResults(results.filter((r) => !players.some((p) => p.id === r.id)));
    } catch {}
  };

  const addTeam = async (item: SearchResult) => {
    try {
      await apiCall('/api/favorites/teams', { method: 'POST', body: JSON.stringify({ teamId: item.id }) });
      setTeams((prev) => [...prev, item]);
      setTeamResults((prev) => prev.filter((r) => r.id !== item.id));
      setTeamSearch('');
    } catch {}
  };

  const addPlayer = async (item: SearchResult) => {
    try {
      await apiCall('/api/favorites/players', { method: 'POST', body: JSON.stringify({ playerId: item.id }) });
      setPlayers((prev) => [...prev, item]);
      setPlayerResults((prev) => prev.filter((r) => r.id !== item.id));
      setPlayerSearch('');
    } catch {}
  };

  const removeTeam = async (id: string) => {
    try {
      await apiCall(`/api/favorites/teams/${id}`, { method: 'DELETE' });
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch {}
  };

  const removePlayer = async (id: string) => {
    try {
      await apiCall(`/api/favorites/players/${id}`, { method: 'DELETE' });
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Favorites</h2>

      {/* Teams Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🏟️ Teams</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">{teams.length}/5 selected</span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={teamSearch}
            onChange={(e) => searchTeams(e.target.value)}
            placeholder="Search teams to add..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
          {teamResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg max-h-40 overflow-y-auto">
              {teamResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => addTeam(r)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-gray-100"
                >
                  + {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected */}
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm"
            >
              {t.name}
              <button
                onClick={() => removeTeam(t.id)}
                className="ml-1 text-green-600 dark:text-green-400 hover:text-red-500 font-bold"
                aria-label={`Remove ${t.name}`}
              >
                ×
              </button>
            </span>
          ))}
          {teams.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">No teams selected yet.</p>
          )}
        </div>
      </div>

      {/* Players Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">⚽ Players</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">{players.length}/5 selected</span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={playerSearch}
            onChange={(e) => searchPlayers(e.target.value)}
            placeholder="Search players to add..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          {playerResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-lg max-h-40 overflow-y-auto">
              {playerResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => addPlayer(r)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-gray-100"
                >
                  + {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected */}
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm"
            >
              {p.name}
              <button
                onClick={() => removePlayer(p.id)}
                className="ml-1 text-purple-600 dark:text-purple-400 hover:text-red-500 font-bold"
                aria-label={`Remove ${p.name}`}
              >
                ×
              </button>
            </span>
          ))}
          {players.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">No players selected yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
