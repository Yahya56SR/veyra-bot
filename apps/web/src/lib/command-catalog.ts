import type { CommandCategory } from '@veyra/shared';

export interface CatalogCommand {
  name: string;
  description: string;
  category: CommandCategory;
  premium?: boolean;
}

export const COMMAND_CATALOG: CatalogCommand[] = [
  {
    name: '/help',
    description: 'List every command you can use in this server.',
    category: 'core',
  },
  { name: '/ping', description: 'Check gateway latency and database health.', category: 'core' },
  {
    name: '/setup',
    description: 'Configure every module without leaving Discord.',
    category: 'core',
  },
  {
    name: '/premium',
    description: "Show this server's Premium status and dashboard link.",
    category: 'core',
  },
  {
    name: '/stats',
    description: 'Show server activity, cases, and ticket totals.',
    category: 'stats',
  },

  { name: '/warn', description: 'Warn a member and open a tracked case.', category: 'moderation' },
  { name: '/warnings', description: 'List a member’s active warnings.', category: 'moderation' },
  {
    name: '/clearwarnings',
    description: 'Clear every active warning for a member.',
    category: 'moderation',
  },
  {
    name: '/timeout',
    description: 'Time a member out with a case duration.',
    category: 'moderation',
  },
  { name: '/untimeout', description: 'Lift an active timeout.', category: 'moderation' },
  { name: '/kick', description: 'Kick a member and record the reason.', category: 'moderation' },
  {
    name: '/ban',
    description: 'Ban a member permanently or for a duration.',
    category: 'moderation',
  },
  { name: '/unban', description: 'Lift a ban by user ID.', category: 'moderation' },
  {
    name: '/softban',
    description: 'Delete recent messages and immediately unban.',
    category: 'moderation',
  },
  {
    name: '/purge',
    description: 'Bulk-delete messages with member filters.',
    category: 'moderation',
  },
  { name: '/slowmode', description: 'Set or clear channel slowmode.', category: 'moderation' },
  { name: '/cases', description: 'Browse and filter moderation cases.', category: 'moderation' },
  { name: '/case', description: 'Inspect one case in detail.', category: 'moderation' },

  { name: '/avatar', description: 'Show a member’s avatar in full size.', category: 'utility' },
  { name: '/banner', description: 'Show a member’s profile banner.', category: 'utility' },
  { name: '/userinfo', description: 'Account and membership details.', category: 'utility' },
  {
    name: '/roleinfo',
    description: 'Role colour, position, and permissions.',
    category: 'utility',
  },
  { name: '/serverinfo', description: 'Server metadata and boost level.', category: 'utility' },
  { name: '/channelinfo', description: 'Channel topic, type, and slowmode.', category: 'utility' },
  { name: '/emojis', description: 'List custom emojis with IDs.', category: 'utility' },
  { name: '/timestamp', description: 'Generate Discord timestamps.', category: 'utility' },
  { name: '/embed', description: 'Send a formatted embed.', category: 'utility' },
  { name: '/announce', description: 'Publish an announcement embed.', category: 'utility' },
  { name: '/poll', description: 'Run a button or reaction poll.', category: 'utility' },
  {
    name: '/remind',
    description: 'Set, list, and cancel persistent reminders.',
    category: 'utility',
  },

  { name: '/ticket panel', description: 'Publish the branded ticket panel.', category: 'tickets' },
  {
    name: '/ticket close',
    description: 'Close the current ticket and store a transcript.',
    category: 'tickets',
  },
  { name: '/ticket claim', description: 'Claim a ticket as staff.', category: 'tickets' },
  { name: '/ticket add', description: 'Add a member to the current ticket.', category: 'tickets' },
  {
    name: '/ticket remove',
    description: 'Remove a member from the current ticket.',
    category: 'tickets',
  },

  { name: '/rank', description: 'Show level, XP, and progress.', category: 'leveling' },
  { name: '/leaderboard', description: 'Top members by XP.', category: 'leveling' },

  { name: '/balance', description: 'Show a member’s wallet.', category: 'economy' },
  { name: '/baltop', description: 'Richest members in the server.', category: 'economy' },
  { name: '/daily', description: 'Claim daily coins and build a streak.', category: 'economy' },
  { name: '/work', description: 'Work a cooldown for random coins.', category: 'economy' },
  { name: '/pay', description: 'Transfer coins to another member.', category: 'economy' },
  { name: '/gamble', description: 'Risk coins on a coin flip.', category: 'economy' },
  { name: '/shop', description: 'Browse role rewards and server items.', category: 'economy' },
  { name: '/buy', description: 'Buy an item and receive its role.', category: 'economy' },
  { name: '/inventory', description: 'Show role items you own.', category: 'economy' },
  {
    name: '/ecoadmin',
    description: 'Manage balances, stock, and shop items.',
    category: 'economy',
  },

  {
    name: '/giveaway start',
    description: 'Run persistent button giveaways.',
    category: 'community',
  },
  {
    name: '/giveaway end',
    description: 'End a giveaway early and draw winners.',
    category: 'community',
  },
  { name: '/giveaway reroll', description: 'Draw replacement winners.', category: 'community' },
  {
    name: '/reactionrole',
    description: 'Build reaction and select-menu role panels.',
    category: 'community',
  },

  { name: '/play', description: 'Queue a track, playlist, or search result.', category: 'music' },
  { name: '/nowplaying', description: 'Show the current track and controls.', category: 'music' },
  { name: '/queue', description: 'Inspect the upcoming queue.', category: 'music' },
  {
    name: '/controls',
    description: 'Pause, resume, skip, seek, loop, shuffle, and stop.',
    category: 'music',
  },
  { name: '/volume', description: 'Change playback volume.', category: 'music' },
  { name: '/disconnect', description: 'Leave the voice channel.', category: 'music' },

  {
    name: '/setup personalizer',
    description: 'Set the server nickname, embed colour, and templates.',
    category: 'core',
    premium: true,
  },
];

export const CATALOG_GROUPS = [
  'core',
  'moderation',
  'utility',
  'tickets',
  'leveling',
  'economy',
  'community',
  'music',
  'stats',
] as const satisfies readonly CommandCategory[];
