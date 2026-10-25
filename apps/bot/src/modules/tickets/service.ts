import { tickets } from '@nervana/db';
import { BRAND, type TicketCategory, type TicketsConfig } from '@nervana/shared';
import { and, count, eq } from 'drizzle-orm';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type Message,
  type TextChannel,
  type User,
} from 'discord.js';
import { gzipSync } from 'node:zlib';
import type { NervanaClient } from '../../core/client.js';
import { requireDb } from '../../core/database.js';
import { UserFacingError } from '../../core/errors.js';
import { updateModule } from '../../config/service.js';
import { buildTranscriptHtml, type TranscriptMessage } from './transcript.js';

export type TicketRow = typeof tickets.$inferSelect;

const MAX_TRANSCRIPT_MESSAGES = 1_000;
const TRANSCRIPT_PAGE = 100;

export function isTicketStaff(client: NervanaClient, member: GuildMember): boolean {
  const staffRoleId = client.settings.tickets.staffRoleId;
  return (
    member.permissions.has(PermissionFlagsBits.ManageChannels) ||
    (staffRoleId !== null && member.roles.cache.has(staffRoleId))
  );
}

export function requiredTicketStaff(client: NervanaClient, member: GuildMember): void {
  if (!isTicketStaff(client, member)) {
    throw new UserFacingError('Only ticket staff can do that.');
  }
}

export async function findTicketByChannel(
  client: NervanaClient,
  channelId: string,
): Promise<TicketRow | null> {
  const rows = await requireDb(client)
    .select()
    .from(tickets)
    .where(eq(tickets.channelId, channelId))
    .limit(1);
  return rows[0] ?? null;
}

export async function requireOpenTicket(
  client: NervanaClient,
  channelId: string,
): Promise<TicketRow> {
  const ticket = await findTicketByChannel(client, channelId);
  if (!ticket) throw new UserFacingError('This channel is not a ticket.');
  if (ticket.status !== 'open') throw new UserFacingError('This ticket is already closed.');
  return ticket;
}

export function ticketCategoryLabel(config: TicketsConfig, ticket: TicketRow): string {
  return (
    config.categories.find((category) => category.id === ticket.category)?.label ?? ticket.category
  );
}

function ticketTopic(ticket: TicketRow, member: GuildMember, label: string): string {
  return `Ticket #${String(ticket.id).padStart(4, '0')} · ${label} · ${member.user.tag} (${member.id})`;
}

function botMember(guild: Guild): GuildMember | null {
  return guild.members.me;
}

