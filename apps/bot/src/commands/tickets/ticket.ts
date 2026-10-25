import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import {
  addTicketMember,
  claimTicket,
  closeTicket,
  postTicketPanel,
  removeTicketMember,
} from '../../modules/tickets/service.js';

function currentTicketChannel(interaction: ChatInputCommandInteraction): TextChannel {
  const channel = interaction.channel;
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new UserFacingError('Run this command inside a ticket channel.');
  }
  return channel;
}

export const ticketCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Open, close, and manage support tickets.')
    .addSubcommand((sub) =>
      sub.setName('panel').setDescription('Publish the ticket panel in the configured channel.'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Close the current ticket.')
        .addStringOption((option) =>
          option
            .setName('reason')
            .setDescription('Why is this ticket being closed?')
            .setMaxLength(500),
        ),
    )
    .addSubcommand((sub) => sub.setName('claim').setDescription('Claim the current ticket.'))
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add a member to the current ticket.')
        .addUserOption((option) =>
          option.setName('user').setDescription('Member to add').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a member from the current ticket.')
        .addUserOption((option) =>
          option.setName('user').setDescription('Member to remove').setRequired(true),
        ),
    ),
  category: 'tickets',
  allowWhenDisabled: true,
  cooldownSeconds: 2,
  async execute({ client, interaction, guild, member }) {
    await deferEphemeral(interaction);

    const sub = interaction.options.getSubcommand(true);

    if (sub === 'panel') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        throw new UserFacingError('You need Manage Server to publish the ticket panel.');
      }

      const message = await postTicketPanel(client, guild, interaction.user.id);
      await interaction.editReply({ content: `Ticket panel published: ${message.url}` });
      return;
    }

    const channel = currentTicketChannel(interaction);

    if (sub === 'close') {
      const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
      const result = await closeTicket(client, guild, channel, member, reason);
      await interaction.editReply({
        content: `Ticket **#${String(result.ticket.id).padStart(4, '0')}** closed. Archived ${
          result.messageCount
        } message(s)${result.truncated ? ' (transcript truncated)' : ''} · ${
          result.transcriptBytes
        } bytes.`,
      });
      return;
    }

    if (sub === 'claim') {
      const ticket = await claimTicket(client, guild, channel, member);
      await interaction.editReply({
        content: `Ticket **#${String(ticket.id).padStart(4, '0')}** claimed.`,
      });
      return;
    }

    const target = interaction.options.getUser('user', true);

    if (sub === 'add') {
      await addTicketMember(client, guild, channel, member, target);
      await interaction.editReply({ content: `Added ${target} to the ticket.` });
      return;
    }

    await removeTicketMember(client, guild, channel, member, target);
    await interaction.editReply({ content: `Removed ${target} from the ticket.` });
  },
};
