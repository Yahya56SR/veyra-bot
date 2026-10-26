import { giveaways } from '@veyra/db';
import { formatDuration, parseDuration } from '@veyra/shared';
import { and, eq } from 'drizzle-orm';
import { ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import {
  createGiveaway,
  endGiveaway,
  findGiveaway,
  rerollGiveaway,
} from '../../modules/community/giveaways.js';

const MIN_DURATION_MS = 10_000;
const MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export const giveawayCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Run persistent button giveaways.')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a giveaway.')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel for the giveaway')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText),
        )
        .addStringOption((option) =>
          option
            .setName('prize')
            .setDescription('What are you giving away?')
            .setRequired(true)
            .setMaxLength(256),
        )
        .addStringOption((option) =>
          option
            .setName('duration')
            .setDescription('How long: 10m, 2h, 3d')
            .setRequired(true)
            .setMaxLength(32),
        )
        .addIntegerOption((option) =>
          option
            .setName('winners')
            .setDescription('Number of winners')
            .setMinValue(1)
            .setMaxValue(20),
        )
        .addIntegerOption((option) =>
          option
            .setName('level')
            .setDescription('Minimum level required to enter')
            .setMinValue(1)
            .setMaxValue(1000),
        )
        .addRoleOption((option) => option.setName('role').setDescription('Role required to enter')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a giveaway early.')
        .addStringOption((option) =>
          option.setName('message-id').setDescription('Giveaway message ID').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Pick new winners for an ended giveaway.')
        .addStringOption((option) =>
          option.setName('message-id').setDescription('Giveaway message ID').setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('winners')
            .setDescription('How many winners to draw')
            .setMinValue(1)
            .setMaxValue(20),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List active giveaways.')),
  category: 'community',
  userPermissions: [PermissionFlagsBits.ManageGuild],
  cooldownSeconds: 2,
  async execute({ client, interaction, guild, settings }) {
    await deferEphemeral(interaction);

    const db = requireDb(client);
    const sub = interaction.options.getSubcommand(true);

    if (sub === 'start') {
      const channel = interaction.options.getChannel('channel', true);
      if (channel.type !== ChannelType.GuildText) {
        throw new UserFacingError('Pick a standard text channel.');
      }

      const prize = interaction.options.getString('prize', true).trim();
      const duration = parseDuration(interaction.options.getString('duration', true));
      if (duration === null || duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) {
        throw new UserFacingError(
          'Use a duration between 10 seconds and 30 days (`10m`, `2h`, `3d`).',
        );
      }

      const winnerCount =
        interaction.options.getInteger('winners') ?? settings.community.giveaways.defaultWinners;
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');

      if (role?.id === guild.id) throw new UserFacingError('Pick a real role, not @everyone.');

      const requirements =
        level || role
          ? { ...(level ? { level } : {}), ...(role ? { roleId: role.id } : {}) }
          : null;

      const { message, giveaway } = await createGiveaway(
        client,
        channel,
        prize,
        duration,
        winnerCount,
        requirements,
      );

      await interaction.editReply({
        content: `Giveaway **#${giveaway.id}** started in ${channel} for ${formatDuration(
          duration,
        )}: ${message.url}`,
        allowedMentions: { parse: [] },
      });
      return;
    }

    const messageId = interaction.options.getString('message-id', true).trim();
    const giveaway = await findGiveaway(db, interaction.guildId, messageId);
    if (!giveaway) throw new UserFacingError('No giveaway matches that message ID.');

    if (sub === 'end') {
      const result = await endGiveaway(client, giveaway, 'manual');
      await interaction.editReply({
        content: `Ended **#${giveaway.id}** with ${result.winners.length} winner(s).`,
      });
      return;
    }

    if (sub === 'reroll') {
      const winners = interaction.options.getInteger('winners') ?? giveaway.winnerCount;
      const picked = await rerollGiveaway(client, giveaway, winners);
      await interaction.editReply({
        content: `Rerolled **#${giveaway.id}** with ${picked.length} winner(s).`,
      });
      return;
    }

    const active = await db
      .select({
        id: giveaways.id,
        prize: giveaways.prize,
        channelId: giveaways.channelId,
        endsAt: giveaways.endsAt,
        winnerCount: giveaways.winnerCount,
      })
      .from(giveaways)
      .where(and(eq(giveaways.guildId, interaction.guildId), eq(giveaways.ended, false)))
      .limit(10);

    if (active.length === 0) {
      await interaction.editReply({ content: 'No active giveaways.' });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle('Active giveaways')
      .setDescription(
        active
          .map(
            (row) =>
              `**#${row.id}** ${row.prize} \u00b7 <#${row.channelId}> \u00b7 ends <t:${Math.floor(
                row.endsAt.getTime() / 1000,
              )}:R> \u00b7 ${row.winnerCount} winner(s)`,
          )
          .join('\n'),
      );

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
