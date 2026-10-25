# Deployment

Nervana is designed around free tiers. Nothing here uses Docker.

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

Current status: core, moderation, logging, welcome, leveling, automod, and the heartbeat are
implemented. Utility, tickets, economy, community, music, stats, and the dashboard are still
being built.

---

## 1. Discord application

1. Create an application at <https://discord.com/developers/applications>.
2. **Bot → Reset Token**, then copy the token into `.env` as `DISCORD_TOKEN`. Never paste it
   into chat, issues, or a commit.
3. Under **Bot → Privileged Gateway Intents**, enable:
   - **Server Members** (join/leave, role and timeout logs, moderation)
   - **Message Content** (automod, XP, message logs)
4. Copy **Application ID** into `DISCORD_CLIENT_ID` and your server ID into `GUILD_ID`.
   Enable Discord's Developer Mode to copy the server ID.
5. Invite the bot with the `bot` and `applications.commands` scopes and these permissions:

   | Purpose         | Permissions                                                     |
   | --------------- | --------------------------------------------------------------- |
   | Basic operation | View Channels, Send Messages, Embed Links, Read Message History |
   | Moderation      | Manage Messages, Moderate Members, Kick Members, Ban Members    |
   | Configuration   | Manage Channels, Manage Roles                                   |
   | Community       | Add Reactions                                                   |
   | Music (later)   | Connect, Speak, Use Voice Activity                              |

   Use the OAuth2 URL generator; do not hand-build the permission integer.

6. Drag the bot's role **above** every role it must moderate or grant. Discord refuses role
   changes for roles at or above the bot's highest role.
7. For the dashboard (Phase 6), add the redirect
   `https://<your-dashboard>/api/auth/callback` under **OAuth2 → General**.

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
pg_dump "$env:MIGRATE_DATABASE_URL" --no-owner --no-privileges -f nervana-backup.sql
```

---

## 3. Bot host

1. Push this repository to GitHub.
2. In bot-hosting.net create a **Node.js** server from the repository, branch `main`.
3. Set the startup command to `node index.js`. Do not add an install or build step.
4. Select **Node 24**. The bundle targets Node 24 and the CI uses the same version.
5. Add the environment variables from `.env.example` in the host panel. At minimum:
   `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `GUILD_ID`, `DATABASE_URL`, `MIGRATE_DATABASE_URL`.
   Keep `MUSIC_ENABLED=false` until a Lavalink node is configured.
6. Start the server and read the logs. A healthy first boot logs the applied migration, the
   settings row, the target guild, and the registered command count.
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

## 4. Lavalink (music, later)

Music is not wired up yet, but the node contract is ready.

1. Pick a public Lavalink v4 node from a maintained list, or self-host.
2. Validate it before putting the password in `.env`:

   ```powershell
   npm run check:lavalink -- lavalink.example.com:2333 <password>
   ```

   A good node advertises `soundcloud`, `spotify`, and/or `youtube`. Prefer SoundCloud, then
   Spotify, then YouTube.

3. Set `LAVALINK_URL` to `host:port` (no protocol), `LAVALINK_AUTH` to the password, and
   `LAVALINK_SECURE=true` when the node uses TLS.
4. A public node's operator proxies the guild's audio and can observe it. If that is not
   acceptable, self-host Lavalink with Java 17+ and set `MUSIC_ENABLED=false` until it is ready.
   Spotify requires the LavaSrc plugin; SoundCloud and YouTube work with Lavalink's built-in
   sources.

---

## 5. Vercel dashboard (Phase 6)

These steps are prepared but the `apps/web` workspace does not exist yet.

- Import the repository into Vercel Hobby.
- Root directory: repository root.
- Build command: `npm run build -w apps/web`.
- Output directory: `apps/web/.next`.
- Add `DATABASE_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`,
  `DASHBOARD_ADMIN_IDS`, and `DASHBOARD_URL`.
- Set the Discord OAuth redirect to `https://<deployment>/api/auth/callback`.
- Hobby is non-commercial; a private community server qualifies.

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
/setup welcome kind:join channel:#welcome
/setup autorole role:@Member
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

---

## 7. Operating notes

- **Settings changes** are audited in `config_audit`. The bot polls `settings.updated_at` every
  15 seconds; `/setup` applies changes immediately.
- **XP buffering:** XP is flushed every 30 seconds and on shutdown. A hard crash can lose up to
  30 seconds of XP. Cooldowns are persisted in `last_xp_at`.
- **Restarts** are safe: migrations skip applied files, the settings row is reused, and the
  temporary-ban sweep resumes from the database.
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
- The bot leaves every guild whose ID is not `GUILD_ID`.
- Dashboard access is Discord OAuth `identify` plus a `DASHBOARD_ADMIN_IDS` allowlist; there is
  no guild picker and no `Manage Server` requirement.
- Transcripts and user content must be escaped before rendering in the dashboard.
- Automod exemptions are for roles/channels, but members with **Manage Messages**, the server
  owner, and the bot itself are always exempt.
- Public Lavalink nodes are trusted infrastructure. Treat the node password like a secret.
