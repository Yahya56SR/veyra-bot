import type { ReactNode } from 'react';

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-5 py-10 text-center">
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
