import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { handleReactionRoleAdd } from '../modules/community/reaction-roles.js';
import { handleStarboard } from '../modules/community/starboard.js';

export const messageReactionAddEvent: BotEvent = {
  name: Events.MessageReactionAdd,
  async execute(client, reaction, user) {
    await handleReactionRoleAdd(client, reaction, user);
    await handleStarboard(client, reaction, user);
  },
};