export async function openTicket(
  client: NervanaClient,
  guild: Guild,
  member: GuildMember,
  categoryId: string,
): Promise<{ channel: TextChannel; ticket: TicketRow; label: string }> {
  const config = client.settings.tickets;
  if (!config.enabled) throw new UserFacingError('Tickets are disabled.');
  if (!config.categoryId || !config.staffRoleId) {
    throw new UserFacingError('Tickets are not configured yet. Ask staff to run `/setup tickets`.');
  }
  if (member.user.bot) throw new UserFacingError('Bots cannot open tickets.');

  const category = config.categories.find((entry) => entry.id === categoryId);
  if (!category) {
    throw new UserFacingError(
      'That ticket category is no longer available. Use the current panel.',
    );
  }

  const db = requireDb(client);
  const openRows = await db
    .select({ value: count() })
    .from(tickets)
    .where(and(eq(tickets.userId, member.id), eq(tickets.status, 'open')));
  const openCount = openRows[0]?.value ?? 0;
  if (openCount >= config.maxOpenPerUser) {
    throw new UserFacingError(
      `You already have ${openCount} open ticket${openCount === 1 ? '' : 's'} (limit ${config.maxOpenPerUser}).`,
    );
  }

  const me = botMember(guild);
  if (!me) throw new UserFacingError('I could not resolve my own server member.');
  if (
    !me.permissions.has(PermissionFlagsBits.ManageChannels) ||
    !me.permissions.has(PermissionFlagsBits.ManageRoles)
  ) {
    throw new UserFacingError('I need Manage Channels and Manage Roles to open ticket channels.');
  }

  const parent = await guild.channels.fetch(config.categoryId).catch(() => null);
  if (!parent || parent.type !== ChannelType.GuildCategory) {
    throw new UserFacingError(
      'The configured ticket category is missing. Ask staff to fix `/setup tickets`.',
    );
  }

  const staffRole = await guild.roles.fetch(config.staffRoleId).catch(() => null);
  if (!staffRole) {
    throw new UserFacingError(
      'The configured ticket staff role is missing. Ask staff to fix `/setup tickets`.',
    );
  }

  const base = member.user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  const channel = await guild.channels.create({
    name: `ticket-${base || 'user'}`,
    type: ChannelType.GuildText,
    parent: parent.id,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: staffRole.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageMessages,
        ],
      },
      {
        id: me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  });

  let row: TicketRow;
  try {
    const inserted = await db
      .insert(tickets)
      .values({
        channelId: channel.id,
        userId: member.id,
        category: category.id,
      })
      .returning();

    const created = inserted[0];
    if (!created) throw new UserFacingError('Could not save the ticket.');
    row = created;
  } catch (error) {
    await channel.delete('Ticket setup failed').catch(() => {});
    throw error;
  }

  const paddedId = String(row.id).padStart(4, '0');
  await channel.setName(`ticket-${paddedId}`, `Ticket #${row.id}`).catch(() => {});
  await channel
    .setTopic(ticketTopic(row, member, category.label), `Ticket #${row.id}`)
    .catch(() => {});

  const embed = new EmbedBuilder()
    .setColor(BRAND.color)
    .setTitle(`Ticket #${paddedId}`)
    .setDescription(
      `Thanks for opening a ticket, ${member}.\n\n**Category:** ${category.label}\nPlease describe your issue and a staff member will help you.`,
    )
    .addFields(
      { name: 'Opened by', value: `${member}`, inline: true },
      { name: 'Opened', value: `<t:${Math.floor(row.openedAt.getTime() / 1000)}:R>`, inline: true },
    )
    .setFooter({ text: 'Use the buttons below to close or claim this ticket.' });

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Close').setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket:claim')
      .setLabel('Claim')
      .setStyle(ButtonStyle.Secondary),
  );

  const roleMention = staffRole.id === guild.id ? '' : `${staffRole}`;

  await channel.send({
    content: `${member} ${roleMention}`.trim(),
    embeds: [embed],
    components: [buttons],
    allowedMentions: {
      users: [member.id],
      roles: staffRole.id === guild.id ? [] : [staffRole.id],
    },
  });

  return { channel, ticket: row, label: category.label };
}

export interface CloseTicketResult {
  ticket: TicketRow;
  transcriptBytes: number;
  messageCount: number;
  truncated: boolean;
}

