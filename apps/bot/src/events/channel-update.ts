import { BRAND, truncate } from '@veyra/shared';
import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { isLogIgnored, logEmbed, sendLog } from '../modules/logging/service.js';

export const channelUpdateEvent: BotEvent = {
  name: Events.ChannelUpdate,
  async execute(client, oldChannel, newChannel) {
    if (newChannel.isDMBased() || !('guild' in oldChannel)) return;
    const guildId = newChannel.guild.id;
    const config = await client.getConfig(guildId);
    if (isLogIgnored(config.logging, newChannel.id)) return;

    const changes: string[] = [];

    if (oldChannel.name !== newChannel.name) {
      changes.push(`**Name:** ${oldChannel.name} → ${newChannel.name}`);
    }
    if (oldChannel.parentId !== newChannel.parentId) {
      changes.push(
        `**Category:** ${oldChannel.parentId ? `<#${oldChannel.parentId}>` : 'none'} → ${
          newChannel.parentId ? `<#${newChannel.parentId}>` : 'none'
        }`,
      );
    }
    if (oldChannel.position !== newChannel.position) {
      changes.push(`**Position:** ${oldChannel.position} → ${newChannel.position}`);
    }
    if (oldChannel.type !== newChannel.type) {
      changes.push(`**Type:** ${oldChannel.type} → ${newChannel.type}`);
    }

    if ('topic' in oldChannel && 'topic' in newChannel && oldChannel.topic !== newChannel.topic) {
      changes.push(
        `**Topic:** ${truncate(oldChannel.topic ?? '*none*', 300)} → ${truncate(
          newChannel.topic ?? '*none*',
          300,
        )}`,
      );
    }

    if ('nsfw' in oldChannel && 'nsfw' in newChannel && oldChannel.nsfw !== newChannel.nsfw) {
      changes.push(
        `**NSFW:** ${oldChannel.nsfw ? 'on' : 'off'} → ${newChannel.nsfw ? 'on' : 'off'}`,
      );
    }

    if (
      'rateLimitPerUser' in oldChannel &&
      'rateLimitPerUser' in newChannel &&
      oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser
    ) {
      changes.push(
        `**Slowmode:** ${oldChannel.rateLimitPerUser ?? 0}s → ${newChannel.rateLimitPerUser ?? 0}s`,
      );
    }

    if (changes.length === 0) return;

    const embed = logEmbed('Channel updated', BRAND.info).addFields(
      { name: 'Channel', value: `<#${newChannel.id}>`, inline: true },
      { name: 'Changes', value: truncate(changes.join('\n'), 1024) },
    );

    await sendLog(client, guildId, 'channelUpdate', embed, config);
  },
};
