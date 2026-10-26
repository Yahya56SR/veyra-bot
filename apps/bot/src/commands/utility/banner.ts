import { BRAND } from '@veyra/shared';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferPublic } from '../../core/respond.js';

export const bannerCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('Show a user’s profile banner.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to inspect (defaults to you)'),
    ),
  category: 'utility',
  cooldownSeconds: 3,
  async execute({ interaction, guild }) {
    await deferPublic(interaction);

    const target = interaction.options.getUser('user') ?? interaction.user;
    const user = await target.fetch(true).catch(() => target);
    const member = await guild.members.fetch(target.id).catch(() => null);

    const global = user.bannerURL({ size: 1024, extension: 'png' }) ?? null;
    const server = member?.bannerURL({ size: 1024, extension: 'png' }) ?? null;

    if (!global && !server) {
      await interaction.editReply({ content: `${target} does not have a banner.` });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(`${target.username}’s banner`)
      .setImage(server ?? global);

    if (global) embed.addFields({ name: 'Profile banner', value: `[Open](${global})` });
    if (server) embed.addFields({ name: 'Server banner', value: `[Open](${server})` });

    await interaction.editReply({ embeds: [embed] });
  },
};
