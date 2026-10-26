import { BRAND } from '@veyra/shared';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferPublic } from '../../core/respond.js';

export const avatarCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a user’s avatar.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to inspect (defaults to you)'),
    ),
  category: 'utility',
  cooldownSeconds: 2,
  async execute({ interaction, guild }) {
    await deferPublic(interaction);

    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = await guild.members.fetch(user.id).catch(() => null);
    const global = user.displayAvatarURL({ size: 1024, extension: 'png' });
    const server = member?.avatarURL({ size: 1024, extension: 'png' }) ?? null;

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(`${user.username}’s avatar`)
      .setImage(server ?? global)
      .addFields({ name: 'Global avatar', value: `[Open](${global})` });

    if (server) {
      embed.addFields({ name: 'Server avatar', value: `[Open](${server})` });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
