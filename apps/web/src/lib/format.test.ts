import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatDateKey,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelative,
  formatVoice,
} from './format.js';

const NOW = Date.parse('2026-03-10T12:00:00Z');

describe('dashboard formatting', () => {
  it('formats numbers with fixed locale settings', () => {
    expect(formatNumber(12345)).toBe('12,345');
    expect(formatNumber(Number.NaN)).toBe('0');
    expect(formatPercent(1, 4)).toBe('25%');
    expect(formatPercent(0, 0)).toBe('0%');
  });

  it('formats dates in UTC', () => {
    expect(formatDateTime(new Date('2026-03-10T23:05:00Z'))).toContain('Mar 10, 2026');
    expect(formatDateTime(new Date('2026-03-10T23:05:00Z'))).toContain('11:05 PM');
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateKey('2026-03-10')).toBe('Mar 10');
    expect(formatDateKey('not-a-date')).toBe('not-a-date');
  });

  it('handles relative times in both directions', () => {
    expect(formatRelative(new Date(NOW - 30_000), NOW)).toBe('just now');
    expect(formatRelative(new Date(NOW + 120_000), NOW)).toBe('in 2 minutes');
    expect(formatRelative(new Date(NOW - 3 * 60 * 60 * 1000), NOW)).toBe('3 hours ago');
    expect(formatRelative(new Date(NOW + 2 * 24 * 60 * 60 * 1000), NOW)).toBe('in 2 days');
    expect(formatRelative(null, NOW)).toBe('never');
  });

  it('formats voice time and byte sizes', () => {
    expect(formatVoice(0)).toBe('0s');
    expect(formatVoice(65)).toBe('1m 5s');
    expect(formatVoice(3 * 3600 + 12 * 60)).toBe('3h 12m');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(null)).toBe('—');
  });
});
