# Nervana

An all-in-one Discord bot for a **single server**: moderation, logging, utility, tickets,
leveling, economy, community features, music, usage stats, and a Next.js dashboard.

> **Status:** Phase 0 — foundation. Command surface and dashboard are in progress.

## Why this repository is unusual

The bot runs on **bot-hosting.net free** (256 MB RAM). That plan cannot reliably run
`npm install` — it runs out of memory (exit 137). So the repository commits:

- `index.js` — a prebuilt esbuild bundle of the whole bot
- `drizzle/` — the SQL migrations the bot applies at startup

The host runs exactly one command:

```bash
node index.js
```

No install, no build. **Do not add `index.js` or `drizzle/` to `.gitignore`.**

## Layout

| Path | Purpose |
|---|---|
| `apps/bot` | discord.js v14 bot source |
| `apps/web` | Next.js dashboard (Phase 6) |
| `packages/db` | Drizzle schema, client, migration runner |
| `packages/shared` | Zod config schemas, XP math, time helpers, brand constants |
| `scripts/` | bundle, bundle verification, local dev bootstrap |
| `drizzle/` | **committed** SQL migrations |
| `index.js` | **committed** bot bundle |
| `DEPLOY.md` | free-tier deployment runbook |

## Local development

Prerequisites: **Node 24+** and **npm 11+**. Postgres and Java are only needed for the
database and Lavalink/music respectively (see `DEPLOY.md`).

```powershell
npm install
Copy-Item .env.example .env
# fill DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID
npm run db:generate     # only when the schema changes
npm run dev
```

`/ping` and `/help` work without a database; leave `DATABASE_URL` empty and the bot logs a
warning and uses built-in defaults. For production, always configure the database.

### Scripts

| Command | Action |
|---|---|
| `npm run dev` | Run the bot from TypeScript with watch mode |
| `npm run typecheck` | Typecheck every workspace |
| `npm test` | Run unit tests |
| `npm run bundle:bot` | Rebuild the committed `index.js` |
| `npm run verify:bundle` | Run the bundle in a clean directory and assert RSS |
| `npm run db:generate` | Generate SQL from the Drizzle schema |
| `npm run db:migrate` | Apply pending migrations |

## Free-tier warnings

- **bot-hosting.net free** requires manual renewal **every 4 days**. State lives in
  Supabase, so a restart is lossless.
- **Supabase free** pauses after 7 days of low activity. The bot writes a daily heartbeat.
- **Music uses a public Lavalink node.** That operator proxies the guild's voice audio and
  can observe it. Set `MUSIC_ENABLED=false` if you do not trust the node, or self-host.
- **Vercel Hobby** is for non-commercial use. A private community server qualifies.

## Security

- Never commit `.env` or paste tokens into chat/issues.
- Dashboard access uses Discord OAuth (`identify` only) plus the `DASHBOARD_ADMIN_IDS`
  allowlist. There is no guild picker and no `Manage Server` requirement.
- The bot leaves any guild that is not `GUILD_ID`.

## License

MIT
