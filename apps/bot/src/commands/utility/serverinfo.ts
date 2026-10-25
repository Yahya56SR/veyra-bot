import { BRAND } from '@nervana/shared';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferPublic } from '../../core/respond.js';

const VERIFICATION: Record<number, string> = {
  0: 'None',
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Very high',
};

export const serverInfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Show information about this server.'),
  category: 'utility',
  cooldownSeconds: 3,
  async execute({ interaction, guild }) {
    await deferPublic(interaction);

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Server ID', value: `\`${guild.id}\``, inline: true },
        {
          name: 'Created',
          value: `<t:${Math.floor(guild.createdAt.getTime() / 1000)}:F>`,
        },
        { name: 'Members', value: String(guild.memberCount), inline: true },
        { name: 'Channels', value: String(guild.channels.cache.size), inline: true },
        { name: 'Roles', value: String(guild.roles.cache.size), inline: true },
        { name: 'Emojis', value: String(guild.emojis.cache.size), inline: true },
        { name: 'Stickers', value: String(guild.stickers.cache.size), inline: true },
        {
          name: 'Boosts',
          value: `${guild.premiumSubscriptionCount ?? 0} (tier ${guild.premiumTier})`,
          inline: true,
        },
        {
          name: 'Verification',
          value: VERIFICATION[guild.verificationLevel] ?? String(guild.verificationLevel),
          inline: true,
        },
      )
      .setFooter({ text: `ID: ${guild.id}` });

    if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));
    if (guild.features.length > 0) {
      embed.addFields({
        name: 'Features',
        value: guild.features.join(', ').slice(0, 1024),
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
