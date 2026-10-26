import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { deferEphemeral } from '../../core/respond.js';
import { claimDaily, formatCurrency } from '../../modules/economy/service.js';

export const dailyCommand: Command = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Claim your daily coins.'),
  category: 'economy',
  cooldownSeconds: 3,
  async execute({ client, interaction, settings }) {
    await deferEphemeral(interaction);

    const config = settings.economy;
    const result = await claimDaily(
      requireDb(client),
      interaction.guildId,
      interaction.user.id,
      config,
    );

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('Daily claimed')
      .addFields(
        { name: 'Base', value: formatCurrency(config.dailyAmount, config), inline: true },
        { name: 'Streak bonus', value: formatCurrency(result.bonus, config), inline: true },
        { name: 'Streak', value: `**${result.streak}** day(s)`, inline: true },
        { name: 'Balance', value: formatCurrency(result.balance, config), inline: true },
      )
      .setFooter({ text: 'Come back in 24 hours to keep the streak alive.' });

    await interaction.editReply({ embeds: [embed] });
  },
};
