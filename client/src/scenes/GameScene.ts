/**
 * GameScene — core gameplay loop.
 *
 * Contains the player ship ("The Skimmer"), the alien formation
 * ("Driftlings"), shooting for both sides, collision handling, and
 * in-memory score/lives tracking. See BootScene for notes on the intended
 * original visual direction of the placeholder shapes used here.
 */
import Phaser from 'phaser';
import { TEXTURES } from './BootScene';
import { SoundEffects } from '../SoundEffects';

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 640;

interface WaveConfig {
  rows: number;
  columns: number;
  moveIntervalMs: number;
  stepDistance: number;
  fireIntervalMs: number;
  powerUpChance: number;
}

const WAVE_CONFIG: WaveConfig[] = [
  { rows: 3, columns: 8, moveIntervalMs: 700, stepDistance: 6, fireIntervalMs: 1600, powerUpChance: 0.05 },
  { rows: 3, columns: 8, moveIntervalMs: 650, stepDistance: 7, fireIntervalMs: 1450, powerUpChance: 0.06 },
  { rows: 3, columns: 8, moveIntervalMs: 600, stepDistance: 8, fireIntervalMs: 1300, powerUpChance: 0.07 },
  { rows: 3, columns: 7, moveIntervalMs: 550, stepDistance: 9, fireIntervalMs: 1150, powerUpChance: 0.08 },
  { rows: 2, columns: 8, moveIntervalMs: 500, stepDistance: 10, fireIntervalMs: 1000, powerUpChance: 0.09 },
  { rows: 2, columns: 8, moveIntervalMs: 450, stepDistance: 11, fireIntervalMs: 900, powerUpChance: 0.1 },
  { rows: 2, columns: 8, moveIntervalMs: 400, stepDistance: 12, fireIntervalMs: 800, powerUpChance: 0.1 },
  { rows: 2, columns: 8, moveIntervalMs: 350, stepDistance: 13, fireIntervalMs: 700, powerUpChance: 0.1 },
  { rows: 2, columns: 8, moveIntervalMs: 300, stepDistance: 14, fireIntervalMs: 600, powerUpChance: 0.1 },
  { rows: 2, columns: 8, moveIntervalMs: 275, stepDistance: 14, fireIntervalMs: 500, powerUpChance: 0.1 }
];
const ALIEN_SPACING_X = 42;
const ALIEN_SPACING_Y = 36;
const ALIEN_FORMATION_TOP = 70;
const ALIEN_FORMATION_LEFT = 40;
const ALIEN_STEP_DOWN = 20;
const COMBO_TIME_MS = 2000;
const ACHIEVEMENTS_STORAGE_KEY = 'saa-achievements';
const EXPLOSIVE_RADIUS = 72;

function createSubmissionId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// Power-up related constants
const POWERUP_DURATION_MS = 10000; // 10 seconds for power-ups

const PLAYER_SPEED = 260;
const PLAYER_BULLET_SPEED = 420;
const ALIEN_BULLET_SPEED = 220;
const PLAYER_FIRE_COOLDOWN_MS = 300;
const PLAYER_STARTING_LIVES = 3;
const PLAYER_INVULNERABILITY_MS = 1500;

// Power-up type declaration
type PowerUpType = 'TRIPLE_SHOT' | 'SHIELD' | 'EXPLOSIVE';
type WeaponLevel = 0 | 1 | 2;

