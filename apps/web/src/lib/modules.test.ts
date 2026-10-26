import { describe, expect, it } from 'vitest';
import { isModuleKey, MODULE_KEYS, moduleEnabled } from './modules.js';

describe('dashboard module helpers', () => {
  it('recognizes every configuration module', () => {
    for (const key of MODULE_KEYS) expect(isModuleKey(key)).toBe(true);
    expect(new Set(MODULE_KEYS).size).toBe(MODULE_KEYS.length);
  });

  it('rejects unknown modules', () => {
    expect(isModuleKey('__proto__')).toBe(false);
    expect(isModuleKey('constructor')).toBe(false);
  });

  it('reports the enabled flag when one exists', () => {
    expect(moduleEnabled({ enabled: true })).toBe(true);
    expect(moduleEnabled({ enabled: false })).toBe(false);
    expect(moduleEnabled({ enabled: 'yes' })).toBe(true);
  });

  it('returns null when a module has no enabled flag', () => {
    expect(moduleEnabled({})).toBeNull();
    expect(moduleEnabled(null)).toBeNull();
    expect(moduleEnabled('enabled')).toBeNull();
    expect(moduleEnabled([])).toBeNull();
  });
});
