import { cases } from '@nervana/db';
import { and, eq } from 'drizzle-orm';
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { auditReason, finishModAction, requireDb } from '../../modules/moderation/service.js';
import { readReason } from './shared.js';

export const unbanCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID.')
    .addStringOption((option) =>
      option
        .setName('user-id')
        .setDescription('The banned user’s ID (17–20 digits)')
        .setRequired(true)
        .setMinLength(17)
        .setMaxLength(20),
    )
    .addStringOption((option) => option.setName('reason').setDescription('Why').setMaxLength(1000))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  cooldownSeconds: 2,
  async execute({ client, interaction, guild }) {
    await deferEphemeral(interaction);

    const db = requireDb(client);
    const userId = interaction.options.getString('user-id', true).trim();
    const reason = readReason(interaction);

    if (!/^\d{17,20}$/.test(userId)) {
      throw new UserFacingError('That is not a valid Discord user ID.');
    }
    if (userId === guild.ownerId) {
      throw new UserFacingError('The server owner cannot be banned or unbanned.');
    }

    const ban = await guild.bans.fetch(userId).catch(() => null);
    if (!ban) throw new UserFacingError('That user is not banned.');

    await guild.bans.remove(userId, auditReason(reason));

    await db
      .update(cases)
      .set({ active: false })
      .where(and(eq(cases.targetId, userId), eq(cases.type, 'ban'), eq(cases.active, true)));

    const row = await finishModAction(client, {
      type: 'unban',
      targetId: userId,
      moderatorId: interaction.user.id,
      reason,
    });

    await interaction.editReply({ content: `Unbanned <@${userId}> — case **#${row.id}**.` });
  },
};
