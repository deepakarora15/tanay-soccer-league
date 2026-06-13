# Implementation Plan

## Overview

Build a sports prediction league web application using React + TypeScript frontend, Node.js/Express backend, SQLite database, and in-memory caching. No external infrastructure required — just Node.js and `npm start`.

## Tasks

- [x] 1. Project Scaffolding and Configuration
  - [ ] 1.1 Initialize package.json with project metadata, scripts (dev, build, start), and dependencies (express, better-sqlite3, bcrypt, jsonwebtoken, node-cron, cors, dotenv)
  - [ ] 1.2 Configure TypeScript (tsconfig.json) for both server and client with strict mode and path aliases
  - [ ] 1.3 Set up Vite config (vite.config.ts) with React plugin, proxy to Express dev server, and build output to dist/client
  - [ ] 1.4 Create .env.example with placeholders for FOOTBALL_DATA_API_KEY, NEWS_API_KEY, JWT_SECRET, and PORT
  - [ ] 1.5 Create project directory structure matching design (src/server, src/client, data, tests/properties, tests/unit)
  - [ ] 1.6 Configure Vitest for unit tests and fast-check for property-based tests
  - [ ] 1.7 Set up Express entry point (src/server/index.ts) that serves API routes and static frontend build

- [x] 2. Database Setup (SQLite Schema)
  - [ ] 2.1 Implement src/server/db.ts with better-sqlite3 initialization, WAL mode, and auto-create data/ directory
  - [ ] 2.2 Create User table with id, email (unique), displayName (unique), passwordHash, role, status, rejectionReason, createdAt, updatedAt
  - [ ] 2.3 Create Tournament table with id, name, startDate, endDate, status
  - [ ] 2.4 Create League table with id, name, adminId (FK), tournamentId (FK), createdAt
  - [ ] 2.5 Create Match table with id, tournamentId (FK), homeTeam, awayTeam, scheduledAt, homeScore, awayScore, status, stage, groupName, predictionsLocked, resultConfirmedAt
  - [ ] 2.6 Create Prediction table with id, playerId (FK), matchId (FK), predictedHomeScore, predictedAwayScore, pointsAwarded, submittedAt, updatedAt and unique constraint on (playerId, matchId)
  - [ ] 2.7 Create Favorite table with id, playerId (FK), type, entityName, entityId, createdAt
  - [ ] 2.8 Create FeedEvent table with id, eventType, description, relatedTeam, relatedPlayer, occurredAt, cachedAt
  - [ ] 2.9 Create NewsArticle table with id, headline, summary, sourceUrl, sourceAttribution, publishedAt, cachedAt
  - [ ] 2.10 Create Notification table with id, userId (FK), type, message, read, createdAt

- [x] 3. In-Memory Cache with File Persistence
  - [ ] 3.1 Implement MemoryCache class in src/server/cache.ts with TTL-based get/set using a Map
  - [ ] 3.2 Implement persist() method to write cache to data/cache.json on graceful shutdown (SIGTERM, SIGINT)
  - [ ] 3.3 Implement restore() method to load cache from data/cache.json on startup, discarding expired entries
  - [ ] 3.4 Define cache key constants and TTLs (live-scores: 2min, schedule: 30min, news: 2hrs, events: 2min)

- [x] 4. Authentication System (JWT + bcrypt)
  - [ ] 4.1 Implement password hashing and verification utilities using bcrypt in src/server/auth.ts
  - [ ] 4.2 Implement JWT token generation (sign) with configurable expiration and secret from env
  - [ ] 4.3 Implement JWT verification middleware that extracts user from token and attaches to request
  - [ ] 4.4 Implement role-based authorization middleware (requireAdmin, requirePlayer, requireAuth)
  - [ ] 4.5 Create src/server/routes/auth.routes.ts with POST /api/auth/login endpoint

- [x] 5. User Registration and Join Request Flow
  - [ ] 5.1 Implement join request validation: email format, display name 3-30 chars, uniqueness checks
  - [ ] 5.2 Create POST /api/auth/join-request endpoint that creates a pending user record
  - [ ] 5.3 Enforce unique email constraint (reject if email matches pending or active user)
  - [ ] 5.4 Enforce unique display name constraint within the league
  - [ ] 5.5 Return field-specific validation error messages per the error response format
  - [ ] 5.6 Create in-app notification for Admin when a new join request is submitted
  - [ ] 5.7 Write property tests for join request uniqueness (Property 5) and input validation (Property 6)

