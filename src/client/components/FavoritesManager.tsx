import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

const ALL_TEAMS = [
  'Mexico', 'South Africa', 'South Korea', 'Czechia',
  'Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland',
  'Brazil', 'Morocco', 'Haiti', 'Scotland',
  'USA', 'Paraguay', 'Australia', 'Turkiye',
  'Germany', 'Curacao', 'Ivory Coast', 'Ecuador',
  'Netherlands', 'Japan', 'Sweden', 'Tunisia',
  'Belgium', 'Egypt', 'Iran', 'New Zealand',
  'Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay',
  'France', 'Senegal', 'Iraq', 'Norway',
  'Argentina', 'Algeria', 'Austria', 'Jordan',
  'Portugal', 'DR Congo', 'Uzbekistan', 'Colombia',
  'England', 'Croatia', 'Ghana', 'Panama',
];

const ALL_PLAYERS = [
  'Lionel Messi', 'Cristiano Ronaldo', 'Kylian Mbappé', 'Erling Haaland',
  'Vinicius Jr', 'Jude Bellingham', 'Bukayo Saka', 'Phil Foden',
  'Lamine Yamal', 'Florian Wirtz', 'Jamal Musiala', 'Pedri',
  'Mohamed Salah', 'Neymar Jr', 'Kevin De Bruyne', 'Harry Kane',
  'Robert Lewandowski', 'Rodri', 'Bruno Fernandes', 'Bernardo Silva',
  'Son Heung-min', 'Sadio Mané', 'Christian Pulisic', 'Alphonso Davies',
  'Achraf Hakimi', 'Declan Rice', 'Cole Palmer', 'Darwin Nunez',
  'Federico Valverde', 'Aurelien Tchouameni', 'Gavi', 'Nico Williams',
  'Rafael Leao', 'Khvicha Kvaratskhelia', 'Victor Osimhen', 'Dusan Vlahovic',
  'Julian Alvarez', 'Lautaro Martinez', 'Antoine Griezmann', 'Ousmane Dembélé',
];

interface Favorite {
  id: string;
  entityName: string;
  entityId: string;
  type: string;
}

export default function FavoritesManager() {
  const { apiCall } = useApi();
  const [teams, setTeams] = useState<Favorite[]>([]);
  const [players, setPlayers] = useState<Favorite[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    apiCall<{ teams: Favorite[]; players: Favorite[] }>('/api/favorites')
      .then((data) => { setTeams(data.teams || []); setPlayers(data.players || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredTeams = teamSearch.length > 0
    ? ALL_TEAMS.filter(t => t.toLowerCase().includes(teamSearch.toLowerCase()) && !teams.some(f => f.entityName === t))
    : [];

  const filteredPlayers = playerSearch.length > 0
    ? ALL_PLAYERS.filter(p => p.toLowerCase().includes(playerSearch.toLowerCase()) && !players.some(f => f.entityName === p))
    : [];

  const addTeam = async (name: string) => {
    try {
      const result = await apiCall<any>('/api/favorites/teams', {
        method: 'PUT',
        body: JSON.stringify({ entityName: name, entityId: name.toLowerCase().replace(/\s+/g, '-') }),
      });
      setTeams(prev => [...prev, { id: result.id, entityName: name, entityId: name.toLowerCase().replace(/\s+/g, '-'), type: 'team', playerId: '' }]);
      setTeamSearch('');
      setSaveMsg('✓ ' + name + ' saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e: any) {
      setSaveMsg('❌ Failed to save');
      setTimeout(() => setSaveMsg(''), 2000);
    }
  };

  const addPlayer = async (name: string) => {
    try {
      const result = await apiCall<any>('/api/favorites/players', {
        method: 'PUT',
        body: JSON.stringify({ entityName: name, entityId: name.toLowerCase().replace(/\s+/g, '-') }),
      });
      setPlayers(prev => [...prev, { id: result.id, entityName: name, entityId: name.toLowerCase().replace(/\s+/g, '-'), type: 'player', playerId: '' }]);
      setPlayerSearch('');
      setSaveMsg('✓ ' + name + ' saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e: any) {
      setSaveMsg('❌ Failed to save');
      setTimeout(() => setSaveMsg(''), 2000);
    }
  };

  const removeFavorite = async (id: string, type: 'team' | 'player') => {
    try {
      await apiCall(`/api/favorites/${id}`, { method: 'DELETE' });
      if (type === 'team') setTeams(prev => prev.filter(f => f.id !== id));
      else setPlayers(prev => prev.filter(f => f.id !== id));
      setSaveMsg('✓ Removed');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {}
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">⭐ My Favorites</h2>

      {saveMsg && (
        <div className={`px-4 py-2 rounded-lg text-sm font-medium text-center animate-success-flash ${saveMsg.startsWith('✓') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          {saveMsg}
        </div>
      )}

      {/* Teams Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">🏳️ Teams</h3>
          <span className="text-xs text-gray-400">{teams.length}/5</span>
        </div>

        {/* Selected teams */}
        <div className="flex flex-wrap gap-2 mb-3">
          {teams.map(t => (
            <span key={t.id} className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm">
              {t.entityName}
              <button onClick={() => removeFavorite(t.id, 'team')} className="ml-1 text-green-600 hover:text-red-500">✕</button>
            </span>
          ))}
        </div>

        {/* Search input */}
        {teams.length < 5 && (
          <div className="relative">
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Type team name..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            {filteredTeams.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {filteredTeams.map(t => (
                  <button key={t} onClick={() => addTeam(t)} className="w-full text-left px-4 py-2 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-800 dark:text-gray-200">
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Players Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">⚽ Players</h3>
          <span className="text-xs text-gray-400">{players.length}/10</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {players.map(p => (
            <span key={p.id} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
              {p.entityName}
              <button onClick={() => removeFavorite(p.id, 'player')} className="ml-1 text-blue-600 hover:text-red-500">✕</button>
            </span>
          ))}
        </div>

        {players.length < 10 && (
          <div className="relative">
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Type player name..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            {filteredPlayers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {filteredPlayers.map(p => (
                  <button key={p} onClick={() => addPlayer(p)} className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
