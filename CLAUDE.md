# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run go        # Run the main script (node main.js)
node main.js      # Direct run
```

No tests or linters are configured.

## Architecture

A Node.js CLI tool for automating YouTube video metadata management via the YouTube Data API v3.

**Auth flow** (`auth.js`): OAuth 2.0 via `@google-cloud/local-auth`. On first run, opens a browser for manual Google sign-in. Credentials stored in `token.json`. Requires `client_secret.json` (OAuth client credentials from Google Cloud Console).

**Modules:**
- `auth.js` — OAuth authorization, token persistence
- `video.js` — Fetch video info, update localizations (title/description per language), batch update multiple videos
- `captions.js` — List existing captions, upload or update SRT caption files per language

**Entry point** (`main.js`): Orchestrates calls — currently hardcoded to update a single video (`a-Bxf_pyr2A`) with Russian, English, and French localizations and captions. Most operations are commented out; uncomment the desired function to run it.

**Caption files** are stored under `captions/<videoId>/<langCode>.srt`.

**Key data structures:**

```js
// Localizations map passed to video functions
{
  ru: { title: '...', description: '...' },
  en: { title: '...', description: '...' },
}

// Caption descriptor array
[
  { langCode: 'ru', filePath: './captions/<videoId>/ru.srt' },
]

// updateMultipleVideosFull input
[
  { videoId: '...', localizations: {...}, captions: [...] }
]
```

**Rate limiting**: 1s delay between caption uploads, 2s delay between videos (hardcoded in `video.js`).

## Credentials

- `client_secret.json` — OAuth client config (never commit)
- `token.json` — Saved access/refresh token (auto-generated on first auth, never commit)
