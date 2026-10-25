# Game Bug Fixes and Score Retry

## Task 1: Restore corrupted GameScene — Complete
- Restored the scene from the last committed version and retained the existing game behavior before adding the requested features.

## Task 2: Rate-limit authentication — Complete
- Registration and login endpoints use `express-rate-limit` with separate windows and request limits.

## Task 3: Validate leaderboard input — Complete
- Leaderboard `limit` and `offset` are parsed strictly and bounded before database queries.

## Task 4: Retry failed score submissions — Complete
- Offline scores are stored with submission IDs and timestamps; a visible retry action and online/reconnect checks flush the queue.
- Server-side score submission IDs are unique per user, so retries after ambiguous responses do not count the same game twice.
- Authentication and validation failures are surfaced rather than silently queued.
