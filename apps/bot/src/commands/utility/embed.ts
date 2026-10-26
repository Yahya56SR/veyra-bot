import { BRAND } from '@veyra/shared';
import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildBasedChannel,
  type SendableChannels,
} from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';

function sendable(channel: GuildBasedChannel | null): SendableChannels {
  if (!channel?.isSendable()) {
    throw new UserFacingError('Pick a text channel.');
  }
  return channel;
}

export const embedCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Post a custom embed.')
    .addStringOption((option) =>
      option
        .setName('description')
        .setDescription('Embed body')
        .setRequired(true)
        .setMaxLength(4000),
    )
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Where to post (defaults to this channel)'),
    )
    .addStringOption((option) =>
      option.setName('title').setDescription('Embed title').setMaxLength(256),
    )
    .addStringOption((option) =>
      option.setName('color').setDescription('Hex color, e.g. 8b5cf6').setMaxLength(7),
    )
    .addStringOption((option) =>
      option.setName('footer').setDescription('Footer text').setMaxLength(2048),
    )
    .addStringOption((option) =>
      option.setName('image').setDescription('Image URL').setMaxLength(2048),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  category: 'utility',
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  cooldownSeconds: 3,
  async execute({ interaction }) {
    await deferEphemeral(interaction);

    const channel = sendable(interaction.options.getChannel('channel') ?? interaction.channel);
    const description = interaction.options.getString('description', true);
    const title = interaction.options.getString('title')?.trim() || null;
    const footer = interaction.options.getString('footer')?.trim() || null;
    const image = interaction.options.getString('image')?.trim() || null;
    const colorInput = interaction.options.getString('color')?.trim() || null;

    let color: number | null = null;
    if (colorInput) {
      if (!/^#?[0-9a-f]{6}$/i.test(colorInput)) {
        throw new UserFacingError('Color must be a six-digit hex value such as `8b5cf6`.');
      }
      color = Number.parseInt(colorInput.replace('#', ''), 16);
    }

    const embed = new EmbedBuilder().setColor(color ?? BRAND.color).setDescription(description);

    if (title) embed.setTitle(title);
    if (footer) embed.setFooter({ text: footer });
    if (image) embed.setImage(image);

    const message = await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
    await interaction.editReply({ content: `Embed posted: ${message.url}` });
  },
};
