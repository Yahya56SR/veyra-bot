import { describe, expect, it } from 'vitest';
import {
  capsStats,
  containsInvite,
  extractHosts,
  findBannedWord,
  isAllowlistedHost,
} from './rules.js';

describe('containsInvite', () => {
  it.each([
    'join discord.gg/abc123',
    'https://discord.gg/abc123',
    'https://discord.com/invite/abc123',
    'https://discordapp.com/invite/abc123',
  ])('flags %s', (content) => {
    expect(containsInvite(content)).toBe(true);
  });

  it('does not flag ordinary discord links', () => {
    expect(containsInvite('https://discord.com/channels/1/2/3')).toBe(false);
  });
});

describe('extractHosts', () => {
  it('normalizes www and ports', () => {
    expect(extractHosts('see https://www.Example.com:8080/a and http://sub.test.org')).toEqual([
      'example.com',
      'sub.test.org',
    ]);
  });

  it('ignores text without URLs', () => {
    expect(extractHosts('no links here')).toEqual([]);
  });

  it('strips surrounding punctuation', () => {
    expect(extractHosts('(see https://example.com/path).')).toEqual(['example.com']);
  });
});

describe('isAllowlistedHost', () => {
  const allowlist = ['example.com', '*.trusted.net', 'https://docs.test.io/path'];

  it('allows exact hosts and subdomains', () => {
    expect(isAllowlistedHost('example.com', allowlist)).toBe(true);
    expect(isAllowlistedHost('cdn.example.com', allowlist)).toBe(true);
    expect(isAllowlistedHost('a.trusted.net', allowlist)).toBe(true);
    expect(isAllowlistedHost('docs.test.io', allowlist)).toBe(true);
  });

  it('rejects lookalike hosts', () => {
    expect(isAllowlistedHost('notexample.com', allowlist)).toBe(false);
    expect(isAllowlistedHost('example.com.evil.io', allowlist)).toBe(false);
  });
});

describe('capsStats', () => {
  it('measures uppercase letters only', () => {
    expect(capsStats('HELLO world 123')).toEqual({ letters: 10, uppercase: 5, percent: 50 });
  });

  it('handles text without letters', () => {
    expect(capsStats('123 !!!')).toEqual({ letters: 0, uppercase: 0, percent: 0 });
  });
});

describe('findBannedWord', () => {
  const words = ['badword', 'two words'];

  it('matches case-insensitively on word boundaries', () => {
    expect(findBannedWord('This is a BADWORD here', words)).toBe('badword');
    expect(findBannedWord('a two words phrase', words)).toBe('two words');
  });

  it('does not match inside a larger word', () => {
    expect(findBannedWord('badwordsmith', words)).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(findBannedWord('perfectly fine', words)).toBeNull();
  });
});
