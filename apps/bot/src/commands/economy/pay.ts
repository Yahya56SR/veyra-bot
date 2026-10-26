import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { formatCurrency, transferBalance } from '../../modules/economy/service.js';

export const payCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send coins to another member.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Who to pay').setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('How many coins')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1_000_000_000),
    ),
  category: 'economy',
  cooldownSeconds: 3,
  async execute({ client, interaction, settings }) {
    await deferEphemeral(interaction);

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    if (target.bot) throw new UserFacingError('Bots do not have wallets.');
    if (target.id === interaction.user.id) throw new UserFacingError('You cannot pay yourself.');

    const config = settings.economy;
    const result = await transferBalance(
      requireDb(client),
      interaction.guildId,
      interaction.user.id,
      target.id,
      amount,
    );

    await interaction.editReply({
      content: `Sent ${formatCurrency(result.amount, config)} to ${target}.\nYour balance: ${formatCurrency(
        result.senderBalance,
        config,
      )}`,
      allowedMentions: { parse: [] },
    });
  },
};
