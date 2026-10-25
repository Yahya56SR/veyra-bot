import type { Command } from '../core/commands.js';
import { helpCommand } from './core/help.js';
import { pingCommand } from './core/ping.js';
import { setupCommand } from './core/setup.js';
import { leaderboardCommand } from './leveling/leaderboard.js';
import { rankCommand } from './leveling/rank.js';
import { banCommand } from './moderation/ban.js';
import { caseCommand } from './moderation/case.js';
import { casesCommand } from './moderation/cases.js';
import { clearWarningsCommand } from './moderation/clearwarnings.js';
import { kickCommand } from './moderation/kick.js';
import { purgeCommand } from './moderation/purge.js';
import { slowmodeCommand } from './moderation/slowmode.js';
import { softbanCommand } from './moderation/softban.js';
import { timeoutCommand } from './moderation/timeout.js';
import { unbanCommand } from './moderation/unban.js';
import { untimeoutCommand } from './moderation/untimeout.js';
import { warnCommand } from './moderation/warn.js';
import { warningsCommand } from './moderation/warnings.js';
import { ticketCommand } from './tickets/ticket.js';
import { announceCommand } from './utility/announce.js';
import { avatarCommand } from './utility/avatar.js';
import { bannerCommand } from './utility/banner.js';
import { channelInfoCommand } from './utility/channelinfo.js';
import { embedCommand } from './utility/embed.js';
import { emojisCommand } from './utility/emojis.js';
import { pollCommand } from './utility/poll.js';
import { remindCommand } from './utility/remind.js';
import { roleInfoCommand } from './utility/roleinfo.js';
import { serverInfoCommand } from './utility/serverinfo.js';
import { timestampCommand } from './utility/timestamp.js';
import { userInfoCommand } from './utility/userinfo.js';

/**
 * Static registry. Every new command must be added here so esbuild can bundle
 * it — dynamic filesystem loading does not survive bundling.
 */
export const commands: readonly Command[] = [
  pingCommand,
  helpCommand,
  setupCommand,
  rankCommand,
  leaderboardCommand,
  warnCommand,
  warningsCommand,
  clearWarningsCommand,
  timeoutCommand,
  untimeoutCommand,
  kickCommand,
  banCommand,
  unbanCommand,
  softbanCommand,
  caseCommand,
  casesCommand,
  purgeCommand,
  slowmodeCommand,
  serverInfoCommand,
  userInfoCommand,
  avatarCommand,
  bannerCommand,
  roleInfoCommand,
  channelInfoCommand,
  emojisCommand,
  pollCommand,
  remindCommand,
  timestampCommand,
  embedCommand,
  announceCommand,
  ticketCommand,
];
