import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: string;
  stage: string;
  groupName: string | null;
  status: string;
  predictionsLocked: number;
}

type StageFilter = 'all' | 'group' | 'knockout';

export default function Schedule() {
  const { apiCall } = useApi();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [teamFilter, setTeamFilter] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall<Match[]>('/api/matches/upcoming')
      .then(setMatches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Get all unique teams from matches
  const allTeams = [...new Set(matches.flatMap(m => [m.homeTeam, m.awayTeam]))].sort();
  const teamSuggestions = teamSearch.length > 0
    ? allTeams.filter(t => t.toLowerCase().includes(teamSearch.toLowerCase()))
    : [];

  // Apply filters
  const filtered = matches.filter((m) => {
    if (stageFilter === 'group' && m.stage !== 'group') return false;
    if (stageFilter === 'knockout' && m.stage === 'group') return false;
    if (teamFilter && m.homeTeam !== teamFilter && m.awayTeam !== teamFilter) return false;
    return true;
  });

  // Group by date
  const grouped = filtered.reduce((acc, match) => {
    const date = new Date(match.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📅 Match Schedule</h2>

      {/* Live Scores */}
      <LiveMatchesBanner />

      {/* Team Filter */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={teamFilter || teamSearch}
              onChange={(e) => { setTeamSearch(e.target.value); if (teamFilter) setTeamFilter(''); }}
              placeholder="🔍 Filter by team..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            {teamSuggestions.length > 0 && !teamFilter && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {teamSuggestions.map(t => (
                  <button key={t} onClick={() => { setTeamFilter(t); setTeamSearch(''); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-800 dark:text-gray-200">
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          {teamFilter && (
            <button onClick={() => { setTeamFilter(''); setTeamSearch(''); }}
              className="px-3 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium">
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Stage Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'group', 'knockout'] as StageFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setStageFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              stageFilter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {f === 'all' ? `All (${filtered.length})` : f === 'group' ? 'Group Stage' : 'Knockouts'}
          </button>
        ))}
      </div>

      {/* Team info banner */}
      {teamFilter && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Showing matches for: <strong>{teamFilter}</strong> ({filtered.length} match{filtered.length !== 1 ? 'es' : ''})
          </span>
        </div>
      )}

      {/* Match list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">📅</p>
          <p className="text-gray-500 dark:text-gray-400">No matches found{teamFilter ? ` for ${teamFilter}` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, dayMatches]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{date}</h3>
              <div className="space-y-2">
                {dayMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                          {match.homeTeam} vs {match.awayTeam}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {match.groupName && <span className="ml-2 text-blue-500 dark:text-blue-400">• {match.groupName}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/predictions')}
                      className="ml-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors shrink-0"
                    >
                      Predict
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveMatchesBanner() {
  const { apiCall } = useApi();
  const [liveMatches, setLiveMatches] = useState<any[]>([]);

  useEffect(() => {
    const fetchLive = () => {
      apiCall<any[]>('/api/matches/live').then(setLiveMatches).catch(() => {});
    };
    fetchLive();
    const interval = setInterval(fetchLive, 30000);
    return () => clearInterval(interval);
  }, []);

  if (liveMatches.length === 0) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-live-pulse"></span>
        <h3 className="font-bold text-red-700 dark:text-red-300 text-sm">LIVE NOW</h3>
      </div>
      <div className="space-y-2">
        {liveMatches.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-100 dark:border-red-800">
            <span className="font-medium text-gray-900 dark:text-white text-sm">{m.homeTeam}</span>
            <span className="font-bold text-red-600 dark:text-red-400">{m.homeScore ?? 0} - {m.awayScore ?? 0}</span>
            <span className="font-medium text-gray-900 dark:text-white text-sm">{m.awayTeam}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
