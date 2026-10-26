import { BRAND, truncate } from '@veyra/shared';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferPublic } from '../../core/respond.js';

const MAX_PER_FIELD = 40;

export const emojisCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('emojis')
    .setDescription('List this server’s custom emojis and stickers.'),
  category: 'utility',
  cooldownSeconds: 3,
  async execute({ interaction, guild }) {
    await deferPublic(interaction);

    const emojis = [...guild.emojis.cache.values()];
    const stickers = [...guild.stickers.cache.values()];

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('Server emojis and stickers')
      .setFooter({
        text: `${emojis.length} emoji(s) · ${stickers.length} sticker(s) · showing up to ${MAX_PER_FIELD} each`,
      });

    const emojiText =
      emojis
        .slice(0, MAX_PER_FIELD)
        .map((emoji) =>
          emoji.animated
            ? `<a:${emoji.name}:${emoji.id}> \`${emoji.name}\``
            : `<:${emoji.name}:${emoji.id}> \`${emoji.name}\``,
        )
        .join(' ') || '*No custom emojis.*';

    const stickerText =
      stickers
        .slice(0, MAX_PER_FIELD)
        .map((sticker) => `\`${sticker.name}\` (${sticker.format})`)
        .join(', ') || '*No stickers.*';

    embed.addFields(
      { name: 'Emojis', value: truncate(emojiText, 1024) },
      { name: 'Stickers', value: truncate(stickerText, 1024) },
    );

    await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
