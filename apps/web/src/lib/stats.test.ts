import { describe, expect, it } from 'vitest';
import { busiestDay, cutoffDateKey, fillDaily, sumDaily, utcDateKey } from './stats.js';
import type { DailySource } from './stats.js';

const NOW = new Date('2026-03-10T18:30:00Z');

const row = (date: string, overrides: Partial<DailySource> = {}): DailySource => ({
  date,
  messages: 0,
  joins: 0,
  leaves: 0,
  commands: 0,
  voiceSeconds: 0,
  musicPlays: 0,
  ...overrides,
});

describe('dashboard daily stats', () => {
  it('uses UTC date keys', () => {
    expect(utcDateKey(NOW)).toBe('2026-03-10');
    expect(cutoffDateKey(3, NOW)).toBe('2026-03-08');
  });

  it('fills missing days with zeroes and keeps the range order', () => {
    const filled = fillDaily(
      [
        row('2026-03-08', { messages: 2, joins: 1 }),
        row('2026-03-10', { messages: 5, commands: 3 }),
      ],
      3,
      NOW,
    );

    expect(filled.map((entry) => entry.date)).toEqual(['2026-03-08', '2026-03-09', '2026-03-10']);
    expect(filled.map((entry) => entry.messages)).toEqual([2, 0, 5]);
    expect(filled.map((entry) => entry.label)).toEqual(['Mar 8', 'Mar 9', 'Mar 10']);
  });

  it('always returns at least one point', () => {
    expect(fillDaily([], 0, NOW)).toHaveLength(1);
    expect(fillDaily([], -3, NOW)).toHaveLength(1);
  });

  it('sums every counter', () => {
    const totals = sumDaily([
      row('2026-03-09', {
        messages: 3,
        joins: 2,
        leaves: 1,
        commands: 4,
        voiceSeconds: 60,
        musicPlays: 5,
      }),
      row('2026-03-10', {
        messages: 7,
        joins: 1,
        leaves: 3,
        commands: 6,
        voiceSeconds: 120,
        musicPlays: 2,
      }),
    ]);

    expect(totals).toEqual({
      messages: 10,
      joins: 3,
      leaves: 4,
      commands: 10,
      voiceSeconds: 180,
      musicPlays: 7,
    });
  });

  it('finds the busiest day by messages', () => {
    const daily = fillDaily(
      [row('2026-03-08', { messages: 2 }), row('2026-03-10', { messages: 9 })],
      3,
      NOW,
    );
    expect(busiestDay(daily)?.date).toBe('2026-03-10');
  });

  it('returns null when no messages were recorded', () => {
    expect(busiestDay(fillDaily([], 3, NOW))).toBeNull();
  });
});
