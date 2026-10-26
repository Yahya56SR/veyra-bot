import { requiredEnv } from './env';

const API = 'https://discord.com/api/v10';

export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  discriminator: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Discord API returned ${response.status}: ${body.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: requiredEnv('DISCORD_CLIENT_ID'),
    client_secret: requiredEnv('DISCORD_CLIENT_SECRET'),
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  const payload = await readJson<TokenResponse>(response);
  if (!payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? 'Missing access token');
  }
  return payload.access_token;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  return readJson<DiscordUser>(response);
}

export async function fetchDiscordGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const response = await fetch(`${API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  return readJson<DiscordGuild[]>(response);
}

export function discordGuildIconUrl(guildId: string, icon: string | null): string | null {
  if (!icon) return null;
  const extension = icon.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${extension}?size=128`;
}

export function discordAvatarUrl(userId: string, avatar: string | null): string {
  if (avatar) {
    const extension = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${extension}?size=128`;
  }

  let index = 0;
  try {
    index = Number((BigInt(userId) >> 22n) % 6n);
  } catch {
    index = 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}
