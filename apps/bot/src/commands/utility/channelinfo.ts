import { BRAND, truncate } from '@veyra/shared';
import { ChannelType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferPublic } from '../../core/respond.js';

export const channelInfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Show information about a channel.')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Channel to inspect (defaults to this one)'),
    ),
  category: 'utility',
  cooldownSeconds: 2,
  async execute({ interaction }) {
    await deferPublic(interaction);

    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    if (!channel) throw new UserFacingError('Could not resolve that channel.');

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(`#${channel.name}`)
      .addFields(
        { name: 'Channel ID', value: `\`${channel.id}\``, inline: true },
        { name: 'Type', value: String(ChannelType[channel.type]), inline: true },
        {
          name: 'Category',
          value: channel.parentId ? `<#${channel.parentId}>` : 'None',
          inline: true,
        },
      );

    if ('position' in channel) {
      embed.addFields({ name: 'Position', value: String(channel.position), inline: true });
    }

    if ('topic' in channel && channel.topic) {
      embed.addFields({ name: 'Topic', value: truncate(channel.topic, 1024) });
    }

    if ('rateLimitPerUser' in channel) {
      embed.addFields({
        name: 'Slowmode',
        value: channel.rateLimitPerUser ? `${channel.rateLimitPerUser}s` : 'Off',
        inline: true,
      });
    }

    if ('nsfw' in channel) {
      embed.addFields({ name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true });
    }

    if ('archived' in channel) {
      embed.addFields(
        { name: 'Archived', value: channel.archived ? 'Yes' : 'No', inline: true },
        { name: 'Locked', value: channel.locked ? 'Yes' : 'No', inline: true },
        { name: 'Owner', value: `<@${channel.ownerId}>`, inline: true },
      );
    }

    embed.addFields({
      name: 'Created',
      value: channel.createdAt
        ? `<t:${Math.floor(channel.createdAt.getTime() / 1000)}:F>`
        : 'Unknown',
    });

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
