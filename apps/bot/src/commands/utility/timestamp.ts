import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferPublic } from '../../core/respond.js';
import { parseTimestampInput } from '../../modules/utility/time.js';

const STYLES = [
  ['Full date and time', 'F'],
  ['Relative', 'R'],
  ['Long date', 'D'],
  ['Long time', 'T'],
  ['Short date', 'd'],
  ['Short time', 't'],
] as const;

export const timestampCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Convert a time into copy-ready Discord timestamps.')
    .addStringOption((option) =>
      option
        .setName('time')
        .setDescription('10m, 2h, 2026-12-31 18:00, a Unix timestamp, or <t:...>')
        .setRequired(true)
        .setMaxLength(100),
    ),
  category: 'utility',
  cooldownSeconds: 2,
  async execute({ interaction }) {
    await deferPublic(interaction);

    const raw = interaction.options.getString('time', true);
    const epoch = parseTimestampInput(raw);
    if (epoch === null) {
      throw new UserFacingError(
        'Could not understand that time. Try `10m`, `2h`, `2026-12-31 18:00`, or a Unix timestamp.',
      );
    }

    const unix = Math.floor(epoch / 1000);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Discord timestamps')
      .setDescription(`Input: \`${raw}\``)
      .addFields(
        STYLES.map(([name, style]) => ({
          name,
          value: `\`<t:${unix}:${style}>\` → <t:${unix}:${style}>`,
        })),
      )
      .setFooter({ text: `Unix seconds: ${unix}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
