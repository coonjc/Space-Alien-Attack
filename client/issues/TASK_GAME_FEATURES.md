# 🟢 Game Features - Power-Ups, Combos, Upgrades

## Feature 5: Implement Power-Up System — Complete
**Priority:** 🟠 HIGH  
**File:** `client/src/scenes/GameScene.ts` and `client/src/scenes/BootScene.ts`

### Implemented:
- Pickups have physics bodies, move into reach, follow their labels, and expire if not collected.
- Triple shot temporarily improves the active weapon; shield absorbs one hit.
- Explosive rounds damage aliens in a blast radius and grant a weapon upgrade on pickup.

---

## Feature 8: Add Combo System — Complete
**Priority:** 🟡 MEDIUM  
**Files:** `client/src/scenes/GameScene.ts`, `client/src/scenes/UIScene.ts`

### Implemented:
- Consecutive alien kills within two seconds build a combo; the timer resets after a gap.
- Every five kills increases the score multiplier by one.
- The HUD displays the current combo and multiplier.

---

## Feature 9: Add Weapon Upgrades System — Complete
**Priority:** 🟡 MEDIUM  
**Files:** `client/src/scenes/GameScene.ts`, `client/src/scenes/UIScene.ts`

### Implemented:
- Starts with single shot, upgrades to triple shot, then a five-projectile spread.
- Clearing a wave advances one weapon level; the explosive pickup also grants an upgrade.
- The weapon tier is displayed in the HUD and unlocks matching achievements.
