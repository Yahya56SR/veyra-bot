import { cases, commandUsage, giveaways, members, statsDaily, tickets } from '@nervana/db';
import { count, eq, gte, sql, sum } from 'drizzle-orm';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { deferPublic } from '../../core/respond.js';
import { retentionCutoff } from '../../modules/stats/service.js';

function compact(value: number): string {
  return value.toLocaleString();
}

export const statsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show server and bot statistics.'),
  category: 'stats',
  cooldownSeconds: 5,
  async execute({ client, interaction }) {
    await deferPublic(interaction);

    await client.stats?.flush();
    const db = requireDb(client);
    const cutoff = retentionCutoff(new Date(), 7);

    const [memberRows, caseRows, openTicketRows, activeGiveawayRows, dayRows, commandRows] =
      await Promise.all([
        db.select({ value: count() }).from(members),
        db.select({ value: count() }).from(cases),
        db.select({ value: count() }).from(tickets).where(eq(tickets.status, 'open')),
        db.select({ value: count() }).from(giveaways).where(eq(giveaways.ended, false)),
        db.select().from(statsDaily).where(gte(statsDaily.date, cutoff)).orderBy(statsDaily.date),
        db
          .select({ command: commandUsage.command, total: sum(commandUsage.count) })
          .from(commandUsage)
          .where(gte(commandUsage.date, cutoff))
          .groupBy(commandUsage.command)
          .orderBy(sql`sum(${commandUsage.count}) DESC`)
          .limit(5),
      ]);

    const total = dayRows.reduce(
      (accumulator, row) => ({
        messages: accumulator.messages + row.messages,
        joins: accumulator.joins + row.joins,
        leaves: accumulator.leaves + row.leaves,
        commands: accumulator.commands + row.commands,
        voiceSeconds: accumulator.voiceSeconds + row.voiceSeconds,
        musicPlays: accumulator.musicPlays + row.musicPlays,
      }),
      { messages: 0, joins: 0, leaves: 0, commands: 0, voiceSeconds: 0, musicPlays: 0 },
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Nervana statistics')
      .addFields(
        { name: 'Members tracked', value: compact(memberRows[0]?.value ?? 0), inline: true },
        { name: 'Cases', value: compact(caseRows[0]?.value ?? 0), inline: true },
        { name: 'Open tickets', value: compact(openTicketRows[0]?.value ?? 0), inline: true },
        {
          name: 'Active giveaways',
          value: compact(activeGiveawayRows[0]?.value ?? 0),
          inline: true,
        },
        { name: 'Messages (7d)', value: compact(total.messages), inline: true },
        { name: 'Commands (7d)', value: compact(total.commands), inline: true },
        {
          name: 'Joins / leaves (7d)',
          value: `${compact(total.joins)} / ${compact(total.leaves)}`,
          inline: true,
        },
        {
          name: 'Voice minutes (7d)',
          value: compact(Math.round(total.voiceSeconds / 60)),
          inline: true,
        },
        { name: 'Music plays (7d)', value: compact(total.musicPlays), inline: true },
      )
      .setFooter({ text: 'Retention: 90 days' });

    if (dayRows.length > 0) {
      embed.addFields({
        name: 'Daily activity',
        value: dayRows
          .slice(-7)
          .map(
            (row) =>
              `\`${row.date}\` \u00b7 ${compact(row.messages)} msg \u00b7 ${compact(
                row.commands,
              )} cmd \u00b7 ${Math.round(row.voiceSeconds / 60)}m voice`,
          )
          .join('\n')
          .slice(0, 1024),
      });
    }

    if (commandRows.length > 0) {
      embed.addFields({
        name: 'Top commands (7d)',
        value: commandRows
          .map((row) => `**/${row.command}** \u00b7 ${compact(Number(row.total ?? 0))}`)
          .join('\n')
          .slice(0, 1024),
      });
    }

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
