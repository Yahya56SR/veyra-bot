import { BRAND, truncate } from '@nervana/shared';
import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { isLogIgnored, logEmbed, sendLog } from '../modules/logging/service.js';

export const messageBulkDeleteEvent: BotEvent = {
  name: Events.MessageBulkDelete,
  async execute(client, messages, channel) {
    if (!channel.guildId || channel.guildId !== client.env.GUILD_ID) return;
    if (isLogIgnored(client, channel.id)) return;

    const sample = [...messages.values()]
      .slice(0, 10)
      .map((message) => {
        const author = message.author?.username ?? 'Unknown';
        return `• **${author}**: ${truncate(message.content?.trim() || '*Not cached*', 90)}`;
      })
      .join('\n');

    const embed = logEmbed('Messages bulk deleted', BRAND.danger).addFields(
      { name: 'Channel', value: `<#${channel.id}>`, inline: true },
      { name: 'Count', value: String(messages.size), inline: true },
      { name: 'Sample', value: truncate(sample || '*No cached content*', 1024) },
    );

    await sendLog(client, 'messageBulkDelete', embed);
  },
};
