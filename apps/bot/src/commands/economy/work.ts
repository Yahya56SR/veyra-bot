import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { deferEphemeral } from '../../core/respond.js';
import { formatCurrency, work } from '../../modules/economy/service.js';

export const workCommand: Command = {
  data: new SlashCommandBuilder().setName('work').setDescription('Work for some coins.'),
  category: 'economy',
  cooldownSeconds: 3,
  async execute({ client, interaction, settings }) {
    await deferEphemeral(interaction);

    const config = settings.economy;
    const result = await work(requireDb(client), interaction.guildId, interaction.user.id, config);

    await interaction.editReply({
      content: `You earned ${formatCurrency(result.payout, config)}.\nBalance: ${formatCurrency(
        result.balance,
        config,
      )} \u00b7 Next shift <t:${Math.floor(result.nextAt.getTime() / 1000)}:R>.`,
    });
  },
};
