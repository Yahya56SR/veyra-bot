import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { assertModeratable, fetchMember } from '../../modules/moderation/guards.js';
import { finishModAction } from '../../modules/moderation/service.js';
import { readReason } from './shared.js';

export const warnCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member and record a case.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to warn').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Why').setRequired(true).setMaxLength(1000),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldownSeconds: 2,
  async execute({ client, interaction, guild, member }) {
    await deferEphemeral(interaction);

    const user = interaction.options.getUser('user', true);
    const reason = readReason(interaction);

    const target = await fetchMember(guild, user.id);
    if (!target) throw new UserFacingError('That member is not in this server.');

    assertModeratable(guild, member, target);

    const row = await finishModAction(client, {
      guildId: interaction.guildId,
      type: 'warn',
      targetId: target.id,
      moderatorId: interaction.user.id,
      reason,
    });

    await interaction.editReply({ content: `Warned ${target} — case **#${row.id}**.` });
  },
};
