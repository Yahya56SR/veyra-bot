import { BRAND, truncate } from '@veyra/shared';
import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { isLogIgnored, logEmbed, sendLog } from '../modules/logging/service.js';

export const messageDeleteEvent: BotEvent = {
  name: Events.MessageDelete,
  async execute(client, message) {
    if (!message.inGuild() || message.author?.bot) return;
    const guildId = message.guildId;
    const config = await client.getConfig(guildId);
    if (isLogIgnored(config.logging, message.channelId, message.author?.id)) return;

    const embed = logEmbed('Message deleted', BRAND.danger).addFields(
      {
        name: 'Author',
        value: message.author
          ? `<@${message.author.id}> \`${message.author.id}\``
          : 'Unknown (not cached)',
        inline: true,
      },
      { name: 'Channel', value: `<#${message.channelId}>`, inline: true },
      {
        name: 'Content',
        value: truncate(message.content?.trim() || '*Not cached*', 1024),
      },
    );

    if (message.attachments && message.attachments.size > 0) {
      embed.addFields({
        name: 'Attachments',
        value: truncate(
          [...message.attachments.values()]
            .slice(0, 5)
            .map((attachment) => attachment.name)
            .join('\n'),
          1024,
        ),
      });
    }

    await sendLog(client, guildId, 'messageDelete', embed, config);
  },
};
