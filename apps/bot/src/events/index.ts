import type { BotEvent } from '../core/events.js';
import { errorEvent, warnEvent } from './client-error.js';
import { guildCreateEvent } from './guild-create.js';
import { interactionCreateEvent } from './interaction-create.js';
import { messageCreateEvent } from './message-create.js';
import { readyEvent } from './ready.js';

export const events: readonly BotEvent[] = [
  readyEvent,
  guildCreateEvent,
  interactionCreateEvent,
  messageCreateEvent,
  errorEvent,
  warnEvent,
];
