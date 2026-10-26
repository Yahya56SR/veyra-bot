import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import {
  findShopItem,
  formatCurrency,
  purchaseItem,
  refundPurchase,
} from '../../modules/economy/service.js';

export const buyCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the coin shop.')
    .addStringOption((option) =>
      option
        .setName('item')
        .setDescription('Item name or ID from /shop')
        .setRequired(true)
        .setMaxLength(64),
    ),
  category: 'economy',
  cooldownSeconds: 3,
  async execute({ client, interaction, guild, member, settings }) {
    await deferEphemeral(interaction);

    const db = requireDb(client);
    const query = interaction.options.getString('item', true);
    const item = await findShopItem(db, interaction.guildId, query);
    if (!item) throw new UserFacingError('That item is not in the shop.');
    if (item.stock !== null && item.stock <= 0) throw new UserFacingError('That item is sold out.');

    const config = settings.economy;
    const role = item.roleId ? await guild.roles.fetch(item.roleId).catch(() => null) : null;

    if (item.roleId && !role) {
      throw new UserFacingError(
        'That item\u2019s role no longer exists. Ask an administrator to fix it.',
      );
    }
    if (role) {
      if (role.id === guild.id) throw new UserFacingError('That item is misconfigured.');
      if (role.managed) throw new UserFacingError('That role is managed by an integration.');
      if (member.roles.cache.has(role.id)) {
        throw new UserFacingError('You already have that role.');
      }

      const me = guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new UserFacingError('I need Manage Roles to deliver that item.');
      }
      if (role.position >= me.roles.highest.position) {
        throw new UserFacingError('That role is above my highest role, so I cannot grant it.');
      }
    }

    const purchase = await purchaseItem(db, interaction.guildId, interaction.user.id, item.id);

    if (role) {
      try {
        await member.roles.add(role.id, `Shop purchase: ${item.name}`);
      } catch (error) {
        await refundPurchase(db, interaction.guildId, interaction.user.id, item).catch(
          (refundError: unknown) => {
            client.logger.error(
              { err: refundError, itemId: item.id, userId: interaction.user.id },
              'shop refund failed after role grant error',
            );
          },
        );
        client.logger.warn(
          { err: error, itemId: item.id, userId: interaction.user.id },
          'shop role grant failed - refunded',
        );
        throw new UserFacingError('I could not grant that role. Your coins were refunded.');
      }
    }

    await interaction.editReply({
      content: `Bought **${item.name}** for ${formatCurrency(
        item.price,
        config,
      )}.\nBalance: ${formatCurrency(purchase.balance, config)}`,
    });
  },
};
