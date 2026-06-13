# Requirements Document

## Introduction

A sports prediction league website where friends can predict match scores for tournaments (FIFA World Cup or other sports), earn points based on prediction accuracy, and compete against each other. The platform features dual admin/player roles, personalized dashboards, live scorecards sourced from external APIs, match schedules, sports news, and personalized feeds based on favorite teams and players.

## Glossary

- **Platform**: The sports prediction league web application
- **Admin**: A user with administrative privileges to manage league membership and tournament settings
- **Player**: A user who participates in the prediction league by submitting score predictions
- **Prediction**: A score forecast submitted by a Player for an upcoming match
- **League**: A group of friends competing against each other in predicting match outcomes
- **Tournament**: A sports competition (e.g., FIFA World Cup) that the League is tracking
- **Match**: A single game between two teams within a Tournament
- **Dashboard**: A personalized view showing a Player's statistics, predictions, and rankings
- **Scorecard**: Live and final match results sourced from an external sports data API
- **Feed**: A personalized stream of news and events related to a Player's favorite teams and players
- **Points_Engine**: The component that calculates and awards points based on prediction accuracy
- **Schedule_Service**: The component that retrieves and displays upcoming match information
- **News_Service**: The component that aggregates and delivers sports news and event updates
- **Favorites**: A Player's selected teams and players for which they receive personalized updates

## Requirements

### Requirement 1: User Registration and League Joining

**User Story:** As a sports fan, I want to request to join the prediction league, so that I can compete with my friends.

#### Acceptance Criteria

1. WHEN a user submits a join request, THE Platform SHALL create a pending membership request containing the user's name, email address, and a display name between 3 and 30 characters
2. WHEN a user submits a join request, THE Platform SHALL notify the Admin of the new request via an in-app notification
3. WHEN the Admin approves a join request, THE Platform SHALL grant the user Player access to the League and notify the user of approval
4. WHEN the Admin rejects a join request, THE Platform SHALL notify the rejected user with a message indicating the reason for rejection
5. THE Platform SHALL require each Player to have a unique display name within the League
6. IF a user submits a join request with an email address already associated with a pending request or existing Player, THEN THE Platform SHALL reject the submission and display an error message indicating the email is already in use
7. IF a user submits a join request with a display name that is already taken within the League, THEN THE Platform SHALL reject the submission and display an error message indicating the display name is unavailable
8. IF a user submits a join request with an invalid email format or a display name outside the 3 to 30 character range, THEN THE Platform SHALL reject the submission and display an error message indicating which field failed validation

### Requirement 2: Admin and Player Dual Role

**User Story:** As the league creator, I want to have both admin and player roles simultaneously, so that I can manage the league while also participating in predictions.

#### Acceptance Criteria

1. WHEN a user creates a new League, THE Platform SHALL automatically assign both Admin and Player roles to that user
2. WHILE a user has Admin role, THE Platform SHALL display administrative controls (member approval, tournament settings) in a dedicated section separate from player features (predictions, dashboard, leaderboard)
3. WHEN the Admin submits a prediction, THE Points_Engine SHALL evaluate the Admin's prediction using the same scoring rules as other Players
4. THE Platform SHALL display the Admin's score and rank on the League leaderboard alongside all other Players
5. WHILE a match prediction window is open, THE Platform SHALL prevent the Admin from viewing other Players' predictions for that match
6. THE Platform SHALL render admin functions in a distinct navigation area or panel from player functions so that a user can identify which actions are administrative and which are player actions without ambiguity

### Requirement 3: Score Prediction Submission

**User Story:** As a player, I want to predict match scores for upcoming games, so that I can earn points based on my accuracy.

#### Acceptance Criteria

1. WHEN a match is scheduled, THE Platform SHALL allow Players to submit a predicted score for each team as a whole number between 0 and 99
2. WHILE a match has not started, THE Platform SHALL allow Players to update their predictions an unlimited number of times, replacing the previous prediction
3. WHEN a match starts, THE Platform SHALL lock all predictions for that match and prevent further changes
4. THE Platform SHALL display the Player's submitted predictions showing team names, predicted scores, and submission timestamp
5. IF a Player attempts to submit a prediction after match start, THEN THE Platform SHALL display an error message indicating the prediction window has closed and retain the Player's last valid prediction
6. IF a Player submits a prediction with a non-whole-number value or a value outside the range 0 to 99, THEN THE Platform SHALL reject the submission and display an error message indicating the valid score range
7. THE Platform SHALL accept only one prediction per Player per match, where a new submission replaces any existing prediction for that match

