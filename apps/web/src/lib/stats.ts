import { formatDateKey } from './format';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailySource {
  date: string;
  messages: number;
  joins: number;
  leaves: number;
  commands: number;
  voiceSeconds: number;
  musicPlays: number;
}

export interface DailyStat extends DailySource {
  label: string;
}

export interface DailyTotals {
  messages: number;
  joins: number;
  leaves: number;
  commands: number;
  voiceSeconds: number;
  musicPlays: number;
}

export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function cutoffDateKey(days: number, now: Date = new Date()): string {
  return utcDateKey(new Date(now.getTime() - Math.max(0, days - 1) * DAY_MS));
}

/**
 * Recharts needs one point per day even when nothing happened. This fills the
 * gaps with zeroes and keeps every label in UTC so server and client agree.
 */
export function fillDaily(
  rows: readonly DailySource[],
  days: number,
  now: Date = new Date(),
): DailyStat[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const count = Math.max(1, Math.floor(days));
  const result: DailyStat[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(end - offset * DAY_MS);
    const key = utcDateKey(date);
    const row = byDate.get(key);

    result.push({
      date: key,
      label: formatDateKey(key),
      messages: row?.messages ?? 0,
      joins: row?.joins ?? 0,
      leaves: row?.leaves ?? 0,
      commands: row?.commands ?? 0,
      voiceSeconds: row?.voiceSeconds ?? 0,
      musicPlays: row?.musicPlays ?? 0,
    });
  }

  return result;
}

export function sumDaily(rows: readonly DailySource[]): DailyTotals {
  return rows.reduce<DailyTotals>(
    (total, row) => ({
      messages: total.messages + row.messages,
      joins: total.joins + row.joins,
      leaves: total.leaves + row.leaves,
      commands: total.commands + row.commands,
      voiceSeconds: total.voiceSeconds + row.voiceSeconds,
      musicPlays: total.musicPlays + row.musicPlays,
    }),
    { messages: 0, joins: 0, leaves: 0, commands: 0, voiceSeconds: 0, musicPlays: 0 },
  );
}

export function busiestDay(rows: readonly DailyStat[]): DailyStat | null {
  let best: DailyStat | null = null;
  for (const row of rows) {
    if (row.messages <= 0) continue;
    if (!best || row.messages > best.messages) best = row;
  }
  return best;
}
