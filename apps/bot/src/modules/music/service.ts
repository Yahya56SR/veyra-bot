import { formatDuration, truncate } from '@nervana/shared';
import { Events } from 'discord.js';
import {
  LavalinkManager,
  type LavalinkNode,
  type Player,
  type SearchResult,
  type Track,
  type UnresolvedTrack,
} from 'lavalink-client';
import type { NervanaClient } from '../../core/client.js';
import { UserFacingError } from '../../core/errors.js';
import { buildSearchSources, isUrlQuery, parseLavalinkUrl } from './helpers.js';

const EMPTY_QUEUE_DESTROY_MS = 30_000;

type RawPacket = Parameters<LavalinkManager['sendRawData']>[0];

export interface PlayInput {
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  query: string;
  requester: unknown;
  maxQueue: number;
}

export interface PlayResult {
  tracks: Track[];
  playlist: string | null;
  truncated: boolean;
  queueSize: number;
}

export function describeTrack(track: Track | UnresolvedTrack): string {
  const title = truncate(track.info.title || 'Unknown title', 100);
  const author = truncate(track.info.author || 'Unknown artist', 60);
  const length = track.info.isStream ? 'LIVE' : formatDuration(track.info.duration ?? 0);
  return `**${title}** — ${author} \`${length}\``;
}

export function requesterId(track: Track | UnresolvedTrack): string | null {
  const requester = track.requester as { id?: unknown } | undefined;
  return typeof requester?.id === 'string' ? requester.id : null;
}

/**
 * Owns the single Lavalink manager for the process. Starting is deliberately
 * non-blocking: a slow or unreachable node must never delay Discord login.
 */
