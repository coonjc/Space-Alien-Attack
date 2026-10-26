/**
 * UIScene renders the HUD (score, lives) on top of the GameScene and listens
 * for events emitted by GameScene rather than reaching into it directly.
 */
import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private achievementCountText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private soundText!: Phaser.GameObjects.Text;
  private achievementToast!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private waveMessageTimer?: Phaser.Time.TimerEvent;
  private achievementToastTimer?: Phaser.Time.TimerEvent;

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

    this.comboText = this.add.text(240, 8, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffe066'
    }).setOrigin(0.5, 0);

    this.weaponText = this.add.text(12, 30, 'Weapon: Single', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#2be8e8'
    });

    this.achievementCountText = this.add.text(468, 30, 'Achievements: 0', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#d9a6ff'
    }).setOrigin(1, 0);

    this.waveText = this.add.text(240, 30, 'Wave 1', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5, 0);

    this.soundText = this.add.text(
      240,
      48,
      `Sound: ${localStorage.getItem('saa-sound-muted') === 'true' ? 'Off' : 'On'} (M)`,
      {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#9fb4c7'
      }
    ).setOrigin(0.5, 0);

    this.achievementToast = this.add.text(240, 58, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffe066',
      align: 'center',
      backgroundColor: '#111827',
      padding: { x: 8, y: 5 }
    }).setOrigin(0.5, 0).setVisible(false);

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
    const onComboChanged = (combo: number, multiplier: number): void => {
      this.comboText.setText(combo > 0 ? `COMBO ${combo}  x${multiplier}` : '');
    };
    const onWeaponChanged = (level: number): void => {
      const weaponNames = ['Single', 'Triple', 'Spread'];
      this.weaponText.setText(`Weapon: ${weaponNames[level] ?? 'Single'}`);
    };
    const onAchievementsChanged = (count: number): void => {
      this.achievementCountText.setText(`Achievements: ${count}`);
    };
    const onWaveChanged = (wave: number): void => {
      this.waveText.setText(`Wave ${wave}`);
    };
    const onSoundMutedChanged = (muted: boolean): void => {
      this.soundText.setText(`Sound: ${muted ? 'Off' : 'On'} (M)`);
    };
    const onAchievementUnlocked = (_id: string, title: string, description: string): void => {
      this.achievementToastTimer?.remove();
      this.achievementToast
        .setText(`ACHIEVEMENT UNLOCKED\n${title}: ${description}`)
        .setVisible(true);
      this.achievementToastTimer = this.time.delayedCall(3000, () => {
        this.achievementToastTimer = undefined;
        this.achievementToast.setVisible(false);
      });
    };
    const onGameOver = (score: number, submissionId: string): void => {
      this.waveMessageTimer?.remove();
      this.waveMessageTimer = undefined;
      this.messageText
        .setText(`GAME OVER\nFinal Score: ${score}\nPress R to restart`)
        .setVisible(true);
      this.game.events.emit('game-over', score, submissionId);
    };
    const onWaveCleared = (wave: number): void => {
      this.waveMessageTimer?.remove();
      this.messageText.setText(`Wave ${wave} cleared!`).setVisible(true);
      this.waveMessageTimer = this.time.delayedCall(1000, () => { // 1 second delay between waves
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
    const onGameRestarted = (): void => {
      // Clear the game over message when game restarts
      this.messageText.setText('').setVisible(false);
    };

    gameScene.events.on('score-changed', onScoreChanged);
    gameScene.events.on('lives-changed', onLivesChanged);
    gameScene.events.on('combo-changed', onComboChanged);
    gameScene.events.on('weapon-changed', onWeaponChanged);
    gameScene.events.on('achievements-changed', onAchievementsChanged);
    gameScene.events.on('wave-changed', onWaveChanged);
    gameScene.events.on('achievement-unlocked', onAchievementUnlocked);
    this.game.events.on('sound-muted-changed', onSoundMutedChanged);
    gameScene.events.on('game-over', onGameOver);
    gameScene.events.on('wave-cleared', onWaveCleared);
    gameScene.events.on('paused', onPaused);
    gameScene.events.on('resumed', onResumed);
    gameScene.events.on('game-restarted', onGameRestarted);
    gameScene.events.once('shutdown', () => {
      gameScene.events.off('score-changed', onScoreChanged);
      gameScene.events.off('lives-changed', onLivesChanged);
      gameScene.events.off('combo-changed', onComboChanged);
      gameScene.events.off('weapon-changed', onWeaponChanged);
      gameScene.events.off('achievements-changed', onAchievementsChanged);
      gameScene.events.off('wave-changed', onWaveChanged);
      gameScene.events.off('achievement-unlocked', onAchievementUnlocked);
      gameScene.events.off('game-over', onGameOver);
      gameScene.events.off('wave-cleared', onWaveCleared);
      gameScene.events.off('paused', onPaused);
      gameScene.events.off('resumed', onResumed);
      gameScene.events.off('game-restarted', onGameRestarted);
      this.waveMessageTimer?.remove();
      this.achievementToastTimer?.remove();
    });
  }
}
