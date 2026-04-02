# 58-threads-bot

Threads posting bot for [58 Systems](https://58systems.com). Generates short, human-sounding posts about SMB operations and automation, sends them to Telegram for approval, then publishes to Threads.

---

## What it does

- Generates posts via Google Gemini (business-focused, anti-AI-slop prompt)
- Sends drafts to Telegram — you approve or regenerate before anything goes live
- Publishes to Threads via the official API
- Runs on a schedule (morning slot by default, configurable)
- Persists draft state, post history, and paused/resume flag across restarts

---

## Prerequisites

- [Docker + Docker Compose](https://docs.docker.com/get-docker/) — for the Docker path
- Or [Bun](https://bun.sh) v1.x — for running locally without Docker
- A Google Gemini API key — [get one here](https://aistudio.google.com/app/apikey)
- Threads API credentials (User ID + Access Token) — from [Meta developer dashboard](https://developers.facebook.com/)
- A Telegram bot token — create one with [@BotFather](https://t.me/BotFather)
- Your Telegram user ID — get it from [@userinfobot](https://t.me/userinfobot)

---

## Required environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | yes | Google Gemini API key |
| `THREADS_USER_ID` | yes | Your Threads user ID |
| `THREADS_ACCESS_TOKEN` | yes | Threads API access token |
| `TELEGRAM_BOT_TOKEN` | recommended | Telegram bot token for draft approval |
| `TELEGRAM_ADMIN_ID` | recommended | Your Telegram user ID (numeric) |
| `TZ` | recommended | Your timezone, e.g. `Europe/Vilnius` |
| `NODE_ENV` | no | `production` for JSON logs, `development` for pretty logs |
| `TELEGRAM_ADMIN_ID_2` | no | Second admin Telegram ID |
| `BOT_ACCESS_PASSWORD` | no | Password for non-admin Telegram access |
| `LOG_LEVEL` | no | `debug` / `info` / `warn` (default: `info`) |

---

## Start with Docker Compose (recommended)

```bash
# 1. Copy and fill in your credentials
cp .env.example .env
# edit .env with your values

# 2. Create the data directory
mkdir -p data

# 3. Build and start
docker compose up --build

# Run in background
docker compose up --build -d

# Follow logs
docker compose logs -f
```

The bot will start, log a startup summary, and wait for the scheduled post time (default: ~9:00 AM in your TZ).

---

## Start without Docker (Bun)

```bash
# Install dependencies
bun install

# Create data directory
mkdir -p data

# Copy and fill in env
cp .env.example .env

# Run (scheduler + Telegram polling)
bun start

# Or run once and exit (useful for testing)
bun run once

# Or run Telegram bot only (no scheduler)
bun run bot
```

---

## Telegram commands

Once running, open your Telegram bot and use:

| Command | What it does |
|---|---|
| `/generate` | Generate a draft and send it for review |
| `/approve` | Publish the current draft to Threads |
| `/reject` | Discard the current draft |
| `/post_now` | Generate and publish immediately (no review) |
| `/pause` | Pause scheduled posts |
| `/resume` | Resume scheduled posts |
| `/status` | Show current state, pending draft, recent posts |

---

## Posting flow

**Normal scheduled flow:**
1. Bot fires at scheduled time (~9:00 AM ± 30 min in your TZ)
2. Generates a post → checks for duplicates → saves as draft
3. Sends draft to your Telegram with **✅ Publish** / **🔄 Regenerate** buttons
4. You review: tap Publish → post goes live on Threads
5. Result logged to `data/post-log.json`

**Manual flow:**
- `/generate` → review → `/approve` or `/reject`
- `/post_now` → publishes immediately without review

---

## First real-world test

1. Start the bot (`docker compose up --build` or `bun start`)
2. Confirm startup log appears — check `telegramEnabled: true`
3. Open your Telegram bot → send `/generate`
4. Review the draft in Telegram
5. Tap **✅ Publish** or send `/approve`
6. Check your Threads profile — post should appear within seconds
7. Run `/status` to confirm it's logged

---

## Files under `data/`

| File | Purpose |
|---|---|
| `data/bot-state.json` | Bot paused flag + current pending draft |
| `data/post-log.json` | Full history of all generated posts (published / rejected / failed) |
| `data/post-cache.json` | Temporary cache for retry if Threads API fails mid-publish |
| `data/textStyle.txt` | Optional: extra voice context fed to Gemini (copy from `data.example/`) |

All files are created automatically on first run. Mount `./data` as a Docker volume to persist across container restarts.

---

## Stop / pause / resume

```bash
# Pause scheduled posts (bot keeps running, just skips scheduled ticks)
# In Telegram: /pause

# Resume
# In Telegram: /resume

# Stop the container entirely
docker compose down

# Stop and remove data volume (fresh start)
docker compose down && rm -rf data/
```

---

## Scheduling

Default: one post per day at ~9:00 AM ± 30 minutes (in your `TZ`).

To change timing or enable a second daily post, edit `src/config/constants.ts`:

```typescript
export const SCHEDULE_CONFIG = {
  morningHour: 9,       // center hour for morning slot
  eveningHour: 18,      // center hour for evening slot
  variationMinutes: 30, // ±N minute random variation
  twoPostsPerDay: false, // set to true for morning + evening
} as const;
```

Set `TZ` in `.env` to control which timezone the schedule runs in.

---

## Modes

| Start command | Behavior |
|---|---|
| `bun start` | Scheduler + Telegram polling (normal mode) |
| `bun run once` | Generate + publish once, then exit |
| `bun run bot` | Telegram polling only, no scheduler |
| `docker compose up` | Same as `bun start`, inside Docker |
