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

type Filter = 'all' | 'group' | 'knockout';

export default function Schedule() {
  const { apiCall } = useApi();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall<Match[]>('/api/matches/upcoming')
      .then(setMatches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = matches.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'group') return m.stage === 'group';
    return m.stage !== 'group';
  });

  // Group by date
  const grouped = filtered.reduce((acc, match) => {
    const date = new Date(match.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📅 Match Schedule</h2>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'group', 'knockout'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {f === 'all' ? `All (${matches.length})` : f === 'group' ? 'Group Stage' : 'Knockouts'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">📅</p>
          <p className="text-gray-500 dark:text-gray-400">No matches found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayMatches]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">{date}</h3>
              <div className="space-y-2">
                {dayMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {match.homeTeam} vs {match.awayTeam}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {match.groupName && <span className="ml-2 text-blue-500 dark:text-blue-400">• {match.groupName}</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/predictions')}
                      className="ml-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
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
