import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

interface RssItem {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  source?: string;
}

/**
 * Fetches World Cup news from multiple RSS feeds.
 * Runs every 4 hours.
 */
async function fetchNews(): Promise<void> {
  console.log('[news-poller] Fetching latest World Cup news...');

  const feeds = [
    { url: 'https://www.espn.com/espn/rss/soccer/news', source: 'ESPN' },
    { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
    { url: 'https://www.goal.com/feeds/en/news', source: 'GOAL' },
  ];

  const allArticles: RssItem[] = [];

  for (const feed of feeds) {
    try {
      const response = await fetch(feed.url, {
        headers: { 'User-Agent': 'TanaySoccerLeague/1.0' },
      });

      if (!response.ok) continue;

      const text = await response.text();

      // Simple XML parsing for RSS items
      const items = text.match(/<item>([\s\S]*?)<\/item>/g) || [];

      for (const item of items.slice(0, 5)) {
        const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          || item.match(/<title>(.*?)<\/title>/)?.[1]
          || '';
        const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
          || item.match(/<description>(.*?)<\/description>/)?.[1]
          || '';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';

        // Only include articles related to World Cup or football
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('world cup') || lowerTitle.includes('football') || 
            lowerTitle.includes('soccer') || lowerTitle.includes('fifa') ||
            lowerTitle.includes('goal') || lowerTitle.includes('match')) {
          allArticles.push({
            title: title.slice(0, 120),
            description: description.replace(/<[^>]*>/g, '').slice(0, 300),
            link,
            pubDate,
            source: feed.source,
          });
        }
      }
    } catch (error) {
      console.warn(`[news-poller] Failed to fetch from ${feed.source}:`, error);
    }
  }

  if (allArticles.length === 0) {
    console.log('[news-poller] No new articles found from RSS feeds');
    return;
  }

  // Store articles in database
  const now = new Date().toISOString();
  let added = 0;

  for (const article of allArticles) {
    if (!article.title || !article.link) continue;

    // Check if article already exists by URL
    const existing = db.prepare(
      'SELECT id FROM NewsArticle WHERE sourceUrl = ?'
    ).get(article.link);

    if (existing) continue;

    const publishedAt = article.pubDate ? new Date(article.pubDate).toISOString() : now;

    db.prepare(
      'INSERT INTO NewsArticle (id, headline, summary, sourceUrl, sourceAttribution, publishedAt, cachedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      uuidv4(),
      article.title,
      article.description || 'Click to read full article.',
      article.link,
      article.source || 'Unknown',
      publishedAt,
      now
    );
    added++;
  }

  console.log(`[news-poller] Added ${added} new articles`);
}

/**
 * Starts the news polling job — runs every 4 hours.
 * Also runs immediately on startup.
 */
export function startNewsPoller(): cron.ScheduledTask {
  // Fetch immediately on startup
  fetchNews().catch(err => console.error('[news-poller] Initial fetch error:', err));

  // Then every 4 hours
  return cron.schedule('0 */4 * * *', async () => {
    try {
      await fetchNews();
    } catch (error) {
      console.error('[news-poller] Error polling news:', error);
    }
  });
}
