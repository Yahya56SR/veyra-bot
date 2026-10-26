import { shopItems } from '@veyra/db';
import { and, eq } from 'drizzle-orm';
import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildMember,
} from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import {
  adjustBalance,
  findShopItem,
  formatCurrency,
  listShop,
  setBalance,
} from '../../modules/economy/service.js';

function assertAssignableRole(member: GuildMember, roleId: string): void {
  const role = member.guild.roles.cache.get(roleId);
  if (!role) throw new UserFacingError('That role no longer exists.');
  if (role.id === member.guild.id) throw new UserFacingError('Pick a real role, not @everyone.');
  if (role.managed) throw new UserFacingError('That role is managed by an integration.');

  const me = member.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new UserFacingError('I need Manage Roles to sell that role.');
  }
  if (role.position >= me.roles.highest.position) {
    throw new UserFacingError('That role is above my highest role.');
  }
}

export const ecoAdminCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ecoadmin')
    .setDescription('Administrator tools for the economy and shop.')
    .addSubcommand((sub) =>
      sub
        .setName('grant')
        .setDescription('Give coins to a member.')
        .addUserOption((option) =>
          option.setName('user').setDescription('Member').setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('amount')
            .setDescription('Coins to add')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1_000_000_000),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('take')
        .setDescription('Remove coins from a member.')
        .addUserOption((option) =>
          option.setName('user').setDescription('Member').setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('amount')
            .setDescription('Coins to remove')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1_000_000_000),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set a member\u2019s exact balance.')
        .addUserOption((option) =>
          option.setName('user').setDescription('Member').setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('amount')
            .setDescription('New balance')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(1_000_000_000),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('shop-add')
        .setDescription('Add a role item to the shop.')
        .addStringOption((option) =>
          option.setName('name').setDescription('Item name').setRequired(true).setMaxLength(64),
        )
        .addIntegerOption((option) =>
          option
            .setName('price')
            .setDescription('Price in coins')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1_000_000_000),
        )
        .addRoleOption((option) =>
          option.setName('role').setDescription('Role granted on purchase'),
        )
        .addIntegerOption((option) =>
          option
            .setName('stock')
            .setDescription('How many are available (omit for unlimited)')
            .setMinValue(0)
            .setMaxValue(1_000_000_000),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('shop-remove')
        .setDescription('Remove a shop item.')
        .addStringOption((option) =>
          option
            .setName('item')
            .setDescription('Item name or ID')
            .setRequired(true)
            .setMaxLength(64),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('shop-stock')
        .setDescription('Change an item\u2019s stock.')
        .addStringOption((option) =>
          option
            .setName('item')
            .setDescription('Item name or ID')
            .setRequired(true)
            .setMaxLength(64),
        )
        .addIntegerOption((option) =>
          option
            .setName('stock')
            .setDescription('New stock (mutually exclusive with unlimited)')
            .setMinValue(0)
            .setMaxValue(1_000_000_000),
        )
        .addBooleanOption((option) =>
          option.setName('unlimited').setDescription('Make the stock unlimited'),
        ),
    )
    .addSubcommand((sub) => sub.setName('shop-list').setDescription('List every shop item.')),
  category: 'economy',
  allowWhenDisabled: true,
  userPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 2,
  async execute({ client, interaction, guild, member, settings }) {
    await deferEphemeral(interaction);

    const db = requireDb(client);
    const config = settings.economy;
    const sub = interaction.options.getSubcommand(true);

    if (sub === 'grant' || sub === 'take' || sub === 'set') {
      const target = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      if (target.bot) throw new UserFacingError('Bots do not have wallets.');

      const result =
        sub === 'set'
          ? await setBalance(db, interaction.guildId, target.id, amount)
          : await adjustBalance(
              db,
              interaction.guildId,
              target.id,
              sub === 'grant' ? amount : -amount,
            );

      await interaction.editReply({
        content: `${target} now has ${formatCurrency(result.balance, config)}.`,
        allowedMentions: { parse: [] },
      });
      return;
    }

    if (sub === 'shop-add') {
      const name = interaction.options.getString('name', true).trim();
      const price = interaction.options.getInteger('price', true);
      const role = interaction.options.getRole('role');
      const stock = interaction.options.getInteger('stock');

      if (role) {
        if (role.id === guild.id) throw new UserFacingError('Pick a real role, not @everyone.');
        assertAssignableRole(member, role.id);
      }

      const rows = await db
        .insert(shopItems)
        .values({
          guildId: interaction.guildId,
          name,
          price,
          roleId: role?.id ?? null,
          stock: stock ?? null,
        })
        .returning();

      const item = rows[0];
      if (!item) throw new UserFacingError('Could not create that item.');

      await interaction.editReply({
        content: `Added **#${item.id} ${item.name}** for ${formatCurrency(
          item.price,
          config,
        )}${item.stock === null ? ' with unlimited stock' : ` with ${item.stock} in stock`}.`,
      });
      return;
    }

    if (sub === 'shop-remove') {
      const item = await findShopItem(
        db,
        interaction.guildId,
        interaction.options.getString('item', true),
      );
      if (!item) throw new UserFacingError('That item does not exist.');
      await db
        .delete(shopItems)
        .where(and(eq(shopItems.guildId, interaction.guildId), eq(shopItems.id, item.id)));
      await interaction.editReply({ content: `Removed **${item.name}** from the shop.` });
      return;
    }

    if (sub === 'shop-stock') {
      const item = await findShopItem(
        db,
        interaction.guildId,
        interaction.options.getString('item', true),
      );
      if (!item) throw new UserFacingError('That item does not exist.');
      const unlimited = interaction.options.getBoolean('unlimited') ?? false;
      const stock = interaction.options.getInteger('stock');

      if (unlimited && stock !== null) {
        throw new UserFacingError('Choose either a stock number or unlimited, not both.');
      }
      if (!unlimited && stock === null) {
        throw new UserFacingError('Provide a stock number or set unlimited:true.');
      }

      await db
        .update(shopItems)
        .set({ stock: unlimited ? null : stock })
        .where(and(eq(shopItems.guildId, interaction.guildId), eq(shopItems.id, item.id)));

      await interaction.editReply({
        content: `**${item.name}** now has ${unlimited ? 'unlimited stock' : `${stock} in stock`}.`,
      });
      return;
    }

    const items = await listShop(db, interaction.guildId);
    if (items.length === 0) {
      await interaction.editReply({ content: 'The shop is empty.' });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Shop items')
      .setDescription(
        items
          .map(
            (item) =>
              `**#${item.id}** ${item.name} \u2014 ${formatCurrency(item.price, config)} \u00b7 ${
                item.stock === null ? 'unlimited' : `${item.stock} left`
              }${item.roleId ? ` \u00b7 <@&${item.roleId}>` : ''}`,
          )
          .join('\n')
          .slice(0, 4000),
      );

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
