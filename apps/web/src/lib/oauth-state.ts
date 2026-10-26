import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const VERSION = 'v1';

export interface OAuthState {
  /** Value sent to Discord in the `state` query parameter. */
  state: string;
  /** Random value kept in an HttpOnly cookie for a double-submit check. */
  nonce: string;
}

function sign(nonce: string, secret: string): string {
  return createHmac('sha256', secret).update(`${VERSION}.${nonce}`).digest('base64url');
}

export function createOAuthState(
  secret: string,
  nonce: string = randomBytes(24).toString('base64url'),
): OAuthState {
  return { state: `${VERSION}.${nonce}.${sign(nonce, secret)}`, nonce };
}

/**
 * Verifies both the HMAC and the cookie nonce, in constant time. A mismatched
 * or replayed state is rejected.
 */
export function verifyOAuthState(state: string, nonce: string, secret: string): boolean {
  if (!state || !nonce) return false;

  const parts = state.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return false;

  const [, stateNonce, signature] = parts;
  if (!stateNonce || !signature || stateNonce !== nonce) return false;

  const expected = sign(stateNonce, secret);

  let provided: Buffer;
  let expectedBuffer: Buffer;
  try {
    provided = Buffer.from(signature, 'base64url');
    expectedBuffer = Buffer.from(expected, 'base64url');
  } catch {
    return false;
  }

  return provided.length === expectedBuffer.length && timingSafeEqual(provided, expectedBuffer);
}
