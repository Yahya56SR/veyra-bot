import { cases } from '@nervana/db';
import { eq } from 'drizzle-orm';
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { caseEmbed, requireDb } from '../../modules/moderation/service.js';

export const caseCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('Show a moderation case by number.')
    .addIntegerOption((option) =>
      option.setName('id').setDescription('Case number').setRequired(true).setMinValue(1),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  category: 'moderation',
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  cooldownSeconds: 2,
  async execute({ client, interaction }) {
    await deferEphemeral(interaction);

    const db = requireDb(client);
    const id = interaction.options.getInteger('id', true);

    const rows = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
    const row = rows[0];
    if (!row) throw new UserFacingError(`Case **#${id}** does not exist.`);

    await interaction.editReply({
      embeds: [caseEmbed(row)],
      allowedMentions: { parse: [] },
    });
  },
};
