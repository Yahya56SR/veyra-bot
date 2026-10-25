import { BRAND, truncate } from '@nervana/shared';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferPublic } from '../../core/respond.js';

export const roleInfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Show information about a role.')
    .addRoleOption((option) =>
      option.setName('role').setDescription('Role to inspect').setRequired(true),
    ),
  category: 'utility',
  cooldownSeconds: 2,
  async execute({ interaction }) {
    await deferPublic(interaction);

    const role = interaction.options.getRole('role', true);
    const permissions = role.permissions.toArray();

    const embed = new EmbedBuilder()
      .setColor(role.color || BRAND.color)
      .setTitle(role.name)
      .addFields(
        { name: 'Role ID', value: `\`${role.id}\``, inline: true },
        { name: 'Color', value: `\`${role.hexColor}\``, inline: true },
        { name: 'Position', value: String(role.position), inline: true },
        { name: 'Members (cached)', value: String(role.members.size), inline: true },
        { name: 'Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: 'Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: 'Managed', value: role.managed ? 'Yes' : 'No', inline: true },
        {
          name: 'Created',
          value: `<t:${Math.floor(role.createdAt.getTime() / 1000)}:F>`,
        },
        {
          name: `Permissions (${permissions.length})`,
          value: truncate(permissions.join(', ') || 'None', 1024),
        },
      );

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
