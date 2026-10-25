import { Events } from 'discord.js';
import type { BotEvent } from '../core/events.js';
import { handleChatInputCommand } from '../core/interaction-handler.js';
import { handleTicketInteraction } from '../modules/tickets/interactions.js';

export const interactionCreateEvent: BotEvent = {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(client, interaction);
      return;
    }

    if (interaction.isButton() || interaction.isModalSubmit()) {
      await handleTicketInteraction(client, interaction);
    }
  },
};
