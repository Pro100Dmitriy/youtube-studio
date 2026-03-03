# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run server    # Start Express server (node server.js) at http://localhost:3000
npm run go        # Run legacy CLI script (node main.js) — kept for reference
```

No tests or linters are configured.

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

Per-account credential files live at `accounts/<email>/client_secret.json` and `accounts/<email>/token.json`.

**Note**: `services/auth.js` resolves the accounts directory relative to `__dirname` (`services/`), so files land at `services/accounts/<email>/`.

### Phase 2: Automation

`POST /api/run` accepts `{ accounts: [email], videos: [...] }`, runs in the background, and streams status updates via SSE. For each account it calls `loadAccountAuth(email)` which loads the saved `token.json`, attaches the assigned proxy via `HttpsProxyAgent`, then passes the `oauth2Client` to `updateMultipleVideosFull()`.

### Services

- `services/auth.js` — OAuth flow (Phase 1 & 2), proxy attachment
- `services/video.js` — `updateMultipleVideosFull(authClient, videos)`: updates title/description localizations, then uploads/updates captions per video. 1s delay between captions, 2s between videos.
- `services/captions.js` — `uploadOrUpdateCaption()` and `getExistingCaptions()` via YouTube Data API v3

### Database

`db.json` is the flat-file store (schema: `{ accounts: [], proxies: [] }`). Two singleton models extend `DatabaseJSON`:
- `database/AccountModel.js` — CRUD for accounts, `authorized` flag, `proxyId` assignment
- `database/ProxiesModel.js` — CRUD for proxies; format on input: `host:port:user:pass`

### Real-time updates (SSE)

`routes/sse.js` maintains a `Set` of open response streams. `emitSSE(data)` broadcasts JSON to all connected clients. Events carry `{ type, email, status, message }`.

### Key data structures

```js
// Video entry for /api/run
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
