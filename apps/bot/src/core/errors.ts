import { randomUUID } from 'node:crypto';

/** An error whose message is safe to show to the user. */
export class UserFacingError extends Error {
  readonly errorId?: string;

  constructor(message: string, options: { errorId?: string } = {}) {
    super(message);
    this.name = 'UserFacingError';
    this.errorId = options.errorId;
  }
}

export function newErrorId(): string {
  return randomUUID().slice(0, 8);
}
