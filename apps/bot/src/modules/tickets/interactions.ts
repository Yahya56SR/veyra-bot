import {
  ActionRowBuilder,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
} from 'discord.js';
import type { NervanaClient } from '../../core/client.js';
import { newErrorId, UserFacingError } from '../../core/errors.js';
import { deferEphemeral, replyError } from '../../core/respond.js';
import { claimTicket, closeTicket, openTicket, type CloseTicketResult } from './service.js';

function requireTextChannel(interaction: ButtonInteraction | ModalSubmitInteraction): TextChannel {
  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new UserFacingError('This action only works inside a ticket channel.');
  }
  return channel;
}

function closeSummary(result: CloseTicketResult): string {
  return `Ticket **#${String(result.ticket.id).padStart(4, '0')}** closed. Archived ${
    result.messageCount
  } message(s)${result.truncated ? ' (transcript truncated)' : ''}.`;
}

/**
 * Handles ticket buttons and modals. Returns silently for unrelated component
 * IDs so future components can use the same event listener.
 */
export async function handleTicketInteraction(
  client: NervanaClient,
  interaction: ButtonInteraction | ModalSubmitInteraction,
): Promise<void> {
  if (!interaction.inCachedGuild()) return;
  if (interaction.guildId !== client.env.GUILD_ID) return;

  const customId = interaction.customId;
  if (!customId.startsWith('ticket:')) return;

  const errorId = newErrorId();

  try {
    if (interaction.isButton()) {
      if (customId.startsWith('ticket:open:')) {
        await deferEphemeral(interaction);
        const categoryId = customId.slice('ticket:open:'.length);
        const { channel } = await openTicket(
          client,
          interaction.guild,
          interaction.member,
          categoryId,
        );
        await interaction.editReply({ content: `Your ticket is ready: ${channel}` });
        return;
      }

      if (customId === 'ticket:close') {
        const modal = new ModalBuilder()
          .setCustomId('ticket:close:modal')
          .setTitle('Close ticket')
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Reason (optional)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setMaxLength(500),
            ),
          );

        await interaction.showModal(modal);
        return;
      }

      if (customId === 'ticket:claim') {
        await deferEphemeral(interaction);
        const channel = requireTextChannel(interaction);
        const ticket = await claimTicket(client, interaction.guild, channel, interaction.member);
        await interaction.editReply({
          content: `Ticket **#${String(ticket.id).padStart(4, '0')}** claimed.`,
        });
        return;
      }
    }

    if (interaction.isModalSubmit() && customId === 'ticket:close:modal') {
      await deferEphemeral(interaction);
      const channel = requireTextChannel(interaction);
      const reason = interaction.fields.getTextInputValue('reason').trim() || 'No reason provided';
      const result = await closeTicket(
        client,
        interaction.guild,
        channel,
        interaction.member,
        reason,
      );
      await interaction.editReply({ content: closeSummary(result) });
    }
  } catch (error) {
    client.logger.error(
      { err: error, errorId, customId, userId: interaction.user.id },
      'ticket interaction failed',
    );

    await replyError(
      interaction,
      error instanceof UserFacingError
        ? error.message
        : 'Something went wrong while handling that ticket action.',
      errorId,
    );
  }
}
