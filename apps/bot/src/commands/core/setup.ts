import {
  BRAND,
  LOG_EVENTS,
  type AppConfig,
  type AutomodAction,
  type LogEvent,
} from '@nervana/shared';
import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type GuildBasedChannel,
} from 'discord.js';
import { resetModule, updateModule } from '../../config/service.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';

const AUTOMOD_RULES = ['invites', 'links', 'spam', 'mentions', 'caps', 'words', 'raid'] as const;
type AutomodRule = (typeof AUTOMOD_RULES)[number];

const MODULES = [
  'moderation',
  'logging',
  'leveling',
  'economy',
  'welcome',
  'tickets',
  'music',
  'community',
  'stats',
] as const;

function label(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (character) => character.toUpperCase())
    .trim();
}

function textChannel(channel: GuildBasedChannel | null): GuildBasedChannel | null {
  if (!channel) return null;
  if (!channel.isTextBased()) {
    throw new UserFacingError('Pick a text channel, not a category or voice channel.');
  }
  return channel;
}

export const setupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure logging, moderation, leveling, and welcome messages.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub.setName('status').setDescription('Show the current configuration.'))
    .addSubcommand((sub) =>
      sub
        .setName('logging')
        .setDescription('Route one log event to a channel, or clear it.')
        .addStringOption((option) =>
          option
            .setName('event')
            .setDescription('Which event to route')
            .setRequired(true)
            .addChoices(...LOG_EVENTS.map((event) => ({ name: label(event), value: event }))),
        )
        .addChannelOption((option) =>
          option.setName('channel').setDescription('Text channel; omit to disable this event'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('modlog')
        .setDescription('Set the moderation case log channel.')
        .addChannelOption((option) =>
          option.setName('channel').setDescription('Text channel; omit to clear'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('automod')
        .setDescription('Enable or disable one automod rule.')
        .addStringOption((option) =>
          option
            .setName('rule')
            .setDescription('Rule to change')
            .setRequired(true)
            .addChoices(...AUTOMOD_RULES.map((rule) => ({ name: label(rule), value: rule }))),
        )
        .addBooleanOption((option) =>
          option.setName('enabled').setDescription('Turn the rule on or off').setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('What to do when the rule matches')
            .addChoices(
              { name: 'Delete', value: 'delete' },
              { name: 'Warn', value: 'warn' },
              { name: 'Timeout', value: 'timeout' },
              { name: 'Kick', value: 'kick' },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('link-allow')
        .setDescription('Allow a hostname through the links automod rule.')
        .addStringOption((option) =>
          option
            .setName('host')
            .setDescription('Hostname, e.g. youtube.com or example.com')
            .setRequired(true)
            .setMaxLength(253),
        )
        .addBooleanOption((option) =>
          option.setName('remove').setDescription('Remove the allowlist entry instead'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('filtered-word')
        .setDescription('Add or remove a word blocked by automod.')
        .addStringOption((option) =>
          option
            .setName('word')
            .setDescription('Word or phrase to filter')
            .setRequired(true)
            .setMaxLength(100),
        )
        .addBooleanOption((option) =>
          option.setName('remove').setDescription('Remove the filtered word instead'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('leveling')
        .setDescription('Toggle leveling and tune XP rates.')
        .addBooleanOption((option) =>
          option.setName('enabled').setDescription('Enable leveling').setRequired(true),
        )
        .addChannelOption((option) =>
          option.setName('announce').setDescription('Level-up announcement channel'),
        )
        .addBooleanOption((option) =>
          option
            .setName('clear-announce')
            .setDescription('Use the channel where the member leveled up instead'),
        )
        .addIntegerOption((option) =>
          option
            .setName('xp-min')
            .setDescription('Minimum base XP per message')
            .setMinValue(1)
            .setMaxValue(500),
        )
        .addIntegerOption((option) =>
          option
            .setName('xp-max')
            .setDescription('Maximum base XP per message')
            .setMinValue(1)
            .setMaxValue(500),
        )
        .addIntegerOption((option) =>
          option
            .setName('cooldown')
            .setDescription('Seconds between XP gains per member')
            .setMinValue(10)
            .setMaxValue(3600),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('welcome')
        .setDescription('Configure join or leave messages.')
        .addStringOption((option) =>
          option
            .setName('kind')
            .setDescription('Join or leave')
            .setRequired(true)
            .addChoices({ name: 'Join', value: 'join' }, { name: 'Leave', value: 'leave' }),
        )
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Text channel. Omit (with no message) to disable'),
        )
        .addStringOption((option) =>
          option
            .setName('message')
            .setDescription('Template: {user}, {username}, {server}, {memberCount}')
            .setMaxLength(2000),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('exempt-role')
        .setDescription('Exempt a role from automod.')
        .addRoleOption((option) =>
          option.setName('role').setDescription('Role to exempt').setRequired(true),
        )
        .addBooleanOption((option) =>
          option.setName('remove').setDescription('Remove the exemption instead'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('exempt-channel')
        .setDescription('Exempt a channel from automod.')
        .addChannelOption((option) =>
          option.setName('channel').setDescription('Channel to exempt').setRequired(true),
        )
        .addBooleanOption((option) =>
          option.setName('remove').setDescription('Remove the exemption instead'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('autorole')
        .setDescription('Add or remove a role granted when a member joins.')
        .addRoleOption((option) =>
          option.setName('role').setDescription('Role to grant').setRequired(true),
        )
        .addBooleanOption((option) =>
          option.setName('remove').setDescription('Remove the auto role instead'),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Restore one module to its defaults.')
        .addStringOption((option) =>
          option
            .setName('module')
            .setDescription('Module to reset')
            .setRequired(true)
            .addChoices(...MODULES.map((module) => ({ name: label(module), value: module }))),
        ),
    ),
  category: 'core',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 2,
  async execute({ client, interaction, settings }) {
    await deferEphemeral(interaction);

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'status') {
      await showStatus(interaction, settings);
      return;
    }

    if (sub === 'logging') {
      const event = interaction.options.getString('event', true) as LogEvent;
      const channel = textChannel(interaction.options.getChannel('channel'));

      const logging = structuredClone(settings.logging);
      logging.channels[event] = channel?.id ?? null;
      if (channel) logging.enabled = true;

      await updateModule(client, interaction.user.id, 'logging', logging);

      await interaction.editReply({
        content: channel
          ? `**${label(event)}** logs now go to <#${channel.id}>.`
          : `Disabled **${label(event)}** logs.`,
      });
      return;
    }

    if (sub === 'modlog') {
      const channel = textChannel(interaction.options.getChannel('channel'));

      const moderation = structuredClone(settings.moderation);
      moderation.modLogChannelId = channel?.id ?? null;

      await updateModule(client, interaction.user.id, 'moderation', moderation);

      await interaction.editReply({
        content: channel
          ? `Moderation cases now log to <#${channel.id}>.`
          : 'Cleared the moderation case log channel.',
      });
      return;
    }

    if (sub === 'automod') {
      const rule = interaction.options.getString('rule', true) as AutomodRule;
      const enabled = interaction.options.getBoolean('enabled', true);
      const action = interaction.options.getString('action') as AutomodAction | null;

      if (action && rule === 'raid' && action === 'delete') {
        throw new UserFacingError('The raid rule cannot use the delete action.');
      }

      const moderation = structuredClone(settings.moderation);
      const target = moderation.automod[rule];
      target.enabled = enabled;
      if (action) target.action = action;

      await updateModule(client, interaction.user.id, 'moderation', moderation);

      await interaction.editReply({
        content: `**${label(rule)}** automod is now **${enabled ? 'on' : 'off'}**${
          action ? ` (action: ${action})` : ''
        }.`,
      });
      return;
    }

    if (sub === 'link-allow') {
      const remove = interaction.options.getBoolean('remove') ?? false;
      const raw = interaction.options.getString('host', true).trim().toLowerCase();
      const host = raw
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/^\*\./, '')
        .replace(/^www\./, '');

      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
        throw new UserFacingError('Enter a hostname such as `youtube.com` (no path or scheme).');
      }

      const moderation = structuredClone(settings.moderation);
      const set = new Set(moderation.automod.links.allowlist);
      if (remove) set.delete(host);
      else set.add(host);
      moderation.automod.links.allowlist = [...set];

      await updateModule(client, interaction.user.id, 'moderation', moderation);

      await interaction.editReply({
        content: `${remove ? 'Removed' : 'Added'} **${host}** ${
          remove ? 'from' : 'to'
        } the link allowlist.`,
      });
      return;
    }

    if (sub === 'filtered-word') {
      const remove = interaction.options.getBoolean('remove') ?? false;
      const word = interaction.options.getString('word', true).trim().toLowerCase();

      if (!word) throw new UserFacingError('Enter a word or phrase to filter.');

      const moderation = structuredClone(settings.moderation);
      const set = new Set(moderation.automod.words.words.map((entry) => entry.toLowerCase()));
      if (remove) set.delete(word);
      else set.add(word);
      moderation.automod.words.words = [...set];

      await updateModule(client, interaction.user.id, 'moderation', moderation);

      await interaction.editReply({
        content: `${remove ? 'Removed' : 'Added'} **${word}** ${
          remove ? 'from' : 'to'
        } the filtered words.`,
      });
      return;
    }

    if (sub === 'leveling') {
      const enabled = interaction.options.getBoolean('enabled', true);
      const announce = textChannel(interaction.options.getChannel('announce'));
      const clearAnnounce = interaction.options.getBoolean('clear-announce') ?? false;
      const xpMin = interaction.options.getInteger('xp-min');
      const xpMax = interaction.options.getInteger('xp-max');
      const cooldown = interaction.options.getInteger('cooldown');

      const leveling = structuredClone(settings.leveling);
      leveling.enabled = enabled;

      if (clearAnnounce) leveling.announceChannelId = null;
      else if (announce) leveling.announceChannelId = announce.id;

      if (xpMin !== null) leveling.xpMin = xpMin;
      if (xpMax !== null) leveling.xpMax = xpMax;
      if (leveling.xpMax < leveling.xpMin) {
        throw new UserFacingError(
          `XP max (${leveling.xpMax}) must be at least XP min (${leveling.xpMin}). Set both together.`,
        );
      }
      if (cooldown !== null) leveling.cooldownSeconds = cooldown;

      await updateModule(client, interaction.user.id, 'leveling', leveling);

      await interaction.editReply({
        content: `Leveling is **${enabled ? 'on' : 'off'}** · ${leveling.xpMin}–${leveling.xpMax} XP every ${leveling.cooldownSeconds}s.`,
      });
      return;
    }

    if (sub === 'welcome') {
      const kind = interaction.options.getString('kind', true);
      const channel = textChannel(interaction.options.getChannel('channel'));
      const message = interaction.options.getString('message')?.trim() || null;

      const welcome = structuredClone(settings.welcome);

      if (kind === 'join') {
        if (channel) {
          welcome.joinEnabled = true;
          welcome.joinChannelId = channel.id;
        } else if (!message) {
          welcome.joinEnabled = false;
          welcome.joinChannelId = null;
        }
        if (message) welcome.joinMessage = message;
      } else {
        if (channel) {
          welcome.leaveEnabled = true;
          welcome.leaveChannelId = channel.id;
        } else if (!message) {
          welcome.leaveEnabled = false;
          welcome.leaveChannelId = null;
        }
        if (message) welcome.leaveMessage = message;
      }

      await updateModule(client, interaction.user.id, 'welcome', welcome);

      await interaction.editReply({
        content: channel
          ? `${label(kind)} messages will be sent to <#${channel.id}>.`
          : message
            ? `Updated the ${kind} message template.`
            : `Disabled ${kind} messages.`,
      });
      return;
    }

    if (sub === 'exempt-role' || sub === 'exempt-channel') {
      const remove = interaction.options.getBoolean('remove') ?? false;
      const moderation = structuredClone(settings.moderation);

      if (sub === 'exempt-role') {
        const role = interaction.options.getRole('role', true);
        const set = new Set(moderation.exemptRoleIds);
        if (remove) set.delete(role.id);
        else set.add(role.id);
        moderation.exemptRoleIds = [...set];

        await updateModule(client, interaction.user.id, 'moderation', moderation);

        await interaction.editReply({
          content: `${remove ? 'Removed' : 'Added'} role exemption for ${role}.`,
        });
        return;
      }

      const channel = textChannel(interaction.options.getChannel('channel', true));
      if (!channel) throw new UserFacingError('Pick a text channel to exempt.');
      const set = new Set(moderation.exemptChannelIds);
      if (remove) set.delete(channel.id);
      else set.add(channel.id);
      moderation.exemptChannelIds = [...set];

      await updateModule(client, interaction.user.id, 'moderation', moderation);

      await interaction.editReply({
        content: `${remove ? 'Removed' : 'Added'} automod exemption for <#${channel.id}>.`,
      });
      return;
    }

    if (sub === 'autorole') {
      const role = interaction.options.getRole('role', true);
      const remove = interaction.options.getBoolean('remove') ?? false;

      if (!remove) {
        if (role.id === interaction.guildId) {
          throw new UserFacingError('The @everyone role is implicit; pick a real role.');
        }
        if (role.managed) {
          throw new UserFacingError(
            'That role is managed by an integration and cannot be granted.',
          );
        }

        const me = interaction.guild?.members.me;
        if (me && role.position >= me.roles.highest.position) {
          throw new UserFacingError(
            'That role is at or above my highest role. Move my role higher first.',
          );
        }
      }

      const welcome = structuredClone(settings.welcome);
      const set = new Set(welcome.autoRoleIds);
      if (remove) set.delete(role.id);
      else set.add(role.id);
      welcome.autoRoleIds = [...set];

      await updateModule(client, interaction.user.id, 'welcome', welcome);

      await interaction.editReply({
        content: `${remove ? 'Removed' : 'Added'} ${role} as an auto role.`,
      });
      return;
    }

    if (sub === 'reset') {
      const module = interaction.options.getString('module', true) as keyof AppConfig;
      await resetModule(client, interaction.user.id, module);

      await interaction.editReply({
        content: `Reset the **${label(module)}** module to defaults.`,
      });
    }
  },
};

async function showStatus(
  interaction: import('discord.js').ChatInputCommandInteraction<'cached'>,
  settings: AppConfig,
): Promise<void> {
  const configuredLogs = LOG_EVENTS.filter((event) => settings.logging.channels[event] !== null);
  const enabledRules = AUTOMOD_RULES.filter((rule) => settings.moderation.automod[rule].enabled);
  const rewards = settings.leveling.rewards.length;

  const embed = new EmbedBuilder()
    .setColor(BRAND.color)
    .setTitle('Nervana setup')
    .addFields(
      {
        name: 'Moderation',
        value: [
          `Automod: **${settings.moderation.automod.enabled ? 'on' : 'off'}**`,
          `Rules on: ${enabledRules.length > 0 ? enabledRules.join(', ') : 'none'}`,
          `Case log: ${
            settings.moderation.modLogChannelId
              ? `<#${settings.moderation.modLogChannelId}>`
              : '**not set**'
          }`,
          `Exemptions: ${settings.moderation.exemptRoleIds.length} role(s), ${settings.moderation.exemptChannelIds.length} channel(s)`,
        ].join('\n'),
      },
      {
        name: 'Logging',
        value: [
          `Enabled: **${settings.logging.enabled ? 'on' : 'off'}**`,
          `Events routed: ${configuredLogs.length}/${LOG_EVENTS.length}`,
          `Ignored: ${settings.logging.ignoreChannelIds.length} channel(s), ${settings.logging.ignoreUserIds.length} user(s)`,
        ].join('\n'),
      },
      {
        name: 'Leveling',
        value: [
          `Enabled: **${settings.leveling.enabled ? 'on' : 'off'}**`,
          `${settings.leveling.xpMin}–${settings.leveling.xpMax} XP every ${settings.leveling.cooldownSeconds}s`,
          `Rewards: ${rewards}`,
          `Announcements: ${
            settings.leveling.announceLevelUp
              ? settings.leveling.announceChannelId
                ? `<#${settings.leveling.announceChannelId}>`
                : 'same channel'
              : 'off'
          }`,
        ].join('\n'),
      },
      {
        name: 'Welcome',
        value: [
          `Join: ${
            settings.welcome.joinEnabled && settings.welcome.joinChannelId
              ? `<#${settings.welcome.joinChannelId}>`
              : 'off'
          }`,
          `Leave: ${
            settings.welcome.leaveEnabled && settings.welcome.leaveChannelId
              ? `<#${settings.welcome.leaveChannelId}>`
              : 'off'
          }`,
          `Auto roles: ${settings.welcome.autoRoleIds.length}`,
        ].join('\n'),
      },
      {
        name: 'Other modules',
        value: [
          `Economy: **${settings.economy.enabled ? 'on' : 'off'}**`,
          `Tickets: **${settings.tickets.enabled ? 'on' : 'off'}**`,
          `Music: **${settings.music.enabled ? 'on' : 'off'}**`,
          `Stats: **${settings.stats.enabled ? 'on' : 'off'}**`,
        ].join('\n'),
      },
    )
    .setFooter({ text: 'Use /setup <module> to change a setting' });

  await interaction.editReply({ embeds: [embed] });
}
