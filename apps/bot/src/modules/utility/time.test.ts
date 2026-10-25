import { describe, expect, it } from 'vitest';
import { parseTimestampInput } from './time.js';

const NOW = 1_760_000_000_000;

describe('parseTimestampInput', () => {
  it('accepts now', () => {
    expect(parseTimestampInput('now', NOW)).toBe(NOW);
    expect(parseTimestampInput(' NOW ', NOW)).toBe(NOW);
  });

  it('accepts durations relative to now', () => {
    expect(parseTimestampInput('10m', NOW)).toBe(NOW + 10 * 60_000);
    expect(parseTimestampInput('2h', NOW)).toBe(NOW + 2 * 60 * 60_000);
  });

  it('accepts Unix seconds and milliseconds', () => {
    expect(parseTimestampInput('1760000000', NOW)).toBe(1_760_000_000_000);
    expect(parseTimestampInput('1760000000000', NOW)).toBe(1_760_000_000_000);
  });

  it('extracts Discord timestamps', () => {
    expect(parseTimestampInput('<t:1760000000:F>', NOW)).toBe(1_760_000_000_000);
    expect(parseTimestampInput('<t:1760000000000:R>', NOW)).toBe(1_760_000_000_000);
  });

  it('accepts ISO dates', () => {
    expect(parseTimestampInput('2026-12-31T18:00:00Z', NOW)).toBe(
      Date.parse('2026-12-31T18:00:00Z'),
    );
  });

  it('rejects empty and nonsense input', () => {
    expect(parseTimestampInput('', NOW)).toBeNull();
    expect(parseTimestampInput('not a time', NOW)).toBeNull();
  });
});
