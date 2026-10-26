import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { deferPublic } from '../../core/respond.js';
import { formatCurrency, listShop } from '../../modules/economy/service.js';

export const shopCommand: Command = {
  data: new SlashCommandBuilder().setName('shop').setDescription('Browse the coin shop.'),
  category: 'economy',
  cooldownSeconds: 3,
  async execute({ client, interaction, settings }) {
    await deferPublic(interaction);

    const items = await listShop(requireDb(client), interaction.guildId);
    const config = settings.economy;

    if (items.length === 0) {
      await interaction.editReply({
        content: 'The shop is empty. An administrator can add items with `/ecoadmin shop-add`.',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Coin shop')
      .setDescription(
        items
          .map((item) => {
            const stock = item.stock === null ? 'unlimited' : `${item.stock} left`;
            const role = item.roleId ? ` \u00b7 <@&${item.roleId}>` : '';
            return `**#${item.id}** ${item.name} \u2014 ${formatCurrency(
              item.price,
              config,
            )} \u00b7 ${stock}${role}`;
          })
          .join('\n')
          .slice(0, 4000),
      )
      .setFooter({ text: 'Buy with /buy item:<name or id>' });

    await interaction.editReply({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  },
};
