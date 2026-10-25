import { PermissionFlagsBits, SlashCommandBuilder, type TextChannel } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { finishModAction } from '../../modules/moderation/service.js';
import { readReason } from './shared.js';

export const purgeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk-delete recent messages in this channel.')
    .addIntegerOption((option) =>
      option
        .setName('count')
        .setDescription('How many messages (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((option) =>
      option.setName('user').setDescription('Only delete messages from this member'),
    )
    .addStringOption((option) => option.setName('reason').setDescription('Why').setMaxLength(1000))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory],
  cooldownSeconds: 5,
  async execute({ client, interaction }) {
    await deferEphemeral(interaction);

    const count = interaction.options.getInteger('count', true);
    const user = interaction.options.getUser('user');
    const reason = readReason(interaction);

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !('bulkDelete' in channel)) {
      throw new UserFacingError('This channel does not support bulk deletion.');
    }

    const fetched = await channel.messages.fetch({ limit: user ? 100 : count });
    let messages = [...fetched.values()];
    if (user) messages = messages.filter((message) => message.author.id === user.id);
    messages = messages.slice(0, count);

    if (messages.length === 0) {
      throw new UserFacingError('No matching messages were found in the recent history.');
    }

    const deleted = await (channel as TextChannel).bulkDelete(messages, true);

    const row = await finishModAction(client, {
      type: 'purge',
      targetId: channel.id,
      moderatorId: interaction.user.id,
      reason: `Deleted ${deleted.size} message(s) in <#${channel.id}>${
        user ? ` from ${user.username}` : ''
      }. ${reason}`,
    });

    await interaction.editReply({
      content: `Deleted **${deleted.size}** message${deleted.size === 1 ? '' : 's'} — case **#${row.id}**.`,
    });
  },
};
