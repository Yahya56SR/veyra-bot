# Veyra

An all-in-one Discord bot for **any number of servers**: moderation, logging, utility, tickets,
leveling, economy, community features, music, usage stats, premium branding, and a Next.js
dashboard with a per-server control room.

> **Status:** the bot, dashboard, Stripe billing, and public site are implemented. Live
> Discord/Lavalink/Supabase/Stripe validation and production hardening remain. See
> `DEPLOY.md` for the deployment runbook.

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
| `apps/web`        | Public site + per-server Next.js dashboard                 |
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
# fill DISCORD_TOKEN, DISCORD_CLIENT_ID (DEV_GUILD_ID is optional)
npm run db:generate     # only when the schema changes
npm run dev
```

`/ping` and `/help` work without a database; leave `DATABASE_URL` empty and the bot logs a
warning and uses built-in defaults. `/setup`, moderation, logging, welcome, and leveling need
the database. For production, always configure the database.

Music is optional. Set `MUSIC_ENABLED=true`, `LAVALINK_URL`, and `LAVALINK_AUTH`, then run
`npm run check:lavalink -- host:port <password>` before enabling it with `/setup music`.
Without a reachable node, music commands report that music is unconfigured instead of failing
the bot.

The dashboard needs a database and a Discord OAuth application:

1. Add `http://localhost:3000/api/auth/callback` under **OAuth2 → General → Redirects**.
2. Fill `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`, and `DASHBOARD_URL` in `.env`.
   `DASHBOARD_URL` must be the public origin with no trailing slash. `DASHBOARD_ADMIN_IDS` is
   optional and only grants platform-staff access; normal dashboard users are authorized by
   Discord `Manage Server`.
3. Run the bot once so migrations create the tables and the guild rows, then `npm run dev:web`
   and open <http://localhost:3000>.
