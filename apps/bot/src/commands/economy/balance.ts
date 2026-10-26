import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { deferPublic } from '../../core/respond.js';
import { formatCurrency, getBalance } from '../../modules/economy/service.js';

export const balanceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Show a member\u2019s balance.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Member to inspect (defaults to you)'),
    ),
  category: 'economy',
  cooldownSeconds: 2,
  async execute({ client, interaction }) {
    await deferPublic(interaction);

    const target = interaction.options.getUser('user') ?? interaction.user;
    const member = await getBalance(requireDb(client), target.id);
    const config = client.settings.economy;

    await interaction.editReply({
      content: `${target} has ${formatCurrency(member.balance, config)}.\nDaily streak: **${
        member.dailyStreak
      }** day(s).`,
      allowedMentions: { parse: [] },
    });
  },
};
