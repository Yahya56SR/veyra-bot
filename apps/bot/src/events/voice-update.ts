import { BRAND, truncate } from '@veyra/shared';
import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { isLogIgnored, logEmbed, sendLog } from '../modules/logging/service.js';

export const voiceUpdateEvent: BotEvent = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    const guildId = newState.guild.id;
    const config = await client.getConfig(guildId);
    client.stats?.handleVoiceState(oldState, newState);

    if (isLogIgnored(config.logging, newState.channelId ?? oldState.channelId, member.id)) return;

    const changes: string[] = [];
    let title = 'Voice state updated';

    if (oldState.channelId !== newState.channelId) {
      if (!oldState.channelId && newState.channelId) title = 'Joined voice';
      else if (oldState.channelId && !newState.channelId) title = 'Left voice';
      else title = 'Moved voice';

      changes.push(
        `**Channel:** ${oldState.channelId ? `<#${oldState.channelId}>` : 'none'} → ${
          newState.channelId ? `<#${newState.channelId}>` : 'none'
        }`,
      );
    }

    const flags = [
      ['selfMute', 'Self mute'],
      ['selfDeaf', 'Self deafen'],
      ['serverMute', 'Server mute'],
      ['serverDeaf', 'Server deafen'],
    ] as const;

    for (const [key, name] of flags) {
      if (oldState[key] !== newState[key]) {
        changes.push(
          `**${name}:** ${oldState[key] ? 'on' : 'off'} → ${newState[key] ? 'on' : 'off'}`,
        );
      }
    }

    if (changes.length === 0) return;

    const embed = logEmbed(title, BRAND.info).addFields(
      { name: 'Member', value: `${member} \`${member.id}\``, inline: true },
      { name: 'Changes', value: truncate(changes.join('\n'), 1024) },
    );

    await sendLog(client, guildId, 'voiceUpdate', embed, config);
  },
};
