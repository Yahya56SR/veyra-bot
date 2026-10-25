import { PermissionFlagsBits, SlashCommandBuilder, type PollData } from 'discord.js';
import type { Command } from '../../core/commands.js';
import { UserFacingError } from '../../core/errors.js';
import { deferEphemeral } from '../../core/respond.js';

const MAX_OPTIONS = 10;
const MAX_ANSWER_LENGTH = 55;

export const pollCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a native Discord poll.')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('What should people vote on?')
        .setRequired(true)
        .setMaxLength(300),
    )
    .addStringOption((option) =>
      option
        .setName('options')
        .setDescription('2–10 answers, separated by | or new lines')
        .setRequired(true)
        .setMaxLength(900),
    )
    .addIntegerOption((option) =>
      option
        .setName('hours')
        .setDescription('How long the poll stays open (default 24)')
        .setMinValue(1)
        .setMaxValue(168),
    )
    .addBooleanOption((option) =>
      option.setName('multi').setDescription('Allow voting for more than one answer'),
    ),
  category: 'utility',
  cooldownSeconds: 10,
  botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.SendPolls],
  async execute({ interaction }) {
    await deferEphemeral(interaction);

    const channel = interaction.channel;
    if (!channel?.isTextBased()) {
      throw new UserFacingError('Polls can only be posted in a text channel.');
    }

    const question = interaction.options.getString('question', true).trim();
    const rawOptions = interaction.options.getString('options', true);
    const answers = rawOptions
      .split(/[|\n]+/)
      .map((answer) => answer.trim())
      .filter(Boolean);

    if (answers.length < 2) {
      throw new UserFacingError('Provide at least two answers separated by `|` or new lines.');
    }
    if (answers.length > MAX_OPTIONS) {
      throw new UserFacingError(`Polls can have at most ${MAX_OPTIONS} answers.`);
    }

    const tooLong = answers.find((answer) => answer.length > MAX_ANSWER_LENGTH);
    if (tooLong) {
      throw new UserFacingError(
        `Each answer must be at most ${MAX_ANSWER_LENGTH} characters. Too long: \`${tooLong.slice(
          0,
          60,
        )}\`.`,
      );
    }

    const poll: PollData = {
      question: { text: question },
      answers: answers.map((text) => ({ text })),
      duration: interaction.options.getInteger('hours') ?? 24,
      allowMultiselect: interaction.options.getBoolean('multi') ?? false,
    };

    const message = await channel.send({ poll });
    await interaction.editReply({ content: `Poll posted: ${message.url}` });
  },
};
