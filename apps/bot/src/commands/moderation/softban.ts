import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferEphemeral } from '../../core/respond.js';
import {
  assertBannableId,
  assertModeratable,
  fetchMember,
} from '../../modules/moderation/guards.js';
import { auditReason, finishModAction } from '../../modules/moderation/service.js';
import { readReason } from './shared.js';

export const softbanCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and immediately unban a user to delete recent messages.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to softban').setRequired(true),
    )
    .addStringOption((option) => option.setName('reason').setDescription('Why').setMaxLength(1000))
    .addIntegerOption((option) =>
      option
        .setName('delete-days')
        .setDescription('Delete this many days of recent messages (default 7)')
        .setMinValue(0)
        .setMaxValue(7),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  cooldownSeconds: 2,
  async execute({ client, interaction, guild, member }) {
    await deferEphemeral(interaction);

    const user = interaction.options.getUser('user', true);
    const reason = readReason(interaction);
    const deleteDays = interaction.options.getInteger('delete-days') ?? 7;

    assertBannableId(guild, member, user.id);

    const target = await fetchMember(guild, user.id);
    if (target) assertModeratable(guild, member, target);

    await guild.bans.create(user.id, {
      reason: auditReason(`Softban: ${reason}`),
      deleteMessageSeconds: deleteDays * 86_400,
    });
    await guild.bans.remove(user.id, 'Softban completed');

    const row = await finishModAction(client, {
      guildId: interaction.guildId,
      type: 'softban',
      targetId: user.id,
      moderatorId: interaction.user.id,
      reason,
    });

    await interaction.editReply({
      content: `Softbanned ${user} and removed ${deleteDays} day(s) of messages — case **#${row.id}**.`,
    });
  },
};
