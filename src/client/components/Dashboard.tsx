import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';

interface DashboardData {
  totalPoints: number;
  rank: number | null;
  accuracy: number | null;
  totalPredictions: number;
  achievements: string[];
  recentPredictions: Array<{
    id: string;
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    predictedHomeScore: number;
    predictedAwayScore: number;
    actualHomeScore: number | null;
    actualAwayScore: number | null;
    pointsAwarded: number | null;
    submittedAt: string;
  }>;
}

const achievementConfig: Record<string, { emoji: string; label: string }> = {
  streak_3: { emoji: '🔥', label: '3 Match Streak' },
  streak_5: { emoji: '🔥🔥', label: '5 Match Streak' },
  streak_10: { emoji: '🏆', label: '10 Match Streak!' },
};

export default function Dashboard() {
  const { apiCall } = useApi();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall<DashboardData>('/api/dashboard')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Predict CTA Banner */}
      <button
        onClick={() => navigate('/predictions')}
        className="w-full text-left bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-extrabold">🎯 Predict Scores Now!</p>
            <p className="text-green-100 text-sm mt-1">Matches are live. Submit your predictions before kick-off!</p>
          </div>
          <span className="text-4xl">▶</span>
        </div>
      </button>

      {/* Live Scores Widget */}
      <LiveScoresWidget />
      {/* Auto-nudge: upcoming matches without prediction */}
      <UpcomingNudge navigate={navigate} />

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Points" value={data.totalPoints} icon="⭐" color="bg-gradient-to-br from-yellow-400 to-orange-500" />
        <StatCard label="Rank" value={data.rank ? `#${data.rank}` : 'Unranked'} icon="🏅" color="bg-gradient-to-br from-blue-400 to-blue-600" />
        <StatCard label="Accuracy" value={data.accuracy !== null ? `${data.accuracy}%` : 'N/A'} icon="🎯" color="bg-gradient-to-br from-green-400 to-green-600" />
        <StatCard label="Predictions" value={data.totalPredictions} icon="📊" color="bg-gradient-to-br from-purple-400 to-purple-600" />
      </div>

      {/* Achievements */}
      {data.achievements.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Achievements</h3>
          <div className="flex flex-wrap gap-3">
            {data.achievements.map((badge) => {
              const config = achievementConfig[badge] || { emoji: '🏅', label: badge };
              return (
                <div
                  key={badge}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-full animate-points-awarded"
                >
                  <span className="text-xl">{config.emoji}</span>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{config.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Predictions */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Recent Predictions</h3>
        {data.recentPredictions.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <p className="text-4xl mb-2">⚽</p>
            <p className="text-gray-500 dark:text-gray-400">No predictions yet!</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Head to Predictions to make your first pick.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Match</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Predicted</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actual</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.recentPredictions.map((pred) => (
                  <tr key={pred.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {pred.homeTeam} vs {pred.awayTeam}
                    </td>
                    <td className="text-center px-4 py-3 text-gray-700 dark:text-gray-300">
                      {pred.predictedHomeScore} - {pred.predictedAwayScore}
                    </td>
                    <td className="text-center px-4 py-3 text-gray-700 dark:text-gray-300">
                      {pred.actualHomeScore !== null ? `${pred.actualHomeScore} - ${pred.actualAwayScore}` : '—'}
                    </td>
                    <td className="text-center px-4 py-3">
                      {pred.pointsAwarded !== null ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                          +{pred.pointsAwarded}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className={`${color} rounded-xl p-4 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-90">{label}</p>
      </div>
    </div>
  );
}

function UpcomingNudge({ navigate }: { navigate: (path: string) => void }) {
  const { apiCall } = useApi();
  const [unpredicted, setUnpredicted] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      apiCall<any[]>('/api/matches/upcoming').catch(() => []),
      apiCall<any[]>('/api/predictions/my').catch(() => []),
    ]).then(([matches, predictions]) => {
      const predictedMatchIds = new Set((predictions || []).map((p: any) => p.matchId));
      // Show matches in next 48 hours that user hasn't predicted
      const now = Date.now();
      const soon = matches.filter((m: any) => {
        const matchTime = new Date(m.scheduledAt).getTime();
        return matchTime - now < 48 * 60 * 60 * 1000 && matchTime > now && !predictedMatchIds.has(m.id);
      });
      setUnpredicted(soon);
    });
  }, []);

  if (unpredicted.length === 0) return null;

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⏰</span>
        <div className="flex-1">
          <p className="font-semibold text-orange-800 dark:text-orange-200">
            {unpredicted.length} match{unpredicted.length > 1 ? 'es' : ''} starting soon without your prediction!
          </p>
          <div className="mt-2 space-y-1">
            {unpredicted.slice(0, 3).map((m: any) => (
              <p key={m.id} className="text-sm text-orange-700 dark:text-orange-300">
                • {m.homeTeam} vs {m.awayTeam} — {new Date(m.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            ))}
            {unpredicted.length > 3 && (
              <p className="text-xs text-orange-500">+{unpredicted.length - 3} more</p>
            )}
          </div>
          <button
            onClick={() => navigate('/predictions')}
            className="mt-3 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Predict Now →
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveScoresWidget() {
  const { apiCall } = useApi();
  const [liveMatches, setLiveMatches] = useState<any[]>([]);

  useEffect(() => {
    const fetchLive = () => {
      apiCall<any[]>('/api/matches/live').then(setLiveMatches).catch(() => {});
    };
    fetchLive();
    const interval = setInterval(fetchLive, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (liveMatches.length === 0) return null;

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-live-pulse"></span>
        <h3 className="font-bold text-red-700 dark:text-red-300">LIVE NOW</h3>
      </div>
      <div className="space-y-2">
        {liveMatches.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-red-100 dark:border-red-800">
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{m.homeTeam}</span>
            <div className="text-center">
              <span className="font-bold text-lg text-red-600 dark:text-red-400">{m.homeScore ?? 0} - {m.awayScore ?? 0}</span>
              {m.matchMinute && <p className="text-xs text-red-500 animate-live-pulse">{m.matchMinute}'</p>}
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{m.awayTeam}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