- [x] 6. Admin Panel (Approve/Reject Members)
  - [ ] 6.1 Create GET /api/admin/join-requests endpoint listing all pending requests (admin-only)
  - [ ] 6.2 Create POST /api/admin/join-requests/:id/approve endpoint that sets user status to active with Player role
  - [ ] 6.3 Create POST /api/admin/join-requests/:id/reject endpoint that sets status to rejected with reason
  - [ ] 6.4 Send notification to user on approval or rejection
  - [ ] 6.5 Implement league creation endpoint that assigns Admin+Player dual role to creator
  - [ ] 6.6 Build AdminPanel React component with pending requests list, approve/reject buttons, and tournament settings

- [x] 7. League and Tournament Management
  - [ ] 7.1 Implement LeagueService with createLeague, getLeague, and getMembers methods
  - [ ] 7.2 Implement tournament CRUD in league service (create, update status, link to league)
  - [ ] 7.3 Create API endpoints for tournament management (admin-only)
  - [ ] 7.4 Implement tournament status transitions: upcoming → active → completed
  - [ ] 7.5 Seed initial tournament data structure for FIFA World Cup or similar

- [x] 8. Match Schedule Service (External API Integration)
  - [ ] 8.1 Implement ScheduleService in src/server/services/schedule.service.ts with football-data.org API client
  - [ ] 8.2 Parse and normalize external API response into Match model (team names, times, stages)
  - [ ] 8.3 Store fetched schedule in SQLite Match table, updating existing matches by external ID
  - [ ] 8.4 Create GET /api/matches/upcoming endpoint with filtering by stage and date range
  - [ ] 8.5 Implement schedule refresh logic pulling from cache first, external API on miss
  - [ ] 8.6 Handle external API unavailability by serving cached schedule with staleness indicator
  - [ ] 8.7 Write property tests for schedule filtering (Property 10) and prediction indicator (Property 11)

- [x] 9. Live Scorecard Service (External API Polling)
  - [ ] 9.1 Implement ScorecardService in src/server/services/scorecard.service.ts
  - [ ] 9.2 Create GET /api/matches/live endpoint returning in-progress matches with current scores
  - [ ] 9.3 Create GET /api/matches/completed endpoint returning finished matches with final scores
  - [ ] 9.4 Implement match result confirmation logic that triggers points calculation
  - [ ] 9.5 Handle API unavailability: serve last known scores with staleness indicator
  - [ ] 9.6 Implement retry logic (1-min intervals, max 10 attempts) for unavailable score source
  - [ ] 9.7 Write property test for scorecard ordering (Property 9)

- [x] 10. Background Job Scheduler (node-cron)
  - [ ] 10.1 Set up node-cron job infrastructure in src/server/jobs/ with error handling and logging
  - [ ] 10.2 Implement score-poller.ts: poll live scores every 2 minutes, update cache and DB
  - [ ] 10.3 Implement schedule-poller.ts: poll match schedule every 30 minutes, update cache and DB
  - [ ] 10.4 Implement news-poller.ts: poll news API every 2 hours, update cache and DB
  - [ ] 10.5 Implement event-poller.ts: poll match events every 2 minutes for feed generation
  - [ ] 10.6 Implement prediction auto-lock: lock predictions when match status changes to live

- [x] 11. Prediction Submission System
  - [ ] 11.1 Implement PredictionService with submitPrediction, getPredictions, lockPredictions, isPredictionWindowOpen
  - [ ] 11.2 Create POST /api/predictions endpoint with score validation (whole number 0-99)
  - [ ] 11.3 Implement upsert logic: one prediction per player per match, new submission replaces existing
  - [ ] 11.4 Enforce prediction lock: reject submissions for matches with status live or completed
  - [ ] 11.5 Create GET /api/predictions/my endpoint returning player's predictions with pagination
  - [ ] 11.6 Display predicted scores with team names and submission timestamp
  - [ ] 11.7 Write property tests for score validation (Property 2), locking (Property 3), and replacement semantics (Property 4)

