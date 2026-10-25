import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Phase 0 gate.
 *
 * Copies the committed bundle and migrations into a directory with no
 * node_modules, boots it with SMOKE_TEST=1, and asserts:
 *   - Discord login succeeds (SMOKE_TEST_READY is logged)
 *   - RSS stays under the configured ceiling
 *   - the process exits cleanly
 *
 * Requires a real .env (DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID).
 */
const RSS_LIMIT_MB = Number(process.env.RSS_LIMIT_MB ?? 120);
const TIMEOUT_MS = 90_000;

const root = process.cwd();
const bundle = resolve(root, 'index.js');
const envFile = resolve(root, '.env');
const temp = resolve(root, 'verify-bundle-tmp');

if (!existsSync(bundle)) {
  console.error('Missing index.js. Run `npm run bundle:bot` first.');
  process.exit(1);
}

if (!existsSync(envFile)) {
  console.error(
    [
      'Missing .env.',
      'Copy .env.example to .env and fill DISCORD_TOKEN, DISCORD_CLIENT_ID, and GUILD_ID.',
      'The bundle gate needs a live gateway connection to measure real memory.',
    ].join('\n'),
  );
  process.exit(1);
}

rmSync(temp, { recursive: true, force: true });
mkdirSync(temp, { recursive: true });

cpSync(bundle, resolve(temp, 'index.js'));
cpSync(envFile, resolve(temp, '.env'));

if (existsSync(resolve(root, 'drizzle'))) {
  cpSync(resolve(root, 'drizzle'), resolve(temp, 'drizzle'), { recursive: true });
}

if (existsSync(resolve(temp, 'node_modules'))) {
  console.error('Clean directory unexpectedly contains node_modules.');
  process.exit(1);
}

const bundleMb = statSync(resolve(temp, 'index.js')).size / 1024 / 1024;
console.log(`bundle: ${bundleMb.toFixed(2)} MB`);
console.log('booting from a clean directory with no node_modules...');

const child = spawn(process.execPath, ['index.js'], {
  cwd: temp,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    SMOKE_TEST: 'true',
    SKIP_MIGRATIONS: 'true',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
let stderr = '';
let settled = false;

const timer = setTimeout(() => {
  if (settled) return;
  settled = true;
  child.kill();
  console.error(`Timed out after ${TIMEOUT_MS / 1000}s.`);
  console.error(stderr || stdout);
  process.exit(1);
}, TIMEOUT_MS);

child.stdout.on('data', (chunk) => {
  stdout += chunk.toString();
});

child.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

child.on('exit', (code) => {
  if (settled) return;
  settled = true;
  clearTimeout(timer);

  const readyLine = stdout
    .split(/\r?\n/)
    .find((line) => line.includes('SMOKE_TEST_READY'));

  if (!readyLine) {
    console.error('Bundle did not reach SMOKE_TEST_READY.');
    console.error('--- stdout ---');
    console.error(stdout.trim() || '(empty)');
    console.error('--- stderr ---');
    console.error(stderr.trim() || '(empty)');
    process.exit(1);
  }

  let report;
  try {
    report = JSON.parse(readyLine);
  } catch {
    console.error('Could not parse the readiness line:', readyLine);
    process.exit(1);
  }

  const rssMb = Number(report.rssMb);
  console.log(
    `ready in ${report.readyMs} ms — rss ${rssMb} MB — guilds ${report.guilds} — commands ${report.commands}`,
  );

  if (code !== 0) {
    console.error(`Process exited with code ${code}.`);
    console.error(stderr.trim() || stdout.trim());
    process.exit(1);
  }

  if (!Number.isFinite(rssMb) || rssMb > RSS_LIMIT_MB) {
    console.error(`RSS ${rssMb} MB exceeds the ${RSS_LIMIT_MB} MB gate.`);
    process.exit(1);
  }

  rmSync(temp, { recursive: true, force: true });
  console.log(`PASS: clean-directory bundle stayed under ${RSS_LIMIT_MB} MB.`);
});
