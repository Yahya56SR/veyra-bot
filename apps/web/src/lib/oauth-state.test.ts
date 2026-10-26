import { describe, expect, it } from 'vitest';
import { createOAuthState, verifyOAuthState } from './oauth-state.js';

const SECRET = 'a-test-secret-that-is-long-enough-for-hmac';

describe('dashboard OAuth state', () => {
  it('signs a nonce and verifies the matching cookie nonce', () => {
    const { state, nonce } = createOAuthState(SECRET, 'fixed-nonce');
    expect(state.startsWith('v1.fixed-nonce.')).toBe(true);
    expect(verifyOAuthState(state, nonce, SECRET)).toBe(true);
  });

  it('rejects a different cookie nonce', () => {
    const { state } = createOAuthState(SECRET, 'fixed-nonce');
    expect(verifyOAuthState(state, 'another-nonce', SECRET)).toBe(false);
  });

  it('rejects a tampered nonce', () => {
    const { state } = createOAuthState(SECRET, 'fixed-nonce');
    const tampered = state.replace('fixed-nonce', 'other-nonce');
    expect(verifyOAuthState(tampered, 'other-nonce', SECRET)).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const { state, nonce } = createOAuthState(SECRET, 'fixed-nonce');
    const [version, stateNonce, signature] = state.split('.');
    const flipped = signature?.startsWith('A')
      ? `B${signature.slice(1)}`
      : `A${signature?.slice(1)}`;
    expect(verifyOAuthState(`${version}.${stateNonce}.${flipped}`, nonce, SECRET)).toBe(false);
  });

  it('rejects the right state under a different secret', () => {
    const { state, nonce } = createOAuthState(SECRET, 'fixed-nonce');
    expect(verifyOAuthState(state, nonce, 'different-secret')).toBe(false);
  });

  it('rejects malformed state values', () => {
    expect(verifyOAuthState('', 'nonce', SECRET)).toBe(false);
    expect(verifyOAuthState('v1.nonce', 'nonce', SECRET)).toBe(false);
    expect(verifyOAuthState('v2.nonce.signature', 'nonce', SECRET)).toBe(false);
  });

  it('generates a fresh nonce when none is supplied', () => {
    const first = createOAuthState(SECRET);
    const second = createOAuthState(SECRET);
    expect(first.nonce).not.toBe(second.nonce);
    expect(verifyOAuthState(first.state, first.nonce, SECRET)).toBe(true);
  });
});
