import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import './db'; // Initialize database on startup
import { bootstrapAdmin } from './bootstrap';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import predictionRoutes from './routes/predictions.routes';
import matchRoutes from './routes/matches.routes';
import dashboardRoutes from './routes/dashboard.routes';
import newsRoutes from './routes/news.routes';
import favoritesRoutes from './routes/favorites.routes';
import feedRoutes from './routes/feed.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import tournamentRoutes from './routes/tournament.routes';
import { cache } from './cache';
import { startScorePoller } from './jobs/score-poller';
import { startSchedulePoller } from './jobs/schedule-poller';
import { startNewsPoller } from './jobs/news-poller';
import { startEventPoller } from './jobs/event-poller';

// Ensure admin user exists on startup
bootstrapAdmin();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route modules
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/tournament', tournamentRoutes);

// In production, serve static frontend build
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(process.cwd(), 'dist', 'client');
  app.use(express.static(clientDistPath));

  // Fallback to index.html for client-side routing
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Restore cache from file
  cache.restore();

  // Start background polling jobs
  const scoreJob = startScorePoller();
  const scheduleJob = startSchedulePoller();
  const newsJob = startNewsPoller();
  const eventJob = startEventPoller();

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down gracefully...');
    scoreJob.stop();
    scheduleJob.stop();
    newsJob.stop();
    eventJob.stop();
    cache.persist();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});

export default app;
