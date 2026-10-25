import { BRAND } from '@nervana/shared';
import { EmbedBuilder, PermissionFlagsBits, type GuildMember, type Message } from 'discord.js';
import type { NervanaClient } from '../../core/client.js';
import { auditReason, finishModAction, sendModLogEmbed } from '../moderation/service.js';
import {
  capsStats,
  containsInvite,
  extractHosts,
  findBannedWord,
  isAllowlistedHost,
} from './rules.js';

const AUTOMOD_TIMEOUT_MS = 10 * 60_000;
const ACTION_COOLDOWN_MS = 30_000;
const MAX_TRACKED_USERS = 5_000;

type RuleName = 'invites' | 'links' | 'spam' | 'mentions' | 'caps' | 'words';

export class AutomodService {
  private readonly spam = new Map<string, number[]>();
  private readonly actionCooldown = new Map<string, number>();
  private readonly joinTimes: number[] = [];
  private raidUntil = 0;

  constructor(private readonly client: NervanaClient) {}

  /** Returns true when the message was handled by automod (and should not earn XP). */
  async handleMessage(message: Message): Promise<boolean> {
    if (!message.inGuild() || message.guildId !== this.client.env.GUILD_ID) return false;
    if (message.author.bot || message.system) return false;

    const config = this.client.settings.moderation;
    const automod = config.automod;
    if (!automod.enabled) return false;
    if (this.isExempt(message)) return false;

    const content = message.content ?? '';
    if (!content) return false;

    if (automod.invites.enabled && containsInvite(content)) {
      return this.trigger(message, 'invites', automod.invites.action, 'Discord invite link');
    }

    if (automod.links.enabled) {
      const blocked = extractHosts(content).filter(
        (host) => !isAllowlistedHost(host, automod.links.allowlist),
      );

      if (blocked.length > 0) {
        return this.trigger(
          message,
          'links',
          automod.links.action,
          `Blocked link(s): ${blocked.slice(0, 5).join(', ')}`,
        );
      }
    }

    if (
      automod.spam.enabled &&
      this.isSpam(message.author.id, automod.spam.messageThreshold, automod.spam.windowSeconds)
    ) {
      return this.trigger(
        message,
        'spam',
        automod.spam.action,
        `${automod.spam.messageThreshold}+ messages in ${automod.spam.windowSeconds}s`,
      );
    }

    if (automod.mentions.enabled) {
      const mentions = message.mentions.users.size + message.mentions.roles.size;
      if (message.mentions.everyone || mentions > automod.mentions.maxMentions) {
        return this.trigger(
          message,
          'mentions',
          automod.mentions.action,
          message.mentions.everyone ? 'Mass mention (@everyone/@here)' : `${mentions} mentions`,
        );
      }
    }

    if (automod.caps.enabled) {
      const stats = capsStats(content);
      if (stats.letters >= automod.caps.minLength && stats.percent >= automod.caps.percent) {
        return this.trigger(
          message,
          'caps',
          automod.caps.action,
          `${stats.percent}% uppercase across ${stats.letters} letters`,
        );
      }
    }

    if (automod.words.enabled) {
      const match = findBannedWord(content, automod.words.words);
      if (match) {
        return this.trigger(message, 'words', automod.words.action, 'Matched a filtered word');
      }
    }

    return false;
  }

  /** Returns true when raid protection handled this join. */
  async handleJoin(member: GuildMember): Promise<boolean> {
    if (member.guild.id !== this.client.env.GUILD_ID) return false;

    const automod = this.client.settings.moderation.automod;
    if (!automod.enabled || !automod.raid.enabled) return false;

    const now = Date.now();
    const windowMs = automod.raid.windowSeconds * 1000;

    this.joinTimes.push(now);
    while (this.joinTimes.length > 0 && now - (this.joinTimes[0] ?? now) >= windowMs) {
      this.joinTimes.shift();
    }

    const active = this.raidUntil > now;
    const count = this.joinTimes.length;

    if (!active && count < automod.raid.joinThreshold) return false;

    if (!active) {
      this.raidUntil = now + windowMs;
      this.joinTimes.length = 0;

      const alert = new EmbedBuilder()
        .setColor(BRAND.danger)
        .setTitle('Possible raid detected')
        .setDescription(
          `**${count}** joins within **${automod.raid.windowSeconds}s**.\nRaid mode is active for ${automod.raid.windowSeconds}s · action: **${automod.raid.action}**.`,
        )
        .setTimestamp();

      await sendModLogEmbed(this.client, alert);
    }

    // Only a successful kick removes the member; warned/timed-out members (and
    // members we could not kick) still get the welcome flow and auto roles.
    return this.applyRaidAction(
      member,
      automod.raid.action,
      `Raid protection: ${count} joins in ${automod.raid.windowSeconds}s`,
    );
  }

