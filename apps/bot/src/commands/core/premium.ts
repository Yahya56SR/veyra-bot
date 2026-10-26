import { readGuild } from '@veyra/db';
import { BRAND, PREMIUM_FEATURES, PREMIUM_PLAN } from '@veyra/shared';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';

export const premiumCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription("Show this server's Veyra Premium status."),
  category: 'core',
  cooldownSeconds: 3,
  async execute({ client, interaction, guild }) {
    const premium = await client.isPremium(guild.id);
    const record = client.db ? await readGuild(client.db, guild.id) : null;
    const until = record?.premiumUntil ?? null;
    const dashboard = client.env.DASHBOARD_URL?.replace(/\/$/, '');
    const price = `$${(PREMIUM_PLAN.amountCents / 100).toFixed(2)} / ${PREMIUM_PLAN.interval}`;

    const embed = new EmbedBuilder()
      .setColor(premium ? 0xf59e0b : BRAND.color)
      .setTitle(premium ? 'Veyra Premium' : 'Veyra Free')
      .setDescription(
        premium
          ? 'Premium is active for this server. Thank you for supporting Veyra.'
          : 'This server uses the free core. Premium adds branding, music persistence, longer queues, extended analytics, and priority support.',
      )
      .addFields({
        name: 'Status',
        value: premium
          ? until
            ? `Active until <t:${Math.floor(until.getTime() / 1000)}:F>`
            : 'Active'
          : 'Free',
        inline: true,
      })
      .addFields({ name: 'Price', value: price, inline: true })
      .addFields({
        name: 'Premium includes',
        value: PREMIUM_FEATURES.map((feature) => `- ${feature.name}`).join('\n'),
      })
      .setFooter({ text: BRAND.footer });

    if (dashboard) {
      embed.addFields({
        name: 'Manage',
        value: `[Open the server dashboard](${dashboard}/g/${guild.id}/premium)`,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
