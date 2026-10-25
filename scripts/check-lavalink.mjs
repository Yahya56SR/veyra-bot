#!/usr/bin/env node
/**
 * Validates a Lavalink v4 node before you commit it to the bot's env.
 *
 * Usage:
 *   node scripts/check-lavalink.mjs <host:port | https://host> <password>
 *
 * Prints the node version, advertised source managers, plugins, and latency.
 */

const [urlArg, auth] = process.argv.slice(2);

if (!urlArg || !auth) {
  console.error('Usage: node scripts/check-lavalink.mjs <host:port | https://host> <password>');
  process.exit(1);
}

const secure = urlArg.startsWith('https://') || process.env.LAVALINK_SECURE === 'true';
const host = urlArg.replace(/^https?:\/\//, '').replace(/\/+$/, '');
const endpoint = `${secure ? 'https' : 'http'}://${host}/v4/info`;

console.log(`checking ${endpoint} ...`);

const started = Date.now();

try {
  const response = await fetch(endpoint, {
    headers: { Authorization: auth },
    signal: AbortSignal.timeout(8_000),
  });

  const latency = Date.now() - started;

  if (!response.ok) {
    console.error(`FAIL: HTTP ${response.status} ${response.statusText}`);
    if (response.status === 401 || response.status === 403) {
      console.error('The password was rejected. Use the node password exactly as provided.');
    }
    process.exit(1);
  }

  const info = await response.json();
  const sources = Array.isArray(info.sourceManagers) ? info.sourceManagers : [];
  const plugins = Array.isArray(info.plugins) ? info.plugins.map((plugin) => plugin.name) : [];

  console.log(`OK: Lavalink ${info.version ?? 'unknown'} (${latency} ms)`);
  console.log(`sources: ${sources.length > 0 ? sources.join(', ') : '(none advertised)'}`);
  console.log(`plugins: ${plugins.length > 0 ? plugins.join(', ') : '(none)'}`);

  const preferred = ['soundcloud', 'spotify', 'youtube'].find((source) =>
    sources.includes(source),
  );

  if (preferred) {
    console.log(`recommended search prefix: ${preferred}`);
  } else {
    console.warn('warning: none of soundcloud, spotify, or youtube are available on this node');
  }

  if (secure) {
    console.log('set LAVALINK_SECURE=true');
  }
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
