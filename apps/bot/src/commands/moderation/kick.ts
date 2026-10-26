import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { assertModeratable, fetchMember } from '../../modules/moderation/guards.js';
import { auditReason, finishModAction } from '../../modules/moderation/service.js';
import { readReason } from './shared.js';

export const kickCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to kick').setRequired(true),
    )
    .addStringOption((option) => option.setName('reason').setDescription('Why').setMaxLength(1000))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  cooldownSeconds: 2,
  async execute({ client, interaction, guild, member }) {
    await deferEphemeral(interaction);

    const user = interaction.options.getUser('user', true);
    const reason = readReason(interaction);

    const target = await fetchMember(guild, user.id);
    if (!target) throw new UserFacingError('That member is not in this server.');

    assertModeratable(guild, member, target);

    await target.kick(auditReason(reason));

    const row = await finishModAction(client, {
      guildId: interaction.guildId,
      type: 'kick',
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason,
    });

    await interaction.editReply({ content: `Kicked ${user} — case **#${row.id}**.` });
  },
};
