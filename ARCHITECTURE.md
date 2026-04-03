# Threads Bot — Architecture

This document describes the project structure, data flow, and design decisions.

---

## Folder Structure

```
src/
├── config/           # Configuration and constants
│   ├── env.ts        # Zod-based env validation (loadEnv)
│   ├── constants.ts  # PROMPT, AI_CONFIG, PATH_CONFIG, THREADS_MAX_LENGTH,
│   │                 # HOOK_INTENTS, TOPIC_BUCKETS, ALL_TOPICS, BANNED_PHRASES,
│   │                 # QUALITY_FILTER, SCHEDULE_CONFIG, DUPLICATE_CHECK_WINDOW,
│   │                 # POST_MODES, POST_MODE_POLICY, POST_MODE_INSTRUCTIONS, pickPostMode
│   └── index.ts      # Re-exports from env.ts and constants.ts
├── types/            # Shared TypeScript types
│   └── index.ts      # PostCache, PublishResult, DraftPost, BotState, PostLogEntry, etc.
├── core/             # Reusable contracts and errors
│   ├── errors.ts     # AppError, ConfigError, AIProviderError, ThreadsAPIError
│   ├── interfaces.ts # IAIPostProvider, IThreadsPublisher, IPostCacheStore, GeneratePostOptions
│   └── index.ts
├── utils/            # Pure helpers
│   ├── logger.ts     # Pino-based structured logger
│   ├── delay.ts      # Promise-based delay
│   ├── string.ts     # truncate
│   └── index.ts
├── services/         # Business logic (one concern per module)
│   ├── GeminiService.ts      # AI post generation — hook intent, post mode, quality filter
│   ├── ThreadsService.ts     # Threads API publish (implements IThreadsPublisher)
│   ├── PostCacheService.ts   # File-based post cache (implements IPostCacheStore)
│   ├── PostLogService.ts     # Append-only post history log (data/post-log.json)
│   ├── BotStateService.ts    # Paused flag + pending draft (data/bot-state.json)
│   ├── TelegramBotService.ts # Telegram bot: commands, inline approval keyboard, draft flow
│   └── index.ts
├── app/              # Application entry and orchestration
│   ├── runBot.ts     # runBot(deps) — direct publish cycle (used in --once mode)
│   ├── scheduler.ts  # schedulePosts(tick) — node-cron daily slot(s) with random variation
│   └── index.ts      # buildContainer(), createScheduleTick(), main()
└── index.ts          # Entry point
```

**Layer responsibilities:**
- **config** — env (Zod) and all generation constants. No business logic.
- **types** — all shared interfaces and types.
- **core** — interface contracts (ports) and shared errors. No I/O.
- **utils** — pure helpers. No business rules.
- **services** — I/O implementations of core interfaces + Telegram bot.
- **app** — composes services via DI, runs the bot in a chosen mode.

---

## Data Flow

### Scheduled flow with Telegram approval

```
scheduler tick
    └─► createScheduleTick()
            ├─ botState.isPaused() → skip if true
            ├─ aiProvider.getRandomTopic() + getRandomHookIntent()
            ├─ aiProvider.generatePost({ topic, hookIntent })
            │       └─ pickPostMode() → callGemini(topic, hookIntent, postMode)
            │            → banned phrase check → quality filter → retry (up to 4x)
            ├─ postLog.isDuplicate(text) → regenerate once if duplicate
            ├─ botState.setDraft(draft)
            └─ telegramBot.sendDraftForApproval(draft)
                    └─ Telegram message with ✅ Publish / 🔄 Regenerate buttons

admin taps ✅ Publish
    └─► callback_query: 'approve'
            ├─ threadsPublisher.publish(draft.text)
            ├─ postLog.add({ text, topic, status: 'published' })
            └─ botState.setDraft(null)
```

### Scheduled flow without Telegram (auto-publish)

```
scheduler tick
    └─► createScheduleTick()
            ├─ botState.isPaused() → skip if true
            ├─ aiProvider.generatePost({ topic, hookIntent })
            ├─ postLog.isDuplicate(text) → regenerate once if duplicate
            └─ threadsPublisher.publish(text)
                    └─ postLog.add({ text, topic, status: 'published' })
```

### Manual /generate flow

```
/generate [topical <angle> | <custom text>]
    └─► parse argument
    ├─ aiProvider.generatePost({ customAngle, hookIntent })
    ├─ postLog.isDuplicate() → regenerate once if duplicate
    ├─ botState.setDraft(draft)
    └─ ctx.reply(formatDraft(draft)) with inline keyboard
```

### Direct publish flow (--once / no Telegram)

```
runBot(deps)
    ├─ cache.get() → use cached post if present (retry from previous failure)
    ├─ aiProvider.generatePost() × up to 3 attempts (duplicate check)
    ├─ threadsPublisher.publish(text)
    ├─ on success: cache.set(null), postLog.add(published)
    └─ on failure: cache.set(post), postLog.add(failed), rethrow
```