### Requirement 4: Points Calculation and Scoring

**User Story:** As a player, I want to earn points based on how accurate my predictions are, so that I can compete meaningfully with my friends.

#### Acceptance Criteria

1. WHEN a match ends and the final score is confirmed, THE Points_Engine SHALL calculate points for each Player's prediction
2. THE Points_Engine SHALL award 3 points for an exact score prediction (both home and away scores match the final result)
3. THE Points_Engine SHALL award 1 point for a correct match outcome prediction (home win, away win, or draw) with an incorrect exact score
4. THE Points_Engine SHALL award zero points for an incorrect match outcome prediction
5. THE Points_Engine SHALL update the League leaderboard within 5 minutes of a match result being confirmed
6. IF the external score source is unavailable, THEN THE Points_Engine SHALL retry retrieval at 1-minute intervals for a maximum of 10 attempts
7. IF the external score source remains unavailable after the maximum retry attempts, THEN THE Points_Engine SHALL mark the match result as pending and leave existing Player scores and leaderboard standings unchanged until the result is obtained

### Requirement 5: Player Dashboard

**User Story:** As a player, I want a personalized dashboard, so that I can track my performance and see how I compare to friends.

#### Acceptance Criteria

1. THE Platform SHALL display a Dashboard for each authenticated Player showing total points, current rank among all Players, and the most recent 20 predictions in reverse chronological order
2. THE Dashboard SHALL display the Player's prediction accuracy percentage calculated as (number of correct predictions / total predictions made) × 100, rounded to one decimal place
3. THE Dashboard SHALL display a leaderboard showing the top 50 Players ranked by total points in descending order, with the current Player's position always visible even if outside the top 50
4. THE Dashboard SHALL display the Player's most recent 10 predictions alongside actual match results, showing the predicted outcome, actual outcome, and points awarded for each
5. WHEN a match result is updated, THE Dashboard SHALL reflect the new points and rank within 5 minutes
6. THE Dashboard SHALL display visual indicators (badges or icons) for achievement milestones when the Player reaches 3, 5, and 10 consecutive correct predictions
7. IF the Player has made no predictions, THEN THE Dashboard SHALL display total points as zero, rank as unranked, accuracy as not applicable, and an empty prediction history with a prompt to make their first prediction

### Requirement 6: Live Tournament Scorecard

**User Story:** As a player, I want to see live and final match scores from an external source, so that I can follow the tournament in real-time.

#### Acceptance Criteria

1. THE Scorecard SHALL retrieve match scores from an external sports data API
2. WHILE a match is in progress, THE Scorecard SHALL update the displayed score at intervals no greater than 5 minutes
3. WHEN a match ends, THE Scorecard SHALL display the final confirmed score
4. THE Scorecard SHALL display team names, current score, match time, and match status (upcoming, live, completed)
5. IF the external sports data API is unavailable, THEN THE Platform SHALL display the last known score with a staleness indicator showing time since last update
6. WHEN the Scorecard page is loaded, THE Platform SHALL retrieve and display current scores for all matches scheduled on the current day
7. THE Scorecard SHALL display matches ordered by status (live first, then upcoming, then completed) and within each status group ordered by match time

### Requirement 7: Upcoming Match Schedule

**User Story:** As a player, I want to see the upcoming match schedule, so that I can plan my predictions ahead of time.

#### Acceptance Criteria

1. THE Schedule_Service SHALL display all matches for the active Tournament that have not yet started, ordered by match date and time ascending, showing date, time, and competing teams
2. THE Schedule_Service SHALL display match times in the Player's local timezone as detected by the browser
3. WHEN the Tournament schedule is updated at the source, THE Schedule_Service SHALL reflect changes within 1 hour
4. THE Schedule_Service SHALL display a visual indicator on each upcoming match for which the Player has already submitted a prediction
5. THE Schedule_Service SHALL allow Players to filter matches by group stage, knockout round, or a selected date range within the Tournament start and end dates
6. IF the external schedule source is unavailable, THEN THE Schedule_Service SHALL display the last retrieved schedule data with a staleness indicator showing time since last successful update
7. IF no upcoming matches exist for the active Tournament, THEN THE Schedule_Service SHALL display a message indicating that the schedule is complete or not yet available

### Requirement 8: Sports News Feed

**User Story:** As a player, I want to see relevant sports news, so that I can make informed predictions.

#### Acceptance Criteria

