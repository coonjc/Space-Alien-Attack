/**
 * BootScene
 *
 * Generates all placeholder game art procedurally at runtime using Phaser's
 * Graphics API, rather than loading external image assets. This keeps the
 * project dependency-free for art while making it very clear (via code
 * comments below) what the *intended* final visual direction is:
 *
 *  - Player ship "The Skimmer": a sleek angular chevron/arrowhead silhouette
 *    (not the boxy pixel-cannon look of classic Space Invaders), rendered in
 *    cyan/teal with a glowing thruster.
 *  - Aliens "Driftlings": rounded organic blob-with-tendrils silhouettes
 *    (distinct from the blocky pixel-crab/octopus/squid look of classic
 *    invaders), rendered in magenta/violet/amber per-row to signal tier.
 *
 * All shapes here are simple vector/geometric placeholders standing in for
 * future hand-drawn or sprite-sheet art.
 */
import Phaser from 'phaser';

export const TEXTURES = {
  PLAYER: 'tex-player',
  ALIEN_ROW_A: 'tex-alien-row-a',
  ALIEN_ROW_B: 'tex-alien-row-b',
  ALIEN_ROW_C: 'tex-alien-row-c',
  PLAYER_BULLET: 'tex-player-bullet',
  ALIEN_BULLET: 'tex-alien-bullet',
  PARTICLE_1: 'tex-particle-1',
  PARTICLE_2: 'tex-particle-2',
  POWERUP_TRIPLE_SHOT: 'tex-powerup-triple-shot',
  POWERUP_SHIELD: 'tex-powerup-shield',
  POWERUP_EXPLOSIVE: 'tex-powerup-explosive'
} as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // No external assets to load yet — everything is generated in create().
  }

  create(): void {
    this.generatePlayerTexture();
    this.generateAlienTexture(TEXTURES.ALIEN_ROW_A, 0xff4dd8, 'winged'); // magenta - front row
    this.generateAlienTexture(TEXTURES.ALIEN_ROW_B, 0x9d4dff, 'crystalline'); // violet - mid row
    this.generateAlienTexture(TEXTURES.ALIEN_ROW_C, 0xffb84d, 'tendrilled'); // amber - back row
    this.generateBulletTextures();

    this.scene.start('GameScene');
  }

  /** "The Skimmer" — an angular chevron silhouette, original to this game. */
  private generatePlayerTexture(): void {
    const g = this.add.graphics();
    const w = 48;
    const h = 40;

    g.fillStyle(0x2be8e8, 1);
    // Angular chevron/arrowhead body.
    g.fillTriangle(w / 2, 0, 0, h, w, h);
    g.fillStyle(0x0f6f6f, 1);
    g.fillTriangle(w / 2, h * 0.35, w * 0.3, h, w * 0.7, h);

    // Glowing thruster stub at the rear.
    g.fillStyle(0xffe066, 1);
    g.fillRect(w / 2 - 4, h - 4, 8, 6);

    g.generateTexture(TEXTURES.PLAYER, w, h + 2);
    g.destroy();
  }

  /** "Driftlings" — rounded blob-with-tendrils silhouette, original to this game. */
  private generateAlienTexture(key: string, color: number, shape: 'winged' | 'crystalline' | 'tendrilled'): void {
    const g = this.add.graphics();
    const w = 36;
    const h = 28;

    g.fillStyle(color, 1);
    if (shape === 'winged') {
      g.fillTriangle(0, h * 0.35, w * 0.35, h * 0.2, w * 0.32, h * 0.75);
      g.fillTriangle(w, h * 0.35, w * 0.65, h * 0.2, w * 0.68, h * 0.75);
      g.fillEllipse(w / 2, h * 0.42, w * 0.52, h * 0.68);
      g.fillTriangle(w * 0.38, h * 0.68, w * 0.45, h, w * 0.5, h * 0.68);
      g.fillTriangle(w * 0.62, h * 0.68, w * 0.55, h, w * 0.5, h * 0.68);
    } else if (shape === 'crystalline') {
      g.fillPoints([
        new Phaser.Geom.Point(w * 0.5, 0),
        new Phaser.Geom.Point(w * 0.88, h * 0.22),
        new Phaser.Geom.Point(w, h * 0.55),
        new Phaser.Geom.Point(w * 0.72, h * 0.9),
        new Phaser.Geom.Point(w * 0.5, h * 0.72),
        new Phaser.Geom.Point(w * 0.28, h * 0.9),
        new Phaser.Geom.Point(0, h * 0.55),
        new Phaser.Geom.Point(w * 0.12, h * 0.22)
      ], true);
      g.fillTriangle(w * 0.32, h * 0.18, w * 0.5, h * 0.3, w * 0.28, h * 0.42);
      g.fillTriangle(w * 0.68, h * 0.18, w * 0.5, h * 0.3, w * 0.72, h * 0.42);
    } else {
      g.fillEllipse(w / 2, h * 0.38, w * 0.76, h * 0.62);
      g.fillRect(w * 0.2, h * 0.55, 3, h * 0.42);
      g.fillRect(w * 0.46, h * 0.62, 3, h * 0.38);
      g.fillRect(w * 0.72, h * 0.55, 3, h * 0.42);
    }

    // Simple eye markings.
    g.fillStyle(0x05060a, 1);
    g.fillCircle(w * 0.38, h * 0.38, 2.5);
    g.fillCircle(w * 0.62, h * 0.38, 2.5);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  private generateBulletTextures(): void {
    const player = this.add.graphics();
    player.fillStyle(0x2be8e8, 1);
    player.fillRoundedRect(0, 0, 4, 12, 2);
    player.generateTexture(TEXTURES.PLAYER_BULLET, 4, 12);
    player.destroy();

    const alien = this.add.graphics();
    alien.fillStyle(0xff4dd8, 1);
    alien.fillCircle(3, 3, 3);
    alien.generateTexture(TEXTURES.ALIEN_BULLET, 6, 6);
    alien.destroy();

    // Particle textures for explosion effects
    const particle1 = this.add.graphics();
    particle1.fillStyle(0xffff00, 1); // yellow sparks
    particle1.fillCircle(2, 2, 2);
    particle1.generateTexture(TEXTURES.PARTICLE_1, 4, 4);
    particle1.destroy();

    const particle2 = this.add.graphics();
    particle2.fillStyle(0xffaa00, 1); // orange glow
    particle2.fillCircle(3, 3, 3);
    particle2.generateTexture(TEXTURES.PARTICLE_2, 6, 6);
    particle2.destroy();

    // Power-up textures
    const tripleShot = this.add.graphics();
    tripleShot.fillStyle(0x00ffff, 1); // cyan for triple shot
    tripleShot.fillTriangle(0, 0, 8, 8, 0, 8);
    tripleShot.generateTexture(TEXTURES.POWERUP_TRIPLE_SHOT, 8, 8);
    tripleShot.destroy();

    const shield = this.add.graphics();
    shield.fillStyle(0x00ff00, 1); // green for shield
    shield.fillEllipse(4, 4, 8, 6);
    shield.generateTexture(TEXTURES.POWERUP_SHIELD, 8, 6);
    shield.destroy();

    const explosive = this.add.graphics();
    explosive.fillStyle(0xff0000, 1); // red for explosive
    explosive.fillEllipse(4, 4, 5, 5);
    explosive.generateTexture(TEXTURES.POWERUP_EXPLOSIVE, 8, 6);
    explosive.destroy();
  }
}
