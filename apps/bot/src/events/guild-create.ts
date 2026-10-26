import { ensureGuild } from '@veyra/db';
import { Events } from 'discord.js';
import { readSettings } from '../config/settings.js';
import type { BotEvent } from '../core/events.js';
import { applyPersonalizer } from '../modules/personalizer/service.js';

export const guildCreateEvent: BotEvent = {
  name: Events.GuildCreate,
  async execute(client, guild) {
    client.logger.info(
      { guildId: guild.id, name: guild.name, members: guild.memberCount },
      'joined a guild',
    );

    if (!client.db) return;

    try {
      await ensureGuild(client.db, {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        ownerId: guild.ownerId,
        memberCount: guild.memberCount,
      });
      const settings = await readSettings(client.db, guild.id);
      client.cacheSettings(guild.id, settings.config, settings.updatedAt);
      client.invalidatePremium(guild.id);
      await applyPersonalizer(client, guild, settings.config);
    } catch (error) {
      client.logger.error({ err: error, guildId: guild.id }, 'failed to initialise joined guild');
    }
  },
};
