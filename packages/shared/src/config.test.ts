import { describe, expect, it } from 'vitest';
import { safeParseConfig, parseConfig, DEFAULT_CONFIG } from './config.js';

describe('config', () => {
  it('returns defaults for an empty object', () => {
    expect(parseConfig({})).toEqual(DEFAULT_CONFIG);
  });

  it('merges partial modules over defaults', () => {
    const config = parseConfig({ leveling: { enabled: true } });
    expect(config.leveling.enabled).toBe(true);
    expect(config.leveling.xpMin).toBe(DEFAULT_CONFIG.leveling.xpMin);
    expect(config.moderation).toEqual(DEFAULT_CONFIG.moderation);
  });

  it('replaces arrays instead of merging them', () => {
    const config = parseConfig({ moderation: { exemptRoleIds: ['123456789012345678'] } });
    expect(config.moderation.exemptRoleIds).toEqual(['123456789012345678']);
  });

  it('rejects invalid values and reports the path', () => {
    const result = safeParseConfig({
      moderation: { automod: { invites: { enabled: true, action: 'explode' } } },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path.join('.')).toContain('action');
    }
  });

  it('rejects malformed snowflakes', () => {
    const result = safeParseConfig({ moderation: { modLogChannelId: 'not-an-id' } });
    expect(result.success).toBe(false);
  });

  it('ignores prototype-polluting keys', () => {
    const raw = JSON.parse('{"__proto__":{"polluted":true},"leveling":{"enabled":true}}');
    const config = parseConfig(raw);
    expect(config.leveling.enabled).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('does not mutate the defaults object', () => {
    const config = parseConfig({ leveling: { enabled: true } });
    config.leveling.rewards.push({ level: 1, roleId: '123456789012345678' });
    expect(DEFAULT_CONFIG.leveling.rewards).toHaveLength(0);
  });
});
