import { members } from '@nervana/db';
import { BRAND, levelFromXp, progressBar } from '@nervana/shared';
import { count, eq, gt } from 'drizzle-orm';
import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';

export const rankCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show a member’s level and XP progress.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to look up (defaults to you)'),
    ),
  category: 'leveling',
  async execute({ client, interaction }) {
    const db = client.db;
    if (!db) {
      await interaction.reply({
        content: 'The database is not configured.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const target = interaction.options.getUser('user') ?? interaction.user;

    const rows = await db
      .select({ xp: members.xp, messages: members.messages })
      .from(members)
      .where(eq(members.userId, target.id))
      .limit(1);

    const xp = rows[0]?.xp ?? 0;
    const messageCount = rows[0]?.messages ?? 0;
    const progress = levelFromXp(xp);

    const rankRows = await db
      .select({ value: count() })
      .from(members)
      .where(gt(members.xp, xp));
    const rank = (rankRows[0]?.value ?? 0) + 1;

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setAuthor({ name: target.username, iconURL: target.displayAvatarURL({ size: 128 }) })
      .setTitle(`Level ${progress.level}`)
      .setDescription(
        `${progressBar(progress.current, progress.needed, 14)}\n` +
          `${progress.current.toLocaleString()} / ${progress.needed.toLocaleString()} XP to level ${progress.level + 1}`,
      )
      .addFields(
        { name: 'Rank', value: `#${rank}`, inline: true },
        { name: 'Total XP', value: xp.toLocaleString(), inline: true },
        { name: 'Messages', value: messageCount.toLocaleString(), inline: true },
      )
      .setFooter({ text: BRAND.footer });

    await interaction.reply({ embeds: [embed] });
  },
};
