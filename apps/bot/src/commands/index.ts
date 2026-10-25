import type { Command } from '../core/commands.js';
import { helpCommand } from './core/help.js';
import { pingCommand } from './core/ping.js';
import { leaderboardCommand } from './leveling/leaderboard.js';
import { rankCommand } from './leveling/rank.js';

/**
 * Static registry. Every new command must be added here so esbuild can bundle
 * it — dynamic filesystem loading does not survive bundling.
 */
export const commands: readonly Command[] = [
  pingCommand,
  helpCommand,
  rankCommand,
  leaderboardCommand,
];
