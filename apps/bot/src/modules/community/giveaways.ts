import { giveawayEntries, giveaways, members, type Database } from '@veyra/db';
import { randomInt } from '@veyra/shared';
import { and, eq, lte } from 'drizzle-orm';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Guild,
  type GuildMember,
  type Message,
  type TextChannel,
  type User,
} from 'discord.js';
import { randomUUID } from 'node:crypto';
import type { VeyraClient } from '../../core/client.js';
import { requireDb } from '../../core/database.js';
import { UserFacingError } from '../../core/errors.js';

export type GiveawayRow = typeof giveaways.$inferSelect;
export type GiveawayEntry = typeof giveawayEntries.$inferSelect;
export interface GiveawayRequirements {
  level?: number;
  roleId?: string;
}

export function pickWinners<T extends { userId: string }>(
  entries: readonly T[],
  count: number,
): T[] {
  if (entries.length === 0 || count <= 0) return [];
  const pool = [...entries];
  const winners: T[] = [];
  const target = Math.min(count, pool.length);

  while (winners.length < target) {
    const index = randomInt(0, pool.length - 1);
    const [entry] = pool.splice(index, 1);
    if (entry) winners.push(entry);
  }

  return winners;
}

export function requirementLabel(requirements: GiveawayRequirements | null): string {
  if (!requirements) return 'None';
  const parts: string[] = [];
  if (requirements.level) parts.push(`Level ${requirements.level}+`);
  if (requirements.roleId) parts.push(`<@&${requirements.roleId}>`);
  return parts.length > 0 ? parts.join(' and ') : 'None';
}

export function giveawayEmbed(
  giveaway: GiveawayRow,
  ended = false,
  entryCount?: number,
): EmbedBuilder {
  const unix = Math.floor(giveaway.endsAt.getTime() / 1000);
  const embed = new EmbedBuilder()
    .setColor(ended ? 0x99aab5 : 0xfee75c)
    .setTitle(ended ? `Giveaway ended: ${giveaway.prize}` : `Giveaway: ${giveaway.prize}`)
    .setDescription(
      ended
        ? 'The giveaway has ended. Winners are announced below.'
        : `Click **Enter** for a chance to win.\n\nEnds <t:${unix}:F> (<t:${unix}:R>)`,
    )
    .addFields(
      { name: 'Winners', value: `**${giveaway.winnerCount}**`, inline: true },
      {
        name: 'Requirements',
        value: requirementLabel(giveaway.requirements),
        inline: true,
      },
      ...(entryCount !== undefined
        ? [{ name: 'Entries', value: `**${entryCount}**`, inline: true }]
        : []),
    )
    .setFooter({ text: `Giveaway #${giveaway.id}` });

  return embed;
}

