import { MessageFlags, type RepliableInteraction } from 'discord.js';

/**
 * Acknowledges within Discord's 3-second window. Commands that touch Discord,
 * the database, or a Lavalink node must call this before doing work.
 */
export async function deferEphemeral(interaction: RepliableInteraction): Promise<void> {
  if (interaction.deferred || interaction.replied) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
}

export async function deferPublic(interaction: RepliableInteraction): Promise<void> {
  if (interaction.deferred || interaction.replied) return;
  await interaction.deferReply();
}

/** Replies ephemerally, tolerating expired or already-acknowledged interactions. */
export async function replyError(
  interaction: RepliableInteraction,
  message: string,
  errorId?: string,
): Promise<void> {
  const content = errorId ? `${message}\n-# Error ID: \`${errorId}\`` : message;

  try {
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ content });
    } else if (interaction.replied) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
  } catch {
    // The interaction token expired (15 minutes) or the channel was deleted.
  }
}

/** Replies ephemerally with an informational message. */
export async function replyInfo(interaction: RepliableInteraction, message: string): Promise<void> {
  try {
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply({ content: message });
    } else if (interaction.replied) {
      await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  } catch {
    // Ignore expired interactions.
  }
}
