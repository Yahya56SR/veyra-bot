import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { handleChatInputCommand } from '../core/interaction-handler.js';

export const interactionCreateEvent: BotEvent = {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(client, interaction);
    }
  },
};
