import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { handleReactionRoleRemove } from '../modules/community/reaction-roles.js';
import { handleStarboard } from '../modules/community/starboard.js';

export const messageReactionRemoveEvent: BotEvent = {
  name: Events.MessageReactionRemove,
  async execute(client, reaction, user) {
    await handleReactionRoleRemove(client, reaction, user);
    await handleStarboard(client, reaction, user);
  },
};
