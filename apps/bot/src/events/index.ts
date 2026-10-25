import type { BotEvent } from '../core/events.js';
import { channelUpdateEvent } from './channel-update.js';
import { errorEvent, warnEvent } from './client-error.js';
import { guildCreateEvent } from './guild-create.js';
import { interactionCreateEvent } from './interaction-create.js';
import { guildMemberAddEvent } from './member-add.js';
import { guildMemberRemoveEvent } from './member-remove.js';
import { guildMemberUpdateEvent } from './member-update.js';
import { messageBulkDeleteEvent } from './message-bulk-delete.js';
import { messageCreateEvent } from './message-create.js';
import { messageDeleteEvent } from './message-delete.js';
import { messageUpdateEvent } from './message-update.js';
import { readyEvent } from './ready.js';
import { roleUpdateEvent } from './role-update.js';
import { voiceUpdateEvent } from './voice-update.js';

export const events: readonly BotEvent[] = [
  readyEvent,
  guildCreateEvent,
  interactionCreateEvent,
  messageCreateEvent,
  messageDeleteEvent,
  messageUpdateEvent,
  messageBulkDeleteEvent,
  guildMemberAddEvent,
  guildMemberRemoveEvent,
  guildMemberUpdateEvent,
  channelUpdateEvent,
  roleUpdateEvent,
  voiceUpdateEvent,
  errorEvent,
  warnEvent,
];
