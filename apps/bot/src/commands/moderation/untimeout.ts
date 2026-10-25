import { cases } from '@nervana/db';
import { and, eq } from 'drizzle-orm';
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { assertModeratable, fetchMember } from '../../modules/moderation/guards.js';
import { auditReason, finishModAction, requireDb } from '../../modules/moderation/service.js';
import { readReason } from './shared.js';

export const untimeoutCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a member’s timeout.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to un-timeout').setRequired(true),
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
    const reason = readReason(interaction);

    const target = await fetchMember(guild, user.id);
    if (!target) throw new UserFacingError('That member is not in this server.');

    assertModeratable(guild, member, target);

    if (!target.isCommunicationDisabled()) {
      throw new UserFacingError('That member is not currently timed out.');
    }

    await target.timeout(null, auditReason(reason));

    await db
      .update(cases)
      .set({ active: false })
      .where(and(eq(cases.targetId, target.id), eq(cases.type, 'timeout'), eq(cases.active, true)));

    const row = await finishModAction(client, {
      type: 'timeout-clear',
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason,
    });

    await interaction.editReply({
      content: `Removed the timeout from ${target} — case **#${row.id}**.`,
    });
  },
};
