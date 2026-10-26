import { DEFAULT_CONFIG, type LevelingConfig } from '@veyra/shared';
import { describe, expect, it } from 'vitest';
import { effectiveMultiplier, evaluateMessageXp } from './xp.js';

const config: LevelingConfig = {
  ...DEFAULT_CONFIG.leveling,
  enabled: true,
};

const base = {
  isBot: false,
  channelId: '111111111111111111',
  roleIds: ['222222222222222222'],
  config,
  random: () => 20,
};

describe('evaluateMessageXp', () => {
  it('awards base XP to an eligible member', () => {
    expect(evaluateMessageXp(base)).toEqual({
      eligible: true,
      amount: 20,
      multiplier: 1,
    });
  });

  it('never awards XP to bots', () => {
    expect(evaluateMessageXp({ ...base, isBot: true }).reason).toBe('bot');
  });

  it('skips ignored channels', () => {
    const ignored = {
      ...config,
      ignoredChannelIds: ['111111111111111111'],
    };
    expect(evaluateMessageXp({ ...base, config: ignored }).reason).toBe('ignored-channel');
  });

  it('skips ignored roles', () => {
    const ignored = {
      ...config,
      ignoredRoleIds: ['222222222222222222'],
    };
    expect(evaluateMessageXp({ ...base, config: ignored }).reason).toBe('ignored-role');
  });

  it('enforces the per-member cooldown', () => {
    const now = 1_000_000;
    const result = evaluateMessageXp({ ...base, now, lastGainAt: now - 30_000 });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('cooldown');
  });

  it('allows XP once the cooldown has elapsed', () => {
    const now = 1_000_000;
    const result = evaluateMessageXp({ ...base, now, lastGainAt: now - 60_000 });
    expect(result.eligible).toBe(true);
  });

  it('multiplies channel and role bonuses', () => {
    const boosted: LevelingConfig = {
      ...config,
      channelMultipliers: [{ channelId: '111111111111111111', multiplier: 2 }],
      roleMultipliers: [{ roleId: '222222222222222222', multiplier: 1.5 }],
    };
    const result = evaluateMessageXp({ ...base, config: boosted });
    expect(result.multiplier).toBe(3);
    expect(result.amount).toBe(60);
  });

  it('uses the highest matching role multiplier', () => {
    const boosted: LevelingConfig = {
      ...config,
      roleMultipliers: [
        { roleId: '222222222222222222', multiplier: 1.5 },
        { roleId: '333333333333333333', multiplier: 2 },
      ],
    };
    const result = evaluateMessageXp({
      ...base,
      roleIds: ['222222222222222222', '333333333333333333'],
      config: boosted,
    });
    expect(result.multiplier).toBe(2);
  });

  it('caps the combined multiplier at 5x', () => {
    const boosted: LevelingConfig = {
      ...config,
      channelMultipliers: [{ channelId: '111111111111111111', multiplier: 4 }],
      roleMultipliers: [{ roleId: '222222222222222222', multiplier: 3 }],
    };
    expect(effectiveMultiplier('111111111111111111', ['222222222222222222'], boosted)).toBe(5);
  });

  it('still awards at least 1 XP at the lowest multiplier', () => {
    const reduced: LevelingConfig = {
      ...config,
      xpMin: 1,
      xpMax: 1,
      channelMultipliers: [{ channelId: '111111111111111111', multiplier: 0.1 }],
    };
    const result = evaluateMessageXp({ ...base, config: reduced, random: () => 1 });
    expect(result.amount).toBe(1);
  });
});
