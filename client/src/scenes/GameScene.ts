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

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 640;

const ALIEN_ROWS = 3;
const ALIEN_COLS = 8;
const ALIEN_SPACING_X = 42;
const ALIEN_SPACING_Y = 36;
const ALIEN_FORMATION_TOP = 70;
const ALIEN_FORMATION_LEFT = 40;
const ALIEN_STEP_DOWN = 20;
const ALIEN_MOVE_INTERVAL_MS = 700;
const ALIEN_FIRE_CHANCE = 0.01;

// Power-up related constants
const POWERUP_SPAWN_CHANCE = 0.05; // 5% chance per wave
const POWERUP_DURATION_MS = 10000; // 10 seconds for power-ups

const PLAYER_SPEED = 260;
const PLAYER_BULLET_SPEED = 420;
const ALIEN_BULLET_SPEED = 220;
const PLAYER_FIRE_COOLDOWN_MS = 300;
const PLAYER_STARTING_LIVES = 3;
const PLAYER_INVULNERABILITY_MS = 1500;

// Power-up type declaration
type PowerUpType = 'TRIPLE_SHOT' | 'SHIELD' | 'EXPLOSIVE';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;

  private aliens!: Phaser.Physics.Arcade.Group;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private alienBullets!: Phaser.Physics.Arcade.Group;

  // Particle emitter for explosions
  private particleEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Power-up state
  private activePowerUps: Map<PowerUpType, number> = new Map(); // powerUp -> expireTime

  private alienDirection: 1 | -1 = 1;
  private alienMoveTimer = 0;
  private alienStepDistance = 6;

  private lastFiredAt = 0;
  private score = 0;
  private lives = PLAYER_STARTING_LIVES;
  private wave = 1;
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
    this.lives = PLAYER_STARTING_LIVES;
    this.wave = 1;
    this.isGameOver = false;
    this.playerInvulnerable = false;
    this.alienDirection = 1;
    this.alienMoveTimer = 0;
    this.alienStepDistance = 6;
    this.lastFiredAt = 0;
    this.isPaused = false;

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
    this.spawnAlienWave();
    this.maybeSpawnPowerUp();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    // Create pause overlay UI
    this.pauseOverlay = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 'PAUSED', {
      fontSize: '48px',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.physics.add.overlap(this.playerBullets, this.aliens, this.handlePlayerBulletHitsAlien, undefined, this);
    this.physics.add.overlap(this.alienBullets, this.player, this.handleAlienBulletHitsPlayer, undefined, this);
    this.physics.add.overlap(this.aliens, this.player, this.handleAlienReachesPlayer, undefined, this);

    // Create particle emitter for explosions
    this.particleEmitter = this.add.particles(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      TEXTURES.PARTICLE_1
    );

    this.events.emit('score-changed', this.score);
    this.events.emit('lives-changed', this.lives);

    // Pause key handler
    this.pauseKey.on('down', () => {
      if (!this.isGameOver) {
        this.togglePause();
      }
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
    this.updateAlienFire();
    this.cleanupOffscreenBullets();
    this.updatePowerups();

    if (this.aliens.countActive(true) === 0) {
      this.advanceWave();
    }
  }

  private spawnAlienWave(): void {
    const rowTextures = [TEXTURES.ALIEN_ROW_A, TEXTURES.ALIEN_ROW_B, TEXTURES.ALIEN_ROW_C];

    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        const x = ALIEN_FORMATION_LEFT + col * ALIEN_SPACING_X;
        const y = ALIEN_FORMATION_TOP + row * ALIEN_SPACING_Y;
        const texture = rowTextures[row % rowTextures.length];
        const alien = this.aliens.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
        alien.setData('points', (ALIEN_ROWS - row) * 10);
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
      this.lastFiredAt = time;
    }
  }

  private firePlayerBullet(): void {
    const bullet = this.playerBullets.create(
      this.player.x,
      this.player.y - this.player.height / 2,
      TEXTURES.PLAYER_BULLET
    ) as Phaser.Physics.Arcade.Sprite;
    bullet.setVelocityY(-PLAYER_BULLET_SPEED);

    // Triple shot effect if active
    const powerUps = Array.from(this.activePowerUps.keys());
    if (powerUps.includes('TRIPLE_SHOT')) {
      const offsets = [-12, 0, 12];
      offsets.forEach((offset, index) => {
        if (index === 0) return; // Skip center bullet, already created above
        
        const offsetX = offset === -12 ? -8 : 8;
        const bulletClone = this.playerBullets.create(
          this.player.x + offsetX,
          this.player.y - this.player.height / 2,
          TEXTURES.PLAYER_BULLET
        ) as Phaser.Physics.Arcade.Sprite;
        bulletClone.setVelocityY(-PLAYER_BULLET_SPEED);
      });
    }
  }

  private updateAlienFormation(time: number, _delta: number): void {
    if (time < this.alienMoveTimer) return;
    this.alienMoveTimer = time + Math.max(150, ALIEN_MOVE_INTERVAL_MS - this.wave * 40);

    let hitEdge = false;
    this.aliens.children.iterate((child) => {
      if (!child) return true;
      const alien = child as Phaser.Physics.Arcade.Sprite;
      if (!alien.active) return true;
      alien.x += this.alienStepDistance * this.alienDirection;
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

  private updateAlienFire(): void {
    const activeAliens = this.aliens.getChildren().filter((a) => (a as Phaser.Physics.Arcade.Sprite).active);
    if (activeAliens.length === 0) return;

    if (Math.random() < ALIEN_FIRE_CHANCE) {
      const shooter = Phaser.Utils.Array.GetRandom(activeAliens) as Phaser.Physics.Arcade.Sprite;
      const bullet = this.alienBullets.create(shooter.x, shooter.y + shooter.height / 2, TEXTURES.ALIEN_BULLET) as Phaser.Physics.Arcade.Sprite;
      bullet.setVelocityY(ALIEN_BULLET_SPEED);
    }

    let alienReachedPlayer = false;
    for (const alienObj of activeAliens) {
      const alien = alienObj as Phaser.Physics.Arcade.Sprite;
      if (alien.y >= this.player.y) {
        alien.destroy();
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
    const points = (alien.getData('points') as number) ?? 10;

    bullet.destroy();
    alien.destroy();

    // Spawn explosion particles at alien position
    this.spawnExplosion(alien.x, alien.y);

    this.score += points;
    this.events.emit('score-changed', this.score);
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
    this.player.setActive(true).setVisible(true).setAlpha(1);
    this.lives -= 1;
    this.events.emit('lives-changed', this.lives);
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
    this.events.emit('game-over', this.score);
  }

  private advanceWave(): void {
    this.wave += 1;
    this.alienStepDistance = Math.min(14, 6 + this.wave);
    this.events.emit('wave-cleared', this.wave - 1);
    this.spawnAlienWave();
    this.maybeSpawnPowerUp();
  }

  private spawnExplosion(x: number, y: number): void {
    // Emit particles from explosion position
    this.particleEmitter.setPosition(x, y).emitParticle(1);
  }

  private maybeSpawnPowerUp(): void {
    if (Math.random() < POWERUP_SPAWN_CHANCE && this.aliens.countActive(true) > 0) {
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

      const powerUp = this.add.sprite(x, y, texture) as Phaser.Physics.Arcade.Sprite;
      powerUp.setCollideWorldBounds(true);
      
      // Add collision handler for power-up pickup
      this.physics.add.overlap(this.player, powerUp, this.handlePowerUpPickup, undefined, this);
      
      // Auto-detect and destroy after duration
      const expireTime = Date.now() + POWERUP_DURATION_MS;
      this.activePowerUps.set(type, expireTime);

      // Create a label for the power-up
      const label = this.add.text(x - 10, y - 20, type.replace('_', ' '), {
        fontSize: '12px',
        fontFamily: 'monospace'
      }).setOrigin(0.5);

      powerUp.setData('label', label);
    }
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
    this.applyPowerUp(powerUpSprite.texture.key as PowerUpType);
    
    powerUpSprite.destroy();
  };

  private applyPowerUp(type: PowerUpType): void {
    const now = Date.now();
    const expireTime = now + POWERUP_DURATION_MS;
    
    switch (type) {
      case 'TRIPLE_SHOT':
        // Enable triple shot - add power-up flag for bullet spawning
        break;
      case 'SHIELD':
        // Create a shield visual effect around player
        const shield = this.add.circle(this.player.x, this.player.y, 18, 0x00ff00, 0.5);
        shield.setOrigin(0.5);
        break;
      case 'EXPLOSIVE':
        // Flag for explosive bullets (visual feedback would be added)
        break;
    }

    this.activePowerUps.set(type, expireTime);

    // Create visual indicator at top of screen
    const indicator = this.add.text(10, 20, `+${type.replace('_', ' ')}`, {
      fontSize: '14px',
      fontFamily: 'monospace'
    }).setOrigin(0);

    this.time.addEvent({
      delay: expireTime - now,
      callback: () => {
        this.activePowerUps.delete(type);
        indicator.destroy();
      }
    });
  }

  private updatePowerups(): void {
    const now = Date.now();
    for (const [type, expireTime] of this.activePowerUps.entries()) {
      if (now > expireTime) {
        this.activePowerUps.delete(type);
      }
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    
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
