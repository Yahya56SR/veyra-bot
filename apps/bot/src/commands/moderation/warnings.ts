import { cases, warnings } from '@nervana/db';
import { BRAND, truncate } from '@nervana/shared';
import { and, desc, eq } from 'drizzle-orm';
import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferEphemeral } from '../../core/respond.js';
import { requireDb } from '../../modules/moderation/service.js';

export const warningsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('List a member’s active warnings.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to inspect').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldownSeconds: 2,
  async execute({ client, interaction }) {
    await deferEphemeral(interaction);

    const db = requireDb(client);
    const user = interaction.options.getUser('user', true);

    const rows = await db
      .select({
        caseId: warnings.caseId,
        reason: cases.reason,
        createdAt: cases.createdAt,
        moderatorId: cases.moderatorId,
      })
      .from(warnings)
      .innerJoin(cases, eq(warnings.caseId, cases.id))
      .where(and(eq(warnings.userId, user.id), eq(warnings.active, true)))
      .orderBy(desc(cases.createdAt))
      .limit(20);

    if (rows.length === 0) {
      await interaction.editReply({ content: `${user} has no active warnings.` });
      return;
    }

    const lines = rows.map((row) => {
      const at = `<t:${Math.floor(row.createdAt.getTime() / 1000)}:d>`;
      return `**#${row.caseId}** ${at} · <@${row.moderatorId}>\n${truncate(row.reason, 180)}`;
    });

    const embed = new EmbedBuilder()
      .setColor(BRAND.warning)
      .setTitle(`Active warnings · ${user.username}`)
      .setDescription(truncate(lines.join('\n\n'), 4000))
      .setFooter({ text: `${rows.length} active warning${rows.length === 1 ? '' : 's'}` });

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
