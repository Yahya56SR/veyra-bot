import { parseDuration } from '@nervana/shared';
import type { SearchPlatform } from 'lavalink-client';

const DEFAULT_LAVALINK_PORT = 2333;

export interface LavalinkEndpoint {
  host: string;
  port: number;
  secure: boolean;
}

/**
 * Accepts either `host:port`, `https://host:port`, or a URL with no port. The
 * deploy docs use the bare host form because it is harder to misquote, but
 * accepting a URL keeps copied connection strings working.
 */
export function parseLavalinkUrl(raw: string, secure = false): LavalinkEndpoint | null {
  const value = raw.trim();
  if (!value) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `http://${value}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host) return null;

  const port = url.port
    ? Number(url.port)
    : url.protocol === 'https:'
      ? 443
      : DEFAULT_LAVALINK_PORT;

  if (!Number.isInteger(port) || port < 1 || port > 65_535) return null;

  return {
    host,
    port,
    secure: secure || url.protocol === 'https:',
  };
}

/**
 * Text searches prefer SoundCloud, then Spotify metadata (LavaSrc), then
 * YouTube as a best-effort fallback. Sources not advertised by the node are
 * skipped so the first failed request is not a guaranteed 400.
 */
export function buildSearchSources(sourceManagers: readonly string[]): SearchPlatform[] {
  const available = new Set(sourceManagers.map((source) => source.toLowerCase()));
  const sources: SearchPlatform[] = [];

  const add = (source: SearchPlatform): void => {
    if (!sources.includes(source)) sources.push(source);
  };

  if (available.has('soundcloud')) add('scsearch');
  if (available.has('spotify')) add('spsearch');
  if (available.has('youtube')) {
    add('ytmsearch');
    add('ytsearch');
  }

  if (sources.length === 0) {
    add('scsearch');
    add('ytsearch');
  }

  return sources;
}

/** True for a direct media/playlist URL, which Lavalink resolves itself. */
export function isUrlQuery(query: string): boolean {
  return /^https?:\/\//i.test(query.trim());
}

/**
 * Reads `1:30`, `1:02:03`, or a duration such as `90s` / `2m` into
 * milliseconds. Bare numbers are rejected so `seek 90` cannot silently mean
 * 90 milliseconds.
 */
export function parseSeek(input: string): number | null {
  const value = input.trim();
  if (!value) return null;

  const clock = /^(\d{1,4}):([0-5]?\d)(?::([0-5]?\d))?$/.exec(value);
  if (clock) {
    const first = Number(clock[1]);
    const second = Number(clock[2]);
    const third = clock[3] === undefined ? null : Number(clock[3]);
    const seconds = third === null ? first * 60 + second : first * 3600 + second * 60 + third;
    return seconds > 0 ? seconds * 1000 : null;
  }

  const duration = parseDuration(value);
  return duration !== null && duration > 0 ? duration : null;
}

/** A compact progress bar for the now-playing embed. */
export function progressBar(position: number, duration: number, length = 15): string {
  if (!Number.isFinite(duration) || duration <= 0) return '🔴 LIVE';

  const size = Math.max(5, Math.floor(length));
  const ratio = Math.min(1, Math.max(0, position / duration));
  const index = Math.min(size - 1, Math.floor(ratio * size));

  return `${'▬'.repeat(index)}🔘${'▬'.repeat(size - index - 1)}`;
}
