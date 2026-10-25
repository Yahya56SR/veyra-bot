const INVITE_PATTERN = /(?:discord\.gg|discord(?:app)?\.com\/invite)\/[a-z0-9-]+/i;

const URL_PATTERN = /https?:\/\/([^\s/?#]+)/gi;

export function containsInvite(content: string): boolean {
  return INVITE_PATTERN.test(content);
}

/** Extracts lowercase hostnames without ports or a leading `www.`. */
export function extractHosts(content: string): string[] {
  const hosts: string[] = [];

  for (const match of content.matchAll(URL_PATTERN)) {
    const raw = match[1];
    if (!raw) continue;

    const host = raw
      .toLowerCase()
      .replace(/^www\./, '')
      .replace(/[),.;:!?]+$/, '')
      .replace(/:\d+$/, '');

    if (host) hosts.push(host);
  }

  return hosts;
}

/**
 * A host is allowed when it equals an entry or is a subdomain of one.
 * Entries may be written as `example.com`, `*.example.com`, or a full URL.
 */
export function isAllowlistedHost(host: string, allowlist: readonly string[]): boolean {
  const normalized = host.toLowerCase().replace(/^www\./, '');

  return allowlist.some((entry) => {
    const candidate = entry
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/^\*\./, '')
      .replace(/^www\./, '');

    if (!candidate) return false;
    return normalized === candidate || normalized.endsWith(`.${candidate}`);
  });
}

export interface CapsStats {
  letters: number;
  uppercase: number;
  percent: number;
}

export function capsStats(content: string): CapsStats {
  const letters = content.replace(/[^\p{L}]/gu, '');
  if (letters.length === 0) return { letters: 0, uppercase: 0, percent: 0 };

  const uppercase = letters.replace(/[^\p{Lu}]/gu, '').length;
  return {
    letters: letters.length,
    uppercase,
    percent: Math.round((uppercase / letters.length) * 100),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Returns the matching banned word, or null. Matches on word boundaries. */
export function findBannedWord(content: string, words: readonly string[]): string | null {
  for (const word of words) {
    const candidate = word.trim();
    if (!candidate) continue;

    const pattern = new RegExp(
      `(^|[^\\p{L}\\p{N}_])${escapeRegExp(candidate)}($|[^\\p{L}\\p{N}_])`,
      'iu',
    );

    if (pattern.test(content)) return candidate;
  }

  return null;
}
