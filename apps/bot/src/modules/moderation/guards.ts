import type { Guild, GuildMember } from 'discord.js';
import { UserFacingError } from '../../core/errors.js';

/** Rejects self-moderation, the owner, and role-hierarchy violations. */
export function assertModeratable(guild: Guild, actor: GuildMember, target: GuildMember): void {
  if (target.id === actor.id) {
    throw new UserFacingError('You cannot moderate yourself.');
  }

  if (target.id === guild.client.user?.id) {
    throw new UserFacingError('You cannot moderate me.');
  }

  if (target.id === guild.ownerId) {
    throw new UserFacingError('The server owner cannot be moderated.');
  }

  const bot = guild.members.me;
  if (!bot) throw new UserFacingError('I am not cached in this server yet. Try again in a moment.');

  if (
    actor.id !== guild.ownerId &&
    actor.roles.highest.comparePositionTo(target.roles.highest) <= 0
  ) {
    throw new UserFacingError('That member has an equal or higher role than you.');
  }

  if (bot.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    throw new UserFacingError('My role is not high enough to moderate that member.');
  }
}

/** Ban checks for users who may not be guild members. */
export function assertBannableId(guild: Guild, actor: GuildMember, userId: string): void {
  if (userId === actor.id) throw new UserFacingError('You cannot ban yourself.');
  if (userId === guild.client.user?.id) throw new UserFacingError('You cannot ban me.');
  if (userId === guild.ownerId) throw new UserFacingError('The server owner cannot be banned.');
}

export async function fetchMember(guild: Guild, userId: string): Promise<GuildMember | null> {
  return guild.members.fetch(userId).catch(() => null);
}
