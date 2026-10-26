import { PREMIUM_FEATURES } from '@veyra/shared';
import { MessageFlags, PermissionsBitField } from 'discord.js';
import type { VeyraClient } from './client.js';
import { takeCooldown } from './cooldowns.js';
import { newErrorId, UserFacingError } from './errors.js';
import { replyError } from './respond.js';

export async function handleChatInputCommand(
  client: VeyraClient,
  interaction: import('discord.js').ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction
      .reply({
        content: 'Veyra only works inside a Discord server.',
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const guildId = interaction.guildId;
  const errorId = newErrorId();
  const config = await client.getConfig(guildId);
  const premium = await client.isPremium(guildId);

  try {
    if (!client.isCategoryEnabled(command.category, config) && !command.allowWhenDisabled) {
      await replyError(interaction, `**/${command.data.name}** is disabled on this server.`);
      return;
    }

    if (command.premiumOnly && !premium) {
      const feature = command.premiumFeature
        ? PREMIUM_FEATURES.find((entry) => entry.id === command.premiumFeature)
        : null;
      await replyError(
        interaction,
        `${feature ? `**${feature.name}** is` : 'This command is'} a **Veyra Premium** feature. Upgrade in the dashboard at **/premium**.`,
      );
      return;
    }

    if (command.userPermissions?.length) {
      const missing = interaction.memberPermissions?.missing(command.userPermissions) ?? [];
      if (missing.length > 0) {
        await replyError(
          interaction,
          `You need the following permissions: ${new PermissionsBitField(missing).toArray().join(', ')}.`,
        );
        return;
      }
    }

    if (command.botPermissions?.length && interaction.appPermissions) {
      const missing = interaction.appPermissions.missing(command.botPermissions);
      if (missing.length > 0) {
        await replyError(
          interaction,
          `I am missing permissions: ${new PermissionsBitField(missing).toArray().join(', ')}.`,
        );
        return;
      }
    }

    const remaining = takeCooldown(
      guildId,
      interaction.user.id,
      command.data.name,
      command.cooldownSeconds ?? 1,
    );
    if (remaining > 0) {
      await replyError(interaction, `Slow down - try again in ${(remaining / 1000).toFixed(1)}s.`);
      return;
    }

    client.stats?.recordCommand(guildId, command.data.name);

    await command.execute({
      client,
      interaction,
      guild: interaction.guild,
      member: interaction.member,
      settings: config,
      premium,
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
