import type { ReactNode } from 'react';

const ACCENTS = {
  violet: {
    bar: 'bg-violet-400',
    glow: 'shadow-[0_0_24px_rgba(139,92,246,0.18)]',
    text: 'text-violet-200',
  },
  teal: {
    bar: 'bg-teal-400',
    glow: 'shadow-[0_0_24px_rgba(45,212,191,0.16)]',
    text: 'text-teal-200',
  },
  amber: {
    bar: 'bg-amber-400',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.14)]',
    text: 'text-amber-200',
  },
  rose: {
    bar: 'bg-rose-400',
    glow: 'shadow-[0_0_24px_rgba(251,113,133,0.14)]',
    text: 'text-rose-200',
  },
  sky: {
    bar: 'bg-sky-400',
    glow: 'shadow-[0_0_24px_rgba(56,189,248,0.14)]',
    text: 'text-sky-200',
  },
} as const;

export type StatAccent = keyof typeof ACCENTS;

export function StatCard({
  label,
  value,
  detail,
  accent = 'violet',
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: StatAccent;
  icon?: ReactNode;
}) {
  const tone = ACCENTS[accent];

  return (
    <div className="card card-pad relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-px ${tone.bar} opacity-60`} />
      <div className="flex items-start justify-between gap-3">
        <p className="label">{label}</p>
        {icon ? <span className={tone.text}>{icon}</span> : null}
      </div>
      <p
        className={`mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl ${tone.glow}`}
      >
        {value}
      </p>
      {detail ? <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </div>
  );
}
