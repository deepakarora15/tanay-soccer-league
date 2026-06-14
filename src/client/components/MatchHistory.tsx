import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

interface MatchSummary {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  scheduledAt: string;
  groupName: string | null;
  predictionCount: number;
}

interface Prediction {
  playerId: string;
  displayName: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsAwarded: number | null;
}

export default function MatchHistory() {
  const { apiCall } = useApi();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPreds, setLoadingPreds] = useState(false);

  useEffect(() => {
    apiCall<MatchSummary[]>('/api/match-predictions/history')
      .then(setMatches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const viewMatch = async (matchId: string) => {
    if (selectedMatch === matchId) { setSelectedMatch(null); return; }
    setSelectedMatch(matchId);
    setLoadingPreds(true);
    try {
      const data = await apiCall<{ match: any; predictions: Prediction[] }>(`/api/match-predictions/${matchId}/predictions`);
      setMatchInfo(data.match);
      setPredictions(data.predictions);
    } catch {}
    setLoadingPreds(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📜 Match Predictions History</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">Tap any match to see what everyone predicted</p>

      {matches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">📜</p>
          <p className="text-gray-500 dark:text-gray-400">No completed matches yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <div key={m.id}>
              <button
                onClick={() => viewMatch(m.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selectedMatch === m.id
                    ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">
                      {m.homeTeam} {m.homeScore ?? '-'} - {m.awayScore ?? '-'} {m.awayTeam}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {m.groupName && <span className="text-xs text-blue-500">{m.groupName}</span>}
                      <span className="text-xs text-gray-400">{new Date(m.scheduledAt).toLocaleDateString()}</span>
                      {m.status === 'live' && <span className="text-xs text-red-500 font-medium">LIVE</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{m.predictionCount} 🎯</span>
                    <span className="text-gray-400">{selectedMatch === m.id ? '▲' : '▼'}</span>
                  </div>
                </div>
              </button>

              {/* Expanded predictions */}
              {selectedMatch === m.id && (
                <div className="mt-1 ml-2 mr-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  {loadingPreds ? (
                    <div className="text-center py-3"><div className="animate-spin inline-block w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div></div>
                  ) : predictions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center">No predictions for this match</p>
                  ) : (
                    <div className="space-y-1.5">
                      {predictions.map((p, i) => (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
