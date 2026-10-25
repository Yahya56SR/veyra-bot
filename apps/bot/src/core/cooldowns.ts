const cooldowns = new Map<string, number>();

/**
 * Returns 0 when the user may run the command, otherwise the remaining
 * cooldown in milliseconds. A successful claim records the new deadline.
 */
export function takeCooldown(userId: string, commandName: string, seconds: number): number {
  if (seconds <= 0) return 0;

  const key = `${userId}:${commandName}`;
  const now = Date.now();
  const until = cooldowns.get(key) ?? 0;

  if (until > now) return until - now;

  cooldowns.set(key, now + seconds * 1000);

  // Keep the map from growing without bound on a long-lived process.
  if (cooldowns.size > 10_000) {
    for (const [entryKey, entryUntil] of cooldowns) {
      if (entryUntil <= now) cooldowns.delete(entryKey);
    }
  }

  return 0;
}

/** Test hook. */
export function clearCooldowns(): void {
  cooldowns.clear();
}
