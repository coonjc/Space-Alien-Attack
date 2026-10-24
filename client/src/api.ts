const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';
const TOKEN_KEY = 'saa-token';
const EMAIL_KEY = 'saa-email';
const DISPLAY_NAME_KEY = 'saa-display-name';

export interface Account {
  id: string;
  email: string;
  isAdmin: boolean;
}

interface AuthResponse {
  token: string;
  user: Account;
}

export function getSavedEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function getSavedDisplayName(): string {
  return localStorage.getItem(DISPLAY_NAME_KEY) ?? '';
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

export async function submitScore(highScore: number, displayName: string): Promise<void> {
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

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load the leaderboard');
  return await res.json() as LeaderboardEntry[];
}