import { describe, expect, it } from 'vitest';
import { hashToken, randomToken } from './tokens.js';

describe('dashboard session tokens', () => {
  it('hashes to a stable 64-character hex id', () => {
    const hash = hashToken('session-token');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('session-token')).toBe(hash);
  });

  it('never stores the raw token as the id', () => {
    const token = randomToken(16);
    expect(hashToken(token)).not.toBe(token);
  });

  it('generates distinct URL-safe tokens', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => randomToken()));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