- [x] 12. Points Engine (Scoring Logic)
  - [ ] 12.1 Implement calculatePoints pure function in src/server/services/points-engine.ts
  - [ ] 12.2 Implement determineOutcome helper: classify as home_win, away_win, or draw
  - [ ] 12.3 Award 3 points for exact score match, 1 point for correct outcome only, 0 otherwise
  - [ ] 12.4 Trigger bulk scoring for all predictions when a match result is confirmed
  - [ ] 12.5 Update leaderboard standings within 5 minutes of result confirmation
  - [ ] 12.6 Ensure scoring is role-agnostic (admin scored same as player)
  - [ ] 12.7 Write property tests for points calculation (Property 1) and admin equality (Property 21)

- [x] 13. Player Dashboard
  - [ ] 13.1 Implement dashboard data aggregation: total points, current rank, prediction count
  - [ ] 13.2 Calculate prediction accuracy: (correct outcomes / total predictions) × 100, rounded to 1 decimal
  - [ ] 13.3 Create GET /api/dashboard endpoint returning aggregated player stats
  - [ ] 13.4 Return most recent 20 predictions with actual results and points awarded
  - [ ] 13.5 Implement achievement streak detection for 3, 5, and 10 consecutive correct predictions
  - [ ] 13.6 Handle empty state: zero points, unranked, N/A accuracy, prompt for first prediction
  - [ ] 13.7 Build Dashboard React component with stats cards, prediction history, and achievement badges
  - [ ] 13.8 Write property tests for accuracy calculation (Property 8) and streak detection (Property 19)

- [x] 14. Leaderboard
  - [ ] 14.1 Create GET /api/leaderboard endpoint returning top 50 players by total points descending
  - [ ] 14.2 Always include current player's entry in response (even if outside top 50)
  - [ ] 14.3 Implement tiebreaker logic: exact scores → correct outcomes → earliest final prediction timestamp
  - [ ] 14.4 Display rank, display name, total points, and prediction accuracy for each entry
  - [ ] 14.5 Build Leaderboard React component with highlighted current player row
  - [ ] 14.6 Write property tests for tournament ranking with tiebreakers (Property 7) and leaderboard inclusion (Property 18)

- [x] 15. News Feed Service
  - [ ] 15.1 Implement NewsService in src/server/services/news.service.ts with NewsAPI client
  - [ ] 15.2 Fetch and store articles: headline (max 120 chars), summary (max 300 chars), source attribution, publication date
  - [ ] 15.3 Create GET /api/news endpoint returning up to 20 articles from last 48 hours, newest first
  - [ ] 15.4 Handle API unavailability: serve cached articles with staleness indicator
  - [ ] 15.5 Build NewsFeed React component with article cards that open source in new tab
  - [ ] 15.6 Write property test for news filtering and ordering (Property 12)

- [x] 16. Favorites Selection
  - [ ] 16.1 Implement FavoritesService with add, remove, and get methods
  - [ ] 16.2 Create GET /api/favorites endpoint returning player's selected teams and players
  - [ ] 16.3 Create PUT /api/favorites/teams endpoint with max 5 teams validation
  - [ ] 16.4 Create PUT /api/favorites/players endpoint with max 10 players validation
  - [ ] 16.5 Implement deselection: allow removing any previously selected favorite at any time
  - [ ] 16.6 Build FavoritesManager React component with searchable team/player lists
  - [ ] 16.7 Write property tests for favorites bounds (Property 16) and deselection (Property 17)

- [x] 17. Personalized Event Feed
  - [ ] 17.1 Implement FeedService in src/server/services/feed.service.ts
  - [ ] 17.2 Build personalized feed by aggregating events for player's favorited teams and players
  - [ ] 17.3 Implement deduplication: same event for favorited team and player shown only once
  - [ ] 17.4 Enforce bounded buffer: max 100 events per player, oldest removed when full
  - [ ] 17.5 Create GET /api/feed endpoint returning events in reverse chronological order
  - [ ] 17.6 Implement fallback: show 10 general tournament highlights when no favorites selected
  - [ ] 17.7 Handle event source unavailability: serve cached events with staleness indicator
  - [ ] 17.8 Build PersonalizedFeed React component with event cards showing type, time, description
  - [ ] 17.9 Write property tests for deduplication (Property 13), bounded buffer (Property 14), and ordering (Property 15)

