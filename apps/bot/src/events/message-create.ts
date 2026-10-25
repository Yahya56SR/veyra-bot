import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';

export const messageCreateEvent: BotEvent = {
  name: Events.MessageCreate,
  async execute(client, message) {
    if (message.author.bot) return;
    await client.leveling?.record(message);
  },
};