4. For premium, set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET`, then
   point a Stripe webhook at `${DASHBOARD_URL}/api/stripe/webhook`.

The dashboard loads the dashboard-relevant keys from the repository-root `.env` during local
development, so the bot and dashboard share one file without exposing the bot token to the web
process. On Vercel, set the same values as project environment variables instead.

Dashboard pages are server-rendered on every request and use the transaction-pooler
`DATABASE_URL`. The login flow requests `identify guilds`, lists servers where the user is the
owner or has `Manage Server`, and stores only hashed session tokens that expire after seven days.

### Scripts

| Command                                        | Action                                             |
| ---------------------------------------------- | -------------------------------------------------- |
| `npm run dev`                                  | Run the bot from TypeScript with watch mode        |
| `npm run dev:web`                              | Run the dashboard on <http://localhost:3000>       |
| `npm run build:web`                            | Production Next.js build                           |
| `npm run typecheck`                            | Typecheck every workspace                          |
| `npm test`                                     | Run unit tests                                     |
| `npm run bundle:bot`                           | Rebuild the committed `index.js`                   |
| `npm run verify:bundle`                        | Run the bundle in a clean directory and assert RSS |
| `npm run db:generate`                          | Generate SQL from the Drizzle schema               |
| `npm run db:migrate`                           | Apply pending migrations                           |
| `npm run check:lavalink -- host:port password` | Validate a Lavalink v4 node                        |

## Commands

| Command                                          | What it does                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `/ping`, `/help`                                 | Health check and permission-aware command list                   |
| `/premium`                                       | Premium status, price, and dashboard link for this server        |
| `/setup status`                                  | Overview of every module                                         |
| `/setup logging`, `/setup modlog`                | Route log events and moderation cases                            |
| `/setup automod`                                 | Toggle a rule and choose its action                              |
| `/setup link-allow`, `/setup filtered-word`      | Manage the links allowlist and filtered words                    |
| `/setup leveling`                                | Enable leveling and tune XP range, cooldown, announcements       |
| `/setup economy`                                 | Configure currency, daily/work rewards, and cooldowns            |
| `/setup music`                                   | Set the DJ role, default volume, queue limit, and 24/7 mode      |
| `/setup starboard`                               | Configure the starboard channel, threshold, and ignored channels |
| `/setup welcome`, `/setup autorole`              | Join/leave messages and automatic roles                          |
| `/setup exempt-role`, `/setup exempt-channel`    | Automod exemptions                                               |
| `/setup tickets`                                 | Set the category, staff role, panel, log, and open limit         |
| `/setup personalizer`                            | Premium nickname, embed colour, level-up, and panel copy         |
| `/setup reset`                                   | Restore one module to defaults                                   |
| `/warn`, `/warnings`, `/clearwarnings`           | Warning cases with active-warning tracking                       |
| `/timeout`, `/untimeout`                         | Discord timeouts up to 28 days                                   |
| `/kick`, `/ban`, `/unban`, `/softban`            | Punitive actions, optional temporary bans                        |
| `/case`, `/cases`                                | Inspect the case log                                             |
| `/purge`, `/slowmode`                            | Channel cleanup                                                  |
| `/rank`, `/leaderboard`                          | XP progress and top members                                      |
| `/balance`, `/daily`, `/work`, `/pay`, `/gamble` | Core economy commands                                            |
| `/shop`, `/buy`, `/inventory`, `/baltop`         | Shop, role purchases, inventory, and the rich list               |
| `/ecoadmin`                                      | Grant/set balances and manage shop items (Manage Server)         |
| `/ticket panel`                                  | Publish the button panel                                         |
| `/ticket close`, `/claim`, `/add`, `/remove`     | Manage the current ticket                                        |
| `/reactionrole`                                  | Classic reaction roles and select-menu panels                    |
| `/giveaway start`, `/end`, `/reroll`, `/list`    | Persistent button giveaways                                      |
| `/play`                                          | Queue a search or SoundCloud/Spotify/YouTube link                |
| `/pause`, `/resume`, `/skip`, `/stop`            | Basic playback control                                           |
| `/nowplaying`, `/queue`                          | Current track and paginated queue                                |
| `/volume`, `/loop`, `/shuffle`                   | Player volume, repeat mode, and queue shuffle                    |
| `/remove`, `/clear`, `/seek`, `/disconnect`      | Queue editing, seeking, and voice disconnect                     |
| `/stats`                                         | Server, message, voice, command, and music usage                 |
| `/serverinfo`, `/userinfo`, `/roleinfo`          | Server, member, and role details                                 |
| `/channelinfo`, `/emojis`                        | Channel details and custom emoji/sticker lists                   |
| `/avatar`, `/banner`                             | Avatar and profile/server banner links                           |
| `/poll`                                          | Native Discord poll with 2–10 answers                            |
| `/remind set`, `/remind list`, `/remind cancel`  | Database-backed reminders with DM fallback                       |
| `/timestamp`                                     | Convert durations, dates, or Unix times to Discord stamps        |
| `/embed`, `/announce`                            | Post a custom embed or announcement                              |

Every configuration write is recorded in `config_audit`.

## Dashboard

The dashboard is a Next.js App Router application in `apps/web`. It has a public marketing site
and a server-rendered, per-server control room.

| Page         | What it shows                                                      |
| ------------ | ------------------------------------------------------------------ |
| `/servers`   | Guild picker for servers the user can manage                       |
| Overview     | 30-day totals, 14-day chart, heartbeat, cases, tickets, audit tail |
| Activity     | 30/90-day message, command, voice, join, and music totals          |
| Moderation   | Filterable case list with target, moderator, reason, expiry, state |
| Members      | XP/level and balance leaderboards with participation totals        |
| Tickets      | Open queue, recent closed tickets, and the transcript viewer       |
| Settings     | Schema-validated JSON editor for every module                      |
| Premium      | Stripe Checkout, billing portal, and active grants                 |
| Personalizer | Premium nickname, colour, footer, thumbnail, and template copy     |
| Audit log    | Before/after values for the newest 50 configuration writes         |

Access uses Discord OAuth with `identify guilds`. A user can manage a server when Discord
reports them as owner or grants `Manage Server` (`ADMINISTRATOR` also works).
`DASHBOARD_ADMIN_IDS` is an optional platform-staff bypass for support and manual premium
grants; it is not needed for normal users. The bot token is never available to the dashboard.
Settings saves call the same transactional `updateModule` function as `/setup`; the bot picks
them up within 15 seconds. Ticket transcripts are served only to signed-in users with access to
the ticket's guild, with a CSP sandbox and `nosniff`.

Stripe webhooks are idempotent through `stripe_events`, and the guild entitlement is recomputed
from all active grants so retries, stacked subscriptions, and manual comps converge.

## Free-tier warnings

- **bot-hosting.net free** requires manual renewal **every 4 days**. State lives in
  Supabase, so a restart is lossless.
- **Supabase free** pauses after 7 days of low activity. The bot writes a heartbeat every 6 hours.
- **Music uses a public Lavalink node.** That operator proxies the guild's voice audio and
  can observe it. Set `MUSIC_ENABLED=false` if you do not trust the node, or self-host.
- **Vercel Hobby** is for non-commercial use. Once premium subscriptions are live, move the
  dashboard to Vercel Pro or another host that permits commercial projects.
- **A 256 MB bot host will not scale public music.** Keep the free tier while the bot is small;
  move the player to a dedicated host before music traffic grows.

## Security

- Never commit `.env` or paste tokens into chat/issues.
- Dashboard access uses Discord OAuth (`identify guilds`) and requires owner, `Manage Server`,
  or `Administrator` in the selected guild. `DASHBOARD_ADMIN_IDS` is only a platform-staff
  support/comp bypass.
- OAuth state is HMAC-signed and double-submitted through a short-lived cookie. Session
  cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` on HTTPS; only token hashes are stored.
- The bot does not leave guilds based on an environment allowlist; it serves every guild it is
  invited to and removes data through guild lifecycle events.

## License

MIT
