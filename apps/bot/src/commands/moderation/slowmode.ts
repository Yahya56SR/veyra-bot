import { PermissionFlagsBits, SlashCommandBuilder, type TextChannel } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { auditReason, finishModAction } from '../../modules/moderation/service.js';
import { readReason } from './shared.js';

export const slowmodeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set a channel’s slowmode (0 disables it).')
    .addIntegerOption((option) =>
      option
        .setName('seconds')
        .setDescription('Seconds between messages (0–21600)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21_600),
    )
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Defaults to the current channel'),
    )
    .addStringOption((option) => option.setName('reason').setDescription('Why').setMaxLength(1000))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  cooldownSeconds: 3,
  async execute({ client, interaction }) {
    await deferEphemeral(interaction);

    const seconds = interaction.options.getInteger('seconds', true);
    const selected = interaction.options.getChannel('channel');
    const reason = readReason(interaction);

    const channel = selected ?? interaction.channel;
    if (!channel || !('setRateLimitPerUser' in channel)) {
      throw new UserFacingError('That channel does not support slowmode.');
    }

    await (channel as TextChannel).setRateLimitPerUser(seconds, auditReason(reason));

    const row = await finishModAction(client, {
      type: 'slowmode',
      targetId: channel.id,
      moderatorId: interaction.user.id,
      reason: `Set slowmode to ${seconds}s in <#${channel.id}>. ${reason}`,
      active: seconds > 0,
    });

    await interaction.editReply({
      content:
        seconds === 0
          ? `Slowmode disabled in <#${channel.id}> — case **#${row.id}**.`
          : `Slowmode set to **${seconds}s** in <#${channel.id}> — case **#${row.id}**.`,
    });
  },
};