const ACHIEVEMENTS = [
  { id: 'score_100', title: 'Rising Star', description: 'Score 100 points' },
  { id: 'score_500', title: 'Ace Pilot', description: 'Score 500 points' },
  { id: 'score_1000', title: 'Space Legend', description: 'Score 1,000 points' },
  { id: 'combo_5', title: 'On a Roll', description: 'Reach a 5-hit combo' },
  { id: 'combo_10', title: 'Unstoppable', description: 'Reach a 10-hit combo' },
  { id: 'weapon_triple', title: 'Triple Threat', description: 'Unlock triple shot' },
  { id: 'weapon_spread', title: 'Wide Coverage', description: 'Unlock spread shot' },
  { id: 'wave_5', title: 'Battle Tested', description: 'Reach wave 5' },
  { id: 'wave_10', title: 'Veteran Pilot', description: 'Reach wave 10' },
  { id: 'first_hit_taken', title: 'Close Call', description: 'Survive your first hit' }
] as const;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private muteKey!: Phaser.Input.Keyboard.Key;

  private aliens!: Phaser.Physics.Arcade.Group;
  private powerUps!: Phaser.Physics.Arcade.Group;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private alienBullets!: Phaser.Physics.Arcade.Group;

  // Particle emitter for explosions
  private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private shieldVisual?: Phaser.GameObjects.Arc;

  // Power-up state
  private activePowerUps: Map<PowerUpType, number> = new Map(); // powerUp -> expireTime

  private alienDirection: 1 | -1 = 1;
  private alienMoveTimer = 0;
  private nextAlienFireAt = 0;
  private currentWaveConfig!: WaveConfig;

  private lastFiredAt = 0;
  private score = 0;
  private submissionId = '';
  private lives = PLAYER_STARTING_LIVES;
  private wave = 1;
  private comboCount = 0;
  private comboExpiresAt = 0;
  private comboResetTimer?: Phaser.Time.TimerEvent;
  private weaponLevel: WeaponLevel = 0;
  private unlockedAchievements = new Set<string>();
  private soundEffects = new SoundEffects();
  private isGameOver = false;
  private playerInvulnerable = false;

  // Pause state
  private isPaused = false;
  private pauseOverlay!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.score = 0;
    this.submissionId = createSubmissionId();
    this.lives = PLAYER_STARTING_LIVES;
    this.wave = 1;
    this.isGameOver = false;
    this.playerInvulnerable = false;
    this.alienDirection = 1;
    this.alienMoveTimer = 0;
    this.nextAlienFireAt = 0;
    this.currentWaveConfig = this.getWaveConfig(this.wave);
    this.lastFiredAt = 0;
    this.isPaused = false;
    this.comboCount = 0;
    this.comboExpiresAt = 0;
    this.comboResetTimer?.remove();
    this.weaponLevel = 0;
    this.unlockedAchievements = this.loadUnlockedAchievements();
    this.activePowerUps.clear();
    this.shieldVisual = undefined;

    // Reset particle emitter position
    if (this.particleEmitter) {
      this.particleEmitter.destroy();
    }
    this.cameras.main.setBackgroundColor('#05060a');

    this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT - 50, TEXTURES.PLAYER);
    this.player.setCollideWorldBounds(true);

    this.playerBullets = this.physics.add.group();
    this.alienBullets = this.physics.add.group();

    this.aliens = this.physics.add.group();
    this.powerUps = this.physics.add.group();
    this.spawnAlienWave();
    this.maybeSpawnPowerUp();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.muteKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.game.events.emit('sound-muted-changed', this.soundEffects.isMuted);

    // Create pause overlay UI
    this.pauseOverlay = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'PAUSED', {
      fontSize: '48px',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.physics.add.overlap(this.playerBullets, this.aliens, this.handlePlayerBulletHitsAlien, undefined, this);
    this.physics.add.overlap(this.alienBullets, this.player, this.handleAlienBulletHitsPlayer, undefined, this);
    this.physics.add.overlap(this.aliens, this.player, this.handleAlienReachesPlayer, undefined, this);
    this.physics.add.overlap(this.player, this.powerUps, this.handlePowerUpPickup, undefined, this);

    // Create particle emitter for explosions
    this.particleEmitter = this.add.particles(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      TEXTURES.PARTICLE_1
    );

    this.events.emit('score-changed', this.score);
    this.events.emit('lives-changed', this.lives);
    this.events.emit('combo-changed', this.comboCount, 1);
    this.events.emit('weapon-changed', this.weaponLevel);
    this.events.emit('achievements-changed', this.unlockedAchievements.size);
    this.events.emit('wave-changed', this.wave);

    // Pause key handler
    this.pauseKey.on('down', () => {
      if (!this.isGameOver) {
        this.togglePause();
      }
    });
    this.muteKey.on('down', () => {
      const muted = this.soundEffects.toggle();
      this.game.events.emit('sound-muted-changed', muted);
    });
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
      return;
    }

    // Skip game updates when paused
    if (this.isPaused) {
      return;
    }

    if (!this.player.active) {
      this.player.setActive(true).setVisible(true);
    }
    if (!this.player.body) {
      this.physics.add.existing(this.player);
      this.player.setCollideWorldBounds(true);
    }
    if (!this.player.body) return;

    this.handlePlayerMovement(time);
    this.updateAlienFormation(time, delta);
    this.updateAlienFire(time);
    this.cleanupOffscreenBullets();
    if (this.shieldVisual?.active) {
      this.shieldVisual.setPosition(this.player.x, this.player.y);
    }
    this.updatePowerUpLabels();

    if (this.aliens.countActive(true) === 0) {
      this.advanceWave();
    }
  }

  private spawnAlienWave(): void {
    const rowTextures = [TEXTURES.ALIEN_ROW_A, TEXTURES.ALIEN_ROW_B, TEXTURES.ALIEN_ROW_C];

    for (let row = 0; row < this.currentWaveConfig.rows; row++) {
      for (let col = 0; col < this.currentWaveConfig.columns; col++) {
        const x = ALIEN_FORMATION_LEFT + col * ALIEN_SPACING_X;
        const y = ALIEN_FORMATION_TOP + row * ALIEN_SPACING_Y;
        const texture = rowTextures[row % rowTextures.length];
        const alien = this.aliens.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
        alien.setData('points', (this.currentWaveConfig.rows - row) * 10);
      }
    }
  }

  private handlePlayerMovement(time: number): void {
    this.player.setVelocityX(0);

    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-PLAYER_SPEED);
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(PLAYER_SPEED);
    }

    if (this.fireKey.isDown && time > this.lastFiredAt + PLAYER_FIRE_COOLDOWN_MS) {
      this.firePlayerBullet();
      this.soundEffects.play('shoot');
      this.lastFiredAt = time;
    }
  }

  private firePlayerBullet(): void {
    const effectiveLevel = this.activePowerUps.has('TRIPLE_SHOT')
      ? Math.max(this.weaponLevel, 1)
      : this.weaponLevel;
    const horizontalSpeeds = effectiveLevel === 2
      ? [-160, -80, 0, 80, 160]
      : effectiveLevel === 1
        ? [-90, 0, 90]
        : [0];

    horizontalSpeeds.forEach((velocityX) => {
      const bullet = this.playerBullets.create(
        this.player.x,
        this.player.y - this.player.height / 2,
        TEXTURES.PLAYER_BULLET
      ) as Phaser.Physics.Arcade.Sprite;
      bullet.setVelocity(velocityX, -PLAYER_BULLET_SPEED);
    });
  }

  private updateAlienFormation(time: number, _delta: number): void {
    if (time < this.alienMoveTimer) return;
    this.alienMoveTimer = time + this.currentWaveConfig.moveIntervalMs;

    let hitEdge = false;
    this.aliens.children.iterate((child) => {
      if (!child) return true;
      const alien = child as Phaser.Physics.Arcade.Sprite;
      if (!alien.active) return true;
      alien.x += this.currentWaveConfig.stepDistance * this.alienDirection;
      if (alien.x <= 24 || alien.x >= WORLD_WIDTH - 24) {
        hitEdge = true;
      }
      return true;
    });

    if (hitEdge) {
      this.alienDirection = this.alienDirection === 1 ? -1 : 1;
      this.aliens.children.iterate((child) => {
        if (!child) return true;
        const alien = child as Phaser.Physics.Arcade.Sprite;
        if (alien.active) alien.y += ALIEN_STEP_DOWN;
        return true;
      });
    }
  }

  private updateAlienFire(time: number): void {
    const activeAliens = this.aliens.getChildren().filter((a) => (a as Phaser.Physics.Arcade.Sprite).active);
    if (activeAliens.length === 0) return;

    if (time >= this.nextAlienFireAt) {
      const shooter = Phaser.Utils.Array.GetRandom(activeAliens) as Phaser.Physics.Arcade.Sprite;
      const bullet = this.alienBullets.create(shooter.x, shooter.y + shooter.height / 2, TEXTURES.ALIEN_BULLET) as Phaser.Physics.Arcade.Sprite;
      bullet.setVelocityY(ALIEN_BULLET_SPEED);
      this.nextAlienFireAt = time + this.currentWaveConfig.fireIntervalMs;
    }

    let alienReachedPlayer = false;
    for (const alienObj of activeAliens) {
      const alien = alienObj as Phaser.Physics.Arcade.Sprite;
      if (alien.y >= this.player.y) {
        alien.destroy();
        this.soundEffects.play('explosion');
        alienReachedPlayer = true;
      }
    }
    if (alienReachedPlayer) this.damagePlayer();
  }

  private cleanupOffscreenBullets(): void {
    this.playerBullets.children.iterate((child) => {
      if (!child) return true;
      const bullet = child as Phaser.Physics.Arcade.Sprite;
      if (bullet.active && bullet.y < -20) bullet.destroy();
      return true;
    });
    this.alienBullets.children.iterate((child) => {
      if (!child) return true;
      const bullet = child as Phaser.Physics.Arcade.Sprite;
      if (bullet.active && bullet.y > WORLD_HEIGHT + 20) bullet.destroy();
      return true;
    });
  }

  private handlePlayerBulletHitsAlien: ArcadePhysicsCallback = (bulletObj, alienObj) => {
    const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;
    const alien = alienObj as Phaser.Physics.Arcade.Sprite;
    if (!bullet.active || !alien.active) return;

    bullet.destroy();
    if (this.activePowerUps.has('EXPLOSIVE')) {
      this.damageAliensInBlast(alien.x, alien.y);
    } else {
      this.destroyAlien(alien);
    }
  };

  private handleAlienBulletHitsPlayer: ArcadePhysicsCallback = (bulletObj) => {
    (bulletObj as Phaser.Physics.Arcade.Sprite).destroy();
    this.damagePlayer();
  };

  private handleAlienReachesPlayer: ArcadePhysicsCallback = (alienObj) => {
    (alienObj as Phaser.Physics.Arcade.Sprite).destroy();
    this.damagePlayer();
  };

  private damagePlayer(): void {
    if (this.isGameOver || this.playerInvulnerable) return;
    if (this.activePowerUps.has('SHIELD')) {
      this.activePowerUps.delete('SHIELD');
      this.shieldVisual?.destroy();
      this.shieldVisual = undefined;
      return;
    }
    this.player.setActive(true).setVisible(true).setAlpha(1);
    this.soundEffects.play('hit');
    this.lives -= 1;
    this.events.emit('lives-changed', this.lives);
    this.unlockAchievement('first_hit_taken');
    if (this.lives <= 0) {
      this.triggerGameOver();
      return;
    }

    this.playerInvulnerable = true;
    this.time.delayedCall(PLAYER_INVULNERABILITY_MS, () => {
      this.playerInvulnerable = false;
      this.player.setActive(true).setVisible(true).setAlpha(1);
    });
  }

  private triggerGameOver(): void {
    if (this.isGameOver || this.lives > 0) return;
    this.isGameOver = true;
    this.physics.pause();
    this.events.emit('game-over', this.score, this.submissionId);
  }

  private advanceWave(): void {
    this.wave += 1;
    this.currentWaveConfig = this.getWaveConfig(this.wave);
    this.nextAlienFireAt = 0;
    this.upgradeWeapon();
    if (this.wave >= 5) this.unlockAchievement('wave_5');
    if (this.wave >= 10) this.unlockAchievement('wave_10');
    this.events.emit('wave-cleared', this.wave - 1);
    this.events.emit('wave-changed', this.wave);
    this.spawnAlienWave();
    this.maybeSpawnPowerUp();
  }

  private getWaveConfig(wave: number): WaveConfig {
    return WAVE_CONFIG[Math.min(wave - 1, WAVE_CONFIG.length - 1)];
  }

  private destroyAlien(alien: Phaser.Physics.Arcade.Sprite): void {
    if (!alien.active) return;
    const points = (alien.getData('points') as number | undefined) ?? 10;
    const x = alien.x;
    const y = alien.y;
    alien.destroy();
    this.spawnExplosion(x, y);
    this.recordKill();
    const multiplier = 1 + Math.floor(this.comboCount / 5);
    this.score += points * multiplier;
    this.events.emit('score-changed', this.score);
    this.checkScoreAchievements();
  }

  private damageAliensInBlast(x: number, y: number): void {
    this.aliens.getChildren().forEach((child) => {
      const alien = child as Phaser.Physics.Arcade.Sprite;
      if (alien.active && Phaser.Math.Distance.Between(x, y, alien.x, alien.y) <= EXPLOSIVE_RADIUS) {
        this.destroyAlien(alien);
      }
    });
    this.spawnExplosion(x, y);
  }

  private spawnExplosion(x: number, y: number): void {
    this.particleEmitter.explode(8, x, y);
  }

  private maybeSpawnPowerUp(): void {
    if (Math.random() < this.currentWaveConfig.powerUpChance && this.aliens.countActive(true) > 0) {
      const powerUpTypes: PowerUpType[] = ['TRIPLE_SHOT', 'SHIELD', 'EXPLOSIVE'];
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      
      const x = Math.random() * (WORLD_WIDTH - 32) + 16;
      const y = Math.random() * (WORLD_HEIGHT / 2) + 50; // Upper half of screen
      
      let texture: string;
      switch (type) {
        case 'TRIPLE_SHOT':
          texture = TEXTURES.POWERUP_TRIPLE_SHOT;
          break;
        case 'SHIELD':
          texture = TEXTURES.POWERUP_SHIELD;
          break;
        case 'EXPLOSIVE':
          texture = TEXTURES.POWERUP_EXPLOSIVE;
          break;
      }

      const powerUp = this.powerUps.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
      powerUp.setCollideWorldBounds(true);
      powerUp.setVelocityY(80);
      
      // Create a label for the power-up
      const label = this.add.text(x - 10, y - 20, type.replace('_', ' '), {
        fontSize: '12px',
        fontFamily: 'monospace'
      }).setOrigin(0.5);

      powerUp.setData('label', label);
      powerUp.setData('powerUpType', type);
      this.time.delayedCall(POWERUP_DURATION_MS, () => {
        if (powerUp.active) powerUp.destroy();
        label.destroy();
      });
    }
  }

  private updatePowerUpLabels(): void {
    this.powerUps.children.iterate((child) => {
      if (!child) return true;
      const powerUp = child as Phaser.Physics.Arcade.Sprite;
      const label = powerUp.getData('label') as Phaser.GameObjects.Text | undefined;
      label?.setPosition(powerUp.x, powerUp.y - 20);
      return true;
    });
  }

  private handlePowerUpPickup: ArcadePhysicsCallback = (powerUpObj) => {
    const powerUpSprite = powerUpObj as Phaser.Physics.Arcade.Sprite;
    
    // Brief speed boost effect when picking up power-up
    this.player.setVelocityX(PLAYER_SPEED * 1.5);
    this.time.delayedCall(500, () => {
      if (!this.isPaused && !this.isGameOver) {
        this.handlePlayerMovement(this.time.now); // Reset to normal movement
      }
    });

    // Apply power-up effects
    const type = powerUpSprite.getData('powerUpType') as PowerUpType;
    this.soundEffects.play('powerup');
    this.applyPowerUp(type);
    (powerUpSprite.getData('label') as Phaser.GameObjects.Text | undefined)?.destroy();
    powerUpSprite.destroy();
  };

  private applyPowerUp(type: PowerUpType): void {
    const expireTime = this.time.now + POWERUP_DURATION_MS;
    
    switch (type) {
      case 'TRIPLE_SHOT':
        // Enable triple shot - add power-up flag for bullet spawning
        break;
      case 'SHIELD':
        this.shieldVisual?.destroy();
        this.shieldVisual = this.add.circle(this.player.x, this.player.y, 30, 0x00ff00, 0.25)
          .setStrokeStyle(2, 0x66ff99, 0.9);
        break;
      case 'EXPLOSIVE':
        this.upgradeWeapon();
        break;
    }

    this.activePowerUps.set(type, expireTime);

    // Create visual indicator at top of screen
    const indicator = this.add.text(10, 20, `+${type.replace('_', ' ')}`, {
      fontSize: '14px',
      fontFamily: 'monospace'
    }).setOrigin(0);

    this.time.addEvent({
      delay: POWERUP_DURATION_MS,
      callback: () => {
        if (this.activePowerUps.get(type) === expireTime) {
          this.activePowerUps.delete(type);
          if (type === 'SHIELD') {
            this.shieldVisual?.destroy();
            this.shieldVisual = undefined;
          }
        }
        indicator.destroy();
      }
    });
  }

  private recordKill(): void {
    const now = this.time.now;
    this.comboCount = now <= this.comboExpiresAt ? this.comboCount + 1 : 1;
    this.comboExpiresAt = now + COMBO_TIME_MS;
    this.comboResetTimer?.remove();
    this.comboResetTimer = this.time.delayedCall(COMBO_TIME_MS, () => {
      if (this.time.now >= this.comboExpiresAt) {
        this.comboCount = 0;
        this.events.emit('combo-changed', 0, 1);
      }
    });

    const multiplier = 1 + Math.floor(this.comboCount / 5);
    this.events.emit('combo-changed', this.comboCount, multiplier);
    if (this.comboCount >= 5) this.unlockAchievement('combo_5');
    if (this.comboCount >= 10) this.unlockAchievement('combo_10');
  }

  private upgradeWeapon(): void {
    if (this.weaponLevel === 2) return;
    this.weaponLevel = this.weaponLevel === 0 ? 1 : 2;
    this.events.emit('weapon-changed', this.weaponLevel);
    this.unlockAchievement(this.weaponLevel === 1 ? 'weapon_triple' : 'weapon_spread');
  }

  private checkScoreAchievements(): void {
    if (this.score >= 100) this.unlockAchievement('score_100');
    if (this.score >= 500) this.unlockAchievement('score_500');
    if (this.score >= 1000) this.unlockAchievement('score_1000');
  }

  private loadUnlockedAchievements(): Set<string> {
    const saved = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!saved) return new Set();

    try {
      const ids: unknown = JSON.parse(saved);
      if (!Array.isArray(ids)) throw new Error('Achievement data must be an array.');
      const validIds = new Set<string>(ACHIEVEMENTS.map((achievement) => achievement.id));
      return new Set(ids.filter((id): id is string => typeof id === 'string' && validIds.has(id)));
    } catch (error) {
      console.error('Could not read saved achievements:', error);
      return new Set();
    }
  }

  private unlockAchievement(id: string): void {
    if (this.unlockedAchievements.has(id)) return;
    const achievement = ACHIEVEMENTS.find((item) => item.id === id);
    if (!achievement) return;

    this.unlockedAchievements.add(id);
    try {
      localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify([...this.unlockedAchievements]));
    } catch (error) {
      console.error('Could not save unlocked achievement:', error);
      this.game.events.emit('achievement-storage-error', error);
    }
    this.events.emit('achievement-unlocked', achievement.id, achievement.title, achievement.description);
    this.game.events.emit('achievement-unlocked', achievement.id, achievement.title);
    this.events.emit('achievements-changed', this.unlockedAchievements.size);
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.time.paused = this.isPaused;
    
    if (this.isPaused) {
      // Pause the game
      this.physics.pause();
      this.pauseOverlay.setVisible(true);
      // this.input.keyboard.disableGlobal(); // Not available in Phaser 3.x
    } else {
      // Resume the game
      this.physics.resume();
      this.pauseOverlay.setVisible(false);
      // this.input.keyboard.enableGlobal(); // Not available in Phaser 3.x
    }

    this.events.emit(this.isPaused ? 'paused' : 'resumed', this.score);
  }
}

type ArcadePhysicsCallback = Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;
