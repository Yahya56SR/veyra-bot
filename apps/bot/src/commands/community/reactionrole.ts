import { reactionRoles } from '@veyra/db';
import { and, asc, eq } from 'drizzle-orm';
import {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { normalizeEmoji } from '../../modules/community/reaction-roles.js';

const SNOWFLAKE = /^\d{17,20}$/;

interface PanelEntry {
  label: string;
  roleId: string;
}

export function parsePanelEntries(raw: string): PanelEntry[] {
  const parts = raw
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  const entries: PanelEntry[] = [];
  for (const part of parts) {
    const match = /^(.*?)=(\d{17,20})$/.exec(part);
    if (match?.[1] !== undefined && match[2]) {
      entries.push({ label: match[1].trim().slice(0, 100) || match[2], roleId: match[2] });
      continue;
    }

    const mention = /^<@&(\d{17,20})>$/.exec(part);
    const roleId = mention?.[1] ?? (SNOWFLAKE.test(part) ? part : null);
    if (roleId) entries.push({ label: roleId, roleId });
  }

  return entries;
}

export const reactionRoleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Create reaction roles and select-menu role panels.')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Bind one emoji on a message to a role.')
        .addStringOption((option) =>
          option.setName('message-id').setDescription('Message ID').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('emoji').setDescription('Emoji to react with').setRequired(true),
        )
        .addRoleOption((option) =>
          option.setName('role').setDescription('Role to grant').setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('mode')
            .setDescription('Toggle or pick-one')
            .addChoices({ name: 'Toggle', value: 'toggle' }, { name: 'Unique', value: 'unique' }),
        )
        .addStringOption((option) =>
          option
            .setName('group')
            .setDescription('Group name for unique role sets')
            .setMaxLength(32),
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel containing the message (defaults to here)')
            .addChannelTypes(ChannelType.GuildText),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove an emoji reaction-role binding.')
        .addStringOption((option) =>
          option.setName('message-id').setDescription('Message ID').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('emoji').setDescription('Emoji to remove').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List reaction-role bindings.')
        .addStringOption((option) =>
          option.setName('message-id').setDescription('Filter to one message'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Post a select-menu role panel.')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Where to post the panel')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((option) =>
          option.setName('title').setDescription('Panel title').setRequired(true).setMaxLength(256),
        )
        .addStringOption((option) =>
          option
            .setName('roles')
            .setDescription('label=roleId|label=roleId (or just roleId)')
            .setRequired(true)
            .setMaxLength(3500),
        )
        .addStringOption((option) =>
          option
            .setName('description')
            .setDescription('Optional panel description')
            .setMaxLength(2000),
        ),
    ),
  category: 'community',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 2,
  async execute({ client, interaction, guild }) {
    await deferEphemeral(interaction);

    const db = requireDb(client);
    const sub = interaction.options.getSubcommand(true);

    if (sub === 'add') {
      const messageId = interaction.options.getString('message-id', true).trim();
      const emoji = normalizeEmoji(interaction.options.getString('emoji', true));
      const role = interaction.options.getRole('role', true);
      const mode = interaction.options.getString('mode') ?? 'toggle';
      const group = interaction.options.getString('group')?.trim() || null;
      const channelOption = interaction.options.getChannel('channel');
      const channel = channelOption ?? interaction.channel;

      if (!channel?.isTextBased()) throw new UserFacingError('Pick a text channel.');
      if (!SNOWFLAKE.test(messageId)) throw new UserFacingError('That message ID is invalid.');
      if (role.id === guild.id) throw new UserFacingError('Pick a real role, not @everyone.');
      if (role.managed) throw new UserFacingError('That role is managed by an integration.');

      const me = guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new UserFacingError('I need Manage Roles to create reaction roles.');
      }
      if (role.position >= me.roles.highest.position) {
        throw new UserFacingError('That role is above my highest role.');
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) throw new UserFacingError('I could not find that message in the channel.');

      try {
        await message.react(emoji);
      } catch {
        throw new UserFacingError(
          'Discord rejected that emoji. Use a unicode emoji or one I can use.',
        );
      }

      await db
        .insert(reactionRoles)
        .values({
          guildId: interaction.guildId,
          messageId,
          emoji,
          roleId: role.id,
          mode,
          groupKey: group,
        })
        .onConflictDoNothing();

      await interaction.editReply({
        content: `Bound ${emoji} on [that message](${message.url}) to ${role}.`,
        allowedMentions: { parse: [] },
      });
      return;
    }

    if (sub === 'remove') {
      const messageId = interaction.options.getString('message-id', true).trim();
      const emoji = normalizeEmoji(interaction.options.getString('emoji', true));
      const rows = await db
        .delete(reactionRoles)
        .where(
          and(
            eq(reactionRoles.guildId, interaction.guildId),
            eq(reactionRoles.messageId, messageId),
            eq(reactionRoles.emoji, emoji),
          ),
        )
        .returning({ id: reactionRoles.id });

      await interaction.editReply({
        content:
          rows.length > 0
            ? `Removed ${rows.length} binding(s) for ${emoji}.`
            : 'No binding matched that message and emoji.',
      });
      return;
    }

    if (sub === 'list') {
      const messageId = interaction.options.getString('message-id')?.trim();
      const rows = await db
        .select()
        .from(reactionRoles)
        .where(
          messageId
            ? and(
                eq(reactionRoles.guildId, interaction.guildId),
                eq(reactionRoles.messageId, messageId),
              )
            : eq(reactionRoles.guildId, interaction.guildId),
        )
        .orderBy(asc(reactionRoles.messageId), asc(reactionRoles.id))
        .limit(40);

      if (rows.length === 0) {
        await interaction.editReply({ content: 'No reaction roles configured.' });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Reaction roles')
        .setDescription(
          rows
            .map(
              (row) =>
                `${row.mode === 'select' ? 'Select' : row.emoji} \u2192 <@&${row.roleId}> \u00b7 \`${
                  row.messageId
                }\`${row.mode === 'unique' ? ` \u00b7 group: ${row.groupKey ?? 'all'}` : ''}`,
            )
            .join('\n')
            .slice(0, 4000),
        )
        .setFooter({ text: 'Select rows are generated by /reactionrole panel' });

      await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
      return;
    }

    const channel = interaction.options.getChannel('channel', true);
    if (!channel.isTextBased()) throw new UserFacingError('Pick a text channel.');

    const title = interaction.options.getString('title', true).trim();
    const description = interaction.options.getString('description')?.trim() || null;
    const entries = parsePanelEntries(interaction.options.getString('roles', true)).slice(0, 25);
    if (entries.length === 0) {
      throw new UserFacingError('Provide at least one `label=roleId` entry.');
    }

    const resolved: PanelEntry[] = [];
    for (const entry of entries) {
      const role =
        guild.roles.cache.get(entry.roleId) ??
        (await guild.roles.fetch(entry.roleId).catch(() => null));
      if (!role) throw new UserFacingError(`Role ${entry.roleId} does not exist.`);
      if (role.id === guild.id) throw new UserFacingError('Do not add @everyone to a panel.');
      if (role.managed) throw new UserFacingError(`${role.name} is managed by an integration.`);

      const me = guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new UserFacingError('I need Manage Roles to create reaction roles.');
      }
      if (role.position >= me.roles.highest.position) {
        throw new UserFacingError(`${role.name} is above my highest role.`);
      }

      if (resolved.some((item) => item.roleId === role.id)) continue;
      resolved.push({
        label: entry.label === entry.roleId ? role.name.slice(0, 100) : entry.label,
        roleId: role.id,
      });
    }

    if (resolved.length === 0) throw new UserFacingError('No unique roles were left in the panel.');

    const select = new StringSelectMenuBuilder()
      .setCustomId('rr:select')
      .setPlaceholder('Choose your roles')
      .setMinValues(0)
      .setMaxValues(resolved.length)
      .addOptions(
        resolved.map((entry) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(entry.label)
            .setValue(entry.roleId)
            .setDescription('Toggle this role'),
        ),
      );

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(title.slice(0, 256))
      .setFooter({ text: 'Pick roles below. Selecting none removes them.' });
    if (description) embed.setDescription(description.slice(0, 4000));

    const message = await channel.send({
      embeds: [embed],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
      allowedMentions: { parse: [] },
    });

    try {
      await db.insert(reactionRoles).values(
        resolved.map((entry) => ({
          guildId: interaction.guildId,
          messageId: message.id,
          emoji: `select:${entry.roleId}`,
          roleId: entry.roleId,
          mode: 'select',
          groupKey: null,
        })),
      );
    } catch (error) {
      await message.delete().catch(() => {});
      throw error;
    }

    await interaction.editReply({ content: `Reaction-role panel posted: ${message.url}` });
  },
};
