import { cases } from '@nervana/db';
import { BRAND, truncate } from '@nervana/shared';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferEphemeral } from '../../core/respond.js';
import { caseLabel, requireDb, targetMention } from '../../modules/moderation/service.js';

const TYPES = [
  'warn',
  'warn-clear',
  'timeout',
  'timeout-clear',
  'kick',
  'ban',
  'unban',
  'softban',
  'purge',
  'slowmode',
] as const;

export const casesCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('cases')
    .setDescription('List recent moderation cases.')
    .addUserOption((option) => option.setName('user').setDescription('Filter by member'))
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Filter by case type')
        .addChoices(...TYPES.map((type) => ({ name: caseLabel(type), value: type }))),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldownSeconds: 3,
  async execute({ client, interaction }) {
    await deferEphemeral(interaction);

    const db = requireDb(client);
    const user = interaction.options.getUser('user');
    const type = interaction.options.getString('type');

    const filters: SQL[] = [];
    if (user) filters.push(eq(cases.targetId, user.id));
    if (type) filters.push(eq(cases.type, type));

    const rows = await db
      .select()
      .from(cases)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(cases.createdAt))
      .limit(10);

    if (rows.length === 0) {
      await interaction.editReply({ content: 'No cases matched those filters.' });
      return;
    }

    const lines = rows.map((row) => {
      const at = `<t:${Math.floor(row.createdAt.getTime() / 1000)}:R>`;
      return `**#${row.id}** · ${caseLabel(row.type)} · ${targetMention(row.type, row.targetId)} · ${at}`;
    });

    const embed = new EmbedBuilder()
      .setColor(BRAND.info)
      .setTitle('Recent cases')
      .setDescription(truncate(lines.join('\n'), 4000))
      .setFooter({ text: `${rows.length} result${rows.length === 1 ? '' : 's'}` });

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
