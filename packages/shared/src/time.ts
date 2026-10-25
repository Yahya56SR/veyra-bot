const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const UNIT_MS = {
  s: SECOND,
  m: MINUTE,
  h: HOUR,
  d: DAY,
  w: WEEK,
} as const;

type Unit = keyof typeof UNIT_MS;

const MAX_DURATION_MS = 365 * DAY;

// Long alternatives come first so "2 days" is not parsed as "2 d" + "ays".
const PART =
  /(\d+(?:\.\d+)?)\s*(weeks?|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|w|d|h|m|s)/gi;

function normalizeUnit(raw: string): Unit | null {
  const unit = raw.toLowerCase();
  if (unit.startsWith('w')) return 'w';
  if (unit.startsWith('d')) return 'd';
  if (unit.startsWith('h')) return 'h';
  if (unit.startsWith('m')) return 'm';
  if (unit.startsWith('s')) return 's';
  return null;
}

/**
 * Parses human durations: `10m`, `1h30m`, `2 days`, `1.5h`, `7d`.
 * Returns milliseconds, or null when the input is empty, malformed,
 * zero, or longer than one year.
 */
export function parseDuration(input: string): number | null {
  if (typeof input !== 'string') return null;

  const text = input.trim().toLowerCase();
  if (!text) return null;

  let total = 0;
  let matched = false;
  let rest = text;

  for (const match of text.matchAll(PART)) {
    matched = true;
    const amountRaw = match[1];
    const unitRaw = match[2];
    if (!amountRaw || !unitRaw) return null;

    const unit = normalizeUnit(unitRaw);
    if (!unit) return null;

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount)) return null;

    total += amount * UNIT_MS[unit];
    rest = rest.replace(match[0], ' ');
  }

  if (!matched) return null;
  if (rest.replace(/[\s,]/g, '') !== '') return null;
  if (total <= 0 || total > MAX_DURATION_MS) return null;

  return Math.floor(total);
}

/** Formats milliseconds as a compact duration: `1d 2h 3m`. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0s';
  if (ms === 0) return '0s';
  if (ms < SECOND) return `${Math.floor(ms)}ms`;

  let remaining = Math.floor(ms);
  const parts: string[] = [];

  for (const [label, size] of [
    ['d', DAY],
    ['h', HOUR],
    ['m', MINUTE],
    ['s', SECOND],
  ] as const) {
    const value = Math.floor(remaining / size);
    if (value > 0) {
      parts.push(`${value}${label}`);
      remaining -= value * size;
    }
  }

  return parts.slice(0, 3).join(' ') || '0s';
}

/** Formats a date as a Discord timestamp tag. */
export function discordTimestamp(
  date: Date | number,
  style: 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R' = 'R',
): string {
  const unix = Math.floor((typeof date === 'number' ? date : date.getTime()) / 1000);
  return `<t:${unix}:${style}>`;
}

export function truncate(value: string, max: number, suffix = '…'): string {
  if (value.length <= max) return value;
  if (max <= suffix.length) return value.slice(0, max);
  return value.slice(0, max - suffix.length) + suffix;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes untrusted text before it is embedded in an HTML transcript. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

/** Random integer in `[min, max]`, inclusive. */
export function randomInt(min: number, max: number): number {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}
