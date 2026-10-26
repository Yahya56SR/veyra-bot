import { formatDuration } from '@veyra/shared';
import { SlashCommandBuilder } from 'discord.js';
import type { Command, CommandContext } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';
import { parseSeek } from '../../modules/music/helpers.js';
import { describeTrack } from '../../modules/music/service.js';
import { assertControl, requireMusicPlayer } from './shared.js';

function controlled({ client, interaction, member, settings }: CommandContext) {
  const player = requireMusicPlayer(client, interaction.guildId);
  assertControl(member, player, settings.music);
  return player;
}

export const pauseCommand: Command = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause the current track.'),
  category: 'music',
  cooldownSeconds: 1,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);

    if (player.paused) throw new UserFacingError('The player is already paused.');
    if (!player.queue.current) throw new UserFacingError('Nothing is playing right now.');

    await player.pause();
    await context.interaction.editReply({ content: 'Paused.' });
  },
};

export const resumeCommand: Command = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume the paused track.'),
  category: 'music',
  cooldownSeconds: 1,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);

    if (!player.paused) throw new UserFacingError('The player is not paused.');

    await player.resume();
    await context.interaction.editReply({ content: 'Resumed.' });
  },
};

export const skipCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track.')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('How many tracks to skip (default 1)')
        .setMinValue(1)
        .setMaxValue(25),
    ),
  category: 'music',
  cooldownSeconds: 1,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);

    if (!player.queue.current) throw new UserFacingError('Nothing is playing right now.');

    const amount = context.interaction.options.getInteger('amount') ?? 1;
    const upcoming = player.queue.tracks.length;

    if (amount > upcoming + 1) {
      await player.stopPlaying(true, false);
      await context.interaction.editReply({
        content: 'Skipped to the end of the queue.',
      });
      return;
    }

    if (amount > upcoming) {
      await player.stopPlaying(true, false);
      await context.interaction.editReply({
        content: 'Skipped the last track. The queue is now empty.',
      });
      return;
    }

    await player.skip(amount);
    await context.interaction.editReply({
      content: `Skipped **${amount}** track${amount === 1 ? '' : 's'}.`,
    });
  },
};

export const stopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback, clear the queue, and disconnect.'),
  category: 'music',
  cooldownSeconds: 2,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);

    await player.destroy('Stopped by a member', true);
    await context.interaction.editReply({
      content: 'Stopped playback and cleared the queue.',
    });
  },
};

export const disconnectCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the music player from voice.'),
  category: 'music',
  cooldownSeconds: 2,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);

    await player.destroy('Disconnected by a member', true);
    await context.interaction.editReply({ content: 'Disconnected.' });
  },
};

export const volumeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the player volume.')
    .addIntegerOption((option) =>
      option
        .setName('percent')
        .setDescription('Volume from 1 to 100')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    ),
  category: 'music',
  cooldownSeconds: 1,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);
    const percent = context.interaction.options.getInteger('percent', true);

    await player.setVolume(percent);
    await context.interaction.editReply({ content: `Volume set to **${percent}%**.` });
  },
};

export const loopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the repeat mode.')
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('What to repeat')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' },
        ),
    ),
  category: 'music',
  cooldownSeconds: 1,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);
    const mode = context.interaction.options.getString('mode', true) as 'off' | 'track' | 'queue';

    await player.setRepeatMode(mode);
    await context.interaction.editReply({ content: `Loop mode set to **${mode}**.` });
  },
};

export const shuffleCommand: Command = {
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the upcoming queue.'),
  category: 'music',
  cooldownSeconds: 2,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);

    if (player.queue.tracks.length < 2) {
      throw new UserFacingError('There are not enough upcoming tracks to shuffle.');
    }

    const count = await player.queue.shuffle();
    await context.interaction.editReply({
      content: `Shuffled **${count}** track${count === 1 ? '' : 's'}.`,
    });
  },
};

export const removeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove one upcoming track from the queue.')
    .addIntegerOption((option) =>
      option
        .setName('position')
        .setDescription('Queue position from /queue')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(500),
    ),
  category: 'music',
  cooldownSeconds: 1,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);
    const position = context.interaction.options.getInteger('position', true);

    if (position > player.queue.tracks.length) {
      throw new UserFacingError(
        `There are only **${player.queue.tracks.length}** upcoming track${
          player.queue.tracks.length === 1 ? '' : 's'
        }.`,
      );
    }

    const removed = await player.queue.remove(position - 1);
    const track = removed?.removed[0];
    if (!track) throw new UserFacingError('That track could not be removed.');

    await context.interaction.editReply({
      content: `Removed **#${position}** — ${describeTrack(track)}`,
      allowedMentions: { parse: [] },
    });
  },
};

export const clearCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear the upcoming queue without stopping the current track.'),
  category: 'music',
  cooldownSeconds: 2,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);
    const count = player.queue.tracks.length;

    if (count === 0) throw new UserFacingError('There are no upcoming tracks to clear.');

    await player.queue.splice(0, count);
    await context.interaction.editReply({
      content: `Cleared **${count}** upcoming track${count === 1 ? '' : 's'}.`,
    });
  },
};

export const seekCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek within the current track.')
    .addStringOption((option) =>
      option
        .setName('time')
        .setDescription('Position: 1:30, 1:02:03, 90s, or 2m')
        .setRequired(true)
        .setMaxLength(32),
    ),
  category: 'music',
  cooldownSeconds: 1,
  async execute(context) {
    await deferEphemeral(context.interaction);
    const player = controlled(context);
    const track = player.queue.current;

    if (!track) throw new UserFacingError('Nothing is playing right now.');
    if (track.info.isStream || !track.info.isSeekable) {
      throw new UserFacingError('This track cannot be seeked.');
    }

    const position = parseSeek(context.interaction.options.getString('time', true));
    if (position === null) {
      throw new UserFacingError('Use a position like `1:30`, `1:02:03`, or `90s`.');
    }

    if (position >= track.info.duration) {
      throw new UserFacingError(
        `Seek within the track length (${formatDuration(track.info.duration)}).`,
      );
    }

    await player.seek(position);
    await context.interaction.editReply({
      content: `Seeked to **${formatDuration(position)}**.`,
    });
  },
};
