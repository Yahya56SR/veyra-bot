import { cases, warnings } from '@veyra/db';
import { and, eq, inArray } from 'drizzle-orm';
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { fetchMember } from '../../modules/moderation/guards.js';
import { finishModAction, requireDb } from '../../modules/moderation/service.js';

export const clearWarningsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear all active warnings for a member.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to clear').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldownSeconds: 2,
  async execute({ client, interaction, guild }) {
    await deferEphemeral(interaction);

    const db = requireDb(client);
    const user = interaction.options.getUser('user', true);

    const target = await fetchMember(guild, user.id);
    if (!target) throw new UserFacingError('That member is not in this server.');

    const cleared = await db
      .update(warnings)
      .set({ active: false })
      .where(
        and(
          eq(warnings.guildId, interaction.guildId),
          eq(warnings.userId, user.id),
          eq(warnings.active, true),
        ),
      )
      .returning({ caseId: warnings.caseId });

    if (cleared.length === 0) {
      await interaction.editReply({ content: `${user} has no active warnings.` });
      return;
    }

    await db
      .update(cases)
      .set({ active: false })
      .where(
        inArray(
          cases.id,
          cleared.map((entry) => entry.caseId),
        ),
      );

    const row = await finishModAction(client, {
      guildId: interaction.guildId,
      type: 'warn-clear',
      targetId: user.id,
      moderatorId: interaction.user.id,
      reason: `Cleared ${cleared.length} active warning${cleared.length === 1 ? '' : 's'} (${cleared
        .map((entry) => `#${entry.caseId}`)
        .join(', ')})`,
    });

    await interaction.editReply({
      content: `Cleared **${cleared.length}** warning${cleared.length === 1 ? '' : 's'} for ${user} — case **#${row.id}**.`,
    });
  },
};
