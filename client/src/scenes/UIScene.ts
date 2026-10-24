/**
 * UIScene renders the HUD (score, lives) on top of the GameScene and listens
 * for events emitted by GameScene rather than reaching into it directly.
 */
import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private waveMessageTimer?: Phaser.Time.TimerEvent;

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
    const onScoreChanged = (score: number): void => {
      this.scoreText.setText(`Score: ${score}`);
      this.waveMessageTimer?.remove();
      this.waveMessageTimer = undefined;
      this.messageText.setText('').setVisible(false);
    };
    const onLivesChanged = (lives: number): void => {
      this.livesText.setText(`Lives: ${lives}`);
    };
    const onGameOver = (score: number): void => {
      this.waveMessageTimer?.remove();
      this.waveMessageTimer = undefined;
      this.messageText
        .setText(`GAME OVER\nFinal Score: ${score}\nPress R to restart`)
        .setVisible(true);
      this.game.events.emit('game-over', score);
    };
    const onWaveCleared = (wave: number): void => {
      this.waveMessageTimer?.remove();
      this.messageText.setText(`Wave ${wave} cleared!`).setVisible(true);
      this.waveMessageTimer = this.time.delayedCall(1200, () => {
        this.waveMessageTimer = undefined;
        this.messageText.setVisible(false);
      });
    };
    const onPaused = (): void => {
      this.messageText.setText('PAUSED').setVisible(true);
    };
    const onResumed = (score: number): void => {
      if (this.messageText.visible) {
        this.scoreText.setText(`Score: ${score}`);
        this.waveMessageTimer?.remove();
        this.waveMessageTimer = undefined;
        this.messageText.setText('').setVisible(false);
      }
    };

    gameScene.events.on('score-changed', onScoreChanged);
    gameScene.events.on('lives-changed', onLivesChanged);
    gameScene.events.on('game-over', onGameOver);
    gameScene.events.on('wave-cleared', onWaveCleared);
    gameScene.events.on('paused', onPaused);
    gameScene.events.on('resumed', onResumed);
  }
}
