const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';
const TOKEN_KEY = 'saa-token';
const EMAIL_KEY = 'saa-email';
const DISPLAY_NAME_KEY = 'saa-display-name';
const OFFLINE_MODE_KEY = 'saa-offline-mode';
const SCORE_CACHE_KEY = 'saa-score-cache';
const RETRY_QUEUE_KEY = 'saa-retry-queue';

export interface Account {
  id: string;
  email: string;
  isAdmin: boolean;
}

interface AuthResponse {
  token: string;
  user: Account;
}

type QueueItem = Omit<LeaderboardEntry, 'gamesPlayed' | 'updatedAt'>;

interface CachedScore {
  highScore: number;
  displayName: string;
  submitted?: boolean;
}

export function getSavedEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function getSavedDisplayName(): string {
  return localStorage.getItem(DISPLAY_NAME_KEY) ?? '';
}

// Check if server is available
export async function checkServerConnectivity(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/leaderboard?limit=1`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getServerStatus(): Promise<'online' | 'offline'> {
  const offline = localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
  if (offline) return 'offline';
  
  // Auto-detect on load if never been online
  try {
    await fetch(`${API_BASE}/leaderboard?limit=1`);
    return 'online';
  } catch {
    localStorage.setItem(OFFLINE_MODE_KEY, 'true');
    return 'offline';
  }
}

export function toggleOfflineMode(): void {
  const offline = localStorage.getItem(OFFLINE_MODE_KEY) === 'false';
  localStorage.setItem(OFFLINE_MODE_KEY, String(!offline));
}

export function getIsOffline(): boolean {
  return localStorage.getItem(OFFLINE_MODE_KEY) === 'true';
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

async function authenticate(path: 'login' | 'register', email: string, password: string, displayName?: string): Promise<Account> {
  const response = await fetch(`${API_BASE}/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, ...(displayName ? { displayName } : {}) })
  });
  const data = await response.json() as AuthResponse & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Authentication failed');

  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(EMAIL_KEY, data.user.email);
  if (displayName) localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim());
  return data.user;
}

export function login(email: string, password: string): Promise<Account> {
  return authenticate('login', email, password);
}

export function register(email: string, password: string, displayName: string): Promise<Account> {
  return authenticate('register', email, password, displayName);
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  highScore: number;
  gamesPlayed: number;
  updatedAt: string;
}

// Offline mode: store score in cache instead of submitting immediately
async function submitScoreToServer(highScore: number, displayName: string): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Log in or create an account to submit your score.');

  const response = await fetch(`${API_BASE}/stats/me`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ highScore, displayName })
  });
  if (!response.ok) {
    const data = await response.json() as { error?: string };
    throw new Error(data.error ?? 'Failed to submit score');
  }
  localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim());
}

export async function submitScore(highScore: number, displayName: string): Promise<void> {
  if (!getIsOffline()) {
    // Online mode - submit directly
    return submitScoreToServer(highScore, displayName);
  }

  // Offline mode - cache score for later sync
  const cache: CachedScore[] = JSON.parse(localStorage.getItem(SCORE_CACHE_KEY) || '[]');
  cache.push({ highScore, displayName, submitted: false });
  localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(cache));

  // Add to retry queue if not already there
  const queue = JSON.parse(localStorage.getItem(RETRY_QUEUE_KEY) || '[]');
  const existingIndex = queue.findIndex((q: QueueItem): boolean => {
    return !!q.displayName && q.displayName.toLowerCase() === displayName.toLowerCase();
  });
  if (existingIndex >= 0) {
    queue.splice(existingIndex, 1);
  }
  queue.push({ highScore, displayName });
  localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify(queue));
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load the leaderboard');
  return await res.json() as LeaderboardEntry[];
}

// Sync cached scores when back online
export async function syncCachedScores(): Promise<number> {
  const cache = JSON.parse(localStorage.getItem(SCORE_CACHE_KEY) || '[]');
  if (cache.length === 0) return 0;

  let syncedCount = 0;
  for (const item of cache) {
    if (!item.submitted && getIsOffline()) continue; // Still offline, skip
    
    try {
      await submitScoreToServer(item.highScore, item.displayName);
      if (cache.some((c: CachedScore): boolean => c.highScore === item.highScore && c.displayName === item.displayName)) {
        item.submitted = true;
      }
      syncedCount++;
    } catch (err) {
      console.error('Failed to sync score:', err);
    }
  }

  // Clear cache if all submitted or still offline with some failed
  localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(cache.filter((i: CachedScore) => !!i.submitted)));
  
  // Clear queue
  localStorage.setItem(RETRY_QUEUE_KEY, JSON.stringify([]));

  return syncedCount;
}