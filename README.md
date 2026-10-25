# Nervana

An all-in-one Discord bot for a **single server**: moderation, logging, utility, tickets,
leveling, economy, community features, music, usage stats, and a Next.js dashboard.

> **Status:** Phase 2 - moderation, cases, automod, logging, welcome, leveling,
> utility commands, reminders, and tickets are implemented. Economy, community, music,
> stats, and the dashboard are in progress. See `DEPLOY.md` for the free-tier runbook.

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

| Path              | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `apps/bot`        | discord.js v14 bot source                                  |
| `apps/web`        | Next.js dashboard (Phase 6)                                |
| `packages/db`     | Drizzle schema, client, migration runner                   |
| `packages/shared` | Zod config schemas, XP math, time helpers, brand constants |
| `scripts/`        | bundle, bundle verification, local dev bootstrap           |
| `drizzle/`        | **committed** SQL migrations                               |
| `index.js`        | **committed** bot bundle                                   |
| `DEPLOY.md`       | free-tier deployment runbook                               |

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
warning and uses built-in defaults. `/setup`, moderation, logging, welcome, and leveling need
the database. For production, always configure the database.

### Scripts

| Command                                        | Action                                             |
| ---------------------------------------------- | -------------------------------------------------- |
| `npm run dev`                                  | Run the bot from TypeScript with watch mode        |
| `npm run typecheck`                            | Typecheck every workspace                          |
| `npm test`                                     | Run unit tests                                     |
| `npm run bundle:bot`                           | Rebuild the committed `index.js`                   |
| `npm run verify:bundle`                        | Run the bundle in a clean directory and assert RSS |
| `npm run db:generate`                          | Generate SQL from the Drizzle schema               |
| `npm run db:migrate`                           | Apply pending migrations                           |
| `npm run check:lavalink -- host:port password` | Validate a Lavalink v4 node                        |

## Commands

| Command                                         | What it does                                                    |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `/ping`, `/help`                                | Health check and permission-aware command list                  |
| `/setup status`                                 | Overview of logging, moderation, leveling, welcome, and tickets |
| `/setup logging`, `/setup modlog`               | Route log events and moderation cases                           |
| `/setup automod`                                | Toggle a rule and choose its action                             |
| `/setup link-allow`, `/setup filtered-word`     | Manage the links allowlist and filtered words                   |
| `/setup leveling`                               | Enable leveling and tune XP range, cooldown, announcements      |
| `/setup welcome`, `/setup autorole`             | Join/leave messages and automatic roles                         |
| `/setup exempt-role`, `/setup exempt-channel`   | Automod exemptions                                              |
| `/setup tickets`                                | Set the category, staff role, panel, log, and open limit        |
| `/setup reset`                                  | Restore one module to defaults                                  |
| `/warn`, `/warnings`, `/clearwarnings`          | Warning cases with active-warning tracking                      |
| `/timeout`, `/untimeout`                        | Discord timeouts up to 28 days                                  |
| `/kick`, `/ban`, `/unban`, `/softban`           | Punitive actions, optional temporary bans                       |
| `/case`, `/cases`                               | Inspect the case log                                            |
| `/purge`, `/slowmode`                           | Channel cleanup                                                 |
| `/rank`, `/leaderboard`                         | XP progress and top members                                     |
| `/ticket panel`                                 | Publish the button panel                                        |
| `/ticket close`, `/claim`, `/add`, `/remove`    | Manage the current ticket                                       |
| `/serverinfo`, `/userinfo`, `/roleinfo`         | Server, member, and role details                                |
| `/channelinfo`, `/emojis`                       | Channel details and custom emoji/sticker lists                  |
| `/avatar`, `/banner`                            | Avatar and profile/server banner links                          |
| `/poll`                                         | Native Discord poll with 2–10 answers                           |
| `/remind set`, `/remind list`, `/remind cancel` | Database-backed reminders with DM fallback                      |
| `/timestamp`                                    | Convert durations, dates, or Unix times to Discord stamps       |
| `/embed`, `/announce`                           | Post a custom embed or announcement                             |

Every configuration write is recorded in `config_audit`.

## Free-tier warnings

- **bot-hosting.net free** requires manual renewal **every 4 days**. State lives in
  Supabase, so a restart is lossless.
- **Supabase free** pauses after 7 days of low activity. The bot writes a heartbeat every 6 hours.
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
