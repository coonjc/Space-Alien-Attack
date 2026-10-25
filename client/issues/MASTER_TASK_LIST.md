# Space Alien Attack — Master Task List

**Updated:** 2026-10-24  
**Status:** All 16 tracked tasks have implementations. Client and server production builds pass; runtime/database checks remain.

## Progress at a glance

| Priority | Total | Complete | Partial | Remaining |
|---|---:|---:|---:|---:|
| Critical fixes | 4 | 4 | 0 | 0 |
| High-priority features | 4 | 4 | 0 | 0 |
| Medium-priority features | 7 | 7 | 0 | 0 |
| Low-priority features | 1 | 1 | 0 | 0 |
| **Total** | **16** | **16** | **0** | **0** |

## Critical fixes and reliability

| # | Task | Status | Implementation |
|---|---|---|---|
| 1 | Restore corrupted game scene | Complete | Restored `GameScene.ts` from the committed source. |
| 2 | Rate-limit authentication | Complete | Registration and login have separate rate limits. |
| 3 | Validate leaderboard parameters | Complete | `limit` and `offset` are strictly parsed and bounded. |
| 4 | Recover failed score submissions | Complete | Cached score retries, visible retry control, automatic reconnect checks, and per-user submission idempotency. |

## High-priority features

| # | Task | Status | Implementation |
|---|---|---|---|
| 5 | Pause/resume | Complete | P toggles physics pause and the pause overlay. |
| 6 | Power-ups | Complete | Triple shot, one-hit shield, and temporary explosive rounds; explosive kills affect nearby aliens. |
| 7 | Particle effects | Complete | Alien deaths emit an eight-particle burst. |
| 8 | Offline mode | Complete | Startup/periodic connectivity detection, browser online handling, local queued scores, and automatic/manual sync. |

## Medium-priority features

| # | Task | Status | Implementation |
|---|---|---|---|
| 9 | Combo system | Complete | Two-second kill streak; score multiplier rises every five kills and appears in the HUD. |
| 10 | Weapon upgrades | Complete | Single, triple, and spread weapons; wave clears and explosive pickup advance tiers. |
| 11 | Achievements | Complete | Score/combo/weapon/wave/survival unlocks; local storage, HUD notification, authenticated database sync. |
| 12 | Local high scores | Complete | Persistent top-ten scores and separate leaderboard. |
| 13 | Wave progression | Complete | Ten-step table tunes formation size, movement/fire cadence, and pickup chance; later waves cap at the final tier. |
| 14 | Leaderboard pagination | Complete | Strictly validated offset/limit API and client Previous/Next controls with ranks/total. |
| 15 | Admin dashboard | Complete | User/stats list, email search, status filter, refresh, ban/unban, and confirmed delete. |

## Low-priority feature

| # | Task | Status | Implementation |
|---|---|---|---|
| 16 | Sound effects | Complete | Synthesized shooting/explosion/hit/pickup effects; M toggles persisted mute setting. |

## Verification and rollout

- `npm run build --workspace @space-alien-attack/client` — passed.
- `npm run prisma:generate --workspace @space-alien-attack/server` — passed.
- `npm run build --workspace @space-alien-attack/server` — passed.
- Apply all pending Prisma migrations to the configured database with `npm run prisma:migrate --workspace @space-alien-attack/server`.
- Browser gameplay, pagination, admin actions, and account achievement/score-sync checks still need a configured runtime/database.

The score multiplier is part of the combo feature and is not an additional task. The issue documents are now included by the `.gitignore` exception for `client/issues/*.md`.
