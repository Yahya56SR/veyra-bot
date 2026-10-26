import { starboardPosts } from '@nervana/db';
import { eq } from 'drizzle-orm';
import {
  EmbedBuilder,
  type Message,
  type MessageReaction,
  type PartialMessageReaction,
  type User,
  type PartialUser,
} from 'discord.js';
import type { NervanaClient } from '../../core/client.js';
import { requireDb } from '../../core/database.js';

const STAR = '\u2b50';

function starEmbed(message: Message, count: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setAuthor({
      name: message.author.tag,
      iconURL: message.author.displayAvatarURL({ size: 64 }),
    })
    .setTimestamp(message.createdAt)
    .setFooter({ text: `${count} ${STAR}` });

  const content = message.content.trim();
  if (content) embed.setDescription(content.slice(0, 2000));
  else embed.setDescription('*No text content*');

  const image = message.attachments.find((attachment) =>
    attachment.contentType?.startsWith('image/'),
  );
  if (image) embed.setImage(image.url);

  embed.addFields({
    name: 'Source',
    value: `[Jump to message](${message.url})`,
    inline: false,
  });

  return embed;
}

async function resolveReaction(
  reaction: MessageReaction | PartialMessageReaction,
): Promise<{ reaction: MessageReaction; message: Message } | null> {
  const resolvedReaction = reaction.partial ? await reaction.fetch().catch(() => null) : reaction;
  if (!resolvedReaction) return null;
  const message = resolvedReaction.message.partial
    ? await resolvedReaction.message.fetch().catch(() => null)
    : resolvedReaction.message;
  if (!message) return null;
  return { reaction: resolvedReaction, message };
}

export async function handleStarboard(
  client: NervanaClient,
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  if (user.bot) return;

  const config = client.settings.community.starboard;
  if (!config.enabled || !config.channelId) return;
  if (!reaction.message.inGuild()) return;
  if (reaction.message.guildId !== client.env.GUILD_ID) return;
  if (reaction.message.channelId === config.channelId) return;
  if (config.ignoreChannelIds.includes(reaction.message.channelId)) return;
  if (reaction.emoji.name !== STAR && reaction.emoji.toString() !== STAR) return;

  const resolved = await resolveReaction(reaction);
  if (!resolved) return;
  const { message } = resolved;
  if (message.author.bot || message.system) return;

  const db = requireDb(client);
  const count = resolved.reaction.count;
  const existing = await db
    .select()
    .from(starboardPosts)
    .where(eq(starboardPosts.originalMessageId, message.id))
    .limit(1);

  const boardChannel = await client.channels.fetch(config.channelId).catch(() => null);
  if (!boardChannel?.isTextBased() || !boardChannel.isSendable()) return;

  if (count >= config.threshold) {
    const embed = starEmbed(message, count);

    if (existing[0]) {
      const boardMessage = await boardChannel.messages
        .fetch(existing[0].starboardMessageId)
        .catch(() => null);
      if (boardMessage) {
        await boardMessage
          .edit({ embeds: [embed], allowedMentions: { parse: [] } })
          .catch((error: unknown) => {
            client.logger.warn(
              { err: error, messageId: message.id },
              'starboard message edit failed',
            );
          });
        await db
          .update(starboardPosts)
          .set({ count, updatedAt: new Date() })
          .where(eq(starboardPosts.originalMessageId, message.id));
      }
      return;
    }

    const sent = await boardChannel
      .send({
        content: `<#${message.channelId}>`,
        embeds: [embed],
        allowedMentions: { parse: [] },
      })
      .catch((error: unknown) => {
        client.logger.warn({ err: error, messageId: message.id }, 'starboard send failed');
        return null;
      });

    if (!sent) return;

    const inserted = await db
      .insert(starboardPosts)
      .values({
        originalMessageId: message.id,
        starboardMessageId: sent.id,
        count,
      })
      .onConflictDoNothing()
      .returning({ originalMessageId: starboardPosts.originalMessageId });

    if (inserted.length === 0) await sent.delete().catch(() => {});
    return;
  }

  if (existing[0]) {
    const boardMessage = await boardChannel.messages
      .fetch(existing[0].starboardMessageId)
      .catch(() => null);
    if (boardMessage) await boardMessage.delete().catch(() => {});
    await db.delete(starboardPosts).where(eq(starboardPosts.originalMessageId, message.id));
  }
}
