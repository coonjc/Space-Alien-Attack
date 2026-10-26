import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import {
  fetchLeaderboard,
  getLocalLeaderboard,
  getPendingScoreCount,
  getSavedDisplayName,
  getSavedEmail,
  login,
  logout,
  register,
  saveLocalScore,
  getServerStatus,
  syncCachedScores,
  syncAchievements,
  submitScore,
  type LeaderboardEntry,
  type LocalLeaderboardEntry,
  getIsOffline
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

// Fix for IME/input composition issues on Windows that block certain characters (like 'm') in email fields
// This handles beforeinput, input, and composition events to ensure all characters are accepted
emailInput.addEventListener('beforeinput', () => {});
emailInput.addEventListener('input', () => {});
emailInput.addEventListener('compositionstart', () => {});
emailInput.addEventListener('compositionend', () => {});
const leaderboardStatus = document.getElementById('leaderboard-status')!;
const leaderboardBody = document.getElementById('leaderboard-body')!;
const localLeaderboardStatus = document.getElementById('local-leaderboard-status')!;
const localLeaderboardBody = document.getElementById('local-leaderboard-body')!;
const retryScoresButton = document.getElementById('retry-scores') as HTMLButtonElement;
const previousPageButton = document.getElementById('leaderboard-previous') as HTMLButtonElement;
const nextPageButton = document.getElementById('leaderboard-next') as HTMLButtonElement;
const leaderboardPageLabel = document.getElementById('leaderboard-page')!;
const LEADERBOARD_PAGE_SIZE = 10;
let leaderboardOffset = 0;

async function syncSavedAchievements(): Promise<void> {
  try {
    await syncAchievements();
  } catch (error) {
    accountStatus.textContent = error instanceof Error
      ? `Signed in, but achievements could not sync: ${error.message}`
      : 'Signed in, but achievements could not sync.';
  }
}

// Show offline mode status if applicable
if (getIsOffline()) {
  accountStatus.textContent = 'Offline Mode: Scores saved locally. Press F5 to sync when online.';
}

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
    void syncSavedAchievements();
    void retryPendingScores();
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
    void syncSavedAchievements();
    void retryPendingScores();
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
    const page = await fetchLeaderboard({ limit: LEADERBOARD_PAGE_SIZE, offset: leaderboardOffset });
    renderLeaderboard(page.entries, page.offset);
    const firstRank = page.total === 0 ? 0 : page.offset + 1;
    const lastRank = Math.min(page.offset + page.entries.length, page.total);
    leaderboardPageLabel.textContent = page.total ? `${firstRank}–${lastRank} of ${page.total}` : '';
    previousPageButton.disabled = page.offset === 0;
    nextPageButton.disabled = page.offset + page.entries.length >= page.total;
    leaderboardStatus.textContent = page.total ? '' : 'No scores yet. Be the first!';
  } catch (error) {
    leaderboardStatus.textContent = error instanceof Error ? error.message : 'Could not load scores.';
  }
}

previousPageButton.addEventListener('click', () => {
  leaderboardOffset = Math.max(0, leaderboardOffset - LEADERBOARD_PAGE_SIZE);
  void refreshLeaderboard();
});

nextPageButton.addEventListener('click', () => {
  leaderboardOffset += LEADERBOARD_PAGE_SIZE;
  void refreshLeaderboard();
});

async function retryPendingScores(): Promise<void> {
  try {
    const pendingBeforeSync = getPendingScoreCount();
    const synced = await syncCachedScores();
    refreshRetryButton();
    if (synced > 0) {
      accountStatus.textContent = `${synced} saved score${synced === 1 ? '' : 's'} uploaded.`;
      leaderboardOffset = 0;
      await refreshLeaderboard();
    } else if (pendingBeforeSync > 0) {
      accountStatus.textContent = getIsOffline()
        ? 'Pending scores are saved locally and will retry when the server returns.'
        : 'Sign in to upload the pending scores.';
    }
  } catch (error) {
    accountStatus.textContent = error instanceof Error
      ? `Score upload failed; saved for retry: ${error.message}`
      : 'Score upload failed; saved for retry.';
    refreshRetryButton();
  }
}

