import { BRAND, type LogEvent } from '@nervana/shared';
import { EmbedBuilder } from 'discord.js';
import type { NervanaClient } from '../../core/client.js';

/** Channel/user suppression shared by every logging handler. */
export function isLogIgnored(
  client: NervanaClient,
  channelId?: string | null,
  userId?: string | null,
): boolean {
  const config = client.settings.logging;
  if (channelId && config.ignoreChannelIds.includes(channelId)) return true;
  if (userId && config.ignoreUserIds.includes(userId)) return true;
  return false;
}

export function logEmbed(title: string, color: number = BRAND.muted): EmbedBuilder {
  return new EmbedBuilder().setColor(color).setTitle(title);
}

export async function sendLog(
  client: NervanaClient,
  event: LogEvent,
  embed: EmbedBuilder,
): Promise<void> {
  const config = client.settings.logging;
  if (!config.enabled) return;

  const channelId = config.channels[event];
  if (!channelId) return;

  const guild = client.guilds.cache.get(client.env.GUILD_ID);
  const channel = guild?.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  embed.setFooter({ text: `${BRAND.footer} · ${event}` }).setTimestamp();

  await channel
    .send({ embeds: [embed], allowedMentions: { parse: [] } })
    .catch((error: unknown) => {
      client.logger.warn({ err: error, event, channelId }, 'failed to send log');
    });
}
