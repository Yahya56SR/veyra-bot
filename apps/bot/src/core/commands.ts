import type { AppConfig, CommandCategory, PremiumFeatureId } from '@veyra/shared';
import type {
  ChatInputCommandInteraction,
  Guild,
  GuildMember,
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type { VeyraClient } from './client.js';

export type CommandData =
  SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

export interface CommandContext {
  client: VeyraClient;
  interaction: ChatInputCommandInteraction<'cached'>;
  guild: Guild;
  member: GuildMember;
  settings: AppConfig;
  premium: boolean;
}

export interface Command {
  data: CommandData;
  category: CommandCategory;
  /** Checked at runtime in addition to the builder's default permissions. */
  userPermissions?: PermissionResolvable[];
  /** Preflight for the bot's own permissions in the channel. */
  botPermissions?: PermissionResolvable[];
  /** Allows closing/managing existing resources while the module is disabled. */
  allowWhenDisabled?: boolean;
  /** Requires an active Premium grant for the guild. */
  premiumOnly?: boolean;
  premiumFeature?: PremiumFeatureId;
  cooldownSeconds?: number;
  execute: (context: CommandContext) => Promise<void>;
}

/**
 * Commands are registered from a static array rather than a filesystem scan.
 * A dynamic loader would break esbuild's ability to produce a single bundle.
 */
export function registerCommands(client: VeyraClient, commands: readonly Command[]): void {
  for (const command of commands) {
    const name = command.data.name;
    if (client.commands.has(name)) {
      throw new Error(`Duplicate command registration: ${name}`);
    }
    client.commands.set(name, command);
  }
}

/**
 * Registers globally so command updates do not fan out to every guild. During
 * development, set `DEV_GUILD_ID` for instant propagation to one guild.
 */
export async function registerApplicationCommands(client: VeyraClient): Promise<void> {
  if (!client.env.REGISTER_COMMANDS || !client.application) return;

  const payload = [...client.commands.values()].map((command) => command.data.toJSON());
  if (client.env.DEV_GUILD_ID) {
    await client.application.commands.set(payload, client.env.DEV_GUILD_ID);
    client.logger.info(
      { count: payload.length, guildId: client.env.DEV_GUILD_ID },
      'registered development guild commands',
    );
    return;
  }

  await client.application.commands.set(payload);
  client.logger.info({ count: payload.length }, 'registered global commands');
}
