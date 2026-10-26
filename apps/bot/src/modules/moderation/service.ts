import type { Database } from '@veyra/db';
import { cases, warnings } from '@veyra/db';
import { BRAND, formatDuration } from '@veyra/shared';
import { EmbedBuilder } from 'discord.js';
import type { VeyraClient } from '../../core/client.js';
import { requireDb } from '../../core/database.js';
import { UserFacingError } from '../../core/errors.js';
import { brandEmbed } from '../personalizer/service.js';

export { requireDb };

export type CaseType =
  | 'warn'
  | 'warn-clear'
  | 'timeout'
  | 'timeout-clear'
  | 'kick'
  | 'ban'
  | 'unban'
  | 'softban'
  | 'purge'
  | 'slowmode';

export interface CreateCaseInput {
  guildId: string;
  type: CaseType;
  targetId: string;
  moderatorId: string;
  reason: string;
  durationMs?: number | null;
  /** Overrides the default active state for event-style cases. */
  active?: boolean;
  /** Warn cases create an active warning row unless explicitly disabled. */
  warning?: boolean;
}

/** Cases that represent an ongoing state rather than a one-off event. */
const ACTIVE_CASE_TYPES = new Set<CaseType>(['warn', 'timeout', 'ban', 'slowmode']);

export type CaseRow = typeof cases.$inferSelect;

const CASE_LABELS: Record<CaseType, string> = {
  warn: 'Warning',
  'warn-clear': 'Warnings cleared',
  timeout: 'Timeout',
  'timeout-clear': 'Timeout removed',
  kick: 'Kick',
  ban: 'Ban',
  unban: 'Unban',
  softban: 'Softban',
  purge: 'Purge',
  slowmode: 'Slowmode',
};

const CASE_COLORS: Record<CaseType, number> = {
  warn: BRAND.warning,
  'warn-clear': BRAND.success,
  timeout: BRAND.warning,
  'timeout-clear': BRAND.success,
  kick: BRAND.danger,
  ban: BRAND.danger,
  unban: BRAND.success,
  softban: BRAND.danger,
  purge: BRAND.info,
  slowmode: BRAND.info,
};

export function caseLabel(type: string): string {
  return CASE_LABELS[type as CaseType] ?? type;
}

/** Discord rejects audit-log reasons longer than 512 characters. */
export function auditReason(reason: string): string {
  return reason.slice(0, 512);
}

/** Purge and slowmode cases target a channel; every other case targets a user. */
export function targetMention(type: string, targetId: string): string {
  return type === 'slowmode' || type === 'purge' ? `<#${targetId}>` : `<@${targetId}>`;
}

export async function createCase(db: Database, input: CreateCaseInput): Promise<CaseRow> {
  const durationMs = input.durationMs ?? null;
  const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;

  return db.transaction(async (tx) => {
    const rows = await tx
      .insert(cases)
      .values({
        guildId: input.guildId,
        type: input.type,
        targetId: input.targetId,
        moderatorId: input.moderatorId,
        reason: input.reason,
        durationMs,
        expiresAt,
        active: input.active ?? ACTIVE_CASE_TYPES.has(input.type),
      })
      .returning();

    const row = rows[0];
    if (!row) throw new UserFacingError('Could not record that case.');

    if (input.type === 'warn' && input.warning !== false) {
      await tx.insert(warnings).values({
        caseId: row.id,
        guildId: input.guildId,
        userId: input.targetId,
        active: true,
      });
    }

    return row;
  });
}

/** Records a case, writes the mod log, and DMs the target. */
export async function finishModAction(
  client: VeyraClient,
  input: CreateCaseInput,
): Promise<CaseRow> {
  const row = await createCase(requireDb(client), input);
  await Promise.allSettled([sendModLog(client, row), dmTarget(client, row)]);
  return row;
}

/**
 * Sends an arbitrary embed to the configured case log. `modLogChannelId` is
 * authoritative; `logging.channels.modAction` is the fallback.
 */
