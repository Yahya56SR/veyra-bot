import type { GuildMember, PartialGuildMember } from 'discord.js';
import type { VeyraClient } from '../../core/client.js';

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
  client: VeyraClient,
  guildId: string,
  channelId: string | null,
  content: string,
  userId: string,
): Promise<void> {
  if (!channelId) return;

  const guild = client.guilds.cache.get(guildId);
  const channel = guild?.channels.cache.get(channelId);
  if (!channel?.isTextBased()) return;

  await channel.send({ content, allowedMentions: { users: [userId] } }).catch((error: unknown) => {
    client.logger.warn({ err: error, guildId, channelId }, 'failed to send welcome message');
  });
}

export async function onMemberJoin(client: VeyraClient, member: GuildMember): Promise<void> {
  const config = await client.getConfig(member.guild.id);

  for (const roleId of config.welcome.autoRoleIds) {
    if (member.roles.cache.has(roleId)) continue;
    await member.roles
      .add(roleId, 'Automatic join role')
      .catch((error: unknown) =>
        client.logger.warn({ err: error, roleId, userId: member.id }, 'failed to add auto role'),
      );
  }

  if (!config.welcome.joinEnabled || !config.welcome.joinChannelId) return;

  await deliver(
    client,
    member.guild.id,
    config.welcome.joinChannelId,
    render(config.welcome.joinMessage, member, member.guild.name),
    member.id,
  );
}

export async function onMemberLeave(
  client: VeyraClient,
  member: GuildMember | PartialGuildMember,
): Promise<void> {
  const config = await client.getConfig(member.guild.id);
  if (!config.welcome.leaveEnabled || !config.welcome.leaveChannelId) return;

  await deliver(
    client,
    member.guild.id,
    config.welcome.leaveChannelId,
    render(config.welcome.leaveMessage, member, member.guild.name),
    member.id,
  );
}
