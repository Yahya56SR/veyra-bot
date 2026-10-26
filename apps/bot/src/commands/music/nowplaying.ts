import { BRAND, formatDuration } from '@veyra/shared';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferPublic } from '../../core/respond.js';
import { progressBar } from '../../modules/music/helpers.js';
import { describeTrack, requesterId } from '../../modules/music/service.js';
import { requireMusicPlayer } from './shared.js';

const PAGE_SIZE = 10;

export const nowPlayingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the track that is currently playing.'),
  category: 'music',
  cooldownSeconds: 2,
  async execute({ client, interaction }) {
    await deferPublic(interaction);

    const player = requireMusicPlayer(client, interaction.guildId);
    const track = player.queue.current;
    if (!track) throw new UserFacingError('Nothing is playing right now.');

    const position = Math.max(0, player.position);
    const timing = track.info.isStream
      ? '🔴 LIVE'
      : `${progressBar(position, track.info.duration)} \`${formatDuration(
          position,
        )} / ${formatDuration(track.info.duration)}\``;

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('Now playing')
      .setDescription(`${describeTrack(track)}\n${timing}`)
      .addFields(
        { name: 'Volume', value: `**${player.volume}%**`, inline: true },
        { name: 'Loop', value: `**${player.repeatMode}**`, inline: true },
        { name: 'Up next', value: `**${player.queue.tracks.length}**`, inline: true },
      )
      .setFooter({ text: BRAND.footer });

    const requester = requesterId(track);
    if (requester) {
      embed.addFields({ name: 'Requested by', value: `<@${requester}>`, inline: true });
    }

    if (track.info.artworkUrl?.startsWith('https://')) {
      embed.setThumbnail(track.info.artworkUrl);
    }

    await interaction.editReply({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  },
};

export const queueCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current track and the upcoming queue.')
    .addIntegerOption((option) =>
      option
        .setName('page')
        .setDescription('Queue page (10 tracks per page)')
        .setMinValue(1)
        .setMaxValue(50),
    ),
  category: 'music',
  cooldownSeconds: 2,
  async execute({ client, interaction }) {
    await deferPublic(interaction);

    const player = requireMusicPlayer(client, interaction.guildId);
    const current = player.queue.current;
    const upcoming = player.queue.tracks;

    if (!current && upcoming.length === 0) {
      throw new UserFacingError('The queue is empty. Use `/play` to add something.');
    }

    const totalPages = Math.max(1, Math.ceil(upcoming.length / PAGE_SIZE));
    const page = interaction.options.getInteger('page') ?? 1;
    if (page > totalPages) {
      throw new UserFacingError(
        `There ${totalPages === 1 ? 'is' : 'are'} only **${totalPages}** page${
          totalPages === 1 ? '' : 's'
        } in the queue.`,
      );
    }

    const start = (page - 1) * PAGE_SIZE;
    const tracks = upcoming.slice(start, start + PAGE_SIZE);
    const lines: string[] = [];

    if (current) {
      lines.push(`**Now:** ${describeTrack(current)}`);
    }

    if (tracks.length > 0) {
      lines.push(
        ...tracks.map((track, index) => `**${start + index + 1}.** ${describeTrack(track)}`),
      );
    } else {
      lines.push('*No upcoming tracks.*');
    }

    const totalDuration = (current?.info.duration ?? 0) + player.queue.utils.totalDuration();

    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('Music queue')
      .setDescription(lines.join('\n'))
      .setFooter({
        text: `Page ${page}/${totalPages} · ${upcoming.length} upcoming · ${formatDuration(
          totalDuration,
        )}`,
      });

    await interaction.editReply({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  },
};
