/**
 * Minimal admin dashboard for the game backend. Deliberately built with
 * plain DOM APIs (no Phaser, no framework) since this is an internal tool,
 * not part of the in-browser game itself. It talks directly to the
 * Express API's /auth and /admin routes.
 */

interface AdminUserRow {
  id: string;
  email: string;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string;
  stats: { highScore: number; gamesPlayed: number; updatedAt: string } | null;
}

// Same-origin dev default (Vite proxies nothing here) — override at build
// time with VITE_API_BASE if the API is hosted elsewhere.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:3000';

const TOKEN_STORAGE_KEY = 'saa-admin-token';

const app = document.getElementById('app')!;

let token: string | null = sessionStorage.getItem(TOKEN_STORAGE_KEY);
let users: AdminUserRow[] = [];
let searchQuery = '';
let statusFilter = 'all';

function render(): void {
  app.innerHTML = '';
  if (!token) {
    renderLogin();
  } else {
    renderDashboard();
  }
}

function renderLogin(): void {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <h1>Space Alien Attack — Admin Login</h1>
    <p style="color:#ffb84d">Set <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> in <code>server/.env</code>, then run <code>npm run prisma:seed --workspace server</code>.</p>
    <form id="login-form" style="display:flex; flex-direction:column; gap:8px; max-width:320px;">
      <label>Email<br/><input type="email" id="email" required style="width:100%; padding:6px;" /></label>
      <label>Password<br/><input type="password" id="password" required style="width:100%; padding:6px;" /></label>
      <button type="submit" style="padding:8px; cursor:pointer;">Log in</button>
      <p id="login-error" style="color:#ff4d4d; min-height:1.2em;"></p>
    </form>
  `;
  app.appendChild(wrapper);

  const form = document.getElementById('login-form') as HTMLFormElement;
  const errorEl = document.getElementById('login-error')!;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const email = (document.getElementById('email') as HTMLInputElement).value.trim().toLowerCase();
    const password = (document.getElementById('password') as HTMLInputElement).value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        const message = data.error ?? 'Login failed';
        errorEl.textContent = res.status === 401
          ? `${message}. Confirm the admin account was seeded from server/.env.`
          : message;
        return;
      }
      if (!data.user?.isAdmin) {
        errorEl.textContent = 'This account does not have admin privileges';
        return;
      }

      token = data.token;
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token!);
      render();
    } catch (error) {
      errorEl.textContent = error instanceof Error && error.message
        ? `Could not reach the server: ${error.message}`
        : 'Could not reach the server. Start the API server and try again.';
    }
  });
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });
}

function logout(): void {
  token = null;
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  render();
}

async function renderDashboard(): Promise<void> {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h1>Player Accounts</h1>
      <button id="logout-btn" style="padding:6px 12px; cursor:pointer;">Log out</button>
    </div>
    <p id="dash-error" style="color:#ff4d4d;"></p>
    <div style="display:flex; flex-wrap:wrap; gap:12px; margin:12px 0;">
      <label>Search email <input id="user-search" type="search" autocomplete="off" placeholder="Filter accounts" /></label>
      <label>Status
        <select id="status-filter">
          <option value="all">All accounts</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="admin">Admins</option>
        </select>
      </label>
      <button id="refresh-users" type="button">Refresh</button>
      <span id="user-count" aria-live="polite"></span>
    </div>
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr style="text-align:left; border-bottom:1px solid #2be8e8;">
          <th style="padding:6px;">Email</th>
          <th style="padding:6px;">Role</th>
          <th style="padding:6px;">Status</th>
          <th style="padding:6px;">High Score</th>
          <th style="padding:6px;">Games</th>
          <th style="padding:6px;">Created</th>
          <th style="padding:6px;">Actions</th>
        </tr>
      </thead>
      <tbody id="users-body"></tbody>
    </table>
  `;
  app.appendChild(wrapper);

  document.getElementById('logout-btn')!.addEventListener('click', logout);
  document.getElementById('user-search')!.addEventListener('input', (event) => {
    searchQuery = (event.currentTarget as HTMLInputElement).value.trim().toLowerCase();
    renderUsers();
  });
  document.getElementById('status-filter')!.addEventListener('change', (event) => {
    statusFilter = (event.currentTarget as HTMLSelectElement).value;
    renderUsers();
  });
  document.getElementById('refresh-users')!.addEventListener('click', () => void loadUsers());

  await loadUsers();
}

