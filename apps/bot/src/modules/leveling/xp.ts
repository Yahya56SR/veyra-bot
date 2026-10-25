import { randomInt, type LevelingConfig } from '@nervana/shared';

export type XpIneligibleReason = 'bot' | 'ignored-channel' | 'ignored-role' | 'cooldown';

export interface XpEvaluationInput {
  isBot: boolean;
  channelId: string;
  roleIds: readonly string[];
  config: LevelingConfig;
  /** Epoch milliseconds of the member's last XP gain, if known. */
  lastGainAt?: number;
  now?: number;
  /** Injectable RNG for tests. */
  random?: (min: number, max: number) => number;
}

export interface XpEvaluation {
  eligible: boolean;
  reason?: XpIneligibleReason;
  amount: number;
  multiplier: number;
}

/**
 * Channel and role multipliers multiply together; the highest matching role
 * applies. The combined multiplier is capped at 5x.
 */
export function effectiveMultiplier(
  channelId: string,
  roleIds: readonly string[],
  config: LevelingConfig,
): number {
  const channelMultiplier =
    config.channelMultipliers.find((entry) => entry.channelId === channelId)?.multiplier ?? 1;

  let roleMultiplier = 1;
  for (const entry of config.roleMultipliers) {
    if (roleIds.includes(entry.roleId)) {
      roleMultiplier = Math.max(roleMultiplier, entry.multiplier);
    }
  }

  return Math.min(5, Math.max(0.1, channelMultiplier * roleMultiplier));
}

/** Context-only checks, usable before touching the database. */
export function checkXpContext(input: {
  isBot: boolean;
  channelId: string;
  roleIds: readonly string[];
  config: LevelingConfig;
}): XpIneligibleReason | null {
  if (input.isBot) return 'bot';
  if (input.config.ignoredChannelIds.includes(input.channelId)) return 'ignored-channel';
  if (input.config.ignoredRoleIds.some((roleId) => input.roleIds.includes(roleId))) {
    return 'ignored-role';
  }
  return null;
}

/**
 * Decides whether a message earns XP and how much. Pure so the rules can be
 * unit-tested without a gateway connection.
 */
export function evaluateMessageXp(input: XpEvaluationInput): XpEvaluation {
  const { config } = input;
  const now = input.now ?? Date.now();
  const multiplier = effectiveMultiplier(input.channelId, input.roleIds, config);

  const contextReason = checkXpContext(input);
  if (contextReason) {
    return { eligible: false, reason: contextReason, amount: 0, multiplier };
  }

  if (input.lastGainAt !== undefined && now - input.lastGainAt < config.cooldownSeconds * 1000) {
    return { eligible: false, reason: 'cooldown', amount: 0, multiplier };
  }

  const roll = input.random ?? randomInt;
  const base = roll(config.xpMin, config.xpMax);
  const amount = Math.max(1, Math.round(base * multiplier));

  return { eligible: true, amount, multiplier };
}
