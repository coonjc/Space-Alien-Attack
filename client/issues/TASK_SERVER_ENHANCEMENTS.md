# Server and Game Enhancements

## Feature 12: Better Wave Progression — Complete
**Priority:** 🟡 MEDIUM  
**Files:** `client/src/scenes/GameScene.ts`, `client/src/scenes/UIScene.ts`

### Implemented
- Added a ten-step progression table for formation size, movement cadence, alien firing cadence, and power-up chance.
- Waves beyond ten use the maximum configuration.
- The current wave is shown in the HUD.

## Feature 13: Leaderboard Pagination — Complete
**Priority:** 🟡 MEDIUM  
**Files:** `server/src/routes/leaderboard.ts`, `client/src/api.ts`, `client/src/main.ts`

### Implemented
- The API validates `limit` (1–100) and non-negative `offset`.
- Responses include entries, total count, limit, and offset.
- Previous/Next controls show the current rank range.

## Feature 14: Admin Dashboard — Complete
**Priority:** 🟡 MEDIUM  
**Files:** `client/src/admin/main.ts`, `client/admin.html`

### Implemented
- Lists users, roles, ban status, scores, game counts, and account creation dates.
- Includes email search, account-status filters, and refresh.
- Supports ban/unban and confirmed deletion; request failures are surfaced in the dashboard.

## Feature 15: Sound Effects — Complete
**Priority:** 🟢 LOW  
**Files:** `client/src/SoundEffects.ts`, `client/src/scenes/GameScene.ts`, `client/src/scenes/UIScene.ts`

### Implemented
- Synthesizes firing, explosion, hit, and pickup effects with Web Audio.
- M toggles mute, persists the setting, and displays the current state in the HUD.
