import { type ButtonInteraction, type StringSelectMenuInteraction } from 'discord.js';
import type { NervanaClient } from '../../core/client.js';
import { newErrorId, UserFacingError } from '../../core/errors.js';
import { deferEphemeral, replyError } from '../../core/respond.js';
import { enterGiveaway } from './giveaways.js';
import { applySelectRoles } from './reaction-roles.js';

export async function handleCommunityInteraction(
  client: NervanaClient,
  interaction: ButtonInteraction | StringSelectMenuInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (interaction.guildId !== client.env.GUILD_ID) return;

  const customId = interaction.customId;
  const isGiveaway = customId.startsWith('giveaway:enter:');
  const isRoleSelect = customId === 'rr:select';
  if (!isGiveaway && !isRoleSelect) return;

  const errorId = newErrorId();

  try {
    await deferEphemeral(interaction);

    if (isGiveaway && interaction.isButton()) {
      const id = Number(customId.slice('giveaway:enter:'.length));
      if (!Number.isInteger(id) || id <= 0) {
        throw new UserFacingError('That giveaway button is invalid.');
      }

      const result = await enterGiveaway(client, interaction.guild, interaction.user, id);

      await interaction.editReply({
        content: result.alreadyEntered
          ? `You are already entered in **#${result.giveaway.id}**.`
          : `You are entered in **#${result.giveaway.id}** for **${result.giveaway.prize}**. Good luck!`,
      });
      return;
    }

    if (isRoleSelect && interaction.isStringSelectMenu()) {
      const result = await applySelectRoles(
        client,
        interaction.member,
        interaction.message.id,
        interaction.values,
      );

      await interaction.editReply({
        content: `Roles updated \u00b7 ${result.added} added, ${result.removed} removed.`,
      });
    }
  } catch (error) {
    client.logger.error(
      { err: error, errorId, customId, userId: interaction.user.id },
      'community interaction failed',
    );

    await replyError(
      interaction,
      error instanceof UserFacingError
        ? error.message
        : 'Something went wrong while handling that community action.',
      errorId,
    );
  }
}
