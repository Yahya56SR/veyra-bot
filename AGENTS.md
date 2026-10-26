# AGENTS.md

Multi-server Discord bot (`apps/bot`) + public Next.js site and per-guild dashboard
(`apps/web`) sharing one Postgres database. npm workspaces; Node 24+ required.

## Committed build artifacts - the main gotcha

The bot host runs only `node index.js` with no install/build step, so two artifacts are committed:

- `index.js` - esbuild bundle of `apps/bot/src` **and** `packages/{db,shared}/src`
- `drizzle/` - SQL migrations generated from `packages/db/src/schema.ts`

After changing any bot/shared/db source: `npm run bundle:bot` and commit `index.js`.
After changing `schema.ts`: `npm run db:generate`, then commit the new `drizzle/*.sql`.
CI fails if `git status --porcelain -- index.js drizzle` is non-empty. Never hand-edit
`index.js`, never add it or `drizzle/` to `.gitignore`, and never edit an already-applied
migration - add a new one.

## Commands

```powershell
npm install
Copy-Item .env.example .env   # fill DISCORD_TOKEN and DISCORD_CLIENT_ID; DEV_GUILD_ID optional
npm run dev                   # bot from TS, watch mode
npm run dev:web               # dashboard on http://localhost:3000
npm run typecheck             # all workspaces
npm test                      # all unit tests
npx vitest run apps/bot/src/modules/economy/service.test.ts   # one test file
npm run bundle:bot
npm run verify:bundle         # needs real .env + live Discord token; checks RSS <= 120 MB
npm run build:web
```

CI order is `typecheck -> test -> build:web -> bundle:bot -> stale-artifact check`.
There is no lint script. Format with `npx prettier --write <files>` (single quotes, 100 cols, LF).

## Architecture

- All workspaces consume TypeScript sources directly; there is no package build step.
  `@veyra/db` and `@veyra/shared` are exported from `src/`. Imports use `.js` specifiers
  even in `.ts` files (e.g. `./config/env.js`); keep that style.
- Bot startup order in `apps/bot/src/index.ts` matters: env -> migrations -> client ->
  services -> `login()` -> music/reminders/giveaways start. Register cleanup in both the
  shutdown and startup-error paths.
- Commands are a **static** array in `apps/bot/src/commands/index.ts`; a new command must be
  added there or esbuild will drop it. Dynamic filesystem loading breaks the bundle.
- Slash-command gating, permissions, cooldowns, premium checks, and error replies live in
  `core/interaction-handler.ts`; implement behaviors in the `Command` shape
  (`core/commands.ts`) rather than duplicating checks.
- Tests are colocated `*.test.ts` under `apps/**` and `packages/**` and are pure unit tests
  (no database or Discord connection).
- Without `DATABASE_URL` (or with `SMOKE_TEST=true`) the bot boots on built-in defaults; only
  `/ping`-style work is meaningful. `SKIP_MIGRATIONS=true` still connects to the database.

## Multi-tenant data and configuration

- `packages/shared/src/config.ts` is the source of truth for every module schema,
  `DEFAULT_CONFIG`, and merge/validation. Add config fields there first, then expose them in
  `/setup` and the dashboard.
- `guilds` is the tenant boundary. Every feature table carries `guild_id`; IDs are Discord
  snowflakes kept as strings.
- `settings` is one row per guild. All config writes must go through `updateModule` /
  `resetModule` in `packages/db/src/settings.ts` with the guild ID; they transactionally lock
  the row, validate with Zod, and insert a `config_audit` row.
- The bot polls `settings.updated_at` every 15 s. Dashboard/`/setup` changes are not immediate.
- Premium is per guild. `recomputeGuildPremium` derives the guild entitlement from active
  `premium_subscriptions`; Stripe webhooks and manual comps both go through it.
- Stripe webhook events are de-duplicated in `stripe_events` before applying entitlements.
- `DATABASE_URL` = transaction pooler (6543) for runtime; `MIGRATE_DATABASE_URL` = session
  pooler (5432) for DDL/migrations. `createDatabase` already sets `prepare: false` and defaults
  to TLS for non-local hosts.
- Migrations run automatically at boot under `pg_advisory_xact_lock` and are recorded in
  `schema_migrations`. `npm run db:migrate` applies pending files manually.
- `MUSIC_ENABLED=false` is a hard environment override of the database setting; do not remove it.

## Dashboard and site

- `apps/web` is public marketing pages plus a per-guild dashboard under `/g/[guildId]`.
  `/servers` is the guild picker.
- Auth is Discord OAuth (`identify guilds`). Access to a guild requires owner, `Manage Server`,
  or `Administrator`; `DASHBOARD_ADMIN_IDS` is only a platform-staff support/comp bypass.
- `apps/web/src/lib/load-env.ts` copies only a fixed allowlist of keys from the root `.env`
  during local dev. Do not pass `DISCORD_TOKEN`, `MIGRATE_DATABASE_URL`, Lavalink secrets, or
  Stripe secrets into the bot bundle.
- Next runs with `--webpack` deliberately; the config aliases `.js` imports to `.ts` so
  workspace sources resolve. `postgres` is externalized.
- Vercel uses the repo root as root directory, build `npm run build -w @veyra/web`,
  output `apps/web/.next`. It reads only `DATABASE_URL` from the database variables.
- Keep the transcript route's per-guild access check, CSP sandbox, `nosniff`, and `no-store`
  headers.
- Stripe Checkout, the billing portal, and the webhook live under `apps/web`; the bot never
  receives Stripe secrets.

## Constraints

- Production is a 256 MB host: keep runtime dependencies and in-memory buffers small; don't
  add unbounded caches. `bundle:bot` enforces a 20 MB bundle gate.
- IDs are Discord snowflakes kept as strings end-to-end; do not convert them to numbers.
- The bot serves every guild that invites it; there is no `GUILD_ID` allowlist. Handle guild
  create/delete lifecycle events instead.
- Never commit `.env` or paste tokens into code, logs, or responses.
