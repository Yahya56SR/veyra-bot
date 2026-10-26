import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { BRAND, formatDuration } from '@veyra/shared';
import type { Command } from '../../core/commands.js';

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Show gateway latency, uptime, and memory usage.'),
  category: 'core',
  cooldownSeconds: 3,
  async execute({ client, interaction }) {
    const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const gateway = Math.round(client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('Pong')
      .addFields(
        {
          name: 'Gateway',
          value: gateway >= 0 ? `${gateway} ms` : 'measuring…',
          inline: true,
        },
        { name: 'Uptime', value: formatDuration(Date.now() - client.startedAt), inline: true },
        { name: 'Memory', value: `${rssMb} MB`, inline: true },
      )
      .setFooter({ text: BRAND.footer });

    await interaction.reply({ embeds: [embed] });
  },
};
