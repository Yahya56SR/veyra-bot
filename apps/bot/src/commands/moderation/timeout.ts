import { cases } from '@nervana/db';
import { formatDuration, parseDuration } from '@nervana/shared';
import { and, eq } from 'drizzle-orm';
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { assertModeratable, fetchMember } from '../../modules/moderation/guards.js';
import { auditReason, finishModAction, requireDb } from '../../modules/moderation/service.js';
import { readDuration, readReason } from './shared.js';

const MAX_TIMEOUT_MS = 28 * 86_400_000;

export const timeoutCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Time out a member for a duration.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to time out').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('Examples: 10m, 2h, 7d (max 28d)')
        .setRequired(true),
    )
    .addStringOption((option) => option.setName('reason').setDescription('Why').setMaxLength(1000))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldownSeconds: 2,
  async execute({ client, interaction, guild, member }) {
    await deferEphemeral(interaction);

    const db = requireDb(client);
    const user = interaction.options.getUser('user', true);
    const raw = readDuration(interaction);
    const reason = readReason(interaction);

    const duration = raw ? parseDuration(raw) : null;
    if (duration === null || duration <= 0) {
      throw new UserFacingError('Invalid duration. Try `10m`, `2h`, or `7d`.');
    }
    if (duration > MAX_TIMEOUT_MS) {
      throw new UserFacingError('Timeouts cannot exceed 28 days.');
    }

    const target = await fetchMember(guild, user.id);
    if (!target) throw new UserFacingError('That member is not in this server.');

    assertModeratable(guild, member, target);

    await target.timeout(duration, auditReason(reason));

    await db
      .update(cases)
      .set({ active: false })
      .where(and(eq(cases.targetId, target.id), eq(cases.type, 'timeout'), eq(cases.active, true)));

    const row = await finishModAction(client, {
      type: 'timeout',
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason,
      durationMs: duration,
    });

    const until = Math.floor((Date.now() + duration) / 1000);
    await interaction.editReply({
      content: `Timed out ${target} for **${formatDuration(duration)}**, until <t:${until}:f> — case **#${row.id}**.`,
    });
  },
};
