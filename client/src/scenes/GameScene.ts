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

const PLAYER_SPEED = 260;
const PLAYER_BULLET_SPEED = 420;
const ALIEN_BULLET_SPEED = 220;
const PLAYER_FIRE_COOLDOWN_MS = 300;
const PLAYER_STARTING_LIVES = 3;
const PLAYER_INVULNERABILITY_MS = 1500;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;

  private aliens!: Phaser.Physics.Arcade.Group;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private alienBullets!: Phaser.Physics.Arcade.Group;

  private alienDirection: 1 | -1 = 1;
  private alienMoveTimer = 0;
  private alienStepDistance = 6;

  private lastFiredAt = 0;
  private score = 0;
  private lives = PLAYER_STARTING_LIVES;
  private wave = 1;
  private isGameOver = false;
  private playerInvulnerable = false;

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

    this.cameras.main.setBackgroundColor('#05060a');

    this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT - 50, TEXTURES.PLAYER);
    this.player.setCollideWorldBounds(true);

    this.playerBullets = this.physics.add.group();
    this.alienBullets = this.physics.add.group();

    this.aliens = this.physics.add.group();
    this.spawnAlienWave();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.restartKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.physics.add.overlap(this.playerBullets, this.aliens, this.handlePlayerBulletHitsAlien, undefined, this);
    this.physics.add.overlap(this.alienBullets, this.player, this.handleAlienBulletHitsPlayer, undefined, this);
    this.physics.add.overlap(this.aliens, this.player, this.handleAlienReachesPlayer, undefined, this);

    this.events.emit('score-changed', this.score);
    this.events.emit('lives-changed', this.lives);
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
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

  private updateAlienFire(time: number): void {
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
  }
}

type ArcadePhysicsCallback = Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;