export async function closeTicket(
  client: NervanaClient,
  guild: Guild,
  channel: TextChannel,
  actor: GuildMember,
  reason: string,
): Promise<CloseTicketResult> {
  const ticket = await requireOpenTicket(client, channel.id);
  const staff = isTicketStaff(client, actor);
  if (!staff && actor.id !== ticket.userId) {
    throw new UserFacingError('Only the ticket opener or ticket staff can close this ticket.');
  }

  const config = client.settings.tickets;
  const label = ticketCategoryLabel(config, ticket);
  const safeReason = reason.trim().slice(0, 500) || 'No reason provided';
  const closedAt = new Date();

  const collected: Message[] = [];
  let before: string | undefined;
  for (let page = 0; page < Math.ceil(MAX_TRANSCRIPT_MESSAGES / TRANSCRIPT_PAGE); page += 1) {
    const batch = await channel.messages.fetch({ limit: TRANSCRIPT_PAGE, before });
    collected.push(...batch.values());
    if (batch.size < TRANSCRIPT_PAGE) break;
    before = batch.last()?.id;
    if (!before) break;
  }
  collected.reverse();

  const transcriptMessages: TranscriptMessage[] = collected.map((message) => ({
    author: { tag: message.author.tag },
    content: message.content,
    createdAt: message.createdAt,
    attachments: [...message.attachments.values()].map((attachment) => ({
      name: attachment.name,
      url: attachment.url,
    })),
    embeds: message.embeds.map((embed) => ({
      title: embed.title,
      description: embed.description,
    })),
  }));

  const transcript = buildTranscriptHtml(transcriptMessages, {
    ticketId: ticket.id,
    openedBy: await client.users
      .fetch(ticket.userId)
      .then((user) => `${user.tag} (${ticket.userId})`)
      .catch(() => ticket.userId),
    category: label,
    openedAt: ticket.openedAt,
    closedBy: `${actor.user.tag} (${actor.id})`,
    closedAt,
    reason: safeReason,
  });

  const gzipped = gzipSync(Buffer.from(transcript.html, 'utf8'), { level: 9 });

  const db = requireDb(client);
  await db
    .update(tickets)
    .set({
      status: 'closed',
      closedAt,
      transcript: gzipped,
      transcriptBytes: gzipped.length,
    })
    .where(eq(tickets.id, ticket.id));

  const updated: TicketRow = {
    ...ticket,
    status: 'closed',
    closedAt,
    transcript: gzipped,
    transcriptBytes: gzipped.length,
  };

  const logChannel = config.logChannelId
    ? await guild.channels.fetch(config.logChannelId).catch(() => null)
    : null;

  if (logChannel?.isSendable()) {
    const logEmbed = new EmbedBuilder()
      .setColor(BRAND.muted)
      .setTitle(`Ticket #${String(ticket.id).padStart(4, '0')} closed`)
      .addFields(
        { name: 'Opened by', value: `<@${ticket.userId}>`, inline: true },
        { name: 'Closed by', value: `${actor}`, inline: true },
        { name: 'Category', value: label, inline: true },
        { name: 'Reason', value: safeReason },
      )
      .setFooter({ text: `${transcript.messageCount} message(s) · ${gzipped.length} bytes` })
      .setTimestamp(closedAt);

    await logChannel
      .send({
        embeds: [logEmbed],
        files: [
          new AttachmentBuilder(gzipped, {
            name: `ticket-${String(ticket.id).padStart(4, '0')}.html.gz`,
          }),
        ],
        allowedMentions: { parse: [] },
      })
      .catch((error: unknown) => {
        client.logger.warn({ err: error, ticketId: ticket.id }, 'ticket transcript log failed');
      });
  }

  await channel
    .send({
      content: `Ticket closed by ${actor}.`,
      allowedMentions: { parse: [] },
    })
    .catch(() => {});

  await channel
    .delete(`Ticket closed by ${actor.user.tag}: ${safeReason}`.slice(0, 512))
    .catch((error: unknown) => {
      client.logger.warn({ err: error, ticketId: ticket.id }, 'ticket channel delete failed');
    });

  return {
    ticket: updated,
    transcriptBytes: gzipped.length,
    messageCount: transcript.messageCount,
    truncated: transcript.truncated,
  };
}

export async function claimTicket(
  client: NervanaClient,
  guild: Guild,
  channel: TextChannel,
  actor: GuildMember,
): Promise<TicketRow> {
  requiredTicketStaff(client, actor);
  const ticket = await requireOpenTicket(client, channel.id);

  if (ticket.claimedBy && ticket.claimedBy !== actor.id) {
    throw new UserFacingError(`This ticket is already claimed by <@${ticket.claimedBy}>.`);
  }

  const updated = await requireDb(client)
    .update(tickets)
    .set({ claimedBy: actor.id })
    .where(and(eq(tickets.id, ticket.id), eq(tickets.status, 'open')))
    .returning();

  const row = updated[0];
  if (!row) throw new UserFacingError('This ticket is no longer open.');

  const topic = channel.topic ? `${channel.topic} · claimed by ${actor.user.tag}` : undefined;
  if (topic)
    await channel.setTopic(topic.slice(0, 1024), `Claimed by ${actor.user.tag}`).catch(() => {});

  await channel
    .send({
      content: `Ticket claimed by ${actor}.`,
      allowedMentions: { parse: [] },
    })
    .catch(() => {});

  return row;
}

