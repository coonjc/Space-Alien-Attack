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
  ALIEN_BULLET: 'tex-alien-bullet'
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
    this.generateAlienTexture(TEXTURES.ALIEN_ROW_A, 0xff4dd8); // magenta - front row
    this.generateAlienTexture(TEXTURES.ALIEN_ROW_B, 0x9d4dff); // violet - mid row
    this.generateAlienTexture(TEXTURES.ALIEN_ROW_C, 0xffb84d); // amber - back row
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
  private generateAlienTexture(key: string, color: number): void {
    const g = this.add.graphics();
    const w = 36;
    const h = 28;

    g.fillStyle(color, 1);
    // Rounded blob body.
    g.fillEllipse(w / 2, h * 0.45, w * 0.8, h * 0.65);

    // Two small tendrils hanging below.
    g.fillRect(w * 0.25, h * 0.55, 4, h * 0.4);
    g.fillRect(w * 0.71, h * 0.55, 4, h * 0.4);

    // Simple eye markings.
    g.fillStyle(0x05060a, 1);
    g.fillCircle(w * 0.35, h * 0.4, 3);
    g.fillCircle(w * 0.65, h * 0.4, 3);

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
  }
}
