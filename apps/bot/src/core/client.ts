import type { AppConfig, CommandCategory } from '@nervana/shared';
import { Client, Collection, GatewayIntentBits, Options, Partials } from 'discord.js';
import type { Database } from '@nervana/db';
import type { Env } from '../config/env.js';
import type { Command } from './commands.js';
import type { Logger } from './logger.js';
import type { AutomodService } from '../modules/automod/service.js';
import type { HeartbeatService } from '../modules/heartbeat.js';
import type { LevelingService } from '../modules/leveling/service.js';
import type { ModerationScheduler } from '../modules/moderation/scheduler.js';

/**
 * The single process-wide client. Memory is deliberately bounded because the
 * production host has 256 MB.
 */
export class NervanaClient extends Client {
  readonly commands = new Collection<string, Command>();
  readonly startedAt = Date.now();

  env!: Env;
  logger!: Logger;
  db: Database | null = null;
  settings!: AppConfig;
  settingsUpdatedAt = 0;
  settingsPollTimer: NodeJS.Timeout | null = null;
  leveling: LevelingService | null = null;
  moderation: ModerationScheduler | null = null;
  automod: AutomodService | null = null;
  heartbeat: HeartbeatService | null = null;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
      allowedMentions: { parse: ['users'], repliedUser: false },
      makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        // Bound the caches that grow with traffic, keep the ones needed for a
        // single guild's member lookups.
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

  isCategoryEnabled(category: CommandCategory): boolean {
    switch (category) {
      case 'leveling':
        return this.settings.leveling.enabled;
      case 'economy':
        return this.settings.economy.enabled;
      case 'tickets':
        return this.settings.tickets.enabled;
      case 'music':
        return this.settings.music.enabled;
      case 'stats':
        return this.settings.stats.enabled;
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
