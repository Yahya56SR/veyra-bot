import type { Command } from '../core/commands.js';
import { helpCommand } from './core/help.js';
import { pingCommand } from './core/ping.js';
import { setupCommand } from './core/setup.js';
import { statsCommand } from './core/stats.js';
import { leaderboardCommand } from './leveling/leaderboard.js';
import { rankCommand } from './leveling/rank.js';
import { balanceCommand } from './economy/balance.js';
import { baltopCommand } from './economy/baltop.js';
import { buyCommand } from './economy/buy.js';
import { dailyCommand } from './economy/daily.js';
import { ecoAdminCommand } from './economy/ecoadmin.js';
import { gambleCommand } from './economy/gamble.js';
import { inventoryCommand } from './economy/inventory.js';
import { payCommand } from './economy/pay.js';
import { shopCommand } from './economy/shop.js';
import { workCommand } from './economy/work.js';
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
import { giveawayCommand } from './community/giveaway.js';
import { reactionRoleCommand } from './community/reactionrole.js';
import {
  clearCommand,
  disconnectCommand,
  loopCommand,
  pauseCommand,
  removeCommand,
  resumeCommand,
  seekCommand,
  shuffleCommand,
  skipCommand,
  stopCommand,
  volumeCommand,
} from './music/controls.js';
import { nowPlayingCommand, queueCommand } from './music/nowplaying.js';
import { playCommand } from './music/play.js';
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
  statsCommand,
  rankCommand,
  leaderboardCommand,
  balanceCommand,
  baltopCommand,
  dailyCommand,
  workCommand,
  payCommand,
  gambleCommand,
  shopCommand,
  buyCommand,
  inventoryCommand,
  ecoAdminCommand,
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
  giveawayCommand,
  reactionRoleCommand,
  playCommand,
  pauseCommand,
  resumeCommand,
  skipCommand,
  stopCommand,
  disconnectCommand,
  nowPlayingCommand,
  queueCommand,
  volumeCommand,
  loopCommand,
  shuffleCommand,
  removeCommand,
  clearCommand,
  seekCommand,
];
