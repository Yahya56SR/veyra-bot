import { BRAND, truncate } from '@nervana/shared';
import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { isLogIgnored, logEmbed, sendLog } from '../modules/logging/service.js';

export const voiceUpdateEvent: BotEvent = {
  name: Events.VoiceStateUpdate,
  async execute(client, oldState, newState) {
    if (newState.guild.id !== client.env.GUILD_ID) return;

    const member = newState.member;
    if (!member || member.user.bot) return;

    client.stats?.handleVoiceState(oldState, newState);

    if (isLogIgnored(client, newState.channelId ?? oldState.channelId, member.id)) return;

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

    await sendLog(client, 'voiceUpdate', embed);
  },
};
