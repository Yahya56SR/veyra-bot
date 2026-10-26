# Deployment

Veyra is designed around free tiers. Nothing here uses Docker.

| Piece     | Host                                       | Free-tier constraint                |
| --------- | ------------------------------------------ | ----------------------------------- |
| Bot       | [bot-hosting.net](https://bot-hosting.net) | 256 MB, manual renewal every 4 days |
| Database  | [Supabase](https://supabase.com)           | pauses after 7 days of inactivity   |
| Dashboard | [Vercel](https://vercel.com) Hobby         | non-commercial use                  |
| Music     | public Lavalink v4 node                    | operator can observe voice audio    |

The bot is deployed as a **committed esbuild bundle**. The host runs only:

```bash
node index.js
```

There is no install or build step on the host. `index.js` and `drizzle/` must stay committed.

Current status: core, moderation, logging, welcome, leveling, automod, utility, reminders,
tickets, economy, community features, music, stats, the heartbeat, the public site, the
per-server dashboard, and Stripe billing are implemented. Final production smoke tests remain.

---

## 1. Discord application

1. Create an application at <https://discord.com/developers/applications>.
2. **Bot → Reset Token**, then copy the token into `.env` as `DISCORD_TOKEN`. Never paste it
   into chat, issues, or a commit.
3. Under **Bot → Privileged Gateway Intents**, enable:
   - **Server Members** (join/leave, role and timeout logs, moderation)
   - **Message Content** (automod, XP, message logs)
4. Copy **Application ID** into `DISCORD_CLIENT_ID`. `DEV_GUILD_ID` is optional and only
   registers commands in one guild for faster local iteration. Production commands are global.
5. Invite the bot with the `bot` and `applications.commands` scopes and these permissions:

   | Purpose         | Permissions                                                                               |
   | --------------- | ----------------------------------------------------------------------------------------- |
   | Basic operation | View Channels, Send Messages, Embed Links, Read Message History, Attach Files, Send Polls |
   | Moderation      | Manage Messages, Moderate Members, Kick Members, Ban Members                              |
   | Configuration   | Manage Channels, Manage Roles, Change Nickname                                            |
   | Community       | Add Reactions                                                                             |
   | Music           | Connect, Speak, Use Voice Activity                                                        |

   Use the OAuth2 URL generator; do not hand-build the permission integer.

6. Drag the bot's role **above** every role it must moderate or grant. Discord refuses role
   changes for roles at or above the bot's highest role.
7. For the dashboard, add the redirect `https://<your-dashboard>/api/auth/callback` under
   **OAuth2 → General**. The dashboard requests `identify guilds`; access to a server is
   checked with Discord's owner flag and `Manage Server` permission.
8. For premium billing, create a recurring Stripe price and a webhook pointing at
   `https://<your-dashboard>/api/stripe/webhook`. Subscribe to `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, and `invoice.payment_failed`.

---

## 2. Supabase

1. Create a project in a region close to the bot host.
2. Open **Project Settings → Database → Connection string** and copy two URIs:
   - **Transaction pooler**, port `6543` → `DATABASE_URL`
   - **Session pooler**, port `5432` → `MIGRATE_DATABASE_URL`
3. Both users look like `postgres.<project-ref>`; the database is `postgres`.
4. If the URI does not already contain `sslmode`, append `?sslmode=require`. The client also
   defaults remote connections to TLS, but being explicit avoids surprises.
5. Do **not** run SQL by hand. On first boot the bot applies every committed file in
   `drizzle/` inside a transaction guarded by `pg_advisory_xact_lock`.
6. Keep `SKIP_MIGRATIONS=false` in production. Each migration is applied once and recorded in
   `schema_migrations`; already-applied files are skipped on later boots.

Why two URLs: the transaction pooler cannot hold session-level state, while migrations and the
advisory lock are happiest on a session connection. Runtime queries use the transaction pooler;
startup DDL uses `MIGRATE_DATABASE_URL` when it differs.

The bot writes a heartbeat row every 6 hours so the free project does not pause after a week of
silence. Free Supabase has no point-in-time recovery; take an occasional logical backup:

```powershell
pg_dump "$env:MIGRATE_DATABASE_URL" --no-owner --no-privileges -f veyra-backup.sql
```

---

## 3. Bot host

1. Push this repository to GitHub.
2. In bot-hosting.net create a **Node.js** server from the repository, branch `main`.
3. Set the startup command to `node index.js`. Do not add an install or build step.
4. Select **Node 24**. The bundle targets Node 24 and the CI uses the same version.
5. Add the environment variables from `.env.example` in the host panel. At minimum:
   `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL`, and `MIGRATE_DATABASE_URL`.
   Set `DASHBOARD_URL` so `/premium` can link to the dashboard. Keep `MUSIC_ENABLED=false`
   until a Lavalink node is configured.
6. Start the server and read the logs. A healthy first boot logs the applied migration, the
   registered command count, and each guild it joins. There is no fixed guild allowlist; the
   bot serves every server that invites it.
7. Renew the free server **every 4 days**. Discord's developer portal shows the exact deadline;
   set a recurring reminder.

The first boot after a schema change applies new migrations automatically. Redeploy after
pulling a commit that changes `index.js` or `drizzle/`.

### Memory

The bundle usually idles well below 120 MB RSS. If the host reports OOM:

- Confirm only one process is running (no duplicated deployment).
- Keep `LOG_LEVEL=info`; `debug`/`trace` increase allocations.
- Leave `MUSIC_ENABLED=false` to avoid loading a Lavalink client and voice state.
- The XP buffer is capped at 5,000 members and message caches are bounded by the client.

`npm run verify:bundle` reproduces the clean-directory memory check with a real token.

---

## 4. Lavalink (music)

Music uses a public Lavalink v4 node, or one you self-host. The bot never runs ffmpeg or a
voice encoder; Lavalink does the audio work.

1. Pick a public Lavalink v4 node from a maintained list, or self-host with Java 17+.
2. Validate it before putting the password in `.env`:

   ```powershell
   npm run check:lavalink -- lavalink.example.com:2333 <password>
   ```

   A good node advertises `soundcloud`, `spotify`, and/or `youtube`. Searches prefer
   SoundCloud, then Spotify, then YouTube as a best-effort fallback.

3. Set `MUSIC_ENABLED=true`, `LAVALINK_URL` to `host:port` (no protocol; an `https://` URL also
   works), `LAVALINK_AUTH` to the password, and `LAVALINK_SECURE=true` when the node uses TLS.
4. Restart the bot, then run `/setup music enabled:true`. Optional settings include the DJ role,
   default volume, queue limit, and 24/7 mode. `/setup music` refuses to enable music when the
   environment is incomplete.
5. Spotify links and Spotify text search require the **LavaSrc** plugin. SoundCloud and YouTube
   work with Lavalink's built-in sources. If a source is missing, the bot falls back or reports
   that no playable tracks were found.
6. A public node's operator proxies the guild's audio and can observe it. If that is not
   acceptable, self-host Lavalink or set `MUSIC_ENABLED=false`.

`MUSIC_ENABLED=false` is a hard kill switch: it overrides the database, and `/setup music`
will not re-enable music until the environment flag is true and the bot is restarted.

The player leaves voice 30 seconds after the queue ends unless 24/7 mode is on. `/stop` and
`/disconnect` leave immediately.

---

## 5. Vercel dashboard

The dashboard is in `apps/web` and uses the same Supabase database as the bot.

1. Run the bot once first. Startup migrations create `users`, `sessions`, and the tables the
   dashboard reads. If the bot has not run, the dashboard shows its database error page.
2. Import the repository into Vercel Hobby.
3. Root directory: repository root (not `apps/web`).
4. Framework preset: **Next.js**.
5. Build command: `npm run build -w @veyra/web`.
6. Output directory: `apps/web/.next`.
7. Set **Node.js Version** to **24.x** (Project Settings → General).
8. Add these environment variables for Production (and Preview if used):

   | Variable                | Value                                                    |
   | ----------------------- | -------------------------------------------------------- |
   | `DATABASE_URL`          | Supabase transaction pooler, port `6543`, with TLS       |
   | `DISCORD_CLIENT_ID`     | Application ID                                           |
   | `DISCORD_CLIENT_SECRET` | OAuth2 client secret                                     |
   | `SESSION_SECRET`        | At least 32 random bytes, e.g. `openssl rand -base64 48` |
   | `DASHBOARD_URL`         | Exact public origin, e.g. `https://veyra.vercel.app`     |
   | `DASHBOARD_ADMIN_IDS`   | Optional platform-staff Discord IDs                      |
   | `STRIPE_SECRET_KEY`     | Stripe secret key                                        |
   | `STRIPE_PRICE_ID`       | Recurring premium price ID (`price_...`)                 |
   | `STRIPE_WEBHOOK_SECRET` | Signing secret for the webhook endpoint                  |

9. Set the Discord OAuth redirect to `${DASHBOARD_URL}/api/auth/callback`. The scheme, host,
   and path must match exactly. No trailing slash on `DASHBOARD_URL`.
10. Deploy, open `/servers`, sign in, and confirm you only see servers where you are owner or
    have `Manage Server`. A non-manager account should be redirected with `forbidden`.
11. Hobby is non-commercial. Premium billing makes the project commercial, so move to Vercel
    Pro or another host before enabling paid subscriptions in production.

Notes:

- The dashboard uses the transaction pooler with a pool of 3 per serverless instance.
  `prepare:false` is already set by the shared database client.
- Preview deployments need their own `DASHBOARD_URL` and matching Discord redirect URI. If you
  only use Production, leave preview variables unset or use the same production domain
  intentionally.
- Sessions expire after seven days. Logging out deletes the row, and expired rows are pruned on
  the next successful login.
- Settings writes use the same transaction and Zod validation as `/setup`. The bot polls
  `settings.updated_at` every 15 seconds.
- Ticket transcripts are returned only to signed-in users with access to the ticket's guild,
  with a CSP sandbox, `X-Content-Type-Options: nosniff`, and `Cache-Control: no-store`.
- For database access the dashboard reads only `DATABASE_URL`. The Vercel deployment never
  receives `DISCORD_TOKEN`, Lavalink credentials, or `MIGRATE_DATABASE_URL`.
- Stripe webhook events are de-duplicated in `stripe_events`, and the guild entitlement is
  recomputed from active grants. If processing fails (for example the database is unreachable),
  the endpoint returns `500` and Stripe retries.

---

## 6. First-run checklist

```
/ping                       # gateway, uptime, RSS
/help                       # commands visible to your role
/setup status               # configuration overview
/setup modlog #mod-log      # case output
/setup logging event:messageDelete channel:#logs
/setup logging event:memberJoin channel:#logs
/setup automod rule:invites enabled:true action:delete
/setup link-allow host:youtube.com
/setup filtered-word word:blockedword
/setup leveling enabled:true xp-min:15 xp-max:25 cooldown:60
/setup economy enabled:true
/setup music enabled:true volume:60 max-queue:100
/setup starboard channel:#starboard threshold:3
/setup welcome kind:join channel:#welcome
/setup autorole role:@Member
/setup tickets category:"Tickets" staff-role:@Staff panel-channel:#open-a-ticket log-channel:#ticket-logs
/ticket panel
```

Then send a few messages and run `/rank` and `/leaderboard`. If `/rank` shows no progress, check
that leveling is enabled and that the channel is not ignored.

Moderation smoke test in a private channel:

```
/warn @member reason:test
/warnings @member
/case 1
/timeout @member duration:5m reason:test
/untimeout @member
/ban @member duration:1h delete-days:0 reason:test
/cases type:Ban
/unban user-id:<id>
```

Temporary bans are lifted by a sweep that runs every 60 seconds. Manual unbans mark the original
ban case inactive.

Ticket smoke test:

```
/ticket panel                  # post buttons in the configured panel channel
# click a category button, send a message, then:
/ticket claim
/ticket add @member
/ticket remove @member
/ticket close reason:test
```

Closing writes a gzipped HTML transcript to `tickets.transcript`, sends it to the configured log
channel, and deletes the channel. A staff member must have Manage Channels to close a ticket.

Utility smoke test:

```
/remind set when:10m message:test
/remind list
/poll question:"Test?" options:"Yes|No" hours:1
/timestamp time:2h
/serverinfo
/userinfo
```

Economy and community smoke test:

```
/setup economy enabled:true
/daily
/work
/balance
/shop
/setup starboard channel:#starboard threshold:3
/giveaway start prize:"Test" duration:5m
```

Music smoke test (join a voice channel first):

```
/play query:lofi
/nowplaying
/queue
/pause
/resume
/volume percent:50
/loop mode:track
/seek time:0:30
/skip
/stop
```

If `/play` reports that music is unconfigured, check `MUSIC_ENABLED`, `LAVALINK_URL`,
`LAVALINK_AUTH`, and the node logs. If it reports no playable tracks for a Spotify link, the
node is missing the LavaSrc plugin.

Dashboard smoke test:

1. Open `DASHBOARD_URL`, sign in, and confirm `/servers` lists only servers you can manage.
2. Open Activity, Moderation, Members, Tickets, Settings, Premium, Personalizer, and Audit
   without console errors.
3. Save a harmless setting change (for example, toggle a leveling announcement) and confirm a
   new audit row appears.
4. Close one ticket, open its transcript from the Tickets page, and confirm it renders in a
   sandboxed tab.
5. Sign in with an account that lacks `Manage Server` and confirm `/servers?error=forbidden`
   instead of another server's dashboard.
6. Sign out and confirm `/` still renders the public site while the dashboard redirects to
   `/login`.

Premium smoke test (Stripe test mode):

1. Open `/g/<guildId>/premium` as a manager and start Checkout with a Stripe test card.
2. Confirm `checkout=success`, then verify the webhook writes `premium_subscriptions` and the
   guild dashboard shows Premium.
3. Replay the same Stripe event and confirm it is ignored as a duplicate.
4. Open the billing portal, cancel, and confirm access remains until the period end.
5. As a platform staff account, grant a manual comp and confirm the entitlement appears.

---

## 7. Operating notes

- **Settings changes** are audited in `config_audit`. The bot polls `settings.updated_at` every
  15 seconds; `/setup` and the dashboard apply changes within that window.
- **Dashboard sessions** live in Postgres. A database restore also restores sessions until they
  expire; delete `sessions` to force every operator to sign in again.
- **XP buffering:** XP is flushed every 30 seconds and on shutdown. A hard crash can lose up to
  30 seconds of XP. Cooldowns are persisted in `last_xp_at`.
- **Restarts** are safe: migrations skip applied files, the settings row is reused, and the
  temporary-ban sweep resumes from the database.
- **Reminders** are delivered by a 30-second database sweep. If a DM is blocked, the bot falls
  back to the channel where the reminder was created.
- **Music** queue state is in memory and is not restored after a restart. The player leaves
  voice 30 seconds after the queue ends unless `/setup music stay-247:true` is set. A configured
  DJ role is only enforced while more than one human is listening.
- **Token rotation:** reset the token in the Developer Portal, update the host secret, and
  redeploy. The old token is invalid immediately.
- **Disabling music:** set `MUSIC_ENABLED=false`. This overrides the database and does not
  require a settings change.
- **Logs:** JSON lines. Set `LOG_LEVEL=debug` only while diagnosing; switch back afterwards.
- **Database errors at boot:** verify both pooler URLs, the `postgres.<ref>` username, and TLS.
  A timeout on port 6543 usually means the pooler host or region is wrong.

---

## 8. Security boundaries

- `.env` is gitignored. The repository commits only the bundle, migrations, and source.
- The bot serves every guild it is invited to. Removing the bot marks the guild left and
  cascades guild-scoped cleanup through the schema.
- Dashboard access is Discord OAuth `identify guilds` plus an owner/`Manage Server` check per
  guild. `DASHBOARD_ADMIN_IDS` is only a platform-staff bypass. OAuth state is HMAC-signed and
  checked against a short-lived cookie.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` on HTTPS. The database stores
  only SHA-256 hashes of session tokens.
- Ticket transcripts are escaped when written by the bot and served to authorized users with a
  CSP sandbox and `nosniff`. Do not remove those headers.
- Stripe secrets stay in the dashboard deployment. The bot process never receives Stripe keys.
- Automod exemptions are for roles/channels, but members with **Manage Messages**, the server
  owner, and the bot itself are always exempt.
- Public Lavalink nodes are trusted infrastructure. Treat the node password like a secret.
