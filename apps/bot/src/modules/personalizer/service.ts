import { BRAND, type AppConfig, type PersonalizerConfig } from '@veyra/shared';
import { EmbedBuilder, type ColorResolvable, type Guild } from 'discord.js';
import type { VeyraClient } from '../../core/client.js';

export function personalizerActive(
  config: PersonalizerConfig,
  premium: boolean,
): config is PersonalizerConfig & { enabled: true } {
  return premium && config.enabled;
}

/** Applies the server nickname. Discord does not allow per-server avatars. */
export async function applyPersonalizer(
  client: VeyraClient,
  guild: Guild,
  config?: AppConfig,
): Promise<void> {
  const resolved = config ?? (await client.getConfig(guild.id));
  const me = guild.members.me;
  if (!me) return;

  // Avoid a premium lookup on every boot for the common default case, but
  // still clean up a nickname left behind by an expired grant.
  if (!resolved.personalizer.enabled && me.nickname === null) return;

  const premium = await client.isPremium(guild.id);
  const active = personalizerActive(resolved.personalizer, premium);
  const nickname = active ? resolved.personalizer.nickname : null;

  try {
    if (nickname && me.nickname !== nickname) {
      await me.setNickname(nickname, 'Veyra personalizer');
    } else if (!nickname && me.nickname !== null) {
      await me.setNickname(null, 'Veyra personalizer reset');
    }
  } catch (error) {
    client.logger.warn({ err: error, guildId: guild.id }, 'could not apply personalizer nickname');
  }
}

/**
 * Applies the guild's embed branding. Callers can opt out for embeds where the
 * server's custom colour would hurt readability.
 */
export function brandEmbed(
  client: VeyraClient,
  guildId: string,
  embed: EmbedBuilder,
  config?: AppConfig,
  preserveColor = false,
): EmbedBuilder {
  const cached = client.settingsCache.get(guildId)?.config;
  const resolved = config ?? cached;
  const personalizer = resolved?.personalizer;

  if (personalizer?.enabled && client.premiumCached(guildId)) {
    if (!preserveColor) embed.setColor(personalizer.embedColor as ColorResolvable);
    if (personalizer.footerText) {
      embed.setFooter({
        text: personalizer.footerText,
        iconURL: personalizer.footerIconUrl ?? undefined,
      });
    }
    if (personalizer.thumbnailUrl && !embed.data.thumbnail) {
      embed.setThumbnail(personalizer.thumbnailUrl);
    }
    return embed;
  }

  if (!embed.data.color) embed.setColor(BRAND.color);
  if (!embed.data.footer) embed.setFooter({ text: BRAND.footer });
  return embed;
}

/** Renders the optional premium level-up line with safe placeholder substitution. */
export function renderLevelUpMessage(
  template: string | null,
  values: { user: string; username: string; level: number; server: string },
): string | null {
  if (!template) return null;
  return template
    .replaceAll('{user}', values.user)
    .replaceAll('{username}', values.username)
    .replaceAll('{level}', String(values.level))
    .replaceAll('{server}', values.server)
    .slice(0, 2000);
}
