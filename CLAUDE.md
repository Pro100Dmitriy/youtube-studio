# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run server    # Start Express server (node server.js) at http://localhost:3000
npm run go        # Run legacy CLI script (node main.js) — kept for reference
```

No tests or linters are configured.

### Docker / deployment (`Makefile`, `.docker/`)

The Makefile wraps `docker compose -f .docker/docker-compose.yml` and reads `DOCKER_REGISTRY` / `VERSION` from `.env`.

```bash
make run       # docker compose up -d --build (local)
make stop      # docker compose down
make refresh   # remove image + containers, then rebuild and run
make build     # docker build tagged ${DOCKER_REGISTRY}/youtube-studio:${VERSION}
make build-amd # buildx for linux/amd64 (deploy target arch)
make push      # push to the registry
```

The compose file bind-mounts `db.json`, `accounts/`, and `videos/` into the container so state lives on the host. `.docker/entrypoint.sh` seeds an empty `db.json` if missing before starting the server.

## Architecture

A two-phase Node.js system for automating YouTube video metadata across multiple accounts. Each account uses its own Google OAuth credentials and an assigned HTTPS proxy.

**Server** (`server.js`): Express app on port 3000. Serves the frontend from `public/` and mounts two router groups:
- `routerService` — service endpoints (`/events` SSE stream, `/oauth2callback`)
- `routerAPI` — REST API under `/api` (accounts, proxies, automation)

### Phase 1: OAuth Onboarding

The frontend panel (`public/`) allows adding accounts and triggering OAuth. Flow:
1. `POST /api/accounts/:email/authorize` → `services/auth.js:startOAuthFlow()` generates an OAuth URL using the account's `client_secret.json` and stores a pending `oauth2Client` in memory (`pendingOAuth` Map)
2. The URL is opened by the frontend; the user signs in manually
3. Google redirects to `GET /oauth2callback` → `services/auth.js:finalizeOAuth()` exchanges the code for tokens and writes `token.json` for the account

Per-account credential files live at `accounts/<email>/client_secret.json` and `accounts/<email>/token.json`. `services/auth.js` resolves these via `path.join(__dirname, '../accounts', email)`, i.e. the project-root `accounts/` directory.

**Account/directory sync**: on server boot (`server.js` → `services/syncAccounts.js`) the `accounts/` directory is treated as the source of truth. Accounts in `db.json` whose folder no longer exists are removed; new folders are added; the `authorized` flag is set to whether `token.json` is present. So dropping a pre-authorized `accounts/<email>/` folder onto the host (e.g. a Docker volume) registers the account without going through the OAuth UI.

### Phase 2: Automation

`POST /api/run` accepts `{ accounts: [email], videoIds: [id] }`. The server reads each video's folder itself via `readVideoData(id)` (it does not receive video payloads from the client). It responds immediately (`{ ok: true }`) and runs in the background, streaming status via SSE. For each account it calls `loadAccountAuth(email)` which loads the saved `token.json`, attaches the assigned proxy via `HttpsProxyAgent`, then passes the `oauth2Client` to `updateMultipleVideosFull()`.

During a run, `routes/automation.js` monkey-patches `console.log/error/warn` so all logging from the service layer is mirrored to SSE clients (as `status: running/error/warning`); the originals are restored in a `finally`.

### Services

- `services/auth.js` — OAuth flow (Phase 1 & 2), proxy attachment
- `services/video.js` — `updateMultipleVideosFull(authClient, videos)`: updates title/description localizations, then uploads/updates captions per video. 1s delay between captions, 2s between videos.
- `services/captions.js` — `uploadOrUpdateCaption()` and `getExistingCaptions()` via YouTube Data API v3
- `services/videosFolder.js` — reads local `videos/` directory to build video payloads (`listVideos()`, `readVideoData(videoId)`). Each video has a folder at `videos/<videoId>/` containing `<lang>.txt` files and a `captions/` subdirectory with `.srt` files. `.txt` format uses `title { ... }` and `desc { ... }` blocks. Exposed via `GET /api/videos` and `GET /api/videos/:videoId`.
- `services/syncAccounts.js` — reconciles `db.json` accounts with the `accounts/` directory on boot (see Phase 1).
- `services/apiError.js` — `formatApiError(err)` unpacks googleapis `GaxiosError`; the real reason lives in `err.response.data.error.errors[]`, not `err.message`. Use it when surfacing YouTube Data API failures.

### Database

`db.json` is the flat-file store (schema: `{ accounts: [], proxies: [] }`). Two singleton models extend `DatabaseJSON`:
- `database/AccountModel.js` — CRUD for accounts, `authorized` flag, `proxyId` assignment
- `database/ProxiesModel.js` — CRUD for proxies; format on input: `host:port:user:pass`

### Real-time updates (SSE)

`routes/sse.js` maintains a `Set` of open response streams. `emitSSE(data)` broadcasts JSON to all connected clients. Events carry `{ type, email, status, message }`.

### Key data structures

```js
// Video entry returned by readVideoData(), consumed by updateMultipleVideosFull()
{
  videoId: 'abc123',
  localizations: {
    ru: { title: '...', description: '...' },
    en: { title: '...', description: '...' }
  },
  captions: [
    { langCode: 'ru', filePath: './videos/<videoId>/captions/ru.srt' }
  ]
}

// Proxy stored in db.json
{ id: 'proxy-<timestamp>', url: 'http://user:pass@host:port', label: '...' }
```

## Credentials

- `accounts/<email>/client_secret.json` — per-account OAuth client config (never commit)
- `accounts/<email>/token.json` — saved refresh token (auto-generated on first auth, never commit)
- `db.json` — contains proxy URLs with credentials (never commit)
