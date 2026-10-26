import type { MusicConfig } from '@nervana/shared';
import {
  ChannelType,
  PermissionFlagsBits,
  type GuildMember,
  type VoiceBasedChannel,
} from 'discord.js';
import type { Player } from 'lavalink-client';
import type { NervanaClient } from '../../core/client.js';
import { UserFacingError } from '../../core/errors.js';
import type { MusicService } from '../../modules/music/service.js';

export function musicService(client: NervanaClient): MusicService {
  if (!client.music) {
    throw new UserFacingError(
      'Music is not configured. Set `LAVALINK_URL` and `LAVALINK_AUTH` in the bot environment.',
    );
  }
  return client.music;
}

export function requireMusicPlayer(client: NervanaClient, guildId: string): Player {
  const player = musicService(client).getPlayer(guildId);
  if (!player) throw new UserFacingError('I am not playing anything. Use `/play` first.');
  return player;
}

/** Validates that the member is in a usable voice channel and the bot can join it. */
export function requireVoice(member: GuildMember): VoiceBasedChannel {
  const channel = member.voice.channel;
  if (!channel) throw new UserFacingError('Join a voice channel first.');
  if (channel.type === ChannelType.GuildStageVoice) {
    throw new UserFacingError('Music does not support stage channels. Use a voice channel.');
  }

  const me = member.guild.members.me;
  const permissions = me ? channel.permissionsFor(me) : null;
  if (
    !permissions?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.Connect,
      PermissionFlagsBits.Speak,
    ])
  ) {
    throw new UserFacingError('I need View Channel, Connect, and Speak in that voice channel.');
  }

  return channel;
}

export function assertSameVoice(member: GuildMember, player: Player): void {
  if (!player.voiceChannelId) {
    throw new UserFacingError('I am not connected to a voice channel.');
  }
  if (member.voice.channelId !== player.voiceChannelId) {
    throw new UserFacingError(`Join <#${player.voiceChannelId}> to control the player.`);
  }
}

/**
 * The DJ role is only enforced when other people are listening. A member alone
 * with the bot can always start or control music.
 */
export function assertDj(member: GuildMember, config: MusicConfig): void {
  if (!config.djRoleId) return;
  if (member.roles.cache.has(config.djRoleId)) return;
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return;

  const humans = member.voice.channel?.members.filter((candidate) => !candidate.user.bot).size ?? 0;
  if (humans <= 1) return;

  throw new UserFacingError(
    `Only members with <@&${config.djRoleId}> can control music while other people are listening.`,
  );
}

export function assertControl(member: GuildMember, player: Player, config: MusicConfig): void {
  assertSameVoice(member, player);
  assertDj(member, config);
}