- [x] 18. Tournament Winner Declaration
  - [ ] 18.1 Implement determineTournamentWinner in LeagueService triggered when all matches are completed
  - [ ] 18.2 Apply tiebreaker chain: total points → exact scores → correct outcomes → earliest timestamp
  - [ ] 18.3 Handle exhausted tiebreakers: declare co-winners sharing the same rank
  - [ ] 18.4 Create GET /api/tournament/standings endpoint with final standings table
  - [ ] 18.5 Display winner announcement on dashboard and leaderboard pages visible to all players
  - [ ] 18.6 Show final standings with total points, accuracy percentage, and numerical rank

- [x] 19. UI/UX (Dark/Light Mode, Responsive Design, Animations)
  - [ ] 19.1 Set up Tailwind CSS with custom theme extending team colors and dark mode class strategy
  - [ ] 19.2 Implement ThemeToggle component with dark/light mode switch, light as default
  - [ ] 19.3 Persist display mode preference in localStorage and restore on session load
  - [ ] 19.4 Implement mobile-responsive layout adapting from 320px width and above
  - [ ] 19.5 Ensure all primary actions (submit prediction, view dashboard, check scores) reachable within 3 taps
  - [ ] 19.6 Add visual feedback animations (300ms-2s) for prediction submission and points awarded
  - [ ] 19.7 Maintain 4.5:1 minimum contrast ratio for all text in both modes
  - [ ] 19.8 Implement separate navigation areas for admin and player functions
  - [ ] 19.9 Write property test for display mode persistence round-trip (Property 20)

- [x] 20. Frontend Core Components and Routing
  - [ ] 20.1 Set up React Router with protected routes (auth guard) and role-based route access
  - [ ] 20.2 Implement AuthPages component (login form, join request form) with validation
  - [ ] 20.3 Create auth context with JWT token management, auto-refresh, and logout
  - [ ] 20.4 Build PredictionForm component with score inputs, team display, and lock indicators
  - [ ] 20.5 Build Scorecard component with live/upcoming/completed sections and auto-refresh polling
  - [ ] 20.6 Build Schedule component with stage/date filters and prediction indicators
  - [ ] 20.7 Wire all components to API endpoints with loading states and error handling

- [x] 21. Integration and End-to-End Wiring
  - [ ] 21.1 Wire Express to serve static React build from dist/client in production mode
  - [ ] 21.2 Configure Vite dev proxy to forward /api requests to Express server
  - [ ] 21.3 Implement graceful shutdown: persist cache, close DB connection, stop cron jobs
  - [ ] 21.4 Add request logging middleware and global error handler with ErrorResponse format
  - [ ] 21.5 Create npm scripts: dev (concurrent Vite + Express), build (compile both), start (production)
  - [ ] 21.6 Write integration tests for complete prediction flow (register → join → predict → score → leaderboard)
  - [ ] 21.7 Write integration tests for cache fallback behavior across all external data sources
  - [ ] 21.8 Verify all 12 requirements are covered with end-to-end manual smoke test checklist

## Task Dependency Graph

```
1 (Scaffolding) → 2 (Database) → 3 (Cache) → 4 (Auth)
4 (Auth) → 5 (Join Requests) → 6 (Admin Panel)
4 (Auth) → 7 (League Management)
7 (League) → 8 (Schedule Service)
7 (League) → 9 (Scorecard Service)
3 (Cache) → 10 (Background Jobs)
8 (Schedule) + 9 (Scorecard) → 10 (Background Jobs)
4 (Auth) + 2 (Database) → 11 (Predictions)
11 (Predictions) + 9 (Scorecard) → 12 (Points Engine)
12 (Points Engine) → 13 (Dashboard)
12 (Points Engine) → 14 (Leaderboard)
3 (Cache) → 15 (News Feed)
4 (Auth) → 16 (Favorites)
16 (Favorites) + 10 (Background Jobs) → 17 (Event Feed)
12 (Points Engine) + 14 (Leaderboard) → 18 (Winner Declaration)
1 (Scaffolding) → 19 (UI/UX)
4 (Auth) + 19 (UI/UX) → 20 (Frontend Components)
All Tasks → 21 (Integration)
```

## Notes

- All tasks assume Node.js v18+ is available on the system
- No Docker, PostgreSQL, Redis, or Nginx required
- Free API keys needed: football-data.org and NewsAPI.org
- SQLite database file is auto-created on first run in data/ directory
- Property-based tests use fast-check with minimum 100 iterations each