export function giveawayComponents(
  id: number,
  disabled = false,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway:enter:${id}`)
        .setLabel(disabled ? 'Ended' : 'Enter')
        .setStyle(disabled ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(disabled),
    ),
  ];
}

export async function createGiveaway(
  client: VeyraClient,
  channel: TextChannel,
  prize: string,
  durationMs: number,
  winnerCount: number,
  requirements: GiveawayRequirements | null,
): Promise<{ message: Message; giveaway: GiveawayRow }> {
  const db = requireDb(client);
  const endsAt = new Date(Date.now() + durationMs);

  const inserted = await db
    .insert(giveaways)
    .values({
      guildId: channel.guild.id,
      channelId: channel.id,
      messageId: `pending-${randomUUID()}`,
      prize,
      winnerCount,
      requirements,
      endsAt,
      ended: false,
    })
    .returning();

  const giveaway = inserted[0];
  if (!giveaway) throw new UserFacingError('Could not create that giveaway.');

  try {
    const message = await channel.send({
      embeds: [giveawayEmbed(giveaway)],
      components: giveawayComponents(giveaway.id),
      allowedMentions: { parse: [] },
    });

    await db.update(giveaways).set({ messageId: message.id }).where(eq(giveaways.id, giveaway.id));

    return {
      message,
      giveaway: { ...giveaway, messageId: message.id },
    };
  } catch (error) {
    await db
      .delete(giveaways)
      .where(eq(giveaways.id, giveaway.id))
      .catch(() => {});
    throw error;
  }
}

export async function findGiveaway(
  db: Database,
  guildId: string,
  messageId: string,
): Promise<GiveawayRow | null> {
  const rows = await db
    .select()
    .from(giveaways)
    .where(and(eq(giveaways.guildId, guildId), eq(giveaways.messageId, messageId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function entryBlockedReason(
  client: VeyraClient,
  guild: Guild,
  userId: string,
  requirements: GiveawayRequirements | null,
): Promise<string | null> {
  if (!requirements) return null;

  if (requirements.level) {
    const rows = await requireDb(client)
      .select({ level: members.level })
      .from(members)
      .where(and(eq(members.guildId, guild.id), eq(members.userId, userId)))
      .limit(1);
    const level = rows[0]?.level ?? 0;
    if (level < requirements.level) {
      return `You need level **${requirements.level}** or higher to enter.`;
    }
  }

  if (requirements.roleId) {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member?.roles.cache.has(requirements.roleId)) {
      return `You need <@&${requirements.roleId}> to enter.`;
    }
  }

  return null;
}

export async function enterGiveaway(
  client: VeyraClient,
  guild: Guild,
  user: User,
  giveawayId: number,
): Promise<{ giveaway: GiveawayRow; alreadyEntered: boolean }> {
  if (user.bot) throw new UserFacingError('Bots cannot enter giveaways.');
  const db = requireDb(client);

  const rows = await db
    .select()
    .from(giveaways)
    .where(and(eq(giveaways.guildId, guild.id), eq(giveaways.id, giveawayId)))
    .limit(1);
  const giveaway = rows[0];
  if (!giveaway) throw new UserFacingError('That giveaway no longer exists.');
  if (giveaway.ended || giveaway.endsAt.getTime() <= Date.now()) {
    throw new UserFacingError('That giveaway has already ended.');
  }
  if (giveaway.messageId.startsWith('pending-')) {
    throw new UserFacingError('That giveaway is still being set up.');
  }

  const blocked = await entryBlockedReason(client, guild, user.id, giveaway.requirements);
  if (blocked) throw new UserFacingError(blocked);

  const inserted = await db
    .insert(giveawayEntries)
    .values({ giveawayId, userId: user.id })
    .onConflictDoNothing()
    .returning({ userId: giveawayEntries.userId });

  return { giveaway, alreadyEntered: inserted.length === 0 };
}

export async function endGiveaway(
  client: VeyraClient,
  giveaway: GiveawayRow,
  reason: 'automatic' | 'manual',
): Promise<{ winners: GiveawayEntry[]; message: Message | null }> {
  const db = requireDb(client);

  const claimed = await db
    .update(giveaways)
    .set({ ended: true })
    .where(and(eq(giveaways.id, giveaway.id), eq(giveaways.ended, false)))
    .returning();

  if (claimed.length === 0) {
    throw new UserFacingError('That giveaway was already ended.');
  }

  const entries = await db
    .select()
    .from(giveawayEntries)
    .where(eq(giveawayEntries.giveawayId, giveaway.id));
  const winners = pickWinners(entries, giveaway.winnerCount);

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased() || !channel.isSendable()) {
    client.logger.warn({ giveawayId: giveaway.id }, 'giveaway channel is unavailable');
    return { winners, message: null };
  }

  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (message) {
    await message
      .edit({
        embeds: [giveawayEmbed({ ...giveaway, ended: true }, true, entries.length)],
        components: giveawayComponents(giveaway.id, true),
      })
      .catch((error: unknown) => {
        client.logger.warn({ err: error, giveawayId: giveaway.id }, 'giveaway message edit failed');
      });
  }

  const winnerText =
    winners.length > 0
      ? winners.map((winner) => `<@${winner.userId}>`).join(', ')
      : 'No valid entries.';

  await channel
    .send({
      content: `**Giveaway ended (${reason})**: ${giveaway.prize}\nWinners: ${winnerText}`,
      allowedMentions:
        winners.length > 0 ? { users: winners.map((winner) => winner.userId) } : { parse: [] },
    })
    .catch((error: unknown) => {
      client.logger.warn({ err: error, giveawayId: giveaway.id }, 'giveaway winner message failed');
    });

  return { winners, message };
}

export async function rerollGiveaway(
  client: VeyraClient,
  giveaway: GiveawayRow,
  winnerCount: number,
): Promise<GiveawayEntry[]> {
  if (!giveaway.ended) throw new UserFacingError('End that giveaway before rerolling it.');

  const entries = await requireDb(client)
    .select()
    .from(giveawayEntries)
    .where(eq(giveawayEntries.giveawayId, giveaway.id));
  const winners = pickWinners(entries, winnerCount);

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel?.isTextBased() || !channel.isSendable()) {
    throw new UserFacingError('The giveaway channel is unavailable.');
  }

  await channel.send({
    content:
      winners.length > 0
        ? `**Giveaway reroll**: ${giveaway.prize}\nNew winners: ${winners
            .map((winner) => `<@${winner.userId}>`)
            .join(', ')}`
        : `**Giveaway reroll**: ${giveaway.prize}\nNo valid entries.`,
    allowedMentions:
      winners.length > 0 ? { users: winners.map((winner) => winner.userId) } : { parse: [] },
  });

  return winners;
}

const TICK_MS = 10_000;

/** Ends due giveaways from Postgres, so restarts never strand a giveaway. */
export class GiveawayScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly client: VeyraClient) {}

  start(): void {
    if (this.timer || !this.client.isReady()) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_MS);
    this.timer.unref();
    void this.tick();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    const db = this.client.db;
    if (!db || !this.client.isReady() || this.running) return;

    this.running = true;
    try {
      const due = await db
        .select()
        .from(giveaways)
        .where(and(eq(giveaways.ended, false), lte(giveaways.endsAt, new Date())))
        .limit(10);

      for (const giveaway of due) {
        await endGiveaway(this.client, giveaway, 'automatic').catch((error: unknown) => {
          this.client.logger.error({ err: error, giveawayId: giveaway.id }, 'giveaway end failed');
        });
      }
    } catch (error) {
      this.client.logger.error({ err: error }, 'giveaway sweep failed');
    } finally {
      this.running = false;
    }
  }
}
