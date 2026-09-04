/**
 * UIScene renders the HUD (score, lives) on top of the GameScene and listens
 * for events emitted by GameScene rather than reaching into it directly.
 */
import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene', active: true });
  }

  create(): void {
    this.scoreText = this.add.text(12, 8, 'Score: 0', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#2be8e8'
    });

    this.livesText = this.add.text(480 - 12, 8, 'Lives: 3', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffb84d'
    }).setOrigin(1, 0);

    this.messageText = this.add.text(240, 320, '', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setVisible(false);

    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('score-changed', (score: number) => {
      this.scoreText.setText(`Score: ${score}`);
    });
    gameScene.events.on('lives-changed', (lives: number) => {
      this.livesText.setText(`Lives: ${lives}`);
    });
    gameScene.events.on('game-over', (score: number) => {
      this.messageText
        .setText(`GAME OVER\nFinal Score: ${score}\nPress R to restart`)
        .setVisible(true);
    });
    gameScene.events.on('wave-cleared', (wave: number) => {
      this.messageText.setText(`Wave ${wave} cleared!`).setVisible(true);
      this.time.delayedCall(1200, () => this.messageText.setVisible(false));
    });
  }
}
