import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminIds, dashboardBase, isHttps, sessionSecret } from './env.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('dashboard environment helpers', () => {
  it('parses and trims the operator allowlist', () => {
    vi.stubEnv('DASHBOARD_ADMIN_IDS', ' 111, 222 ,,333 ');
    expect([...adminIds()]).toEqual(['111', '222', '333']);
  });

  it('normalizes a configured public origin', () => {
    vi.stubEnv('DASHBOARD_URL', 'https://nervana.example/');
    expect(dashboardBase()).toBe('https://nervana.example');
    expect(isHttps('HTTPS://NERVANA.EXAMPLE')).toBe(true);
    expect(isHttps('http://localhost:3000')).toBe(false);
    expect(isHttps('not a url')).toBe(false);
  });

  it('rejects a configured path and falls back to the request origin', () => {
    vi.stubEnv('DASHBOARD_URL', 'https://nervana.example/dashboard');
    const request = new Request('http://localhost:3000/login');
    expect(dashboardBase(request)).toBe('http://localhost:3000');
  });

  it('requires a sufficiently long session secret', () => {
    vi.stubEnv('SESSION_SECRET', 'short');
    expect(() => sessionSecret()).toThrow('at least 32 characters');
    vi.stubEnv('SESSION_SECRET', 'x'.repeat(32));
    expect(sessionSecret()).toBe('x'.repeat(32));
  });
});
