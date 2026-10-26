import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { deferPublic } from '../../core/respond.js';
import { formatCurrency, topBalances } from '../../modules/economy/service.js';

export const baltopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('baltop')
    .setDescription('Show the top 10 members by balance.'),
  category: 'economy',
  cooldownSeconds: 5,
  async execute({ client, interaction, settings }) {
    await deferPublic(interaction);

    const rows = await topBalances(requireDb(client), interaction.guildId);
    if (rows.length === 0) {
      await interaction.editReply({ content: 'Nobody has coins yet.' });
      return;
    }

    const config = settings.economy;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Richest members')
      .setDescription(
        rows
          .map(
            (row, index) =>
              `**#${index + 1}** <@${row.userId}> \u2014 ${formatCurrency(row.balance, config)}`,
          )
          .join('\n'),
      )
      .setFooter({ text: 'Veyra economy' });

    await interaction.editReply({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  },
};
