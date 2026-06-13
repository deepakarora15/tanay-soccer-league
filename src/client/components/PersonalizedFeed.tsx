import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';

interface FeedEvent {
  id: string;
  type: 'goal' | 'red_card' | 'yellow_card' | 'substitution' | 'penalty' | 'assist' | 'other';
  description: string;
  matchId: string;
  team: string;
  player: string;
  timestamp: string;
}

const eventIcons: Record<string, string> = {
  goal: '⚽',
  red_card: '🟥',
  yellow_card: '🟨',
  substitution: '🔄',
  penalty: '🎯',
  assist: '👟',
  other: '📋',
};

export default function PersonalizedFeed() {
  const { apiCall } = useApi();
  const navigate = useNavigate();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFavorites, setHasFavorites] = useState(true);

  useEffect(() => {
    apiCall<{ events: FeedEvent[]; hasFavorites: boolean }>('/api/feed')
      .then((data) => {
        setEvents(data.events);
        setHasFavorites(data.hasFavorites);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!hasFavorites) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">⭐</p>
        <p className="text-gray-500 dark:text-gray-400 mb-4">No favorites selected yet!</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Add your favorite teams and players to get a personalized feed.</p>
        <button
          onClick={() => navigate('/favorites')}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
        >
          Manage Favorites
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-2">📡</p>
        <p className="text-gray-500 dark:text-gray-400">No events for your favorites yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Feed</h2>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <span className="text-2xl flex-shrink-0">{eventIcons[event.type] || '📋'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{event.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{event.team}</span>
                {event.player && (
                  <>
                    <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{event.player}</span>
                  </>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap">
              {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
