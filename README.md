# Space Alien Attack

A browser-based arcade shooter styled after classic fixed-shooter arcade
games, built with completely original alien designs ("Driftlings") and a
unique player ship ("The Skimmer") — see comments in
[client/src/scenes/BootScene.ts](client/src/scenes/BootScene.ts) for the
intended visual direction of the placeholder art.

Monorepo layout (npm workspaces):

```
/client   Phaser 3 + TypeScript game client, bundled with Vite
/server   Node.js + Express + TypeScript API, Prisma ORM over PostgreSQL
/mobile   Capacitor wrapper around the built client for Android/iOS
```

## Prerequisites

- **Node.js 18+** (Node 20 LTS recommended) and npm 10+
- A **PostgreSQL** server you control the connection details for (this repo
  does not bundle Postgres or docker-compose — point `server/.env` at your
  own database, local or on your network)
- Android Studio / Xcode only if you intend to build the `/mobile` native
  shells (see [mobile/README.md](mobile/README.md))

## Getting started

### Windows 11

```powershell
# From the repo root
git clone https://github.com/coonjc/Space-Alien-Attack.git
cd Space-Alien-Attack
npm install

# Configure the server environment
Copy-Item server\.env.example server\.env
notepad server\.env   # fill in DATABASE_URL / DB_* / JWT_SECRET etc.

# Generate the Prisma client and run migrations against your Postgres server
npm run prisma:generate
npm run prisma:migrate

# Run the game client (http://localhost:5173)
npm run dev:client

# In a second terminal, run the API server (http://localhost:3000)
npm run dev:server
```

### Unix / Linux (and macOS)

```sh
# From the repo root
git clone https://github.com/coonjc/Space-Alien-Attack.git
cd Space-Alien-Attack
npm install

# Configure the server environment
cp server/.env.example server/.env
$EDITOR server/.env   # fill in DATABASE_URL / DB_* / JWT_SECRET etc.

# Generate the Prisma client and run migrations against your Postgres server
npm run prisma:generate
npm run prisma:migrate

# Run the game client (http://localhost:5173)
npm run dev:client

# In a second terminal, run the API server (http://localhost:3000)
npm run dev:server
```

## Configuring the database (`server/.env`)

Copy `server/.env.example` to `server/.env` and set:

| Variable       | Purpose                                                    |
|----------------|-------------------------------------------------------------|
| `DATABASE_URL` | Full Prisma connection string (what Prisma actually reads) |
| `DB_HOST`      | Postgres host/IP on your network                            |
| `DB_PORT`      | Postgres port (default `5432`)                              |
| `DB_USER`      | Postgres role/username                                      |
| `DB_PASSWORD`  | Postgres password                                           |
| `DB_NAME`      | Database name                                                |
| `JWT_SECRET`   | Long random string used to sign JWT session tokens          |
| `JWT_EXPIRES_IN` | JWT lifetime (e.g. `7d`)                                   |
| `PORT`         | Port the Express API listens on                             |
| `CORS_ORIGIN`  | Comma-separated list of allowed client origins               |
| `ADMIN_EMAIL`  | Email for the seeded admin account (see below)               |
| `ADMIN_PASSWORD` | Password for the seeded admin account (see below)          |

`DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` are provided as
convenience/documentation for rebuilding `DATABASE_URL`; only `DATABASE_URL`
is read directly by Prisma.

## Running Prisma migrations

```sh
npm run prisma:generate   # generates the Prisma client from server/prisma/schema.prisma
npm run prisma:migrate    # creates/applies a migration against your configured database
```

Both commands run against whatever `server/.env`'s `DATABASE_URL` points at.

## Admin account & dashboard

Player accounts have an `isAdmin` and an `isBanned` flag (see
[server/prisma/schema.prisma](server/prisma/schema.prisma)). There is no
public sign-up path to admin — the first admin account is created (or reset)
via a seed script that reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from
`server/.env`:

```sh
npm run prisma:seed --workspace server
```

Re-running it after changing `ADMIN_PASSWORD` in `.env` resets that admin's
password. Once created, log into the admin dashboard at
`http://localhost:5173/admin.html` (during `npm run dev:client`) with those
credentials. From there you can view every player account, **ban/unban**
them (banned accounts are rejected at `/auth/login` and on every
authenticated request thereafter), or **permanently delete** an account and
its stats. Admin accounts can't ban/delete themselves or other admins from
the UI.

## API overview

| Method | Path                 | Auth        | Description                              |
|--------|----------------------|-------------|-------------------------------------------|
| POST   | `/auth/register`     | none        | Create an account, returns a JWT         |
| POST   | `/auth/login`        | none        | Log in, returns a JWT (rejects banned users) |
| GET    | `/stats/me`          | JWT         | Get the current user's game stats        |
| POST   | `/stats/me`          | JWT         | Update the current user's game stats     |
| GET    | `/leaderboard?limit=10` | none      | List public top scores (maximum 100)     |
| GET    | `/admin/users`       | JWT + admin | List all player accounts and their stats |
| POST   | `/admin/users/:id/ban`   | JWT + admin | Ban a player account                 |
| POST   | `/admin/users/:id/unban` | JWT + admin | Lift a ban on a player account        |
| DELETE | `/admin/users/:id`   | JWT + admin | Permanently delete a player account       |

Protected routes expect `Authorization: Bearer <token>`. Players can create
an account or log in from the game page. Their game-over scores are submitted
to `/stats/me`; the public leaderboard shows the top scores and player display
names. Set `VITE_API_BASE` when the API is hosted somewhere other than
`http://localhost:3000`.

## Building for production

```sh
npm run build:client   # outputs client/dist (also consumed by /mobile)
npm run build:server   # outputs server/dist
```

## Mobile

See [mobile/README.md](mobile/README.md) for Capacitor/Android Studio/Xcode
setup — the mobile package currently ships config only (no native platform
projects generated yet).
