const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';
const TOKEN_KEY = 'saa-token';
const EMAIL_KEY = 'saa-email';
const DISPLAY_NAME_KEY = 'saa-display-name';
const OFFLINE_MODE_KEY = 'saa-offline-mode';
const SCORE_CACHE_KEY = 'saa-score-cache';
const LOCAL_LEADERBOARD_KEY = 'saa-local-leaderboard';
const ACHIEVEMENTS_KEY = 'saa-achievements';
const CONNECTIVITY_TIMEOUT_MS = 5000;

export interface Account {
  id: string;
  email: string;
  isAdmin: boolean;
}

interface AuthResponse {
  token: string;
  user: Account;
}

interface CachedScore {
  id: string;
  submissionId: string;
  highScore: number;
  displayName: string;
  createdAt: string;
}

class ApiConnectionError extends Error {}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getSavedEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function getSavedDisplayName(): string {
  return localStorage.getItem(DISPLAY_NAME_KEY) ?? '';
}

// Check if server is available
export async function checkServerConnectivity(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/leaderboard?limit=1`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getServerStatus(): Promise<'online' | 'offline'> {
  const status = await checkServerConnectivity() ? 'online' : 'offline';
  localStorage.setItem(OFFLINE_MODE_KEY, String(status === 'offline'));
  return status;
}

export function toggleOfflineMode(): void {
  const offline = !getIsOffline();
  localStorage.setItem(OFFLINE_MODE_KEY, String(offline));
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

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeaderboardOptions {
  limit?: number;
  offset?: number;
}

export interface LocalLeaderboardEntry {
  displayName: string;
  highScore: number;
  playedAt: string;
}

function isLocalLeaderboardEntry(entry: unknown): entry is LocalLeaderboardEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const candidate = entry as Record<string, unknown>;
  return typeof candidate.displayName === 'string' &&
    Number.isInteger(candidate.highScore) &&
    typeof candidate.playedAt === 'string';
}

function hasAchievementId(entry: unknown): entry is { achievementId: string } {
  if (typeof entry !== 'object' || entry === null) return false;
  const candidate = entry as Record<string, unknown>;
  return typeof candidate.achievementId === 'string';
}

export function getLocalLeaderboard(): LocalLeaderboardEntry[] {
  const stored = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
  if (!stored) return [];

  const entries: unknown = JSON.parse(stored);
  if (!Array.isArray(entries) || !entries.every(isLocalLeaderboardEntry)) {
    throw new Error('Saved local leaderboard data is invalid. Clear the site data to reset it.');
  }
  return entries;
}

export function saveLocalScore(highScore: number, displayName: string): LocalLeaderboardEntry[] {
  if (!Number.isInteger(highScore) || highScore < 0) {
    throw new Error('A local score must be a non-negative integer.');
  }

  const entries = getLocalLeaderboard();
  entries.push({
    displayName: displayName.trim() || 'Anonymous',
    highScore,
    playedAt: new Date().toISOString()
  });
  entries.sort((left, right) => right.highScore - left.highScore);
  const topScores = entries.slice(0, 10);
  localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(topScores));
  return topScores;
}

export function getLocalAchievementIds(): string[] {
  const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
  if (!stored) return [];

  const ids: unknown = JSON.parse(stored);
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
    throw new Error('Saved achievement data is invalid. Clear the site data to reset it.');
  }
  return [...new Set(ids)];
}

export async function syncAchievements(): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || getIsOffline()) return;

  const headers = { Authorization: `Bearer ${token}` };
  const savedResponse = await fetch(`${API_BASE}/achievements/me`, { headers });
  if (!savedResponse.ok) {
    const data = await savedResponse.json() as { error?: string };
    throw new Error(data.error ?? 'Failed to load saved achievements.');
  }

  const savedData: unknown = await savedResponse.json();
  if (!Array.isArray(savedData) || !savedData.every(hasAchievementId)) {
    throw new Error('The server returned invalid achievement data.');
  }

  const serverIds = savedData.filter(hasAchievementId).map((entry) => entry.achievementId);
  const ids = [...new Set([...getLocalAchievementIds(), ...serverIds])];
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(ids));
  if (ids.length === 0) return;

  const syncResponse = await fetch(`${API_BASE}/achievements/me`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  if (!syncResponse.ok) {
    const data = await syncResponse.json() as { error?: string };
    throw new Error(data.error ?? 'Failed to sync achievements.');
  }
}

async function submitScoreToServer(highScore: number, displayName: string, submissionId: string): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error('Log in or create an account to submit your score.');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/stats/me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ highScore, displayName, submissionId })
    });
  } catch (error) {
    throw new ApiConnectionError(error instanceof Error ? error.message : 'Could not reach the score API.');
  }
  if (!response.ok) {
    const data = await response.json() as { error?: string };
    if (response.status >= 500) {
      throw new ApiConnectionError(data.error ?? 'The score API is temporarily unavailable.');
    }
    throw new Error(data.error ?? 'Failed to submit score');
  }
  localStorage.setItem(DISPLAY_NAME_KEY, displayName.trim());
}

function readCachedScores(): CachedScore[] {
  const stored = localStorage.getItem(SCORE_CACHE_KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) {
    throw new Error('Saved score retry data is invalid. Clear the site data to reset it.');
  }
  const migrated = parsed.flatMap((item, index) => {
    if (isCachedScore(item)) return item;
    if (isLegacyCachedScore(item)) {
      if (item.submitted) return [];
      const id = `${createId()}-${index}`;
      return {
        id,
        submissionId: id,
        highScore: item.highScore,
        displayName: item.displayName,
        createdAt: new Date().toISOString()
      };
    }
    throw new Error('Saved score retry data is invalid. Clear the site data to reset it.');
  });
  if (migrated.length !== parsed.length || migrated.some((item, index) => item !== parsed[index])) {
    localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(migrated));
  }
  return migrated;
}

function isCachedScore(item: unknown): item is CachedScore {
  if (typeof item !== 'object' || item === null) return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.id === 'string' &&
    typeof candidate.submissionId === 'string' &&
    Number.isInteger(candidate.highScore) &&
    typeof candidate.displayName === 'string' &&
    typeof candidate.createdAt === 'string';
}

function isLegacyCachedScore(item: unknown): item is { highScore: number; displayName: string; submitted?: boolean } {
  if (typeof item !== 'object' || item === null) return false;
  const candidate = item as Record<string, unknown>;
  return Number.isInteger(candidate.highScore) &&
    typeof candidate.displayName === 'string' &&
    (candidate.submitted === undefined || typeof candidate.submitted === 'boolean');
}

function cacheScore(highScore: number, displayName: string, submissionId: string): void {
  const cache = readCachedScores();
  cache.push({
    id: `${submissionId}-${createId()}`,
    submissionId,
    highScore,
    displayName,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(cache));
}

export type ScoreSubmissionResult = 'submitted' | 'queued' | 'local-only';

export async function submitScore(
  highScore: number,
  displayName: string,
  submissionId: string
): Promise<ScoreSubmissionResult> {
  if (!Number.isInteger(highScore) || highScore < 0) {
    throw new Error('A score must be a non-negative integer.');
  }

  if (!localStorage.getItem(TOKEN_KEY)) {
    cacheScore(highScore, displayName, submissionId);
    return 'local-only';
  }
  if (getIsOffline() || !(await checkServerConnectivity())) {
    localStorage.setItem(OFFLINE_MODE_KEY, 'true');
    cacheScore(highScore, displayName, submissionId);
    return 'queued';
  }

  try {
    await submitScoreToServer(highScore, displayName, submissionId);
    return 'submitted';
  } catch (error) {
    if (!(error instanceof ApiConnectionError)) throw error;
    localStorage.setItem(OFFLINE_MODE_KEY, 'true');
    cacheScore(highScore, displayName, submissionId);
    return 'queued';
  }
}

export async function fetchLeaderboard({ limit = 10, offset = 0 }: LeaderboardOptions = {}): Promise<LeaderboardPage> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('Leaderboard limit must be between 1 and 100.');
  }
  if (!Number.isInteger(offset) || offset < 0 || offset > 1_000_000) {
    throw new Error('Leaderboard offset must be between 0 and 1,000,000.');
  }
  const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    const data = await res.json() as { error?: string };
    throw new Error(data.error ?? 'Failed to load the leaderboard');
  }
  const page: unknown = await res.json();
  if (
    typeof page !== 'object' ||
    page === null ||
    !('entries' in page) || !Array.isArray(page.entries) ||
    !('total' in page) || typeof page.total !== 'number' ||
    !('limit' in page) || typeof page.limit !== 'number' ||
    !('offset' in page) || typeof page.offset !== 'number'
  ) {
    throw new Error('The server returned an invalid leaderboard page.');
  }
  return page as LeaderboardPage;
}

export async function syncCachedScores(): Promise<number> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return 0;
  if (!(await checkServerConnectivity())) {
    localStorage.setItem(OFFLINE_MODE_KEY, 'true');
    return 0;
  }

  const cache = readCachedScores();
  let syncedCount = 0;
  for (const item of cache) {
    await submitScoreToServer(item.highScore, item.displayName, item.submissionId);
    const remaining = readCachedScores().filter((cached) => cached.id !== item.id);
    localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(remaining));
    syncedCount += 1;
  }

  localStorage.setItem(OFFLINE_MODE_KEY, 'false');
  return syncedCount;
}

export function getPendingScoreCount(): number {
  return readCachedScores().length;
}