export class MusicService {
  manager: LavalinkManager | null = null;
  private rawListener: ((data: unknown) => void) | null = null;
  private readonly emptyTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly client: NervanaClient) {}

  get available(): boolean {
    return this.manager?.useable ?? false;
  }

  start(): void {
    if (this.manager || this.client.env.SMOKE_TEST) return;
    if (!this.client.env.MUSIC_ENABLED) {
      this.client.logger.info('music disabled by MUSIC_ENABLED');
      return;
    }

    const user = this.client.user;
    if (!user) {
      this.client.logger.warn('music manager not started before the bot user was ready');
      return;
    }

    const url = this.client.env.LAVALINK_URL;
    const authorization = this.client.env.LAVALINK_AUTH;
    if (!url || !authorization) {
      this.client.logger.warn(
        'music is enabled but LAVALINK_URL/LAVALINK_AUTH are missing — music commands will report it as unconfigured',
      );
      return;
    }

    const endpoint = parseLavalinkUrl(url, this.client.env.LAVALINK_SECURE);
    if (!endpoint) {
      this.client.logger.error({ url }, 'LAVALINK_URL is not a valid host:port or URL');
      return;
    }

    try {
      const manager = new LavalinkManager({
        nodes: [
          {
            id: 'main',
            host: endpoint.host,
            port: endpoint.port,
            authorization,
            secure: endpoint.secure,
            retryAmount: 5,
            retryDelay: 15_000,
            requestSignalTimeoutMS: 10_000,
          },
        ],
        sendToShard: (guildId, payload) => {
          const guild = this.client.guilds.cache.get(guildId);
          if (guild) guild.shard.send(payload);
        },
        client: { id: user.id, username: user.username },
        autoSkip: true,
        autoMove: true,
        queueOptions: { maxPreviousTracks: 10 },
        playerOptions: {
          defaultSearchPlatform: 'scsearch',
          volumeDecrementer: 1,
          clientBasedPositionUpdateInterval: 500,
          onDisconnect: {
            autoReconnect: true,
            autoReconnectOnlyWithTracks: true,
            destroyPlayer: false,
          },
        },
      });

      this.manager = manager;
      this.registerEvents(manager);
      this.attachRawEvents(manager);

      this.client.logger.info(
        {
          host: endpoint.host,
          port: endpoint.port,
          secure: endpoint.secure,
        },
        'connecting to Lavalink',
      );

      void manager.init({ id: user.id, username: user.username }).catch((error: unknown) => {
        this.client.logger.error({ err: error }, 'Lavalink manager init failed');
      });
    } catch (error) {
      this.manager = null;
      this.client.logger.error({ err: error }, 'could not create the Lavalink manager');
    }
  }

  async stop(): Promise<void> {
    const manager = this.manager;
    this.manager = null;

    if (this.rawListener) {
      this.client.off(Events.Raw, this.rawListener);
      this.rawListener = null;
    }

    for (const timer of this.emptyTimers.values()) clearTimeout(timer);
    this.emptyTimers.clear();

    if (!manager) return;

    manager.removeAllListeners();

    try {
      await manager.nodeManager.disconnectAll(true, true);
    } catch (error) {
      this.client.logger.warn({ err: error }, 'failed to disconnect Lavalink nodes');
    }
  }

  getPlayer(guildId: string): Player | undefined {
    return this.manager?.getPlayer(guildId);
  }

  /**
   * Searches first, then joins voice. A failed search therefore does not leave
   * the bot sitting alone in a channel or create a player with no queue.
   */
  async play(input: PlayInput): Promise<PlayResult> {
    const manager = this.requireManager();
    const existing = manager.getPlayer(input.guildId);

    if (existing?.voiceChannelId && existing.voiceChannelId !== input.voiceChannelId) {
      throw new UserFacingError(
        `I am already connected to <#${existing.voiceChannelId}>. Join me there or use \`/disconnect\`.`,
      );
    }

    const before = existing ? existing.queue.tracks.length + (existing.queue.current ? 1 : 0) : 0;
    const room = input.maxQueue - before;
    if (room <= 0) {
      throw new UserFacingError(
        `The queue is full (${input.maxQueue} tracks). Wait for it to drain or use \`/clear\`.`,
      );
    }

    const result = await this.searchTracks(input.query, input.requester);
    const candidates = result.loadType === 'playlist' ? result.tracks : result.tracks.slice(0, 1);
    const selected = candidates.slice(0, room);

    if (selected.length === 0) {
      throw new UserFacingError('No playable tracks were found for that search.');
    }

    const hadPlayer = Boolean(existing);
    const player = await this.connect({
      guildId: input.guildId,
      voiceChannelId: input.voiceChannelId,
      textChannelId: input.textChannelId,
    });

    try {
      await player.queue.add(selected);
      if (!player.playing && !player.paused) await player.play();
    } catch (error) {
      this.client.logger.error(
        { err: error, guildId: input.guildId },
        'failed to add tracks or start playback',
      );

      if (!hadPlayer && !player.queue.current && player.queue.tracks.length === 0) {
        await player.destroy('Playback could not start', true).catch(() => {});
      }

      throw new UserFacingError(
        'Could not start playback. The music node may be unavailable — try again shortly.',
      );
    }

    return {
      tracks: selected,
      playlist: result.playlist?.name ?? null,
      truncated: result.loadType === 'playlist' && selected.length < result.tracks.length,
      queueSize: player.queue.tracks.length + (player.queue.current ? 1 : 0),
    };
  }

  private requireManager(): LavalinkManager {
    if (!this.manager) {
      throw new UserFacingError(
        'Music is not configured. Set `LAVALINK_URL` and `LAVALINK_AUTH` in the bot environment.',
      );
    }
    if (!this.manager.useable) {
      throw new UserFacingError('The music node is offline. Try again in a moment.');
    }
    return this.manager;
  }

  private async connect(input: {
    guildId: string;
    voiceChannelId: string;
    textChannelId: string;
  }): Promise<Player> {
    const manager = this.requireManager();
    const existing = manager.getPlayer(input.guildId);

    if (existing) {
      if (existing.voiceChannelId && existing.voiceChannelId !== input.voiceChannelId) {
        throw new UserFacingError(
          `I am already connected to <#${existing.voiceChannelId}>. Join me there or use \`/disconnect\`.`,
        );
      }

      existing.textChannelId = input.textChannelId;

      if (!existing.voiceChannelId) {
        existing.options.voiceChannelId = input.voiceChannelId;
      }

      if (!existing.connected) {
        try {
          await existing.connect();
        } catch (error) {
          this.client.logger.error(
            { err: error, guildId: input.guildId },
            'failed to reconnect the music player',
          );
          throw new UserFacingError('I could not join that voice channel.');
        }
      }

      return existing;
    }

    const player = manager.createPlayer({
      guildId: input.guildId,
      voiceChannelId: input.voiceChannelId,
      textChannelId: input.textChannelId,
      volume: this.client.settings.music.defaultVolume,
      selfDeaf: true,
      selfMute: false,
    });

    try {
      await player.connect();
    } catch (error) {
      this.client.logger.error(
        { err: error, guildId: input.guildId },
        'failed to connect the music player',
      );
      await player.destroy('Voice connection failed', true).catch(() => {});
      throw new UserFacingError('I could not join that voice channel.');
    }

    return player;
  }

  private async searchTracks(query: string, requester: unknown): Promise<SearchResult> {
    const manager = this.requireManager();
    const trimmed = query.trim();
    if (!trimmed) throw new UserFacingError('Enter a track name or URL.');

    const node: LavalinkNode | undefined = manager.nodeManager.leastUsedNodes()[0];
    if (!node?.connected) {
      throw new UserFacingError('The music node is offline. Try again in a moment.');
    }

    const sources = isUrlQuery(trimmed)
      ? [undefined]
      : buildSearchSources(node.info?.sourceManagers ?? []);

    let lastError: string | null = null;

    for (const source of sources) {
      try {
        const result = await node.search(
          source ? { query: trimmed, source } : { query: trimmed },
          requester,
        );

        if (result.loadType !== 'error' && result.tracks.length > 0) return result;
        if (result.loadType === 'error') lastError = result.exception?.message ?? null;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.client.logger.debug(
          { err: error, source: source ?? 'url' },
          'Lavalink search attempt failed',
        );
      }
    }

    if (lastError) {
      this.client.logger.debug({ query: trimmed, lastError }, 'all Lavalink searches failed');
    }

    const spotify = /open\.spotify\.com|spotify:/i.test(trimmed);
    throw new UserFacingError(
      spotify
        ? 'No playable tracks were found. Spotify links need a Lavalink node with the LavaSrc plugin enabled.'
        : 'No playable tracks were found. Try a different search or link.',
    );
  }

  private registerEvents(manager: LavalinkManager): void {
    manager.on('trackStart', (player, track) => {
      this.clearEmptyTimer(player.guildId);
      this.client.stats?.recordMusicPlay();

      if (track) {
        this.client.logger.debug(
          {
            guildId: player.guildId,
            title: track.info.title,
            author: track.info.author,
          },
          'music track started',
        );
      }
    });

    manager.on('trackError', (player, track, payload) => {
      this.client.logger.warn(
        {
          guildId: player.guildId,
          track: track?.info.title,
          error: payload.exception?.message ?? payload.error,
        },
        'music track error',
      );
    });

    manager.on('queueEnd', (player) => {
      this.clearEmptyTimer(player.guildId);

      if (this.client.settings.music.stay247) return;

      const timer = setTimeout(() => {
        this.emptyTimers.delete(player.guildId);
        const current = this.manager?.getPlayer(player.guildId);
        if (!current) return;
        if (current.queue.current || current.queue.tracks.length > 0) return;

        void current.destroy('Queue empty', true).catch((error: unknown) => {
          this.client.logger.warn({ err: error, guildId: player.guildId }, 'music cleanup failed');
        });
      }, EMPTY_QUEUE_DESTROY_MS);

      timer.unref();
      this.emptyTimers.set(player.guildId, timer);
    });

    manager.on('playerDestroy', (player) => {
      this.clearEmptyTimer(player.guildId);
    });

    manager.nodeManager.on('connect', (node) => {
      this.client.logger.info({ node: node.options.id }, 'Lavalink node connected');
    });

    manager.nodeManager.on('disconnect', (node, reason) => {
      this.client.logger.warn(
        { node: node.options.id, code: reason.code, reason: reason.reason },
        'Lavalink node disconnected',
      );
    });

    manager.nodeManager.on('error', (node, error) => {
      this.client.logger.error({ err: error, node: node.options.id }, 'Lavalink node error');
    });
  }

  private attachRawEvents(manager: LavalinkManager): void {
    const listener = (data: unknown): void => {
      void manager.sendRawData(data as RawPacket).catch((error: unknown) => {
        this.client.logger.debug({ err: error }, 'failed to forward a raw voice packet');
      });
    };

    this.rawListener = listener;
    this.client.on(Events.Raw, listener);
  }

  private clearEmptyTimer(guildId: string): void {
    const timer = this.emptyTimers.get(guildId);
    if (!timer) return;
    clearTimeout(timer);
    this.emptyTimers.delete(guildId);
  }
}
