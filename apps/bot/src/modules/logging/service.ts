import { BRAND, type AppConfig, type LogEvent, type LoggingConfig } from '@veyra/shared';
import { EmbedBuilder } from 'discord.js';
import type { VeyraClient } from '../../core/client.js';
import { brandEmbed } from '../personalizer/service.js';

/** Channel/user suppression shared by every logging handler. */
export function isLogIgnored(
  config: LoggingConfig,
  channelId?: string | null,
  userId?: string | null,
): boolean {
  if (channelId && config.ignoreChannelIds.includes(channelId)) return true;
  if (userId && config.ignoreUserIds.includes(userId)) return true;
  return false;
}

export function logEmbed(title: string, color: number = BRAND.muted): EmbedBuilder {
  return new EmbedBuilder().setColor(color).setTitle(title);
}

export async function sendLog(
  client: VeyraClient,
  guildId: string,
  event: LogEvent,
  embed: EmbedBuilder,
  config?: AppConfig,
): Promise<void> {
  const resolved = config ?? (await client.getConfig(guildId));
  const logging = resolved.logging;
  if (!logging.enabled) return;

  const channelId = logging.channels[event];
  if (!channelId) return;

  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  brandEmbed(client, guildId, embed, resolved, true);
  const footer = embed.data.footer?.text ?? BRAND.footer;
  embed.setFooter({
    text: `${footer} · ${event}`.slice(0, 2048),
    iconURL: embed.data.footer?.icon_url,
  });
  embed.setTimestamp();

  await channel
    .send({ embeds: [embed], allowedMentions: { parse: [] } })
    .catch((error: unknown) => {
      client.logger.warn({ err: error, guildId, event, channelId }, 'failed to send log');
    });
}
