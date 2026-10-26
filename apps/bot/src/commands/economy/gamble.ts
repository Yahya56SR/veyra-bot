import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { deferEphemeral } from '../../core/respond.js';
import { formatCurrency, gamble } from '../../modules/economy/service.js';

export const gambleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Bet coins on a 50/50 flip.')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('How many coins to bet')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1_000_000_000),
    ),
  category: 'economy',
  cooldownSeconds: 5,
  async execute({ client, interaction, settings }) {
    await deferEphemeral(interaction);

    const amount = interaction.options.getInteger('amount', true);
    const config = settings.economy;
    const result = await gamble(
      requireDb(client),
      interaction.guildId,
      interaction.user.id,
      amount,
    );

    await interaction.editReply({
      content: result.won
        ? `You won ${formatCurrency(result.amount, config)}.\nBalance: ${formatCurrency(
            result.balance,
            config,
          )}`
        : `You lost ${formatCurrency(result.amount, config)}.\nBalance: ${formatCurrency(
            result.balance,
            config,
          )}`,
    });
  },
};
