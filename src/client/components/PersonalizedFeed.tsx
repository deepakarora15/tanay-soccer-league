import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';

interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  sourceUrl: string;
  sourceAttribution: string;
  publishedAt: string;
}

interface Favorite {
  entityName: string;
}

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scheduledAt: string;
  status: string;
  groupName: string | null;
}

export default function PersonalizedFeed() {
  const { apiCall } = useApi();
  const navigate = useNavigate();
  const [favoriteNews, setFavoriteNews] = useState<NewsArticle[]>([]);
  const [otherNews, setOtherNews] = useState<NewsArticle[]>([]);
  const [favoriteMatches, setFavoriteMatches] = useState<Match[]>([]);
  const [favorites, setFavorites] = useState<{ teams: string[]; players: string[] }>({ teams: [], players: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiCall<{ teams: Favorite[]; players: Favorite[] }>('/api/favorites').catch(() => ({ teams: [], players: [] })),
      apiCall<{ articles: NewsArticle[] }>('/api/news').catch(() => ({ articles: [] })),
      apiCall<Match[]>('/api/matches/completed').catch(() => []),
    ]).then(([favData, newsData, completedMatches]) => {
      const teamNames = (favData.teams || []).map(t => t.entityName);
      const playerNames = (favData.players || []).map(p => p.entityName);
      setFavorites({ teams: teamNames, players: playerNames });

      const articles = newsData.articles || [];

      if (teamNames.length > 0 || playerNames.length > 0) {
        // Split news: articles mentioning favorites go on top
        const favNews: NewsArticle[] = [];
        const other: NewsArticle[] = [];

        for (const article of articles) {
          const text = (article.headline + ' ' + article.summary).toLowerCase();
          const isFav = teamNames.some(t => text.includes(t.toLowerCase())) ||
                        playerNames.some(p => text.includes(p.toLowerCase()));
          if (isFav) favNews.push(article);
          else other.push(article);
        }
        setFavoriteNews(favNews);
        setOtherNews(other);

        // Filter completed matches for favorite teams
        const favMatches = completedMatches.filter((m: Match) =>
          teamNames.includes(m.homeTeam) || teamNames.includes(m.awayTeam)
        );
        setFavoriteMatches(favMatches);
      } else {
        setOtherNews(articles);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div></div>;
  }

  const hasFavorites = favorites.teams.length > 0 || favorites.players.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">⭐ My Feed</h2>
        <button onClick={() => navigate('/favorites')} className="text-sm text-purple-600 dark:text-purple-400 hover:underline">
          Edit Favorites
        </button>
      </div>

      {!hasFavorites && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 text-center">
          <p className="text-purple-800 dark:text-purple-200 font-medium">No favorites selected</p>
          <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">Add teams & players to see personalized content here</p>
          <button onClick={() => navigate('/favorites')} className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
            + Add Favorites
          </button>
        </div>
      )}

      {/* Favorite team match results */}
      {favoriteMatches.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Your Teams' Results</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {favoriteMatches.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{m.homeTeam}</span>
                <span className="font-bold text-purple-700 dark:text-purple-300">{m.homeScore} - {m.awayScore}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{m.awayTeam}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News about favorites */}
      {favoriteNews.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
            News about your favorites ({favoriteNews.length})
          </h3>
          <div className="space-y-3">
            {favoriteNews.map(article => (
              <a key={article.id} href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="block p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700 rounded-xl hover:border-yellow-400 transition-colors">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{article.headline}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{article.summary}</p>
                <span className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 inline-block">{article.sourceAttribution}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Other news */}
      {otherNews.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
            {hasFavorites ? 'Other News' : 'Latest News'}
          </h3>
          <div className="space-y-3">
            {otherNews.map(article => (
              <a key={article.id} href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="block p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">{article.headline}</h4>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{article.summary}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-blue-500">{article.sourceAttribution}</span>
                  <span className="text-xs text-gray-400">{new Date(article.publishedAt).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {favoriteNews.length === 0 && otherNews.length === 0 && hasFavorites && (
        <div className="text-center py-8">
          <p className="text-4xl mb-2">📡</p>
          <p className="text-gray-500 dark:text-gray-400">No news available right now. Check back later!</p>
        </div>
      )}
    </div>
  );
}