1. THE News_Service SHALL display up to 20 news articles published within the last 48 hours related to the active Tournament, ordered by publication date from newest to oldest
2. THE News_Service SHALL update the news feed at least every 2 hours
3. THE News_Service SHALL display each news item with a headline (maximum 120 characters), a summary (maximum 300 characters), source attribution, and publication date
4. WHEN a Player selects a news article, THE Platform SHALL open the full article from the original source in a new browser tab
5. IF the news source is unavailable, THEN THE News_Service SHALL display the most recently cached articles with a staleness indicator showing time since last successful update

### Requirement 9: Favorite Teams and Players Selection

**User Story:** As a player, I want to choose my favorite teams and players, so that I can receive updates specific to them.

#### Acceptance Criteria

1. THE Platform SHALL allow each Player to select between 1 and 5 favorite teams from the Tournament roster
2. THE Platform SHALL allow each Player to select between 1 and 10 favorite players from the Tournament roster
3. WHEN a Player updates their Favorites, THE Platform SHALL immediately adjust the personalized Feed content
4. THE Platform SHALL display the Player's selected Favorites on their Dashboard with team logos and player photos where available
5. THE Platform SHALL allow a Player to deselect any previously selected favorite team or player at any time
6. IF a Player attempts to select more than 5 favorite teams or more than 10 favorite players, THEN THE Platform SHALL reject the addition and display an error message indicating the maximum has been reached

### Requirement 10: Personalized Event Feed for Favorites

**User Story:** As a player, I want to receive notifications about important events for my favorite teams and players, so that I stay informed about what matters most to me.

#### Acceptance Criteria

1. WHEN a significant event occurs for a favorited team (goal, red card, injury, lineup announcement), THE Feed SHALL display a notification to the Player within 10 minutes of the event
2. WHEN a significant event occurs for a favorited player (goal, assist, substitution, injury), THE Feed SHALL display a notification to the Player within 10 minutes of the event
3. THE Feed SHALL display events in reverse chronological order with event type, timestamp, and description
4. THE Feed SHALL aggregate events from favorited teams and players into a single unified stream, with duplicate events (same event appearing for both a favorited team and player) shown only once
5. WHILE no Favorites are selected, THE Feed SHALL display up to 10 general Tournament highlights including goals, upsets, and milestone events from the last 24 hours
6. THE Feed SHALL retain and display up to 100 most recent events, removing the oldest events when the limit is reached
7. IF the event data source is unavailable, THEN THE Feed SHALL display previously cached events with a staleness indicator showing time since last successful update

### Requirement 11: Tournament Winner Declaration

**User Story:** As a player, I want a clear winner to be declared at the end of the tournament, so that the competition has a satisfying conclusion.

#### Acceptance Criteria

1. WHEN all Tournament matches are completed and scored, THE Points_Engine SHALL determine the League winner as the Player with the highest total points
2. IF two or more Players have equal total points at Tournament end, THEN THE Points_Engine SHALL apply a tiebreaker in the following order: (a) highest number of exact score predictions, (b) highest number of correct match outcome predictions, (c) earliest final prediction submission timestamp
3. WHEN the winner is determined, THE Platform SHALL display a winner announcement on the Dashboard and leaderboard pages, visible to all Players, and the announcement SHALL remain displayed for the duration the final standings are accessible
4. WHEN all Tournament matches are completed and scored, THE Platform SHALL display a final standings table showing each Player's total points, prediction accuracy as a percentage of correct outcome predictions out of total matches, and numerical rank
5. IF the tiebreaker criteria are exhausted and Players remain tied, THEN THE Points_Engine SHALL declare co-winners and THE Platform SHALL display all tied Players as sharing the same rank

### Requirement 12: Intuitive UI for Young Sports Fans

**User Story:** As a young sports fan, I want the interface to be engaging and easy to use, so that I enjoy using the platform.

#### Acceptance Criteria

1. THE Platform SHALL use a mobile-responsive layout that adapts to screen sizes from 320px width and above
2. THE Platform SHALL complete primary navigation actions (submit prediction, view dashboard, check scores) within 3 taps or clicks from any screen
3. THE Platform SHALL use team colors and logos where available to enhance visual recognition, and SHALL fall back to a default neutral color scheme when team colors or logos are not available
4. WHEN a prediction is submitted or points are awarded, THE Platform SHALL provide visual feedback (animation or transition) that is displayed for between 300 milliseconds and 2 seconds
5. THE Platform SHALL support dark mode and light mode display options, with light mode as the default for new users
6. THE Platform SHALL persist the user's selected display mode preference across sessions
7. THE Platform SHALL maintain a minimum contrast ratio of 4.5:1 for all text against background colors in both dark mode and light mode
