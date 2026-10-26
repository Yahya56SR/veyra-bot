import { formatNumber, formatPercent } from '@/lib/format';

export interface CommandStat {
  command: string;
  total: number;
}

export function CommandBars({ rows }: { rows: CommandStat[] }) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
        No command usage recorded in this range.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {rows.map((row) => {
        const percent = total > 0 ? (row.total / total) * 100 : 0;
        return (
          <li key={row.command}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <code className="truncate text-slate-300">/{row.command}</code>
              <span className="shrink-0 text-xs text-slate-500">
                {formatNumber(row.total)} · {formatPercent(row.total, total)}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-linear-to-r from-violet-400 to-teal-300"
                style={{ width: `${Math.max(2, percent)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
