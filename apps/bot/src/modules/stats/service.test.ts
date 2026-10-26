import { describe, expect, it } from 'vitest';
import { retentionCutoff, utcDateKey } from './service.js';

describe('stats dates', () => {
  it('uses UTC day keys', () => {
    expect(utcDateKey(new Date('2026-10-25T23:59:59Z'))).toBe('2026-10-25');
    expect(utcDateKey(new Date('2026-10-26T00:00:00Z'))).toBe('2026-10-26');
  });

  it('retains exactly 90 days before today', () => {
    expect(retentionCutoff(new Date('2026-10-26T12:00:00Z'), 90)).toBe('2026-07-28');
  });

  it('handles a custom retention window', () => {
    expect(retentionCutoff(new Date('2026-10-26T12:00:00Z'), 7)).toBe('2026-10-19');
  });
});
