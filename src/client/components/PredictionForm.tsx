import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  scheduledAt: string;
  status: string;
  groupName: string | null;
  predictionsLocked: number;
}

interface ExistingPrediction {
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
}

export default function PredictionForm() {
  const { apiCall } = useApi();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, ExistingPrediction>>({});
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiCall<Match[]>('/api/matches/upcoming'),
      apiCall<ExistingPrediction[]>('/api/predictions/my').catch(() => []),
    ])
      .then(([matchData, predData]) => {
        setMatches(matchData);
        const predMap: Record<string, ExistingPrediction> = {};
        const scoreMap: Record<string, { home: string; away: string }> = {};
        (predData || []).forEach((p) => {
          predMap[p.matchId] = p;
          scoreMap[p.matchId] = { home: String(p.predictedHomeScore), away: String(p.predictedAwayScore) };
        });
        setPredictions(predMap);
        setScores(scoreMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isLocked = (match: Match) => {
    return match.predictionsLocked === 1 || new Date(match.scheduledAt) <= new Date();
  };

  const handleSubmit = async (matchId: string) => {
    const score = scores[matchId];
    if (!score || score.home === '' || score.away === '') return;

    setSubmitting(matchId);
    try {
      await apiCall('/api/predictions', {
        method: 'POST',
        body: JSON.stringify({
          matchId,
          homeScore: parseInt(score.home),
          awayScore: parseInt(score.away),
        }),
      });
      setPredictions((prev) => ({
        ...prev,
        [matchId]: { matchId, predictedHomeScore: parseInt(score.home), predictedAwayScore: parseInt(score.away) },
      }));
      setSuccess(matchId);
      setTimeout(() => setSuccess(null), 2000);
    } catch {
    } finally {
      setSubmitting(null);
    }
  };

  const updateScore = (matchId: string, side: 'home' | 'away', value: string) => {
    const num = value.replace(/\D/g, '').slice(0, 2);
    setScores((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || { home: '', away: '' }), [side]: num },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🏟️</p>
        <p className="text-gray-500 dark:text-gray-400">No upcoming matches to predict.</p>
      </div>
    );
  }

  // Sort: upcoming unlocked matches first, then locked ones at the bottom
  const unlocked = matches.filter(m => !isLocked(m));
  const locked = matches.filter(m => isLocked(m));
  const sortedMatches = [...unlocked, ...locked];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🎯 Predict Scores</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Submit your predictions before kick-off! 3 pts for exact score, 1 pt for correct outcome.
      </p>

      {unlocked.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4 text-center">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">⏰ No matches open for prediction right now</p>
          <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">Check back when the next matches are scheduled!</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {sortedMatches.map((match) => {
          const locked = isLocked(match);
          const existing = predictions[match.id];
          const isSuccess = success === match.id;

          return (
            <div
              key={match.id}
              className={`relative p-5 rounded-xl border-2 transition-all ${
                isSuccess
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 animate-success-flash'
                  : locked
                  ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-75'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-300 dark:hover:border-green-600'
              }`}
            >
              {locked && (
                <div className="absolute top-3 right-3 text-gray-400">🔒</div>
              )}

              <div className="text-center mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {new Date(match.scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {match.groupName && <span className="ml-2 text-blue-500">• {match.groupName}</span>}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{match.homeTeam}</span>
                  <span className="text-sm text-gray-400 font-medium">vs</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{match.awayTeam}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-4 mb-4">
                <input
                  type="text"
                  inputMode="numeric"
                  value={scores[match.id]?.home ?? ''}
                  onChange={(e) => updateScore(match.id, 'home', e.target.value)}
                  disabled={locked}
                  className="score-input disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0"
                  maxLength={2}
                  aria-label={`${match.homeTeam} score`}
                />
                <span className="text-xl font-bold text-gray-400">—</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={scores[match.id]?.away ?? ''}
                  onChange={(e) => updateScore(match.id, 'away', e.target.value)}
                  disabled={locked}
                  className="score-input disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0"
                  maxLength={2}
                  aria-label={`${match.awayTeam} score`}
                />
              </div>

              {existing && (
                <p className="text-center text-xs text-green-600 dark:text-green-400 mb-2">
                  ✅ Predicted: {existing.predictedHomeScore} - {existing.predictedAwayScore}
                </p>
              )}

              {!locked && (
                <button
                  onClick={() => handleSubmit(match.id)}
                  disabled={submitting === match.id}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting === match.id ? 'Saving...' : existing ? 'Update' : 'Submit Prediction'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
