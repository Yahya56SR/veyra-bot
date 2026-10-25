import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';

export const messageCreateEvent: BotEvent = {
  name: Events.MessageCreate,
  async execute(client, message) {
    if (message.author.bot) return;

    const handled = (await client.automod?.handleMessage(message)) ?? false;
    if (handled) return;

    await client.leveling?.record(message);
  },
};
