import { describe, expect, it } from 'vitest';
import { pickWinners } from './giveaways.js';

describe('giveaway winners', () => {
  it('picks the requested number of unique winners', () => {
    const entries = Array.from({ length: 20 }, (_, index) => ({ userId: String(index) }));
    const winners = pickWinners(entries, 5);
    expect(winners).toHaveLength(5);
    expect(new Set(winners.map((winner) => winner.userId)).size).toBe(5);
  });

  it('caps winners at the number of entries', () => {
    const entries = [{ userId: '1' }, { userId: '2' }];
    expect(pickWinners(entries, 10)).toHaveLength(2);
  });

  it('returns nothing for an empty pool', () => {
    expect(pickWinners([], 3)).toEqual([]);
  });
});
