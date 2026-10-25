# 🟢 Offline Mode Implementation

## Feature 7: Add Offline Play with Cloud Sync — Complete
**Priority:** 🟠 HIGH  
**File:** `client/src/main.ts` and `api.ts`

### Implemented:
- Server connectivity is checked during app startup and periodically, with browser `online` events triggering an immediate check.
- Signed-in scores are queued in localStorage while offline and retried automatically when the server returns; a manual retry button is also available.
- Cached submissions include stable IDs and timestamps. Server-side idempotency prevents duplicate score/game counts if a retry follows an uncertain network response.
- Anonymous scores remain in the local leaderboard and are not uploaded without an account.
