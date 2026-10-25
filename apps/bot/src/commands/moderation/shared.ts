import type { ChatInputCommandInteraction } from 'discord.js';

export function readReason(interaction: ChatInputCommandInteraction): string {
  return interaction.options.getString('reason')?.trim() || 'No reason provided';
}

export function readDuration(interaction: ChatInputCommandInteraction): string | null {
  return interaction.options.getString('duration')?.trim() || null;
}
