import type { AppConfig, CommandCategory } from '@nervana/shared';
import type {
  ChatInputCommandInteraction,
  Guild,
  GuildMember,
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { NervanaClient } from './client.js';

export type CommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface CommandContext {
  client: NervanaClient;
  interaction: ChatInputCommandInteraction<'cached'>;
  guild: Guild;
  member: GuildMember;
  settings: AppConfig;
}

export interface Command {
  data: CommandData;
  category: CommandCategory;
  /** Checked at runtime in addition to the builder's default permissions. */
  userPermissions?: PermissionResolvable[];
  /** Preflight for the bot's own permissions in the channel. */
  botPermissions?: PermissionResolvable[];
  cooldownSeconds?: number;
  execute: (context: CommandContext) => Promise<void>;
}

/**
 * Commands are registered from a static array rather than a filesystem scan.
 * A dynamic loader would break esbuild's ability to produce a single bundle.
 */
export function registerCommands(client: NervanaClient, commands: readonly Command[]): void {
  for (const command of commands) {
    const name = command.data.name;
    if (client.commands.has(name)) {
      throw new Error(`Duplicate command registration: ${name}`);
    }
    client.commands.set(name, command);
  }
}

export function commandPayload(commands: readonly Command[]): unknown[] {
  return commands.map((command) => command.data.toJSON());
}
