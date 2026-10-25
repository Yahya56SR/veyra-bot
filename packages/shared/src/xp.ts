/**
 * XP required to advance from `level` to `level + 1`.
 * Quadratic curve: 5n² + 50n + 100.
 */
export function xpToNextLevel(level: number): number {
  const n = Math.max(0, Math.floor(level));
  return 5 * n * n + 50 * n + 100;
}

/** Total lifetime XP required to be at `level`. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpToNextLevel(i);
  return total;
}

export interface LevelProgress {
  level: number;
  /** XP earned inside the current level. */
  current: number;
  /** XP needed to finish the current level. */
  needed: number;
}

/** Resolves lifetime XP into a level and in-level progress. */
export function levelFromXp(xp: number): LevelProgress {
  let remaining = Math.max(0, Math.floor(xp));
  let level = 0;

  // Guard against absurd values sneaking in from a corrupt row.
  while (level < 10_000 && remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level++;
  }

  return { level, current: remaining, needed: xpToNextLevel(level) };
}

/** Text progress bar used on rank cards. */
export function progressBar(current: number, needed: number, size = 12): string {
  const width = Math.max(1, Math.floor(size));
  const ratio = needed <= 0 ? 1 : Math.min(1, Math.max(0, current / needed));
  const filled = Math.round(ratio * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}
