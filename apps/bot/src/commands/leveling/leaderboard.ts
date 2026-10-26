import { members } from '@veyra/db';
import { BRAND, levelFromXp, truncate } from '@veyra/shared';
import { and, desc, eq } from 'drizzle-orm';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferPublic } from '../../core/respond.js';

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top 10 members by XP.'),
  category: 'leveling',
  cooldownSeconds: 5,
  async execute({ client, interaction }) {
    await deferPublic(interaction);

    const db = client.db;
    if (!db) {
      await interaction.editReply({ content: 'The database is not configured.' });
      return;
    }

    const rows = await db
      .select({ userId: members.userId, xp: members.xp })
      .from(members)
      .where(eq(members.guildId, interaction.guildId))
      .orderBy(desc(members.xp))
      .limit(10);

    if (rows.length === 0) {
      await interaction.editReply({ content: 'Nobody has earned XP yet.' });
      return;
    }

    const lines = rows.map((row, index) => {
      const level = levelFromXp(row.xp).level;
      return `**#${index + 1}** <@${row.userId}> — level ${level} · ${row.xp.toLocaleString()} XP`;
    });

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('XP leaderboard')
      .setDescription(truncate(lines.join('\n'), 4000))
      .setFooter({ text: BRAND.footer });

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
