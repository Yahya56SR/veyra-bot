import { describe, expect, it } from 'vitest';
import {
  discordTimestamp,
  escapeHtml,
  formatDuration,
  parseDuration,
  randomInt,
  truncate,
} from './time.js';

describe('parseDuration', () => {
  it.each([
    ['10m', 600_000],
    ['1h30m', 5_400_000],
    ['2 days', 172_800_000],
    ['1.5h', 5_400_000],
    ['7d', 604_800_000],
    ['1w', 604_800_000],
    ['45s', 45_000],
  ])('parses %s', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '10', '10x', 'm10', '0s', '-5m', '400d'])('rejects %j', (input) => {
    expect(parseDuration(input)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats compactly', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(999)).toBe('999ms');
    expect(formatDuration(90_000)).toBe('1m 30s');
    expect(formatDuration(93_784_000)).toBe('1d 2h 3m');
  });

  it('handles invalid input', () => {
    expect(formatDuration(Number.NaN)).toBe('0s');
    expect(formatDuration(-1)).toBe('0s');
  });
});

describe('discordTimestamp', () => {
  it('renders a relative timestamp', () => {
    expect(discordTimestamp(0)).toBe('<t:0:R>');
    expect(discordTimestamp(new Date(1000), 'f')).toBe('<t:1:f>');
  });
});

describe('truncate', () => {
  it('keeps short strings intact', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates with an ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
  });
});

describe('escapeHtml', () => {
  it('neutralizes markup and quotes', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
    );
  });
});

describe('randomInt', () => {
  it('stays within bounds', () => {
    for (let i = 0; i < 100; i++) {
      const value = randomInt(3, 5);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(5);
    }
  });
});
