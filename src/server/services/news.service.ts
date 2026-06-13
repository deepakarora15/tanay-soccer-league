import db from '../db';
import { cache, CACHE_KEYS, CACHE_TTLS } from '../cache';
import { v4 as uuidv4 } from 'uuid';

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  sourceUrl: string;
  sourceAttribution: string;
  publishedAt: string;
  cachedAt: string;
}

/**
 * Pure function for property testing.
 * Returns up to 20 articles from the last 48 hours, ordered by publishedAt descending.
 */
export function filterArticles(articles: NewsArticle[], now: Date): NewsArticle[] {
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  return articles
    .filter((article) => article.publishedAt >= fortyEightHoursAgo)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 20);
}

/**
 * Returns news from DB (last 7 days, max 20), with staleness timestamp.
 */
export function getNews(): { articles: NewsArticle[]; lastUpdated: string | null } {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const articles = db.prepare(
    `SELECT id, headline, summary, sourceUrl, sourceAttribution, publishedAt, cachedAt
     FROM NewsArticle
     WHERE publishedAt >= ?
     ORDER BY publishedAt DESC
     LIMIT 20`
  ).all(sevenDaysAgo) as NewsArticle[];

  const lastUpdatedRow = db.prepare(
    'SELECT MAX(cachedAt) as lastUpdated FROM NewsArticle'
  ).get() as { lastUpdated: string | null } | undefined;

  return {
    articles,
    lastUpdated: lastUpdatedRow?.lastUpdated || null,
  };
}

/**
 * Fetches from NewsAPI and stores articles in DB.
 * Truncates headline to 120 chars and summary to 300 chars.
 * If API unavailable, logs warning and returns (cached data served from getNews).
 */
export async function refreshNewsFromAPI(): Promise<void> {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    console.warn('[news.service] NEWS_API_KEY not set, skipping news refresh');
    return;
  }

  const url = `https://newsapi.org/v2/everything?q=football+world+cup&sortBy=publishedAt&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[news.service] NewsAPI returned status ${response.status}, skipping refresh`);
      return;
    }

    const data = await response.json() as {
      status: string;
      articles?: Array<{
        title?: string;
        description?: string;
        url?: string;
        source?: { name?: string };
        publishedAt?: string;
      }>;
    };

    if (data.status !== 'ok' || !data.articles) {
      console.warn('[news.service] NewsAPI response not ok, skipping refresh');
      return;
    }

    const now = new Date().toISOString();

    const insertStmt = db.prepare(
      `INSERT OR REPLACE INTO NewsArticle (id, headline, summary, sourceUrl, sourceAttribution, publishedAt, cachedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const insertMany = db.transaction((articles: typeof data.articles) => {
      for (const article of articles!) {
        const headline = (article.title || '').slice(0, 120);
        const summary = (article.description || '').slice(0, 300);
        const sourceUrl = article.url || '';
        const sourceAttribution = article.source?.name || 'Unknown';
        const publishedAt = article.publishedAt || now;

        insertStmt.run(
          uuidv4(),
          headline,
          summary,
          sourceUrl,
          sourceAttribution,
          publishedAt,
          now
        );
      }
    });

    insertMany(data.articles);

    // Update cache timestamp
    cache.set(CACHE_KEYS.NEWS, { refreshedAt: now }, CACHE_TTLS.NEWS);
  } catch (error) {
    console.warn('[news.service] Failed to fetch from NewsAPI:', error);
  }
}
