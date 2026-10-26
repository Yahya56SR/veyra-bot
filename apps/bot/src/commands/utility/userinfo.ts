import { BRAND, truncate } from '@veyra/shared';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferPublic } from '../../core/respond.js';

export const userInfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a user or member.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to inspect (defaults to you)'),
    ),
  category: 'utility',
  cooldownSeconds: 3,
  async execute({ interaction, guild }) {
    await deferPublic(interaction);

    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = await guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(member?.displayName ?? user.username)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Username', value: `\`${user.username}\``, inline: true },
        { name: 'User ID', value: `\`${user.id}\``, inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        {
          name: 'Account created',
          value: `<t:${Math.floor(user.createdAt.getTime() / 1000)}:F> (<t:${Math.floor(
            user.createdAt.getTime() / 1000,
          )}:R>)`,
        },
      );

    if (member) {
      embed.addFields(
        {
          name: 'Joined server',
          value: `<t:${Math.floor(member.joinedAt?.getTime() ?? Date.now())}:F>${
            member.joinedAt
              ? ` (<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>)`
              : ' *(unknown)*'
          }`,
        },
        {
          name: 'Top role',
          value: member.roles.highest.id === guild.id ? 'None' : member.roles.highest.toString(),
          inline: true,
        },
        { name: 'Roles', value: String(Math.max(0, member.roles.cache.size - 1)), inline: true },
      );

      const roles = member.roles.cache
        .filter((role) => role.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map((role) => role.toString())
        .join(' ');

      if (roles) {
        embed.addFields({ name: 'Role list', value: truncate(roles, 1024) });
      }

      if (member.communicationDisabledUntilTimestamp) {
        embed.addFields({
          name: 'Timed out until',
          value: `<t:${Math.floor(member.communicationDisabledUntilTimestamp / 1000)}:F>`,
        });
      }
    }

    const flags = user.flags?.toArray() ?? [];
    if (flags.length > 0) {
      embed.addFields({ name: 'Badges', value: flags.join(', ').slice(0, 1024) });
    }

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
