import { parseDuration } from '@nervana/shared';

const DISCORD_TIMESTAMP = /^<t:(\d{1,13})(?::[tTdDfFR])?>$/;
const UNIX_NUMBER = /^\d{10,13}$/;

/**
 * Resolves a user-friendly time input into epoch milliseconds.
 *
 * Accepts:
 * - `now`
 * - a duration such as `10m`, `2h`, `3d`, `2w`
 * - a Unix timestamp in seconds or milliseconds
 * - a Discord timestamp such as `<t:1760000000:F>`
 * - anything `Date.parse` understands, e.g. `2026-12-31 18:00`
 */
export function parseTimestampInput(input: string, now: number = Date.now()): number | null {
  const value = input.trim();
  if (!value) return null;

  if (value.toLowerCase() === 'now') return now;

  const discord = DISCORD_TIMESTAMP.exec(value);
  if (discord?.[1]) return normalizeEpoch(Number(discord[1]));

  if (UNIX_NUMBER.test(value)) return normalizeEpoch(Number(value));

  const duration = parseDuration(value);
  if (duration !== null) {
    const result = now + duration;
    return Number.isFinite(result) ? result : null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEpoch(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  // 13-digit values are milliseconds; 10-digit values are seconds.
  return value >= 1_000_000_000_000 ? value : value * 1000;
}
