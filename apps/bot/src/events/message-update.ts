import { BRAND, truncate } from '@nervana/shared';
import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { isLogIgnored, logEmbed, sendLog } from '../modules/logging/service.js';

export const messageUpdateEvent: BotEvent = {
  name: Events.MessageUpdate,
  async execute(client, oldMessage, newMessage) {
    if (!newMessage.inGuild() || newMessage.guildId !== client.env.GUILD_ID) return;
    if (newMessage.author?.bot) return;
    if (isLogIgnored(client, newMessage.channelId, newMessage.author?.id)) return;

    const before = oldMessage.content ?? '';
    const after = newMessage.content ?? '';
    if (before === after) return;

    const jump = `https://discord.com/channels/${newMessage.guildId}/${newMessage.channelId}/${newMessage.id}`;

    const embed = logEmbed('Message edited', BRAND.warning).addFields(
      {
        name: 'Author',
        value: newMessage.author
          ? `<@${newMessage.author.id}> \`${newMessage.author.id}\``
          : 'Unknown',
        inline: true,
      },
      { name: 'Channel', value: `<#${newMessage.channelId}>`, inline: true },
      { name: 'Before', value: truncate(before.trim() || '*Not cached*', 1024) },
      { name: 'After', value: truncate(after.trim() || '*Empty*', 1024) },
      { name: 'Jump', value: `[Go to message](${jump})` },
    );

    await sendLog(client, 'messageEdit', embed);
  },
};
