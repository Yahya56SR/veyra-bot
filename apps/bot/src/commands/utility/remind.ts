import { reminders } from '@nervana/db';
import { formatDuration, parseDuration, truncate } from '@nervana/shared';
import { and, asc, eq } from 'drizzle-orm';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { requireDb } from '../../core/database.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';

const MIN_DELAY_MS = 10_000;
const MAX_MESSAGE = 500;

export const remindCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Schedule and manage personal reminders.')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Get a DM (or channel ping) at a future time.')
        .addStringOption((option) =>
          option
            .setName('when')
            .setDescription('When: 10m, 2h, 3d, 2w')
            .setRequired(true)
            .setMaxLength(32),
        )
        .addStringOption((option) =>
          option
            .setName('message')
            .setDescription('What to remind you about')
            .setMaxLength(MAX_MESSAGE),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List your pending reminders.'))
    .addSubcommand((sub) =>
      sub
        .setName('cancel')
        .setDescription('Cancel one of your reminders.')
        .addIntegerOption((option) =>
          option
            .setName('id')
            .setDescription('Reminder ID from /remind list')
            .setRequired(true)
            .setMinValue(1),
        ),
    ),
  category: 'utility',
  cooldownSeconds: 2,
  async execute({ client, interaction }) {
    await deferEphemeral(interaction);

    const sub = interaction.options.getSubcommand(true);
    const db = requireDb(client);

    if (sub === 'set') {
      const raw = interaction.options.getString('when', true);
      const duration = parseDuration(raw);
      if (duration === null || duration < MIN_DELAY_MS) {
        throw new UserFacingError('Use a duration like `10m`, `2h`, or `3d` (minimum 10 seconds).');
      }

      const message = interaction.options.getString('message')?.trim() || 'Reminder';
      const remindAt = new Date(Date.now() + duration);

      const rows = await db
        .insert(reminders)
        .values({
          userId: interaction.user.id,
          channelId: interaction.channelId,
          message,
          remindAt,
        })
        .returning({ id: reminders.id });

      const row = rows[0];
      if (!row) throw new UserFacingError('Could not save that reminder.');

      const unix = Math.floor(remindAt.getTime() / 1000);
      await interaction.editReply({
        content: `Reminder **#${row.id}** set for <t:${unix}:F> (<t:${unix}:R>), in ${formatDuration(
          duration,
        )}.`,
      });
      return;
    }

    if (sub === 'list') {
      const rows = await db
        .select({
          id: reminders.id,
          message: reminders.message,
          remindAt: reminders.remindAt,
        })
        .from(reminders)
        .where(and(eq(reminders.userId, interaction.user.id), eq(reminders.sent, false)))
        .orderBy(asc(reminders.remindAt))
        .limit(10);

      if (rows.length === 0) {
        await interaction.editReply({ content: 'You have no pending reminders.' });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('Your reminders')
        .setDescription(
          rows
            .map(
              (row) =>
                `**#${row.id}** — <t:${Math.floor(row.remindAt.getTime() / 1000)}:R> — ${truncate(
                  row.message,
                  120,
                )}`,
            )
            .join('\n'),
        );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const id = interaction.options.getInteger('id', true);
    const deleted = await db
      .delete(reminders)
      .where(
        and(
          eq(reminders.id, id),
          eq(reminders.userId, interaction.user.id),
          eq(reminders.sent, false),
        ),
      )
      .returning({ id: reminders.id });

    if (deleted.length === 0) {
      throw new UserFacingError('No pending reminder with that ID belongs to you.');
    }

    await interaction.editReply({ content: `Cancelled reminder **#${id}**.` });
  },
};
