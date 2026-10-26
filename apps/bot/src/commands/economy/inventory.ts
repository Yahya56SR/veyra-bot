import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { deferPublic } from '../../core/respond.js';
import { formatCurrency, getBalance, inventoryForRoleIds } from '../../modules/economy/service.js';

export const inventoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Show the role items you own from the shop.'),
  category: 'economy',
  cooldownSeconds: 3,
  async execute({ client, interaction, member }) {
    await deferPublic(interaction);

    const db = requireDb(client);
    const config = client.settings.economy;
    const [balance, items] = await Promise.all([
      getBalance(db, interaction.user.id),
      inventoryForRoleIds(db, [...member.roles.cache.keys()]),
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Your inventory')
      .addFields({ name: 'Balance', value: formatCurrency(balance.balance, config) })
      .setFooter({ text: 'Role items appear here while you own their role.' });

    if (items.length > 0) {
      embed.addFields({
        name: 'Owned items',
        value: items
          .map((item) => `**${item.name}** \u00b7 <@&${item.roleId}>`)
          .join('\n')
          .slice(0, 4000),
      });
    }

    await interaction.editReply({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  },
};
