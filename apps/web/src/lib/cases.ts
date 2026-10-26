export const CASE_TYPES = [
  'warn',
  'timeout',
  'timeout-clear',
  'kick',
  'ban',
  'unban',
  'softban',
  'slowmode',
  'purge',
  'warn-clear',
] as const;

export type CaseType = (typeof CASE_TYPES)[number];

const CASE_TYPE_SET = new Set<string>(CASE_TYPES);

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  warn: 'Warn',
  timeout: 'Timeout',
  'timeout-clear': 'Timeout cleared',
  kick: 'Kick',
  ban: 'Ban',
  unban: 'Unban',
  softban: 'Softban',
  slowmode: 'Slowmode',
  purge: 'Purge',
  'warn-clear': 'Warnings cleared',
};

const TONES: Record<CaseType, string> = {
  warn: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  timeout: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-200',
  'timeout-clear': 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  kick: 'border-orange-400/30 bg-orange-400/10 text-orange-200',
  ban: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  unban: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  softban: 'border-pink-400/30 bg-pink-400/10 text-pink-200',
  slowmode: 'border-indigo-400/30 bg-indigo-400/10 text-indigo-200',
  purge: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  'warn-clear': 'border-slate-400/30 bg-slate-400/10 text-slate-200',
};

export function isCaseType(value: string | undefined): value is CaseType {
  return Boolean(value && CASE_TYPE_SET.has(value));
}

export function caseTypeLabel(type: string): string {
  return isCaseType(type) ? CASE_TYPE_LABELS[type] : type;
}

export function caseTypeTone(type: string): string {
  return isCaseType(type) ? TONES[type] : 'border-slate-400/30 bg-slate-400/10 text-slate-200';
}

/** Slowmode and purge cases target a channel, not a member. */
export function caseTargetIsChannel(type: string): boolean {
  return type === 'slowmode' || type === 'purge';
}

export function ticketStatusTone(status: string): string {
  if (status === 'open') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  if (status === 'closed') return 'border-slate-400/30 bg-slate-400/10 text-slate-200';
  return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
}
