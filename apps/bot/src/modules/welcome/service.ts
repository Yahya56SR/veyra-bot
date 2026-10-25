import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { NervanaClient } from '../../core/client.js';

function render(
  template: string,
  member: GuildMember | PartialGuildMember,
  serverName: string,
): string {
  return template
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user?.username ?? 'Unknown')
    .replaceAll('{server}', serverName)
    .replaceAll('{memberCount}', String(member.guild.memberCount));
}

async function deliver(
  client: NervanaClient,
  channelId: string | null,
  content: string,
  userId: string,
): Promise<void> {
  if (!channelId) return;

  const guild = client.guilds.cache.get(client.env.GUILD_ID);
  const channel = guild?.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  await channel.send({ content, allowedMentions: { users: [userId] } }).catch((error: unknown) => {
    client.logger.warn({ err: error, channelId }, 'failed to send welcome message');
  });
}

export async function onMemberJoin(client: NervanaClient, member: GuildMember): Promise<void> {
  const config = client.settings.welcome;

  for (const roleId of config.autoRoleIds) {
    if (member.roles.cache.has(roleId)) continue;
    await member.roles
      .add(roleId, 'Automatic join role')
      .catch((error: unknown) =>
        client.logger.warn({ err: error, roleId, userId: member.id }, 'failed to add auto role'),
      );
  }

  if (!config.joinEnabled || !config.joinChannelId) return;

  await deliver(
    client,
    config.joinChannelId,
    render(config.joinMessage, member, member.guild.name),
    member.id,
  );
}

export async function onMemberLeave(
  client: NervanaClient,
  member: GuildMember | PartialGuildMember,
): Promise<void> {
  const config = client.settings.welcome;
  if (!config.leaveEnabled || !config.leaveChannelId) return;

  await deliver(
    client,
    config.leaveChannelId,
    render(config.leaveMessage, member, member.guild.name),
    member.id,
  );
}
