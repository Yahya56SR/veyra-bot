import './load-env';

/** Environment helpers shared by route handlers and server components. */

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function sessionSecret(): string {
  const value = requiredEnv('SESSION_SECRET');
  if (value.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters.');
  }
  return value;
}

function httpOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * The canonical public origin. On Vercel, DASHBOARD_URL should be the
 * production domain so the OAuth redirect is stable across deployments.
 */
export function dashboardBase(request?: Request): string {
  const configured = optionalEnv('DASHBOARD_URL');
  if (configured) {
    const origin = httpOrigin(configured);
    if (origin) return origin;
  }
  if (request) return new URL(request.url).origin;
  throw new Error('DASHBOARD_URL is not configured.');
}

export function isHttps(base: string): boolean {
  try {
    return new URL(base).protocol === 'https:';
  } catch {
    return false;
  }
}

export function adminIds(): Set<string> {
  const raw = optionalEnv('DASHBOARD_ADMIN_IDS') ?? '';
  return new Set(
    raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

/** Human-readable setup gaps shown on the login screen. */
export function dashboardSetupIssues(): string[] {
  const issues: string[] = [];
  if (!optionalEnv('DATABASE_URL')) issues.push('DATABASE_URL');
  if (!optionalEnv('DISCORD_CLIENT_ID')) issues.push('DISCORD_CLIENT_ID');
  if (!optionalEnv('DISCORD_CLIENT_SECRET')) issues.push('DISCORD_CLIENT_SECRET');
  const secret = optionalEnv('SESSION_SECRET');
  if (!secret) issues.push('SESSION_SECRET');
  else if (secret.length < 32) issues.push('SESSION_SECRET (32+ characters)');
  const dashboardUrl = optionalEnv('DASHBOARD_URL');
  if (!dashboardUrl) issues.push('DASHBOARD_URL');
  else if (!httpOrigin(dashboardUrl)) issues.push('DASHBOARD_URL (absolute http/https URL)');
  return issues;
}
