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

`DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` are provided as
convenience/documentation for rebuilding `DATABASE_URL`; only `DATABASE_URL`
is read directly by Prisma.

## Running Prisma migrations

```sh
npm run prisma:generate   # generates the Prisma client from server/prisma/schema.prisma
npm run prisma:migrate    # creates/applies a migration against your configured database
```

Both commands run against whatever `server/.env`'s `DATABASE_URL` points at.

## API overview

| Method | Path          | Auth | Description                          |
|--------|---------------|------|----------------------------------------|
| POST   | `/auth/register` | none | Create an account, returns a JWT     |
| POST   | `/auth/login`    | none | Log in, returns a JWT                |
| GET    | `/stats/me`      | JWT  | Get the current user's game stats    |
| POST   | `/stats/me`      | JWT  | Update the current user's game stats |

Protected routes expect `Authorization: Bearer <token>`.

## Building for production

```sh
npm run build:client   # outputs client/dist (also consumed by /mobile)
npm run build:server   # outputs server/dist
```

## Mobile

See [mobile/README.md](mobile/README.md) for Capacitor/Android Studio/Xcode
setup — the mobile package currently ships config only (no native platform
projects generated yet).
