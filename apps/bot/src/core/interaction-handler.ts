import { MessageFlags } from 'discord.js';
import type { NervanaClient } from './client.js';
import { takeCooldown } from './cooldowns.js';
import { newErrorId, UserFacingError } from './errors.js';
import { replyError } from './respond.js';

export async function handleChatInputCommand(
  client: NervanaClient,
  interaction: import('discord.js').ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction
      .reply({
        content: 'Nervana only works inside its configured server.',
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return;
  }

  if (interaction.guildId !== client.env.GUILD_ID) {
    await replyError(interaction, 'This bot is locked to a different server.');
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const errorId = newErrorId();

  try {
    if (!client.isCategoryEnabled(command.category)) {
      await replyError(interaction, `**/${command.data.name}** is disabled on this server.`);
      return;
    }

    if (command.userPermissions?.length) {
      const missing = interaction.memberPermissions?.missing(command.userPermissions) ?? [];
      if (missing.length > 0) {
        await replyError(
          interaction,
          `You need the following permissions: ${missing.map((p) => `\`${p}\``).join(', ')}.`,
        );
        return;
      }
    }

    if (command.botPermissions?.length && interaction.appPermissions) {
      const missing = interaction.appPermissions.missing(command.botPermissions);
      if (missing.length > 0) {
        await replyError(
          interaction,
          `I am missing permissions: ${missing.map((p) => `\`${p}\``).join(', ')}.`,
        );
        return;
      }
    }

    const remaining = takeCooldown(
      interaction.user.id,
      command.data.name,
      command.cooldownSeconds ?? 1,
    );
    if (remaining > 0) {
      await replyError(interaction, `Slow down — try again in ${(remaining / 1000).toFixed(1)}s.`);
      return;
    }

    await command.execute({
      client,
      interaction,
      guild: interaction.guild,
      member: interaction.member,
      settings: client.settings,
    });
  } catch (error) {
    client.logger.error(
      {
        err: error,
        errorId,
        command: interaction.commandName,
        userId: interaction.user.id,
        guildId: interaction.guildId,
      },
      'command failed',
    );

    const message =
      error instanceof UserFacingError
        ? error.message
        : 'Something went wrong while running that command.';

    await replyError(interaction, message, errorId);
  }
}
