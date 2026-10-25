import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import {
  BRAND,
  CATEGORY_LABELS,
  COMMAND_CATEGORIES,
  truncate,
  type CommandCategory,
} from '@nervana/shared';
import type { Command } from '../../core/commands.js';

export const helpCommand: Command = {
  data: new SlashCommandBuilder().setName('help').setDescription('List the commands you can use.'),
  category: 'core',
  cooldownSeconds: 3,
  async execute({ client, interaction, member, settings }) {
    const visible = [...client.commands.values()].filter((command) => {
      if (!client.isCategoryEnabled(command.category)) return false;
      if (!command.userPermissions?.length) return true;
      return member.permissions.has(command.userPermissions);
    });

    const groups = new Map<CommandCategory, string[]>();

    for (const command of visible) {
      const bucket = groups.get(command.category) ?? [];
      bucket.push(`\`/${command.data.name}\` — ${command.data.description}`);
      groups.set(command.category, bucket);
    }

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('Nervana commands')
      .setDescription(
        `${visible.length} command${visible.length === 1 ? '' : 's'} available to you in this server.`,
      )
      .setFooter({ text: BRAND.footer });

    for (const category of COMMAND_CATEGORIES) {
      const entries = groups.get(category);
      if (!entries?.length) continue;

      embed.addFields({
        name: CATEGORY_LABELS[category],
        value: truncate(entries.sort().join('\n'), 1000),
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
