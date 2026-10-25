import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';

export const guildCreateEvent: BotEvent = {
  name: Events.GuildCreate,
  async execute(client, guild) {
    if (guild.id === client.env.GUILD_ID) {
      client.logger.info({ guildId: guild.id, name: guild.name }, 'joined the target guild');
      return;
    }

    client.logger.warn(
      { guildId: guild.id, name: guild.name, members: guild.memberCount },
      'joined an unauthorized guild — leaving',
    );

    await guild
      .leave()
      .catch((error: unknown) =>
        client.logger.error({ err: error, guildId: guild.id }, 'failed to leave guild'),
      );
  },
};
