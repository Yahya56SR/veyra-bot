import { Events } from 'discord.js';
import { startSettingsPoller } from '../config/settings.js';
import type { BotEvent } from '../core/events.js';

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

    // Enforce the single-guild rule for servers the bot was added to while offline.
    for (const guild of client.guilds.cache.values()) {
      if (guild.id === client.env.GUILD_ID) continue;
      client.logger.warn(
        { guildId: guild.id, name: guild.name },
        'leaving guild that is not GUILD_ID',
      );
      await guild
        .leave()
        .catch((error: unknown) =>
          client.logger.error({ err: error, guildId: guild.id }, 'failed to leave guild'),
        );
    }

    const guild = client.guilds.cache.get(client.env.GUILD_ID);
    if (!guild) {
      client.logger.warn(
        { guildId: client.env.GUILD_ID },
        'bot is not a member of GUILD_ID — invite it before using commands',
      );
    } else {
      client.logger.info(
        { guild: guild.name, members: guild.memberCount },
        'target guild resolved',
      );
    }

    if (client.env.REGISTER_COMMANDS && client.application) {
      try {
        const payload = [...client.commands.values()].map((command) => command.data.toJSON());
        await client.application.commands.set(payload, client.env.GUILD_ID);
        client.logger.info({ count: payload.length }, 'registered guild commands');
      } catch (error) {
        client.logger.error({ err: error }, 'failed to register guild commands');
      }
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