  private isExempt(message: Message): boolean {
    const config = this.client.settings.moderation;
    if (config.exemptChannelIds.includes(message.channelId)) return true;

    const member = message.member;
    if (!member) return true;
    if (member.id === message.guild?.ownerId) return true;
    if (config.exemptRoleIds.some((roleId) => member.roles.cache.has(roleId))) return true;

    // Staff should not be punished by automod.
    return member.permissions.has(PermissionFlagsBits.ManageMessages);
  }

  private isSpam(userId: string, threshold: number, windowSeconds: number): boolean {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const recent = (this.spam.get(userId) ?? []).filter((at) => now - at < windowMs);

    recent.push(now);
    this.spam.set(userId, recent);
    this.prune(this.spam, now - windowMs);

    if (recent.length >= threshold) {
      this.spam.delete(userId);
      return true;
    }

    return false;
  }

  private onCooldown(userId: string, rule: RuleName): boolean {
    const key = `${userId}:${rule}`;
    const now = Date.now();
    const at = this.actionCooldown.get(key);

    if (at !== undefined && now - at < ACTION_COOLDOWN_MS) return true;

    this.actionCooldown.set(key, now);
    if (this.actionCooldown.size > MAX_TRACKED_USERS) {
      const oldest = this.actionCooldown.keys().next().value;
      if (oldest) this.actionCooldown.delete(oldest);
    }

    return false;
  }

  private prune(map: Map<string, number[]>, cutoff: number): void {
    if (map.size <= MAX_TRACKED_USERS) return;

    for (const [key, times] of map) {
      const last = times[times.length - 1];
      if (last === undefined || last < cutoff) map.delete(key);
    }
  }

  private async trigger(
    message: Message,
    rule: RuleName,
    action: 'delete' | 'warn' | 'timeout' | 'kick',
    detail: string,
  ): Promise<boolean> {
    await message.delete().catch(() => {});

    if (action === 'delete') return true;
    if (this.onCooldown(message.author.id, rule)) return true;

    const member = message.member;
    if (!member) return true;

    const reason = `Automod (${rule}): ${detail}`;
    const moderatorId = this.client.user?.id ?? 'automod';

    try {
      if (action === 'warn') {
        await finishModAction(this.client, {
          type: 'warn',
          targetId: member.id,
          moderatorId,
          reason,
        });
      } else if (action === 'timeout') {
        if (!member.moderatable) throw new Error('Member is not moderatable');
        await member.timeout(AUTOMOD_TIMEOUT_MS, auditReason(reason));
        await finishModAction(this.client, {
          type: 'timeout',
          targetId: member.id,
          moderatorId,
          reason,
          durationMs: AUTOMOD_TIMEOUT_MS,
        });
      } else if (action === 'kick') {
        if (!member.kickable) throw new Error('Member is not kickable');
        await member.kick(auditReason(reason));
        await finishModAction(this.client, {
          type: 'kick',
          targetId: member.id,
          moderatorId,
          reason,
        });
      }
    } catch (error) {
      this.client.logger.warn(
        { err: error, userId: member.id, rule, action },
        'automod action failed',
      );
    }

    return true;
  }

  private async applyRaidAction(
    member: GuildMember,
    action: 'delete' | 'warn' | 'timeout' | 'kick',
    reason: string,
  ): Promise<boolean> {
    if (action === 'delete') return false;

    const moderatorId = this.client.user?.id ?? 'automod';

    try {
      if (action === 'warn') {
        await finishModAction(this.client, {
          type: 'warn',
          targetId: member.id,
          moderatorId,
          reason,
        });
      } else if (action === 'timeout') {
        if (!member.moderatable) return false;
        await member.timeout(AUTOMOD_TIMEOUT_MS, auditReason(reason));
        await finishModAction(this.client, {
          type: 'timeout',
          targetId: member.id,
          moderatorId,
          reason,
          durationMs: AUTOMOD_TIMEOUT_MS,
        });
      } else if (action === 'kick') {
        if (!member.kickable) return false;
        await member.kick(auditReason(reason));
        await finishModAction(this.client, {
          type: 'kick',
          targetId: member.id,
          moderatorId,
          reason,
        });
        return true;
      }
    } catch (error) {
      this.client.logger.warn(
        { err: error, userId: member.id, action },
        'raid protection action failed',
      );
    }

    return false;
  }
}