---

## Content Generation System

### GeminiService

The core generation pipeline inside `GeminiService.generatePost()`:

1. Resolve `topic` (from options, or `getRandomTopic()`)
2. Resolve `hookIntent` (from options, or `getRandomHookIntent()`)
3. Resolve `postMode` (from options, or `pickPostMode()` by POST_MODE_POLICY weights)
4. Call Gemini with prompt containing `{TOPIC}`, `{HOOK_INTENT}`, `{POST_MODE_INSTRUCTION}`
5. On each attempt: check banned phrases → check quality filter → accept or retry
6. Vary hook intent on each retry for diversity

### Hook Intents (12)

`contrarian_diagnosis`, `hidden_cost`, `uncomfortable_truth`, `pain_diagnosis`, `dry_humor`, `topical_reaction`, `myth_busting`, `false_growth_signal`, `operator_confession`, `wrong_problem`, `invisible_drain`, `scaling_paradox`

Each intent has a description in the prompt explaining the specific angle it produces.

### Post Modes

Mode is always picked randomly on each generation — there is no Telegram command to force a specific mode.

| Mode | Weight | Behaviour |
|---|---|---|
| `default` | 50% | Standard post, no forced structure |
| `question` | 25% | Ends with one sharp uncomfortable question |
| `story` | 15% | Micro-story: situation → wrong assumption → consequence |
| `open_loop` | 10% | Deliberately unresolved — raises tension, stops before the answer |

**To change the distribution:** edit `POST_MODE_POLICY` in `src/config/constants.ts`. Weights must sum to `1.0`. Set a weight to `0` to disable a mode entirely.

### Quality Filter

Posts are rejected and regenerated if they contain:

- `genericOpeners` — checked in the first sentence (20 patterns): too-generic openers like "as a business owner", "the truth is", "at the end of the day", etc.
- `broadAdvicePhrases` — checked anywhere in text (18 patterns): instructional/how-to patterns like "you should", "make sure to", "the best way to", etc.
- `tooPolished` — checked anywhere in text (12 patterns): clean-resolution phrases like "the lesson here", "the good news is", "simple fix", etc.
- `linkedinPatterns` — checked anywhere in text (10 patterns): "excited to share", "hot take:", "real talk:", etc.
- `concreteTerms` — post must contain at least one of ~60 concrete business terms (crm, lead, handoff, workflow, invoice, etc.)
- More than 4 newlines (blog-post format — too long)

---

## Key State Files

| File | Managed by | Purpose |
|---|---|---|
| `data/bot-state.json` | `BotStateService` | Paused flag + current pending draft |
| `data/post-log.json` | `PostLogService` | Append-only history (published / rejected / failed) |
| `data/post-cache.json` | `PostCacheService` | Retry cache when Threads publish fails |
| `data/textStyle.txt` | manual | Optional persona/voice context appended to Gemini prompt |

All files are created on first run. Mount `./data` as a Docker volume to persist across restarts.

---

## Startup Modes

Controlled by `Bun.argv`:

| CLI arg | Behaviour |
|---|---|
| *(none)* | Scheduler + Telegram polling (normal) |
| `--once` | `runBot()` once then `process.exit(0)` |
| `--bot` | Telegram polling only, no scheduler |

Corresponding bun scripts:

```bash
bun start          # normal mode
bun run once       # --once
bun run bot        # --bot
bun dev            # watch mode (auto-reload)
```

---

## Environment Variables

Validated in `src/config/env.ts` via Zod.

**Required for posting:**
- `GEMINI_API_KEY`
- `THREADS_USER_ID`
- `THREADS_ACCESS_TOKEN`

**Required for Telegram approval flow:**
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_ID`

**Optional:**
- `TELEGRAM_ADMIN_ID_2` — second admin
- `BOT_ACCESS_PASSWORD` — password for non-admin users
- `NODE_ENV` — `production` (JSON logs) or `development` (pretty logs)
- `LOG_LEVEL` — `trace` / `debug` / `info` / `warn` / `error`
- `TZ` — timezone for scheduler (e.g. `Europe/Vilnius`)

Without Telegram vars the bot runs in auto-publish mode (no human review).

---

## Adding a New AI Provider

1. Implement `IAIPostProvider` from `src/core/interfaces.ts`:
   - `getRandomTopic(): Promise<string>`
   - `getRandomHookIntent(): string`
   - `generatePost(options?: string | GeneratePostOptions): Promise<string>`

2. Create `src/services/ClaudeService.ts` (or similar) implementing the interface.

3. In `src/app/index.ts` inside `buildContainer()`, swap:
   ```typescript
   // before:
   const aiProvider = new GeminiService(env.GEMINI_API_KEY!);
   // after:
   const aiProvider = new ClaudeService(env.CLAUDE_API_KEY!);
   ```

4. Add new env var to `src/config/env.ts` (Zod schema). No changes needed in `runBot`, scheduler, or Telegram service.