export async function sendModLogEmbed(
  client: VeyraClient,
  guildId: string,
  embed: EmbedBuilder,
): Promise<void> {
  const appConfig = await client.getConfig(guildId);
  const config = appConfig.moderation;
  const channelId =
    config.modLogChannelId ??
    (appConfig.logging.enabled ? appConfig.logging.channels.modAction : null);

  if (!channelId) return;

  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  brandEmbed(client, guildId, embed, appConfig, true);
  if (!embed.data.footer) embed.setFooter({ text: BRAND.footer });
  if (!embed.data.timestamp) embed.setTimestamp();

  await channel
    .send({ embeds: [embed], allowedMentions: { parse: [] } })
    .catch((error: unknown) => {
      client.logger.warn({ err: error, guildId, channelId }, 'failed to send moderation log');
    });
}

export async function sendModLog(client: VeyraClient, row: CaseRow): Promise<void> {
  const type = row.type as CaseType;
  const embed = new EmbedBuilder()
    .setColor(CASE_COLORS[type] ?? BRAND.muted)
    .setTitle(`Case #${row.id} · ${caseLabel(row.type)}`)
    .addFields(
      {
        name: 'Target',
        value: `${targetMention(row.type, row.targetId)}\n\`${row.targetId}\``,
        inline: true,
      },
      { name: 'Moderator', value: `<@${row.moderatorId}>\n\`${row.moderatorId}\``, inline: true },
      { name: 'Reason', value: row.reason.slice(0, 1024), inline: false },
    )
    .setTimestamp(row.createdAt)
    .setFooter({ text: BRAND.footer });

  if (row.durationMs) {
    embed.addFields({ name: 'Duration', value: formatDuration(row.durationMs), inline: true });
  }

  if (row.expiresAt) {
    embed.addFields({
      name: 'Expires',
      value: `<t:${Math.floor(row.expiresAt.getTime() / 1000)}:F>`,
      inline: true,
    });
  }

  await sendModLogEmbed(client, row.guildId, embed);
}

async function dmTarget(client: VeyraClient, row: CaseRow): Promise<void> {
  const config = await client.getConfig(row.guildId);
  if (!config.moderation.dmOnPunish) return;

  const type = row.type as CaseType;
  if (!['warn', 'timeout', 'kick', 'ban', 'softban', 'unban'].includes(type)) return;

  const guild = client.guilds.cache.get(row.guildId);
  const server = guild?.name ?? 'the server';
  const duration = row.durationMs ? ` for ${formatDuration(row.durationMs)}` : '';

  const bodies: Partial<Record<CaseType, string>> = {
    warn: `You received a warning in **${server}**.`,
    timeout: `You were timed out in **${server}**${duration}.`,
    kick: `You were kicked from **${server}**.`,
    ban: `You were banned from **${server}**${duration}.`,
    softban: `You were removed from **${server}**.`,
    unban: `You were unbanned from **${server}**.`,
  };

  const body = bodies[type];
  if (!body) return;

  try {
    const user = await client.users.fetch(row.targetId);
    await user.send(
      `${body}\n\n**Reason:** ${row.reason}\n**Case:** #${row.id}\n\nIf you believe this was a mistake, contact the server staff.`,
    );
  } catch {
    // DMs closed or the user no longer exists.
  }
}

export function caseEmbed(row: CaseRow): EmbedBuilder {
  const type = row.type as CaseType;
  const embed = new EmbedBuilder()
    .setColor(CASE_COLORS[type] ?? BRAND.muted)
    .setTitle(`Case #${row.id} · ${caseLabel(row.type)}`)
    .addFields(
      {
        name: 'Target',
        value: `${targetMention(row.type, row.targetId)} \`${row.targetId}\``,
        inline: true,
      },
      { name: 'Moderator', value: `<@${row.moderatorId}>`, inline: true },
      { name: 'Reason', value: row.reason.slice(0, 1024) },
      { name: 'Active', value: row.active ? 'Yes' : 'No', inline: true },
    )
    .setTimestamp(row.createdAt)
    .setFooter({ text: BRAND.footer });

  if (row.durationMs) {
    embed.addFields({ name: 'Duration', value: formatDuration(row.durationMs), inline: true });
  }

  if (row.expiresAt) {
    embed.addFields({
      name: 'Expires',
      value: `<t:${Math.floor(row.expiresAt.getTime() / 1000)}:F>`,
      inline: true,
    });
  }

  return embed;
}