function refreshRetryButton(): void {
  try {
    const pending = getPendingScoreCount();
    retryScoresButton.hidden = pending === 0;
    retryScoresButton.textContent = `Retry ${pending} pending score upload${pending === 1 ? '' : 's'}`;
  } catch (error) {
    retryScoresButton.hidden = true;
    accountStatus.textContent = error instanceof Error ? error.message : 'Could not read pending scores.';
  }
}

retryScoresButton.addEventListener('click', () => void retryPendingScores());

async function checkConnectionAndSync(): Promise<void> {
  try {
    const status = await getServerStatus();
    if (status === 'online') {
      await retryPendingScores();
      await syncSavedAchievements();
    } else {
      accountStatus.textContent = 'Offline mode: scores are saved locally and will retry when the server returns.';
    }
  } catch (error) {
    accountStatus.textContent = error instanceof Error
      ? `Could not check server status: ${error.message}`
      : 'Could not check server status.';
  }
}

window.addEventListener('online', () => void checkConnectionAndSync());
window.setInterval(() => void checkConnectionAndSync(), 30000);

function renderLeaderboard(entries: LeaderboardEntry[], offset: number): void {
  renderLeaderboardRows(leaderboardBody, entries, offset);
}

function renderLocalLeaderboard(entries: LocalLeaderboardEntry[]): void {
  renderLeaderboardRows(localLeaderboardBody, entries, 0);
}

function renderLeaderboardRows(
  body: HTMLElement,
  entries: Array<Pick<LeaderboardEntry, 'displayName' | 'highScore'>>,
  offset: number
): void {
  body.replaceChildren();
  entries.forEach((entry, index) => {
    const row = document.createElement('tr');
    for (const value of [String(offset + index + 1), entry.displayName, entry.highScore.toLocaleString()]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }
    body.appendChild(row);
  });
}

function refreshLocalLeaderboard(): void {
  try {
    const entries = getLocalLeaderboard();
    renderLocalLeaderboard(entries);
    localLeaderboardStatus.textContent = entries.length ? '' : 'No local scores yet. Play a game to set one!';
  } catch (error) {
    localLeaderboardStatus.textContent = error instanceof Error
      ? error.message
      : 'Could not load local scores.';
  }
}

game.events.on('paused', () => {
  accountStatus.textContent = 'Game paused. Your score will be saved when resumed.';
});

game.events.on('resumed', (score: number) => {
  accountStatus.textContent = `Score ${score.toLocaleString()} - Game resumed.`;
});

game.events.on('achievement-unlocked', (id: string) => {
  void syncAchievements().catch((error: unknown) => {
    accountStatus.textContent = error instanceof Error
      ? `Achievement ${id} saved locally; sync failed: ${error.message}`
      : `Achievement ${id} saved locally; sync failed.`;
  });
});

game.events.on('achievement-storage-error', () => {
  accountStatus.textContent = 'Achievement unlocked, but browser storage could not save it.';
});

game.events.on('game-over', async (score: number, submissionId: string) => {
  const displayName = displayNameInput.value.trim() || 'Anonymous';
  try {
    saveLocalScore(score, displayName);
    refreshLocalLeaderboard();
  } catch (error) {
    localLeaderboardStatus.textContent = error instanceof Error
      ? error.message
      : 'Could not save the local score.';
  }

  try {
    const result = await submitScore(score, displayName, submissionId);
    if (result === 'submitted') {
      accountStatus.textContent = `Score ${score.toLocaleString()} submitted.`;
      await refreshLeaderboard();
    } else if (result === 'queued') {
      accountStatus.textContent = `Score ${score.toLocaleString()} saved for upload when online.`;
    } else {
      accountStatus.textContent = `Score ${score.toLocaleString()} saved locally. Sign in to upload it.`;
    }
  } catch (error) {
    accountStatus.textContent = error instanceof Error ? error.message : 'Could not submit score.';
  }
  refreshRetryButton();
});

void refreshLeaderboard();
refreshLocalLeaderboard();
refreshRetryButton();
void checkConnectionAndSync();
