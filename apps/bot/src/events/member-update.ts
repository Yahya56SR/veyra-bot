import { BRAND, truncate } from '@nervana/shared';
import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { isLogIgnored, logEmbed, sendLog } from '../modules/logging/service.js';

export const guildMemberUpdateEvent: BotEvent = {
  name: Events.GuildMemberUpdate,
  async execute(client, oldMember, newMember) {
    if (newMember.guild.id !== client.env.GUILD_ID) return;
    if (newMember.user.bot) return;
    if (isLogIgnored(client, null, newMember.id)) return;
    if (oldMember.partial) return;

    const changes: string[] = [];

    if (oldMember.nickname !== newMember.nickname) {
      changes.push(
        `**Nickname:** ${oldMember.nickname ?? '*none*'} → ${newMember.nickname ?? '*none*'}`,
      );
    }

    const beforeRoles = new Set(oldMember.roles.cache.keys());
    const afterRoles = new Set(newMember.roles.cache.keys());
    const added = [...afterRoles].filter((id) => !beforeRoles.has(id));
    const removed = [...beforeRoles].filter((id) => !afterRoles.has(id));

    if (added.length > 0) {
      changes.push(`**Roles added:** ${added.map((id) => `<@&${id}>`).join(', ')}`);
    }
    if (removed.length > 0) {
      changes.push(`**Roles removed:** ${removed.map((id) => `<@&${id}>`).join(', ')}`);
    }

    const beforeTimeout = oldMember.communicationDisabledUntilTimestamp;
    const afterTimeout = newMember.communicationDisabledUntilTimestamp;
    if (beforeTimeout !== afterTimeout) {
      changes.push(
        afterTimeout
          ? `**Timed out until:** <t:${Math.floor(afterTimeout / 1000)}:F>`
          : '**Timeout removed**',
      );
    }

    if (changes.length === 0) return;

    const embed = logEmbed('Member updated', BRAND.info).addFields(
      { name: 'Member', value: `${newMember} \`${newMember.id}\``, inline: true },
      { name: 'Changes', value: truncate(changes.join('\n'), 1024) },
    );

    await sendLog(client, 'memberUpdate', embed);
  },
};
