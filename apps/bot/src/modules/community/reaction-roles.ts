import { reactionRoles } from '@nervana/db';
import { and, eq } from 'drizzle-orm';
import {
  PermissionFlagsBits,
  type GuildMember,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
} from 'discord.js';
import type { NervanaClient } from '../../core/client.js';
import { requireDb } from '../../core/database.js';
import { UserFacingError } from '../../core/errors.js';

export type ReactionRoleRow = typeof reactionRoles.$inferSelect;

export function normalizeEmoji(value: string): string {
  return value.trim();
}

export function isSelectRow(row: ReactionRoleRow): boolean {
  return row.mode === 'select' || row.emoji.startsWith('select:');
}

function canManageRole(client: NervanaClient, member: GuildMember, roleId: string): boolean {
  const guild = member.guild;
  const role = guild.roles.cache.get(roleId);
  const me = guild.members.me;
  if (!role || !me) return false;
  if (role.id === guild.id || role.managed) return false;
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) return false;
  return role.position < me.roles.highest.position;
}

async function applyRole(
  client: NervanaClient,
  member: GuildMember,
  roleId: string,
  add: boolean,
): Promise<boolean> {
  if (!canManageRole(client, member, roleId)) {
    client.logger.warn({ roleId, userId: member.id }, 'reaction role is not manageable');
    return false;
  }

  try {
    if (add) await member.roles.add(roleId, 'Reaction role');
    else await member.roles.remove(roleId, 'Reaction role removed');
    return true;
  } catch (error) {
    client.logger.warn({ err: error, roleId, userId: member.id }, 'reaction role update failed');
    return false;
  }
}

async function rowsForReaction(
  client: NervanaClient,
  messageId: string,
  emoji: string,
): Promise<ReactionRoleRow[]> {
  return requireDb(client)
    .select()
    .from(reactionRoles)
    .where(and(eq(reactionRoles.messageId, messageId), eq(reactionRoles.emoji, emoji)));
}

async function removeGroupRoles(
  client: NervanaClient,
  member: GuildMember,
  row: ReactionRoleRow,
): Promise<void> {
  if (row.mode !== 'unique') return;

  const db = requireDb(client);
  const siblings = row.groupKey
    ? await db
        .select()
        .from(reactionRoles)
        .where(
          and(eq(reactionRoles.messageId, row.messageId), eq(reactionRoles.groupKey, row.groupKey)),
        )
    : await db.select().from(reactionRoles).where(eq(reactionRoles.messageId, row.messageId));

  for (const sibling of siblings) {
    if (sibling.roleId !== row.roleId && member.roles.cache.has(sibling.roleId)) {
      await applyRole(client, member, sibling.roleId, false);
    }
  }
}

export async function handleReactionRoleAdd(
  client: NervanaClient,
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  if (user.bot) return;
  if (!reaction.message.inGuild()) return;
  if (reaction.message.guildId !== client.env.GUILD_ID) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  if (reaction.message.partial) await reaction.message.fetch().catch(() => null);

  const emoji = normalizeEmoji(reaction.emoji.toString());
  const rows = await rowsForReaction(client, reaction.message.id, emoji);
  if (rows.length === 0) return;

  const member = await reaction.message.guild?.members.fetch(user.id).catch(() => null);
  if (!member) return;

  for (const row of rows) {
    if (isSelectRow(row)) continue;
    await removeGroupRoles(client, member, row);
    await applyRole(client, member, row.roleId, true);
  }
}

export async function handleReactionRoleRemove(
  client: NervanaClient,
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  if (user.bot) return;
  if (!reaction.message.inGuild()) return;
  if (reaction.message.guildId !== client.env.GUILD_ID) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  if (reaction.message.partial) await reaction.message.fetch().catch(() => null);

  const emoji = normalizeEmoji(reaction.emoji.toString());
  const rows = await rowsForReaction(client, reaction.message.id, emoji);
  if (rows.length === 0) return;

  const member = await reaction.message.guild?.members.fetch(user.id).catch(() => null);
  if (!member) return;

  for (const row of rows) {
    if (!isSelectRow(row)) await applyRole(client, member, row.roleId, false);
  }
}

export async function applySelectRoles(
  client: NervanaClient,
  member: GuildMember,
  messageId: string,
  selectedRoleIds: readonly string[],
): Promise<{ added: number; removed: number }> {
  const rows = await requireDb(client)
    .select()
    .from(reactionRoles)
    .where(and(eq(reactionRoles.messageId, messageId), eq(reactionRoles.mode, 'select')));

  if (rows.length === 0) {
    throw new UserFacingError('That reaction-role panel no longer exists.');
  }

  const allowed = new Set(rows.map((row) => row.roleId));
  for (const roleId of selectedRoleIds) {
    if (!allowed.has(roleId)) {
      throw new UserFacingError('That panel does not offer the selected role.');
    }
  }

  const selected = new Set(selectedRoleIds);
  let added = 0;
  let removed = 0;

  for (const row of rows) {
    const shouldHave = selected.has(row.roleId);
    const has = member.roles.cache.has(row.roleId);
    if (shouldHave && !has) {
      if (await applyRole(client, member, row.roleId, true)) added += 1;
    } else if (!shouldHave && has) {
      if (await applyRole(client, member, row.roleId, false)) removed += 1;
    }
  }

  return { added, removed };
}
