import {
  DEFAULT_CONFIG,
  premiumActive,
  parseConfig,
  type AppConfig,
  type CommandCategory,
  type PremiumTier,
} from '@veyra/shared';
import { readGuild, readGuildConfig, type Database } from '@veyra/db';
import { Client, Collection, GatewayIntentBits, Options, Partials } from 'discord.js';
import type { Env } from '../config/env.js';
import type { Command } from './commands.js';
import type { Logger } from './logger.js';
import type { AutomodService } from '../modules/automod/service.js';
import type { GiveawayScheduler } from '../modules/community/giveaways.js';
import type { HeartbeatService } from '../modules/heartbeat.js';
import type { LevelingService } from '../modules/leveling/service.js';
import type { ModerationScheduler } from '../modules/moderation/scheduler.js';
import type { MusicService } from '../modules/music/service.js';
import type { ReminderService } from '../modules/reminders/service.js';
import type { StatsService } from '../modules/stats/service.js';

export interface CachedSettings {
  config: AppConfig;
  updatedAt: number;
}

interface PremiumCacheEntry {
  active: boolean;
  tier: PremiumTier;
  until: Date | null;
  checkedAt: number;
}

const MAX_SETTINGS_CACHE = 5_000;
const PREMIUM_CACHE_MS = 15_000;

/**
 * The single process-wide client. Memory is deliberately bounded because the
 * production host is small; settings and premium state are cached per guild
 * with a hard cap and short TTLs.
 */
export class VeyraClient extends Client {
  readonly commands = new Collection<string, Command>();
  readonly startedAt = Date.now();

  env!: Env;
  logger!: Logger;
  db: Database | null = null;
  settingsCache = new Map<string, CachedSettings>();
  settingsPollSince = Date.now() - 60_000;
  settingsPollTimer: NodeJS.Timeout | null = null;
  private readonly premiumCache = new Map<string, PremiumCacheEntry>();
  leveling: LevelingService | null = null;
  moderation: ModerationScheduler | null = null;
  automod: AutomodService | null = null;
  heartbeat: HeartbeatService | null = null;
  reminders: ReminderService | null = null;
  giveaways: GiveawayScheduler | null = null;
  stats: StatsService | null = null;
  music: MusicService | null = null;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.Reaction],
      allowedMentions: { parse: ['users'], repliedUser: false },
      makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        // Bound the caches that grow with traffic. Member caches are per guild
        // and Discord.js evicts them as the bot joins more servers.
        MessageManager: 100,
        PresenceManager: 0,
        ReactionManager: 50,
        GuildStickerManager: 5,
        GuildScheduledEventManager: 0,
        ThreadManager: 50,
        GuildMemberManager: {
          maxSize: 2000,
          keepOverLimit: (member) => member.id === member.client.user?.id,
        },
      }),
      sweepers: {
        messages: { interval: 300, lifetime: 900 },
        threads: { interval: 600, lifetime: 3600 },
      },
    });
  }

  /** Returns the config for a guild, loading it lazily and applying env overrides. */
  async getConfig(guildId: string): Promise<AppConfig> {
    const cached = this.settingsCache.get(guildId);
    if (cached) return cached.config;

    const config = await this.loadConfig(guildId);
    return config;
  }

  private async loadConfig(guildId: string): Promise<AppConfig> {
    if (!this.db) {
      const config = parseConfig(DEFAULT_CONFIG);
      this.cacheSettings(guildId, config, Date.now());
      return config;
    }

    try {
      const row = await readGuildConfig(this.db, guildId);
      const config = row?.config ?? parseConfig(DEFAULT_CONFIG);
      this.cacheSettings(guildId, config, row?.updatedAt.getTime() ?? Date.now());
      return config;
    } catch (error) {
      this.logger?.warn({ err: error, guildId }, 'guild settings load failed - using defaults');
      return parseConfig(DEFAULT_CONFIG);
    }
  }

  cacheSettings(guildId: string, config: AppConfig, updatedAt: number): void {
    if (this.settingsCache.size >= MAX_SETTINGS_CACHE) {
      const oldest = this.settingsCache.keys().next().value;
      if (oldest) this.settingsCache.delete(oldest);
    }
    this.settingsCache.set(guildId, {
      config: this.applyOverrides(config),
      updatedAt,
    });
  }

  applyOverrides(config: AppConfig): AppConfig {
    if (this.env.MUSIC_ENABLED) return config;
    return { ...config, music: { ...config.music, enabled: false } };
  }

  /** Synchronous view of the last premium check. Unknown guilds are free. */
  premiumCached(guildId: string): boolean {
    const cached = this.premiumCache.get(guildId);
    if (!cached) return false;
    return premiumActive(cached.tier, cached.until);
  }

  /** Cache-backed premium check. Premium grants are per guild. */
  async isPremium(guildId: string): Promise<boolean> {
    const cached = this.premiumCache.get(guildId);
    const now = Date.now();
    if (cached && now - cached.checkedAt < PREMIUM_CACHE_MS) {
      return premiumActive(cached.tier, cached.until, now);
    }

    if (!this.db) return false;

    try {
      const row = await readGuild(this.db, guildId);
      if (!row) return false;
      if (this.premiumCache.size >= MAX_SETTINGS_CACHE) {
        const oldest = this.premiumCache.keys().next().value;
        if (oldest) this.premiumCache.delete(oldest);
      }
      this.premiumCache.set(guildId, {
        active: premiumActive(row.premiumTier, row.premiumUntil),
        tier: row.premiumTier,
        until: row.premiumUntil,
        checkedAt: now,
      });
      return premiumActive(row.premiumTier, row.premiumUntil, now);
    } catch (error) {
      this.logger?.warn({ err: error, guildId }, 'premium lookup failed');
      return false;
    }
  }

  invalidatePremium(guildId: string): void {
    this.premiumCache.delete(guildId);
  }

  isCategoryEnabled(category: CommandCategory, config: AppConfig): boolean {
    switch (category) {
      case 'leveling':
        return config.leveling.enabled;
      case 'economy':
        return config.economy.enabled;
      case 'tickets':
        return config.tickets.enabled;
      case 'music':
        return config.music.enabled;
      case 'stats':
        return config.stats.enabled;
      case 'core':
      case 'moderation':
      case 'logging':
      case 'utility':
      case 'community':
        return true;
      default:
        return true;
    }
  }
}
