import { BRAND, truncate } from '@veyra/shared';
import { Events, PermissionsBitField } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { logEmbed, sendLog } from '../modules/logging/service.js';

export const roleUpdateEvent: BotEvent = {
  name: Events.GuildRoleUpdate,
  async execute(client, oldRole, newRole) {
    const guildId = newRole.guild.id;
    const config = await client.getConfig(guildId);
    if (!config.logging.enabled) return;

    const changes: string[] = [];

    if (oldRole.name !== newRole.name) {
      changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
    }
    if (oldRole.hexColor !== newRole.hexColor) {
      changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    }
    if (oldRole.hoist !== newRole.hoist) {
      changes.push(
        `**Hoisted:** ${oldRole.hoist ? 'yes' : 'no'} → ${newRole.hoist ? 'yes' : 'no'}`,
      );
    }
    if (oldRole.mentionable !== newRole.mentionable) {
      changes.push(
        `**Mentionable:** ${oldRole.mentionable ? 'yes' : 'no'} → ${newRole.mentionable ? 'yes' : 'no'}`,
      );
    }

    const before = BigInt(oldRole.permissions.bitfield);
    const after = BigInt(newRole.permissions.bitfield);
    if (before !== after) {
      const added = after & ~before;
      const removed = before & ~after;

      if (added !== 0n) {
        changes.push(
          `**Permissions added:** ${new PermissionsBitField(added).toArray().join(', ')}`,
        );
      }
      if (removed !== 0n) {
        changes.push(
          `**Permissions removed:** ${new PermissionsBitField(removed).toArray().join(', ')}`,
        );
      }
    }

    if (changes.length === 0) return;

    const embed = logEmbed('Role updated', BRAND.info).addFields(
      { name: 'Role', value: `<@&${newRole.id}> \`${newRole.id}\``, inline: true },
      { name: 'Changes', value: truncate(changes.join('\n'), 1024) },
    );

    await sendLog(client, guildId, 'roleUpdate', embed, config);
  },
};
