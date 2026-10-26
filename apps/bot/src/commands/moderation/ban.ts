import { formatDuration, parseDuration } from '@veyra/shared';
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import {
  assertBannableId,
  assertModeratable,
  fetchMember,
} from '../../modules/moderation/guards.js';
import { auditReason, finishModAction } from '../../modules/moderation/service.js';
import { readDuration, readReason } from './shared.js';

export const banCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user, optionally for a limited time.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to ban').setRequired(true),
    )
    .addStringOption((option) => option.setName('reason').setDescription('Why').setMaxLength(1000))
    .addStringOption((option) =>
      option.setName('duration').setDescription('Optional: 7d, 12h, 30m (max 365d)'),
    )
    .addIntegerOption((option) =>
      option
        .setName('delete-days')
        .setDescription('Delete this many days of their recent messages (0–7)')
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
    const rawDuration = readDuration(interaction);
    const deleteDays = interaction.options.getInteger('delete-days') ?? 0;

    assertBannableId(guild, member, user.id);

    const target = await fetchMember(guild, user.id);
    if (target) assertModeratable(guild, member, target);

    const duration = rawDuration ? parseDuration(rawDuration) : null;
    if (rawDuration && (duration === null || duration <= 0)) {
      throw new UserFacingError('Invalid duration. Try `1d`, `12h`, or `30m`.');
    }

    await guild.bans.create(user.id, {
      reason: auditReason(reason),
      deleteMessageSeconds: deleteDays * 86_400,
    });

    const row = await finishModAction(client, {
      guildId: interaction.guildId,
      type: 'ban',
      targetId: user.id,
      moderatorId: interaction.user.id,
      reason,
      durationMs: duration,
    });

    await interaction.editReply({
      content: duration
        ? `Banned ${user} for **${formatDuration(duration)}** — case **#${row.id}**.`
        : `Banned ${user} — case **#${row.id}**.`,
    });
  },
};