export async function addTicketMember(
  client: NervanaClient,
  guild: Guild,
  channel: TextChannel,
  actor: GuildMember,
  target: User,
): Promise<void> {
  requiredTicketStaff(client, actor);
  await requireOpenTicket(client, channel.id);

  if (target.bot) throw new UserFacingError('Bots cannot be added to tickets.');
  const targetMember = await guild.members.fetch(target.id).catch(() => null);
  if (!targetMember) throw new UserFacingError('That user is not a member of this server.');

  const me = botMember(guild);
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new UserFacingError('I need Manage Roles to update ticket permissions.');
  }

  await channel.permissionOverwrites.edit(
    target.id,
    {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    },
    { reason: `Added to ticket by ${actor.user.tag}` },
  );

  await channel
    .send({
      content: `${target} was added to the ticket by ${actor}.`,
      allowedMentions: { parse: [] },
    })
    .catch(() => {});
}

export async function removeTicketMember(
  client: NervanaClient,
  guild: Guild,
  channel: TextChannel,
  actor: GuildMember,
  target: User,
): Promise<void> {
  requiredTicketStaff(client, actor);
  const ticket = await requireOpenTicket(client, channel.id);

  if (target.id === ticket.userId) {
    throw new UserFacingError('The ticket opener cannot be removed. Close the ticket instead.');
  }
  if (target.id === client.user?.id) {
    throw new UserFacingError('I cannot remove myself from a ticket.');
  }

  const me = botMember(guild);
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new UserFacingError('I need Manage Roles to update ticket permissions.');
  }

  await channel.permissionOverwrites.delete(target.id, `Removed from ticket by ${actor.user.tag}`);

  await channel
    .send({
      content: `${target} was removed from the ticket by ${actor}.`,
      allowedMentions: { parse: [] },
    })
    .catch(() => {});
}

export interface TicketPanel {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
}

export function buildTicketPanel(config: TicketsConfig): TicketPanel {
  const categories: TicketCategory[] = config.categories;

  const embed = new EmbedBuilder()
    .setColor(BRAND.color)
    .setTitle('Support tickets')
    .setDescription(
      'Choose a category below to open a private channel with staff.\n\nPlease do not open a ticket for something you can ask in a public channel.',
    )
    .addFields(
      categories.map((category) => ({
        name: `${category.emoji ? `${category.emoji} ` : ''}${category.label}`,
        value: category.description ?? 'Open a private ticket with staff.',
        inline: false,
      })),
    )
    .setFooter({ text: `Up to ${config.maxOpenPerUser} open ticket(s) per member` });

  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let index = 0; index < categories.length; index += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const category of categories.slice(index, index + 5)) {
      const button = new ButtonBuilder()
        .setCustomId(`ticket:open:${category.id}`)
        .setLabel(category.label)
        .setStyle(ButtonStyle.Primary);

      if (category.emoji) {
        try {
          button.setEmoji(category.emoji);
        } catch {
          // A malformed custom emoji should not stop the panel from working.
        }
      }

      row.addComponents(button);
    }
    components.push(row);
  }

  return { embeds: [embed], components };
}

export async function postTicketPanel(
  client: NervanaClient,
  guild: Guild,
  actorId: string,
): Promise<Message> {
  const config = client.settings.tickets;
  if (!config.enabled) throw new UserFacingError('Enable tickets with `/setup tickets` first.');
  if (!config.categoryId || !config.staffRoleId || !config.panelChannelId) {
    throw new UserFacingError(
      'Set a ticket category, staff role, and panel channel with `/setup tickets` first.',
    );
  }

  const channel = await guild.channels.fetch(config.panelChannelId).catch(() => null);
  if (!channel?.isSendable()) {
    throw new UserFacingError('The configured panel channel is missing or not sendable.');
  }

  if (config.panelMessageId) {
    const old = await channel.messages.fetch(config.panelMessageId).catch(() => null);
    if (old) await old.delete().catch(() => {});
  }

  const panel = buildTicketPanel(config);
  const message = await channel.send({
    embeds: panel.embeds,
    components: panel.components,
  });

  await updateModule(client, actorId, 'tickets', {
    ...config,
    panelMessageId: message.id,
  });

  return message;
}
