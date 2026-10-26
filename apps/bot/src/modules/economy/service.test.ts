import { DEFAULT_CONFIG } from '@nervana/shared';
import { describe, expect, it } from 'vitest';
import {
  DAILY_INTERVAL_MS,
  DAILY_STREAK_WINDOW_MS,
  formatCurrency,
  nextDailyStreak,
  parseAmount,
} from './service.js';

const CONFIG = DEFAULT_CONFIG.economy;

describe('economy helpers', () => {
  it('increments a streak inside the 48-hour window', () => {
    const now = 1_000_000_000_000;
    expect(nextDailyStreak(new Date(now - DAILY_INTERVAL_MS), 4, now)).toBe(5);
    expect(nextDailyStreak(new Date(now - DAILY_STREAK_WINDOW_MS + 1), 4, now)).toBe(5);
  });

  it('resets a streak after a missed day', () => {
    const now = 1_000_000_000_000;
    expect(nextDailyStreak(new Date(now - DAILY_STREAK_WINDOW_MS), 9, now)).toBe(1);
    expect(nextDailyStreak(null, 0, now)).toBe(1);
  });

  it('rejects zero, negative, fractional, and unsafe amounts', () => {
    expect(() => parseAmount(0)).toThrow();
    expect(() => parseAmount(-5)).toThrow();
    expect(() => parseAmount(1.5)).toThrow();
    expect(() => parseAmount(Number.MAX_SAFE_INTEGER)).toThrow();
    expect(parseAmount(25)).toBe(25);
  });

  it('formats currency with grouping', () => {
    expect(formatCurrency(1234, CONFIG)).toContain('1,234');
    expect(formatCurrency(1234, CONFIG)).toContain(CONFIG.currency);
  });
});
