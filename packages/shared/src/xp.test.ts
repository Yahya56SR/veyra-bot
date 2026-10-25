import { describe, expect, it } from 'vitest';
import { levelFromXp, progressBar, totalXpForLevel, xpToNextLevel } from './xp.js';

describe('xp curve', () => {
  it('matches the documented formula', () => {
    expect(xpToNextLevel(0)).toBe(100);
    expect(xpToNextLevel(1)).toBe(155);
    expect(xpToNextLevel(2)).toBe(220);
  });

  it('sums lifetime XP', () => {
    expect(totalXpForLevel(0)).toBe(0);
    expect(totalXpForLevel(1)).toBe(100);
    expect(totalXpForLevel(3)).toBe(100 + 155 + 220);
  });

  it('resolves levels from lifetime XP', () => {
    expect(levelFromXp(0)).toEqual({ level: 0, current: 0, needed: 100 });
    expect(levelFromXp(99)).toEqual({ level: 0, current: 99, needed: 100 });
    expect(levelFromXp(100)).toEqual({ level: 1, current: 0, needed: 155 });
    expect(levelFromXp(254)).toEqual({ level: 1, current: 154, needed: 155 });
    expect(levelFromXp(255)).toEqual({ level: 2, current: 0, needed: 220 });
  });

  it('clamps negative XP', () => {
    expect(levelFromXp(-50)).toEqual({ level: 0, current: 0, needed: 100 });
  });
});

describe('progressBar', () => {
  it('fills proportionally', () => {
    expect(progressBar(0, 100, 10)).toBe('░░░░░░░░░░');
    expect(progressBar(50, 100, 10)).toBe('█████░░░░░');
    expect(progressBar(100, 100, 10)).toBe('██████████');
    expect(progressBar(500, 100, 10)).toBe('██████████');
  });

  it('never returns an empty bar', () => {
    expect(progressBar(0, 0, 1)).toBe('█');
  });
});
