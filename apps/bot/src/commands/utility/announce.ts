import {
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

export const announceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Post an announcement, optionally pinging one role.')
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('Announcement text')
        .setRequired(true)
        .setMaxLength(2000),
    )
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Where to post (defaults to this channel)'),
    )
    .addRoleOption((option) =>
      option.setName('role').setDescription('Optional role to ping (never @everyone)'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  category: 'utility',
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.SendMessages],
  cooldownSeconds: 3,
  async execute({ interaction }) {
    await deferEphemeral(interaction);

    const channel = sendable(interaction.options.getChannel('channel') ?? interaction.channel);
    const message = interaction.options.getString('message', true).trim();
    const role = interaction.options.getRole('role');

    if (role?.managed) {
      throw new UserFacingError('That role is managed by an integration and cannot be pinged.');
    }
    if (role?.id === interaction.guildId) {
      throw new UserFacingError('Never @everyone. Pick a specific role.');
    }

    const content = role ? `${role} ${message}` : message;
    const sent = await channel.send({
      content,
      allowedMentions: { parse: [], roles: role ? [role.id] : [] },
    });

    await interaction.editReply({ content: `Announcement posted: ${sent.url}` });
  },
};
