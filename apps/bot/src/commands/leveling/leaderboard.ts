import { members } from '@nervana/db';
import { BRAND, levelFromXp, truncate } from '@nervana/shared';
import { desc } from 'drizzle-orm';
import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top 10 members by XP.'),
  category: 'leveling',
  cooldownSeconds: 5,
  async execute({ client, interaction }) {
    const db = client.db;
    if (!db) {
      await interaction.reply({
        content: 'The database is not configured.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const rows = await db
      .select({ userId: members.userId, xp: members.xp })
      .from(members)
      .orderBy(desc(members.xp))
      .limit(10);

    if (rows.length === 0) {
      await interaction.reply({
        content: 'Nobody has earned XP yet.',
        flags: MessageFlags.Ephemeral,
      });
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

    await interaction.reply({ embeds: [embed] });
  },
};
