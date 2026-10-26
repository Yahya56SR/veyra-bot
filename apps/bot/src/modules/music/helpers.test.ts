import { describe, expect, it } from 'vitest';
import {
  buildSearchSources,
  isUrlQuery,
  parseLavalinkUrl,
  parseSeek,
  progressBar,
} from './helpers.js';

describe('parseLavalinkUrl', () => {
  it('parses the documented host:port form', () => {
    expect(parseLavalinkUrl('lavalink.example.com:2333')).toEqual({
      host: 'lavalink.example.com',
      port: 2333,
      secure: false,
    });
  });

  it('parses URLs and derives TLS from the scheme', () => {
    expect(parseLavalinkUrl('https://music.example.com')).toEqual({
      host: 'music.example.com',
      port: 443,
      secure: true,
    });
  });

  it('honours an explicit secure flag on a bare host', () => {
    expect(parseLavalinkUrl('localhost:2444', true)).toEqual({
      host: 'localhost',
      port: 2444,
      secure: true,
    });
  });

  it('defaults a bare host to port 2333', () => {
    expect(parseLavalinkUrl('localhost')).toEqual({
      host: 'localhost',
      port: 2333,
      secure: false,
    });
  });

  it.each(['', '   ', 'http://', 'host:not-a-port', 'host:99999'])('rejects %j', (value) => {
    expect(parseLavalinkUrl(value)).toBeNull();
  });
});

describe('buildSearchSources', () => {
  it('prefers SoundCloud, then Spotify, then YouTube', () => {
    expect(buildSearchSources(['youtube', 'spotify', 'soundcloud'])).toEqual([
      'scsearch',
      'spsearch',
      'ytmsearch',
      'ytsearch',
    ]);
  });

  it('only uses advertised sources', () => {
    expect(buildSearchSources(['youtube'])).toEqual(['ytmsearch', 'ytsearch']);
  });

  it('falls back when the node advertises nothing useful', () => {
    expect(buildSearchSources(['http'])).toEqual(['scsearch', 'ytsearch']);
    expect(buildSearchSources([])).toEqual(['scsearch', 'ytsearch']);
  });
});

describe('isUrlQuery', () => {
  it('detects direct links only', () => {
    expect(isUrlQuery('https://soundcloud.com/artist/track')).toBe(true);
    expect(isUrlQuery('http://example.com')).toBe(true);
    expect(isUrlQuery('scsearch:hello')).toBe(false);
    expect(isUrlQuery('hello world')).toBe(false);
  });
});

describe('parseSeek', () => {
  it.each([
    ['1:30', 90_000],
    ['01:02:03', 3_723_000],
    ['90s', 90_000],
    ['2m', 120_000],
    ['1h', 3_600_000],
  ])('parses %s', (input, expected) => {
    expect(parseSeek(input)).toBe(expected);
  });

  it.each(['', '0:00', '90', '1:60', 'abc', '0s'])('rejects %j', (input) => {
    expect(parseSeek(input)).toBeNull();
  });
});

describe('progressBar', () => {
  it('renders a knob within the bar', () => {
    expect(progressBar(0, 100, 10)).toBe('🔘▬▬▬▬▬▬▬▬▬');
    expect(progressBar(100, 100, 10)).toBe('▬▬▬▬▬▬▬▬▬🔘');
  });

  it('marks streams and clamps out-of-range positions', () => {
    expect(progressBar(10, 0)).toBe('🔴 LIVE');
    expect(progressBar(-50, 100, 10)).toBe('🔘▬▬▬▬▬▬▬▬▬');
    expect(progressBar(500, 100, 10)).toBe('▬▬▬▬▬▬▬▬▬🔘');
  });
});
