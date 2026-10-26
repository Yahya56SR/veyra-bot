import { BRAND, truncate } from '@nervana/shared';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { deferPublic } from '../../core/respond.js';
import { describeTrack, type PlayResult } from '../../modules/music/service.js';
import { assertDj, musicService, requireVoice } from './shared.js';

export const playCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a track or playlist from a URL or search.')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Track name, SoundCloud/Spotify/YouTube URL, or playlist link')
        .setRequired(true)
        .setMaxLength(500),
    ),
  category: 'music',
  cooldownSeconds: 2,
  async execute({ client, interaction, member, settings }) {
    await deferPublic(interaction);

    const voice = requireVoice(member);
    assertDj(member, settings.music);

    const result = await musicService(client).play({
      guildId: interaction.guildId,
      voiceChannelId: voice.id,
      textChannelId: interaction.channelId,
      query: interaction.options.getString('query', true),
      requester: interaction.user,
      maxQueue: settings.music.maxQueue,
    });

    await interaction.editReply({
      embeds: [buildPlayEmbed(result)],
      allowedMentions: { parse: [] },
    });
  },
};

function buildPlayEmbed(result: PlayResult): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(BRAND.color).setFooter({ text: BRAND.footer });

  if (result.playlist) {
    embed
      .setTitle('Playlist queued')
      .setDescription(
        `Added **${result.tracks.length}** track${result.tracks.length === 1 ? '' : 's'} from **${truncate(
          result.playlist,
          150,
        )}**.`,
      );
  } else {
    const track = result.tracks[0];
    embed
      .setTitle('Added to queue')
      .setDescription(track ? describeTrack(track) : 'Added the track to the queue.');
  }

  embed.addFields({
    name: 'Queue',
    value: `**${result.queueSize}** track${result.queueSize === 1 ? '' : 's'}`,
    inline: true,
  });

  if (result.truncated) {
    embed.addFields({
      name: 'Queue limit',
      value: 'Only the first tracks that fit under the configured queue limit were added.',
    });
  }

  return embed;
}
