import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';

export const errorEvent: BotEvent = {
  name: Events.Error,
  execute(client, error) {
    client.logger.error({ err: error }, 'discord client error');
  },
};

export const warnEvent: BotEvent = {
  name: Events.Warn,
  execute(client, message) {
    client.logger.warn({ message }, 'discord client warning');
  },
};
