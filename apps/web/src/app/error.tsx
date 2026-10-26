'use client';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card card-pad w-full max-w-lg">
        <p className="label text-rose-300">Dashboard error</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">The control room could not load</h1>
        <p className="muted mt-3">
          Check{' '}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-slate-200">DATABASE_URL</code> and
          make sure the bot has applied its migrations. If the problem continues, check the Vercel
          function logs.
        </p>
        {error.digest ? (
          <p className="mt-4 text-xs text-slate-500">Digest: {error.digest}</p>
        ) : null}
        <button type="button" onClick={reset} className="btn btn-primary mt-6">
          Try again
        </button>
      </div>
    </main>
  );
}
