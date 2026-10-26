import { ensureGuild } from '@veyra/db';
import { Events } from 'discord.js';
import { readSettings, startSettingsPoller } from '../config/settings.js';
import { registerApplicationCommands } from '../core/commands.js';
import type { BotEvent } from '../core/events.js';
import { applyPersonalizer } from '../modules/personalizer/service.js';

export const readyEvent: BotEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    if (!client.user) return;

    client.logger.info(
      {
        user: client.user.tag,
        userId: client.user.id,
        guilds: client.guilds.cache.size,
        node: process.version,
        readyMs: Date.now() - client.startedAt,
      },
      'connected to Discord',
    );

    if (client.db) {
      const guilds = [...client.guilds.cache.values()];
      // A public bot can be in thousands of guilds. Initialise them in small
      // concurrent batches so first boot is not serialised by pooler latency.
      for (let index = 0; index < guilds.length; index += 8) {
        await Promise.all(
          guilds.slice(index, index + 8).map(async (guild) => {
            if (!client.db) return;
            try {
              await ensureGuild(client.db, {
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                ownerId: guild.ownerId,
                memberCount: guild.memberCount,
              });
              const settings = await readSettings(client.db, guild.id, (error) =>
                client.logger.warn({ err: error, guildId: guild.id }, 'invalid stored settings'),
              );
              client.cacheSettings(guild.id, settings.config, settings.updatedAt);
              await applyPersonalizer(client, guild, settings.config);
            } catch (error) {
              client.logger.error({ err: error, guildId: guild.id }, 'failed to initialise guild');
            }
          }),
        );
      }
    }

    try {
      await registerApplicationCommands(client);
    } catch (error) {
      client.logger.error({ err: error }, 'failed to register application commands');
    }

    if (client.db) startSettingsPoller(client);

    if (client.env.SMOKE_TEST) {
      const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      client.logger.info(
        {
          rssMb,
          readyMs: Date.now() - client.startedAt,
          guilds: client.guilds.cache.size,
          commands: client.commands.size,
        },
        'SMOKE_TEST_READY',
      );
      // Destroy first, then exit a beat later: calling process.exit while
      // websocket handles are closing can trip a libuv assertion on Windows.
      setTimeout(() => {
        void client
          .destroy()
          .catch(() => {})
          .finally(() => setTimeout(() => process.exit(0), 250));
      }, 500);
    }
  },
};
