import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import {
  fetchLeaderboard,
  getSavedDisplayName,
  getSavedEmail,
  login,
  logout,
  register,
  submitScore,
  type LeaderboardEntry
} from './api';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 480,
  height: 640,
  backgroundColor: '#05060a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);
const accountForm = document.getElementById('account-form') as HTMLFormElement;
const accountStatus = document.getElementById('account-status')!;
const displayNameInput = document.getElementById('display-name') as HTMLInputElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const registerButton = document.getElementById('register') as HTMLButtonElement;
const logoutButton = document.getElementById('logout') as HTMLButtonElement;
const leaderboardStatus = document.getElementById('leaderboard-status')!;
const leaderboardBody = document.getElementById('leaderboard-body')!;

displayNameInput.value = getSavedDisplayName();
emailInput.value = getSavedEmail() ?? '';
if (getSavedEmail()) {
  accountStatus.textContent = `Signed in as ${getSavedEmail()}. Your game-over scores will be submitted.`;
  logoutButton.hidden = false;
}

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  accountStatus.textContent = 'Signing in…';
  try {
    const account = await login(emailInput.value.trim(), passwordInput.value);
    accountStatus.textContent = `Signed in as ${account.email}. Your game-over scores will be submitted.`;
    logoutButton.hidden = false;
    passwordInput.value = '';
  } catch (error) {
    accountStatus.textContent = error instanceof Error ? error.message : 'Could not sign in.';
  }
});

registerButton.addEventListener('click', async () => {
  accountStatus.textContent = 'Creating account…';
  try {
    const account = await register(emailInput.value.trim(), passwordInput.value, displayNameInput.value.trim());
    accountStatus.textContent = `Account created for ${account.email}. Your scores will be submitted.`;
    logoutButton.hidden = false;
    passwordInput.value = '';
  } catch (error) {
    accountStatus.textContent = error instanceof Error ? error.message : 'Could not create account.';
  }
});

logoutButton.addEventListener('click', () => {
  logout();
  accountStatus.textContent = 'You are signed out. Scores can still be viewed, but not submitted.';
  logoutButton.hidden = true;
});

async function refreshLeaderboard(): Promise<void> {
  leaderboardStatus.textContent = 'Loading scores…';
  try {
    const entries = await fetchLeaderboard();
    renderLeaderboard(entries);
    leaderboardStatus.textContent = entries.length ? '' : 'No scores yet. Be the first!';
  } catch (error) {
    leaderboardStatus.textContent = error instanceof Error ? error.message : 'Could not load scores.';
  }
}

function renderLeaderboard(entries: LeaderboardEntry[]): void {
  leaderboardBody.replaceChildren();
  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    for (const value of [String(index + 1), entry.displayName, entry.highScore.toLocaleString()]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }
    leaderboardBody.appendChild(row);
  });
}

game.events.on('game-over', async (score: number) => {
  const displayName = displayNameInput.value.trim() || 'Anonymous';
  accountStatus.textContent = 'Submitting score…';
  try {
    await submitScore(score, displayName);
    accountStatus.textContent = `Score ${score.toLocaleString()} submitted.`;
    await refreshLeaderboard();
  } catch (error) {
    accountStatus.textContent = error instanceof Error ? error.message : 'Could not submit score.';
  }
});

void refreshLeaderboard();
