import { markGuildLeft } from '@veyra/db';
import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';

export const guildDeleteEvent: BotEvent = {
  name: Events.GuildDelete,
  async execute(client, guild) {
    client.logger.info({ guildId: guild.id, name: guild.name }, 'left or lost a guild');
    client.settingsCache.delete(guild.id);
    client.invalidatePremium(guild.id);

    if (!client.db) return;
    await markGuildLeft(client.db, guild.id).catch((error: unknown) => {
      client.logger.warn({ err: error, guildId: guild.id }, 'failed to mark guild as left');
    });
  },
};