async function loadUsers(): Promise<void> {
  const errorEl = document.getElementById('dash-error')!;
  errorEl.textContent = '';

  let res: Response;
  try {
    res = await apiFetch('/admin/users');
  } catch (error) {
    errorEl.textContent = error instanceof Error
      ? `Could not reach the admin API: ${error.message}`
      : 'Could not reach the admin API.';
    return;
  }

  if (res.status === 401 || res.status === 403) {
    logout();
    return;
  }
  if (!res.ok) {
    errorEl.textContent = 'Failed to load users';
    return;
  }

  try {
    users = await res.json() as AdminUserRow[];
    renderUsers();
  } catch (error) {
    errorEl.textContent = error instanceof Error ? error.message : 'Could not parse the users response.';
  }
}

function renderUsers(): void {
  const body = document.getElementById('users-body');
  const errorEl = document.getElementById('dash-error');
  const count = document.getElementById('user-count');
  if (!body || !errorEl || !count) return;

  body.replaceChildren();
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && !user.isBanned) ||
      (statusFilter === 'banned' && user.isBanned) ||
      (statusFilter === 'admin' && user.isAdmin);
    return matchesSearch && matchesStatus;
  });
  count.textContent = `Showing ${filteredUsers.length} of ${users.length} accounts`;

  for (const user of filteredUsers) {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #222';

    row.innerHTML = `
      <td style="padding:6px;">${escapeHtml(user.email)}</td>
      <td style="padding:6px;">${user.isAdmin ? 'Admin' : 'Player'}</td>
      <td style="padding:6px; color:${user.isBanned ? '#ff4d4d' : '#7CFC00'};">${user.isBanned ? 'Banned' : 'Active'}</td>
      <td style="padding:6px;">${user.stats?.highScore ?? 0}</td>
      <td style="padding:6px;">${user.stats?.gamesPlayed ?? 0}</td>
      <td style="padding:6px;">${new Date(user.createdAt).toLocaleDateString()}</td>
      <td style="padding:6px; display:flex; gap:6px;"></td>
    `;

    const actionsCell = row.querySelector('td:last-child')!;

    if (!user.isAdmin) {
      const banBtn = document.createElement('button');
      banBtn.textContent = user.isBanned ? 'Unban' : 'Ban';
      banBtn.style.cursor = 'pointer';
      banBtn.addEventListener('click', async () => {
        const action = user.isBanned ? 'unban' : 'ban';
        try {
          const r = await apiFetch(`/admin/users/${encodeURIComponent(user.id)}/${action}`, { method: 'POST' });
          if (r.ok) await loadUsers();
          else errorEl.textContent = await responseError(r, 'Account action failed.');
        } catch (error) {
          errorEl.textContent = error instanceof Error ? error.message : 'Account action failed.';
        }
      });
      actionsCell.appendChild(banBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(`Permanently delete ${user.email}?`)) return;
        try {
          const r = await apiFetch(`/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
          if (r.ok) await loadUsers();
          else errorEl.textContent = await responseError(r, 'Account deletion failed.');
        } catch (error) {
          errorEl.textContent = error instanceof Error ? error.message : 'Account deletion failed.';
        }
      });
      actionsCell.appendChild(deleteBtn);
    }

    async function responseError(response: Response, fallback: string): Promise<string> {
      try {
        const data = await response.json() as { error?: string };
        return data.error ?? fallback;
      } catch {
        return fallback;
      }
    }

    body.appendChild(row);
  }
}

function escapeHtml(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

render();
