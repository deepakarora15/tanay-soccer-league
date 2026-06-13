import { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  sourceUrl: string;
  sourceAttribution: string;
  publishedAt: string;
}

export default function NewsFeed() {
  const { apiCall } = useApi();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall<{ articles: NewsArticle[]; lastUpdated: string | null }>('/api/news')
      .then((data) => setArticles(data.articles || []))
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📰 World Cup News</h2>

      {articles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-4xl mb-3">📰</p>
          <p className="text-gray-500 dark:text-gray-400">No news articles available yet.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">News will appear once the tournament is underway.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">{article.headline}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-3">{article.summary}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-purple-600 dark:text-purple-400">{article.sourceAttribution}</span>
                <span className="text-xs text-gray-400">
                  {new Date(article.publishedAt).toLocaleDateString()}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
