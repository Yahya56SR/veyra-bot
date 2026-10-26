import { optionalEnv } from './env';

const BOT_PERMISSIONS = '564324715326550';

/** Public bot invite. The dashboard never handles the bot token. */
export function botInviteUrl(): string | null {
  const clientId = optionalEnv('DISCORD_CLIENT_ID');
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'bot applications.commands',
    permissions: BOT_PERMISSIONS,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function supportServerUrl(): string | null {
  return optionalEnv('SUPPORT_SERVER_URL');
}
